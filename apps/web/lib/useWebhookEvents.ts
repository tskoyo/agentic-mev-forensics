"use client";

import { useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface InvestigationStartedEvent {
  type: "investigation_started";
  tx_hash: string;
  source: "manual" | "webhook";
}

interface Options {
  onWebhookInvestigation: (txHash: string) => void;
}

// Listens to GET /events (global SSE stream) and fires onWebhookInvestigation
// whenever the server reports a webhook-triggered investigation. Uses a ref so
// the callback can change between renders without restarting the EventSource.
export function useWebhookEvents({ onWebhookInvestigation }: Options) {
  const callbackRef = useRef(onWebhookInvestigation);
  callbackRef.current = onWebhookInvestigation;

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/events`);

    es.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as InvestigationStartedEvent;
        if (event.type === "investigation_started" && event.source === "webhook") {
          callbackRef.current(event.tx_hash);
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => es.close();
  }, []);
}
