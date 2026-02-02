"use client";

import { AlertCircle, DollarSign, TrendingUp, Briefcase, Calendar } from "lucide-react";
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

const COLORS = ["#21355a", "#65bc7b", "#2c3859", "#59ba4d", "#4a5568"];

export default function FinancialPage() {
  const revenueData = financialData.revenue.sources.map((source) => ({
    name: source.name.replace(" Revenue", ""),
    value: source.amount,
  }));

  const costsData = financialData.annualCosts.items.map((item) => ({
    name: item.name.length > 25 ? item.name.substring(0, 25) + "..." : item.name,
    fullName: item.name,
    value: item.amount,
  }));

  const totalRevenue = financialData.revenue.totalRevenue;
  const totalCosts = financialData.annualCosts.items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Financial Transparency"
          subtitle="How your tax dollars are invested in flood protection"
          source="Millage Roll Forward Analysis (2026 projections)"
        />

        {/* Disclaimer */}
        <section className="mb-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Important Note</p>
                <p className="text-sm text-amber-700">{financialData.disclaimer}</p>
                <p className="text-xs text-amber-600 mt-1">Source: {financialData.disclaimerSource}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Revenue vs Costs Overview */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Total Revenue (2026)</h3>
                  <p className="text-2xl font-bold text-[#21355a]">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Total Annual Costs (2026)</h3>
                  <p className="text-2xl font-bold text-[#21355a]">{formatCurrency(totalCosts)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Revenue Sources */}
        <section className="mb-12">
          <SectionSubheader title="Revenue Sources" />
          <div className="grid lg:grid-cols-2 gap-6">
            <DataCard title="2026 Projected Revenue" source="Millage Roll Forward Analysis">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {revenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </DataCard>
            <DataCard title="Revenue Breakdown" source="Millage Roll Forward Analysis">
              <div className="space-y-4">
                {financialData.revenue.sources.map((source, index) => (
                  <div key={source.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index] }}
                      ></div>
                      <span className="text-gray-700">{source.name}</span>
                    </div>
                    <span className="font-semibold text-[#21355a]">
                      {formatCurrency(source.amount)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-[#21355a]">{formatCurrency(totalRevenue)}</span>
                  </div>
                </div>
              </div>
            </DataCard>
          </div>
        </section>

        {/* Annual Costs */}
        <section className="mb-12">
          <SectionSubheader title="Annual Operating Costs" />
          <DataCard title="2026 Projected Costs" source="Millage Roll Forward Analysis">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costsData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="value" fill="#21355a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-3">
              {financialData.annualCosts.items.map((item) => (
                <div key={item.name} className="flex items-start justify-between text-sm">
                  <div>
                    <span className="text-gray-700">{item.name}</span>
                    {item.note && (
                      <span className="block text-xs text-gray-500">{item.note}</span>
                    )}
                  </div>
                  <span className="font-semibold text-[#21355a] whitespace-nowrap ml-4">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </DataCard>
        </section>

        {/* Major Future Projects */}
        <section className="mb-12">
          <SectionSubheader title="Major Future Projects" />
          <DataCard title="Long-Term Capital Requirements" source="Oct 2025 SITREP">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-semibold text-gray-700">Project</th>
                    <th className="text-right py-3 font-semibold text-gray-700">Estimated Cost</th>
                    <th className="text-left py-3 font-semibold text-gray-700 pl-6">Timeframe</th>
                  </tr>
                </thead>
                <tbody>
                  {financialData.majorFutureProjects.map((project) => (
                    <tr key={project.name} className="border-b border-gray-100">
                      <td className="py-3 text-gray-700">{project.name}</td>
                      <td className="py-3 text-right font-semibold text-[#21355a]">
                        {project.amountDisplay || formatCurrency(project.amount)}
                      </td>
                      <td className="py-3 pl-6">
                        {project.timeframe.includes("PLACEHOLDER") ? (
                          <span className="text-amber-600 text-xs">{project.timeframe}</span>
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
        <section>
          <SectionSubheader title="Current Capital Projects" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialData.capitalProjects.map((project) => (
              <div key={project.name} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
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
      </div>
    </div>
  );
}
