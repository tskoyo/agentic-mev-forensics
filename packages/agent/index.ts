import "dotenv/config";
import type { Address, Hash } from "viem";
import { ClaudeClient } from "@mev/claude";
import type { ToolDefinition } from "@mev/claude";
import { RpcClient } from "@mev/rpc";
import { computeV2OutputAmount } from "@mev/uniswap";
import type {
    SSEEvent,
    TradeReport,
    DecodedLog,
    UniswapV2State,
} from "@mev/shared";

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a forensics agent for MEV searchers. Your job is to investigate
a single historical trade and classify its outcome and root cause using
this fixed taxonomy.

MVP taxonomy:
- Outcomes: A2 (success_underperformed), A9 (unknown)
- Root causes: B1 (frontrun_same_block), B9 (unknown)

Investigation protocol:
1. Call get_trade to load the tx. Extract the pool address from the logs, the input token address, and the input amount.
2. Call get_pool_state at block N-1 with token_in and amount_in to get the expected output (counterfactual: what the trade would have earned if it ran first in block N). The realized output comes from the Transfer logs in get_trade.
3. Compare expected vs realized. Use DUAL threshold — skip investigation only if BOTH: gap_pct ≤ 5% AND gap_usd < $10. Investigate if EITHER: gap_pct > 5% OR gap_usd ≥ $10.
4. Call get_block_txs to find all txs in the same block touching the same pool at a lower index than the target tx.
5. If a candidate is found: call get_tx_trace on it to confirm it touched the same pool. If confirmed: report A2 → B1 with evidence.
6. If no candidate found: call get_pool_state at N to compare pool state before and after the block. Report A2 → B9 with a full list of what you ruled out.
7. If still unresolved after 8 tool calls: report A2 → B9.

Evidence rules (NON-NEGOTIABLE):
- Every claim must cite a specific tool result from this conversation.
- If a tool returned nothing or failed, say so. Do not guess.
- Do not use general knowledge about MEV to fill gaps.
- If the user asks a follow-up, reuse prior tool results — do not re-fetch.

Output format:
Write a concise narrative first, then end your response with a JSON code block:
\`\`\`json
{
  "tx_hash": "0x...",
  "outcome": "A2",
  "root_cause": "B1",
  "expected_pnl": 75.00,
  "realized_pnl": 50.00,
  "pnl_delta": -25.00,
  "confidence": 0.95,
  "evidence": [
    { "id": "e1", "tool_call_id": "<tool_use_id>", "claim": "...", "data": {} }
  ],
  "counterfactuals": [],
  "narrative": "One paragraph summary."
}
\`\`\`

Confidence guide: 0.9+ for B1 with confirmed trace, 0.5–0.7 for B9 after full investigation, 0.3 for short-circuit (gap within threshold).
All PnL values in USD. pnl_delta = realized_pnl - expected_pnl (negative = underperformance).`;

// ── Tool definitions ──────────────────────────────────────────────────────────

const TRANSFER_TOPIC =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as const;

function decodeLog(log: {
    address: string;
    topics: readonly string[];
    data: string;
}): DecodedLog {
    if (log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 3) {
        return {
            address: log.address,
            topics: [...log.topics],
            data: log.data,
            event_name: "Transfer",
            args: {
                from: "0x" + log.topics[1]!.slice(26),
                to: "0x" + log.topics[2]!.slice(26),
                value: BigInt(log.data).toString(),
            },
        };
    }
    return { address: log.address, topics: [...log.topics], data: log.data };
}

function buildTools(rpc: RpcClient): Map<string, ToolDefinition> {
    return new Map([
        [
            "get_trade",
            {
                description:
                    "Load a transaction and its receipt. Returns block number, position in block, gas, status, calldata, Transfer/Swap logs, and realized PnL if derivable.",
                input_schema: {
                    type: "object",
                    properties: {
                        tx_hash: { type: "string", description: "0x-prefixed transaction hash" },
                    },
                    required: ["tx_hash"],
                },
                fn: async (input) => {
                    const { tx, receipt } = await rpc.getTx(input.tx_hash as Hash);
                    const logs = receipt.logs.map(decodeLog);
                    return {
                        tx_hash: tx.hash,
                        from: tx.from,
                        to: tx.to ?? null,
                        block: Number(receipt.blockNumber),
                        index: receipt.transactionIndex,
                        value: tx.value.toString(),
                        gas_used: Number(receipt.gasUsed),
                        gas_price: (tx.gasPrice ?? tx.maxFeePerGas ?? 0n).toString(),
                        status: receipt.status === "success" ? "success" : "reverted",
                        calldata: tx.input,
                        logs,
                        realized_pnl: null,
                    };
                },
            },
        ],
        [
            "get_block_txs",
            {
                description:
                    "List all transactions in a block that touched a Uniswap V2 or V3 pool (emitted a Swap event), sorted by index. Use this to find competitors at a lower block index than the target tx.",
                input_schema: {
                    type: "object",
                    properties: {
                        block_number: { type: "number", description: "Block number to scan" },
                    },
                    required: ["block_number"],
                },
                fn: async (input) => {
                    return await rpc.getBlockTxs(input.block_number as number);
                },
            },
        ],
        [
            "get_tx_trace",
            {
                description:
                    "Get the full call trace of a transaction, including all internal calls. Use this to confirm whether a suspicious transaction actually interacted with the same pool as the target transaction.",
                input_schema: {
                    type: "object",
                    properties: {
                        tx_hash: { type: "string", description: "0x-prefixed transaction hash" },
                    },
                    required: ["tx_hash"],
                },
                fn: async (input) => {
                    return await rpc.getTrace(input.tx_hash as Hash);
                },
            },
        ],
        [
            "get_pool_state",
            {
                description:
                    "Get the state of a Uniswap V2 or V3 pool at a specific block. For V2, optionally pass token_in and amount_in to also receive the expected output — use this at block N-1 to establish the counterfactual PnL without calling any simulation API.",
                input_schema: {
                    type: "object",
                    properties: {
                        pool_address: { type: "string", description: "Pool contract address" },
                        block: { type: "number", description: "Block number" },
                        kind: {
                            type: "string",
                            enum: ["v2", "v3"],
                            description: "Pool type — v2 for Uniswap V2 pairs, v3 for Uniswap V3 pools",
                        },
                        token_in: { type: "string", description: "Input token address (optional, V2 only — used to compute expected_output)" },
                        amount_in: { type: "string", description: "Input amount as a decimal string (optional, V2 only — used to compute expected_output)" },
                    },
                    required: ["pool_address", "block", "kind"],
                },
                fn: async (input) => {
                    const state = await rpc.getPoolState(
                        input.pool_address as Address,
                        input.block as number,
                        input.kind as "v2" | "v3"
                    );

                    if (
                        state.kind === "v2" &&
                        input.token_in &&
                        input.amount_in
                    ) {
                        const expected_output = computeV2OutputAmount(
                            state as UniswapV2State,
                            input.token_in as string,
                            BigInt(input.amount_in as string)
                        );
                        return { ...state, expected_output: expected_output.toString() };
                    }

                    return state;
                },
            },
        ],
    ]);
}

// ── Report extraction ─────────────────────────────────────────────────────────

function extractReport(
    txHash: string,
    messages: { role: string; content: unknown }[]
): TradeReport | null {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return null;

    const content = Array.isArray(last.content)
        ? (last.content as { type: string; text?: string }[]).find(
            (b) => b.type === "text"
        )?.text
        : (last.content as string);
    if (!content) return null;

    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) return null;

    try {
        const parsed = JSON.parse(match[1]) as TradeReport;
        return { ...parsed, tx_hash: txHash, created_at: Date.now() };
    } catch {
        return null;
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function investigate(
    txHash: string,
    onEvent: (event: SSEEvent) => void
): Promise<TradeReport | null> {
    const rpc = new RpcClient();
    const claude = new ClaudeClient();
    const tools = buildTools(rpc);

    const { messages } = await claude.runToolLoop({
        messages: [
            {
                role: "user",
                content: `Investigate this transaction: ${txHash}`,
            },
        ],
        tools,
        systemPrompt: SYSTEM_PROMPT,
        onEvent,
    });

    const report = extractReport(
        txHash,
        messages as { role: string; content: unknown }[]
    );

    if (report) {
        onEvent({ type: "report", payload: report });
    }

    return report;
}
