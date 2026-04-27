"use client";

import { useState } from "react";
import { User, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import StaffingZoneBar from "@/components/StaffingZoneBar";
import ZoneLegend from "@/components/ZoneLegend";
import { staffingData } from "@/data/siteData";
import { assertAggregateMatchesSum } from "@/lib/staffingZones";

type ZoneViewMode = "percent" | "raw";

export default function OurTeamPage() {
  const { coreFPU, opSupport } = staffingData;
  const [viewMode, setViewMode] = useState<ZoneViewMode>("percent");
  const [showDepts, setShowDepts] = useState(false);

  if (typeof window !== "undefined") {
    assertAggregateMatchesSum(coreFPU.aggregate, coreFPU.departments);
  }

  const aggregateFull = coreFPU.aggregate.full;
  const scaleFor = (full: number) =>
    viewMode === "raw" && aggregateFull > 0 ? full / aggregateFull : 1;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Staffing"
          subtitle="The dedicated professionals protecting Greater New Orleans"
          source={staffingData.source}
        />

        {/* Summary line */}
        <section className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <span className="text-2xl font-bold text-[#21355a]">
                {staffingData.headcount.total}
              </span>
              <span className="ml-2 text-sm text-gray-600">total staff</span>
              <span className="ml-1 text-xs text-gray-500">
                ({staffingData.headcount.classified} classified,{" "}
                {staffingData.headcount.unclassified} unclassified)
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold text-amber-500">
                {staffingData.headcount.vacancies}
              </span>
              <span className="ml-2 text-sm text-gray-600">vacancies agency-wide</span>
            </div>
            <div className="text-xs text-gray-500 ml-auto">
              As of {staffingData.asOfDate}
            </div>
          </div>
        </section>

        {/* Core Flood Protection Unit — zone framework */}
        <section className="mb-10">
          <SectionSubheader title="Core Flood Protection Unit" />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <p className="text-sm text-gray-600 max-w-2xl">
                Operational capacity across Maintenance, Operations, and
                Engineering. Thresholds set by {coreFPU.thresholdsSetBy} in{" "}
                {coreFPU.thresholdsDate}.
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

            {/* Color-coded definitions legend */}
            <div className="mb-6">
              <ZoneLegend />
            </div>

            {coreFPU.isMockPreview && (
              <div className="mb-6 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Demo data.</strong> Per-department headcount is a
                  placeholder preview; real numbers arrive from HR the week of
                  April 27, 2026.
                </span>
              </div>
            )}

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
              {showDepts
                ? "Hide department breakdown"
                : "Show department breakdown"}
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

            <p className="text-xs text-gray-400 mt-6">
              Red zone thresholds are provisional pending validation against
              2020 low-headcount data.
            </p>
          </div>
        </section>

        {/* Operational Support — placeholder */}
        <section className="mb-10">
          <SectionSubheader title={opSupport.label} />
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6">
            <p className="text-sm text-gray-600">
              Covering {opSupport.groups.join(", ")}.
            </p>
            <p className="text-sm text-gray-500 italic mt-2">
              {opSupport.note}.
            </p>
          </div>
        </section>

        {/* Leadership */}
        <section>
          <SectionSubheader title="Leadership" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffingData.leadership.map((leader) => (
              <div
                key={leader.name}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-[#21355a]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-[#21355a]" />
                </div>
                <div>
                  <p className="font-semibold text-[#21355a]">{leader.name}</p>
                  <p className="text-sm text-gray-600">{leader.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
