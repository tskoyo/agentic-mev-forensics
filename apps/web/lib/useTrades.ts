"use client";

import { useCallback, useEffect, useState } from "react";
import { TRADES } from "./sample-data";
import type { Trade } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>(TRADES);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/trades`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Trade[]) => { if (!cancelled) setTrades(data); })
      .catch(() => { /* keep sample data */ });
    return () => { cancelled = true; };
  }, []);

  const addTrade = useCallback((trade: Trade) => {
    setTrades((prev) => [trade, ...prev]);
  }, []);

  return { trades, addTrade };
}
