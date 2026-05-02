# Uniswap Developer Platform — Builder Feedback

Project: MEV Forensics Agent (ETHGlobal OpenAgents, May 2026)
Stack: TypeScript · `@uniswap/v3-sdk` · `@uniswap/sdk-core` · viem · Hono · Next.js

---

## What I was building

An autonomous forensics agent that investigates why a MEV trade underperformed. Part of the project involved simulating a sandwich attack on a local Anvil fork to understand and demonstrate the attack mechanics.

---

## What worked well

**Uniswap V2 router — no friction at all.**
I used the V2 router (`0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`) to simulate a full sandwich attack on a local Anvil mainnet fork. Front-run, victim swap, and back-run all worked exactly as expected. The router interface is straightforward and well-understood — `swapExactETHForTokens` and `swapExactTokensForETH` just worked.

**V2 math is simple enough to use directly.**
The constant-product formula (`x*y=k` with 0.3% fee) is simple enough to implement without the SDK. This made it easy to reason about price impact and verify results manually.

---

## What didn't work / main friction point

**The `@uniswap/v3-sdk` and `@uniswap/sdk-core` import pattern is confusing.**

This is the part that cost me the most time. In a TypeScript monorepo with `"type": "module"` throughout, I could not use standard named imports. I had to use this pattern instead:

```typescript
import pkg from "@uniswap/sdk-core";
import sdk from "@uniswap/v3-sdk";

const { Token: TokenCtor, CurrencyAmount: CurrencyAmountCtor } = pkg;
const { Pool: PoolCtor, FeeAmount: FeeAmountEnum } = sdk;
```

It is not obvious why this is necessary, the error messages pointing to it are unclear, and I could not find a clear explanation in the docs. I lost significant time on this during a hackathon where time is the scarcest resource.

**This is also why I stayed on V2 instead of V3.**
I chose V2 for the sandwich simulation specifically because its math is simpler and I could avoid the SDK import complexity. V3 would have been more realistic (it is where most liquidity sits today), but the friction of getting the SDK working in an ESM monorepo pushed me toward the simpler path.

---

## What I wish existed

- Clear documentation or an example repo showing how to use `@uniswap/v3-sdk` in a modern ESM TypeScript monorepo. A single working import example would have saved me hours.
- Proper ESM-first exports so standard named imports just work.
