"use client";

import useSWR from "swr";
import type { AlertRow } from "@/lib/tropical/alerts";
import { ALERTS_URL, alertsFetcher, deriveAlertsState, type AlertsState } from "@/lib/tropical/alerts";

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
 * Active NWS alerts for the metro parishes, as an inline run of colored chips.
 * Presentational: the banner owns the fetch (via useMetroAlerts) so it can
 * skip this line entirely when there is nothing active.
 *
 * A feed outage still prints, because "we don't know" is not "all clear".
 */
export function Alerts({ rows, unavailable }: AlertsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#21355a]">
        NWS alerts
      </span>
      {unavailable ? (
        <span className="text-xs text-amber-700">Alerts unavailable — check weather.gov</span>
      ) : (
        rows.map((row) => (
          <span
            key={row.key}
            className="flex items-baseline gap-1.5 border-l-4 pl-2"
            style={{ borderLeftColor: row.color }}
          >
            <b className="text-xs font-semibold text-gray-900">{row.event}</b>
            <span className="text-xs text-gray-500" title={row.areaDesc}>
              {row.areaDesc}
            </span>
          </span>
        ))
      )}
    </div>
  );
}
