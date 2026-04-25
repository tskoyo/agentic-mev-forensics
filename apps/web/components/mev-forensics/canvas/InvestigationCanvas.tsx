"use client";

import { useState } from "react";
import type { Investigation, Trade } from "@/lib/types";
import { Mono } from "../primitives/Mono";
import { SectionLabel } from "../primitives/SectionLabel";
import { ChevronDownTinyIcon, SearchIcon, SendIcon } from "../primitives/icons";
import { BudgetMeter } from "./BudgetMeter";
import { NarrativeBlock } from "./NarrativeBlock";
import { PnLCard } from "./PnLCard";
import { ToolCallRow } from "./ToolCallRow";

interface Props {
  trade: Trade | undefined;
  investigation: Investigation | null;
  onFollowUp?: (q: string) => void;
}

export function InvestigationCanvas({ trade, investigation, onFollowUp }: Props) {
  const [input, setInput] = useState("");
  const [toolsOpen, setToolsOpen] = useState(true);

  if (!trade || !investigation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface flex-col gap-3">
        <div className="w-12 h-12 rounded-xl bg-sunken flex items-center justify-center">
          <SearchIcon />
        </div>
        <div className="text-sm font-medium text-text-p">
          Awaiting investigation
        </div>
        <div className="text-xs text-text-t">
          Select a trade or paste a tx hash below
        </div>
      </div>
    );
  }

  const inv = investigation;
  const isUnchecked = trade.verdict === "not checked";

  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden min-w-0">
      {/* Top bar */}
      <div className="px-5 py-2.5 border-b border-border-s flex items-center gap-2.5">
        <span className="text-xs text-text-t">Investigation</span>
        <span className="text-border-d">·</span>
        <Mono size={12} className="text-text-s">{trade.hash}</Mono>
        <span className="text-border-d">·</span>
        <Mono size={12} className="text-text-t">block {trade.block}</Mono>
        <div className="flex-1" />
        <BudgetMeter used={inv.toolCalls.length} total={8} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* User question bubble */}
        {inv.question && (
          <div className="flex justify-end mb-5">
            <div className="bg-sunken border border-border-s rounded-l-xl rounded-tr-xl rounded-br-sm px-3.5 py-2.5 max-w-[480px] text-sm text-text-p leading-relaxed">
              {inv.question}
            </div>
          </div>
        )}

        {/* Tool calls */}
        {inv.toolCalls.length > 0 && (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setToolsOpen((o) => !o)}
              className="flex items-center gap-1.5 mb-2 cursor-pointer bg-transparent border-0 p-0"
            >
              <SectionLabel className="!mb-0">Tool Calls</SectionLabel>
              <span className="text-[10px] text-text-t font-mono bg-sunken px-1.5 py-px rounded-sm">
                {inv.toolCalls.length}/8
              </span>
              <ChevronDownTinyIcon open={toolsOpen} />
            </button>

            {toolsOpen && (
              <div className="flex flex-col gap-px bg-sunken rounded-md border border-border-s overflow-hidden">
                {inv.toolCalls.map((tc) => (
                  <ToolCallRow key={tc.id} tc={tc} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty / unchecked state */}
        {isUnchecked && (
          <div className="bg-sunken rounded-lg border border-border-s p-7 text-center mb-5">
            <div className="text-sm font-medium text-text-s mb-1.5">
              This trade has not been investigated yet
            </div>
            <div className="text-xs text-text-t mb-3.5">
              Gap: {trade.pnlDelta} ({inv.pnl.gapPct}) — below threshold
            </div>
            <button
              type="button"
              className="px-4.5 py-2 bg-green text-white border-0 rounded text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
              style={{ paddingLeft: 18, paddingRight: 18 }}
            >
              Investigate this trade
            </button>
          </div>
        )}

        {/* Narrative */}
        {inv.narrativeHeadline && (
          <NarrativeBlock
            verdict={trade.verdict}
            headline={inv.narrativeHeadline}
            body={inv.narrativeBody}
            ruledOut={inv.ruledOut}
          />
        )}

        {/* PnL card */}
        {inv.pnl.expected && <PnLCard pnl={inv.pnl} style={{ marginBottom: 20 }} />}

        {/* Follow-up chips */}
        {inv.followUps.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {inv.followUps.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onFollowUp?.(q)}
                className="px-3.5 py-1.5 rounded-full bg-surface border border-border-d shadow-sm text-[13px] text-text-p cursor-pointer transition-colors hover:bg-sunken"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border-s px-4 py-3 flex gap-2.5 items-center bg-surface">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this trade…"
          className="flex-1 px-3 py-2.5 bg-sunken border border-border-s rounded-md text-[13px] text-text-p outline-none font-sans"
        />
        <button
          type="button"
          className="px-3.5 py-2 bg-green text-white border-0 rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          Send
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
