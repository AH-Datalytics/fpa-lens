/**
 * Forecast snapshot store.
 *
 * Stores the first forecast seen for each target hour so we can later
 * overlay "what was predicted" against "what actually happened."
 *
 * Storage format: { [isoTimestamp]: { wind, water, savedAt, leadTimeHours } }
 * - Only the first forecast for a given hour is stored (never overwritten).
 * - A second snapshot (forecast24h) is captured when lead time hits 22-26h.
 * - Entries older than MAX_AGE_DAYS are pruned on each write.
 *
 * On Vercel (BLOB_READ_WRITE_TOKEN set): uses Vercel Blob (persistent).
 * Locally: uses filesystem (data/forecast-history.json).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const MAX_AGE_DAYS = 7;
const BLOB_KEY = "forecast-snapshots.json";

// Local filesystem fallback
const DATA_DIR = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "forecast-history.json");

export interface ForecastSnapshot {
  wind: number | null;
  water: number | null;
  savedAt: string; // ISO timestamp of when this forecast was captured
  leadTimeHours: number; // hours between capture time and target time
  // 24-hour-out forecast for comparison with "first seen" (~48h out).
  // Filled in when the target hour is 22-26h away (closest pass to 24h).
  forecast24h?: {
    wind: number | null;
    water: number | null;
    savedAt: string;
  };
}

type ForecastStore = Record<string, ForecastSnapshot>;

// ============================================================================
// STORAGE BACKENDS
// ============================================================================

const isVercel = !!process.env.BLOB_READ_WRITE_TOKEN;

// --- Vercel Blob backend (async) ---

async function readStoreBlob(): Promise<ForecastStore> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
    if (blobs.length === 0) return {};
    // addRandomSuffix: false means we overwrite the same key each save, but
    // Vercel's public-blob CDN will cache the response and return stale data
    // to readers. Bust the cache with a query param tied to the latest
    // uploadedAt, and disable fetch caching explicitly. Without this, in-place
    // updates (e.g. backfilling water=null with a later forecast that has
    // water) are written successfully but never read back, so fields stay null.
    const bust = blobs[0].uploadedAt?.toString() ?? Date.now().toString();
    const url = `${blobs[0].downloadUrl}${blobs[0].downloadUrl.includes("?") ? "&" : "?"}_=${encodeURIComponent(bust)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    return (await res.json()) as ForecastStore;
  } catch {
    return {};
  }
}

async function writeStoreBlob(store: ForecastStore): Promise<void> {
  try {
    const { put } = await import("@vercel/blob");
    // NOTE: the blob store is configured as private. Passing access: "public"
    // causes every put to throw `Cannot use public access on a private store`,
    // which the silent catch below swallows. That was the root cause of water
    // forecasts never persisting: writes appeared to succeed, but the blob on
    // disk never changed, so the "first seen" water value stayed null even as
    // the in-memory backfill kept computing the correct value.
    await put(BLOB_KEY, JSON.stringify(store), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      // Minimise CDN caching since we overwrite this blob every few minutes.
      cacheControlMaxAge: 0,
    });
  } catch {
    // Non-fatal — store is best-effort
  }
}

// --- Filesystem backend (sync) ---

function readStoreFS(): ForecastStore {
  try {
    if (existsSync(STORE_PATH)) {
      return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
    }
  } catch {
    // Corrupted file — start fresh
  }
  return {};
}

function writeStoreFS(store: ForecastStore): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store));
  } catch {
    // Non-fatal — store is best-effort
  }
}

// ============================================================================
// PUBLIC API (async to support both backends)
// ============================================================================

/**
 * Save new forecast entries. Only stores the first forecast seen for
 * each target hour (to preserve the original prediction).
 * Prunes entries older than MAX_AGE_DAYS.
 */
export async function saveForecastSnapshot(
  forecasts: { timestamp: string; windSpeed: number | null; waterLevel: number | null }[]
): Promise<void> {
  const store = isVercel ? await readStoreBlob() : readStoreFS();
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const cutoff = nowMs - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;

  // Prune old entries
  for (const key of Object.keys(store)) {
    if (new Date(key).getTime() < cutoff) {
      delete store[key];
      changed = true;
    }
  }

  for (const f of forecasts) {
    const key = f.timestamp;
    if (f.windSpeed == null && f.waterLevel == null) continue;

    const targetMs = new Date(f.timestamp).getTime();
    const leadHours = Math.round((targetMs - nowMs) / (60 * 60 * 1000));

    // First forecast seen for this target hour — save it
    if (!store[key]) {
      store[key] = {
        wind: f.windSpeed,
        water: f.waterLevel,
        savedAt: now,
        leadTimeHours: leadHours,
      };
      changed = true;
    } else {
      // Backfill missing fields if a later fetch provides data that was
      // unavailable on the first save (e.g. OFS water level was down).
      if (store[key].wind == null && f.windSpeed != null) {
        store[key].wind = f.windSpeed;
        changed = true;
      }
      if (store[key].water == null && f.waterLevel != null) {
        store[key].water = f.waterLevel;
        changed = true;
      }
    }

    // Fill in the 24-hour-out snapshot when lead time is 22-26h (closest pass to 24h).
    // Only written once — the first reading in that window.
    if (!store[key].forecast24h && leadHours >= 22 && leadHours <= 26) {
      store[key].forecast24h = {
        wind: f.windSpeed,
        water: f.waterLevel,
        savedAt: now,
      };
      changed = true;
    }
  }

  if (changed) {
    if (isVercel) {
      await writeStoreBlob(store);
    } else {
      writeStoreFS(store);
    }
  }
}

/**
 * Get all stored forecast snapshots, keyed by target timestamp.
 */
export async function getStoredForecasts(): Promise<ForecastStore> {
  return isVercel ? readStoreBlob() : readStoreFS();
}
