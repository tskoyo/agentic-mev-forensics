"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { VERDICT_STYLES } from "@/lib/styles";
import type { Investigation, Trade } from "@/lib/types";
import { Mono } from "../primitives/Mono";
import { SectionLabel } from "../primitives/SectionLabel";
import { StackIcon } from "../primitives/icons";
import { ActorsTab } from "./ActorsTab";
import { CitationsTab } from "./CitationsTab";
import { TimelineTab } from "./TimelineTab";

type Tab = "actors" | "timeline" | "citations";

interface Props {
  trade: Trade | undefined;
  investigation: Investigation | null;
}

export function EvidencePanel({ trade, investigation }: Props) {
  const [tab, setTab] = useState<Tab>("actors");

  // Empty state
  if (!trade || !investigation || trade.verdict === "not checked") {
    return (
      <div className="w-[340px] shrink-0 bg-canvas border-l border-border-s flex flex-col items-center justify-center gap-2.5 p-6">
        <div className="w-10 h-10 rounded-[10px] bg-sunken flex items-center justify-center">
          <StackIcon />
        </div>
        <div className="text-[13px] font-medium text-text-s text-center">
          No evidence gathered
        </div>
        <div className="text-xs text-text-t text-center leading-relaxed">
          Evidence will appear here as the agent runs tool calls.
        </div>
      </div>
    );
  }

  const inv = investigation;
  const vs = VERDICT_STYLES[trade.verdict] ?? VERDICT_STYLES["not checked"];

  const verdictHeadline =
    trade.verdict === "frontrun"
      ? "Frontrunner found"
      : trade.verdict === "unknown"
      ? "No cause found"
      : "Normal variance";

  const verdictSub =
    trade.verdict === "frontrun"
      ? "Same block · index 11 · confidence 0.94"
      : trade.verdict === "unknown"
      ? "Full audit complete · no hypothesis confirmed"
      : "Gap within threshold";

  return (
    <div className="w-[340px] shrink-0 bg-canvas border-l border-border-s flex flex-col h-full overflow-hidden">
      {/* Verdict card */}
      <div
        className={cn(
          "m-3 px-3.5 py-3 rounded-lg border",
          vs.bg, vs.border,
        )}
      >
        <div className={`text-sm font-semibold mb-1 ${vs.text}`}>
          {verdictHeadline}
        </div>
        <div className="text-[11px] text-text-s leading-relaxed">
          {verdictSub}
        </div>
      </div>

      {/* PnL summary */}
      {inv.pnl.expected && (
        <div className="mx-3 mb-3 px-3 py-2.5 bg-surface border border-border-s rounded-lg">
          <SectionLabel>PnL Breakdown</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Expected", val: inv.pnl.expected },
              { label: "Realized", val: inv.pnl.realized },
            ].map((c) => (
              <div key={c.label}>
                <div className="text-[11px] text-text-t">{c.label}</div>
                <Mono size={14} className="font-medium text-text-p">
                  {c.val}
                </Mono>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border-s">
            <div className="text-[11px] text-text-t mb-0.5">
              Lost to frontrunner
            </div>
            <Mono size={16} className="font-semibold text-red">
              {inv.pnl.gap}
            </Mono>
          </div>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex items-center px-3 pb-2.5 gap-1">
        <div className="flex bg-sunken rounded-md p-0.5 gap-0.5 flex-1">
          {(["actors", "timeline", "citations"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 px-2 py-1 rounded border-0 text-[11px] font-medium",
                "cursor-pointer capitalize transition-all duration-150",
                tab === t
                  ? "bg-surface text-text-p shadow-sm"
                  : "bg-transparent text-text-t",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {tab === "actors"    && <ActorsTab    actors={inv.actors} />}
        {tab === "timeline"  && <TimelineTab  timeline={inv.timeline} />}
        {tab === "citations" && <CitationsTab citations={inv.citations} />}
      </div>
    </div>
  );
}
