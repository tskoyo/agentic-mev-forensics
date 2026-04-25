import type { TimelineEntry } from "@/lib/types";
import { Mono } from "../primitives/Mono";
import { RoleChip } from "../primitives/RoleChip";

interface Props {
  timeline: TimelineEntry[];
}

export function TimelineTab({ timeline }: Props) {
  if (!timeline || timeline.length === 0) {
    return <div className="text-xs text-text-t py-3">No timeline data.</div>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {timeline.map((tx, i) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md border ${
            tx.highlight
              ? "bg-red-bg border-red-bd"
              : "bg-surface border-border-s"
          }`}
        >
          <Mono
            size={11}
            className="text-text-t w-6 text-right shrink-0"
          >
            #{tx.index}
          </Mono>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Mono size={12} className="font-medium text-text-p">
                {tx.hash}
              </Mono>
              <RoleChip role={tx.role} />
            </div>
            {tx.highlight && (
              <div className="text-[11px] text-red mt-0.5">← your tx</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
