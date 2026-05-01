import type { TradeVerdict } from "@mev/shared";
import { cn } from "@/lib/cn";
import { VERDICT_STYLES } from "@/lib/styles";

interface Props {
  verdict: TradeVerdict;
  isAuto?: boolean;
}

export function VerdictBadge({ verdict, isAuto }: Props) {
  const s = VERDICT_STYLES[verdict] ?? VERDICT_STYLES.not_checked;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-[2px]",
        "text-[11px] font-medium whitespace-nowrap border",
        s.bg, s.text, s.border,
      )}
    >
      {isAuto && (
        <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-slow" />
      )}
      {s.label}
    </span>
  );
}
