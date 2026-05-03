import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { readWallets } from "./wallets.js";

const KEEPERHUB_API_URL = "https://app.keeperhub.com";

export function startWatcher(): void {
    const rpcUrl = process.env.ALCHEMY_RPC_URL;
    const workflowId = process.env.KEEPERHUB_WORKFLOW_ID;
    const apiKey = process.env.KEEPERHUB_API_KEY;

    if (!workflowId || !apiKey) {
        console.warn("[watcher] KEEPERHUB_WORKFLOW_ID or KEEPERHUB_API_KEY not set — wallet watcher disabled");
        return;
    }

    const client = createPublicClient({
        chain: mainnet,
        transport: http(rpcUrl),
    });

    client.watchBlockNumber({
        onBlockNumber: async (blockNumber) => {
            try {
                const wallets = await readWallets();
                if (wallets.length === 0) return;

                const addresses = new Set(wallets.map((w) => w.address.toLowerCase()));

                const block = await client.getBlock({
                    blockNumber,
                    includeTransactions: true,
                });

                for (const tx of block.transactions) {
                    if (typeof tx === "string") continue;
                    if (!tx.from || !addresses.has(tx.from.toLowerCase())) continue;

                    console.log(`[watcher] Detected tx from registered wallet: ${tx.hash}`);

                    console.log(`[watcher] Sending investigation request to KeeperHub for tx: ${tx.hash}
                        (workflow: ${workflowId}) url: ${KEEPERHUB_API_URL}/api/workflows/${workflowId}/webhook
                    `);
                    fetch(`${KEEPERHUB_API_URL}/api/workflows/${workflowId}/webhook`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${apiKey}`,
                        },
                        body: JSON.stringify({ tx_hash: tx.hash }),
                    }).catch((err) => {
                        console.error(`[watcher] KeeperHub call failed for ${tx.hash}:`, err);
                    });
                }
            } catch (err) {
                console.error("[watcher] Error processing block:", err);
            }
        },
        onError: (err) => {
            console.error("[watcher] watchBlockNumber error:", err);
        },
    });

    console.log("[watcher] Block watcher started");
}
