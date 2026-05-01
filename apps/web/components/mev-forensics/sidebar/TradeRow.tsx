"use client";

import { useState } from "react";
import type { TradeListItem } from "@mev/shared";
import { cn } from "@/lib/cn";
import { VERDICT_STYLES } from "@/lib/styles";
import { truncateAddress } from "@/lib/useAddressLabel";
import { AddressChip } from "../primitives/AddressChip";
import { Mono } from "../primitives/Mono";
import { VerdictBadge } from "../primitives/VerdictBadge";

interface Props {
  trade: TradeListItem;
  selected: boolean;
  onClick: () => void;
}

export function TradeRow({ trade, selected, onClick }: Props) {
  const vs = VERDICT_STYLES[trade.verdict] ?? VERDICT_STYLES.not_checked;
  const [hovered, setHovered] = useState(false);

  const pnlDelta = trade.pnl_delta_usd != null
    ? `${trade.pnl_delta_usd >= 0 ? "+" : "-"}$${Math.abs(trade.pnl_delta_usd).toFixed(2)}`
    : "—";
  const isLoss = trade.pnl_delta_usd !== null && trade.pnl_delta_usd < 0;
  const blockStr = trade.block?.toLocaleString() ?? "—";
  const summary = trade.description ?? trade.label ?? "—";

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
          display={truncateAddress(trade.tx_hash)}
          fullAddress={trade.tx_hash}
          type="tx"
          size={12}
          className="font-medium"
        />
        <VerdictBadge verdict={trade.verdict} isAuto={trade.is_auto} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-text-s">{summary}</span>
        <Mono
          size={12}
          className={cn("font-medium", isLoss ? "text-red" : "text-green")}
        >
          {pnlDelta}
        </Mono>
      </div>
      <Mono size={11} className="text-text-t">
        block {blockStr}
      </Mono>
    </div>
  );
}
