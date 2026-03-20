/**
 * Forecast snapshot store.
 *
 * Stores the first forecast seen for each target hour so we can later
 * overlay "what was predicted" against "what actually happened."
 *
 * Storage format: { [isoTimestamp]: { wind, water, savedAt, leadTimeHours } }
 * - Only the first forecast for a given hour is stored (never overwritten).
 * - Entries older than MAX_AGE_DAYS are pruned on each write.
 *
 * On Vercel (KV_REST_API_URL set): uses Vercel KV (persistent across deployments).
 * Locally: uses filesystem (data/forecast-history.json).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const MAX_AGE_DAYS = 7;
const KV_KEY = "forecast-snapshots";

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

const isVercel = !!process.env.KV_REST_API_URL;

/** Lazy-load @vercel/kv only on Vercel to avoid import errors locally. */
async function getKV() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

// --- Vercel KV backend (async) ---

async function readStoreKV(): Promise<ForecastStore> {
  try {
    const store = await getKV().then((kv) => kv.get<ForecastStore>(KV_KEY));
    return store || {};
  } catch {
    return {};
  }
}

async function writeStoreKV(store: ForecastStore): Promise<void> {
  try {
    await getKV().then((kv) => kv.set(KV_KEY, store));
  } catch {
    // Non-fatal — store is best-effort
  }
}

// --- Filesystem backend (sync, wrapped as async for uniform interface) ---

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
  const store = isVercel ? await readStoreKV() : readStoreFS();
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
      await writeStoreKV(store);
    } else {
      writeStoreFS(store);
    }
  }
}

/**
 * Get all stored forecast snapshots, keyed by target timestamp.
 */
export async function getStoredForecasts(): Promise<ForecastStore> {
  return isVercel ? readStoreKV() : readStoreFS();
}
