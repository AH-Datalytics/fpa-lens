"use client";

import Link from "next/link";
import {
  Shield,
  Droplets,
  Layers,
  Fence,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Bell,
  MessageSquare,
  ExternalLink,
  Sprout,
  ClipboardCheck,
  Ship,
  CalendarDays,
  Wrench,
  Scissors,
  ArrowRight,
} from "lucide-react";
import { SectionSubheader } from "@/components/SectionHeader";
import StatusBadge from "@/components/StatusBadge";
import SystemMap from "@/components/SystemMap";
import {
  infrastructureAssets,
  systemReadiness,
  readinessMetrics,
} from "@/data/siteData";
import { grassCuttingData } from "@/data/grassCutting";

const smsKeywords = [
  {
    keyword: "FLOODGATE",
    description: "Floodgate operations and maintenance affecting traffic",
  },
  {
    keyword: "LAKESHOREDRIVE",
    description: "Temporary closures or flooded areas",
  },
  {
    keyword: "RIVER",
    description: "Mississippi River levels during flood operations",
  },
  {
    keyword: "HIGHTIDE",
    description: "Gate operations due to high tides",
  },
];

type StatusColor = "GREEN" | "AMBER" | "RED" | "NEUTRAL";

function statusFromRatio(ratio: number): StatusColor {
  if (ratio >= 90) return "GREEN";
  if (ratio >= 80) return "AMBER";
  return "RED";
}

function statusStyles(color: StatusColor) {
  switch (color) {
    case "GREEN":
      return { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500", label: "text-green-800" };
    case "AMBER":
      return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", label: "text-amber-800" };
    case "RED":
      return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", label: "text-red-800" };
    case "NEUTRAL":
      return { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400", label: "text-gray-800" };
  }
}

/**
 * Straight-line expected progress from a monthly rate, clamped to [0, target].
 * monthsElapsed is computed from periodStart to the data-as-of date so the
 * expectation reflects what should have been done by the reporting date, not
 * necessarily today.
 */
function expectedFromRate(
  monthlyRate: number,
  periodStart: Date,
  asOf: Date,
  target?: number,
): number {
  const ms = (asOf.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
  const exp = Math.max(0, monthlyRate * ms);
  return target !== undefined ? Math.min(exp, target) : exp;
}

function ReadinessCard({
  title,
  description,
  mandate,
  period,
  icon: Icon,
  actual,
  expected,
  unit,
  status,
  source,
  note,
  big,
  hideStatusBorder,
  cta,
}: {
  title: string;
  description?: string;
  mandate: string;
  period?: string;
  icon: React.ComponentType<{ className?: string }>;
  actual: string;
  expected?: string;
  unit?: string;
  status: StatusColor;
  source: string;
  note?: string;
  big: string;
  hideStatusBorder?: boolean;
  cta?: string;
}) {
  const s = statusStyles(status);
  const outerBorder = hideStatusBorder ? "border-transparent" : s.border;
  return (
    <div className={`bg-white rounded-xl shadow-md border ${outerBorder} overflow-hidden h-full flex flex-col`}>
      <div className={`${s.bg} px-5 py-3 border-b ${s.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${s.text}`} />
          <h3 className="font-semibold text-[#21355a] text-sm leading-tight">{title}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.label}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {status === "NEUTRAL" ? "Not Active" : status}
        </span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        {description && (
          <p className="text-xs text-gray-600 leading-snug mb-3">{description}</p>
        )}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold text-[#21355a]">{big}</span>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Actual: {actual}</div>
          {expected && <div>Expected: {expected}</div>}
          {period && (
            <div className="flex items-center gap-1 text-gray-500">
              <CalendarDays className="h-3 w-3" />
              {period}
            </div>
          )}
          <div className="text-gray-500">Mandate: {mandate}</div>
          {note && <div className="text-gray-500 italic pt-1">{note}</div>}
        </div>
        <p className="text-[10px] text-gray-400 mt-3">Source: {source}</p>
        {cta && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-1 text-xs font-medium text-[#21355a]">
            {cta}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function OurSystemPage() {
  const asOf = new Date(readinessMetrics.dataAsOf + "T00:00:00");
  const today = new Date();

  // Hurricane gates
  const hg = readinessMetrics.hurricaneGateInspections;
  const hgExpected = expectedFromRate(hg.monthlyRate, new Date(hg.periodStart + "T00:00:00"), asOf, hg.total);
  const hgRatio = hgExpected > 0 ? (hg.completed / hgExpected) * 100 : 100;
  const hgStatus = statusFromRatio(hgRatio);

  // River gates: in-season Oct 1 to Dec 31. Outside the window, the card
  // reflects the previous cycle's completion (so today, April, reads 100%
  // GREEN since the Oct-Dec 2025 cycle was completed).
  const rg = readinessMetrics.riverGateInspections;
  const rgStart = new Date(rg.periodStart + "T00:00:00");
  const rgEnd = new Date(rg.periodEnd + "T00:00:00");
  const rgInSeason = today >= rgStart && today <= rgEnd;
  const rgPriorCycleComplete = !rgInSeason && rg.lastCycleCompleted === true;
  const rgExpected = rgInSeason
    ? expectedFromRate(rg.monthlyRate, rgStart, asOf, rg.total)
    : 0;
  const rgRatio = rgExpected > 0 ? (rg.completed / rgExpected) * 100 : 100;
  const rgStatus: StatusColor = rgInSeason
    ? statusFromRatio(rgRatio)
    : rgPriorCycleComplete
      ? "GREEN"
      : "NEUTRAL";

  // Valve exercises (quarterly — use SITREP percent complete directly)
  const ve = readinessMetrics.valveExercises;
  const veStatus = statusFromRatio(ve.percentComplete);

  // Grass cutting cycle progress. Cycle 1 (initial cut on the new
  // plan) is complete across all 6 OLD zones; Cycle 2 not yet wired.
  const gcCompleted = grassCuttingData.zones.length;
  const gcTotal = grassCuttingData.zones.length;
  const gcStatus: StatusColor = "GREEN";

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#21355a]">Infrastructure</h1>
            <p className="mt-2 text-lg text-gray-600">
              Learn about the flood protection infrastructure that keeps Greater New Orleans safe
            </p>
          </div>
          <Link
            href="/infrastructure/turf-maintenance"
            className="group inline-flex items-center gap-2 px-5 py-3 bg-[#21355a] hover:bg-[#2c4470] text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap self-start"
          >
            <Scissors className="h-4 w-4" />
            Turf Maintenance
            <ArrowRight className="h-4 w-4 text-[#65bc7b] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Overview */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-[#65bc7b]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-[#65bc7b]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#21355a] mb-2">Overview</h2>
                <p className="text-gray-600 leading-relaxed">
                  The Southeast Louisiana Flood Protection Authority &ndash; East (SLFPA-E) manages flood
                  protection infrastructure across the Greater New Orleans area, including the East Bank
                  of Orleans and Jefferson Parishes, and St. Bernard Parish. Our system includes levees,
                  floodgates, pump stations, and complex structures that work together to protect our
                  community from flooding caused by hurricanes, tropical storms, and other weather events.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* System Map */}
        <section className="mb-12">
          <SectionSubheader title="System Map" />
          <p className="text-gray-600 mb-4">
            Interactive map showing levee alignments, floodgates, pump stations, and complex structures
            across the SLFPA-E flood protection system. Click on features for more information.
          </p>
          <SystemMap />
          <p className="text-xs text-gray-400 mt-2">
            Source: SLFPA-E GIS Data (Centerline and Structures Shapefiles)
          </p>
        </section>

        {/* System at a Glance */}
        <section className="mb-12">
          <SectionSubheader title="System at a Glance" />
          <p className="text-sm text-gray-500 mb-4">
            Components of the flood protection system, with counts by district.
          </p>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#21355a] text-white">
                    <th className="text-left px-5 py-3 font-semibold">Infrastructure Component</th>
                    <th className="text-center px-5 py-3 font-semibold">EJLD</th>
                    <th className="text-center px-5 py-3 font-semibold">OLD</th>
                    <th className="text-center px-5 py-3 font-semibold">LBBLD</th>
                    <th className="text-center px-5 py-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3 font-medium text-[#21355a] flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#65bc7b]" />
                      Levee/Floodwall (miles)
                    </td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.leveeFloodwall.byDistrict.EJLD}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.leveeFloodwall.byDistrict.OLD}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.leveeFloodwall.byDistrict.LBBLD}</td>
                    <td className="text-center px-5 py-3 font-bold text-[#21355a]">{infrastructureAssets.leveeFloodwall.miles}</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/40">
                    <td className="px-5 py-3 font-medium text-[#21355a] flex items-center gap-2">
                      <Sprout className="h-4 w-4 text-[#65bc7b]" />
                      Levee Turf Maintenance Area (acres)
                    </td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.turfMaintenance.byDistrict.EJLD.toLocaleString()}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.turfMaintenance.byDistrict.OLD.toLocaleString()}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.turfMaintenance.byDistrict.LBBLD.toLocaleString()}</td>
                    <td className="text-center px-5 py-3 font-bold text-[#21355a]">{infrastructureAssets.turfMaintenance.acres.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3 font-medium text-[#21355a] flex items-center gap-2">
                      <Fence className="h-4 w-4 text-[#65bc7b]" />
                      Flood Gates (land-based)
                    </td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.landFloodgates.byDistrict.EJLD}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.landFloodgates.byDistrict.OLD}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.landFloodgates.byDistrict.LBBLD}</td>
                    <td className="text-center px-5 py-3 font-bold text-[#21355a]">{infrastructureAssets.landFloodgates.total}</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/40">
                    <td className="px-5 py-3 font-medium text-[#21355a] flex items-center gap-2">
                      <Ship className="h-4 w-4 text-[#65bc7b]" />
                      Navigable Floodgates
                    </td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.navigableFloodgates.byDistrict.EJLD}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.navigableFloodgates.byDistrict.OLD}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.navigableFloodgates.byDistrict.LBBLD}</td>
                    <td className="text-center px-5 py-3 font-bold text-[#21355a]">{infrastructureAssets.navigableFloodgates.total}</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-medium text-[#21355a] flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-[#65bc7b]" />
                      Permanent Canal Closures and Pumps
                    </td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.permanentCanalClosures.byDistrict.EJLD}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.permanentCanalClosures.byDistrict.OLD}</td>
                    <td className="text-center px-5 py-3 text-gray-700">{infrastructureAssets.permanentCanalClosures.byDistrict.LBBLD}</td>
                    <td className="text-center px-5 py-3 font-bold text-[#21355a]">{infrastructureAssets.permanentCanalClosures.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-[#65bc7b] text-white text-center px-5 py-3 text-sm italic">
              &ldquo;A world-class system, built to protect and maintained to perform.&rdquo;
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Source: Regional Director, Apr 2026
          </p>
        </section>

        {/* Infrastructure Readiness */}
        <section id="infrastructure-readiness" className="mb-12 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <SectionSubheader title="Infrastructure Readiness" className="mb-0" />
            <div className="flex items-center gap-3">
              <StatusBadge status={systemReadiness.overallStatus} size="md" />
              <span className="text-sm text-gray-500">Overall system status</span>
            </div>
          </div>

          {/* Status definitions */}
          <div className="grid md:grid-cols-3 gap-3 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-green-800">GREEN &middot; 90%+</div>
                <div className="text-green-700">At or ahead of expected progress</div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-amber-800">AMBER &middot; 80-90%</div>
                <div className="text-amber-700">Slightly behind, monitor closely</div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-red-800">RED &middot; &lt;80%</div>
                <div className="text-red-700">Significantly behind expected progress</div>
              </div>
            </div>
          </div>

          {/* Option B: two subheadings */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Inspections</p>
              <div className="grid md:grid-cols-3 gap-4">
                <ReadinessCard
                  title="Hurricane Floodgate Inspections"
                  mandate={hg.mandate}
                  period="Annual &middot; Jan 1 to May 31"
                  icon={Shield}
                  big={`${hg.percentComplete}%`}
                  actual={`${hg.completed} of ${hg.total} gates`}
                  expected={`${Math.round(hgExpected)} gates (${Math.round((hgExpected / hg.total) * 100)}%) by report date`}
                  status={hgStatus}
                  source={hg.source}
                />
                <ReadinessCard
                  title="River Floodgate Inspections"
                  description={`Annual federal inspection of all ${rg.total} river floodgates, conducted October 1 through December 31 each year. Outside the window, the card reflects whether the previous cycle was completed.`}
                  mandate={rg.mandate}
                  period="Annual &middot; Oct 1 to Dec 31"
                  icon={Shield}
                  big={
                    rgInSeason
                      ? `${rg.percentComplete}%`
                      : rgPriorCycleComplete
                        ? "100%"
                        : "Upcoming"
                  }
                  actual={
                    rgInSeason
                      ? `${rg.completed} of ${rg.total} gates`
                      : rgPriorCycleComplete
                        ? `All ${rg.total} gates inspected last cycle (${rg.lastCycleLabel})`
                        : `${rg.completed} of ${rg.total} gates`
                  }
                  expected={
                    rgInSeason
                      ? `${Math.round(rgExpected)} gates by report date`
                      : rgPriorCycleComplete
                        ? "Next cycle begins Oct 1"
                        : undefined
                  }
                  status={rgStatus}
                  source={rg.source}
                />
                <ReadinessCard
                  title="Quarterly Valve Exercises"
                  mandate={ve.mandate}
                  period="Quarterly &middot; Ongoing"
                  icon={Wrench}
                  big={`${ve.percentComplete}%`}
                  actual={ve.currentQuarterStatus}
                  status={veStatus}
                  source={ve.source}
                />
              </div>
              <Link
                href="/engineering"
                className="group mt-3 flex items-center justify-between gap-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-5 py-3 text-sm text-gray-500 hover:border-[#21355a]/40 hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-gray-400 group-hover:text-[#21355a] transition-colors" />
                  <span>
                    <span className="font-medium text-gray-700">CPRA Quarterly</span> and <span className="font-medium text-gray-700">USACE Semi-Annual</span> inspection status are on the{" "}
                    <span className="text-[#21355a] font-medium">Engineering</span> page.
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#21355a] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Turf Maintenance</p>
              <div className="max-w-sm">
                <Link
                  href="/infrastructure/turf-maintenance"
                  className="block h-full rounded-xl transition-shadow hover:shadow-lg"
                  aria-label="Open Turf Maintenance page for zone-by-zone progress"
                >
                  <ReadinessCard
                    title="Monthly Turf Maintenance"
                    description="Routine internal levee turf maintenance, performed twice per month on a rolling six-zone cycle."
                    mandate="Internal O&amp;M schedule (twice per month)"
                    period={`${grassCuttingData.oldCycle1.label} complete \u00B7 ${grassCuttingData.oldCycle1.workingDays} working days`}
                    icon={Sprout}
                    big={`${gcCompleted} / ${gcTotal}`}
                    unit="zones complete"
                    actual={`All ${gcTotal} OLD zones cut in Cycle 1`}
                    expected="Awaiting Cycle 2 schedule"
                    status={gcStatus}
                    source={grassCuttingData.source}
                    cta="View full page"
                  />
                </Link>
              </div>
            </div>
          </div>

        </section>

        {/* Stay Informed */}
        <section className="mb-12">
          <SectionSubheader title="Stay Informed" />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="h-5 w-5 text-[#21355a]" />
                  <h3 className="text-lg font-bold text-[#21355a]">Real-Time Alerts</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Get notified about floodgate operations, road closures, river levels, and high tide
                  events. Operations issues Rave alerts for maintenance work and any activity that may
                  affect travel through structures.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {smsKeywords.map((item) => (
                    <span
                      key={item.keyword}
                      className="bg-gray-100 text-[#21355a] rounded px-3 py-1 text-sm font-mono"
                      title={item.description}
                    >
                      {item.keyword}
                    </span>
                  ))}
                </div>
                <p className="text-gray-500 text-xs">
                  Text any keyword to <strong className="text-[#21355a]">77295</strong> or <strong className="text-[#21355a]">333111</strong>
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href="https://www.getrave.com/login/floodauthority"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-gray-200 hover:bg-gray-50 transition-colors px-4 py-2 rounded-lg text-sm font-medium text-[#21355a]"
                >
                  <MessageSquare className="h-4 w-4" />
                  Sign Up for Alerts
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
                <a
                  href="https://www.floodauthority.org/news/public-alerts/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-gray-200 hover:bg-gray-50 transition-colors px-4 py-2 rounded-lg text-sm font-medium text-[#21355a]"
                >
                  <Bell className="h-4 w-4" />
                  View Active Alerts
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
              </div>
            </div>
          </div>
        </section>


      </div>
    </div>
  );
}
