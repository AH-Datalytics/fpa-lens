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
  LineChart,
  Line,
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

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Operations & Maintenance"
          subtitle="Ongoing work to maintain our flood defense systems"
          source="Dec 2025 SITREP"
        />

        {/* Key Metrics */}
        <section className="mb-12">
          <div className="grid md:grid-cols-3 gap-6">
            <KPICard
              label="Permits Issued (Dec)"
              value={kpiMetrics.permitsIssued.value}
              unit="permits"
              icon={<FileText className="h-6 w-6" />}
              source={kpiMetrics.permitsIssued.source}
            />
            <KPICard
              label="River Floodgate Inspections"
              value={operationsData.floodgateInspections.completed}
              total={operationsData.floodgateInspections.total}
              unit="completed"
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
              <div className="text-lg font-semibold text-[#21355a]">On Schedule</div>
              <p className="text-sm text-gray-600 mt-2">
                {operationsData.pccpRepairStatus.overallStatus}
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

        {/* PCCP Repair Status */}
        <section className="mb-12">
          <SectionSubheader title="PCCP Repair Status" />
          <DataCard title="Repair Progress by Station" source={operationsData.pccpRepairStatus.source}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-semibold text-gray-700">Issue</th>
                    <th className="text-center py-3 font-semibold text-gray-700" colSpan={2}>London Ave</th>
                    <th className="text-center py-3 font-semibold text-gray-700" colSpan={2}>Orleans Ave</th>
                    <th className="text-center py-3 font-semibold text-gray-700" colSpan={2}>17th Street</th>
                  </tr>
                  <tr className="border-b border-gray-100 text-xs text-gray-500">
                    <th></th>
                    <th className="py-1">Progress</th>
                    <th className="py-1">Est.</th>
                    <th className="py-1">Progress</th>
                    <th className="py-1">Est.</th>
                    <th className="py-1">Progress</th>
                    <th className="py-1">Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {operationsData.pccpRepairStatus.repairs.map((repair) => (
                    <tr key={repair.issue} className="border-b border-gray-100">
                      <td className="py-3 text-gray-700">{repair.issue}</td>
                      <td className="py-3 text-center">
                        {repair.london.percent !== null ? (
                          <span className={`font-semibold ${repair.london.percent >= 90 ? 'text-green-600' : 'text-amber-600'}`}>
                            {repair.london.percent}%
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="py-3 text-center text-xs text-gray-500">{repair.london.estimated}</td>
                      <td className="py-3 text-center">
                        {repair.orleans.percent !== null ? (
                          <span className={`font-semibold ${repair.orleans.percent >= 90 ? 'text-green-600' : 'text-amber-600'}`}>
                            {repair.orleans.percent}%
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="py-3 text-center text-xs text-gray-500">{repair.orleans.estimated}</td>
                      <td className="py-3 text-center">
                        {repair.seventeenthSt.percent !== null ? (
                          <span className={`font-semibold ${repair.seventeenthSt.percent >= 90 ? 'text-green-600' : 'text-amber-600'}`}>
                            {repair.seventeenthSt.percent}%
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="py-3 text-center text-xs text-gray-500">{repair.seventeenthSt.estimated}</td>
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
