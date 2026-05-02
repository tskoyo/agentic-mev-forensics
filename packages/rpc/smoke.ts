import { RpcClient } from "./index.js";
const rpcUrl = "http://127.0.0.1:8545";

async function main() {
    const rpcClient = new RpcClient({ rpcUrl: rpcUrl });

    const tx = await rpcClient.getTx("0x7e00448097a64a4e7df9c63220b76374468f0f56856112acf82215fc42416b37");

    console.log("Tx:", tx);
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});