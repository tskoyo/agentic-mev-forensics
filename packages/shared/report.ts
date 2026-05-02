import { TradeReport } from "./index.js";

export function extractReport(
    txHash: string,
    messages: { role: string; content: unknown }[]
): TradeReport | null {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return null;

    const content = Array.isArray(last.content)
        ? (last.content as { type: string; text?: string }[]).find(
            (b) => b.type === "text"
        )?.text
        : (last.content as string);
    if (!content) return null;

    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) return null;

    try {
        const parsed = JSON.parse(match[1]) as TradeReport;
        return { ...parsed, tx_hash: txHash, created_at: Date.now(), tool_calls: parsed.tool_calls ?? [], is_auto: parsed.is_auto ?? false };
    } catch {
        return null;
    }
}