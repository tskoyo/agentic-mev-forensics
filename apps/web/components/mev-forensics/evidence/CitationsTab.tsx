import { TAG_COLORS } from "@/lib/styles";
import type { Citation } from "@/lib/types";

interface Props {
  citations: Citation[];
}

export function CitationsTab({ citations }: Props) {
  if (!citations || citations.length === 0) {
    return <div className="text-xs text-text-t py-3">No citations yet.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {citations.map((c, i) => {
        const tclr = TAG_COLORS[c.tagColor] ?? TAG_COLORS.slate;
        return (
          <div
            key={i}
            className="bg-surface border border-border-s rounded-lg px-3 py-2.5"
          >
            <span
              className="inline-block px-[7px] py-px rounded-sm text-[10px] font-medium mb-1.5"
              style={{ background: tclr.bg, color: tclr.text }}
            >
              {c.tag}
            </span>
            <div className="text-xs font-semibold text-text-p mb-1">
              {c.title}
            </div>
            <div className="font-mono text-[11px] text-text-s leading-relaxed whitespace-pre-line">
              {c.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
