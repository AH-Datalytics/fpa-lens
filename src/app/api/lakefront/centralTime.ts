/**
 * Central-time helpers shared by the lakefront API route (server, runs in
 * UTC on Vercel) and the /environment page (browser, any zone).
 *
 * NOAA CO-OPS is queried with `time_zone=lst_ldt`, so every timestamp it
 * returns ("2026-10-07 07:00") is New Canal Station's local wall-clock time
 * with no offset attached. `new Date("2026-10-07 07:00")` reads that as UTC
 * on the server, which put the "closest to now" tide prediction and the OFS
 * forecast merge five hours off. Everything that parses a CO-OPS/OFS
 * timestamp goes through parseCentralTimestamp instead.
 *
 * No hand-rolled DST table: the offset comes from Intl for America/Chicago at
 * the instant in question, so CDT/CST flips on the real dates every year.
 */

export const CENTRAL_TZ = "America/Chicago";

const ISO_WITH_ZONE_RE = /T.*(Z|[+-]\d{2}:?\d{2})$/;
const LOCAL_WALL_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Offset of America/Chicago from UTC, in minutes, at a given instant (-300 for CDT, -360 for CST). */
export function centralOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/**
 * Parse a timestamp into a Date. ISO 8601 strings that carry a zone ("Z" or
 * an offset) are taken as-is; a bare "YYYY-MM-DD HH:MM[:SS]" is read as
 * Central wall-clock time. Anything else falls through to the Date parser
 * (and may be Invalid).
 */
export function parseCentralTimestamp(ts: string): Date {
  if (ISO_WITH_ZONE_RE.test(ts)) return new Date(ts);
  const m = LOCAL_WALL_RE.exec(ts.trim());
  if (!m) return new Date(ts);
  const [, y, mo, d, h, mi, s] = m;
  const wall = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));
  // Wall time = UTC + offset, so UTC = wall - offset. Resolve the offset at
  // the first guess, then once more at the result so an instant that sits on
  // the far side of a DST change gets the offset that actually applies there.
  const first = wall - centralOffsetMinutes(new Date(wall)) * 60_000;
  const second = wall - centralOffsetMinutes(new Date(first)) * 60_000;
  return new Date(second);
}

/** "YYYYMMDD" for the Central calendar date of an instant (CO-OPS begin_date/end_date). */
export function centralDateStamp(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

/** "CDT" or "CST", whichever applies at the instant. */
export function centralZoneAbbreviation(at: Date = new Date()): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: CENTRAL_TZ, timeZoneName: "short" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  return name ?? "CT";
}
