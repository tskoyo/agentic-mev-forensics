// Failure taxonomy
//
// Two orthogonal dimensions: outcome (what happened) and root
// cause (why). MVP supports A2/A9 outcomes and B1/B9 causes.
// Other codes are reserved — adding them is a future scope item,
// not a free-form extension point.
//
// UI rule: never expose these codes directly to the user.

export type Outcome = "A2" | "A9";
export type RootCause = "B1" | "B9";

export type OutcomeCodeFuture =
    | "A1"
    | "A3"
    | "A4"
    | "A5";

export type RootCauseCodeFuture =
    | "B2"
    | "B3"
    | "B4"
    | "B5"
    | "B6"
    | "B7"
    | "B8";

// Trade reference (curated demo trade or user-submitted hash)

export interface TradeRef {
    tx_hash: string;
    label?: string;
    description?: string;
}

// Tool surface — names, inputs, outputs

export type ToolName =
    | "get_trade"
    | "simulate_at_state"
    | "get_block_txs"
    | "get_tx_trace"
    | "get_pool_state";

export interface DecodedLog {
    address: string;
    topics: string[];
    data: string;
    event_name?: string;
    args?: Record<string, unknown>;
}

export interface GetTradeInput {
    tx_hash: string;
}

export interface GetTradeOutput {
    tx_hash: string;
    from: string;
    to: string | null;
    block: number;
    index: number;
    value: string;
    gas_used: number;
    gas_price: string;
    status: "success" | "reverted";
    calldata: string;
    logs: DecodedLog[];
    realized_pnl: number | null;
}

export interface SimulateAtStateInput {
    tx_hash: string;
    block: number;
    state_override?: Record<string, unknown>;
}

export interface SimulateAtStateOutput {
    simulated_pnl: number | null;
    success: boolean;
    revert_reason: string | null;
}

export interface GetBlockTxsInput {
    block_number: number;
}

export interface BlockTxSummary {
    index: number;
    tx_hash: string;
    from: string;
    to: string | null;
    touched_pools: string[];
}

export type GetBlockTxsOutput = BlockTxSummary[];

export interface GetTxTraceInput {
    tx_hash: string;
}

export interface CallFrame {
    type: string;
    from: string;
    to: string;
    input: string;
    output?: string;
    value?: string;
    gas?: number;
    gas_used?: number;
    error?: string;
    calls?: CallFrame[];
}

export interface GetTxTraceOutput {
    call_tree: CallFrame;
}

export interface GetPoolStateInput {
    pool_address: string;
    block: number;
}

export interface UniswapV2State {
    kind: "v2";
    reserve0: string;
    reserve1: string;
    token0: string;
    token1: string;
}

export interface UniswapV3State {
    kind: "v3";
    sqrt_price_x96: string;
    liquidity: string;
    tick: number;
    tick_spacing: number;
    fee: number;
    token0: string;
    token1: string;
}

export type GetPoolStateOutput = UniswapV2State | UniswapV3State;

// Tool-call record — every invocation is logged for the report

export type ToolCallStatus = "running" | "done" | "error";

export interface ToolCall {
    id: string;
    name: ToolName;
    input: Record<string, unknown>;
    output?: unknown;
    status: ToolCallStatus;
    started_at: number;
    ended_at?: number;
    duration_ms?: number;
    error?: string;
}

// Evidence and counterfactuals — the citation surface
//
// Every claim in `narrative` must reference an Evidence id.
// The post-processor strips uncited claims before the report
// reaches the UI.

export interface Evidence {
    id: string;
    tool_call_id: string;
    claim: string;
    data: unknown;
}

export interface Counterfactual {
    scenario: string;
    pnl: number;
    delta_vs_realized: number;
}

// TradeReport — the final artifact returned to the UI

export interface TradeReport {
    tx_hash: string;
    outcome: Outcome;
    root_cause: RootCause | null;
    expected_pnl: number | null;
    realized_pnl: number;
    pnl_delta: number | null;
    confidence: number;
    evidence: Evidence[];
    counterfactuals: Counterfactual[];
    narrative: string;
    tool_calls: ToolCall[];
    created_at: number;
}

// Gap threshold — dual condition (both must fail to skip)

export interface GapThreshold {
    pct: number;
    usd: number;
}

export const DEFAULT_GAP_THRESHOLD: GapThreshold = {
    pct: 5,
    usd: 10,
};

export const TOOL_BUDGET = 8;

// SSE event shapes — Hono → Next.js stream

export type SSEEvent =
    | SSEToolCallEvent
    | SSETextDeltaEvent
    | SSEReportEvent
    | SSEErrorEvent;

export interface SSEToolCallEvent {
    type: "tool_call";
    id: string;
    name: ToolName;
    input?: Record<string, unknown>;
    status: ToolCallStatus;
    output?: unknown;
    error?: string;
}

export interface SSETextDeltaEvent {
    type: "text_delta";
    delta: string;
}

export interface SSEReportEvent {
    type: "report";
    payload: TradeReport;
}

export interface SSEErrorEvent {
    type: "error";
    message: string;
}

// Wallet monitoring (automatic trigger path)

export interface WatchedWallet {
    address: string;
    label?: string;
    registered_at: number;
}

export interface TenderlyWebhookPayload {
    tx_hash: string;
}