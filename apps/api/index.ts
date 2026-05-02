import { config } from "dotenv";
config({ path: new URL("../../.env", import.meta.url).pathname });
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { investigate } from "@mev/agent";
import { Outcome, RootCause, TradeVerdict } from "@mev/shared";
import type {
    GetTradeOutput,
    SSEEvent,
    TradeListItem,
    TradeReport,
} from "@mev/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, "data", "reports");

function extractBlock(report: TradeReport): number | null {
    const getTradeCall = report.tool_calls.find((c) => c.name === "get_trade");
    const output = getTradeCall?.output as GetTradeOutput | undefined;
    return output?.block ?? null;
}

function deriveVerdict(report: TradeReport): TradeVerdict {
    if (
        report.outcome === Outcome.SuccessUnderperformed &&
        report.root_cause === RootCause.FrontrunSameBlock
    ) {
        return TradeVerdict.Frontrun;
    }
    if (
        report.outcome === Outcome.SuccessUnderperformed &&
        report.root_cause === RootCause.Unknown
    ) {
        return report.tool_calls.length <= 2
            ? TradeVerdict.Normal
            : TradeVerdict.Unknown;
    }
    return TradeVerdict.Unknown;
}

async function readReport(tx_hash: string): Promise<TradeReport | null> {
    try {
        const raw = await readFile(join(REPORTS_DIR, `${tx_hash}.json`), "utf-8");
        return JSON.parse(raw) as TradeReport;
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
    }
}

async function listReports(): Promise<TradeReport[]> {
    try {
        const files = await readdir(REPORTS_DIR);
        return await Promise.all(
            files
                .filter((f) => f.endsWith(".json"))
                .map((f) =>
                    readFile(join(REPORTS_DIR, f), "utf-8").then(
                        (raw) => JSON.parse(raw) as TradeReport,
                    ),
                ),
        );
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw err;
    }
}

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

app.get("/trades", async (c) => {
    const reports = await listReports();
    const items: TradeListItem[] = reports
        .map((r) => ({
            tx_hash: r.tx_hash,
            verdict: deriveVerdict(r),
            pnl_delta_usd: r.pnl_delta,
            block: extractBlock(r),
            is_auto: r.is_auto ?? false,
        }))
        .sort((a, b) => (b.block ?? 0) - (a.block ?? 0));

    return c.json(items);
});

app.get("/trades/:tx_hash", async (c) => {
    const tx_hash = c.req.param("tx_hash");
    const report = await readReport(tx_hash);
    if (!report) return c.json({ error: "Report not found" }, 404);
    return c.json(report);
});

app.post("/trades/:tx_hash/investigate", async (c) => {
    const tx_hash = c.req.param("tx_hash");

    return streamSSE(c, async (stream) => {
        const onEvent = async (event: SSEEvent) => {
            await stream.writeSSE({ data: JSON.stringify(event) });
        };

        try {
            const report = await investigate(tx_hash, onEvent);
            if (report) {
                await mkdir(REPORTS_DIR, { recursive: true });
                await writeFile(
                    join(REPORTS_DIR, `${tx_hash}.json`),
                    JSON.stringify(report, null, 2)
                );
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await stream.writeSSE({
                data: JSON.stringify({ type: "error", message } satisfies SSEEvent),
            });
        }
    });
});

const PORT = 3001;

serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
