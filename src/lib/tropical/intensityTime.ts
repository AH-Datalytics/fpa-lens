// Puts intensity-guidance forecast hours and forecast-track TAUs on one
// axis: hours from the ADVISORY time, which is what the intensity chart
// labels ("Now" at 0, then advisoryTime + tauH).
//
// Three clocks are in play, and none of them is the advisory's:
//
//   * A-deck models initialise on the synoptic grid (00/06/12/18Z); their tau
//     counts from each model's own cycle. Advisories are issued at
//     03/09/15/21Z, so even a perfectly current model's tau 0 is ~3h before
//     the advisory. Labelling tau as advisoryTime + tauH put every model 3h
//     (or 9h, for a run one cycle old) late.
//   * The NHC forecast track's TAU counts from the advisory's synoptic time
//     too (a 21Z advisory's TAU 12 point is VALIDTIME 06Z, not 09Z), so it
//     shares a clock with a current model but not with the advisory.
//   * intensity.json either carries `reference` (the ingest already rebased
//     tauH onto the advisory time) or doesn't (older blobs, demo fixtures:
//     tauH counts from `cycle`).
//
// Everything here is pure and tolerant: unknown or malformed inputs mean a
// shift of 0, i.e. the pre-existing behaviour, never an exception.

import type { IntensitySeries } from "./types";

const HOUR_MS = 3_600_000;

/** "YYYYMMDDHH" (an ATCF cycle stamp) to epoch milliseconds, or null. */
export function parseCycle(cycle: string | undefined | null): number | null {
  if (!cycle || !/^\d{10}$/.test(cycle)) return null;
  const ms = Date.UTC(
    Number(cycle.slice(0, 4)),
    Number(cycle.slice(4, 6)) - 1,
    Number(cycle.slice(6, 8)),
    Number(cycle.slice(8, 10))
  );
  return Number.isFinite(ms) ? ms : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Hours to ADD to each raw tauH so that 0 means the advisory time. Negative
 * when the series' own clock starts before the advisory (the usual case for
 * an un-rebased blob: cycle 12Z, advisory 15Z, shift -3).
 */
export function intensityTauShiftHours(
  intensity: Pick<IntensitySeries, "cycle" | "reference">,
  advisoryTime: string
): number {
  const advisory = Date.parse(advisoryTime);
  if (!Number.isFinite(advisory)) return 0;
  if (intensity.reference) {
    const reference = Date.parse(intensity.reference);
    return Number.isFinite(reference) ? round2((reference - advisory) / HOUR_MS) : 0;
  }
  const cycle = parseCycle(intensity.cycle);
  return cycle === null ? 0 : round2((cycle - advisory) / HOUR_MS);
}

/** The same series with every tauH shifted onto the advisory clock. Returns
 *  the input object itself when no shift applies, so memoised callers keep
 *  referential stability. */
export function normalizeIntensity(intensity: IntensitySeries, advisoryTime: string): IntensitySeries {
  const shift = intensityTauShiftHours(intensity, advisoryTime);
  if (shift === 0) return intensity;
  return {
    ...intensity,
    reference: advisoryTime,
    series: intensity.series.map((entry) => ({
      ...entry,
      points: entry.points.map((point) => ({ ...point, tauH: round2(point.tauH + shift) })),
    })),
  };
}

const VALIDTIME_RE = /^(\d{2})\/(\d{2})(\d{2})$/;

/**
 * The instant a forecast track's TAU 0 counts from, read from the TAU 0
 * point's own `VALIDTIME` ("27/1800" -- UTC day and hour; the month and year
 * come from the advisory, picking whichever adjacent month lands closest so
 * a month boundary between the two can't misplace it). Null when the track
 * carries no usable VALIDTIME (the synthetic demo fixtures, for instance).
 */
export function trackReferenceMs(
  trackFc: GeoJSON.FeatureCollection | null | undefined,
  advisoryTime: string
): number | null {
  const advisory = Date.parse(advisoryTime);
  if (!trackFc || !Number.isFinite(advisory)) return null;

  let first: { tau: number; validTime: string } | null = null;
  for (const feature of trackFc.features) {
    if (feature.geometry.type !== "Point") continue;
    const props = feature.properties ?? {};
    const tau = Number(props.TAU ?? props.FHOUR);
    const validTime = typeof props.VALIDTIME === "string" ? props.VALIDTIME.trim() : "";
    if (!Number.isFinite(tau) || !VALIDTIME_RE.test(validTime)) continue;
    if (first === null || tau < first.tau) first = { tau, validTime };
  }
  if (first === null) return null;

  const [, dayText, hourText, minuteText] = VALIDTIME_RE.exec(first.validTime)!;
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const base = new Date(advisory);
  let best: number | null = null;
  for (const monthOffset of [-1, 0, 1]) {
    const candidate = Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset, day, hour, minute);
    // Date.UTC silently rolls an impossible day (Feb 30) into the next month;
    // reject those so a bad VALIDTIME can't masquerade as a plausible one.
    if (new Date(candidate).getUTCDate() !== day) continue;
    if (best === null || Math.abs(candidate - advisory) < Math.abs(best - advisory)) best = candidate;
  }
  if (best === null) return null;
  // The point's valid time is TAU hours after the track's reference.
  return best - first.tau * HOUR_MS;
}

/**
 * Hours to ADD to a forecast-track TAU to put it on the advisory clock the
 * normalised intensity series uses. Prefers the track's own VALIDTIME; falls
 * back to assuming the track counts from the a-deck's dominant cycle (true
 * whenever the a-deck is current); 0 when neither is known.
 */
export function trackTauShiftHours(
  trackFc: GeoJSON.FeatureCollection | null | undefined,
  intensity: Pick<IntensitySeries, "cycle"> | null | undefined,
  advisoryTime: string
): number {
  const advisory = Date.parse(advisoryTime);
  if (!Number.isFinite(advisory)) return 0;
  const fromTrack = trackReferenceMs(trackFc, advisoryTime);
  if (fromTrack !== null) return round2((fromTrack - advisory) / HOUR_MS);
  const cycle = parseCycle(intensity?.cycle);
  return cycle === null ? 0 : round2((cycle - advisory) / HOUR_MS);
}
