import { cn } from "@/lib/cn";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Font-size in px. Default 12. */
  size?: number;
  /** Override color via raw value or CSS variable e.g. `var(--red)`. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function Mono({ children, size = 12, color, className, style }: Props) {
  return (
    <span
      className={cn("font-mono text-text-p", className)}
      style={{ fontSize: size, color, ...style }}
    >
      {children}
    </span>
  );
}
