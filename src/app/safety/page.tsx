"use client";

import { HardHat, Target, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import KPICard from "@/components/KPICard";
import PlaceholderBox from "@/components/PlaceholderBox";
import { safetyData, kpiMetrics } from "@/data/siteData";

export default function SafetyPage() {
  const chartData = safetyData.monthlyData.map((item) => ({
    month: item.month.split(" ")[0].substring(0, 3),
    accidents: item.accidents,
    incidents: item.incidents,
  }));

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Safety Performance"
          subtitle="Our commitment to a safe workplace"
          source={safetyData.source}
        />

        {/* Key Metrics */}
        <section className="mb-12">
          <div className="grid md:grid-cols-3 gap-6">
            <KPICard
              label="YTD Accidents"
              value={kpiMetrics.ytdAccidents.value}
              goal={kpiMetrics.ytdAccidents.goal}
              goalLabel={kpiMetrics.ytdAccidents.goalLabel}
              icon={<HardHat className="h-6 w-6" />}
              source={kpiMetrics.ytdAccidents.source}
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
                {safetyData.ytdAccidents} accidents YTD vs goal of ≤{safetyData.goalMax}
              </p>
            </div>
          </div>
        </section>

        {/* Monthly Breakdown */}
        <section className="mb-12">
          <SectionSubheader title="Monthly Safety Metrics" />
          <DataCard title="Accidents & Incidents by Month" source="SITREPs">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accidents" fill="#ef4444" name="Accidents" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="incidents" fill="#f59e0b" name="Incidents" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-gray-700">Month</th>
                    <th className="text-center py-2 font-semibold text-gray-700">Accidents</th>
                    <th className="text-center py-2 font-semibold text-gray-700">Incidents</th>
                    <th className="text-left py-2 font-semibold text-gray-700 pl-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {safetyData.monthlyData.map((item) => (
                    <tr key={item.month} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">{item.month}</td>
                      <td className="py-2 text-center">
                        <span className={`font-semibold ${item.accidents === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.accidents}
                        </span>
                      </td>
                      <td className="py-2 text-center text-amber-600 font-medium">{item.incidents}</td>
                      <td className="py-2 pl-4 text-xs text-gray-500">{item.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataCard>
        </section>

        {/* Safety Culture */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-[#21355a] to-[#2c3859] rounded-xl p-8 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Safety Culture</h3>
                <p className="text-blue-100 text-lg leading-relaxed">
                  &quot;{safetyData.safetyMessage}&quot;
                </p>
                <p className="text-xs text-blue-200 mt-4">— SLFPA-E Leadership</p>
              </div>
            </div>
          </div>
        </section>

        {/* Historical Trend */}
        <section>
          <SectionSubheader title="Historical Safety Trends" />
          <PlaceholderBox
            title="Multi-Year Safety Performance"
            description="Historical trend data showing safety performance over multiple fiscal years."
            stakeholderNeeded={safetyData.historicalTrend.stakeholderNeeded}
            type="chart"
            height="h-64"
          />
        </section>
      </div>
    </div>
  );
}
