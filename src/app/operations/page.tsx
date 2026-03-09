"use client";

import { FileText, Wrench, CheckCircle, Clock } from "lucide-react";
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
          </div>
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
