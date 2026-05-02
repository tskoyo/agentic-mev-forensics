"use client";

import { useMemo, useState } from "react";
import type { TradeListItem } from "@mev/shared";
import { SectionLabel } from "../primitives/SectionLabel";
import { TradeRow } from "./TradeRow";

type FilterOption = "all" | "frontrun" | "unknown" | "normal";

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all",      label: "All"      },
  { value: "frontrun", label: "Frontrun" },
  { value: "unknown",  label: "Unknown"  },
  { value: "normal",   label: "Normal"   },
];

interface Props {
  trades: TradeListItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNew?: () => void;
}

export function TradesSidebar({ trades, selectedId, onSelect, onNew }: Props) {
  const [filter, setFilter] = useState<FilterOption>("all");

  const visible = useMemo(() => {
    const filtered =
      filter === "all" ? trades : trades.filter((t) => t.verdict === filter);
    return [...filtered].sort((a, b) => (b.block ?? 0) - (a.block ?? 0));
  }, [trades, filter]);

  return (
    <div className="w-[280px] shrink-0 bg-canvas border-r border-border-s flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-s flex items-center justify-between">
        <SectionLabel className="!mb-0">Trades</SectionLabel>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterOption)}
            className="text-[11px] text-text-s bg-surface border border-border-d rounded px-1.5 py-0.5 cursor-pointer outline-none hover:border-border-p transition-colors"
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onNew}
            className="px-2.5 py-1 rounded bg-green text-white text-[11px] font-medium border-0 cursor-pointer hover:opacity-90 transition-opacity"
          >
            + New
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="h-full flex items-center justify-center px-6">
            <p className="text-xs text-text-t text-center leading-relaxed">
              {filter === "all"
                ? "Paste a tx hash below or wait for a webhook to trigger an investigation."
                : `No ${filter} trades found.`}
            </p>
          </div>
        ) : (
          visible.map((t) => (
            <TradeRow
              key={t.tx_hash}
              trade={t}
              selected={t.tx_hash === selectedId}
              onClick={() => onSelect(t.tx_hash)}
            />
          ))
        )}
      </div>

    </div>
  );
}
