"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${date} · ${time} UTC`;
}

interface Props {
  completedAt: string;
}

export function ReplayBanner({ completedAt }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 bg-sunken border-b border-border-s">
      <Clock size={14} strokeWidth={1.5} className="text-text-t shrink-0" />
      <span className="text-xs text-text-t flex-1">
        Replay mode — investigation completed at {formatTimestamp(completedAt)}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-text-t hover:text-text-s transition-colors p-0.5 cursor-pointer border-0 bg-transparent"
      >
        <X size={12} strokeWidth={1.5} />
      </button>
    </div>
  );
}
