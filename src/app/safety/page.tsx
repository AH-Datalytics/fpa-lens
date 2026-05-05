"use client";

import { useEffect, useState } from "react";
import {
  Info,
  ShieldAlert,
  FileWarning,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import { safetyData } from "@/data/siteData";

interface YearlyTotal {
  year: number;
  totalEvents: number;
  accidents: number;
  incidents: number;
  noFault: number;
  lostTime: number;
  injuries: number;
  propertyDamageFpa: number;
  propertyDamagePrivate: number;
}

interface MonthlyDatum {
  year: number;
  month: number;
  accidents: number;
  incidents: number;
  noFault: number;
}

interface EventType {
  type: string;
  count: number;
  accidents: number;
  incidents: number;
  noFault: number;
}

interface SafetyEvents {
  yearlyTotals: YearlyTotal[];
  monthlyData: MonthlyDatum[];
  eventTypes: EventType[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_CY = 2026;
const ANNUAL_GOAL = safetyData.goalMax;
const MONTHLY_GOAL_PACE = ANNUAL_GOAL / 12;

export default function SafetyPage() {
  const [data, setData] = useState<SafetyEvents | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_CY);

  useEffect(() => {
    fetch("/data/safety-events.json")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  if (!data) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-96 flex items-center justify-center text-gray-500">
            Loading safety data...
          </div>
        </div>
      </div>
    );
  }

  const currentYearData = data.yearlyTotals.find((y) => y.year === CURRENT_CY);

  const monthlyForYear = data.monthlyData
    .filter((m) => m.year === selectedYear)
    .map((m) => ({
      month: MONTH_NAMES[m.month - 1],
      monthNum: m.month,
      accidents: m.accidents,
      incidents: m.incidents,
    }));

  // Total Events excludes no-fault events from the public view per the
  // simplified accidents/incidents framing.
  const yearlyTrendData = data.yearlyTotals.map((y) => ({
    year: y.year.toString(),
    accidents: y.accidents,
    totalEvents: y.accidents + y.incidents,
    lostTime: y.lostTime,
  }));

  const categorizedTypes = data.eventTypes
    .filter((t) => t.type !== "Not categorized")
    .map((t) => ({
      type: t.type,
      count: t.accidents + t.incidents,
      accidents: t.accidents,
      incidents: t.incidents,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const availableYears = data.yearlyTotals.map((y) => y.year);
  const ytdAccidents = currentYearData?.accidents ?? safetyData.ytdAccidents;

  // Pace logic: monthsElapsed = highest month with reported data this CY.
  // Goal pace is 0.5 accidents/month (6/year). Above that pace is bad → red.
  const monthsElapsed = Math.max(
    1,
    ...data.monthlyData.filter((m) => m.year === CURRENT_CY).map((m) => m.month),
  );
  const expectedAtPace = monthsElapsed * MONTHLY_GOAL_PACE;
  const overPace = ytdAccidents > expectedAtPace;
  const monthLabel = MONTH_NAMES[monthsElapsed - 1];
  const currentRate = ytdAccidents / monthsElapsed;
  const projected = currentRate * 12;

  const headerBg = overPace ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100";
  const cardBorder = overPace ? "border-red-200" : "border-green-200";
  const badgeBg = overPace ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
  const fillColor = overPace ? "bg-red-500" : "bg-green-500";
  const StatusIcon = overPace ? AlertTriangle : CheckCircle;
  const statusLabel = overPace ? "Over Pace" : "On Pace";

  // Bar widths (clamp to 100 on the visual)
  const actualPct = Math.min(100, (ytdAccidents / ANNUAL_GOAL) * 100);
  const expectedPct = Math.min(100, (expectedAtPace / ANNUAL_GOAL) * 100);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Safety Performance"
          subtitle="Our commitment to a safe workplace"
          source="FPA Safety Officer & Event Logs (2022-2026, calendar year)"
        />

        {/* Headline Pace Card */}
        <section className="mb-12">
          <div className={`bg-white rounded-2xl shadow-md border-2 ${cardBorder} overflow-hidden`}>
            <div className={`${headerBg} px-6 py-3 border-b flex items-center justify-between`}>
              <h3 className="font-semibold text-[#21355a]">
                Accidents Through {MONTH_NAMES_FULL[monthsElapsed - 1]} {CURRENT_CY}
              </h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${badgeBg}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusLabel}
              </span>
            </div>
            <div className="p-6 grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Accidents YTD
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-[#21355a] leading-none">{ytdAccidents}</span>
                  <span className="text-sm text-gray-500">of {ANNUAL_GOAL} annual goal</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Current pace
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#21355a]">{currentRate.toFixed(2)}</span>
                  <span className="text-sm text-gray-500">/ month</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Goal pace: {MONTHLY_GOAL_PACE.toFixed(2)} / month
                </p>
                <p className="text-xs text-gray-500">
                  Projects to ~{projected.toFixed(1)} for the year
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  YTD vs goal pace
                </p>
                <div className="relative h-3 bg-gray-100 rounded overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${fillColor} transition-all`}
                    style={{ width: `${actualPct}%` }}
                  />
                  <div
                    className="absolute -top-1 -bottom-1 w-px bg-gray-900"
                    style={{ left: `${expectedPct}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="relative mt-1.5 h-4 text-[10px]">
                  <span className="absolute left-0 text-gray-400">0</span>
                  <span
                    className="absolute -translate-x-1/2 text-gray-600 whitespace-nowrap"
                    style={{ left: `${expectedPct}%` }}
                  >
                    {expectedAtPace.toFixed(1)} expected
                  </span>
                  <span className="absolute right-0 text-gray-400">{ANNUAL_GOAL} annual</span>
                </div>
                <p className="text-xs text-gray-600 mt-4 leading-snug">
                  {ytdAccidents} actual vs. {expectedAtPace.toFixed(1)} expected through {monthLabel}.{" "}
                  Goal: {safetyData.cy26Goal}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Definitions */}
        <section className="mb-12">
          <SectionSubheader title="Definitions" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 text-red-800 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-2">Accident</h4>
                  <p className="text-sm text-red-800 leading-relaxed">
                    A work-related event that resulted in an OSHA-recordable injury or
                    illness (medical treatment beyond first aid, lost time, restricted
                    duty, or worse).
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-6">
              <div className="flex items-start gap-3">
                <FileWarning className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">Incident</h4>
                  <p className="text-sm text-orange-700 leading-relaxed">
                    A tracked work-related event that did not meet OSHA-recordable
                    criteria (typically property damage, near-miss, or first-aid-only).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Multi-Year Trend */}
        <section className="mb-12">
          <SectionSubheader title="Multi-Year Safety Trends" />
          <div className="grid lg:grid-cols-2 gap-6">
            <DataCard title="Accidents by Year" source="FPA Event Logs (calendar year)">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="accidents"
                      fill="#991b1b"
                      name="Accidents"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                OSHA-recordable accidents only. Incidents are tracked in the breakdown
                table below.
              </p>
            </DataCard>
            <DataCard
              title={
                <>
                  Total Events &amp;{" "}
                  <span className="relative cursor-default border-b border-dashed border-gray-400 group">
                    Lost Time Events
                    <span className="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 rounded-lg bg-gray-800 text-white text-xs font-normal p-3 leading-relaxed shadow-lg z-50">
                      Any accident or incident where the injury or illness causes the employee to miss one or more subsequent workdays. Lost time is a subset of injuries.
                    </span>
                  </span>
                </>
              }
              source="FPA Event Logs (calendar year)"
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="totalEvents"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      name="Total Events"
                      dot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="lostTime"
                      stroke="#111827"
                      strokeWidth={2}
                      name="Lost Time Events"
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Total Events = Accidents + Incidents. 2026 data is calendar year-to-date.
              </p>
            </DataCard>
          </div>

          <div className="mt-6">
            <DataCard
              title="Annual Event Breakdown"
              source="FPA Event Logs (calendar year)"
              note="OSHA-recordable accidents and tracked incidents. Lost time is a subset of injuries shown for severity context."
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 font-semibold text-gray-700">Year</th>
                      <th className="text-center py-3 font-semibold text-gray-700">Total Events</th>
                      <th className="text-center py-3 font-semibold text-gray-700">Accidents</th>
                      <th className="text-center py-3 font-semibold text-gray-700">Incidents</th>
                      <th className="text-center py-3 font-semibold text-gray-700">
                        <span className="relative cursor-default border-b border-dashed border-gray-400 group">
                          Lost Time
                          <span className="invisible group-hover:visible absolute right-0 top-full mt-2 w-64 rounded-lg bg-gray-800 text-white text-xs font-normal p-3 leading-relaxed shadow-lg z-50">
                            Any accident or incident where the injury or illness causes the employee to miss one or more subsequent workdays. Lost time is a subset of injuries.
                          </span>
                        </span>
                      </th>
                      <th className="text-center py-3 font-semibold text-gray-700">Injuries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.yearlyTotals.map((y) => (
                      <tr key={y.year} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-gray-700">
                          {y.year}
                          {y.year === CURRENT_CY && (
                            <span className="text-xs text-gray-400 ml-1">(YTD)</span>
                          )}
                        </td>
                        <td className="py-3 text-center text-[#21355a] font-semibold">
                          {y.accidents + y.incidents}
                        </td>
                        <td className="py-3 text-center font-semibold text-red-800">{y.accidents}</td>
                        <td className="py-3 text-center text-orange-700">{y.incidents}</td>
                        <td className="py-3 text-center text-gray-600">{y.lostTime}</td>
                        <td className="py-3 text-center text-gray-600">{y.injuries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataCard>
          </div>
        </section>

        {/* Monthly Breakdown */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <SectionSubheader title="Monthly Breakdown" className="mb-0" />
            <div className="flex flex-wrap gap-1">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedYear === year
                      ? "bg-[#21355a] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          <DataCard
            title={`Events by Month (${selectedYear}${selectedYear === CURRENT_CY ? " YTD" : ""})`}
            source="FPA Event Logs"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyForYear}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="accidents"
                    stackId="stack"
                    fill="#991b1b"
                    name="Accidents"
                  />
                  <Bar
                    dataKey="incidents"
                    stackId="stack"
                    fill="#fb923c"
                    name="Incidents"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DataCard>
        </section>

        {/* Event Types */}
        {categorizedTypes.length > 0 && (
          <section className="mb-12">
            <SectionSubheader title="Events by Category" />
            <DataCard title="All recorded years" source="FPA Event Logs">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categorizedTypes}
                    layout="vertical"
                    margin={{ left: 0, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="type" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="accidents" stackId="stack" fill="#991b1b" name="Accidents" />
                    <Bar dataKey="incidents" stackId="stack" fill="#fb923c" name="Incidents" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataCard>
          </section>
        )}

        {/* Data Note */}
        <section>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  All safety event data is anonymized. Individual event details (names,
                  specific locations, equipment identifiers) are not published to protect
                  employee privacy.
                </p>
                <p>
                  Source data: FPA Event Logs 2022-2026, classified by the Safety Officer
                  in April 2026. Each event is tagged Accident (OSHA-recordable) or
                  Incident (not recordable). Events flagged N/A by the Safety Officer
                  (reporting errors and duplicates) are excluded from all metrics.
                </p>
                <p>
                  Reporting period is the calendar year (Jan 1 - Dec 31). 2026 figures are
                  year-to-date through the latest event log entry. Updated event logs are
                  shared by the Safety Officer monthly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
