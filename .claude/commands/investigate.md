# Investigate a trade

Given a tx hash, walk through the full MEV forensics investigation workflow.

## Usage
```
/investigate <tx_hash>
```

## What to do

1. **Identify which package handles this:** `packages/agent` owns the tool-use loop. `packages/rpc-client` fetches on-chain data. `packages/tenderly-client` runs simulations.

2. **Check if the tool implementations exist.** If any of the 5 tools are missing or stubbed, implement them first before running an investigation:
   - `get_trade` — viem: getTransaction + getTransactionReceipt + getLogs + ABI decode
   - `simulate_at_state` — Tenderly REST: POST /simulate with `block_number: N-1`
   - `get_block_txs` — viem: getLogs filtered by Uniswap V2/V3 Swap topic hashes for the full block
   - `get_tx_trace` — Tenderly REST: GET /trace/{tx_hash}
   - `get_pool_state` — viem: slot0 + liquidity reads via @uniswap/v3-sdk

3. **Run the investigation loop manually** against the provided tx hash and print the tool call sequence + result to stdout.

4. **Expected output format:**
```
[get_trade] block=XXXXX index=YY realized_pnl=$ZZ.ZZ
[simulate_at_state(N-1)] simulated_pnl=$ZZ.ZZ
[gap check] XX.X% ($ZZ.ZZ) → threshold exceeded / within threshold
[get_block_txs] found N txs touching same pool; M at lower index
[get_tx_trace(competitor)] confirmed / not found
[RESULT] A2 → B1 | A2 → B9
```

5. **If Tenderly credentials are missing**, print the required env vars:
   ```
   TENDERLY_ACCOUNT=
   TENDERLY_PROJECT=
   TENDERLY_ACCESS_KEY=
   ALCHEMY_RPC_URL=
   ```

## PnL gap threshold
Skip investigation if: `gap_pct <= 5% AND gap_usd < $10`
Investigate if: `gap_pct > 5% OR gap_usd >= $10`
Derive gap_usd from pool's sqrt_price at block N — no external price feed needed.