"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import StaffingZoneBar from "@/components/StaffingZoneBar";
import ZoneLegend from "@/components/ZoneLegend";
import { staffingData } from "@/data/siteData";
import { applyStaffingOverlay, type StaffingJson } from "@/lib/staffingOverlay";
import { assertAggregateMatchesSum } from "@/lib/staffingZones";

type ZoneViewMode = "percent" | "raw";

export default function OurTeamPage() {
  // Current filled counts auto-refresh from the monthly staffing workbook
  // (public/data/staffing.json); capacity + thresholds stay curated in code.
  const [staffingJson, setStaffingJson] = useState<StaffingJson | null>(null);
  useEffect(() => {
    fetch("/data/staffing.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStaffingJson(d))
      .catch(() => {});
  }, []);
  const data = useMemo(() => applyStaffingOverlay(staffingData, staffingJson), [staffingJson]);
  const { coreFPU, adminFunctions } = data;
  const [viewMode, setViewMode] = useState<ZoneViewMode>("percent");
  const [showDepts, setShowDepts] = useState(false);
  const [showAdminDepts, setShowAdminDepts] = useState(false);

  if (typeof window !== "undefined") {
    assertAggregateMatchesSum(coreFPU.aggregate, coreFPU.departments);
  }

  const aggregateFull = coreFPU.aggregate.full;
  const scaleFor = (full: number) =>
    viewMode === "raw" && aggregateFull > 0 ? full / aggregateFull : 1;

  const adminAggregateFull = adminFunctions.aggregate.full;
  const scaleAdminFor = (full: number) =>
    viewMode === "raw" && adminAggregateFull > 0 ? full / adminAggregateFull : 1;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Staffing"
          subtitle="The dedicated professionals protecting Greater New Orleans"
          source={data.source}
        />

        {/* Summary line */}
        <section className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <span className="text-2xl font-bold text-[#21355a]">
                {data.headcount.total}
              </span>
              <span className="ml-2 text-sm text-gray-600">total positions</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-amber-500">
                {data.headcount.vacancies}
              </span>
              <span className="ml-2 text-sm text-gray-600">vacancies agency-wide</span>
            </div>
            <div className="text-xs text-gray-500 ml-auto">
              As of {data.asOfDate}
            </div>
          </div>
        </section>

        {/* Core Flood Protection Unit */}
        <section className="mb-10">
          <SectionSubheader title="Core Flood Protection Unit" />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <p className="text-sm text-gray-600 max-w-2xl">
                Operational capacity across Maintenance, Operations, Engineering, and Police.
              </p>
              <div
                role="group"
                aria-label="Bar width view"
                className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("percent")}
                  aria-pressed={viewMode === "percent"}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === "percent"
                      ? "bg-[#21355a] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Percentage
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("raw")}
                  aria-pressed={viewMode === "raw"}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === "raw"
                      ? "bg-[#21355a] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Raw count
                </button>
              </div>
            </div>

            <div className="mb-6">
              <ZoneLegend thresholds={{ green: "≥ 85% filled", amber: "75–84% filled", red: "< 75% filled" }} />
            </div>

            <div className="mb-5">
              <StaffingZoneBar
                group={coreFPU.aggregate}
                variant="full"
                widthScale={1}
                axisMode={viewMode}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowDepts((s) => !s)}
              aria-expanded={showDepts}
              className="flex items-center gap-1.5 text-sm font-medium text-[#21355a] hover:underline"
            >
              {showDepts ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              {showDepts ? "Hide department breakdown" : "Show department breakdown"}
            </button>

            {showDepts && (
              <div className="mt-5 ml-2 pl-5 border-l-2 border-gray-200">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-4">
                  By department
                </p>
                <div className="space-y-7">
                  {coreFPU.departments.map((dept) => (
                    <StaffingZoneBar
                      key={dept.key}
                      group={dept}
                      variant="full"
                      widthScale={scaleFor(dept.full)}
                      axisMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Administrative Functions */}
        <section className="mb-10">
          <SectionSubheader title="Administrative Functions" />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <p className="text-sm text-gray-600 max-w-2xl">
                Support functions that keep the agency running. Not directly tied to storm response operations, but essential to sustained organizational capacity.
              </p>
              <div className="flex items-center gap-2">
                <div
                  role="group"
                  aria-label="Bar width view"
                  className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("percent")}
                    aria-pressed={viewMode === "percent"}
                    className={`px-3 py-1 rounded transition-colors ${
                      viewMode === "percent"
                        ? "bg-[#21355a] text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("raw")}
                    aria-pressed={viewMode === "raw"}
                    className={`px-3 py-1 rounded transition-colors ${
                      viewMode === "raw"
                        ? "bg-[#21355a] text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Raw count
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <ZoneLegend thresholds={{ green: "≥ 75% filled", amber: "50–74% filled", red: "< 50% filled" }} />
            </div>

            <div className="mb-5">
              <StaffingZoneBar
                group={adminFunctions.aggregate}
                variant="full"
                widthScale={1}
                axisMode={viewMode}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdminDepts((s) => !s)}
              aria-expanded={showAdminDepts}
              className="flex items-center gap-1.5 text-sm font-medium text-[#21355a] hover:underline"
            >
              {showAdminDepts ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              {showAdminDepts ? "Hide department breakdown" : "Show department breakdown"}
            </button>

            {showAdminDepts && (
              <div className="mt-5 ml-2 pl-5 border-l-2 border-gray-200">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-4">
                  By department
                </p>
                <div className="space-y-7">
                  {adminFunctions.departments.map((dept) => (
                    <StaffingZoneBar
                      key={dept.key}
                      group={dept}
                      variant="full"
                      widthScale={scaleAdminFor(dept.full)}
                      axisMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
