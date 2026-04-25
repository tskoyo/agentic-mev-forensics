"use client";

import { useEffect, useState } from "react";
import { INVESTIGATIONS, TRADES } from "@/lib/sample-data";
import { Header } from "./Header";
import { TradesSidebar } from "./sidebar/TradesSidebar";
import { InvestigationCanvas } from "./canvas/InvestigationCanvas";
import { EvidencePanel } from "./evidence/EvidencePanel";
import { WebhookToast } from "./WebhookToast";

export function App() {
  const [selectedId, setSelectedId] = useState<string>("tx1");
  const [showToast, setShowToast]   = useState(false);
  const [dark, setDark]             = useState(false);

  // Apply theme to <html data-theme> so CSS vars in globals.css swap.
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }, [dark]);

  const selectedTrade = TRADES.find((t) => t.id === selectedId);
  const selectedInv   = selectedId ? INVESTIGATIONS[selectedId] ?? null : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-canvas">
      <Header
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
        onSimulateWebhook={() => setShowToast(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <TradesSidebar
          trades={TRADES}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <InvestigationCanvas
          trade={selectedTrade}
          investigation={selectedInv}
          onFollowUp={(q) => console.log("follow up:", q)}
        />
        <EvidencePanel
          trade={selectedTrade}
          investigation={selectedInv}
        />
      </div>

      {showToast && <WebhookToast onDismiss={() => setShowToast(false)} />}
    </div>
  );
}
