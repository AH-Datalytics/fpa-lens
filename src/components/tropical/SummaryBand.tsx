"use client";

import { ArrowRight } from "lucide-react";
import { PAGE_PATH } from "@/lib/tropical/config";
import type { Mode, ProbsEntry, StormEntry } from "@/lib/tropical/types";
import { Alerts, useMetroAlerts } from "./Alerts";
import { CoastalAlertsLegend, coastalLegendItems } from "./CoastalAlertsLegend";
import { Kicker } from "./Kicker";
import { OutlookPanel } from "./OutlookPanel";
import { StormHeader } from "./StormHeader";
import { WindProbabilities } from "./WindProbabilities";

export interface SummaryBandProps {
  status: "loading" | "ready" | "unavailable";
  retry: () => void;
  dataIssues: { product: string; message: string }[];
  mode: Mode;
  storm: StormEntry | null;
  outlookText: { issued: string; text: string } | null;
  /** storms/{id}/probs.json for the selected storm — see WindProbabilities. */
  probs: ProbsEntry[] | null;
  storms: StormEntry[];
  demoParam: string | null;
  wwlines?: GeoJSON.FeatureCollection | null;
  publicAdvisoryText?: string | null;
}

const PANEL = "rounded-xl border border-gray-200 bg-white shadow-sm";
/** Secondary rows: same rhythm, separated by a hairline. */
const ROW = "border-t border-gray-200 px-5 py-3";

/**
 * Conditions banner above the map.
 *
 * Three layouts were tried and rejected: a fixed left rail (squeezed the map),
 * three equal cards, and three divided columns. Both column versions left
 * large voids, because a row of columns is only as short as its longest
 * member, and these sections differ wildly in length — a five-row storm
 * readout beside a four-item legend beside two progress bars.
 *
 * So this is not a grid at all. Each section is a horizontal run that wraps,
 * stacked as full-width rows: the storm's figures across the top, then the
 * supporting lines. Nothing stretches to match anything else, so there is
 * nothing to leave empty, and the whole banner costs ~2 lines instead of the
 * height of its tallest column.
 */
export function SummaryBand({
  status,
  retry,
  dataIssues,
  mode,
  storm,
  outlookText,
  probs,
  storms,
  demoParam,
  wwlines,
  publicAdvisoryText,
}: SummaryBandProps) {
  // Hoisted above the early return so hook order stays stable across renders.
  const metroAlerts = useMetroAlerts();

  if (status !== "ready") {
    return (
      <div className={`${PANEL} px-5 py-4`} role={status === "unavailable" ? "alert" : "status"}>
        <div className="text-sm font-semibold text-[#21355a]">
          {status === "loading" ? "Loading live conditions…" : "Live conditions unavailable"}
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">
          {status === "loading"
            ? "Checking the latest National Hurricane Center products."
            : "We could not load the live storm feed. Do not interpret this as an all-clear."}
        </p>
        {status === "unavailable" && (
          <button
            type="button"
            className="mt-3 rounded-md bg-[#21355a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2c3859]"
            onClick={retry}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const activeStorm = mode === "active" && storm;
  const legendItems = activeStorm ? coastalLegendItems(wwlines) : [];
  const hasMetroAlerts = metroAlerts.unavailable || metroAlerts.rows.length > 0;

  return (
    <div className="space-y-4">
      <div className={PANEL}>
        {activeStorm ? (
          <>
            <div className="px-5 py-4">
              <StormHeader storm={storm} />
            </div>
            {legendItems.length > 0 && (
              <div className={ROW}>
                <CoastalAlertsLegend
                  items={legendItems}
                  publicAdvisoryText={publicAdvisoryText}
                />
              </div>
            )}
            {probs !== null && (
              <div className={ROW}>
                <WindProbabilities probs={probs} />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
              <OutlookPanel outlookText={outlookText} />
              {/* Full navigation updates the URL-backed dashboard data source. */}
              <a
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#21355a] hover:bg-gray-50"
                href={`${PAGE_PATH}?demo=ida`}
              >
                See a storm: Hurricane Ida replay
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            {hasMetroAlerts && (
              <div className={ROW}>
                <Alerts rows={metroAlerts.rows} unavailable={metroAlerts.unavailable} />
              </div>
            )}
          </>
        )}

        {activeStorm && storms.length > 1 && (
          <div className={ROW}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Kicker>Active storms</Kicker>
              <nav aria-label="Choose a storm" className="flex flex-wrap gap-2">
                {storms.map((option) => {
                  const params = new URLSearchParams();
                  if (demoParam) params.set("demo", demoParam);
                  params.set("storm", option.id);
                  const selected = option.id === storm.id;
                  return (
                    // A full document navigation is intentional: the dashboard
                    // reads the query string as an external-store snapshot.
                    <a
                      key={option.id}
                      href={`${PAGE_PATH}?${params.toString()}`}
                      aria-current={selected ? "page" : undefined}
                      title={`View ${option.name}`}
                      className={`rounded-md border px-2.5 py-1 text-xs ${
                        selected
                          ? "border-[#21355a] bg-[#21355a] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <b className="font-semibold">{option.name}</b>{" "}
                      <span className={selected ? "text-blue-100" : "text-gray-500"}>
                        {option.intensityMph} mph{option.inGulfBox ? " · Gulf" : ""}
                      </span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>

      {dataIssues.length > 0 && (
        <details className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <summary className="cursor-pointer text-xs font-medium text-amber-900">
            Some products are temporarily unavailable
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {dataIssues.map((issue, index) => (
              <li key={`${issue.product}-${index}`}>
                <b className="font-semibold">{issue.product}:</b> {issue.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
