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
  ReferenceLine,
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
  lostTime: number;
  propertyDamage: number;
}

interface MonthlyDatum {
  year: number;
  month: number;
  accidents: number;
  incidents: number;
}

interface EventType {
  type: string;
  count: number;
  accidents: number;
  incidents: number;
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

// Custom shape for incidents bar in stacked chart: only round right edge when no accidents
function IncidentBarShape(props: Record<string, unknown>) {
  const { x, y, width, height, payload } = props as {
    x: number; y: number; width: number; height: number;
    payload: { accidents: number };
  };
  if (!width || width <= 0) return null;
  const hasAccidents = payload?.accidents > 0;
  if (hasAccidents) {
    return <rect x={x} y={y} width={width} height={height} fill="#60a5fa" />;
  }
  const r = 4;
  const d = `M${x},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height - r} Q${x + width},${y + height} ${x + width - r},${y + height} L${x},${y + height} Z`;
  return <path d={d} fill="#60a5fa" />;
}

export default function SafetyPage() {
  const [data, setData] = useState<SafetyEvents | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

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

  // Current year stats
  const currentYearData = data.yearlyTotals.find((y) => y.year === 2026);

  // Monthly data for selected year
  const monthlyForYear = data.monthlyData
    .filter((m) => m.year === selectedYear)
    .map((m) => ({
      month: MONTH_NAMES[m.month - 1],
      monthNum: m.month,
      accidents: m.accidents,
      incidents: m.incidents,
      total: m.accidents + m.incidents,
    }));

  // Multi-year trend data
  const yearlyTrendData = data.yearlyTotals.map((y) => ({
    year: y.year.toString(),
    accidents: y.accidents,
    incidents: y.incidents,
    totalEvents: y.totalEvents,
    lostTime: y.lostTime,
  }));

  // Event types sorted by count (exclude "Not categorized")
  const categorizedTypes = data.eventTypes
    .filter((t) => t.type !== "Not categorized")
    .sort((a, b) => b.count - a.count);

  const availableYears = data.yearlyTotals.map((y) => y.year);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Safety Performance"
          subtitle="Our commitment to a safe workplace"
          source="FPA Event Logs (2022-2026)"
        />

        {/* Key Metrics */}
        <section className="mb-12">
          <div className="grid md:grid-cols-3 gap-6">
            <KPICard
              label="FY26 YTD Accidents"
              value={currentYearData?.accidents ?? kpiMetrics.ytdAccidents.value}
              goal={kpiMetrics.ytdAccidents.goal}
              goalLabel={kpiMetrics.ytdAccidents.goalLabel}
              icon={<HardHat className="h-6 w-6" />}
              source="FPA Event Log 2026"
            />
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  FY26 Safety Goal
                </span>
                <Target className="h-6 w-6 text-[#21355a]" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{safetyData.fy26Goal}</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <span className="text-lg font-bold text-green-800">On Track</span>
              </div>
              <p className="text-sm text-green-700">
                {currentYearData?.accidents ?? safetyData.ytdAccidents} accident{(currentYearData?.accidents ?? safetyData.ytdAccidents) !== 1 ? "s" : ""} YTD vs goal of {"\u2264"}{safetyData.goalMax}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {currentYearData?.lostTime ?? 0} lost-time events
              </p>
            </div>
          </div>
        </section>

        {/* Definitions */}
        <section className="mb-12">
          <SectionSubheader title="Definitions" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-6">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">Accident</h4>
                  <p className="text-sm text-orange-700 leading-relaxed">
                    An unplanned work-related event that results in injury, illness, or property
                    damage and meets OSHA&apos;s recordability criteria (for example, medical treatment
                    beyond first aid, lost time, or restricted duty).
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <div className="flex items-start gap-3">
                <FileWarning className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Incident</h4>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Any unplanned or undesired work-related event that disrupts operations
                    or had the potential to cause harm but did not result in an OSHA-recordable case
                    (for example, near-miss, first-aid-only, or minor property damage).
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
            <DataCard title="Accidents by Year" source="FPA Event Logs">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="accidents"
                      fill="#fb923c"
                      name="Accidents (OSHA Recordable)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                OSHA-recordable accidents have decreased significantly since 2022, reflecting improved safety practices.
              </p>
            </DataCard>
            <DataCard title={<>Total Events & <span className="relative cursor-default border-b border-dashed border-gray-400 group">Lost Time Events<span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-lg bg-gray-800 text-white text-xs font-normal p-3 leading-relaxed shadow-lg z-50">Any accident or incident where the injury or illness causes the employee to miss one or more subsequent workdays.</span></span></>} source="FPA Event Logs">
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
                      stroke="#21355a"
                      strokeWidth={2}
                      name="Total Events"
                      dot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="lostTime"
                      stroke="#92400e"
                      strokeWidth={2}
                      name="Lost Time Events"
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                2026 data is year-to-date.
              </p>
            </DataCard>
          </div>

          {/* Year-over-year summary table */}
          <div className="mt-6">
            <DataCard title="Year-over-Year Summary" source="FPA Event Logs">
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
                          Lost Time Events
                          <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-lg bg-gray-800 text-white text-xs font-normal p-3 leading-relaxed shadow-lg z-50">
                            Any accident or incident where the injury or illness causes the employee to miss one or more subsequent workdays.
                          </span>
                        </span>
                      </th>
                      <th className="text-center py-3 font-semibold text-gray-700">Property Damage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.yearlyTotals.map((y) => (
                      <tr key={y.year} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-gray-700">
                          {y.year}
                          {y.year === 2026 && (
                            <span className="text-xs text-gray-400 ml-1">(YTD)</span>
                          )}
                        </td>
                        <td className="py-3 text-center text-[#21355a] font-semibold">{y.totalEvents}</td>
                        <td className="py-3 text-center">
                          <span className="font-semibold text-orange-400">
                            {y.accidents}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="font-semibold text-blue-400">
                            {y.incidents}
                          </span>
                        </td>
                        <td className="py-3 text-center text-gray-600">{y.lostTime}</td>
                        <td className="py-3 text-center text-gray-600">{y.propertyDamage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataCard>
          </div>
        </section>

        {/* Monthly Breakdown with Year Selector */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <SectionSubheader title="Monthly Breakdown" className="mb-0" />
            <div className="flex gap-1">
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
            title={`Accidents & Incidents by Month (${selectedYear}${selectedYear === 2026 ? " YTD" : ""})`}
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
                    fill="#fb923c"
                    name="Accidents"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="incidents"
                    fill="#60a5fa"
                    name="Incidents"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DataCard>
        </section>

        {/* Event Types (2025-2026 only) */}
        {categorizedTypes.length > 0 && (
          <section className="mb-12">
            <SectionSubheader title="Event Types (2025-2026)" />
            <DataCard title="Events by Category" source="FPA Event Logs (2025-2026)">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categorizedTypes}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="type" width={130} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="incidents"
                      fill="#60a5fa"
                      name="Incidents"
                      stackId="stack"
                      shape={<IncidentBarShape />}
                    />
                    <Bar
                      dataKey="accidents"
                      fill="#fb923c"
                      name="Accidents"
                      stackId="stack"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Event type categorization began in 2025. Earlier years are not included.
              </p>
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
                  All safety event data is anonymized. Individual event details (names, specific locations,
                  equipment identifiers) are not published to protect employee privacy.
                </p>
                <p>
                  Source data: FPA Event Logs 2022-2026. An &quot;accident&quot; is an OSHA-recordable event;
                  all other reported events are classified as &quot;incidents.&quot; &quot;Lost time events&quot; are accidents or incidents where employees missed subsequent workdays.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
