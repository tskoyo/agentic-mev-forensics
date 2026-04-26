"use client";

import { useEffect } from "react";

interface Props {
  onDismiss: () => void;
}

export function WebhookToast({ onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-[100] bg-surface border border-green-bd rounded-lg px-3.5 py-2.5 shadow-lg flex items-center gap-2.5 text-[13px] text-text-p max-w-[300px] animate-fade-in">
      <span className="px-[7px] py-px rounded bg-green-bg text-green border border-green-bd text-[10px] font-medium inline-flex items-center gap-1">
        <span className="w-[5px] h-[5px] rounded-full bg-green animate-pulse-slow" />
        auto
      </span>
      <span>New trade detected via webhook</span>
      <button
        type="button"
        onClick={onDismiss}
        className="bg-transparent border-0 cursor-pointer text-text-t text-base leading-none pl-1"
      >
        ×
      </button>
    </div>
  );
}
