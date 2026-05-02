import { investigate } from "./index.js";
import type { SSEEvent } from "@mev/shared";

const txHash = process.argv[2];
if (!txHash) throw new Error("usage: smoke.ts <txHash>");

function printEvent(event: SSEEvent) {
    switch (event.type) {
        case "tool_call":
            if (event.status === "running") {
                console.log(`\n[tool:${event.name}] running  ${JSON.stringify(event.input)}`);
            } else if (event.status === "done") {
                console.log(`[tool:${event.name}] done`);
            } else {
                console.log(`[tool:${event.name}] error: ${event.error}`);
            }
            break;
        case "text_delta":
            process.stdout.write(event.delta);
            break;
        case "report":
            console.log("\n\n── FINAL REPORT ─────────────────────────────────");
            console.log(JSON.stringify(event.payload, null, 2));
            break;
        case "error":
            console.error(`\n[error] ${event.message}`);
            break;
    }
}

console.log(`Investigating: ${txHash}\n`);
const report = await investigate(txHash, printEvent);

if (!report) {
    console.log("\n[warn] Could not extract structured report from response.");
}
