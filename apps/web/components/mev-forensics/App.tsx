"use client";

import { useEffect, useState } from "react";
import { INVESTIGATIONS, TRADES } from "@/lib/sample-data";
import { Header } from "./Header";
import { TradesSidebar } from "./sidebar/TradesSidebar";
import { InvestigationCanvas } from "./canvas/InvestigationCanvas";

export function App() {
  const [selectedId, setSelectedId] = useState<string>("tx1");
  // Sync initial state from DOM — the no-flash script in layout.tsx already
  // applied the correct theme before hydration.
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.dataset.theme === "dark";
  });

  // Persist theme to localStorage and update DOM on toggle.
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

  const selectedTrade = TRADES.find((t) => t.id === selectedId);
  const selectedInv   = selectedId ? INVESTIGATIONS[selectedId] ?? null : null;

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
          onSelect={setSelectedId}
        />
        <InvestigationCanvas
          trade={selectedTrade}
          investigation={selectedInv}
          onFollowUp={(q) => console.log("follow up:", q)}
        />
      </div>
    </div>
  );
}
