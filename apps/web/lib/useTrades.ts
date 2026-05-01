"use client";

import { useCallback, useEffect, useState } from "react";
import type { TradeListItem } from "@mev/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const POLL_MS = 5000;

export function useTrades() {
  const [trades, setTrades] = useState<TradeListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      fetch(`${API_BASE}/trades`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data: TradeListItem[]) => { if (!cancelled) setTrades(data); })
        .catch(() => { /* keep current trades */ });
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const addTrade = useCallback((trade: TradeListItem) => {
    setTrades((prev) => [trade, ...prev]);
  }, []);

  return { trades, addTrade };
}
