/**
 * Persists the last-known Lakefront risk level so the cron job can detect
 * level changes and send alerts. Uses Vercel Blob in production,
 * filesystem locally (same pattern as forecastStore).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { AlertState } from "./riskAlertDecision";

const BLOB_KEY = "risk-alert-state.json";
const DATA_DIR = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "risk-alert-state.json");

const isVercel = !!process.env.BLOB_READ_WRITE_TOKEN;

async function readBlob(): Promise<AlertState | null> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
    if (blobs.length === 0) return null;
    const bust = blobs[0].uploadedAt?.toString() ?? Date.now().toString();
    const url = `${blobs[0].downloadUrl}${blobs[0].downloadUrl.includes("?") ? "&" : "?"}_=${encodeURIComponent(bust)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    return (await res.json()) as AlertState;
  } catch {
    return null;
  }
}

// Throws on failure. A silently failed write is what let the Oct 24 2026
// alert re-send to every officer on each 5-minute run.
async function writeBlob(state: AlertState): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_KEY, JSON.stringify(state), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

function readFS(): AlertState | null {
  try {
    if (existsSync(STORE_PATH)) {
      return JSON.parse(readFileSync(STORE_PATH, "utf-8")) as AlertState;
    }
  } catch {
    // Corrupted
  }
  return null;
}

function writeFS(state: AlertState): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(state));
}

/** Last level we notified about, when, and any drop on hold. */
export async function getRiskAlertState(): Promise<AlertState | null> {
  return isVercel ? await readBlob() : readFS();
}

/** Throws if the write fails. */
export async function saveRiskAlertState(state: AlertState): Promise<void> {
  if (isVercel) {
    await writeBlob(state);
  } else {
    writeFS(state);
  }
}

/**
 * Saves `state` and reads it back. Returns true only when the store now holds
 * exactly `state`. The cron calls this BEFORE sending an alert, so a store
 * that fails to write, or serves a stale read, produces no email rather than
 * the same email on every run.
 */
export async function claimRiskAlertState(state: AlertState): Promise<boolean> {
  try {
    await saveRiskAlertState(state);
    const back = await getRiskAlertState();
    return JSON.stringify(back) === JSON.stringify(state);
  } catch (err) {
    console.error("Risk alert state write failed:", err);
    return false;
  }
}
