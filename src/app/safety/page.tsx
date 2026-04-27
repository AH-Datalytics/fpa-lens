"use client";

import { useEffect, useState } from "react";
import {
  HardHat,
  Target,
  CheckCircle,
  Info,
  ShieldAlert,
  FileWarning,
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
import KPICard from "@/components/KPICard";
import { safetyData, kpiMetrics } from "@/data/siteData";

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

const CURRENT_CY = 2026;

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
      noFault: m.noFault,
    }));

  const yearlyTrendData = data.yearlyTotals.map((y) => ({
    year: y.year.toString(),
    accidents: y.accidents,
    totalEvents: y.totalEvents,
    lostTime: y.lostTime,
  }));

  const categorizedTypes = data.eventTypes
    .filter((t) => t.type !== "Not categorized")
    .sort((a, b) => b.count - a.count);

  const availableYears = data.yearlyTotals.map((y) => y.year);
  const ytdAccidents = currentYearData?.accidents ?? safetyData.ytdAtFaultAccidents;
  const onTrack = ytdAccidents <= safetyData.goalMax;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Safety Performance"
          subtitle="Our commitment to a safe workplace"
          source="FPA Safety Officer & Event Logs (2022-2026, calendar year)"
        />

        {/* Headline Metrics */}
        <section className="mb-12">
          <div className="grid md:grid-cols-3 gap-6">
            <KPICard
              label="2026 YTD At-Fault Accidents"
              value={ytdAccidents}
              goal={kpiMetrics.ytdAccidents.goal}
              goalLabel={kpiMetrics.ytdAccidents.goalLabel}
              icon={<HardHat className="h-6 w-6" />}
              source="FPA Safety Officer (calendar year YTD)"
            />
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  2026 Safety Goal
                </span>
                <Target className="h-6 w-6 text-[#21355a]" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{safetyData.cy26Goal}</p>
            </div>
            <div className={`rounded-xl border p-6 ${onTrack ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className={`h-8 w-8 ${onTrack ? "text-green-600" : "text-amber-600"}`} />
                <span className={`text-lg font-bold ${onTrack ? "text-green-800" : "text-amber-800"}`}>
                  {onTrack ? "On Track" : "Watch"}
                </span>
              </div>
              <p className={`text-sm ${onTrack ? "text-green-700" : "text-amber-700"}`}>
                {ytdAccidents} at-fault accident{ytdAccidents !== 1 ? "s" : ""} YTD vs goal of {"\u2264"}{safetyData.goalMax}
              </p>
              <p className={`text-xs mt-1 ${onTrack ? "text-green-600" : "text-amber-600"}`}>
                {currentYearData?.lostTime ?? 0} lost-time event{(currentYearData?.lostTime ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </section>

        {/* Definitions */}
        <section className="mb-12">
          <SectionSubheader title="Definitions" />
          <div className="grid md:grid-cols-2 gap-6 mb-4">
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
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 leading-relaxed">
                <span className="font-semibold text-gray-700">At-fault vs. no-fault</span>{" "}
                is a separate qualifier that applies to either category. An accident or
                incident is no-fault when the FPA employee was not the cause (for example,
                struck by another driver). All events are tracked for visibility, but the
                headline performance metric and the year-over-year accident chart count
                only at-fault accidents, consistent with industry practice for evaluating
                preventable safety performance.
              </p>
            </div>
          </div>
        </section>

        {/* Multi-Year Trend */}
        <section className="mb-12">
          <SectionSubheader title="Multi-Year Safety Trends" />
          <div className="grid lg:grid-cols-2 gap-6">
            <DataCard title="At-Fault Accidents by Year" source="FPA Event Logs (calendar year)">
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
                      name="At-Fault Accidents"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                OSHA-recordable accidents where the FPA employee was at fault. Incidents
                and no-fault events are tracked separately and are not counted here, per
                the Safety Officer&apos;s recommendation for fair year-over-year reporting.
              </p>
            </DataCard>
            <DataCard
              title={
                <>
                  Total Events &amp;{" "}
                  <span className="relative cursor-default border-b border-dashed border-gray-400 group">
                    Lost Time Events
                    <span className="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 rounded-lg bg-gray-800 text-white text-xs font-normal p-3 leading-relaxed shadow-lg z-50">
                      Any accident or incident where the injury or illness causes the employee to miss one or more subsequent workdays.
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
                2026 data is calendar year-to-date.
              </p>
            </DataCard>
          </div>

          <div className="mt-6">
            <DataCard
              title="Annual Event Breakdown"
              source="FPA Event Logs (calendar year)"
              note="Includes all classifications (Accidents, Incidents, No-Fault) for transparency. The headline Accidents-by-Year chart above counts only at-fault OSHA-recordable accidents per the Safety Officer's framework. N/A events are excluded everywhere."
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 font-semibold text-gray-700">Year</th>
                      <th className="text-center py-3 font-semibold text-gray-700">Total Events</th>
                      <th className="text-center py-3 font-semibold text-gray-700">At-Fault Accidents</th>
                      <th className="text-center py-3 font-semibold text-gray-700">At-Fault Incidents</th>
                      <th className="text-center py-3 font-semibold text-gray-700">No-Fault</th>
                      <th className="text-center py-3 font-semibold text-gray-700">
                        <span className="relative cursor-default border-b border-dashed border-gray-400 group">
                          Lost Time
                          <span className="invisible group-hover:visible absolute right-0 top-full mt-2 w-64 rounded-lg bg-gray-800 text-white text-xs font-normal p-3 leading-relaxed shadow-lg z-50">
                            Any accident or incident where the injury or illness causes the employee to miss one or more subsequent workdays.
                          </span>
                        </span>
                      </th>
                      <th className="text-center py-3 font-semibold text-gray-700">Injuries</th>
                      <th className="text-center py-3 font-semibold text-gray-700">FPA Damage</th>
                      <th className="text-center py-3 font-semibold text-gray-700">Private Damage</th>
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
                        <td className="py-3 text-center text-[#21355a] font-semibold">{y.totalEvents}</td>
                        <td className="py-3 text-center font-semibold text-red-800">{y.accidents}</td>
                        <td className="py-3 text-center text-orange-700">{y.incidents}</td>
                        <td className="py-3 text-center text-gray-400">{y.noFault}</td>
                        <td className="py-3 text-center text-gray-600">{y.lostTime}</td>
                        <td className="py-3 text-center text-gray-600">{y.injuries}</td>
                        <td className="py-3 text-center text-gray-600">{y.propertyDamageFpa}</td>
                        <td className="py-3 text-center text-gray-600">{y.propertyDamagePrivate}</td>
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
                    name="At-Fault Accidents"
                  />
                  <Bar
                    dataKey="incidents"
                    stackId="stack"
                    fill="#fb923c"
                    name="At-Fault Incidents"
                  />
                  <Bar
                    dataKey="noFault"
                    stackId="stack"
                    fill="#d1d5db"
                    name="No-Fault"
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
                    <Bar dataKey="accidents" stackId="stack" fill="#991b1b" name="At-Fault Accidents" />
                    <Bar dataKey="incidents" stackId="stack" fill="#fb923c" name="At-Fault Incidents" />
                    <Bar dataKey="noFault" stackId="stack" fill="#d1d5db" name="No-Fault" radius={[0, 4, 4, 0]} />
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
                  Source data: FPA Event Logs 2022-2026, reclassified by the Safety Officer
                  in April 2026. Each event is tagged Accident (at-fault, OSHA-recordable),
                  Incident (at-fault, not recordable), or No-Fault. A small number of
                  events flagged N/A by the Safety Officer (reporting errors and
                  duplicates) are excluded from all metrics.
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
