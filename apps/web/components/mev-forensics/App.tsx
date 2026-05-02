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
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTxInput, setNewTxInput] = useState("");

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
    setNewTxInput("");
    setNewModalOpen(true);
  }

  function handleNewSubmit() {
    const trimmed = newTxInput.trim();
    if (!trimmed) return;
    setNewModalOpen(false);
    setNewTxInput("");
    setSelectedId(trimmed);
    reset();
    start(trimmed);
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
        />
      </div>

      <WebhookToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        onJump={handleJumpToTrade}
      />

      {newModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setNewModalOpen(false)}
        >
          <div
            className="bg-surface border border-border-s rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-text-p mb-1">New investigation</div>
            <div className="text-xs text-text-t mb-4">Paste an Ethereum transaction hash to investigate.</div>
            <input
              autoFocus
              value={newTxInput}
              onChange={(e) => setNewTxInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNewSubmit()}
              placeholder="0x…"
              className="w-full px-3 py-2.5 bg-sunken border border-border-s rounded-md text-[13px] text-text-p outline-none font-mono mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-[13px] text-text-s border border-border-d bg-surface cursor-pointer hover:bg-sunken transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNewSubmit}
                disabled={!/^0x[0-9a-fA-F]{6,}/.test(newTxInput.trim())}
                className="px-3.5 py-1.5 rounded-md text-[13px] text-white bg-green border-0 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Investigate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
