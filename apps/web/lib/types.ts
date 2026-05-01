// MEV Forensics — domain types shared across UI components.

import type { TradeVerdict } from "@mev/shared";

export type Role =
  | "arbitrageur"
  | "victim"
  | "liquidator"
  | "builder"
  | "pool"
  | "router"
  | "searcher";

export type DeltaColor = "gain" | "loss" | "neutral";

export type ToolStatus = "done" | "running" | "pending" | "error";

export type TagColor = "indigo" | "green" | "slate" | "teal" | "red";

export type Source = "manual" | "webhook";

export interface ToolCall {
  id: string;
  name: string;
  input: string;
  status: ToolStatus;
  duration?: string;
  startedAt?: number;
  error?: string;
}

export interface Pnl {
  expected: string | null;
  realized: string | null;
  gap: string;
  gapPct: string;
  thresholdPct: boolean;
  thresholdUsd: boolean;
}

export interface Actor {
  role: Role;
  label: string;
  addr: string;
  fullAddr?: string;
  delta: string;
  deltaColor: DeltaColor;
}

export interface Citation {
  tag: string;
  tagColor: TagColor;
  title: string;
  body: string;
}

export interface TimelineEntry {
  index: number;
  hash: string;
  label: string;
  highlight: boolean;
  role: Role;
}

export interface RuledOut {
  text: string;
  cite: string;
}

export interface Investigation {
  completed_at: string | null;
  source: Source;
  question: string | null;
  toolCalls: ToolCall[];
  verdict: TradeVerdict;
  narrativeHeadline: string | null;
  narrativeBody: string | null;
  pnl: Pnl;
  followUps: string[];
  ruledOut?: RuledOut[];
  actors: Actor[];
  citations: Citation[];
  timeline: TimelineEntry[];
}
