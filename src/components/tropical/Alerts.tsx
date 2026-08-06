"use client";

import useSWR from "swr";
import type { AlertRow } from "@/lib/tropical/alerts";
import { ALERTS_URL, alertsFetcher, deriveAlertsState, type AlertsState } from "@/lib/tropical/alerts";
import { Kicker } from "./Kicker";

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Shared metro-alerts fetch, keyed on `ALERTS_URL` — SWR dedupes this across
 * every call site, so using the hook from more than one place costs one
 * network request, not two. Exposes `unavailable` (feed never loaded
 * successfully, no cached data to fall back on) so call sites can degrade
 * gracefully instead of a down feed silently rendering as "all clear".
 */
export function useMetroAlerts(): AlertsState {
  const { data, error } = useSWR(ALERTS_URL, alertsFetcher, { refreshInterval: REFRESH_MS });
  return deriveAlertsState(data, error);
}

export interface AlertsProps {
  rows: AlertRow[];
  unavailable: boolean;
}

/**
 * NWS active-alerts section for the metro parishes. Presentational: the
 * summary strip owns the fetch (via useMetroAlerts) so it can decide whether
 * this section earns a column before laying the row out.
 *
 * When the feed itself is down — and there's no stale cached data to show
 * instead — this says so, rather than looking identical to genuinely having
 * no alerts.
 */
export function Alerts({ rows, unavailable }: AlertsProps) {
  return (
    <div>
      <Kicker>Warning summary</Kicker>
      {unavailable ? (
        <p className="text-sm text-amber-700">Alerts unavailable — check weather.gov</p>
      ) : rows.length === 0 ? (
        <p className="text-sm leading-relaxed text-gray-600">
          No active watches or warnings for the metro parishes.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="border-l-4 bg-gray-50 py-1.5 pl-3 pr-2"
              style={{ borderLeftColor: row.color }}
            >
              <b className="block text-sm font-semibold text-gray-900">{row.event}</b>
              <span className="block text-xs text-gray-500" title={row.areaDesc}>
                {row.areaDesc}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
