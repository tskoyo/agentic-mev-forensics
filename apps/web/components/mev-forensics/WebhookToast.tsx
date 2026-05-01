"use client";

import { useEffect } from "react";

interface Props {
  txHash: string;
  onDismiss: () => void;
  onJump: (txHash: string) => void;
}

export function WebhookToast({ txHash, onDismiss, onJump }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const short = `${txHash.slice(0, 6)}…${txHash.slice(-4)}`;

  return (
    <div className="bg-surface border border-green-bd rounded-lg px-3.5 py-2.5 shadow-lg flex items-center gap-2.5 text-[13px] text-text-p max-w-[300px] animate-fade-in">
      <span className="px-[7px] py-px rounded bg-green-bg text-green border border-green-bd text-[10px] font-medium inline-flex items-center gap-1 shrink-0">
        <span className="w-[5px] h-[5px] rounded-full bg-green animate-pulse-slow" />
        auto
      </span>
      <button
        type="button"
        onClick={() => onJump(txHash)}
        className="flex-1 text-left bg-transparent border-0 p-0 cursor-pointer text-[13px] text-text-p hover:underline"
      >
        New trade — {short}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="bg-transparent border-0 cursor-pointer text-text-t text-base leading-none pl-1 shrink-0"
      >
        ×
      </button>
    </div>
  );
}
