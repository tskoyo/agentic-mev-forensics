import { ClaudeClient } from "./index.js";
import type { SSEEvent } from "@mev/shared";

const client = new ClaudeClient();

const tools = new Map([
    [
        "echo",
        {
            description: "Echoes back the message you provide.",
            input_schema: {
                type: "object" as const,
                properties: {
                    message: { type: "string", description: "The message to echo" },
                },
                required: ["message"],
            },
            fn: async (input: Record<string, unknown>) => {
                return { echoed: input.message };
            },
        },
    ],
]);

function printEvent(event: SSEEvent) {
    switch (event.type) {
        case "tool_call":
            if (event.status === "running") {
                console.log(`[tool_call] ${event.name}  status=running  input=${JSON.stringify(event.input)}`);
            } else if (event.status === "done") {
                console.log(`[tool_call] ${event.name}  status=done  output=${JSON.stringify(event.output)}`);
            } else {
                console.log(`[tool_call] ${event.name}  status=error  error=${event.error}`);
            }
            break;
        case "text_delta":
            process.stdout.write(event.delta);
            break;
    }
}

console.log("── running tool loop ────────────────────────────\n");

const result = await client.runToolLoop({
    messages: [{ role: "user", content: 'Use the echo tool to echo the message "hello from MEV forensics", then summarize what happened in one sentence.' }],
    tools,
    systemPrompt: "You are a helpful assistant. Always use tools when asked.",
    maxCalls: 8,
    onEvent: printEvent,
});

console.log(`\n\n── done ─────────────────────────────────────────`);
console.log(`toolCallCount: ${result.toolCallCount}`);
console.log(`history turns: ${result.messages.length}`);
