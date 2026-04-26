"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { VERDICT_STYLES } from "@/lib/styles";
import type { Trade } from "@/lib/types";
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
        <Mono size={12} className="font-medium text-text-p">
          {trade.hash}
        </Mono>
        <VerdictBadge verdict={trade.verdict} />
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
