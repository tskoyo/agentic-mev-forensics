"use client";

import { useCallback, useEffect, useState } from "react";
import { INVESTIGATIONS } from "@/lib/sample-data";
import { useInvestigation } from "@/lib/useInvestigation";
import { useTrades } from "@/lib/useTrades";
import { useWebhookEvents } from "@/lib/useWebhookEvents";
import { Header } from "./Header";
import { TradesSidebar } from "./sidebar/TradesSidebar";
import { InvestigationCanvas } from "./canvas/InvestigationCanvas";
import { WebhookToastStack } from "./WebhookToastStack";
import type { ToastItem } from "./WebhookToastStack";

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

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((txHash: string) => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${txHash}`, txHash }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useWebhookEvents({ trades, onNewWebhookTrade: addToast });

  const selectedTrade = trades.find((t) => t.id === selectedId);
  const activeInvestigation = liveInvestigation ?? (selectedId ? INVESTIGATIONS[selectedId] ?? null : null);

  function handleSelectTrade(id: string) {
    setSelectedId(id);
    reset();
  }

  function handleJumpToTrade(txHash: string) {
    const trade = trades.find((t) => t.fullHash === txHash);
    if (trade) {
      setSelectedId(trade.id);
      reset();
    }
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

      <WebhookToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        onJump={handleJumpToTrade}
      />
    </div>
  );
}
