"use client";

import { useEffect, useState } from "react";
import { INVESTIGATIONS, TRADES } from "@/lib/sample-data";
import { useInvestigation } from "@/lib/useInvestigation";
import { Header } from "./Header";
import { TradesSidebar } from "./sidebar/TradesSidebar";
import { InvestigationCanvas } from "./canvas/InvestigationCanvas";

export function App() {
  const [selectedId, setSelectedId] = useState<string>("tx1");
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.dataset.theme === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.dataset.theme = "dark";
      localStorage.setItem("theme", "dark");
    } else {
      root.dataset.theme = "light";
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const { investigation: liveInvestigation, isStreaming, start, reset } = useInvestigation();

  const selectedTrade = TRADES.find((t) => t.id === selectedId);

  // Use live investigation when streaming; fall back to saved mock data
  const activeInvestigation = liveInvestigation ?? (selectedId ? INVESTIGATIONS[selectedId] ?? null : null);

  function handleSelectTrade(id: string) {
    setSelectedId(id);
    reset();
  }

  function handleSend(text: string) {
    if (!selectedTrade) return;
    // Detect tx hash input (0x... ≥ 10 chars) vs follow-up question
    const isTxHash = /^0x[0-9a-fA-F]{6,}/.test(text.trim());
    const txHash = isTxHash ? text.trim() : selectedTrade.fullHash;
    const question = isTxHash ? undefined : text.trim();
    start(txHash, question);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-canvas">
      <Header
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
      />

      <div className="flex-1 flex overflow-hidden">
        <TradesSidebar
          trades={TRADES}
          selectedId={selectedId}
          onSelect={handleSelectTrade}
        />
        <InvestigationCanvas
          trade={selectedTrade}
          investigation={activeInvestigation}
          isStreaming={isStreaming}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
