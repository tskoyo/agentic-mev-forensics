"use client";

import { useEffect, useRef } from "react";
import type { TradeListItem } from "@mev/shared";

interface Options {
  trades: TradeListItem[];
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
      seenRef.current = new Set(trades.map((t) => t.tx_hash));
      return;
    }

    for (const trade of trades) {
      if (trade.is_auto && !seenRef.current.has(trade.tx_hash)) {
        seenRef.current.add(trade.tx_hash);
        callbackRef.current(trade.tx_hash);
      }
    }
  }, [trades]);
}
