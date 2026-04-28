"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Circle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { TOOL_STATUS_STYLES } from "@/lib/styles";
import type { ToolCall } from "@/lib/types";
import { Mono } from "../primitives/Mono";

interface Props {
  tc: ToolCall;
}

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <Mono size={11} className="text-text-t tabular-nums">
      {elapsed}s
    </Mono>
  );
}

function StatusIcon({ status }: { status: ToolCall["status"] }) {
  const props = { size: 16, strokeWidth: 1.5 };
  switch (status) {
    case "running":
      return <Circle {...props} className="text-green animate-pulse-slow shrink-0 transition-opacity duration-200" />;
    case "done":
      return <CheckCircle {...props} className="text-green shrink-0 transition-opacity duration-200" />;
    case "error":
      return <XCircle {...props} className="text-red shrink-0 transition-opacity duration-200" />;
    default:
      return <Clock {...props} className="text-text-t shrink-0" />;
  }
}

export function ToolCallRow({ tc }: Props) {
  const s = TOOL_STATUS_STYLES[tc.status] ?? TOOL_STATUS_STYLES.pending;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-[7px]",
        "border-b border-border-s bg-surface",
        s.dim ? "opacity-50" : "opacity-100",
      )}
      title={tc.status === "error" && tc.error ? tc.error : undefined}
    >
      <StatusIcon status={tc.status} />
      <span className="text-[13px] font-medium text-text-p flex-1 truncate">
        {tc.name}
      </span>
      <Mono
        size={12}
        className="text-text-s max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap"
      >
        {tc.input}
      </Mono>
      <span
        className={cn(
          "px-1.5 py-[2px] rounded-sm text-[10px] font-medium shrink-0",
          s.bg,
          s.text,
        )}
      >
        {s.label}
      </span>
      {tc.status === "running" && tc.startedAt != null ? (
        <ElapsedTimer startedAt={tc.startedAt} />
      ) : tc.duration ? (
        <Mono size={11} className="text-text-t tabular-nums">
          {tc.duration}
        </Mono>
      ) : null}
    </div>
  );
}
