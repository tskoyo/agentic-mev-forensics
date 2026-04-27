"use client";

import { useEffect, useRef, useState } from "react";
import { INVESTIGATIONS, TRADES } from "@/lib/sample-data";
import { Header } from "./Header";
import { TradesSidebar } from "./sidebar/TradesSidebar";
import { InvestigationCanvas } from "./canvas/InvestigationCanvas";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function App() {
  const [selectedId, setSelectedId] = useState<string>("tx1");
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.dataset.theme === "dark";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [investigationError, setInvestigationError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  function handleSelectTrade(id: string) {
    abortRef.current?.abort();
    setSelectedId(id);
    setIsLoading(false);
    setInvestigationError(null);
  }

  async function handleInvestigate() {
    const trade = TRADES.find((t) => t.id === selectedId);
    if (!trade) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsLoading(true);
    setInvestigationError(null);

    try {
      const res = await fetch(`${API_BASE}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_hash: trade.fullHash }),
        signal: abort.signal,
      });
      if (!res.ok) {
        const msg = res.status === 404 ? "Trade not found" : `Server error (${res.status})`;
        throw new Error(msg);
      }
      // SSE streaming wired in the next PR; loading clears when stream ends
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setInvestigationError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedTrade = TRADES.find((t) => t.id === selectedId);
  const selectedInv = selectedId ? INVESTIGATIONS[selectedId] ?? null : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-canvas">
      <Header dark={dark} onToggleDark={() => setDark((d) => !d)} />

      <div className="flex-1 flex overflow-hidden">
        <TradesSidebar
          trades={TRADES}
          selectedId={selectedId}
          onSelect={handleSelectTrade}
        />
        <InvestigationCanvas
          trade={selectedTrade}
          investigation={selectedInv}
          isLoading={isLoading}
          error={investigationError}
          onRetry={handleInvestigate}
          onInvestigate={handleInvestigate}
          onFollowUp={(q) => console.log("follow up:", q)}
        />
      </div>
    </div>
  );
}
