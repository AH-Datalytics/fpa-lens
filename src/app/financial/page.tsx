"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Building2,
  Info,
  Clock,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import { financialData, formatCurrency } from "@/data/siteData";

const DISTRICT_COLORS: Record<string, string> = {
  OLD: "#21355a",
  EJLD: "#65bc7b",
  LBBLD: "#60a5fa",
  FPAE: "#fb923c",
};

const CATEGORY_COLOR = "#21355a";

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
};

function HoverDef({ term, className }: { term: string; className?: string }) {
  const definition = ACRONYMS[term];
  if (!definition) return <span className={className}>{term}</span>;
  return (
    <span className={`relative group/def cursor-default border-b border-dashed border-gray-400 ${className || ""}`}>
      {term}
      <span className="invisible group-hover/def:visible absolute left-0 top-full mt-2 w-52 rounded-lg bg-gray-800 text-white text-xs font-normal p-2 leading-relaxed shadow-lg z-50 whitespace-normal">
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

interface BudgetExpense {
  category: string;
  OLD: number;
  EJLD: number;
  LBBLD: number;
  FPAE: number;
  total: number;
}

interface DistrictTotals {
  OLD: number;
  EJLD: number;
  LBBLD: number;
  FPAE: number;
  total: number;
}

interface BudgetData {
  fiscalYear: number;
  districts: string[];
  districtNames: Record<string, string>;
  revenue: DistrictTotals;
  expenses: BudgetExpense[];
  totalExpenses: DistrictTotals;
  sourcesUses: DistrictTotals;
  grandTotal: DistrictTotals;
}

type SortKey = "category" | "OLD" | "EJLD" | "LBBLD" | "FPAE" | "total";
type SortDir = "asc" | "desc";

export default function FinancialPage() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/data/budget-fy26.json")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "category" ? "asc" : "desc");
    }
  };

  if (!data) {
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

  // Chart data: expenses by category (sorted by total descending)
  const categoryChartData = [...data.expenses]
    .sort((a, b) => b.total - a.total)
    .map((e) => ({
      name: e.category === "CostSharing" ? "Cost Sharing" : e.category,
      fullName: e.category === "MMCI" ? "Major Maintenance & Capital Improvements" : e.category === "CostSharing" ? "Cost Sharing" : e.category,
      value: e.total,
    }));

  // Sorted expenses for table
  const sortedExpenses = [...data.expenses].sort((a, b) => {
    const mult = sortDir === "asc" ? 1 : -1;
    if (sortKey === "category") {
      const nameA = a.category === "CostSharing" ? "Cost Sharing" : a.category;
      const nameB = b.category === "CostSharing" ? "Cost Sharing" : b.category;
      return mult * nameA.localeCompare(nameB);
    }
    return mult * ((a[sortKey] as number) - (b[sortKey] as number));
  });

  // Chart data: district share of grand total
  const districtChartData = data.districts.map((d) => ({
    name: d,
    fullName: data.districtNames[d],
    value: data.grandTotal[d as keyof DistrictTotals] as number,
  }));

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Financial Transparency"
          subtitle="How your tax dollars are invested in flood protection"
          source="FY26 Adopted Budget Summary"
        />

        {/* Key Metrics */}
        <section className="mb-12">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">FY26 Total Revenue</h3>
                  <p className="text-2xl font-bold text-[#21355a]">
                    {formatCurrency(data.revenue.total)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">FY26 Total Expenses</h3>
                  <p className="text-2xl font-bold text-[#21355a]">
                    {formatCurrency(data.totalExpenses.total)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">FY26 Grand Total</h3>
                  <p className="text-2xl font-bold text-[#21355a]">
                    {formatCurrency(data.grandTotal.total)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Budget by Category */}
        <section className="mb-12">
          <SectionSubheader title="FY26 Budget by Category" />
          <div className="grid lg:grid-cols-2 gap-6">
            <DataCard title="Expenses by Category" source="FY26 Budget Summary">
              <div className="h-80 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryChartData}
                    layout="vertical"
                    margin={{ left: 0, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.fullName || label
                      }
                      wrapperStyle={{ zIndex: 50, maxWidth: "90vw" }}
                    />
                    <Bar
                      dataKey="value"
                      fill={CATEGORY_COLOR}
                      radius={[0, 4, 4, 0]}
                      name="Budget"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataCard>
            <DataCard title="Category Breakdown by District" source="FY26 Budget Summary">
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th
                        className="text-left py-2 font-semibold text-gray-700 cursor-pointer select-none hover:text-[#21355a]"
                        onClick={() => handleSort("category")}
                      >
                        <span className="inline-flex items-center gap-1">
                          Category
                          {sortKey === "category" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </span>
                      </th>
                      {data.districts.map((d) => (
                        <th
                          key={d}
                          className="text-right py-2 font-semibold text-gray-700 pl-3 cursor-pointer select-none hover:text-[#21355a]"
                          onClick={() => handleSort(d as SortKey)}
                        >
                          <span className="inline-flex items-center justify-end gap-1">
                            <HoverDef term={d} />
                            {sortKey === d && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                          </span>
                        </th>
                      ))}
                      <th
                        className="text-right py-2 font-semibold text-gray-700 pl-3 cursor-pointer select-none hover:text-[#21355a]"
                        onClick={() => handleSort("total")}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          Total
                          {sortKey === "total" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedExpenses.map((exp) => (
                      <tr key={exp.category} className="border-b border-gray-100">
                        <td className="py-2 text-gray-700 text-xs">
                          {exp.category === "MMCI" ? (
                            <HoverDef term="MMCI" />
                          ) : exp.category === "CostSharing" ? (
                            "Cost Sharing"
                          ) : (
                            exp.category
                          )}
                        </td>
                        {data.districts.map((d) => (
                          <td key={d} className="py-2 text-right text-xs text-gray-600 pl-3">
                            {formatCurrency(exp[d as keyof BudgetExpense] as number)}
                          </td>
                        ))}
                        <td className="py-2 text-right text-xs font-semibold text-[#21355a] pl-3">
                          {formatCurrency(exp.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300">
                      <td className="py-2 font-semibold text-gray-900 text-xs">Total Expenses</td>
                      {data.districts.map((d) => (
                        <td
                          key={d}
                          className="py-2 text-right text-xs font-semibold text-gray-700 pl-3"
                        >
                          {formatCurrency(
                            data.totalExpenses[d as keyof DistrictTotals] as number
                          )}
                        </td>
                      ))}
                      <td className="py-2 text-right text-xs font-bold text-[#21355a] pl-3">
                        {formatCurrency(data.totalExpenses.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </DataCard>
          </div>
        </section>

        {/* Budget by District */}
        <section className="mb-12">
          <SectionSubheader title="FY26 Budget by District" />
          <div className="grid lg:grid-cols-2 gap-6">
            <DataCard title="Grand Total by District" source="FY26 Budget Summary">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.fullName || label
                      }
                    />
                    <Bar dataKey="value" name="Grand Total" radius={[4, 4, 0, 0]}>
                      {districtChartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={DISTRICT_COLORS[entry.name] || "#21355a"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataCard>
            <DataCard title="District Share of Budget" source="FY26 Budget Summary">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={districtChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {districtChartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={DISTRICT_COLORS[entry.name] || "#21355a"}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {districtChartData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: DISTRICT_COLORS[d.name] }}
                      />
                      <span className="text-gray-600">{d.fullName}</span>
                    </div>
                    <span className="font-semibold text-[#21355a]">
                      {formatCurrency(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </DataCard>
          </div>
        </section>

        {/* Budget vs Actuals - Coming Soon */}
        <section className="mb-12">
          <SectionSubheader title="Budget vs Actuals" />
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Coming Soon</h3>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Budget vs actual spending comparisons will be added as actual expenditure data
                  becomes available. This section will show year-to-date actuals by category and
                  district, updated monthly, allowing stakeholders to track spending against the
                  adopted FY26 budget.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Major Future Projects */}
        <section className="mb-12">
          <SectionSubheader title="Major Future Projects" />
          <DataCard title="Long-Term Capital Requirements" source="Oct 2025 SITREP">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
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
                  Budget figures reflect the adopted <HoverDef term="FY26" /> budget.
                  Hover over any acronym for its full name.
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
