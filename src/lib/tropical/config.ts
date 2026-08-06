// Central config for the tropical-weather data layer. Keep the Blob base URL
// referenced here (never hardcode it elsewhere) so environments can be swapped
// safely.
//
// The ingest pipeline (ingest/) writes manifest.json and every per-storm
// product into this public Vercel Blob store on a ~15-minute cron; the page
// reads them straight from the browser. Public read, no token needed.

export const BLOB_BASE = (process.env.NEXT_PUBLIC_TROPICAL_BLOB_BASE_URL ?? "").replace(/\/$/, "");

/** Route the page lives on — used for demo links that need a document navigation. */
export const PAGE_PATH = "/environment/tropical-weather";

/** Committed demo fixtures (Hurricane Ida replay + a simulated quiet manifest). */
export const DEMO_BASE = "/tropical/demo";

// Gulf box used to decide storm relevance / "active" mode.
export const GULF_BOX = { lonMin: -98, lonMax: -80, latMin: 18, latMax: 31 };

// Staleness thresholds (hours) per mode.
export const STALE_HOURS = { active: 8, quiet: 26 };

export const KT_TO_MPH = 1.15078;

export const CATEGORY_THRESHOLDS_MPH = {
  TS: 39,
  C1: 74,
  C2: 96,
  C3: 111,
  C4: 130,
  C5: 157,
} as const;
