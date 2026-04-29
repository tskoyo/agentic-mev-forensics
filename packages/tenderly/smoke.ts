import { formatUnits } from "viem";
import { RpcClient } from "@mev/rpc";
import { TenderlyClient, type TokenDelta } from "./index.js";

const TRANSFER_TOPIC =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const txHash = process.argv[2] as `0x${string}`;
if (!txHash) throw new Error("usage: smoke.ts <txHash>");

const rpc = new RpcClient();
const tenderly = new TenderlyClient({ rpc });

const { tx, receipt } = await rpc.getTx(txHash);
const blockN = Number(receipt.blockNumber);
const trader = tx.from.toLowerCase();

console.log(`Trader: ${trader}`);
console.log(`Block:  ${blockN}`);

console.log("\n--- simulate at N (start-of-block state, no competition) ---");
const sim = await tenderly.simulate(txHash, blockN);
console.log(`success: ${sim.success}  revert: ${sim.revert_reason ?? "none"}`);
const simulated = netDeltasFromSimulation(sim.token_amounts, trader);
console.log("trader net deltas:");
printDeltas(simulated);

console.log("\n--- realized on-chain (from receipt Transfer logs) ---");
const realized = netDeltasFromReceipt(receipt.logs, trader);
console.log("trader net deltas:");
printDeltas(realized, simulated);

console.log("\n--- frontrun gap (simulated - realized) ---");
printGap(simulated, realized);

console.log("\n--- getTrace ---");
const { call_tree } = await tenderly.getTrace(txHash);
console.log(
    `root: ${call_tree.type} ${call_tree.from} → ${call_tree.to} children: ${call_tree.calls?.length}`
);

interface Delta {
    delta: bigint;
    decimals?: number;
    symbol?: string;
    usdPerRawUnit?: number;
}

function netDeltasFromSimulation(
    tokenAmounts: TokenDelta[],
    trader: string
): Map<string, Delta> {
    const out = new Map<string, Delta>();
    for (const t of tokenAmounts) {
        const token = t.token_address.toLowerCase();
        const amount = BigInt(t.raw_amount);
        let signed = 0n;
        if (t.from?.toLowerCase() === trader) signed -= amount;
        if (t.to?.toLowerCase() === trader) signed += amount;
        if (signed === 0n) continue;

        const existing = out.get(token);
        const usdPerRawUnit =
            t.dollar_value != null && Number(t.raw_amount) > 0
                ? t.dollar_value / Number(t.raw_amount)
                : undefined;
        out.set(token, {
            delta: (existing?.delta ?? 0n) + signed,
            decimals: t.decimals ?? existing?.decimals,
            symbol: t.symbol ?? existing?.symbol,
            usdPerRawUnit: usdPerRawUnit ?? existing?.usdPerRawUnit,
        });
    }
    return out;
}

function netDeltasFromReceipt(
    logs: readonly { address: string; topics: readonly `0x${string}`[]; data: `0x${string}` }[],
    trader: string
): Map<string, Delta> {
    const out = new Map<string, Delta>();
    for (const log of logs) {
        if (log.topics[0] !== TRANSFER_TOPIC) continue;
        if (log.topics.length < 3) continue;
        const from = ("0x" + log.topics[1]!.slice(26)).toLowerCase();
        const to = ("0x" + log.topics[2]!.slice(26)).toLowerCase();
        const value = BigInt(log.data);
        const token = log.address.toLowerCase();
        let signed = 0n;
        if (from === trader) signed -= value;
        if (to === trader) signed += value;
        if (signed === 0n) continue;
        const existing = out.get(token);
        out.set(token, {
            delta: (existing?.delta ?? 0n) + signed,
            decimals: existing?.decimals,
            symbol: existing?.symbol,
            usdPerRawUnit: existing?.usdPerRawUnit,
        });
    }
    return out;
}

function printDeltas(
    deltas: Map<string, Delta>,
    priceSource?: Map<string, Delta>
) {
    if (deltas.size === 0) {
        console.log("  (no trader-relevant transfers)");
        return;
    }
    for (const [token, d] of deltas) {
        const meta = priceSource?.get(token);
        const symbol = d.symbol ?? meta?.symbol ?? token.slice(0, 10);
        const decimals = d.decimals ?? meta?.decimals;
        const usdPerRawUnit = d.usdPerRawUnit ?? meta?.usdPerRawUnit;
        console.log(`  ${formatLine(d.delta, decimals, symbol, usdPerRawUnit)}`);
    }
}

function printGap(
    simulated: Map<string, Delta>,
    realized: Map<string, Delta>
) {
    const tokens = new Set([...simulated.keys(), ...realized.keys()]);
    let any = false;
    for (const token of tokens) {
        const s = simulated.get(token)?.delta ?? 0n;
        const r = realized.get(token)?.delta ?? 0n;
        const gap = s - r;
        if (gap === 0n) continue;
        any = true;
        const meta = simulated.get(token) ?? realized.get(token)!;
        const symbol = meta.symbol ?? token.slice(0, 10);
        console.log(
            `  ${formatLine(gap, meta.decimals, symbol, meta.usdPerRawUnit)}`
        );
    }
    if (!any) console.log("  (no gap — simulated matches realized)");
}

function formatLine(
    raw: bigint,
    decimals: number | undefined,
    symbol: string,
    usdPerRawUnit: number | undefined
): string {
    const sign = raw < 0n ? "-" : "+";
    const abs = raw < 0n ? -raw : raw;
    const human =
        decimals != null ? formatUnits(abs, decimals) : abs.toString();
    const usd =
        usdPerRawUnit != null
            ? `  ($${(Number(abs) * usdPerRawUnit).toFixed(2)})`
            : "";
    return `${sign}${human} ${symbol}${usd}`;
}
