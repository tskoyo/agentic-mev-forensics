# MEV Forensics Agent — Claude Code Context

> ETHGlobal OpenAgents · April 24 – May 6, 2026 · 12-day build

This file gives Claude Code full context to assist with this project. Read it before making any change.

---

## What this project is

An autonomous forensics agent for MEV searchers. Given a trade that underperformed, the agent investigates why — running a multi-step tool-use loop (Claude + 5 tools), producing an evidence-cited report, and streaming the tool-call timeline live to a web dashboard.

Investigations can be triggered two ways:
- **Manual:** user pastes a tx hash into the chat UI and asks a question

Stretch goal: If we have time
- **Automatic:** a wallet monitor detects a new tx from a registered wallet → fires a webhook → KeeperHub delivers it reliably to the Hono server → investigation runs with no human input → investigation is saved in user's dashboard and he can access it any time he wants to do it

Both paths feed into the exact same investigation pipeline.

**The core value proposition:** EigenPhi tells you *what class* of MEV a tx was. Tenderly gives you *the trace*. Neither tells you *why your specific trade underperformed*. This agent does.

---

## Tech stack (non-negotiable)

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | `@anthropic-ai/sdk` native tool-use, viem ecosystem, shared types |
| Chain | Ethereum mainnet | Public mempool, richer MEV dataset, judges know it |
| RPC client | `viem` | Best-in-class ABI decoding, getLogs, type safety |
| RPC node | Alchemy | Ethereum mainnet endpoint |
| Tenderly | REST via plain `fetch` | No official SDK needed — just typed fetch wrappers |
| Claude model | `claude-sonnet-4-6` | Best tool-use reliability |
| Server | Hono | Native SSE streaming — critical for live tool-call timeline |
| Frontend | Next.js 14 App Router + TailwindCSS | Two-column dashboard — Trade list / Chat+Timeline |
| Icons | Lucide Icons v0.475+ | Stroke-only, 1.5px weight, 16×20px — no emoji, no custom SVGs |
| Design tokens | `mev-forensics-design-system/` | Forensic Warm palette, Inter + JetBrains Mono, CSS vars in `colors_and_type.css` |
| Streaming | SSE (Server-Sent Events) | Live tool-call timeline from Hono → Next.js |
| Storage | JSON files on disk | No database overhead for a 12-day hackathon |
| Monorepo | `pnpm workspaces` | — |
| Uniswap math | `@uniswap/v3-sdk + @uniswap/sdk-core` | **Never roll your own tick math** |

---

## Monorepo structure

```
mev-forensics/
├── apps/
│   ├── api/          # Hono server — GET /trades, POST /investigate (SSE), GET /reports/:id
│   └── web/          # Next.js dashboard — 3-column layout
├── packages/
│   ├── shared/       # TradeRef, TradeReport, FailureCategory, Evidence, ToolCall types
│   ├── agent/        # Claude tool-use loop, system prompt, budget enforcement, citation check
│   ├── tenderly-client/  # Typed fetch wrapper for Tenderly REST API
│   ├── rpc-client/   # viem wrapper: block/tx/receipt/log calls, ABI decoding
│   └── pool-math/    # Uniswap v2/v3 expected-PnL via @uniswap/v3-sdk
├── pnpm-workspace.yaml
└── turbo.json
```

---

## The 5 tools (MVP — do not add more)

```typescript
get_trade(tx_hash)
  → { from, to, block, index, value, gas, status, calldata, logs, realized_pnl }
  backed by: viem RPC + ABI decoder

simulate_at_state(tx_hash, block, state_override?)
  → { simulated_pnl, success, revert_reason }
  backed by: Tenderly
  ⚠️  MOST IMPORTANT TOOL. Validate block N vs N-1 semantics on Day 2.

get_block_txs(block_number)
  → [{ index, tx_hash, from, to, touched_pools }]
  backed by: viem getLogs with Uniswap V2/V3 Swap topic hash filter
  ⚠️  touched_pools requires Swap event log decoding — NOT just address matching

get_tx_trace(tx_hash)
  → call_tree
  backed by: Tenderly

get_pool_state(pool_address, block)
  → { reserves|ticks, sqrt_price, liquidity }
  backed by: viem + @uniswap/v3-sdk
```

**Dropped for MVP:** `get_gas_distribution`, `get_address_history`

---

## Investigation flows

### PnL gap threshold (use BOTH conditions)
```
Skip investigation if:  gap_pct <= 5%  AND  gap_usd < $10
Investigate if:         gap_pct >  5%  OR   gap_usd >= $10
```
Derive `gap_usd` from pool's `sqrt_price` at block N — **no external price feed needed**.

### Flow 1 — A2 → B1 (frontrun confirmed) · 4 tool calls
```
get_trade → simulate_at_state(N-1) → [gap > threshold?] → get_block_txs → [competitor?] → get_tx_trace(competitor)
→ RESULT: "Tx at index X touched pool before you. Expected $75. Realized $50. Delta -$25."
```

### Flow 2a — A2 → B9 (early exit, normal variance) · 2 tool calls
```
get_trade → simulate_at_state(N-1) → [gap <= threshold?] → STOP
→ RESULT: "Within normal variance. Not worth investigating."
```

### Flow 2b — A2 → B9 (full investigation, no cause found) · 5 tool calls
```
get_trade → simulate_at_state(N-1) → [gap > threshold] → get_block_txs → [no competitor] → get_pool_state(N-1) + get_pool_state(N)
→ RESULT: "Investigated. No frontrunner. Pool moved X% organically [or: genuinely unknown]. Here's what I ruled out."
```

**The two B9 exits are NOT the same answer.** 2a short-circuits. 2b provides a full audit trail. That distinction is the core trust signal.

---

## Failure taxonomy (internal — never show codes in UI)

### What this is and why it exists

Every investigation produces a structured verdict with two orthogonal dimensions: **what happened to the trade** (outcome) and **why it happened** (root cause). These two dimensions are kept separate because they answer different questions and can be determined independently.

The taxonomy exists for three reasons:
1. **It bounds the agent's reasoning.** The agent doesn't free-form analyse a trade — it classifies it against a fixed set of known failure modes. This makes the output deterministic, citable, and testable.
2. **It makes `unknown` a first-class answer.** Most tools in this space are overconfident. An agent that says "I investigated and cannot classify this — here is what I ruled out" is more trustworthy than one that guesses. `B9` is not a failure state; it is a legitimate, evidenced verdict.
3. **It gives the product a clear expansion path.** Each future root cause (B2–B8) slots into the same schema. The frontend, the agent loop, and the report schema don't change — only the investigation flows do.

### Dimension A — Outcome (what happened to the trade)

This answers: *did the trade succeed, and did it earn what it should have?*

| Code | Name | Description | MVP |
|---|---|---|---|
| A2 | `success_underperformed` | Tx landed on-chain and succeeded, but realized PnL < expected PnL by more than the gap threshold. This is the only outcome that triggers a root cause search. | ✅ |
| A9 | `unknown` | Investigated, ruled out all known causes, cannot confidently classify. | ✅ |
| A1 | `success_as_expected` | Tx succeeded and PnL is within normal variance. Short-circuit — nothing to investigate. | 🔮 Future |
| A3 | `reverted_trivial` | Tx reverted with a known, self-explanatory revert string (e.g. "INSUFFICIENT_OUTPUT_AMOUNT"). Short-circuit. | 🔮 Future |
| A4 | `reverted_nontrivial` | Tx reverted for an unknown reason — requires deep call-frame trace parsing. | 🔮 Future |
| A5 | `not_landed` | Tx never made it on-chain. Requires mempool / builder data. | 🔮 Future |

### Dimension B — Root cause (why it happened)

This answers: *what specific mechanism caused the underperformance?* Only populated when outcome is A2.

| Code | Name | Description | MVP |
|---|---|---|---|
| B1 | `frontrun_same_block` | A competitor tx at a lower block index touched the same pool before the target tx, consuming liquidity and moving the price. The most common and demonstrable failure mode. | ✅ |
| B9 | `unknown` | All known root causes were investigated and ruled out. The agent produces a full audit trail of what it checked. This is a credibility signal, not a gap. | ✅ |
| B2 | `frontrun_prior_block` | A tx in block N-1 moved the pool price before the target tx even landed. | 🔮 Future |
| B3 | `sandwiched` | Two txs from the same actor bracket the target tx — one front-runs, one back-runs. High demo impact; add first after MVP. | 🔮 Future |
| B4 | `stale_quote` | Pool price moved organically between when the bot read the price and when the tx landed. No adversary — the market just moved. Currently reported as B9 with a stale-quote narrative. | 🔮 Future |
| B5 | `gas_underpriced_landed_late` | Tx landed in the right block but at a worse index than optimal due to low priority fee. | 🔮 Future |
| B6 | `gas_underpriced_missed_block` | Tx missed its target block entirely due to low priority fee. | 🔮 Future |
| B7 | `slippage_set_too_tight` | Tx reverted at the slippage check in the AMM contract. | 🔮 Future |
| B8 | `route_suboptimal` | Bot routed through a suboptimal pool sequence. Complex math, low demo payoff. | 🔮 Future |

### How the two dimensions combine

A complete verdict is always `Ax → By`. The MVP supports two verdict combinations:

| Verdict | Plain English | When |
|---|---|---|
| `A2 → B1` | "Your trade succeeded but earned less than expected because a competitor got there first." | Gap exceeds threshold + competitor confirmed |
| `A2 → B9` | "Your trade succeeded but underperformed and I couldn't find the cause." | Gap exceeds threshold + no cause found after full investigation |
| `A2 → B9` (short-circuit) | "Your trade is within normal variance — nothing to investigate." | Gap does not exceed threshold |

### Why `B9` matters more than it looks

Every other agent at ETHGlobal will be overconfident. An agent that admits uncertainty — with a complete audit trail showing what it checked and ruled out — is the differentiator. The `B9` demo case (trade #2) is the most memorable moment of the pitch. Build it with as much care as `B1`.

**UI display rules (never expose codes directly):**
- `A2 → B1` → "frontrunner found" (green verdict card)
- `A2 → B9` (investigated) → "no cause found" (amber verdict card)
- `A2 → B9` (short-circuit) → "normal variance" (gray verdict card)
- `null` → "not investigated" (gray verdict card)

---

## Agent design constraints

```typescript
// Tool budget: hard stop at 8 — enforced in code, not prompt
if (toolCallCount >= 8) {
  // inject: "Tool budget exhausted. Report A2 → B9 with what you tried."
}

// Evidence rules (NON-NEGOTIABLE — enforced in system prompt AND post-processor):
// - Every claim must cite a specific tool result from this conversation
// - If a tool returned nothing or failed, say so. Do not guess.
// - Do not use general knowledge about MEV to fill gaps.
// - Multi-turn: reuse prior tool results — do not re-fetch
```

### TradeReport response schema
```typescript
interface TradeReport {
  tx_hash: string;
  outcome: "A2" | "A9";
  root_cause: "B1" | "B9" | null;
  expected_pnl: number | null;      // USD
  realized_pnl: number;             // USD
  pnl_delta: number | null;         // USD
  confidence: number;               // 0.0–1.0
  evidence: Evidence[];
  counterfactuals: Counterfactual[];
  narrative: string;
  tool_calls: ToolCall[];
}
```

---

## Hono API endpoints

```
GET  /trades                  → list of curated demo trades
POST /investigate             → manual trigger: start Claude tool-use loop, stream SSE
GET  /reports/:id             → return saved investigation report
POST /webhook/tenderly        → automatic trigger: receive Tenderly webhook, extract tx_hash, start investigation
POST /wallets                 → register a wallet address for monitoring
GET  /wallets                 → list registered wallet addresses
```

### SSE event shapes
```typescript
{ type: 'tool_call', name: 'get_block_txs', input: {...}, status: 'running' }
{ type: 'tool_call', name: 'get_block_txs', status: 'done' }
{ type: 'text_delta', delta: 'Frontrunner confirmed...' }
{ type: 'report', payload: TradeReport }
```

---

## Frontend layout (2-column dashboard)

**Design source of truth:** `mev-forensics-design-system/project/README.md` + `ui_kits/app/index.html` — Forensic Warm palette, design tokens in `colors_and_type.css`.

**Left (~280px) — Trade list sidebar**
- One row per trade: truncated tx hash, verdict badge, PnL delta (USD), block number
- Verdict badge colors: `frontrun`=terracotta `#B45C50`, `unknown`=amber `#B07D2A`, `normal`=slate `#6B7280`, `not checked`=light gray, `auto`=sage `#3D7A5F`
- Selected row: 3px left border in verdict color; active row background `--surface-hover`
- Filter dropdown: All / Frontrun / Unknown / Normal — sort by most recent block first
- `auto` badge on webhook-triggered investigations
- Empty state: "Paste a tx hash or wait for a webhook"

**Center (flex) — Investigation / Chat**
- Tool-call timeline streams live above agent answer (queued → pulsing dot → check / error)
- Tool budget meter in header: `N/8` — neutral 0–6, amber 7, red 8 with "hard stop reached"
- Agent narrative renders only after all tool calls complete — never mid-stream
- Full conversation history sent on every follow-up; agent reuses cached results, does NOT re-fetch
- Suggested follow-up chips appear below completed investigation (templates per verdict type)
- Chat input at bottom with tx hash paste support
- Narrative: clickable citation chips `[tool_call_3]` that scroll to and highlight the source tool call

**Mobile breakpoint:** Columns collapse into tabs (Trades / Investigation) — never stacked.

**Dark mode:** Token-based, toggle in header. Contrast-checked — frontrun and unknown cards use adjusted backgrounds to maintain WCAG AA readability.

**Typography rules (non-negotiable):**
- UI labels: Title Case for section headers ("Tool Calls", "Evidence Panel", "PnL Breakdown")
- Verdict badges: lowercase (`frontrun`, `unknown`, `normal`, `not checked`, `auto`)
- Addresses/hashes: always truncated `0xabcd…wxyz` — never raw, never without a label
- Token symbols: ALLCAPS (`WETH`, `USDC`, `ETH`)
- Numbers: always USD-annotated, signed for PnL — monospace (`font-variant-numeric: tabular-nums`)
- Zero emoji anywhere in UI or copy

---

## Trigger paths

### Path A — Automatic (KeeperHub integration)

```
Wallet monitor detects new tx from registered wallet address
→ calls Tenderly simulation API for that tx
→ Tenderly fires webhook with tx_hash in payload
→ KeeperHub delivers webhook to POST /webhook/tenderly (retries if server is down)
→ Hono extracts tx_hash and calls the investigation pipeline
→ investigation runs automatically
→ report appears in dashboard
```

**What each piece does:**
- **Wallet monitor** — a process (using viem `watchBlockNumber`) that polls for new txs from a registered wallet address. When it finds one, it calls the Tenderly simulation API for that tx. This is what initiates the automatic path.
- **Tenderly** — runs the simulation. When complete, fires a webhook containing the tx_hash.
- **KeeperHub** — sits between Tenderly's webhook and the Hono server. Its value is guaranteed delivery with retries. If the Hono server is briefly down when Tenderly fires, KeeperHub retries until it gets through. Without KeeperHub that event is lost.
- **`POST /webhook/tenderly`** — Hono endpoint that receives the payload, extracts tx_hash, hands it to the agent pipeline.

```typescript
// KeeperHub workflow
{
  trigger: { type: "webhook", source: "tenderly" },
  steps: [{
    action: "http.post",
    url: "https://your-hono-api/webhook/tenderly",
    body: { tx_hash: "{{trigger.payload.tx_hash}}" },
    retries: 3
  }]
}
```

**Demo moment:** register a wallet address → wallet monitor detects a known historical tx → Tenderly simulation fires → KeeperHub delivers → tool-call timeline appears in dashboard automatically. No copy-pasting.

### Path B — Manual

```
User pastes tx hash into chat UI
→ POST /investigate
→ investigation runs
→ report appears in dashboard
```

User can also browse existing reports in the trade list and ask follow-up questions about any of them via the chat interface.
```

---

## 12-day execution plan

| Day | Focus | Done when |
|---|---|---|
| 1 | Monorepo scaffolding, rpc-client wired to Alchemy, `get_trade` returning real data | Print real tx block/index/logs to stdout |
| 2 | `simulate_at_state` via Tenderly. Validate against a clean trade. **Pin block N vs N-1 semantics.** | Simulated PnL matches realized within 2% |
| 3 | `get_block_txs` with viem getLogs Swap topic filter. Curate both demo trades. | List all Uniswap txs in a block with touched pools |
| 4 | Claude tool-use loop end-to-end (Path 1: A2 → B1) | Agent produces cited B1 report on demo trade #1 |
| 5 | `get_pool_state` + Path 2 (A2 → B9). Citation post-processor. Pre-warm cache. Record backup video. | Both paths working. Backup video recorded. |
| 6 | SSE streaming Hono → Next.js. Tool-call timeline component. | Live stream visible in browser. |
| 7 | Evidence panel. Chat interface. Trade list. Shared types. | End-to-end demo in browser. |
| 8 | Buffer. If ahead: KeeperHub webhook integration. | Demo runs 5× without failure. |
| 9 | Demo rehearsal. Pitch deck. README. | 10 clean runs. Pitch done. |
| 10 | Submission polish. No new features. | Submitted. |

---

## Critical risks

| Risk | Mitigation |
|---|---|
| `simulate_at_state` off-by-one on block state | Validate Day 2, before anything else |
| V3 tick math wrong | Use `@uniswap/v3-sdk` exclusively — never roll your own |
| Tenderly API flaky during demo | Cache in memory + pre-warm + backup video |
| Agent loops / over-investigates | Hard 8-call budget in loop code, not prompt |
| Agent hallucinates uncited claims | Post-process citation check, strip before UI |
| `get_block_txs` slow on dense blocks | Filter by Swap topic first, skip full tx bodies |

---

## Hard rules (refer to this list daily)

1. **Never** show taxonomy codes (A2, B1, B9) in the UI
2. **Never** roll your own V3 tick math — use `@uniswap/v3-sdk`
3. **Frontend runs in parallel** — `apps/web` is owned by the frontend developer (Spyro); scaffold and build components any time, but wire live SSE data only after Day 6 when the Hono stream is functional
4. **Never** add tools beyond the 5 defined
5. **Never** read about B3 sandwiching until MVP is done
6. **Never** claim Tenderly is a hackathon sponsor (they're not)
7. **Always** use dual threshold (gap% AND gap_usd), not flat 5%
8. **Always** enforce tool budget in loop code, not the prompt

---

## Demo trades

| # | Path | Purpose |
|---|---|---|
| 1 | A2 → B1 | Headline: "$50 vs $75" — frontrunner confirmed |
| 2 | A2 → B9 | Close: "I investigated and found nothing — here's what I ruled out" |

Pre-warm both Tenderly simulation caches before any live demo.

---

## Scope boundary

**In scope:** Ethereum mainnet · Uniswap v2 + v3 · read-only · 2 demo trades · 2 investigation paths · 5 tools · multi-turn chat · wallet monitor (viem watchBlockNumber) · automatic trigger via Tenderly webhook + KeeperHub · manual trigger via chat UI

**Out of scope:** Live trade execution · real capital · multi-chain · Curve/Balancer · real-time alerts · aggregate dashboards · auth · multi-user
