// sandwich.ts
import {
    createPublicClient, createWalletClient, createTestClient,
    http, parseEther, parseUnits, formatUnits, getContract,
    getAddress,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { mainnet } from "viem/chains";

// ── constants ──────────────────────────────────────────────────────
const RPC = "http://127.0.0.1:8545";

const UNISWAP_V2_ROUTER = getAddress("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
const WETH = getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
const USDC = getAddress("0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48");
const V2_PAIR = getAddress("0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc");

// ── ABIs ────────────────────────────────────────────────────────────
const ROUTER_ABI = [
    {
        name: "swapExactETHForTokens", type: "function", stateMutability: "payable",
        inputs: [
            { name: "amountOutMin", type: "uint256" },
            { name: "path", type: "address[]" },
            { name: "to", type: "address" },
            { name: "deadline", type: "uint256" },
        ],
        outputs: [{ name: "amounts", type: "uint256[]" }]
    },
    {
        name: "swapExactTokensForETH", type: "function", stateMutability: "nonpayable",
        inputs: [
            { name: "amountIn", type: "uint256" },
            { name: "amountOutMin", type: "uint256" },
            { name: "path", type: "address[]" },
            { name: "to", type: "address" },
            { name: "deadline", type: "uint256" },
        ],
        outputs: [{ name: "amounts", type: "uint256[]" }]
    },
    {
        name: "getAmountsOut", type: "function", stateMutability: "view",
        inputs: [
            { name: "amountIn", type: "uint256" },
            { name: "path", type: "address[]" },
        ],
        outputs: [{ name: "amounts", type: "uint256[]" }]
    },
] as const;

const ERC20_ABI = [
    {
        name: "approve", type: "function", stateMutability: "nonpayable",
        inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }],
        outputs: [{ type: "bool" }]
    },
    {
        name: "balanceOf", type: "function", stateMutability: "view",
        inputs: [{ name: "a", type: "address" }],
        outputs: [{ type: "uint256" }]
    },
] as const;

const V2_PAIR_ABI = [
    {
        name: "getReserves", type: "function", stateMutability: "view",
        inputs: [],
        outputs: [
            { name: "reserve0", type: "uint112" },
            { name: "reserve1", type: "uint112" },
            { name: "blockTimestampLast", type: "uint32" },
        ]
    },
    {
        name: "token0", type: "function", stateMutability: "view",
        inputs: [], outputs: [{ type: "address" }]
    },
] as const;

// ── fresh random EOAs (zero history on mainnet → clean slate) ───────
const victim = privateKeyToAccount(generatePrivateKey());
const bot = privateKeyToAccount(generatePrivateKey());

// ── clients ─────────────────────────────────────────────────────────
const pub = createPublicClient({ chain: mainnet, transport: http(RPC) });
const test = createTestClient({ chain: mainnet, transport: http(RPC), mode: "anvil" });
const wVictim = createWalletClient({ account: victim, chain: mainnet, transport: http(RPC) });
const wBot = createWalletClient({ account: bot, chain: mainnet, transport: http(RPC) });

// ── helpers ─────────────────────────────────────────────────────────
const path = [WETH, USDC] as const;
const reverse = [USDC, WETH] as const;
const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 3600);

const usdc = getContract({ address: USDC, abi: ERC20_ABI, client: pub });

// This function is used to get a clean quote for the victim's intended swap,
// which we can compare against the actual output to measure slippage caused by the sandwich attack.
async function quote(amountIn: bigint, p: readonly `0x${string}`[]) {
    const out = await pub.readContract({
        address: UNISWAP_V2_ROUTER, abi: ROUTER_ABI,
        functionName: "getAmountsOut", args: [amountIn, [...p]],
    });
    return out[1];
}

async function getReserves() {
    const [r0, r1] = await pub.readContract({
        address: V2_PAIR, abi: V2_PAIR_ABI, functionName: "getReserves",
    });
    const token0 = await pub.readContract({
        address: V2_PAIR, abi: V2_PAIR_ABI, functionName: "token0",
    });
    const usdcIsToken0 = token0.toLowerCase() === USDC.toLowerCase();
    return {
        weth: usdcIsToken0 ? r1 : r0,
        usdc: usdcIsToken0 ? r0 : r1,
    };
}

// ── main ────────────────────────────────────────────────────────────
async function main() {
    // fund the EOAs with ETH
    const VICTIM_STARTING_ETH = parseEther("500");
    const BOT_STARTING_ETH = parseEther("500");
    await test.setBalance({ address: victim.address, value: VICTIM_STARTING_ETH });
    await test.setBalance({ address: bot.address, value: BOT_STARTING_ETH });

    // pause chain — txs sit in mempool until we mine
    await test.setAutomine(false);

    // ── initial state ──
    const reservesBefore = await getReserves();
    const victimAmountIn = parseEther("200");
    const cleanQuote = await quote(victimAmountIn, path);

    console.log("── INITIAL STATE ────────────────────────────────");
    console.log(`Pool reserves: ${formatUnits(reservesBefore.weth, 18)} WETH / ${formatUnits(reservesBefore.usdc, 6)} USDC`);
    console.log(`Spot price:    ${(Number(reservesBefore.usdc) / 1e6 / (Number(reservesBefore.weth) / 1e18)).toFixed(2)} USDC/ETH`);
    console.log(`Victim plans:  swap ${formatUnits(victimAmountIn, 18)} ETH → expects ~${formatUnits(cleanQuote, 6)} USDC`);

    // ── 1. bot front-runs (broadcast first → lower index in block) ──
    const frontTx = await wBot.writeContract({
        address: UNISWAP_V2_ROUTER, abi: ROUTER_ABI,
        functionName: "swapExactETHForTokens",
        args: [0n, [...path], bot.address, deadline()],
        value: parseEther("50"),
    });

    // ── 2. victim swaps with 5% slippage tolerance ──
    const minOut = (cleanQuote * 95n) / 100n;
    const victimTx = await wVictim.writeContract({
        address: UNISWAP_V2_ROUTER, abi: ROUTER_ABI,
        functionName: "swapExactETHForTokens",
        args: [minOut, [...path], victim.address, deadline()],
        value: victimAmountIn,
    });

    // ── 3. mine block → both land, bot at index 0, victim at index 1 ──
    await test.mine({ blocks: 1 });

    // ── 4. read fresh balances post-sandwich-front ──
    const victimUsdcAfterSwap = await usdc.read.balanceOf([victim.address]);
    const botUsdcAfterFront = await usdc.read.balanceOf([bot.address]);
    const reservesMid = await getReserves();

    // ── 5. bot back-runs in next block: dump USDC → ETH ──
    await wBot.writeContract({
        address: USDC, abi: ERC20_ABI,
        functionName: "approve",
        args: [UNISWAP_V2_ROUTER, botUsdcAfterFront],
    });
    await test.mine({ blocks: 1 });

    const backTx = await wBot.writeContract({
        address: UNISWAP_V2_ROUTER, abi: ROUTER_ABI,
        functionName: "swapExactTokensForETH",
        args: [botUsdcAfterFront, 0n, [...reverse], bot.address, deadline()],
    });
    await test.mine({ blocks: 1 });

    // ── 6. measure damage ──
    const frontReceipt = await pub.getTransactionReceipt({ hash: frontTx });
    const victimReceipt = await pub.getTransactionReceipt({ hash: victimTx });
    const backReceipt = await pub.getTransactionReceipt({ hash: backTx });

    const botEthFinal = await pub.getBalance({ address: bot.address });
    const botUsdcFinal = await usdc.read.balanceOf([bot.address]);
    const reservesAfter = await getReserves();

    const victimLoss = cleanQuote - victimUsdcAfterSwap;
    const victimLossPct = (Number(victimLoss) / Number(cleanQuote)) * 100;
    const botProfitEth = botEthFinal - BOT_STARTING_ETH;

    console.log("── BLOCK ORDERING ───────────────────────────────");
    console.log(`Front-run: block ${frontReceipt.blockNumber}  index ${frontReceipt.transactionIndex}  status ${frontReceipt.status}`);
    console.log(`Victim:    block ${victimReceipt.blockNumber}  index ${victimReceipt.transactionIndex}  status ${victimReceipt.status}`);
    console.log(`Back-run:  block ${backReceipt.blockNumber}  index ${backReceipt.transactionIndex}  status ${backReceipt.status}`);
    console.log();

    console.log("── VICTIM IMPACT ────────────────────────────────");
    console.log(`Expected (no MEV):  ${formatUnits(cleanQuote, 6)} USDC`);
    console.log(`Actually received:  ${formatUnits(victimUsdcAfterSwap, 6)} USDC`);
    console.log(`Lost to slippage:   ${formatUnits(victimLoss, 6)} USDC  (${victimLossPct.toFixed(2)}%)`);
    console.log();

    console.log("── BOT PNL ──────────────────────────────────────");
    console.log(`ETH start:          ${formatUnits(BOT_STARTING_ETH, 18)} ETH`);
    console.log(`ETH end:            ${formatUnits(botEthFinal, 18)} ETH`);
    console.log(`Net profit:         ${formatUnits(botProfitEth, 18)} ETH (gas included)`);
    console.log(`USDC remaining:     ${formatUnits(botUsdcFinal, 6)} USDC`);
    console.log();

    console.log("── POOL DRIFT ───────────────────────────────────");
    console.log(`Before:  ${formatUnits(reservesBefore.weth, 18)} WETH / ${formatUnits(reservesBefore.usdc, 6)} USDC`);
    console.log(`After:   ${formatUnits(reservesAfter.weth, 18)} WETH / ${formatUnits(reservesAfter.usdc, 6)} USDC`);
}

main().catch(console.error);