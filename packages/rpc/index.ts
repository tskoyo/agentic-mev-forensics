import {
    createPublicClient,
    http,
    parseAbi,
    parseAbiItem,
    type Address,
    type Block,
    type Hash,
    type PublicClient,
    type Transaction,
    type TransactionReceipt,
} from "viem";
import { mainnet } from "viem/chains";
import type {
    BlockTxSummary,
    GetBlockTxsOutput,
    GetPoolStateOutput,
    UniswapV2State,
    UniswapV3State,
} from "@mev/shared";

export const UNISWAP_V2_SWAP_TOPIC =
    "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822" as const;

export const UNISWAP_V3_SWAP_TOPIC =
    "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67" as const;

// Parsed event items for viem getLogs — viem v2 derives the topic hash
// from the ABI rather than accepting raw topic strings.
const V2_SWAP_EVENT = parseAbiItem(
    "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)"
);
const V3_SWAP_EVENT = parseAbiItem(
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
);

const V2_PAIR_ABI = parseAbi([
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
]);

const V3_POOL_ABI = parseAbi([
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() view returns (uint128)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function fee() view returns (uint24)",
    "function tickSpacing() view returns (int24)",
]);

export interface RpcClientOptions {
    rpcUrl?: string;
}

export interface GetTxResult {
    tx: Transaction;
    receipt: TransactionReceipt;
}

export interface GetBlockResult {
    block: Block;
    txHashes: { index: number; hash: Hash }[];
}

export class RpcClient {
    private readonly client: PublicClient;

    constructor(opts: RpcClientOptions = {}) {
        const url = opts.rpcUrl ?? process.env.ALCHEMY_RPC_URL;
        if (!url) {
            throw new Error(
                "RpcClient: rpcUrl not provided and ALCHEMY_RPC_URL is not set."
            );
        }
        this.client = createPublicClient({
            chain: mainnet,
            transport: http(url),
        });
    }

    async getTx(hash: Hash): Promise<GetTxResult> {
        const [tx, receipt] = await Promise.all([
            this.client.getTransaction({ hash }),
            this.client.getTransactionReceipt({ hash }),
        ]);
        return { tx, receipt };
    }

    async getBlock(blockNumber: bigint | number): Promise<GetBlockResult> {
        const block = await this.client.getBlock({
            blockNumber: BigInt(blockNumber),
            includeTransactions: false,
        });
        const txHashes = block.transactions.map((hash, index) => ({
            index,
            hash: hash as Hash,
        }));
        return { block, txHashes };
    }

    async getBlockTxs(
        blockNumber: bigint | number
    ): Promise<GetBlockTxsOutput> {
        const bn = BigInt(blockNumber);

        const [block, logs] = await Promise.all([
            this.client.getBlock({
                blockNumber: bn,
                includeTransactions: true,
            }),
            this.client.getLogs({
                fromBlock: bn,
                toBlock: bn,
                events: [V2_SWAP_EVENT, V3_SWAP_EVENT],
            }),
        ]);

        const poolsByTx = new Map<Hash, Set<Address>>();
        for (const log of logs) {
            const set =
                poolsByTx.get(log.transactionHash) ?? new Set<Address>();
            set.add(log.address);
            poolsByTx.set(log.transactionHash, set);
        }

        const summaries: BlockTxSummary[] = [];
        for (const tx of block.transactions) {
            const pools = poolsByTx.get(tx.hash);
            if (!pools) continue;
            summaries.push({
                index: tx.transactionIndex,
                tx_hash: tx.hash,
                from: tx.from,
                to: tx.to ?? null,
                touched_pools: [...pools],
            });
        }

        summaries.sort((a, b) => a.index - b.index);
        return summaries;
    }

    async getPoolState(
        poolAddress: Address,
        blockNumber: bigint | number,
        kind: "v2" | "v3"
    ): Promise<GetPoolStateOutput> {
        const block = BigInt(blockNumber);

        if (kind === "v2") {
            const [reserves, token0, token1] = await this.client.multicall({
                blockNumber: block,
                allowFailure: false,
                contracts: [
                    {
                        address: poolAddress,
                        abi: V2_PAIR_ABI,
                        functionName: "getReserves",
                    },
                    {
                        address: poolAddress,
                        abi: V2_PAIR_ABI,
                        functionName: "token0",
                    },
                    {
                        address: poolAddress,
                        abi: V2_PAIR_ABI,
                        functionName: "token1",
                    },
                ],
            });
            const state: UniswapV2State = {
                kind: "v2",
                reserve0: reserves[0].toString(),
                reserve1: reserves[1].toString(),
                token0,
                token1,
            };
            return state;
        }

        const [slot0, liquidity, token0, token1, fee, tickSpacing] =
            await this.client.multicall({
                blockNumber: block,
                allowFailure: false,
                contracts: [
                    {
                        address: poolAddress,
                        abi: V3_POOL_ABI,
                        functionName: "slot0",
                    },
                    {
                        address: poolAddress,
                        abi: V3_POOL_ABI,
                        functionName: "liquidity",
                    },
                    {
                        address: poolAddress,
                        abi: V3_POOL_ABI,
                        functionName: "token0",
                    },
                    {
                        address: poolAddress,
                        abi: V3_POOL_ABI,
                        functionName: "token1",
                    },
                    {
                        address: poolAddress,
                        abi: V3_POOL_ABI,
                        functionName: "fee",
                    },
                    {
                        address: poolAddress,
                        abi: V3_POOL_ABI,
                        functionName: "tickSpacing",
                    },
                ],
            });
        const state: UniswapV3State = {
            kind: "v3",
            sqrt_price_x96: slot0[0].toString(),
            liquidity: liquidity.toString(),
            tick: slot0[1],
            tick_spacing: tickSpacing,
            fee,
            token0,
            token1,
        };
        return state;
    }
}
