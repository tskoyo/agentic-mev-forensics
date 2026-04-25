import { Mono } from "../primitives/Mono";

interface Props {
  used: number;
  total: number;
}

export function BudgetMeter({ used, total }: Props) {
  const pct = (used / total) * 100;
  const colorClass =
    pct >= 100 ? "text-red" : pct >= 75 ? "text-amber" : "text-green";
  const fillBg =
    pct >= 100 ? "bg-red" : pct >= 75 ? "bg-amber" : "bg-green";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-text-t">Tool budget</span>
      <div className="w-[60px] h-[3px] bg-border-s rounded-sm overflow-hidden">
        <div
          className={`h-full ${fillBg} rounded-sm transition-[width] duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Mono size={11} className={colorClass}>
        {used}/{total}
      </Mono>
    </div>
  );
}
