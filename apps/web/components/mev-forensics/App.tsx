"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [selectedId, setSelectedId] = useState<string>("");
  const autoSelectedRef = useRef(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.dataset.theme === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Auto-select the first trade on initial load only — never overrides a
  // deliberate deselection (e.g. the user clicked "+ New").
  useEffect(() => {
    if (!autoSelectedRef.current && trades.length > 0) {
      autoSelectedRef.current = true;
      setSelectedId(trades[0].tx_hash);
    }
  }, [trades]);

  const { investigation: liveInvestigation, isStreaming, error, start, reset } = useInvestigation();

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [focusTrigger, setFocusTrigger] = useState(0);

  const addToast = useCallback((txHash: string) => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${txHash}`, txHash }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useWebhookEvents({ trades, onNewWebhookTrade: addToast });

  const selectedTrade = trades.find((t) => t.tx_hash === selectedId);
  const activeInvestigation = liveInvestigation ?? null;

  function handleSelectTrade(id: string) {
    setSelectedId(id);
    reset();
  }

  function handleJumpToTrade(txHash: string) {
    const trade = trades.find((t) => t.tx_hash === txHash);
    if (trade) {
      setSelectedId(trade.tx_hash);
      reset();
    }
  }

  function handleNew() {
    setSelectedId("");
    reset();
    setFocusTrigger((n) => n + 1);
  }

  function handleSend(text: string) {
    const trimmed = text.trim();
    const isTxHash = /^0x[0-9a-fA-F]{6,}/.test(trimmed);
    if (!selectedTrade && !isTxHash) return;
    const txHash = isTxHash ? trimmed : selectedTrade!.tx_hash;
    const question = isTxHash ? undefined : trimmed;
    if (!selectedTrade) setSelectedId(txHash);
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
          onNew={handleNew}
        />
        <InvestigationCanvas
          trade={selectedTrade}
          investigation={activeInvestigation}
          isStreaming={isStreaming}
          error={error}
          onSend={handleSend}
          onRetry={() => selectedTrade && start(selectedTrade.tx_hash)}
          focusTrigger={focusTrigger}
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
