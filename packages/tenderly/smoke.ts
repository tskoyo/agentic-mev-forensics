import { RpcClient } from "@mev/rpc";
import { TenderlyClient } from "./index.js";

const txHash = process.argv[2] as `0x${string}`;
if (!txHash) throw new Error("usage: smoke.ts <txHash>");

const rpc = new RpcClient();
const tenderly = new TenderlyClient({ rpc });

const { receipt } = await rpc.getTx(txHash);
const blockN = Number(receipt.blockNumber);

console.log("Block number is ", blockN);

console.log("--- simulate at N ---");
console.log(await tenderly.simulate(txHash, blockN));

console.log("--- simulate at N-1 ---");
console.log(await tenderly.simulate(txHash, blockN - 1));

console.log("--- getTrace ---");
const { call_tree } = await tenderly.getTrace(txHash);
console.log("root:", call_tree.type, call_tree.from, "→", call_tree.to, "children:", call_tree.calls?.length);

console.log("--- cache hit on repeat ---");
await tenderly.simulate(txHash, blockN); // expect "cache hit"
