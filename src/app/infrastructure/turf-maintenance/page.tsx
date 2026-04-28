"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  CalendarDays,
  Info,
} from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import { grassCuttingData, CycleStatus } from "@/data/grassCutting";

// Map uses Leaflet (touches `window`), so load it client-side only.
const GrassCuttingMap = dynamic(() => import("@/components/GrassCuttingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 text-sm">
      Loading map...
    </div>
  ),
});

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
  const totalAcres = zones.reduce((sum, z) => sum + z.acres, 0);
  const monthlyTargetAcres = zones.reduce(
    (sum, z) => sum + z.acres * z.monthlyFrequency,
    0,
  );

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/infrastructure"
          className="inline-flex items-center gap-1.5 text-sm text-[#21355a] hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Infrastructure
        </Link>

        <SectionHeader
          title="Turf Maintenance"
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
                  {currentCycle.daysElapsed} of {currentCycle.daysExpected}.
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

        {/* MAP - interactive levee centerline colored by mowing zone */}
        <section className="mb-12">
          <SectionSubheader
            title="Zones across the system"
            subtitle="Mowing-area polygons colored by zone. Click any polygon for its name, zone, and acreage."
          />
          <GrassCuttingMap />
          <p className="text-xs text-gray-500 italic mt-3 leading-relaxed">
            Coverage is currently the Orleans Levee District (144 mowing-area
            polygons across 6 zones, ~{totalAcres.toLocaleString()} acres
            total). One additional ~122-acre polygon (LPV-115 / Paris Rd. to
            Jourdan) is shown in gray as &quot;Pending classification&quot;
            until the maintenance team confirms whether it&apos;s mowed.
            East Jefferson and Lake Borgne Basin areas will be added once the
            maintenance team provides matching shapefiles. The original
            hand-drawn cutting plan is still available{" "}
            <a
              href="/data/cutting-plan-map.png"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#21355a]"
            >
              here
            </a>
            .
          </p>
        </section>

        {/* SYSTEM AT A GLANCE */}
        <section className="mb-12">
          <SectionSubheader title="System overview" />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-[#21355a]">
                  {totalAcres.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 mt-1">total acres maintained</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#21355a]">{zones.length}</div>
                <div className="text-sm text-gray-600 mt-1">zones in the cutting plan</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#21355a]">
                  ~{Math.round(monthlyTargetAcres).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 mt-1">acres / month target</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#21355a]">
                  {systemTotal.miles}
                </div>
                <div className="text-sm text-gray-600 mt-1">total miles maintained</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-5 leading-relaxed">
              {cadence.detail} The new plan doubled the cutting frequency from{" "}
              {cadence.previousPlan.toLowerCase()} starting March 2026. Source for acreage and zone polygons: Orleans Levee District GIS, Apr 2026.
            </p>
          </div>
        </section>

        {/* ZONE CARDS */}
        <section className="mb-12">
          <SectionSubheader
            title="Zones"
            subtitle={`${zones.length} color-coded zones across the levee system. Acreage from Orleans Levee District GIS; monthly target = acreage × cycles per month.`}
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
                    className="px-5 py-4 flex items-start justify-between gap-3"
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
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold leading-tight">
                        {zone.acres} ac
                      </p>
                      <p className="text-[11px] opacity-80 leading-tight mt-0.5">
                        target {Math.round(zone.acres * zone.monthlyFrequency)} ac/mo
                      </p>
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

                    {/* Last cycle reference */}
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                        Last cycle
                      </p>
                      <div className="text-sm text-gray-600">April 2026</div>
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
