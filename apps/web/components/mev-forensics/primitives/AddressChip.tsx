"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExtLinkIcon } from "./icons";
import { Mono } from "./Mono";

interface Props {
  /** Semantic label or truncated address to display inline */
  display: string;
  /** Full address shown inside the tooltip */
  fullAddress: string;
  /** Whether the full address is a tx hash (→ /tx/) or a wallet/contract (→ /address/) */
  type?: "address" | "tx";
  /** When true, renders display as normal weighted text instead of monospace */
  hasLabel?: boolean;
  size?: number;
  className?: string;
}

export function AddressChip({
  display,
  fullAddress,
  type = "address",
  hasLabel = false,
  size = 11,
  className,
}: Props) {
  const etherscanUrl = `https://etherscan.io/${type}/${fullAddress}`;
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const open = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.top + r.height / 2, left: r.right + 8 });
    }
  }, []);

  const close = useCallback(() => {
    closeTimer.current = setTimeout(() => setPos(null), 100);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={open}
      onMouseLeave={close}
    >
      {hasLabel ? (
        <span className="text-[13px] font-medium text-text-p cursor-default">
          {display}
        </span>
      ) : (
        <Mono size={size} className="text-text-t cursor-default">
          {display}
        </Mono>
      )}

      {pos &&
        createPortal(
          <div
            className="fixed z-[9999]"
            style={{ top: pos.top, left: pos.left, transform: "translateY(-50%)" }}
            onMouseEnter={cancelClose}
            onMouseLeave={close}
          >
            <div className="bg-[#1A1A1A] rounded-lg px-2.5 py-2 shadow-xl border border-white/[0.08] min-w-[200px]">
              <p className="font-mono text-[10px] text-white/60 mb-1.5 break-all select-all leading-relaxed">
                {fullAddress}
              </p>
              <a
                href={etherscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[11px] text-[#60A5FA] no-underline hover:text-[#93C5FD] transition-colors"
              >
                <ExtLinkIcon className="text-[#60A5FA] shrink-0" />
                View on Etherscan
              </a>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
