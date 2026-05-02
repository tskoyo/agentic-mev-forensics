import type { UniswapV2State, UniswapV3State } from "@mev/shared";
import type { Pool, FeeAmount } from "@uniswap/v3-sdk";

import pkg from "@uniswap/sdk-core";
import sdk from "@uniswap/v3-sdk";

const { Token: TokenCtor, CurrencyAmount: CurrencyAmountCtor } = pkg;
const { Pool: PoolCtor, FeeAmount: FeeAmountEnum } = sdk;

export class UniswapV3PoolMath {
    readonly pool: Pool;

    constructor(
        state: UniswapV3State,
        token0Decimals: number,
        token1Decimals: number,
        chainId = 1
    ) {
        const token0 = new TokenCtor(chainId, state.token0, token0Decimals);
        const token1 = new TokenCtor(chainId, state.token1, token1Decimals);
        this.pool = new PoolCtor(
            token0,
            token1,
            state.fee as FeeAmount,
            state.sqrt_price_x96,
            state.liquidity,
            state.tick
        );
    }

    // Price of token0 denominated in token1
    token0Price(): number {
        return parseFloat(this.pool.token0Price.toSignificant(18));
    }

    // Price of token1 denominated in token0
    token1Price(): number {
        return parseFloat(this.pool.token1Price.toSignificant(18));
    }

    // Expected output for an exact-input swap.
    // Returns null if the swap crosses a tick boundary (full tick data would be needed).
    async getOutputAmount(
        tokenInAddress: string,
        amountIn: bigint
    ): Promise<bigint | null> {
        const isToken0In =
            tokenInAddress.toLowerCase() ===
            this.pool.token0.address.toLowerCase();
        const tokenIn = isToken0In ? this.pool.token0 : this.pool.token1;
        const inputAmount = CurrencyAmountCtor.fromRawAmount(
            tokenIn,
            amountIn.toString()
        );
        try {
            const [outputAmount] = await this.pool.getOutputAmount(inputAmount);
            return BigInt(outputAmount.quotient.toString());
        } catch {
            // Swap crosses a tick boundary — caller should fall back to Tenderly simulation
            return null;
        }
    }
}

// V2 constant-product output (x*y=k with 0.3% fee)
export function computeV2OutputAmount(
    state: UniswapV2State,
    tokenInAddress: string,
    amountIn: bigint
): bigint {
    const isToken0In =
        tokenInAddress.toLowerCase() === state.token0.toLowerCase();
    const reserveIn = BigInt(isToken0In ? state.reserve0 : state.reserve1);
    const reserveOut = BigInt(isToken0In ? state.reserve1 : state.reserve0);
    const amountInWithFee = amountIn * 997n;
    return (
        (amountInWithFee * reserveOut) /
        (reserveIn * 1000n + amountInWithFee)
    );
}
