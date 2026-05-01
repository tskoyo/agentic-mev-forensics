"use client";

import { useEffect, useRef } from "react";
import type { Trade } from "./types";

interface Options {
  trades: Trade[];
  onNewWebhookTrade: (txHash: string) => void;
}

// Watches the trades list (kept fresh by useTrades polling) and fires
// onNewWebhookTrade for any webhook trade that wasn't present on first render.
// No extra fetch — piggybacks on the existing polling in useTrades.
export function useWebhookEvents({ trades, onNewWebhookTrade }: Options) {
  const seenRef = useRef<Set<string> | null>(null);
  const callbackRef = useRef(onNewWebhookTrade);
  callbackRef.current = onNewWebhookTrade;

  useEffect(() => {
    if (seenRef.current === null) {
      // Baseline snapshot on first render — don't toast for existing trades.
      seenRef.current = new Set(trades.map((t) => t.fullHash));
      return;
    }

    for (const trade of trades) {
      if (trade.source === "webhook" && !seenRef.current.has(trade.fullHash)) {
        seenRef.current.add(trade.fullHash);
        callbackRef.current(trade.fullHash);
      }
    }
  }, [trades]);
}
