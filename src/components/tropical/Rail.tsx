"use client";

import { ArrowRight } from "lucide-react";
import { PAGE_PATH } from "@/lib/tropical/config";
import type { Mode, ProbsEntry, StormEntry } from "@/lib/tropical/types";
import { Alerts } from "./Alerts";
import { CoastalAlertsLegend } from "./CoastalAlertsLegend";
import { Kicker } from "./Kicker";
import { OutlookPanel } from "./OutlookPanel";
import { StormHeader } from "./StormHeader";
import { WindProbabilities } from "./WindProbabilities";

export interface RailProps {
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
 * Left rail. Active mode order: storm header, coastal watches/warnings, wind
 * chances at New Orleans. Quiet mode: "no active systems" + seven-day outlook
 * + metro alerts + the historical-replay callout. The intensity panel lives
 * over the map, not here.
 */
export function Rail({
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
}: RailProps) {
  return (
    // No inner scroll: the rail grows to fit its content and the map column
    // stretches to match, so the whole page scrolls as one instead of trapping
    // the storm figures behind a nested scrollbar.
    <div className="flex h-full flex-col bg-white px-5 py-4">
      {status !== "ready" ? (
        <div
          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
          role={status === "unavailable" ? "alert" : "status"}
        >
          <div className="text-sm font-semibold text-[#21355a]">
            {status === "loading" ? "Loading live conditions…" : "Live conditions unavailable"}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
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
      ) : mode === "active" && storm ? (
        <>
          {storms.length > 1 && (
            <div className="border-b border-gray-200 pb-4">
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
          <StormHeader storm={storm} />
          <CoastalAlertsLegend warnings={wwlines} publicAdvisoryText={publicAdvisoryText} />
          <WindProbabilities probs={probs} />
        </>
      ) : (
        <>
          <OutlookPanel outlookText={outlookText} />
          <Alerts mode={mode} />
          <div className="py-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
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
          </div>
        </>
      )}
      {status === "ready" && dataIssues.length > 0 && (
        <details className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3">
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
      <div className="mt-auto pt-4 text-[11px] text-gray-400">
        Sources: National Hurricane Center · NWS New Orleans/Baton Rouge
      </div>
    </div>
  );
}
