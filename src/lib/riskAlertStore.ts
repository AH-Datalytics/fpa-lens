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

async function writeBlob(state: AlertState): Promise<void> {
  try {
    const { put } = await import("@vercel/blob");
    await put(BLOB_KEY, JSON.stringify(state), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
  } catch {
    // Non-fatal
  }
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
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(state));
  } catch {
    // Non-fatal
  }
}

/** Last level we notified about, when, and any drop on hold. */
export async function getRiskAlertState(): Promise<AlertState | null> {
  return isVercel ? await readBlob() : readFS();
}

export async function saveRiskAlertState(state: AlertState): Promise<void> {
  if (isVercel) {
    await writeBlob(state);
  } else {
    writeFS(state);
  }
}
