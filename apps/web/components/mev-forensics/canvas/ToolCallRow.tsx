import { cn } from "@/lib/cn";
import { TOOL_STATUS_STYLES } from "@/lib/styles";
import type { ToolCall } from "@/lib/types";
import { Mono } from "../primitives/Mono";

interface Props {
  tc: ToolCall;
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
    >
      <div
        className={cn(
          "w-[7px] h-[7px] rounded-full shrink-0",
          s.dotClass,
          s.pulse && "animate-pulse-slow",
        )}
      />
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
          s.bg, s.text,
        )}
      >
        {s.label}
      </span>
      {tc.duration && (
        <Mono size={11} className="text-text-t">
          {tc.duration}
        </Mono>
      )}
    </div>
  );
}
