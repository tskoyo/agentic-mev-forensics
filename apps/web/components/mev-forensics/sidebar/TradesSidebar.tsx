"use client";

import type { Trade } from "@/lib/types";
import { SectionLabel } from "../primitives/SectionLabel";
import { TradeRow } from "./TradeRow";

interface Props {
  trades: Trade[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function TradesSidebar({ trades, selectedId, onSelect }: Props) {
  return (
    <div className="w-[280px] shrink-0 bg-canvas border-r border-border-s flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-s flex items-center justify-between">
        <SectionLabel className="!mb-0">Trades</SectionLabel>
        <button
          type="button"
          className="px-2.5 py-1 rounded bg-green text-white text-[11px] font-medium border-0 cursor-pointer hover:opacity-90 transition-opacity"
        >
          + New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {trades.map((t) => (
          <TradeRow
            key={t.id}
            trade={t}
            selected={t.id === selectedId}
            onClick={() => onSelect(t.id)}
          />
        ))}
      </div>

      {/* Suggested follow-ups */}
      <div className="border-t border-border-s px-4 py-3">
        <SectionLabel>Suggested follow-ups</SectionLabel>
        <div className="flex flex-col gap-1">
          {["Who ran that tx?", "Could I have won this?"].map((q) => (
            <button
              key={q}
              type="button"
              className="bg-surface border border-border-d rounded-md px-2.5 py-1.5 text-xs text-text-p text-left flex justify-between items-center shadow-sm cursor-pointer hover:bg-sunken transition-colors"
            >
              {q}
              <span className="text-text-t text-sm">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
