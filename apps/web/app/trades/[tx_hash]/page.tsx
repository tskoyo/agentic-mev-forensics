"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTrades } from "@/lib/useTrades";
import { useInvestigation } from "@/lib/useInvestigation";
import Link from "next/link";
import { AlertCircle, SearchX } from "lucide-react";
import type { TradeListItem, TradeVerdict } from "@mev/shared";
import type { Investigation, ToolCall } from "@/lib/types";
import { Header } from "@/components/mev-forensics/Header";
import { TradesSidebar } from "@/components/mev-forensics/sidebar/TradesSidebar";
import { InvestigationCanvas } from "@/components/mev-forensics/canvas/InvestigationCanvas";
import { ReplayBanner } from "@/components/mev-forensics/canvas/ReplayBanner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Mirrors packages/shared TradeReport — no hard dependency on the package
interface ApiToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: "running" | "done" | "error";
  duration_ms?: number;
  error?: string;
}

interface ApiTradeReport {
  tx_hash: string;
  outcome: string;
  root_cause: string | null;
  expected_pnl: number | null;
  realized_pnl: number;
  pnl_delta: number | null;
  narrative: string;
  tool_calls: ApiToolCall[];
  created_at: number;
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

function deriveVerdict(outcome: string, rootCause: string | null): TradeVerdict {
  if (outcome === "A2" && rootCause === "B1") return "frontrun";
  if (outcome === "A2" && rootCause === "B9") return "unknown";
  if (outcome === "A1") return "normal";
  return "unknown";
}

function verdictHeadline(v: TradeVerdict): string {
  if (v === "frontrun") return "Frontrunner confirmed";
  if (v === "unknown") return "No cause found";
  if (v === "normal") return "Within normal variance";
  return "Investigation complete";
}

function verdictFollowUps(v: TradeVerdict): string[] {
  if (v === "frontrun") return ["Who ran that tx?", "Could I have won this?"];
  if (v === "unknown") return ["What else could explain this?", "How confident are you?"];
  return ["Show me the simulation details"];
}

function fmtUsd(n: number): string {
  return `$${Math.abs(n).toFixed(2)}`;
}

function fmtPct(delta: number, expected: number): string {
  if (expected === 0) return "—";
  return `${Math.abs((delta / expected) * 100).toFixed(1)}%`;
}

function fmtInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

function truncateHash(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function mapToTradeListItem(r: ApiTradeReport): TradeListItem {
  const verdict = deriveVerdict(r.outcome, r.root_cause);
  const getTradeOut = r.tool_calls.find((tc) => tc.name === "get_trade")?.output;
  const block = (getTradeOut as { block?: number } | undefined)?.block;

  return {
    tx_hash: r.tx_hash,
    description: verdict === "frontrun" ? "Arb frontrun" : verdict === "unknown" ? "Arb underperformed" : "Arb normal",
    verdict,
    pnl_delta_usd: r.pnl_delta ?? null,
    block: block ?? null,
    is_auto: false,
  };
}

function mapToInvestigation(r: ApiTradeReport): Investigation {
  const verdict = deriveVerdict(r.outcome, r.root_cause);
  const toolCalls: ToolCall[] = r.tool_calls.map((tc) => ({
    id: tc.id,
    name: tc.name,
    input: fmtInput(tc.input),
    status: tc.status === "error" ? ("error" as const) : ("done" as const),
    duration: tc.duration_ms != null ? `${(tc.duration_ms / 1000).toFixed(1)}s` : undefined,
    error: tc.error,
  }));

  return {
    completed_at: new Date(r.created_at * 1000).toISOString(),
    source: "manual",
    question: null,
    toolCalls,
    verdict,
    narrativeHeadline: verdictHeadline(verdict),
    narrativeBody: r.narrative,
    pnl: {
      expected: r.expected_pnl != null ? fmtUsd(r.expected_pnl) : null,
      realized: fmtUsd(r.realized_pnl),
      gap: r.pnl_delta != null
        ? `${r.pnl_delta > 0 ? "+" : ""}${fmtUsd(r.pnl_delta)}`
        : "—",
      gapPct: r.pnl_delta != null && r.expected_pnl != null
        ? fmtPct(r.pnl_delta, r.expected_pnl)
        : "—",
      thresholdPct: r.pnl_delta != null && r.expected_pnl != null && r.expected_pnl !== 0
        ? Math.abs(r.pnl_delta / r.expected_pnl) > 0.05
        : false,
      thresholdUsd: r.pnl_delta != null ? Math.abs(r.pnl_delta) >= 10 : false,
    },
    followUps: verdictFollowUps(verdict),
    actors: [],
    citations: [],
    timeline: [],
  };
}

// ── Page states ──────────────────────────────────────────────────────────────

type PageState =
  | { status: "loading" }
  | { status: "found"; trade: TradeListItem; investigation: Investigation; completedAt: string }
  | { status: "not-found"; txHash: string }
  | { status: "error"; message: string };

// ── Sub-layouts ──────────────────────────────────────────────────────────────

function PageShell({ children, dark, onToggle }: { children: React.ReactNode; dark: boolean; onToggle: () => void }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-canvas">
      <Header dark={dark} onToggleDark={onToggle} />
      <div className="flex-1 flex overflow-hidden">{children}</div>
    </div>
  );
}

function NotFoundLayout({ txHash }: { txHash: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-sunken flex items-center justify-center mx-auto mb-4">
          <SearchX size={20} strokeWidth={1.5} className="text-text-t" />
        </div>
        <div className="text-sm font-semibold text-text-p mb-2">Report not found</div>
        <p className="text-xs text-text-t leading-relaxed mb-5">
          No saved investigation for{" "}
          <span className="font-mono">{truncateHash(txHash)}</span>.
          It may not have been investigated yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-green text-white rounded-md text-[13px] font-medium no-underline hover:opacity-90 transition-opacity"
        >
          Start new investigation
        </Link>
      </div>
    </div>
  );
}

function ErrorLayout({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <AlertCircle size={20} strokeWidth={1.5} className="text-red mx-auto mb-3" />
        <div className="text-sm font-semibold text-text-p mb-1.5">Failed to load report</div>
        <p className="text-xs text-text-t mb-4">{message}</p>
        <Link
          href="/"
          className="text-xs text-green underline-offset-2 underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function TradePage() {
  const router = useRouter();
  const { tx_hash } = useParams<{ tx_hash: string }>();
  const { trades } = useTrades();
  const { investigation: liveInvestigation, isStreaming, error, start } = useInvestigation();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.dataset.theme === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!tx_hash) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/trades/${encodeURIComponent(tx_hash)}`);
        if (cancelled) return;
        if (res.status === 404) {
          setState({ status: "not-found", txHash: tx_hash });
          return;
        }
        if (!res.ok) {
          throw new Error(`Server error (${res.status})`);
        }
        const report = (await res.json()) as ApiTradeReport;
        if (cancelled) return;
        setState({
          status: "found",
          trade: mapToTradeListItem(report),
          investigation: mapToInvestigation(report),
          completedAt: new Date(report.created_at * 1000).toISOString(),
        });
      } catch (err: unknown) {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Connection failed",
        });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tx_hash]);

  const toggleDark = () => setDark((d) => !d);

  if (state.status === "loading") {
    return (
      <PageShell dark={dark} onToggle={toggleDark}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-text-t">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-slow" />
            Loading report…
          </div>
        </div>
      </PageShell>
    );
  }

  if (state.status === "not-found") {
    return (
      <PageShell dark={dark} onToggle={toggleDark}>
        <NotFoundLayout txHash={state.txHash} />
      </PageShell>
    );
  }

  if (state.status === "error") {
    return (
      <PageShell dark={dark} onToggle={toggleDark}>
        <ErrorLayout message={state.message} />
      </PageShell>
    );
  }

  const { trade, investigation, completedAt } = state;

  return (
    <PageShell dark={dark} onToggle={toggleDark}>
      <TradesSidebar
        trades={trades.length > 0 ? trades : [trade]}
        selectedId={trade.tx_hash}
        onSelect={(id) => router.push(`/trades/${id}`)}
        onNew={() => {
          sessionStorage.setItem("focusChat", "1");
          router.push("/");
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ReplayBanner completedAt={completedAt} />
        <InvestigationCanvas
          trade={trade}
          investigation={liveInvestigation ?? investigation}
          isStreaming={isStreaming}
          error={error}
          onSend={(text) => {
            const trimmed = text.trim();
            if (trimmed) start(trade.tx_hash, trimmed);
          }}
          onRetry={() => start(trade.tx_hash)}
        />
      </div>
    </PageShell>
  );
}
