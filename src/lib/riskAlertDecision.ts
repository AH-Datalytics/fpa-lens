/**
 * Pure decision for the Lakeshore Drive flood-risk alert email: given the level
 * we last NOTIFIED the recipient about, the current level, and the forecast
 * trend, decide whether to send and what the new notified baseline becomes.
 *
 * Keying off the last *notified* level (not the last *observed* level) is what
 * stops repeated "all clear" emails: a transient spike that we suppress never
 * advances the baseline, so returning to normal is a no-op (no prior alert to
 * clear). The caller persists `nextNotified` only when a send succeeds.
 *
 * Alert policy (per Director direction):
 *  - Only ORANGE and RED are alert-worthy. GREEN and YELLOW are the "normal"
 *    band (YELLOW is routine and must not email). Alerts fire when crossing INTO
 *    the ORANGE/RED band, and an "all clear" fires when crossing back OUT of it.
 *  - Trend-gated in both directions, RED included: an escalation already
 *    `improving` is a receding spike (skip); a de-escalation already `worsening`
 *    is a dip about to rise (skip). `stable` alerts in either direction.
 */
import type { RiskLevel } from "./lakefrontRisk";

export type RiskTrend = "improving" | "stable" | "worsening";

const ORDER: Record<RiskLevel, number> = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };

// Lowest level that is allowed to generate an alert. GREEN/YELLOW are "normal".
const ALERT_FLOOR = ORDER.ORANGE;

export interface AlertDecision {
  send: boolean;
  /** The notified baseline the caller should persist IF the send succeeds. */
  nextNotified: RiskLevel;
}

export function decideRiskAlert(
  lastNotified: RiskLevel | null,
  current: RiskLevel,
  trend: RiskTrend | undefined,
): AlertDecision {
  // First run / lost state: seed the baseline silently, never alert.
  if (lastNotified === null) return { send: false, nextNotified: current };

  const cur = ORDER[current];
  const prev = ORDER[lastNotified];

  // Collapse the normal band (GREEN/YELLOW -> 0) so YELLOW never initiates an
  // alert, and a drop back to YELLOW or GREEN clears an ORANGE/RED alert.
  const curBand = cur >= ALERT_FLOOR ? cur : 0;
  const prevBand = prev >= ALERT_FLOOR ? prev : 0;
  if (curBand === prevBand) {
    return { send: false, nextNotified: lastNotified };
  }

  const up = curBand > prevBand;
  const down = curBand < prevBand;
  const send = (up && trend !== "improving") || (down && trend !== "worsening");

  // Advance the baseline only when we alert; otherwise hold it so a suppressed
  // blip cannot later trigger a spurious all clear.
  return { send, nextNotified: send ? current : lastNotified };
}
