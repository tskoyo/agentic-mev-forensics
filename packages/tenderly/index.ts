import type { Hash } from "viem";
import type { CallFrame } from "@mev/shared";
import { RpcClient } from "@mev/rpc";

const TENDERLY_API_BASE = "https://api.tenderly.co/api/v1";

export interface TenderlyClientOptions {
    accessKey?: string;
    username?: string;
    project?: string;
    rpc: RpcClient;
}

export interface TokenDelta {
    token_address: string;
    raw_amount: string;
    decimals?: number;
    symbol?: string;
    dollar_value: number | null;
}

export interface TenderlySimulateResult {
    simulated_pnl: number | null;
    success: boolean;
    revert_reason: string | null;
    token_amounts: TokenDelta[];
}

export interface TenderlyTraceResult {
    call_tree: CallFrame;
}

export class TenderlyClient {
    private readonly accessKey: string;
    private readonly username: string;
    private readonly project: string;
    private readonly rpc: RpcClient;
    private readonly rawCache = new Map<string, TenderlyApiResponse>();

    constructor(opts: TenderlyClientOptions) {
        const accessKey = opts.accessKey ?? process.env.TENDERLY_ACCESS_KEY;
        const username = opts.username ?? process.env.TENDERLY_USERNAME;
        const project = opts.project ?? process.env.TENDERLY_PROJECT;
        if (!accessKey) {
            throw new Error(
                "TenderlyClient: accessKey not provided and TENDERLY_ACCESS_KEY is not set."
            );
        }
        if (!username) {
            throw new Error(
                "TenderlyClient: username not provided and TENDERLY_USERNAME is not set."
            );
        }
        if (!project) {
            throw new Error(
                "TenderlyClient: project not provided and TENDERLY_PROJECT is not set."
            );
        }
        this.accessKey = accessKey;
        this.username = username;
        this.project = project;
        this.rpc = opts.rpc;
    }

    // blockNumber is the block at which to simulate. Tenderly applies the
    // block's pre-state, so passing N replays the tx against the chain state
    // *before* block N executed. To simulate against state "right before this
    // tx ran" pass the tx's own block (not block - 1). Validate this end-to-end
    // before depending on it (see issue #5).
    async simulate(
        txHash: Hash,
        blockNumber: number,
        stateOverride?: Record<string, unknown>
    ): Promise<TenderlySimulateResult> {
        const raw = await this.simulateRaw(txHash, blockNumber, stateOverride);
        return parseSimulateResult(raw);
    }

    async getTrace(txHash: Hash): Promise<TenderlyTraceResult> {
        const { receipt } = await this.rpc.getTx(txHash);
        const blockNumber = Number(receipt.blockNumber);
        const raw = await this.simulateRaw(txHash, blockNumber);
        return { call_tree: parseCallTree(raw) };
    }

    clearCache(): void {
        this.rawCache.clear();
    }

    private async simulateRaw(
        txHash: Hash,
        blockNumber: number,
        stateOverride?: Record<string, unknown>
    ): Promise<TenderlyApiResponse> {
        const key = cacheKey(txHash, blockNumber, stateOverride);
        const cached = this.rawCache.get(key);
        if (cached) {
            console.log(`[tenderly] cache hit ${key}`);
            return cached;
        }
        console.log(`[tenderly] cache miss ${key}`);

        const { tx } = await this.rpc.getTx(txHash);
        const gasPrice = tx.gasPrice ?? tx.maxFeePerGas;
        const body = {
            network_id: "1",
            block_number: blockNumber,
            from: tx.from,
            to: tx.to,
            input: tx.input,
            gas: Number(tx.gas),
            gas_price: gasPrice?.toString(),
            value: tx.value.toString(),
            save: false,
            save_if_fails: false,
            simulation_type: "full",
            ...(stateOverride ? { state_objects: stateOverride } : {}),
        };

        const url = `${TENDERLY_API_BASE}/account/${this.username}/project/${this.project}/simulate`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "X-Access-Key": this.accessKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const detail = await res.text();
            throw new Error(
                `Tenderly simulate failed (${res.status}): ${detail}`
            );
        }
        const json = (await res.json()) as TenderlyApiResponse;
        this.rawCache.set(key, json);
        return json;
    }
}

function cacheKey(
    txHash: string,
    blockNumber: number,
    stateOverride?: Record<string, unknown>
): string {
    const overrideHash = stateOverride
        ? stableStringify(stateOverride)
        : "none";
    return `${txHash}:${blockNumber}:${overrideHash}`;
}

function stableStringify(v: unknown): string {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys
        .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
        .join(",")}}`;
}

interface TenderlyApiResponse {
    transaction?: {
        status?: boolean;
        error_message?: string | null;
        transaction_info?: {
            call_trace?: TenderlyCallTrace;
            asset_changes?: TenderlyAssetChange[] | null;
        };
    };
}

interface TenderlyCallTrace {
    call_type?: string;
    type?: string;
    from?: string;
    to?: string;
    input?: string;
    output?: string;
    value?: string;
    gas?: number | string;
    gas_used?: number | string;
    error?: string | null;
    calls?: TenderlyCallTrace[];
}

interface TenderlyAssetChange {
    token_info?: {
        contract_address?: string;
        symbol?: string;
        decimals?: number;
        dollar_value?: string;
    };
    type?: string;
    from?: string;
    to?: string;
    amount?: string;
    raw_amount?: string;
    dollar_value?: string;
}

function parseSimulateResult(
    raw: TenderlyApiResponse
): TenderlySimulateResult {
    const tx = raw.transaction;
    const success = tx?.status ?? false;
    const revert_reason = tx?.error_message ?? null;
    const changes = tx?.transaction_info?.asset_changes ?? [];

    const token_amounts: TokenDelta[] = changes.map((c) => ({
        token_address: c.token_info?.contract_address ?? "",
        raw_amount: c.raw_amount ?? c.amount ?? "0",
        decimals: c.token_info?.decimals,
        symbol: c.token_info?.symbol,
        dollar_value:
            c.dollar_value != null && c.dollar_value !== ""
                ? Number(c.dollar_value)
                : null,
    }));

    // USD PnL is computed downstream by pool-math (issue #4) — kept null here
    // to avoid baking pricing logic into the Tenderly wrapper.
    const simulated_pnl: number | null = null;

    return { simulated_pnl, success, revert_reason, token_amounts };
}

function parseCallTree(raw: TenderlyApiResponse): CallFrame {
    const t = raw.transaction?.transaction_info?.call_trace;
    if (!t) {
        throw new Error("Tenderly response missing transaction.transaction_info.call_trace");
    }
    return mapCallFrame(t);
}

function mapCallFrame(t: TenderlyCallTrace): CallFrame {
    return {
        type: t.call_type ?? t.type ?? "CALL",
        from: t.from ?? "",
        to: t.to ?? "",
        input: t.input ?? "0x",
        output: t.output,
        value: t.value,
        gas: t.gas != null ? Number(t.gas) : undefined,
        gas_used: t.gas_used != null ? Number(t.gas_used) : undefined,
        error: t.error ?? undefined,
        calls: t.calls?.map(mapCallFrame),
    };
}
