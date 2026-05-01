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
  DistrictCycleSummary,
  OldGrassCuttingZone,
  OtherDistrictZone,
  ZoneCycleResult,
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
  { key: "OLD", label: "Orleans (OLD)" },
  { key: "EJLD", label: "East Jefferson (EJLD)" },
  { key: "LBBLD", label: "Lake Borgne Basin (LBBLD)" },
  { key: "ALL", label: "All districts" },
];

function CycleResultBlock({ cycle }: { cycle: ZoneCycleResult }) {
  return (
    <div className="pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
          Cycle 1
        </p>
        <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide border bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Complete
        </span>
      </div>
      <div className="text-xs text-gray-700">
        {cycle.startDate} – {cycle.completionDate}
      </div>
      <div className="text-[11px] text-gray-500 mt-0.5">
        {cycle.totalDays} working day{cycle.totalDays === 1 ? "" : "s"}
      </div>
      {cycle.comments && (
        <p className="text-[11px] text-gray-500 mt-1.5 italic leading-snug">
          {cycle.comments}
        </p>
      )}
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
  meta,
}: {
  color: string;
  darkBackground: boolean;
  name: string;
  acres: number;
  meta: string;
}) {
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
        <span className="font-bold">{acres} ac</span> · {meta}
      </p>
    </div>
  );
}

function OldZoneCard({ zone }: { zone: OldGrassCuttingZone }) {
  const meta = `${zone.operators} operator${zone.operators === 1 ? "" : "s"} · target ${Math.round(zone.acres * zone.monthlyFrequency)} ac/mo`;
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <ZoneCardHeader
        color={zone.color}
        darkBackground={zone.darkBackground}
        name={zone.name}
        acres={zone.acres}
        meta={meta}
      />
      <div className="p-4">
        <CoverageList subAreas={zone.subAreas} />
        <CycleResultBlock cycle={zone.lastCycle} />
      </div>
    </div>
  );
}

function OtherZoneCard({ zone }: { zone: OtherDistrictZone }) {
  const meta = `${zone.operators} operator${zone.operators === 1 ? "" : "s"}`;
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <ZoneCardHeader
        color={zone.color}
        darkBackground
        name={zone.name}
        acres={zone.acres}
        meta={meta}
      />
      <div className="p-4">
        <CoverageList subAreas={zone.subAreas} />
        <CycleResultBlock cycle={zone.lastCycle} />
      </div>
    </div>
  );
}

function DistrictCycleStat({
  district,
  cycle,
  zoneCount,
  acres,
}: {
  district: string;
  cycle: DistrictCycleSummary;
  zoneCount: number;
  acres: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        {district}
      </p>
      <p className="text-sm text-gray-700 mt-1">
        {cycle.startDate} to {cycle.completionDate}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#21355a]">
          {cycle.workingDays}
        </span>
        <span className="text-xs text-gray-500">working days</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">
        {zoneCount} zone{zoneCount === 1 ? "" : "s"} ·{" "}
        {acres.toLocaleString()} acres
      </p>
      {cycle.note && (
        <p className="text-xs text-gray-500 italic mt-2 leading-snug">
          {cycle.note}
        </p>
      )}
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
    source,
    asOfDate,
  } = grassCuttingData;

  const oldAcres = zones.reduce((sum, z) => sum + z.acres, 0);
  const ejldAcres = ejldZones.reduce((sum, z) => sum + z.acres, 0);
  const lbbldAcres = lbbldZones.reduce((sum, z) => sum + z.acres, 0);
  const systemAcres = oldAcres + ejldAcres + lbbldAcres;
  const systemZones = zones.length + ejldZones.length + lbbldZones.length;
  const totalWorkingDays =
    oldCycle1.workingDays + ejldCycle1.workingDays + lbbldCycle1.workingDays;

  const [district, setDistrict] = useState<DistrictFilter>("OLD");
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
          source={source}
        />

        {/* PLAN + PROGRESS HERO. Leads with what the maintenance plan
            actually is, then shows current progress against it. */}
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
              <strong>{systemZones} zones</strong>. The current plan, in
              effect since March 2026, targets{" "}
              <strong>twice per month</strong> for most reaches and doubled
              the cycle frequency from the prior once-a-month schedule.
            </p>

            {/* Progress strip: current state of the plan */}
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">
                      Cycle 1 complete · the initial pass under the new plan
                    </p>
                    <p className="text-xs text-green-800 mt-0.5">
                      March 17 to April 29, 2026. Every zone in all three
                      districts was cut.
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
                  cycle={oldCycle1}
                  zoneCount={zones.length}
                  acres={oldAcres}
                />
                <DistrictCycleStat
                  district="East Jefferson (EJLD)"
                  cycle={ejldCycle1}
                  zoneCount={ejldZones.length}
                  acres={ejldAcres}
                />
                <DistrictCycleStat
                  district="Lake Borgne Basin (LBBLD)"
                  cycle={lbbldCycle1}
                  zoneCount={lbbldZones.length}
                  acres={lbbldAcres}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 italic mt-4 leading-relaxed">
              Cycle 2 is not yet underway. Once the maintenance team confirms
              the Cycle 2 reporting cadence, in-flight progress will show
              here. Total working days across all three Cycle 1 passes:{" "}
              {totalWorkingDays}.
            </p>
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
              Source for acreage and zone polygons: OLD GIS (Apr 2026), EJLD
              + LBBLD GIS (May 2026), provided by Kory.
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
                ? `Showing Orleans Levee District: 144 polygons across 6 zones, ~${oldAcres.toLocaleString()} acres. One ~122-acre polygon (LPV-115 / Paris Rd. to Jourdan) is shown in gray as "Pending classification" until the maintenance team confirms whether it's mowed.`
                : district === "EJLD"
                  ? `Showing East Jefferson Levee District: 63 polygons across 4 zones, ~${ejldAcres.toLocaleString()} acres.`
                  : `Showing Lake Borgne Basin Levee District: 84 polygons across 4 zones, ~${lbbldAcres.toLocaleString()} acres.`}
          </p>
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

        {/* FOOTER NOTE */}
        <section>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-gray-600 leading-relaxed">
              <p>
                Source: {source}. Data as of {asOfDate}.
              </p>
              <p className="mt-1">
                Zone boundaries on the map come directly from the maintenance
                team&apos;s GIS shapefiles (OLD: Apr 2026; EJLD + LBBLD: May
                2026). Cycle 1 working-day totals are from the spreadsheet
                &quot;Total Days&quot; column (4-day work week).
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
