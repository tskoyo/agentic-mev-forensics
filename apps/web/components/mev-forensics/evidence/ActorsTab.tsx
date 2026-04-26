import type { Actor } from "@/lib/types";
import { CopyIcon, ExtLinkIcon } from "../primitives/icons";
import { Mono } from "../primitives/Mono";
import { RoleChip } from "../primitives/RoleChip";

interface Props {
  actors: Actor[];
}

export function ActorsTab({ actors }: Props) {
  if (!actors || actors.length === 0) {
    return (
      <div className="text-xs text-text-t py-3">No actor data.</div>
    );
  }

  return (
    <div className="bg-surface border border-border-s rounded-lg overflow-hidden">
      {actors.map((a, i) => {
        const colorClass =
          a.deltaColor === "gain"
            ? "text-green"
            : a.deltaColor === "loss"
            ? "text-red"
            : "text-text-t";
        return (
          <div
            key={i}
            className={`px-3 py-2.5 flex flex-col gap-1 ${
              i < actors.length - 1 ? "border-b border-border-s" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1.5">
                <RoleChip role={a.role} />
                <span className="text-[13px] font-medium text-text-p">
                  {a.label}
                </span>
              </div>
              <Mono size={12} className={`font-medium ${colorClass}`}>
                {a.delta}
              </Mono>
            </div>
            <div className="flex items-center gap-1.5">
              <Mono size={11} className="text-text-t">{a.addr}</Mono>
              <CopyIcon />
              <ExtLinkIcon />
            </div>
          </div>
        );
      })}
    </div>
  );
}
