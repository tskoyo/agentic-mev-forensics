"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { TradeListItem } from "@mev/shared";
import type { Investigation } from "@/lib/types";
import { truncateAddress } from "@/lib/useAddressLabel";
import { Mono } from "../primitives/Mono";
import { SectionLabel } from "../primitives/SectionLabel";
import { ChevronDownTinyIcon, SearchIcon, SendIcon } from "../primitives/icons";
import { BudgetMeter } from "./BudgetMeter";
import { NarrativeBlock } from "./NarrativeBlock";
import { PnLCard } from "./PnLCard";
import { ToolCallRow } from "./ToolCallRow";

interface Props {
  trade: TradeListItem | undefined;
  investigation: Investigation | null;
  isStreaming?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSend?: (text: string) => void;
}

function SkeletonBar({ w }: { w?: string }) {
  return (
    <div
      className="h-3 rounded bg-sunken animate-pulse-slow"
      style={{ width: w ?? "100%" }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2">
          <SkeletonBar w="64px" />
          <SkeletonBar w="24px" />
        </div>
        <div className="flex flex-col gap-px bg-sunken rounded-md border border-border-s overflow-hidden">
          {[55, 70, 45].map((pct, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-3 py-[9px] border-b border-border-s bg-surface"
            >
              <div className="w-4 h-4 rounded-full bg-sunken animate-pulse-slow shrink-0" />
              <SkeletonBar w={`${pct}%`} />
              <SkeletonBar w="56px" />
              <SkeletonBar w="44px" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-sunken rounded-r-lg border-l-[3px] border-border-d px-3.5 py-3 animate-pulse-slow">
        <SkeletonBar w="40%" />
        <div className="mt-2.5 flex flex-col gap-2">
          <SkeletonBar />
          <SkeletonBar w="80%" />
          <SkeletonBar w="60%" />
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const isNotFound = message.toLowerCase().includes("not found") || message.includes("404");

  return (
    <div className="flex-1 flex items-center justify-center p-5">
      <div className="bg-red-bg border border-red-bd rounded-lg p-6 max-w-sm w-full text-center">
        <AlertCircle size={20} strokeWidth={1.5} className="text-red mx-auto mb-3" />
        <div className="text-sm font-semibold text-text-p mb-1.5">
          {isNotFound ? "Trade not found" : "Investigation failed"}
        </div>
        <div className="text-xs text-text-t mb-4 leading-relaxed">{message}</div>
        <div className="flex gap-2 justify-center">
          {isNotFound && (
            <span className="text-xs text-text-t">Check the tx hash and try again.</span>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-surface border border-border-d rounded-md text-[13px] text-text-p font-medium cursor-pointer hover:bg-sunken transition-colors"
            >
              <RefreshCw size={12} strokeWidth={1.5} />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InvestigationCanvas({
  trade,
  investigation,
  isStreaming = false,
  error = null,
  onRetry,
  onSend,
}: Props) {
  const [input, setInput] = useState("");
  const [toolsOpen, setToolsOpen] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const toolsEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toolsEndRef.current && toolsOpen) {
      toolsEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [investigation?.toolCalls.length, toolsOpen]);

  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isStreaming, investigation?.narrativeBody]);

  function handleCitationClick(toolCallId: string) {
    const el = document.querySelector(`[data-tc-id="${toolCallId}"]`);
    if (el) {
      if (!toolsOpen) setToolsOpen(true);
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedId(toolCallId);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 2000);
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    onSend?.(text);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!trade || !investigation) {
    return (
      <div className="flex-1 flex flex-col bg-surface overflow-hidden min-w-0">
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="w-12 h-12 rounded-xl bg-sunken flex items-center justify-center">
            <SearchIcon />
          </div>
          <div className="text-sm font-medium text-text-p">Awaiting investigation</div>
          <div className="text-xs text-text-t">Select a trade or paste a tx hash below</div>
        </div>
        <div className="border-t border-border-s px-4 py-3 flex gap-2.5 items-center bg-surface">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste a tx hash to investigate…"
            className="flex-1 px-3 py-2.5 bg-sunken border border-border-s rounded-md text-[13px] text-text-p outline-none font-sans"
          />
          <button
            type="button"
            onClick={handleSend}
            className="px-3.5 py-2 bg-green text-white border-0 rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            Send
            <SendIcon />
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col bg-surface overflow-hidden min-w-0">
        <div className="px-5 py-2.5 border-b border-border-s flex items-center gap-2.5">
          <span className="text-xs text-text-t">Investigation</span>
          <span className="text-border-d">·</span>
          <Mono size={12} className="text-text-s">{truncateAddress(trade.tx_hash)}</Mono>
          <div className="flex-1" />
        </div>
        <ErrorPanel message={error} onRetry={onRetry} />
      </div>
    );
  }

  const inv = investigation;
  const isUnchecked = trade.verdict === "not_checked" && !isStreaming;
  const isLoadingSkeleton = isStreaming && inv.toolCalls.length === 0 && !inv.narrativeBody;

  if (isLoadingSkeleton) {
    return (
      <div className="flex-1 flex flex-col bg-surface overflow-hidden min-w-0">
        <div className="px-5 py-2.5 border-b border-border-s flex items-center gap-2.5">
          <span className="text-xs text-text-t">Investigation</span>
          <span className="text-border-d">·</span>
          <Mono size={12} className="text-text-s">{truncateAddress(trade.tx_hash)}</Mono>
          <span className="text-border-d">·</span>
          <span className="text-[11px] text-green animate-pulse-slow font-medium">running</span>
          <div className="flex-1" />
          <BudgetMeter used={0} total={8} />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden min-w-0">
      {/* Top bar */}
      <div className="px-5 py-2.5 border-b border-border-s flex items-center gap-2.5">
        <span className="text-xs text-text-t">Investigation</span>
        <span className="text-border-d">·</span>
        <Mono size={12} className="text-text-s">{truncateAddress(trade.tx_hash)}</Mono>
        <span className="text-border-d">·</span>
        <Mono size={12} className="text-text-t">block {trade.block?.toLocaleString() ?? "—"}</Mono>
        {isStreaming && (
          <>
            <span className="text-border-d">·</span>
            <span className="text-[11px] text-green animate-pulse-slow font-medium">live</span>
          </>
        )}
        <div className="flex-1" />
        <BudgetMeter used={inv.toolCalls.length} total={8} />
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
        {/* User question bubble */}
        {inv.question && (
          <div className="flex justify-end mb-5">
            <div className="bg-sunken border border-border-s rounded-l-xl rounded-tr-xl rounded-br-sm px-3.5 py-2.5 max-w-[480px] text-sm text-text-p leading-relaxed">
              {inv.question}
            </div>
          </div>
        )}

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
                  <ToolCallRow key={tc.id} tc={tc} highlighted={highlightedId === tc.id} />
                ))}
                <div ref={toolsEndRef} />
              </div>
            )}
          </div>
        )}

        {isUnchecked && (
          <div className="bg-sunken rounded-lg border border-border-s p-7 text-center mb-5">
            <div className="text-sm font-medium text-text-s mb-1.5">
              This trade has not been investigated yet
            </div>
            <div className="text-xs text-text-t mb-3.5">
              Gap: {trade.pnl_delta_usd != null ? `${trade.pnl_delta_usd >= 0 ? "+" : "-"}$${Math.abs(trade.pnl_delta_usd).toFixed(2)}` : "—"} ({inv.pnl.gapPct}) — below threshold
            </div>
            <button
              type="button"
              onClick={() => onSend?.(`Investigate ${trade.tx_hash}`)}
              className="px-4.5 py-2 bg-green text-white border-0 rounded text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
              style={{ paddingLeft: 18, paddingRight: 18 }}
            >
              Investigate this trade
            </button>
          </div>
        )}

        {/* Narrative */}
        {(inv.narrativeHeadline || inv.narrativeBody) && (
          <NarrativeBlock
            verdict={inv.verdict}
            headline={inv.narrativeHeadline}
            body={inv.narrativeBody}
            ruledOut={inv.ruledOut}
            streaming={isStreaming}
            toolCalls={inv.toolCalls}
            actors={inv.actors}
            onCitationClick={handleCitationClick}
          />
        )}

        {inv.pnl.expected && <PnLCard pnl={inv.pnl} style={{ marginBottom: 20 }} />}

        {/* Follow-up chips */}
        {!isStreaming && inv.followUps.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {inv.followUps.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSend?.(q)}
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
          onKeyDown={handleKeyDown}
          placeholder="Ask about this trade…"
          disabled={isStreaming}
          className="flex-1 px-3 py-2.5 bg-sunken border border-border-s rounded-md text-[13px] text-text-p outline-none font-sans disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          className="px-3.5 py-2 bg-green text-white border-0 rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
