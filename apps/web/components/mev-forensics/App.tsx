"use client";

import { useEffect, useState } from "react";
import { INVESTIGATIONS } from "@/lib/sample-data";
import { useInvestigation } from "@/lib/useInvestigation";
import { useTrades } from "@/lib/useTrades";
import { Header } from "./Header";
import { TradesSidebar } from "./sidebar/TradesSidebar";
import { InvestigationCanvas } from "./canvas/InvestigationCanvas";

export function App() {
  const { trades } = useTrades();
  const [selectedId, setSelectedId] = useState<string>("tx1");
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.dataset.theme === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const { investigation: liveInvestigation, isStreaming, error, start, reset } = useInvestigation();

  const selectedTrade = trades.find((t) => t.id === selectedId);
  const activeInvestigation = liveInvestigation ?? (selectedId ? INVESTIGATIONS[selectedId] ?? null : null);

  function handleSelectTrade(id: string) {
    setSelectedId(id);
    reset();
  }

  function handleSend(text: string) {
    if (!selectedTrade) return;
    const isTxHash = /^0x[0-9a-fA-F]{6,}/.test(text.trim());
    const txHash = isTxHash ? text.trim() : selectedTrade.fullHash;
    const question = isTxHash ? undefined : text.trim();
    start(txHash, question);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-canvas">
      <Header dark={dark} onToggleDark={() => setDark((d) => !d)} />

      <div className="flex-1 flex overflow-hidden">
        <TradesSidebar
          trades={trades}
          selectedId={selectedId}
          onSelect={handleSelectTrade}
        />
        <InvestigationCanvas
          trade={selectedTrade}
          investigation={activeInvestigation}
          isStreaming={isStreaming}
          error={error}
          onSend={handleSend}
          onRetry={() => selectedTrade && start(selectedTrade.fullHash)}
        />
      </div>
    </div>
  );
}
