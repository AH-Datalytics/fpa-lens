"use client";

import { ArrowRight } from "lucide-react";
import { PAGE_PATH } from "@/lib/tropical/config";
import type { Mode, ProbsEntry, StormEntry } from "@/lib/tropical/types";
import { Alerts } from "./Alerts";
import { CoastalAlertsLegend } from "./CoastalAlertsLegend";
import { CARD_CLASS } from "./Card";
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

/**
 * Conditions summary, laid out as a row of cards ABOVE the map.
 *
 * This was a fixed-width left rail until Aug 2026, when Jeff and Ben pointed
 * out it squeezed the map into too narrow a column. Moving it overhead gives
 * the map the page's full width, and the storm's headline figures read better
 * across a row than stacked in a 22rem gutter.
 *
 * Active mode: storm header, coastal watches/warnings, wind chances at New
 * Orleans. Quiet mode: "no active systems" + the seven-day outlook, metro
 * alerts, and the historical-replay callout.
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
  if (status !== "ready") {
    return (
      <div
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        role={status === "unavailable" ? "alert" : "status"}
      >
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

  return (
    <div className="space-y-4">
      {activeStorm && storms.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeStorm ? (
          <>
            <StormHeader storm={storm} />
            <CoastalAlertsLegend warnings={wwlines} publicAdvisoryText={publicAdvisoryText} />
            <WindProbabilities probs={probs} />
          </>
        ) : (
          <>
            <OutlookPanel outlookText={outlookText} />
            <Alerts mode={mode} />
            <div className={CARD_CLASS}>
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
          </>
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
