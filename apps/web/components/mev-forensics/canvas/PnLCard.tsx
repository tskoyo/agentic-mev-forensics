import type { CSSProperties } from "react";
import type { Pnl } from "@/lib/types";
import { Mono } from "../primitives/Mono";

interface Props {
  pnl: Pnl;
  style?: CSSProperties;
}

export function PnLCard({ pnl, style }: Props) {
  const cells = [
    { label: "Expected", val: pnl.expected, colorClass: "text-text-p" },
    { label: "Realized", val: pnl.realized, colorClass: "text-text-p" },
    { label: "Gap",      val: pnl.gap,      colorClass: "text-red", bg: "bg-red-bg" },
  ];
  const thresholds = [
    { label: "gap > 5%",  met: pnl.thresholdPct },
    { label: "gap > $10", met: pnl.thresholdUsd },
  ];

  return (
    <div
      className="bg-surface border border-border-s rounded-lg overflow-hidden"
      style={style}
    >
      <div className="grid grid-cols-3 gap-px bg-border-s">
        {cells.map((c) => (
          <div
            key={c.label}
            className={`${c.bg ?? "bg-surface"} px-2.5 py-3 text-center`}
          >
            <div className="text-[11px] text-text-t mb-1">{c.label}</div>
            <Mono size={15} className={`font-medium ${c.colorClass}`}>
              {c.val ?? "—"}
            </Mono>
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-3 py-2.5">
        {thresholds.map((t) => (
          <span
            key={t.label}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-[2px] text-[11px] border ${
              t.met
                ? "bg-red-bg text-red border-red-bd"
                : "bg-slate-bg text-slate border-slate-bd"
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full text-white text-[8px] font-bold inline-flex items-center justify-center ${
                t.met ? "bg-red" : "bg-text-t"
              }`}
            >
              {t.met ? "✓" : "✗"}
            </span>
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
