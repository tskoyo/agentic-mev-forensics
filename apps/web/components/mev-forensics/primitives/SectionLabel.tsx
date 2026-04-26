import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: Props) {
  return (
    <div
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.06em]",
        "text-text-t mb-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
