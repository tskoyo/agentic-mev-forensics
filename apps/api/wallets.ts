import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WatchedWallet } from "@mev/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALLETS_FILE = join(__dirname, "data", "wallets.json");

export async function readWallets(): Promise<WatchedWallet[]> {
    try {
        const raw = await readFile(WALLETS_FILE, "utf-8");
        return JSON.parse(raw) as WatchedWallet[];
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw err;
    }
}

export async function writeWallets(wallets: WatchedWallet[]): Promise<void> {
    await mkdir(dirname(WALLETS_FILE), { recursive: true });
    await writeFile(WALLETS_FILE, JSON.stringify(wallets, null, 2));
}
