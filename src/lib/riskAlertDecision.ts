/**
 * Pure decision for the Lakeshore Drive flood-risk alert email: given what we
 * last NOTIFIED the recipients about (level + when) and the current level,
 * decide whether to send, what kind of email it is, and the state to persist.
 * The caller persists `next` only when a send succeeds or nothing was sent, so
 * a failed send retries on the next run.
 *
 * Alert policy (Levee Police meeting, Oct 20 2026):
 *  - Every step up or down the ladder at or above ALERT_FLOOR emails, so
 *    Police are informed from the first sign of risk through the all clear.
 *    With the floor at YELLOW: GREEN->YELLOW->ORANGE->RED and back down.
 *  - No forecast-trend suppression. (The Oct 9 2026 closure read RED but the
 *    old policy suppressed it as "improving".)
 *  - A rise sends immediately. A drop sends only after the lower level has
 *    held for STEP_DOWN_HOLD_MINUTES: replaying Oct 8-11 2026 without the hold
 *    produced 34 emails, most of them RED<->ORANGE flips minutes apart as
 *    gusts crossed a threshold.
 *  - While the level stays at or above the floor, a reminder goes every
 *    REMINDER_HOURS to confirm it is still elevated.
 *  - Lost state (null) while elevated sends; while normal it seeds silently.
 *
 * If YELLOW proves too frequent, raise ALERT_FLOOR to ORANGE: GREEN and YELLOW
 * then collapse into one "normal" band, so the emails become YELLOW->ORANGE,
 * ORANGE->RED, RED->ORANGE and ORANGE->YELLOW only.
 */
import type { RiskLevel } from "./lakefrontRisk";

const ORDER: Record<RiskLevel, number> = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };

// Lowest level that generates an alert. Levels below it are the "normal" band.
export const ALERT_FLOOR: RiskLevel = "YELLOW";

// Re-send while the level holds at or above the floor.
export const REMINDER_HOURS = 24;

// A drop must last this long before it is announced.
export const STEP_DOWN_HOLD_MINUTES = 60;

export type AlertKind = "escalation" | "deescalation" | "all-clear" | "reminder";

export interface AlertState {
  /** Level last notified about. */
  level: RiskLevel;
  /** When that notification went out (or the silent seed). */
  updatedAt: string;
  /** First time the level was seen below `level`, while a drop is on hold. */
  lowerSince?: string | null;
}

export interface AlertDecision {
  send: boolean;
  kind?: AlertKind;
  /** State to persist: on a successful send, or always when `send` is false. */
  next: AlertState;
}

function band(level: RiskLevel, floor: RiskLevel): number {
  return ORDER[level] >= ORDER[floor] ? ORDER[level] : 0;
}

export function decideRiskAlert(
  state: AlertState | null,
  current: RiskLevel,
  now: Date = new Date(),
  floor: RiskLevel = ALERT_FLOOR,
): AlertDecision {
  const nowIso = now.toISOString();
  const sent = (kind: AlertKind): AlertDecision => ({
    send: true,
    kind,
    next: { level: current, updatedAt: nowIso, lowerSince: null },
  });
  const curBand = band(current, floor);

  if (state === null) {
    return curBand > 0 ? sent("escalation") : { send: false, next: { level: current, updatedAt: nowIso } };
  }

  const prevBand = band(state.level, floor);

  if (curBand > prevBand) return sent("escalation");

  if (curBand < prevBand) {
    const since = state.lowerSince ?? nowIso;
    const heldMin = (now.getTime() - new Date(since).getTime()) / 60_000;
    if (heldMin >= STEP_DOWN_HOLD_MINUTES) return sent(curBand === 0 ? "all-clear" : "deescalation");
    return { send: false, next: { ...state, lowerSince: since } };
  }

  // Same band: any pending drop was a blip.
  const hoursSince = (now.getTime() - new Date(state.updatedAt).getTime()) / 3_600_000;
  if (curBand > 0 && hoursSince >= REMINDER_HOURS) return sent("reminder");
  return { send: false, next: { ...state, lowerSince: null } };
}
