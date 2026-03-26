"use client";

import { useEffect, useState } from "react";
import {
  Info,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  TrendingDown,
  TrendingUp,
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
} from "recharts";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import VarianceBadge from "@/components/VarianceBadge";
import { financialData, formatCurrency } from "@/data/siteData";

const DISTRICT_COLORS: Record<string, string> = {
  OLD: "#21355a",
  EJLD: "#65bc7b",
  LBBLD: "#60a5fa",
  FPAE: "#fb923c",
};

const ACRONYMS: Record<string, string> = {
  OLD: "Orleans Levee District",
  EJLD: "East Jefferson Levee District",
  LBBLD: "Lake Borgne Basin Levee District",
  FPAE: "Flood Protection Authority East",
  MMCI: "Major Maintenance & Capital Improvements",
  HSDRRS: "Hurricane & Storm Damage Risk Reduction System",
  OPEB: "Other Post-Employment Benefits",
  SLIP: "Stormwater, Levee Improvements & Protection",
  FY26: "Fiscal Year 2026",
  "O&M": "Operations & Maintenance (excludes capital projects)",
};

function HoverDef({ term, className }: { term: string; className?: string }) {
  const definition = ACRONYMS[term];
  if (!definition) return <span className={className}>{term}</span>;
  return (
    <span className={`relative group/def cursor-default border-b border-dashed border-gray-400 ${className || ""}`}>
      {term}
      <span className="invisible group-hover/def:visible absolute left-0 top-full mt-2 w-48 rounded-lg bg-gray-800 text-white text-xs font-normal p-2 leading-relaxed shadow-lg z-50 whitespace-normal text-center pointer-events-none">
        {definition}
      </span>
    </span>
  );
}

/** Render text, replacing known acronyms with hoverable definitions inline. */
function WithAcronyms({ text }: { text: string }) {
  const acronymPattern = new RegExp(`\\b(${Object.keys(ACRONYMS).join("|")})\\b`, "g");
  const parts: (string | { term: string })[] = [];
  let lastIndex = 0;
  let match;
  while ((match = acronymPattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push({ term: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? <span key={i}>{p}</span> : <HoverDef key={i} term={p.term} />
      )}
    </>
  );
}

interface ActualsLineItem {
  name: string;
  ytdActual: number;
  ytdBudget: number;
  variancePct: number | "unbudgeted";
  totalBudget: number;
}

interface ActualsEntity {
  label: string;
  revenue: { categories: ActualsLineItem[]; total: ActualsLineItem };
  expenses: {
    operations: { categories: ActualsLineItem[]; total: ActualsLineItem };
    projects: { categories: ActualsLineItem[]; total: ActualsLineItem };
    grandTotal: ActualsLineItem;
  };
  sourcesUses: ActualsLineItem;
  netChange: ActualsLineItem;
  departments: ActualsLineItem[];
}

interface ActualsData {
  period: string;
  periodLabel: string;
  lastUpdated: string;
  fiscalYear: number;
  entities: Record<string, ActualsEntity>;
}

const ACTUALS_BAR_COLOR = "#3b82f6";
const BUDGET_BAR_COLOR = "#cbd5e1";

type ActualsSortKey = "name" | "ytdBudget" | "ytdActual" | "variancePct" | "totalBudget";

export default function FinancialPage() {
  const [actuals, setActuals] = useState<ActualsData | null>(null);
  const [selectedEntity, setSelectedEntity] = useState("wholeEntity");
  const [catSortKey, setCatSortKey] = useState<ActualsSortKey>("ytdActual");
  const [catSortDir, setCatSortDir] = useState<"asc" | "desc">("desc");
  const [deptSortKey, setDeptSortKey] = useState<ActualsSortKey>("ytdActual");
  const [deptSortDir, setDeptSortDir] = useState<"asc" | "desc">("desc");
  const [chartView, setChartView] = useState<"category" | "district" | "department">("category");
  const [tableView, setTableView] = useState<"category" | "department">("category");

  useEffect(() => {
    fetch("/data/actuals-fy26.json")
      .then((res) => res.json())
      .then((json) => setActuals(json));
  }, []);

  const handleSort = (
    key: ActualsSortKey,
    currentKey: ActualsSortKey,
    currentDir: "asc" | "desc",
    setKey: (k: ActualsSortKey) => void,
    setDir: (d: "asc" | "desc") => void,
  ) => {
    if (currentKey === key) {
      setDir(currentDir === "asc" ? "desc" : "asc");
    } else {
      setKey(key);
      setDir(key === "name" ? "asc" : "desc");
    }
  };

  const sortItems = (items: ActualsLineItem[], sortKey: ActualsSortKey, sortDir: "asc" | "desc") => {
    return [...items].sort((a, b) => {
      const mult = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mult * a.name.localeCompare(b.name);
      const aVal = sortKey === "variancePct"
        ? (a.variancePct === "unbudgeted" ? 999 : a.variancePct as number)
        : a[sortKey];
      const bVal = sortKey === "variancePct"
        ? (b.variancePct === "unbudgeted" ? 999 : b.variancePct as number)
        : b[sortKey];
      return mult * ((aVal as number) - (bVal as number));
    });
  };

  if (!actuals) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-96 flex items-center justify-center text-gray-500">
            Loading financial data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Financial Transparency"
          subtitle="How your tax dollars are invested in flood protection"
          source="FY26 Adopted Budget & Dashboard Reports"
        />

        {/* ================================================================
            BUDGET VS ACTUALS — Lead section
            ================================================================ */}
        {actuals && (() => {
          const we = actuals.entities.wholeEntity;
          const entity = actuals.entities[selectedEntity];

          // Fiscal year progress: July 1 through last updated date
          const fyStart = new Date(2025, 6, 1); // July 1, 2025
          const dataDate = new Date(actuals.lastUpdated + "T00:00:00");
          const fyEnd = new Date(2026, 5, 30); // June 30, 2026
          const fyElapsedPct = Math.min(100, Math.max(0, Math.round(((dataDate.getTime() - fyStart.getTime()) / (fyEnd.getTime() - fyStart.getTime())) * 100)));

          // Revenue: % of annual collected
          const revAnnual = we.revenue.total.totalBudget;
          const revCollectedPct = revAnnual > 0 ? Math.round((we.revenue.total.ytdActual / revAnnual) * 100) : 0;

          // O&M: variance is meaningful
          const omVariance = we.expenses.operations.total.variancePct as number;
          const omAnnual = we.expenses.operations.total.totalBudget;
          const omUsedPct = omAnnual > 0 ? Math.round((we.expenses.operations.total.ytdActual / omAnnual) * 100) : 0;

          // Projects: % of annual utilized
          const projAnnual = we.expenses.projects.total.totalBudget;
          const projUsedPct = projAnnual > 0 ? Math.round((we.expenses.projects.total.ytdActual / projAnnual) * 100) : 0;

          // Net position: actual vs expected
          const netDelta = we.netChange.ytdActual - we.netChange.ytdBudget;
          const netAhead = netDelta > 0;

          // District comparison data
          const districtExpenseData = ["OLD", "EJLD", "LBBLD", "FPAE"]
            .filter((d) => actuals.entities[d])
            .map((d) => ({
              name: d,
              fullName: actuals.entities[d].label,
              omActual: actuals.entities[d].expenses.operations.total.ytdActual,
              omBudget: actuals.entities[d].expenses.operations.total.ytdBudget,
            }));

          // Sort categories (O&M rows only)
          const sortedCats = sortItems(entity.expenses.operations.categories, catSortKey, catSortDir);

          // Sort departments
          const sortedDepts = sortItems(entity.departments, deptSortKey, deptSortDir);

          // Chart data follows table sort order
          const omChartData = sortedCats.map((cat) => ({
            name: cat.name === "Professional Svcs" ? "Professional Services" : cat.name,
            fullName: cat.name,
            actual: cat.ytdActual,
            budget: cat.ytdBudget,
          }));

          const CatSortIcon = ({ col }: { col: ActualsSortKey }) =>
            catSortKey === col
              ? catSortDir === "asc" ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />
              : null;

          const DeptSortIcon = ({ col }: { col: ActualsSortKey }) =>
            deptSortKey === col
              ? deptSortDir === "asc" ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />
              : null;

          return (
            <section className="mb-12">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                <SectionSubheader title="Year-to-Date Spending vs Budget" />
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 self-start sm:self-auto">
                  <CalendarDays className="h-3 w-3" />
                  Data through {new Date(actuals.lastUpdated + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Fiscal year context */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-400">{fyElapsedPct}% of fiscal year elapsed</span>
                <div className="flex-1 h-1 bg-gray-100 rounded-full max-w-32">
                  <div className="h-1 bg-gray-300 rounded-full" style={{ width: `${fyElapsedPct}%` }} />
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Revenue Collected */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Revenue Collected</h4>
                  <p className="text-xl font-bold text-[#21355a] mb-1">
                    {formatCurrency(we.revenue.total.ytdActual)}
                  </p>
                  <p className="text-xs text-gray-400 mb-2">of {formatCurrency(revAnnual)} annual budget</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-blue-400 rounded-full" style={{ width: `${Math.min(revCollectedPct, 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500">{revCollectedPct}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 leading-snug">Tax revenue is seasonal; large payments arrive at billing cycles</p>
                </div>

                {/* O&M Expenses */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">O&M Expenses</h4>
                  <p className="text-xl font-bold text-[#21355a] mb-1">
                    {formatCurrency(we.expenses.operations.total.ytdActual)}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium ${omVariance <= 0 ? "text-green-600" : "text-red-600"}`}>
                      {omVariance <= 0 ? <TrendingDown className="h-3 w-3 inline mr-0.5" /> : <TrendingUp className="h-3 w-3 inline mr-0.5" />}
                      {Math.abs(omVariance).toFixed(1)}% {omVariance <= 0 ? "under" : "over"} YTD budget
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                      <div className={`h-1.5 rounded-full ${omUsedPct > fyElapsedPct ? "bg-amber-400" : "bg-green-400"}`} style={{ width: `${Math.min(omUsedPct, 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500">{omUsedPct}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{omUsedPct}% of annual budget used, {fyElapsedPct}% through fiscal year</p>
                </div>

                {/* Projects */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Projects</h4>
                  <p className="text-xl font-bold text-[#21355a] mb-1">
                    {formatCurrency(we.expenses.projects.total.ytdActual)}
                  </p>
                  <p className="text-xs text-gray-400 mb-2">of {formatCurrency(projAnnual)} annual budget</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-blue-400 rounded-full" style={{ width: `${Math.min(Math.max(projUsedPct, 1), 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500">{projUsedPct}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 leading-snug">Multi-year projects ramp at different rates</p>
                </div>

                {/* Net Position */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Net Position</h4>
                  <p className="text-xl font-bold text-[#21355a] mb-1">
                    {formatCurrency(we.netChange.ytdActual)}
                  </p>
                  <p className="text-xs text-gray-400 mb-2">Budget expected: {formatCurrency(we.netChange.ytdBudget)}</p>
                  <div className="flex items-center gap-1">
                    {netAhead ? <TrendingUp className="h-3.5 w-3.5 text-green-600" /> : <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
                    <span className={`text-xs font-medium ${netAhead ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(Math.abs(netDelta))} {netAhead ? "ahead of" : "behind"} plan
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart + Category Table */}
              <div className="grid lg:grid-cols-2 lg:grid-rows-[auto_1fr_auto] gap-6 mb-6 min-w-0">
                <DataCard
                  subgrid
                  title={
                    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                      <span>Budget vs Actual</span>
                      <div className="flex rounded-md border border-gray-200 overflow-hidden">
                        {(["category", "department", "district"] as const).map((view) => (
                          <button
                            key={view}
                            onClick={() => setChartView(view)}
                            className={`px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium capitalize transition-colors ${
                              chartView === view
                                ? "bg-[#21355a] text-white"
                                : "bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {view}
                          </button>
                        ))}
                      </div>
                    </div>
                  }
                  source={`Dashboard Reports, ${actuals.periodLabel}`}
                  contentClassName="pl-1 pr-2 lg:pl-2 lg:pr-6 pt-6 pb-2"
                >
                  <div className="h-80 lg:h-full lg:min-h-60 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={
                            chartView === "category" ? omChartData
                            : chartView === "district" ? districtExpenseData.map((d) => ({
                                name: d.fullName,
                                fullName: d.fullName,
                                budget: d.omBudget,
                                actual: d.omActual,
                              }))
                            : sortedDepts.map((d) => ({
                                name: d.name === "Information Technology" ? "IT" : d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name,
                                fullName: d.name,
                                actual: d.ytdActual,
                                budget: d.ytdBudget,
                              }))
                          }
                          layout="vertical"
                          margin={{ top: 10, bottom: 10, left: 0, right: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(value, name) => [
                              formatCurrency(Number(value)),
                              name === "budget" ? "YTD Budget" : "YTD Actual",
                            ]}
                            labelFormatter={(label, payload) =>
                              payload?.[0]?.payload?.fullName || label
                            }
                            wrapperStyle={{ zIndex: 50 }}
                          />
                          <Bar dataKey="budget" fill={BUDGET_BAR_COLOR} name="budget" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="actual" fill={ACTUALS_BAR_COLOR} name="actual" radius={[0, 4, 4, 0]} />
                          <Legend formatter={(value) => (value === "budget" ? "YTD Budget" : "YTD Actual")} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
                </DataCard>

                <DataCard
                  subgrid
                  title={
                    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-3">
                        <span>Variance Detail</span>
                        <div className="flex rounded-md border border-gray-200 overflow-hidden">
                          {(["category", "department"] as const).map((view) => (
                            <button
                              key={view}
                              onClick={() => setTableView(view)}
                              className={`px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                                tableView === view
                                  ? "bg-[#21355a] text-white"
                                  : "bg-white text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {view}
                            </button>
                          ))}
                        </div>
                      </div>
                      <select
                        value={selectedEntity}
                        onChange={(e) => setSelectedEntity(e.target.value)}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 font-normal"
                      >
                        <option value="wholeEntity">All Districts</option>
                        <option value="OLD">OLD</option>
                        <option value="EJLD">EJLD</option>
                        <option value="LBBLD">LBBLD</option>
                        <option value="FPAE">FPAE</option>
                      </select>
                    </div>
                  }
                  note="Note: When filtering by district, some categories and departments may not appear because not all expense types and departments exist within every district."
                >
                  <div className="overflow-x-auto">
                    {tableView === "category" ? (
                      <table className="w-full min-w-[600px] lg:min-w-0 text-sm tabular-nums">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th
                              className="text-left py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("name", catSortKey, catSortDir, setCatSortKey, setCatSortDir)}
                            >
                              Category <CatSortIcon col="name" />
                            </th>
                            <th
                              className="text-right py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("ytdBudget", catSortKey, catSortDir, setCatSortKey, setCatSortDir)}
                            >
                              YTD Budget <CatSortIcon col="ytdBudget" />
                            </th>
                            <th
                              className="text-right py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("ytdActual", catSortKey, catSortDir, setCatSortKey, setCatSortDir)}
                            >
                              YTD Actual <CatSortIcon col="ytdActual" />
                            </th>
                            <th
                              className="text-right py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("variancePct", catSortKey, catSortDir, setCatSortKey, setCatSortDir)}
                            >
                              Variance <CatSortIcon col="variancePct" />
                            </th>
                            <th
                              className="text-right py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("totalBudget", catSortKey, catSortDir, setCatSortKey, setCatSortDir)}
                            >
                              Total Budget <CatSortIcon col="totalBudget" />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCats.map((cat) => (
                            <tr key={cat.name} className="border-b border-gray-100">
                              <td className="py-1.5 text-xs text-gray-700">{cat.name === "Professional Svcs" ? "Professional Services" : cat.name}</td>
                              <td className="py-1.5 text-right text-xs text-gray-500">{formatCurrency(cat.ytdBudget)}</td>
                              <td className="py-1.5 text-right text-xs font-medium text-[#21355a]">{formatCurrency(cat.ytdActual)}</td>
                              <td className="py-1.5 text-right">
                                <VarianceBadge variance={cat.variancePct} type="expense" />
                              </td>
                              <td className="py-1.5 text-right text-xs text-gray-400">{formatCurrency(cat.totalBudget)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-gray-300 font-semibold">
                            <td className="py-2 text-xs text-gray-900"><HoverDef term="O&M" /> Total</td>
                            <td className="py-2 text-right text-xs text-gray-600">{formatCurrency(entity.expenses.operations.total.ytdBudget)}</td>
                            <td className="py-2 text-right text-xs text-[#21355a]">{formatCurrency(entity.expenses.operations.total.ytdActual)}</td>
                            <td className="py-2 text-right">
                              <VarianceBadge variance={entity.expenses.operations.total.variancePct} type="expense" size="md" />
                            </td>
                            <td className="py-2 text-right text-xs text-gray-500">{formatCurrency(entity.expenses.operations.total.totalBudget)}</td>
                          </tr>
                          {entity.expenses.projects.total.totalBudget !== 0 || entity.expenses.projects.total.ytdActual !== 0 ? (
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                              <td className="py-1.5 text-xs text-gray-700 italic">Projects</td>
                              <td className="py-1.5 text-right text-xs text-gray-500">{formatCurrency(entity.expenses.projects.total.ytdBudget)}</td>
                              <td className="py-1.5 text-right text-xs font-medium text-[#21355a]">{formatCurrency(entity.expenses.projects.total.ytdActual)}</td>
                              <td className="py-1.5 text-right">
                                <VarianceBadge variance={entity.expenses.projects.total.variancePct} type="expense" />
                              </td>
                              <td className="py-1.5 text-right text-xs text-gray-400">{formatCurrency(entity.expenses.projects.total.totalBudget)}</td>
                            </tr>
                          ) : null}
                          <tr className="border-t border-gray-300 font-bold">
                            <td className="py-2 text-xs text-gray-900">All Expenses</td>
                            <td className="py-2 text-right text-xs text-gray-600">{formatCurrency(entity.expenses.grandTotal.ytdBudget)}</td>
                            <td className="py-2 text-right text-xs text-[#21355a]">{formatCurrency(entity.expenses.grandTotal.ytdActual)}</td>
                            <td className="py-2 text-right">
                              <VarianceBadge variance={entity.expenses.grandTotal.variancePct} type="expense" size="md" />
                            </td>
                            <td className="py-2 text-right text-xs text-gray-500">{formatCurrency(entity.expenses.grandTotal.totalBudget)}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full min-w-[600px] lg:min-w-0 text-sm tabular-nums">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th
                              className="text-left py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("name", deptSortKey, deptSortDir, setDeptSortKey, setDeptSortDir)}
                            >
                              Department <DeptSortIcon col="name" />
                            </th>
                            <th
                              className="text-right py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("ytdBudget", deptSortKey, deptSortDir, setDeptSortKey, setDeptSortDir)}
                            >
                              YTD Budget <DeptSortIcon col="ytdBudget" />
                            </th>
                            <th
                              className="text-right py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("ytdActual", deptSortKey, deptSortDir, setDeptSortKey, setDeptSortDir)}
                            >
                              YTD Actual <DeptSortIcon col="ytdActual" />
                            </th>
                            <th
                              className="text-right py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("variancePct", deptSortKey, deptSortDir, setDeptSortKey, setDeptSortDir)}
                            >
                              Variance <DeptSortIcon col="variancePct" />
                            </th>
                            <th
                              className="text-right py-2 text-xs font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                              onClick={() => handleSort("totalBudget", deptSortKey, deptSortDir, setDeptSortKey, setDeptSortDir)}
                            >
                              Total Budget <DeptSortIcon col="totalBudget" />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedDepts.map((dept) => (
                            <tr key={dept.name} className="border-b border-gray-100">
                              <td className="py-1.5 text-xs text-gray-700">{dept.name}</td>
                              <td className="py-1.5 text-right text-xs text-gray-500">{formatCurrency(dept.ytdBudget)}</td>
                              <td className="py-1.5 text-right text-xs font-medium text-[#21355a]">{formatCurrency(dept.ytdActual)}</td>
                              <td className="py-1.5 text-right">
                                <VarianceBadge variance={dept.variancePct} type="expense" />
                              </td>
                              <td className="py-1.5 text-right text-xs text-gray-400">{formatCurrency(dept.totalBudget)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </DataCard>
              </div>
            </section>
          );
        })()}

        {/* Major Future Projects */}
        <section className="mb-12">
          <SectionSubheader title="Major Future Projects" />
          <DataCard title="Long-Term Capital Requirements" source="Oct 2025 SITREP">
            <div className="overflow-x-auto lg:overflow-visible">
              <table className="w-full min-w-[600px] lg:min-w-0 text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-semibold text-gray-700">Project</th>
                    <th className="text-right py-3 font-semibold text-gray-700">
                      Estimated Cost
                    </th>
                    <th className="text-left py-3 font-semibold text-gray-700 pl-6">
                      Timeframe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {financialData.majorFutureProjects.map((project) => (
                    <tr key={project.name} className="border-b border-gray-100">
                      <td className="py-3 text-gray-700"><WithAcronyms text={project.name} /></td>
                      <td className="py-3 text-right font-semibold text-[#21355a]">
                        {project.amountDisplay || formatCurrency(project.amount)}
                      </td>
                      <td className="py-3 pl-6">
                        {project.timeframe === "TBD" ? (
                          <span className="text-gray-400 text-sm">{project.timeframe}</span>
                        ) : (
                          <span className="text-gray-600">{project.timeframe}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataCard>
        </section>

        {/* Capital Projects */}
        <section className="mb-12">
          <SectionSubheader title="Current Capital Projects" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialData.capitalProjects.map((project) => (
              <div
                key={project.name}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-[#21355a]">{project.name}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      project.status === "Awarded"
                        ? "bg-green-100 text-green-700"
                        : project.status === "Design Complete"
                        ? "bg-blue-100 text-blue-700"
                        : project.status === "In Progress"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{project.description}</p>
                <p className="text-xs text-gray-400 mt-2">Source: {project.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data Note */}
        <section>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  Budget vs Actuals sourced from FPA Dashboard Reports (Finance Department).
                  O&M expenses are shown separately from Projects to avoid distortion from
                  multi-year project timing. Hover over any acronym for its full name.
                </p>
                <p>
                  Future projects and capital projects sourced from SITREP reports.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
