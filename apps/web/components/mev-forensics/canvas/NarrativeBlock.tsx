"use client";

import { useState, type ReactNode } from "react";
import type { TradeVerdict } from "@mev/shared";
import { VERDICT_STYLES } from "@/lib/styles";
import type { Actor, RuledOut, ToolCall } from "@/lib/types";
import { truncateAddress } from "@/lib/useAddressLabel";
import { AddressChip } from "../primitives/AddressChip";
import { ChevronIcon, MinusInCircleIcon } from "../primitives/icons";

// Matches truncated addresses like 0x4f72…c81e or full hex addresses 0x4f72...c81e
const ADDRESS_RE = /0x[0-9a-fA-F]{4}[…\.]{1,3}[0-9a-fA-F]{4}|0x[0-9a-fA-F]{64}|0x[0-9a-fA-F]{40}/g;

interface Props {
  verdict: TradeVerdict;
  headline: string | null;
  body: string | null;
  ruledOut?: RuledOut[];
  streaming?: boolean;
  toolCalls?: ToolCall[];
  actors?: Actor[];
  onCitationClick?: (toolCallId: string) => void;
}

function findToolCall(token: string, toolCalls: ToolCall[]): ToolCall | undefined {
  const normalized = token.slice(1, -1).trim().toLowerCase();
  return (
    toolCalls.find((tc) => tc.id.toLowerCase() === normalized) ??
    toolCalls.find((tc) => tc.name.toLowerCase() === normalized) ??
    toolCalls.find((tc) => tc.name.toLowerCase().includes(normalized)) ??
    toolCalls.find((tc) => normalized.includes(tc.name.toLowerCase()))
  );
}

function CitationChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="inline px-1.5 py-px rounded-sm font-mono text-[12px] whitespace-nowrap border cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#3B4A9E]"
      style={{
        background: "#EEF0FA",
        color: "#3B4A9E",
        borderColor: "#C5CCF0",
      }}
    >
      {label}
    </button>
  );
}

function UnverifiedChip({ label }: { label: string }) {
  return (
    <span
      className="inline px-1.5 py-px rounded-sm font-mono text-[12px] whitespace-nowrap border"
      style={{
        background: "#FEF2F2",
        color: "#B91C1C",
        borderColor: "#FECACA",
      }}
      title="Claim not linked to a tool result"
    >
      {label} [unverified]
    </span>
  );
}

function splitWithAddresses(text: string): string[] {
  const parts: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  ADDRESS_RE.lastIndex = 0;
  while ((m = ADDRESS_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderBody(
  text: string | null,
  toolCalls: ToolCall[],
  actors: Actor[],
  onCitationClick: ((toolCallId: string) => void) | undefined,
): ReactNode {
  if (!text) return null;

  // First split on citation tokens [...]
  const citationParts = text.split(/(\[[^\]]+\])/g);
  let keyIdx = 0;

  return citationParts.map((part) => {
    if (part.startsWith("[") && part.endsWith("]")) {
      const k = keyIdx++;
      const match = findToolCall(part, toolCalls);
      if (match) {
        return (
          <CitationChip key={k} label={part} onClick={() => onCitationClick?.(match.id)} />
        );
      }
      return <UnverifiedChip key={k} label={part} />;
    }

    // Within plain text, detect and replace address-like strings
    const addrParts = splitWithAddresses(part);
    return addrParts.map((seg) => {
      const k = keyIdx++;
      if (ADDRESS_RE.test(seg) || /^0x[0-9a-fA-F]{4}[…\.]{1,3}[0-9a-fA-F]{4}$/.test(seg)) {
        const actor = actors.find(
          (a) =>
            a.addr === seg ||
            (a.fullAddr && a.fullAddr.toLowerCase() === seg.toLowerCase()),
        );
        return (
          <AddressChip
            key={k}
            display={truncateAddress(seg)}
            fullAddress={actor?.fullAddr ?? seg}
            type="address"
            className="inline-flex align-baseline mx-0.5"
          />
        );
      }
      return <span key={k}>{seg}</span>;
    });
  });
}

export function NarrativeBlock({
  verdict,
  headline,
  body,
  ruledOut,
  streaming,
  toolCalls = [],
  actors = [],
  onCitationClick,
}: Props) {
  const vs = VERDICT_STYLES[verdict] ?? VERDICT_STYLES.not_checked;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-5">
      {/* Headline + body */}
      <div
        className={`${vs.bg} rounded-r-lg px-3.5 py-2.5 ${
          ruledOut ? "" : "mb-3"
        }`}
        style={{
          borderLeft: `3px solid var(--${vs.text.replace("text-", "")})`,
        }}
      >
        {headline && (
          <div className={`text-base font-semibold mb-1.5 ${vs.text}`}>
            {headline}
          </div>
        )}
        <div className="text-[13px] text-text-p leading-relaxed">
          {renderBody(body, toolCalls, actors, onCitationClick)}
          {streaming && (
            <span className="inline-block w-[2px] h-[14px] bg-text-s align-middle ml-0.5 animate-pulse-slow" />
          )}
        </div>
      </div>

      {/* Ruled-out collapse */}
      {ruledOut && (
        <div className="border border-border-d border-t-0 rounded-b-lg overflow-hidden bg-amber-bg border-amber-bd">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer bg-transparent border-0"
          >
            <span className="text-xs font-medium text-amber">
              Full audit trail — {ruledOut.length} hypotheses ruled out
            </span>
            <ChevronIcon open={expanded} />
          </button>
          {expanded && (
            <div className="px-3.5 pb-3 pt-1">
              {ruledOut.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs text-text-s leading-relaxed pt-1 pb-2 ${
                    i < ruledOut.length - 1 ? "border-b border-amber-bd" : ""
                  }`}
                >
                  <MinusInCircleIcon />
                  <span>
                    {r.text}{" "}
                    <span className="font-mono text-[10px] text-text-t">
                      [{r.cite}]
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
