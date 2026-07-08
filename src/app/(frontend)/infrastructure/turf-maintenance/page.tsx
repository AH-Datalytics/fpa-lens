"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Info } from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import Prose from "@/components/Prose";
import {
  grassCuttingData,
  OldGrassCuttingZone,
  OtherDistrictZone,
  Reach,
} from "@/data/grassCutting";
import {
  computeMonthlyKpi,
  cycle1TickPosition,
  monthlyTargetAcres,
  type AnyZone,
  type KpiLevel,
} from "@/lib/turfMaintenance";
import type { DistrictFilter } from "@/components/GrassCuttingMap";
import { usePageCopy } from "@/lib/usePageCopy";
import { TURF_DEFAULTS } from "@/globals/pages/turfPage";

// Map uses Leaflet (touches `window`), so load it client-side only.
const GrassCuttingMap = dynamic(() => import("@/components/GrassCuttingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 text-sm">
      Loading map...
    </div>
  ),
});

const DISTRICT_FILTERS: { key: DistrictFilter; label: string }[] = [
  { key: "ALL", label: "All districts" },
  { key: "OLD", label: "Orleans (OLD)" },
  { key: "EJLD", label: "East Jefferson (EJLD)" },
  { key: "LBBLD", label: "Lake Borgne Basin (LBBLD)" },
];

const PALETTE: Record<
  KpiLevel,
  { solid: string; badge: string; dot: string }
> = {
  green: {
    solid: "bg-green-500",
    badge: "bg-green-100 text-green-800",
    dot: "bg-green-500",
  },
  amber: {
    solid: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  red: {
    solid: "bg-red-500",
    badge: "bg-red-100 text-red-800",
    dot: "bg-red-500",
  },
};

function ZoneProgressBody({ zone }: { zone: AnyZone }) {
  // No reported actuals yet (e.g. EJLD — foreman hasn't started logging
  // weekly cumulative C1/C2 percentages). Show a neutral placeholder.
  if (!zone.hasReportedData) {
    const target = monthlyTargetAcres(zone);
    return (
      <div className="pt-3 border-t border-gray-100 space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
            Monthly progress
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400"
              aria-hidden="true"
            />
            Awaiting weekly update
          </span>
        </div>
        <div className="relative h-3 rounded bg-gray-100 overflow-hidden" />
        <p className="text-[10px] text-gray-500">
          Monthly target {target.toLocaleString()} ac
        </p>
      </div>
    );
  }

  const kpi = computeMonthlyKpi(zone, grassCuttingData.reportingMonth);
  const fillPct = Math.min(100, kpi.progressFraction * 100);
  const tick = cycle1TickPosition(zone);
  const tickPct = tick === null ? null : tick * 100;
  const c = PALETTE[kpi.level];

  return (
    <div className="pt-3 border-t border-gray-100 space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
          {grassCuttingData.reportingMonth.label} progress
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.badge}`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${c.dot}`}
            aria-hidden="true"
          />
          {kpi.badgeLabel}
        </span>
      </div>
      <div
        className="relative"
        role="img"
        aria-label={`${kpi.done} of ${kpi.target} acres completed this month`}
      >
        <div className="relative h-3 rounded bg-gray-100 overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 ${c.solid} transition-all`}
            style={{ width: `${fillPct}%` }}
          />
          {tickPct !== null && (
            <div
              className="absolute inset-y-0 w-0.5 bg-gray-800"
              style={{ left: `calc(${tickPct}% - 1px)` }}
              aria-hidden="true"
            />
          )}
        </div>
        {tickPct !== null && (
          <div className="relative h-3 mt-0.5">
            <span
              className="absolute text-[9px] uppercase tracking-wider font-semibold text-gray-600 whitespace-nowrap"
              style={{
                left: `${tickPct}%`,
                transform:
                  tickPct > 80 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              Cycle 1
            </span>
          </div>
        )}
      </div>
      <p className="text-[11px] text-gray-700">
        <strong className="text-gray-900">
          {kpi.done.toLocaleString()} of {kpi.target.toLocaleString()} ac
        </strong>{" "}
        completed this month
      </p>
    </div>
  );
}

function ReachList({ reaches }: { reaches: Reach[] }) {
  if (reaches.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">
        Reaches
      </p>
      <ul className="text-xs text-gray-700 space-y-0.5">
        {reaches.map((r) => (
          <li key={r.name} className="flex justify-between gap-2">
            <span className="truncate">{r.name}</span>
            <span className="text-gray-500 flex-shrink-0">
              {r.acres.toLocaleString()} ac
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ZoneCardHeader({
  color,
  darkBackground,
  name,
  acres,
  monthlyFrequency,
}: {
  color: string;
  darkBackground: boolean;
  name: string;
  acres: number;
  monthlyFrequency: number;
}) {
  const monthlyTarget = Math.round(acres * monthlyFrequency);
  return (
    <div
      className="px-4 py-3"
      style={{
        backgroundColor: color,
        color: darkBackground ? "white" : "#1f2937",
      }}
    >
      <p className="text-[9px] uppercase tracking-wider opacity-80 font-semibold">
        Zone
      </p>
      <h3 className="text-sm font-bold mt-0.5 leading-tight">{name}</h3>
      <p className="text-[11px] opacity-90 mt-1.5 leading-tight">
        <span className="font-bold">{acres.toLocaleString()} ac</span>
        {" · "}
        <span className="font-bold">{monthlyFrequency}×/mo</span>
        {" · "}
        {monthlyTarget.toLocaleString()} ac target
      </p>
    </div>
  );
}

function OldZoneCard({ zone }: { zone: OldGrassCuttingZone }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <ZoneCardHeader
        color={zone.color}
        darkBackground={zone.darkBackground}
        name={zone.name}
        acres={zone.acres}
        monthlyFrequency={zone.monthlyFrequency}
      />
      <div className="p-4">
        <ReachList reaches={zone.reaches} />
        <ZoneProgressBody zone={zone} />
      </div>
    </div>
  );
}

function OtherZoneCard({ zone }: { zone: OtherDistrictZone }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <ZoneCardHeader
        color={zone.color}
        darkBackground={zone.darkBackground}
        name={zone.name}
        acres={zone.acres}
        monthlyFrequency={zone.monthlyFrequency}
      />
      <div className="p-4">
        <ReachList reaches={zone.reaches} />
        <ZoneProgressBody zone={zone} />
      </div>
    </div>
  );
}

export default function GrassCuttingPage() {
  const { zones, ejldZones, lbbldZones, systemTotal, reportingMonth } =
    grassCuttingData;

  const oldAcres = zones.reduce((sum, z) => sum + z.acres, 0);
  const ejldAcres = ejldZones.reduce((sum, z) => sum + z.acres, 0);
  const lbbldAcres = lbbldZones.reduce((sum, z) => sum + z.acres, 0);
  const systemAcres = oldAcres + ejldAcres + lbbldAcres;
  const systemZones = zones.length + ejldZones.length + lbbldZones.length;

  // System-wide rollup shown alongside the totals so this page surfaces
  // the same on-pace count and Green/Amber/Red status the home and
  // infrastructure pages use. Same 90/80 thresholds as the rest of the
  // site.
  const allZonesForRollup: AnyZone[] = [...zones, ...ejldZones, ...lbbldZones];
  const onPaceCount = allZonesForRollup.reduce((n, zone) => {
    if (!zone.hasReportedData) return n;
    return computeMonthlyKpi(zone, reportingMonth).level === "green" ? n + 1 : n;
  }, 0);
  const onPaceRatio = systemZones > 0 ? (onPaceCount / systemZones) * 100 : 100;
  const rollupLevel: KpiLevel =
    onPaceRatio >= 90 ? "green" : onPaceRatio >= 80 ? "amber" : "red";
  const rollupBadgeLabel =
    rollupLevel === "green"
      ? "On pace"
      : rollupLevel === "amber"
        ? "Watch"
        : "Behind";

  const copy = usePageCopy("turf-page", TURF_DEFAULTS);

  const [district, setDistrict] = useState<DistrictFilter>("ALL");
  const showOld = district === "ALL" || district === "OLD";
  const showEjld = district === "ALL" || district === "EJLD";
  const showLbbld = district === "ALL" || district === "LBBLD";

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
          title={copy.pageTitle}
          subtitle={copy.pageSubtitle}
        />

        {/* PLAN HERO. Plain-English summary of what the dashboard tracks.
            Per-zone Green/Amber/Red status carries the progress story
            below — cards are the single source of truth. */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              {copy.planEyebrow}
            </p>
            <h2 className="text-2xl font-bold text-[#21355a] mt-1">
              Routine mowing across {systemAcres.toLocaleString()} acres of
              levee turf
            </h2>
            <p className="text-sm text-gray-700 mt-2 leading-relaxed max-w-3xl">
              SLFPA-East maintains{" "}
              <strong>{systemAcres.toLocaleString()} acres</strong> of levee
              turf across <strong>{systemZones} zones</strong> in three levee
              districts. Mowing targets vary by zone based on size, location,
              and operating conditions. This dashboard shows monthly progress
              against those targets using a simple Green / Amber / Red status,
              as defined in the &ldquo;How to read the zone cards&rdquo;
              section below.
            </p>
          </div>
        </section>

        {/* SYSTEM AT A GLANCE — moved above the map so the totals frame
            the detailed exploration that follows. The summary badge
            mirrors the system-wide on-pace status shown on the home
            and infrastructure pages. */}
        <section className="mb-12">
          <SectionSubheader title={copy.systemOverviewTitle} />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                  {reportingMonth.label} system status
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  <span className="text-2xl font-bold text-[#21355a] align-middle">
                    {onPaceCount}
                  </span>
                  <span className="align-middle">
                    {" "}
                    of {systemZones} zones on pace this month
                  </span>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${PALETTE[rollupLevel].badge}`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${PALETTE[rollupLevel].dot}`}
                  aria-hidden="true"
                />
                {rollupBadgeLabel}
              </span>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-[#21355a]">
                  {systemAcres.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  total acres maintained
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#21355a]">
                  {systemZones}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  zones across 3 districts
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#21355a]">3</div>
                <div className="text-sm text-gray-600 mt-1">
                  levee districts (OLD, EJLD, LBBLD)
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#21355a]">
                  {systemTotal.miles}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  total miles maintained
                </div>
              </div>
            </div>
            {/* Mowing-data freshness. The mowing workbook updates weekly,
                more often than the monthly SITREP roll, so the period is
                stated explicitly here. */}
            <p className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
              Mowing data reflects the{" "}
              <strong className="text-gray-700">{reportingMonth.label}</strong>{" "}
              reporting period and is updated weekly as the maintenance team
              submits progress.
            </p>
          </div>
        </section>

        {/* OPERATIONAL NOTE — manually maintained, dated context for months
            where conditions (e.g. June 2026 rainfall) materially affect mowing
            progress. Neutral/informational by design: it explains conditions
            without adjusting status colors or excusing the numbers. Update the
            heading and body, or remove the section, when the reporting period
            rolls forward and conditions change. */}
        <section className="mb-12">
          <div className="rounded-xl border border-gray-200 border-l-4 border-l-[#21355a] bg-white shadow-md p-6">
            <div className="flex items-start gap-2 mb-3">
              <Info
                className="h-4 w-4 text-[#21355a] flex-shrink-0 mt-1"
                aria-hidden="true"
              />
              <h3 className="text-sm font-bold text-[#21355a]">
                {copy.operationalNoteHeading}
              </h3>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed max-w-3xl">
              <Prose className="[&_p]:m-0" data={copy.operationalNoteBody1} />
              <Prose className="[&_p]:m-0" data={copy.operationalNoteBody2} />
            </div>
          </div>
        </section>

        {/* DISTRICT FILTER — controls both the map below and the zone
            cards beneath it. Default is OLD since that's where most of
            the maintenance attention sits. */}
        <section className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold mr-1">
              District:
            </span>
            {DISTRICT_FILTERS.map((opt) => {
              const active = district === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDistrict(opt.key)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                    active
                      ? "bg-[#21355a] text-white border-[#21355a]"
                      : "bg-white text-gray-700 border-gray-300 hover:border-[#21355a] hover:text-[#21355a]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* MAP - interactive levee centerline colored by mowing zone */}
        <section className="mb-12">
          <SectionSubheader
            title={copy.mapTitle}
            subtitle={copy.mapSubtitle}
          />
          <GrassCuttingMap districtFilter={district} />
          <p className="text-xs text-gray-500 italic mt-3 leading-relaxed">
            {district === "ALL"
              ? `Showing all three districts: Orleans (144 polygons across 6 zones, ~${oldAcres.toLocaleString()} acres), East Jefferson (63 polygons across 4 zones, ~${ejldAcres.toLocaleString()} acres), and Lake Borgne Basin (84 polygons across 4 zones, ~${lbbldAcres.toLocaleString()} acres).`
              : district === "OLD"
                ? `Showing Orleans Levee District: 144 polygons across 6 zones, ~${oldAcres.toLocaleString()} acres.`
                : district === "EJLD"
                  ? `Showing East Jefferson Levee District: 63 polygons across 4 zones, ~${ejldAcres.toLocaleString()} acres.`
                  : `Showing Lake Borgne Basin Levee District: 84 polygons across 4 zones, ~${lbbldAcres.toLocaleString()} acres.`}
          </p>
        </section>

        {/* HOW TO READ THE ZONE CARDS — single-bar story: each zone shows
            projected monthly output at the pace Cycle 1 set, with bar
            length AND color both signaling the same status. */}
        <section className="mb-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-2 mb-2">
              <Info
                className="h-4 w-4 text-[#21355a] flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold text-[#21355a]">
                {copy.howToReadHeading}
              </h3>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed mb-2">
              Each card shows how much of the zone&apos;s monthly mowing
              target has been completed in {grassCuttingData.reportingMonth.label}.
              The bar fills with cumulative acres mowed against the monthly
              target (zone acres × cycles per month). The dark tick marks
              where Cycle 1 should land for zones running more than once per
              month.
            </p>
            <Prose
              className="text-xs text-gray-700 leading-relaxed mb-2 [&_p]:m-0"
              data={copy.statusExplainer}
            />
            <ul className="text-xs text-gray-700 space-y-0.5">
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"
                  aria-hidden="true"
                />
                <span>
                  <strong>On pace</strong> — at or above 90% of monthly target
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"
                  aria-hidden="true"
                />
                <span>
                  <strong>At risk</strong> — 80 to 89% of monthly target
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-red-500"
                  aria-hidden="true"
                />
                <span>
                  <strong>Behind</strong> — under 80% of monthly target
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ZONE CARDS — Orleans Levee District */}
        {showOld && (
          <section className="mb-12">
            <SectionSubheader
              title="Orleans Levee District Zones"
              subtitle={`${zones.length} color-coded zones. ${grassCuttingData.reportingMonth.label}.`}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone) => (
                <OldZoneCard key={zone.key} zone={zone} />
              ))}
            </div>
          </section>
        )}

        {/* ZONE CARDS — East Jefferson Levee District */}
        {showEjld && (
          <section className="mb-12">
            <SectionSubheader
              title="East Jefferson Levee District Zones"
              subtitle={`${ejldZones.length} color-coded zones. ${grassCuttingData.reportingMonth.label}.`}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ejldZones.map((zone) => (
                <OtherZoneCard key={zone.key} zone={zone} />
              ))}
            </div>
          </section>
        )}

        {/* ZONE CARDS — Lake Borgne Basin Levee District */}
        {showLbbld && (
          <section className="mb-12">
            <SectionSubheader
              title="Lake Borgne Basin Levee District Zones"
              subtitle={`${lbbldZones.length} color-coded zones. ${grassCuttingData.reportingMonth.label}.`}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {lbbldZones.map((zone) => (
                <OtherZoneCard key={zone.key} zone={zone} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
