/**
 * Simple file-based forecast snapshot store.
 *
 * Stores the first forecast seen for each target hour so we can later
 * overlay "what was predicted" against "what actually happened."
 *
 * Storage format: { [isoTimestamp]: { wind, water, savedAt } }
 * - Only the first forecast for a given hour is stored (never overwritten).
 * - Entries older than MAX_AGE_DAYS are pruned on each write.
 *
 * For local dev, uses the filesystem. For Vercel production, this should
 * be swapped to Vercel KV or similar persistent store.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// Store in project data/ directory so it persists across server restarts.
// Falls back to /tmp on Vercel (ephemeral but works within a deployment).
const DATA_DIR = join(process.cwd(), "data");
const STORE_PATH = join(DATA_DIR, "forecast-history.json");
const MAX_AGE_DAYS = 7;

export interface ForecastSnapshot {
  wind: number | null;
  water: number | null;
  savedAt: string; // ISO timestamp of when this forecast was captured
  leadTimeHours: number; // hours between capture time and target time
}

type ForecastStore = Record<string, ForecastSnapshot>;

function readStore(): ForecastStore {
  try {
    if (existsSync(STORE_PATH)) {
      return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
    }
  } catch {
    // Corrupted file — start fresh
  }
  return {};
}

function writeStore(store: ForecastStore): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store));
  } catch {
    // Non-fatal — store is best-effort
  }
}

/**
 * Save new forecast entries. Only stores the first forecast seen for
 * each target hour (to preserve the original prediction).
 * Prunes entries older than MAX_AGE_DAYS.
 */
export function saveForecastSnapshot(
  forecasts: { timestamp: string; windSpeed: number | null; waterLevel: number | null }[]
): void {
  const store = readStore();
  const now = new Date().toISOString();
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;

  // Prune old entries
  for (const key of Object.keys(store)) {
    if (new Date(key).getTime() < cutoff) {
      delete store[key];
      changed = true;
    }
  }

  // Add new entries (only if not already stored)
  const nowMs = Date.now();
  for (const f of forecasts) {
    const key = f.timestamp;
    if (!store[key] && (f.windSpeed != null || f.waterLevel != null)) {
      const targetMs = new Date(f.timestamp).getTime();
      const leadHours = Math.round((targetMs - nowMs) / (60 * 60 * 1000));
      store[key] = {
        wind: f.windSpeed,
        water: f.waterLevel,
        savedAt: now,
        leadTimeHours: leadHours,
      };
      changed = true;
    }
  }

  if (changed) {
    writeStore(store);
  }
}

/**
 * Get all stored forecast snapshots, keyed by target timestamp.
 */
export function getStoredForecasts(): ForecastStore {
  return readStore();
}
