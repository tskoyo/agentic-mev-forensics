import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { TradeRef } from "@mev/shared";

const REQUIRED_ENV = [
  "ANTHROPIC_API_KEY",
  "ALCHEMY_RPC_URL",
  "TENDERLY_ACCESS_KEY",
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.warn(`Warning: env var ${key} is not set`);
  }
}

const DEMO_TRADES: TradeRef[] = [
  {
    tx_hash: "0x4f72a8d3c1b5e6f9a2d4b7e8c3f1a9d2b5e6c81e",
    label: "Arb underperformed — frontrun",
    description: "Expected $74.80, realized $49.40. Frontrunner at index 11.",
  },
  {
    tx_hash: "0x9d1c4e7a2f8b3d6c9e1a4f7b2e5d8c3a6f9e08b",
    label: "Arb underperformed — unknown",
    description: "Expected $21.40, realized $13.20. No cause found after full investigation.",
  },
];

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/trades", (c) => c.json(DEMO_TRADES));

const PORT = 3001;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
