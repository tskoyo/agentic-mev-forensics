"use client";

import { useCallback, useRef, useState } from "react";
import type { Investigation, ToolCall, Verdict } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Local SSE event types — mirrors packages/shared without creating a hard dependency
type SSEToolCall = {
  type: "tool_call";
  id: string;
  name: string;
  input?: Record<string, unknown>;
  status: "running" | "done" | "error";
  error?: string;
};
type SSETextDelta = { type: "text_delta"; delta: string };
type SSEReport = {
  type: "report";
  payload: {
    outcome: string;
    root_cause: string | null;
    expected_pnl: number | null;
    realized_pnl: number;
    pnl_delta: number | null;
    narrative: string;
    created_at: number;
  };
};
type SSEError = { type: "error"; message: string };
type SSEEvent = SSEToolCall | SSETextDelta | SSEReport | SSEError;

function deriveVerdict(outcome: string, rootCause: string | null): Verdict {
  if (outcome === "A2" && rootCause === "B1") return "frontrun";
  if (outcome === "A2" && rootCause === "B9") return "unknown";
  if (outcome === "A1") return "normal";
  return "unknown";
}

function verdictHeadline(verdict: Verdict): string {
  if (verdict === "frontrun") return "Frontrunner confirmed";
  if (verdict === "unknown") return "No cause found";
  if (verdict === "normal") return "Within normal variance";
  return "Investigation complete";
}

function verdictFollowUps(verdict: Verdict): string[] {
  if (verdict === "frontrun") return ["Who ran that tx?", "Could I have won this?"];
  if (verdict === "unknown") return ["What else could explain this?", "How confident are you?"];
  return ["Show me the simulation details"];
}

function fmtUsd(n: number) {
  return `$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(delta: number, expected: number) {
  if (expected === 0) return "—";
  return `${Math.abs((delta / expected) * 100).toFixed(1)}%`;
}

function fmtInput(input?: Record<string, unknown>): string {
  if (!input) return "";
  return Object.entries(input)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

export interface UseInvestigationResult {
  investigation: Investigation | null;
  isStreaming: boolean;
  error: string | null;
  start: (txHash: string, question?: string) => void;
  reset: () => void;
}

export function useInvestigation(): UseInvestigationResult {
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setInvestigation(null);
    setIsStreaming(false);
    setError(null);
  }, []);

  const start = useCallback(async (txHash: string, question?: string) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setError(null);
    setIsStreaming(true);
    setInvestigation({
      completed_at: null,
      source: "manual",
      question: question ?? null,
      toolCalls: [],
      verdict: "not checked",
      narrativeHeadline: null,
      narrativeBody: null,
      pnl: {
        expected: null,
        realized: null,
        gap: "—",
        gapPct: "—",
        thresholdPct: false,
        thresholdUsd: false,
      },
      followUps: [],
      actors: [],
      citations: [],
      timeline: [],
    });

    try {
      const res = await fetch(`${API_BASE}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_hash: txHash }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`API responded ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

          let event: SSEEvent;
          try {
            event = JSON.parse(raw) as SSEEvent;
          } catch {
            continue;
          }

          if (event.type === "tool_call") {
            const ev = event;
            setInvestigation((prev) => {
              if (!prev) return prev;
              const exists = prev.toolCalls.some((t) => t.id === ev.id);

              if (!exists && ev.status === "running") {
                const tc: ToolCall = {
                  id: ev.id,
                  name: ev.name,
                  input: fmtInput(ev.input),
                  status: "running",
                  startedAt: Date.now(),
                };
                return { ...prev, toolCalls: [...prev.toolCalls, tc] };
              }

              return {
                ...prev,
                toolCalls: prev.toolCalls.map((t) => {
                  if (t.id !== ev.id) return t;
                  if (ev.status === "done") {
                    const duration = t.startedAt
                      ? `${((Date.now() - t.startedAt) / 1000).toFixed(1)}s`
                      : undefined;
                    return { ...t, status: "done" as const, duration };
                  }
                  if (ev.status === "error") {
                    return { ...t, status: "error" as const, error: ev.error ?? "Unknown error" };
                  }
                  return t;
                }),
              };
            });
          } else if (event.type === "text_delta") {
            const { delta } = event;
            setInvestigation((prev) =>
              prev ? { ...prev, narrativeBody: (prev.narrativeBody ?? "") + delta } : prev,
            );
          } else if (event.type === "report") {
            const { payload: p } = event;
            const verdict = deriveVerdict(p.outcome, p.root_cause);
            setInvestigation((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                completed_at: new Date(p.created_at * 1000).toISOString(),
                verdict,
                narrativeHeadline: verdictHeadline(verdict),
                narrativeBody: p.narrative,
                pnl: {
                  expected: p.expected_pnl != null ? fmtUsd(p.expected_pnl) : null,
                  realized: fmtUsd(p.realized_pnl),
                  gap:
                    p.pnl_delta != null
                      ? `${p.pnl_delta > 0 ? "+" : ""}${fmtUsd(p.pnl_delta)}`
                      : "—",
                  gapPct:
                    p.pnl_delta != null && p.expected_pnl != null
                      ? fmtPct(p.pnl_delta, p.expected_pnl)
                      : "—",
                  thresholdPct:
                    p.pnl_delta != null && p.expected_pnl != null && p.expected_pnl !== 0
                      ? Math.abs(p.pnl_delta / p.expected_pnl) > 0.05
                      : false,
                  thresholdUsd: p.pnl_delta != null ? Math.abs(p.pnl_delta) >= 10 : false,
                },
                followUps: verdictFollowUps(verdict),
              };
            });
            setIsStreaming(false);
          } else if (event.type === "error") {
            setError((event as SSEError).message);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { investigation, isStreaming, error, start, reset };
}
