"use client";

import { useState, type ReactNode } from "react";
import { VERDICT_STYLES } from "@/lib/styles";
import type { RuledOut, Verdict } from "@/lib/types";
import { ChevronIcon, MinusInCircleIcon } from "../primitives/icons";

interface Props {
  verdict: Verdict;
  headline: string | null;
  body: string | null;
  ruledOut?: RuledOut[];
  streaming?: boolean;
}

/** Splits narrative body and renders [citation] tokens as inline chips. */
function renderBody(text: string | null): ReactNode {
  if (!text) return null;
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((p, i) => {
    if (p.startsWith("[") && p.endsWith("]")) {
      return (
        <span
          key={i}
          className="inline px-1.5 py-px rounded-sm font-mono text-[12px] whitespace-nowrap cursor-pointer border"
          style={{
            background: "#EEF0FA",
            color: "#3B4A9E",
            borderColor: "#C5CCF0",
          }}
        >
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function NarrativeBlock({ verdict, headline, body, ruledOut, streaming }: Props) {
  const vs = VERDICT_STYLES[verdict] ?? VERDICT_STYLES["not checked"];
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
          {renderBody(body)}
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
