"use client";

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

  return (
    <div className={`relative inline-flex group/addr ${className ?? ""}`}>
      {hasLabel ? (
        <span className="text-[13px] font-medium text-text-p cursor-default">
          {display}
        </span>
      ) : (
        <Mono size={size} className="text-text-t cursor-default">
          {display}
        </Mono>
      )}

      {/* pb-1.5 creates an invisible bridge so the tooltip stays open when moving between trigger and tooltip */}
      <div className="absolute bottom-full left-0 pb-1.5 z-50 invisible opacity-0 group-hover/addr:visible group-hover/addr:opacity-100 transition-opacity duration-150 pointer-events-none group-hover/addr:pointer-events-auto">
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
      </div>
    </div>
  );
}
