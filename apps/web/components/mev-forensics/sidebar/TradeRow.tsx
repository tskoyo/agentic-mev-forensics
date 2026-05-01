"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { VERDICT_STYLES } from "@/lib/styles";
import type { Trade } from "@/lib/types";
import { AddressChip } from "../primitives/AddressChip";
import { Mono } from "../primitives/Mono";
import { VerdictBadge } from "../primitives/VerdictBadge";

interface Props {
  trade: Trade;
  selected: boolean;
  onClick: () => void;
}

export function TradeRow({ trade, selected, onClick }: Props) {
  const vs = VERDICT_STYLES[trade.verdict] ?? VERDICT_STYLES["not checked"];
  const [hovered, setHovered] = useState(false);

  const isLoss = trade.pnlDelta.startsWith("-");

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "px-4 py-2.5 cursor-pointer transition-colors duration-100",
        "border-b border-border-s",
        selected ? "bg-surface" : hovered ? "bg-black/[0.02]" : "bg-canvas",
      )}
      style={{
        borderLeft: selected
          ? `3px solid var(--${vs.text.replace("text-", "")})`
          : "3px solid transparent",
      }}
    >
      <div className="flex items-center justify-between mb-0.5">
        <AddressChip
          display={trade.hash}
          fullAddress={trade.fullHash}
          type="tx"
          size={12}
          className="font-medium"
        />
        <div className="flex items-center gap-1">
          {trade.source === "webhook" && (
            <span className="inline-flex items-center gap-1 rounded px-2 py-[2px] text-[11px] font-medium whitespace-nowrap border bg-green-bg text-green border-green-bd">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-slow" />
              auto
            </span>
          )}
          <VerdictBadge verdict={trade.verdict} />
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-text-s">{trade.summary}</span>
        <Mono
          size={12}
          className={cn("font-medium", isLoss ? "text-red" : "text-green")}
        >
          {trade.pnlDelta}
        </Mono>
      </div>
      <Mono size={11} className="text-text-t">
        block {trade.block}
      </Mono>
    </div>
  );
}
