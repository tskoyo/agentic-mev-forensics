import { config } from "dotenv";
config({ path: new URL("../../.env", import.meta.url).pathname });
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages.js";
import type { SSEEvent, ToolName } from "@mev/shared";
import { TOOL_BUDGET } from "@mev/shared";

export type { MessageParam };

export type ToolFn = (input: Record<string, unknown>) => Promise<unknown>;

export interface ToolDefinition {
    description: string;
    input_schema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
    };
    fn: ToolFn;
}

export interface RunToolLoopOptions {
    messages: MessageParam[];
    tools: Map<string, ToolDefinition>;
    systemPrompt: string;
    maxCalls?: number;
    onEvent: (event: SSEEvent) => void;
}

export interface RunToolLoopResult {
    messages: MessageParam[];
    toolCallCount: number;
}

export class ClaudeClient {
    private readonly client: Anthropic;

    constructor(opts: { apiKey?: string } = {}) {
        const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("ClaudeClient: ANTHROPIC_API_KEY is not set");
        this.client = new Anthropic({ apiKey });
    }

    async runToolLoop({
        messages,
        tools,
        systemPrompt,
        maxCalls = TOOL_BUDGET,
        onEvent,
    }: RunToolLoopOptions): Promise<RunToolLoopResult> {
        const history: MessageParam[] = [...messages];
        let toolCallCount = 0;

        const toolSchemas = [...tools.entries()].map(([name, def]) => ({
            name,
            description: def.description,
            input_schema: def.input_schema,
        }));

        while (true) {
            const budgetExhausted = toolCallCount >= maxCalls;

            if (budgetExhausted) {
                history.push({
                    role: "user",
                    content: `Tool budget exhausted (${maxCalls} calls used). Produce a final report now using only what you have already gathered. If you cannot reach a confident conclusion, use outcome A9 and root_cause B9.`,
                });
            }

            const stream = this.client.messages.stream({
                model: "claude-sonnet-4-6",
                system: systemPrompt,
                messages: history,
                // Pass empty tools when budget is exhausted to force a text-only response
                tools: budgetExhausted ? [] : toolSchemas,
                max_tokens: 4096,
            });

            stream.on("text", (delta: string) => {
                onEvent({ type: "text_delta", delta });
            });

            const response = await stream.finalMessage();
            history.push({ role: "assistant", content: response.content });

            if (response.stop_reason === "end_turn" || budgetExhausted) {
                break;
            }

            if (response.stop_reason === "tool_use") {
                const toolUseBlocks = response.content.filter(
                    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
                );

                const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

                for (const block of toolUseBlocks) {
                    toolCallCount++;
                    const def = tools.get(block.name);
                    const input = block.input as Record<string, unknown>;

                    onEvent({
                        type: "tool_call",
                        id: block.id,
                        name: block.name as ToolName,
                        input,
                        status: "running",
                    });

                    let output: unknown;

                    try {
                        if (!def) throw new Error(`Unknown tool: ${block.name}`);
                        output = await def.fn(input);
                        onEvent({
                            type: "tool_call",
                            id: block.id,
                            name: block.name as ToolName,
                            status: "done",
                            output,
                        });
                    } catch (err) {
                        const error = err instanceof Error ? err.message : String(err);
                        output = { error };
                        onEvent({
                            type: "tool_call",
                            id: block.id,
                            name: block.name as ToolName,
                            status: "error",
                            error,
                        });
                    }

                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: JSON.stringify(output),
                    });
                }

                history.push({ role: "user", content: toolResults });
            }
        }

        return { messages: history, toolCallCount };
    }
}
