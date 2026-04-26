// MEV Forensics — sample data (mirrors design handoff data.js).
// Replace with real API responses once apps/api wires up.

import type { Investigation, Trade } from "./types";

export const TRADES: Trade[] = [
  {
    id: "tx1",
    hash: "0x4f72…c81e",
    fullHash: "0x4f72a8d3c1b5e6f9a2d4b7e8c3f1a9d2b5e6c81e",
    summary: "Arb underperformed",
    verdict: "frontrun",
    pnlDelta: "-$25.40",
    block: "19,841,204",
    ago: "3 min ago",
    source: "manual",
  },
  {
    id: "tx2",
    hash: "0x9d1c…e08b",
    fullHash: "0x9d1c4e7a2f8b3d6c9e1a4f7b2e5d8c3a6f9e08b",
    summary: "Arb underperformed",
    verdict: "unknown",
    pnlDelta: "-$8.20",
    block: "19,841,190",
    ago: "11 min ago",
    source: "webhook",
  },
  {
    id: "tx3",
    hash: "0x7e3d…a12f",
    fullHash: "0x7e3da1b4c8f2e5d9a3c6b1e4f7a2d8c5b9e3a12f",
    summary: "Arb · normal",
    verdict: "not checked",
    pnlDelta: "-$1.10",
    block: "19,841,177",
    ago: "22 min ago",
    source: "manual",
  },
];

export const INVESTIGATIONS: Record<string, Investigation> = {
  tx1: {
    completed_at: "2026-04-26T11:14:00Z",
    source: "manual",
    question: "Why did this earn $49.40 when I expected $74.80?",
    toolCalls: [
      { id: "tc1", name: "get_trade",         input: "0x4f72…c81e",    status: "done", duration: "1.2s" },
      { id: "tc2", name: "simulate_at_state", input: "block 19841203", status: "done", duration: "2.4s" },
      { id: "tc3", name: "get_block_txs",     input: "block 19841204", status: "done", duration: "0.9s" },
      { id: "tc4", name: "get_tx_trace",      input: "0x8bbc…d44a",    status: "done", duration: "1.8s" },
    ],
    verdict: "frontrun",
    narrativeHeadline: "Frontrunner confirmed",
    narrativeBody:
      "Tx [tx 0x8bbc…d44a] at index 11 touched the same ETH/USDC pool before your tx at index 14, consuming $25.40 of available liquidity [sim block N-1]. The competing transaction was submitted by a known MEV searcher [searcher 0x00…b6b].",
    pnl: {
      expected: "$74.80",
      realized: "$49.40",
      gap: "-$25.40",
      gapPct: "33.9%",
      thresholdPct: true,
      thresholdUsd: true,
    },
    followUps: ["Who ran that tx?", "Could I have won this?", "Show full block timeline"],
    actors: [
      { role: "arbitrageur", label: "Your bot",                 addr: "0x4f72…c81e", delta: "-$25.40", deltaColor: "loss" },
      { role: "searcher",    label: "Known MEV bot",            addr: "0x8bbc…d44a", delta: "+$25.40", deltaColor: "gain" },
      { role: "pool",        label: "ETH/USDC · Uni v3 · 0.3%", addr: "0xa0b8…6e3c", delta: "—",       deltaColor: "neutral" },
      { role: "builder",     label: "Block builder",            addr: "0x1f9c…8a2b", delta: "—",       deltaColor: "neutral" },
    ],
    citations: [
      {
        tag: "Competitor tx",
        tagColor: "indigo",
        title: "get_tx_trace",
        body: "0x8bbc1…d44a · index 11\nETH/USDC pool · confirmed via call trace",
      },
      {
        tag: "Simulation",
        tagColor: "green",
        title: "simulate_at_state",
        body: "block N-1 state\nsimulated PnL $74.80 · via Tenderly API",
      },
    ],
    timeline: [
      { index: 11, hash: "0x8bbc…d44a", label: "Frontrunner", highlight: false, role: "searcher" },
      { index: 14, hash: "0x4f72…c81e", label: "Your tx",     highlight: true,  role: "arbitrageur" },
    ],
  },

  tx2: {
    completed_at: "2026-04-26T11:03:00Z",
    source: "webhook",
    question: "Why did this earn less than expected?",
    toolCalls: [
      { id: "tc1", name: "get_trade",         input: "0x9d1c…e08b",        status: "done", duration: "1.1s" },
      { id: "tc2", name: "simulate_at_state", input: "block 19841189",     status: "done", duration: "2.2s" },
      { id: "tc3", name: "get_block_txs",     input: "block 19841190",     status: "done", duration: "0.8s" },
      { id: "tc4", name: "get_pool_state",    input: "block 19841189→190", status: "done", duration: "1.0s" },
    ],
    verdict: "unknown",
    narrativeHeadline: "No cause found",
    narrativeBody:
      "Full investigation completed. Gap of $8.20 confirmed [sim block N-1] but no competing transaction touched the ETH/USDC pool at a lower index [get_block_txs], and pool price was stable across the block boundary [get_pool_state]. The gap remains unexplained.",
    pnl: {
      expected: "$21.40",
      realized: "$13.20",
      gap: "-$8.20",
      gapPct: "38.3%",
      thresholdPct: true,
      thresholdUsd: false,
    },
    followUps: ["Check adjacent blocks", "Was there gas price variance?"],
    ruledOut: [
      { text: "No competing tx at lower block index touching ETH/USDC pool", cite: "get_block_txs" },
      { text: "Pool price stable across block boundary — no organic shift",  cite: "get_pool_state" },
      { text: "Simulation confirmed expected PnL at $21.40",                 cite: "simulate_at_state" },
    ],
    actors: [
      { role: "arbitrageur", label: "Your bot",                 addr: "0x9d1c…e08b", delta: "-$8.20", deltaColor: "loss" },
      { role: "pool",        label: "ETH/USDC · Uni v3 · 0.3%", addr: "0xa0b8…6e3c", delta: "—",      deltaColor: "neutral" },
    ],
    citations: [
      {
        tag: "Simulation",
        tagColor: "green",
        title: "simulate_at_state",
        body: "block N-1 state\nsimulated PnL $21.40 · via Tenderly API",
      },
      {
        tag: "Block scan",
        tagColor: "slate",
        title: "get_block_txs",
        body: "block 19,841,190\n0 competing txs touching ETH/USDC pool",
      },
      {
        tag: "Pool state",
        tagColor: "teal",
        title: "get_pool_state",
        body: "block 19841189 → 19841190\nno significant sqrtPriceX96 shift",
      },
    ],
    timeline: [
      { index: 14, hash: "0x9d1c…e08b", label: "Your tx", highlight: true, role: "arbitrageur" },
    ],
  },

  tx3: {
    completed_at: null,
    source: "manual",
    question: null,
    toolCalls: [],
    verdict: "not checked",
    narrativeHeadline: null,
    narrativeBody: null,
    pnl: {
      expected: null,
      realized: null,
      gap: "-$1.10",
      gapPct: "4.2%",
      thresholdPct: false,
      thresholdUsd: false,
    },
    followUps: ["Investigate this trade"],
    actors: [],
    citations: [],
    timeline: [],
  },
};
