"use client";

import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  CalendarDays,
  Users,
  Info,
} from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import { grassCuttingData, CycleStatus } from "@/data/grassCutting";

function statusBadge(status: CycleStatus) {
  if (status === "COMPLETE") {
    return {
      label: "Complete",
      Icon: CheckCircle2,
      className: "bg-green-50 text-green-700 border-green-200",
      dot: "bg-green-500",
    };
  }
  if (status === "IN_PROGRESS") {
    return {
      label: "In progress",
      Icon: Clock,
      className: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    };
  }
  return {
    label: "Scheduled",
    Icon: CalendarDays,
    className: "bg-gray-50 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  };
}

export default function GrassCuttingPage() {
  const { zones, currentCycle, lastCycle, systemTotal, cadence, source, asOfDate } =
    grassCuttingData;

  const completedZones = zones.filter((z) => z.currentCycle.status === "COMPLETE").length;
  const inProgressZones = zones.filter((z) => z.currentCycle.status === "IN_PROGRESS").length;
  const overallProgress = Math.round((completedZones / zones.length) * 100);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/our-system"
          className="inline-flex items-center gap-1.5 text-sm text-[#21355a] hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Infrastructure
        </Link>

        <SectionHeader
          title="Grass Cutting"
          subtitle="Levee turf maintenance progress across the system"
          source={source}
        />

        {/* DEMO BANNER */}
        <div className="mb-8 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">Preview with demo data</p>
            <p>
              The current cycle progress numbers and dates on this page are
              placeholders for layout review. Cycle 1 history at the bottom
              uses real data from the maintenance team&apos;s March 2026
              cutting plan. The cadence and format for ongoing updates is
              still being confirmed with the FPA maintenance team.
            </p>
          </div>
        </div>

        {/* CURRENT CYCLE HERO */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                  Current cycle
                </p>
                <h2 className="text-2xl font-bold text-[#21355a] mt-1">
                  {currentCycle.label}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {currentCycle.startDate} to {currentCycle.expectedCompletionDate} (expected). Day{" "}
                  {currentCycle.workingDayElapsed} of {currentCycle.workingDaysExpected} working days.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                Demo
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-4xl font-bold text-[#21355a]">{overallProgress}%</div>
                <div className="text-sm text-gray-600 mt-1">of zones complete this cycle</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-green-600">{completedZones}</div>
                <div className="text-sm text-gray-600 mt-1">zones complete</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-amber-600">{inProgressZones}</div>
                <div className="text-sm text-gray-600 mt-1">zones in progress</div>
              </div>
            </div>

            {/* Zone strip: 6 segments showing all zones at a glance */}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                Zones
              </p>
              <div className="flex flex-wrap gap-1.5">
                {zones.map((zone) => {
                  const badge = statusBadge(zone.currentCycle.status);
                  return (
                    <div
                      key={zone.key}
                      className="flex-1 min-w-[140px] rounded-lg border border-gray-200 overflow-hidden"
                    >
                      <div
                        className="h-2"
                        style={{ backgroundColor: zone.color }}
                        aria-hidden="true"
                      />
                      <div className="px-3 py-2 bg-white">
                        <div className="text-xs font-semibold text-[#21355a] truncate" title={zone.name}>
                          {zone.name}
                        </div>
                        <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-medium ${badge.className.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* MAP - placeholder using the maintenance team's original PDF */}
        <section className="mb-12">
          <SectionSubheader
            title="Zones across the system"
            subtitle="Maintenance team's original cutting plan map (placeholder)"
          />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
            <img
              src="/data/cutting-plan-map.png"
              alt="FPA maintenance team cutting plan map showing six color-coded zones across the Orleans Levee System"
              className="w-full h-auto rounded-lg"
            />
            <p className="text-xs text-gray-500 italic mt-3 leading-relaxed">
              Source: maintenance team&apos;s printed cutting plan (Orleans Levee
              District, March 2026). We attempted to recreate this as an
              interactive map but the result was not accurate enough to ship,
              so we&apos;re using the original as a placeholder while we confirm
              the right path forward with the maintenance team.
            </p>
          </div>
        </section>

        {/* SYSTEM AT A GLANCE */}
        <section className="mb-12">
          <SectionSubheader title="System overview" />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-[#21355a]">
                  {systemTotal.miles}
                </div>
                <div className="text-sm text-gray-600 mt-1">total miles maintained</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#21355a]">{zones.length}</div>
                <div className="text-sm text-gray-600 mt-1">zones in the cutting plan</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#21355a]">
                  {cadence.headline}
                </div>
                <div className="text-sm text-gray-600 mt-1">cycles per month</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#21355a]">
                  {lastCycle.workingDays}
                </div>
                <div className="text-sm text-gray-600 mt-1">working days for a full pass</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-5 leading-relaxed">
              {cadence.detail} The new plan doubled the cutting frequency from{" "}
              {cadence.previousPlan.toLowerCase()} starting March 2026.
            </p>
          </div>
        </section>

        {/* ZONE CARDS */}
        <section className="mb-12">
          <SectionSubheader
            title="Zones"
            subtitle="Six color-coded zones across the levee system, matching the maintenance team's cutting plan map"
          />
          <div className="grid md:grid-cols-2 gap-6">
            {zones.map((zone) => {
              const badge = statusBadge(zone.currentCycle.status);
              const StatusIcon = badge.Icon;
              const progressPct =
                zone.currentCycle.daysExpected > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (zone.currentCycle.daysElapsed /
                          zone.currentCycle.daysExpected) *
                          100,
                      ),
                    )
                  : 0;
              return (
                <div
                  key={zone.key}
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
                >
                  {/* Zone header with color band */}
                  <div
                    className="px-5 py-4 flex items-center justify-between"
                    style={{
                      backgroundColor: zone.color,
                      color: zone.darkBackground ? "white" : "#1f2937",
                    }}
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
                        Zone
                      </p>
                      <h3 className="text-lg font-bold mt-0.5">{zone.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Users className="h-4 w-4" />
                      {zone.operators} {typeof zone.operators === "number" && zone.operators === 1 ? "operator" : "operators"}
                    </div>
                  </div>

                  {/* Current cycle */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                          Current cycle
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                          Demo
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${badge.className}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="flex items-baseline justify-between text-xs text-gray-600 mb-1">
                        <span>
                          Day {zone.currentCycle.daysElapsed} of {zone.currentCycle.daysExpected}
                        </span>
                        <span className="font-medium">{progressPct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${progressPct}%`,
                            backgroundColor: zone.tint,
                          }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {zone.currentCycle.startDate ?? "Not started"}{" "}
                      {zone.currentCycle.startDate && (
                        <>
                          to {zone.currentCycle.expectedCompletionDate} (expected)
                        </>
                      )}
                    </div>

                    {/* Sub-areas */}
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                        Sub-areas
                      </p>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {zone.subAreas.map((sa) => (
                          <li key={sa} className="flex items-start gap-2">
                            <span
                              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: zone.color }}
                              aria-hidden="true"
                            />
                            <span>{sa}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Last cycle reference */}
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                        Last cycle (Cycle 1)
                      </p>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          {zone.lastCycle.startDate} to {zone.lastCycle.completionDate}
                        </div>
                        <div className="text-gray-500">
                          {zone.lastCycle.totalDays} working day
                          {zone.lastCycle.totalDays === 1 ? "" : "s"} to complete
                        </div>
                        {zone.lastCycle.comments && (
                          <p className="text-xs text-gray-500 italic mt-2">
                            {zone.lastCycle.comments}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FOOTER NOTE */}
        <section>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-gray-600 leading-relaxed">
              <p>
                Source: {source}. Data as of {asOfDate}.
              </p>
              <p className="mt-1">
                Zone locations on the map are best-guesses from the maintenance
                team&apos;s printed cutting plan. Exact boundaries and the
                LPV-code-to-zone mapping will be refined once confirmed.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
