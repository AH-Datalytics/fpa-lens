"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  CheckCircle2,
  Info,
} from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import {
  grassCuttingData,
  OldGrassCuttingZone,
  OtherDistrictZone,
} from "@/data/grassCutting";
import type { DistrictFilter } from "@/components/GrassCuttingMap";

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

type KpiLevel = "green" | "amber" | "red";

function ZoneProgressBody({
  acres,
  monthlyFrequency,
  calendarDays,
}: {
  acres: number;
  monthlyFrequency: number;
  calendarDays: number;
}) {
  const monthlyTarget = Math.round(acres * monthlyFrequency);

  // On-pace, the first cycle should finish in 30 / monthlyFrequency days
  // (so 15 days for 2x/mo, 20 days for 1.5x/mo). Comparing that to the
  // actual calendarDays gives how much of the cycle would have been covered
  // in the planned window — the basis for the bar's "behind" visual.
  const cycle1TargetDays = 30 / monthlyFrequency;
  const onTimeRatio = cycle1TargetDays / calendarDays;

  // Solid fill = acres covered by the time Cycle 1 was *supposed to* finish.
  // Capped at `acres` so the solid bar tops out at the Cycle 1 tick when
  // the crew met (or beat) the planned cycle window.
  const onTimeAcres = Math.min(acres, Math.round(acres * onTimeRatio));

  // Tick = Cycle 1 boundary on the monthly target. Solid endpoint coincides
  // with the tick for green; for amber/red, solid sits left of the tick.
  const actualPct = Math.min(100, (onTimeAcres / monthlyTarget) * 100);
  const cycle1Pct = Math.min(100, (acres / monthlyTarget) * 100);

  // Green = met Cycle 1 target in time. Amber = within 20% of target.
  // Red = more than 20% short.
  const kpiLevel: KpiLevel =
    onTimeRatio >= 1 ? "green" : onTimeRatio >= 0.8 ? "amber" : "red";

  const palette: Record<
    KpiLevel,
    {
      solid: string;
      hash: string;
      badge: string;
      dot: string;
      label: string;
    }
  > = {
    green: {
      solid: "bg-green-500",
      hash: "rgba(34, 197, 94, 0.5)", // green-500
      badge: "bg-green-100 text-green-800",
      dot: "bg-green-500",
      label: "On pace",
    },
    amber: {
      solid: "bg-amber-500",
      hash: "rgba(245, 158, 11, 0.5)", // amber-500
      badge: "bg-amber-100 text-amber-800",
      dot: "bg-amber-500",
      label: "At risk",
    },
    red: {
      solid: "bg-red-500",
      hash: "rgba(239, 68, 68, 0.5)", // red-500
      badge: "bg-red-100 text-red-800",
      dot: "bg-red-500",
      label: "Behind",
    },
  };
  const c = palette[kpiLevel];

  return (
    <div className="pt-3 border-t border-gray-100 space-y-3">
      <p className="text-[11px] text-gray-500">
        Cycle 1 pace:{" "}
        <span className="font-semibold text-gray-700">
          {(acres / calendarDays).toFixed(1)} ac/day
        </span>
      </p>

      {/* Whole bar = monthly target (acres). Solid = acres mowed (Cycle 1).
          Tick = Cycle 1 boundary on the monthly target. Hashed remainder =
          work still owed this month; its color signals whether the Cycle 1
          pace projects to hit the monthly target. */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
            Monthly progress
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.badge}`}
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${c.dot}`}
              aria-hidden="true"
            />
            {c.label}
          </span>
        </div>
        <div
          className="relative"
          role="img"
          aria-label={`At Cycle 1 pace, ${onTimeAcres} of ${acres} ac would be covered in the planned cycle window; monthly target ${monthlyTarget} ac`}
        >
          <div className="relative h-3 rounded bg-gray-100 overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 ${c.solid} transition-all`}
              style={{ width: `${actualPct}%` }}
            />
            <div
              className="absolute inset-y-0 right-0"
              style={{
                left: `${actualPct}%`,
                backgroundImage: `repeating-linear-gradient(45deg, ${c.hash} 0 5px, transparent 5px 10px)`,
              }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-gray-800"
              style={{ left: `calc(${cycle1Pct}% - 1px)` }}
              aria-hidden="true"
            />
          </div>
          {/* Tick label: makes "what does this dark line mean?" obvious */}
          <div className="relative h-3 mt-0.5">
            <span
              className="absolute text-[9px] uppercase tracking-wider font-semibold text-gray-600 whitespace-nowrap"
              style={{
                left: `${cycle1Pct}%`,
                transform: cycle1Pct > 80 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              Cycle 1
            </span>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>
            <strong className="text-gray-700">
              {onTimeAcres.toLocaleString()} of {acres.toLocaleString()} ac
            </strong>{" "}
            in cycle window
          </span>
          <span>{monthlyTarget.toLocaleString()} ac monthly target</span>
        </div>
      </div>
    </div>
  );
}

function CoverageList({ subAreas }: { subAreas: string[] }) {
  if (subAreas.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">
        Coverage
      </p>
      <ul className="text-xs text-gray-700 list-disc pl-4 space-y-0.5">
        {subAreas.map((sa) => (
          <li key={sa}>{sa}</li>
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
        <CoverageList subAreas={zone.subAreas} />
        <ZoneProgressBody
          acres={zone.acres}
          monthlyFrequency={zone.monthlyFrequency}
          calendarDays={zone.lastCycle.calendarDays}
        />
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
        <CoverageList subAreas={zone.subAreas} />
        <ZoneProgressBody
          acres={zone.acres}
          monthlyFrequency={zone.monthlyFrequency}
          calendarDays={zone.lastCycle.calendarDays}
        />
      </div>
    </div>
  );
}

function DistrictCycleStat({
  district,
  zoneCount,
  acres,
}: {
  district: string;
  zoneCount: number;
  acres: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        {district}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#21355a]">
          {zoneCount}
        </span>
        <span className="text-xs text-gray-500">
          zone{zoneCount === 1 ? "" : "s"} · {acres.toLocaleString()} acres
        </span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" />
        All zones mowed
      </div>
    </div>
  );
}

export default function GrassCuttingPage() {
  const {
    zones,
    ejldZones,
    lbbldZones,
    oldCycle1,
    ejldCycle1,
    lbbldCycle1,
    systemTotal,
    cadence,
  } = grassCuttingData;

  const oldAcres = zones.reduce((sum, z) => sum + z.acres, 0);
  const ejldAcres = ejldZones.reduce((sum, z) => sum + z.acres, 0);
  const lbbldAcres = lbbldZones.reduce((sum, z) => sum + z.acres, 0);
  const systemAcres = oldAcres + ejldAcres + lbbldAcres;
  const systemZones = zones.length + ejldZones.length + lbbldZones.length;

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
          title="Turf Maintenance"
          subtitle="Levee turf maintenance progress across the system"
        />

        {/* PLAN + PROGRESS HERO. Leads with the plain-English plan
            (defining "cycle"), then a simple green status strip
            confirming Cycle 1 is done across every zone. */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              The maintenance plan
            </p>
            <h2 className="text-2xl font-bold text-[#21355a] mt-1">
              Twice-monthly mowing across {systemAcres.toLocaleString()} acres
              of levee turf
            </h2>
            <p className="text-sm text-gray-700 mt-2 leading-relaxed max-w-3xl">
              The Authority&apos;s maintenance team mows{" "}
              <strong>{systemAcres.toLocaleString()} acres</strong> of levee
              turf across all three levee districts (Orleans, East Jefferson,
              and Lake Borgne Basin), divided into{" "}
              <strong>{systemZones} zones</strong>. A{" "}
              <strong>cycle</strong> is one full pass — every zone mowed once.
              The current plan, in effect since March 2026, targets{" "}
              <strong>two cycles per month</strong> for most zones (1.5 for
              two larger zones), doubled from the prior once-a-month schedule.
            </p>

            {/* Status strip: where the plan stands today */}
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">
                      Cycle 1 complete
                    </p>
                    <p className="text-xs text-green-800 mt-0.5">
                      Every zone in all three districts has been mowed once
                      under the new plan. Cycle 2 begins next.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-green-700 border border-green-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                  Cycle 1 · Complete
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                <DistrictCycleStat
                  district="Orleans (OLD)"
                  zoneCount={zones.length}
                  acres={oldAcres}
                />
                <DistrictCycleStat
                  district="East Jefferson (EJLD)"
                  zoneCount={ejldZones.length}
                  acres={ejldAcres}
                />
                <DistrictCycleStat
                  district="Lake Borgne Basin (LBBLD)"
                  zoneCount={lbbldZones.length}
                  acres={lbbldAcres}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SYSTEM AT A GLANCE — moved above the map so the totals frame
            the detailed exploration that follows. */}
        <section className="mb-12">
          <SectionSubheader title="System overview" />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
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
            <p className="text-xs text-gray-500 mt-5 leading-relaxed">
              {cadence.detail} The new plan doubled the cutting frequency from{" "}
              {cadence.previousPlan.toLowerCase()} starting March 2026.
            </p>
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
            title="Zones across the system"
            subtitle="Mowing-area polygons colored by zone. Click any polygon for its name, zone, and acreage."
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
                How to read the zone cards
              </h3>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed mb-2">
              Each card shows what Cycle 1 told us about the zone&apos;s
              sustainable monthly output. The bar projects how many acres the
              crew can mow per month at the pace Cycle 1 set, against the
              monthly target (zone acres × cycles per month).
            </p>
            <ul className="text-xs text-gray-700 space-y-0.5">
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"
                  aria-hidden="true"
                />
                <span>
                  <strong>On pace</strong> — projected to hit ≥ 90% of monthly
                  target
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"
                  aria-hidden="true"
                />
                <span>
                  <strong>At risk</strong> — projected at 80–89%; Cycle 2 may
                  not fully complete
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-red-500"
                  aria-hidden="true"
                />
                <span>
                  <strong>Behind</strong> — projected under 80%; Cycle 2
                  unlikely this month at current pace
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ZONE CARDS — Orleans Levee District */}
        {showOld && (
          <section className="mb-12">
            <SectionSubheader
              title="Zones — Orleans Levee District"
              subtitle={`${zones.length} color-coded zones. Cycle 1 ran ${oldCycle1.startDate} to ${oldCycle1.completionDate} (${oldCycle1.workingDays} working days). Monthly target = acreage × cycles per month.`}
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
              title="Zones — East Jefferson Levee District"
              subtitle={`${ejldZones.length} zones. Cycle 1 ran ${ejldCycle1.startDate} to ${ejldCycle1.completionDate} (${ejldCycle1.workingDays} working days). ${ejldCycle1.note ?? ""}`}
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
              title="Zones — Lake Borgne Basin Levee District"
              subtitle={`${lbbldZones.length} zones. Cycle 1 ran ${lbbldCycle1.startDate} to ${lbbldCycle1.completionDate} (${lbbldCycle1.workingDays} working days). ${lbbldCycle1.note ?? ""}`}
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
