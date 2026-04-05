"use client";

import { useState } from "react";
import { FileText, Wrench, CheckCircle, Clock, ArrowRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import KPICard from "@/components/KPICard";
import { operationsData, kpiMetrics } from "@/data/siteData";

export default function OperationsPage() {
  const [showFullPipeline, setShowFullPipeline] = useState(false);

  const permitChartData = operationsData.permitsIssued.map((item) => ({
    month: item.month.split(" ")[0].substring(0, 3),
    count: item.count,
  }));

  const latestPermit = operationsData.permitsIssued[operationsData.permitsIssued.length - 1];
  const latestMonth = latestPermit.month.split(" ")[0].substring(0, 3);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Operations & Maintenance"
          subtitle="Ongoing work to maintain our flood defense systems"
          source={latestPermit.source}
        />

        {/* Key Metrics */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              label={`Permits Issued (${latestMonth})`}
              value={latestPermit.count}
              unit="permits"
              icon={<FileText className="h-6 w-6" />}
              source={latestPermit.source}
            />
            <KPICard
              label="Hurricane Gate Inspections"
              value={operationsData.floodgateInspections.hurricaneGates.percentComplete}
              total={100}
              unit="% complete"
              icon={<CheckCircle className="h-6 w-6" />}
              source={operationsData.floodgateInspections.source}
            />
            <KPICard
              label="Valve Exercises"
              value={operationsData.floodgateInspections.valveExercises.percentComplete}
              total={100}
              unit="% complete"
              icon={<CheckCircle className="h-6 w-6" />}
              source={operationsData.floodgateInspections.source}
            />
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  PCCP Repairs
                </span>
                <Clock className="h-6 w-6 text-[#21355a]" />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Most items near completion pending final acceptance.
              </p>
              <p className="text-sm text-green-600 font-medium mt-2">
                All 17 pumps remain available. Repair work does not impact pumping capacity.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Managed by: {operationsData.pccpRepairStatus.managedBy}
              </p>
            </div>
            <KPICard
              label="Permit Approval Rate"
              value={operationsData.permitProcessing.approvalRate}
              total={100}
              unit="%"
              icon={<CheckCircle className="h-6 w-6" />}
              source={operationsData.permitProcessing.source}
            />
            <KPICard
              label="Avg Processing Time"
              value={operationsData.permitProcessing.avgTotalDays}
              unit="days"
              icon={<Clock className="h-6 w-6" />}
              subtitle={`${operationsData.permitProcessing.period}`}
              source={operationsData.permitProcessing.source}
            />
          </div>
        </section>

        {/* Permit Pipeline */}
        <section className="mb-12">
          <SectionSubheader title="Permit Processing Pipeline" />
          <DataCard
            title={
              <div className="flex items-center justify-between">
                <span>{showFullPipeline ? "Life of a permit" : `Permit flow (${operationsData.permitProcessing.period.toLowerCase()})`}</span>
                <button
                  onClick={() => setShowFullPipeline(!showFullPipeline)}
                  className="text-xs font-medium text-[#21355a] hover:text-[#21355a]/70 border border-gray-300 rounded-md px-2.5 py-1 transition-colors"
                >
                  {showFullPipeline ? "Show timing" : "Full workflow"}
                </button>
              </div>
            }
            source={operationsData.permitProcessing.source}
            note={`Avg 69 days submittal to LNO, 38 days LNO to approval (${operationsData.permitProcessing.period.toLowerCase()})`}
          >
            {showFullPipeline ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 py-4 flex-wrap">
                {[
                  { label: "Permit Submittal", highlight: true },
                  { label: "FPA-E Review" },
                  { label: "External Agency Coordination" },
                  { label: "Receipt of LNO" },
                  { label: "Final Review" },
                  { label: "Permit Issued", highlight: true, success: true },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex flex-col sm:flex-row items-center">
                    <div className={`flex flex-col items-center px-4 py-3 border-2 rounded-lg min-w-[100px] text-center ${
                      step.success
                        ? "border-[#65bc7b]"
                        : step.highlight
                          ? "border-[#21355a]"
                          : "border-gray-300 bg-gray-50"
                    }`}>
                      <span className={`text-xs font-medium uppercase tracking-wide ${
                        step.success ? "text-[#65bc7b]" : step.highlight ? "text-[#21355a]" : "text-gray-500"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <>
                        <ArrowRight className="hidden sm:block h-4 w-4 text-gray-400 mx-1 flex-shrink-0" />
                        <ArrowRight className="sm:hidden h-4 w-4 text-gray-400 rotate-90 my-1" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0 py-4">
                <div className="flex flex-col items-center px-6 py-4 border-2 border-[#21355a] rounded-lg min-w-[120px]">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</span>
                  <span className="text-2xl font-bold text-[#21355a]">{operationsData.permitProcessing.submitted}</span>
                </div>
                <div className="flex flex-col items-center px-4">
                  <span className="text-xs font-medium text-gray-500 mb-1">69 days avg</span>
                  <div className="hidden sm:flex items-center">
                    <div className="w-16 h-px bg-gray-300" />
                    <ArrowRight className="h-4 w-4 text-gray-400 -ml-1" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 rotate-90 sm:hidden" />
                </div>
                <div className="flex flex-col items-center px-6 py-4 border-2 border-gray-300 rounded-lg min-w-[120px] bg-gray-50">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">LNO Review</span>
                  <span className="text-sm text-gray-600 mt-1">Levee District</span>
                </div>
                <div className="flex flex-col items-center px-4">
                  <span className="text-xs font-medium text-gray-500 mb-1">38 days avg</span>
                  <div className="hidden sm:flex items-center">
                    <div className="w-16 h-px bg-gray-300" />
                    <ArrowRight className="h-4 w-4 text-gray-400 -ml-1" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 rotate-90 sm:hidden" />
                </div>
                <div className="flex flex-col items-center px-6 py-4 border-2 border-[#65bc7b] rounded-lg min-w-[120px]">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approved</span>
                  <span className="text-2xl font-bold text-[#65bc7b]">{operationsData.permitProcessing.approved}</span>
                </div>
              </div>
            )}
          </DataCard>
        </section>

        {/* Permits Chart */}
        <section className="mb-12">
          <SectionSubheader title="Permits Issued" />
          <DataCard title="Monthly Permits Trend" source="SITREPs">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={permitChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#65bc7b" radius={[4, 4, 0, 0]} name="Permits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-gray-700">Month</th>
                    <th className="text-right py-2 font-semibold text-gray-700">Permits Issued</th>
                    <th className="text-left py-2 font-semibold text-gray-700 pl-4">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {operationsData.permitsIssued.map((item) => (
                    <tr key={item.month} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">{item.month}</td>
                      <td className="py-2 text-right font-semibold text-[#21355a]">{item.count}</td>
                      <td className="py-2 pl-4 text-xs text-gray-500">{item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataCard>
        </section>

        {/* Maintenance Activities */}
        <section>
          <SectionSubheader title="Routine Maintenance Activities" />
          <DataCard title="Current Maintenance Work" source={operationsData.maintenanceSource}>
            <ul className="space-y-3">
              {operationsData.maintenanceActivities.map((activity, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#65bc7b]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Wrench className="h-3 w-3 text-[#65bc7b]" />
                  </div>
                  <span className="text-gray-700">{activity}</span>
                </li>
              ))}
            </ul>
          </DataCard>
        </section>
      </div>
    </div>
  );
}
