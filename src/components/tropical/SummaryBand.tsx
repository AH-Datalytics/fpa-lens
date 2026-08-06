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

// Only ever one row, so the column count has to match the number of sections
// that actually have something to say — three fixed columns would leave a
// third of the strip empty whenever a section drops out.
const COLUMNS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
};

/**
 * Conditions summary as a single strip above the map.
 *
 * Two rounds of review shaped this. It started as a fixed-width left rail,
 * which squeezed the map; moving it overhead as three equal cards fixed that
 * but left big voids, because a grid stretches every card to the tallest one
 * and the warning/probability sections are short. So: one panel, columns
 * divided by rules, each sized to its own content, and no column at all for a
 * section with nothing to report.
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
      <div className={`${PANEL} p-5`} role={status === "unavailable" ? "alert" : "status"}>
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

  const cells: React.ReactNode[] = [];

  if (mode === "active" && storm) {
    cells.push(<StormHeader key="storm" storm={storm} />);
    const legendItems = coastalLegendItems(wwlines);
    if (legendItems.length > 0) {
      cells.push(
        <CoastalAlertsLegend
          key="coastal"
          items={legendItems}
          publicAdvisoryText={publicAdvisoryText}
        />
      );
    }
    cells.push(<WindProbabilities key="probs" probs={probs} />);
  } else {
    cells.push(<OutlookPanel key="outlook" outlookText={outlookText} />);
    // Quiet mode hides the metro-alerts column entirely when there is nothing
    // active; an "all clear" line would just be noise beside "No active
    // systems". A feed outage still shows, because that is not an all-clear.
    if (metroAlerts.unavailable || metroAlerts.rows.length > 0) {
      cells.push(
        <Alerts key="alerts" rows={metroAlerts.rows} unavailable={metroAlerts.unavailable} />
      );
    }
    cells.push(
      <div key="demo">
        <div className="text-sm font-semibold text-[#21355a]">Explore a historical storm</div>
        <div className="mt-1 text-sm leading-relaxed text-gray-600">
          See Hurricane Ida&rsquo;s August 2021 forecast dashboard.
        </div>
        {/* Full navigation updates the URL-backed dashboard data source. */}
        <a
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#21355a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2c3859]"
          href={`${PAGE_PATH}?demo=ida`}
        >
          View Ida demo
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mode === "active" && storm && storms.length > 1 && (
        <div className={`${PANEL} px-5 py-4`}>
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
                  className={`rounded-md border px-2.5 py-1.5 text-xs ${
                    selected
                      ? "border-[#21355a] bg-[#21355a] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <b className="block font-semibold">{option.name}</b>
                  <span className={selected ? "text-blue-100" : "text-gray-500"}>
                    {option.intensityMph} mph{option.inGulfBox ? " · Gulf" : ""}
                  </span>
                </a>
              );
            })}
          </nav>
        </div>
      )}

      <div
        className={`${PANEL} grid grid-cols-1 divide-y divide-gray-200 lg:divide-x lg:divide-y-0 ${
          COLUMNS[cells.length] ?? "lg:grid-cols-3"
        }`}
      >
        {cells.map((cell, i) => (
          <div key={i} className="min-w-0 px-5 py-4">
            {cell}
          </div>
        ))}
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
