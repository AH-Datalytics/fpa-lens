"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Wrench, CheckCircle, Clock, ArrowRight, ClipboardCheck, CalendarDays } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import KPICard from "@/components/KPICard";
import { financialData, operationsData, readinessMetrics } from "@/data/siteData";

type StatusColor = "GREEN" | "AMBER" | "RED" | "NEUTRAL";

function statusFromRatio(ratio: number): StatusColor {
  if (ratio >= 90) return "GREEN";
  if (ratio >= 80) return "AMBER";
  return "RED";
}

function statusStyles(color: StatusColor) {
  switch (color) {
    case "GREEN":
      return { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500", label: "text-green-800" };
    case "AMBER":
      return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", label: "text-amber-800" };
    case "RED":
      return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", label: "text-red-800" };
    case "NEUTRAL":
      return { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400", label: "text-gray-800" };
  }
}

function expectedFromRate(
  monthlyRate: number,
  periodStart: Date,
  asOf: Date,
  target?: number,
): number {
  const ms = (asOf.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
  const exp = Math.max(0, monthlyRate * ms);
  return target !== undefined ? Math.min(exp, target) : exp;
}

function ReadinessCard({
  title,
  description,
  mandate,
  period,
  icon: Icon,
  actual,
  expected,
  unit,
  status,
  source,
  note,
  big,
}: {
  title: string;
  description?: string;
  mandate: string;
  period?: string;
  icon: React.ComponentType<{ className?: string }>;
  actual: string;
  expected?: string;
  unit?: string;
  status: StatusColor;
  source?: string;
  note?: string;
  big: string;
}) {
  const s = statusStyles(status);
  return (
    <div className={`bg-white rounded-xl shadow-md border ${s.border} overflow-hidden h-full flex flex-col`}>
      <div className={`${s.bg} px-5 py-3 border-b ${s.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${s.text}`} />
          <h3 className="font-semibold text-[#21355a] text-sm leading-tight">{title}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.label}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {status === "NEUTRAL" ? "Not Active" : status}
        </span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        {description && (
          <p className="text-xs text-gray-600 leading-snug mb-3">{description}</p>
        )}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold text-[#21355a]">{big}</span>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Actual: {actual}</div>
          {expected && <div>Expected: {expected}</div>}
          {period && (
            <div className="flex items-center gap-1 text-gray-500">
              <CalendarDays className="h-3 w-3" />
              {period}
            </div>
          )}
          <div className="text-gray-500">Mandate: {mandate}</div>
          {note && <div className="text-gray-500 italic pt-1">{note}</div>}
        </div>
        {source && <p className="text-[10px] text-gray-400 mt-3">Source: {source}</p>}
      </div>
    </div>
  );
}

export default function OperationsPage() {
  const [showFullPipeline, setShowFullPipeline] = useState(false);

  const asOf = new Date(readinessMetrics.dataAsOf + "T00:00:00");

  const cpra = readinessMetrics.cpraQuarterlyInspection;
  const cpraExpected = expectedFromRate(
    cpra.monthlyRate,
    new Date(cpra.periodStart + "T00:00:00"),
    asOf,
    100,
  );
  const cpraRatio = cpraExpected > 0 ? (cpra.currentQuarterPercent / cpraExpected) * 100 : 100;
  const cpraStatus = statusFromRatio(cpraRatio);

  const usace = readinessMetrics.usaceSemiAnnualInspection;
  const usaceExpected = expectedFromRate(
    usace.monthlyRate,
    new Date(usace.periodStart + "T00:00:00"),
    asOf,
    100,
  );
  const usaceRatio = usaceExpected > 0 ? (usace.currentHalfPercent / usaceExpected) * 100 : 100;
  const usaceStatus = statusFromRatio(usaceRatio);

  const permitChartData = operationsData.permitsIssued.map((item) => ({
    month: item.month.split(" ")[0].substring(0, 3),
    count: item.count,
  }));

  const latestPermit = operationsData.permitsIssued[operationsData.permitsIssued.length - 1];
  const latestMonth = latestPermit.month.split(" ")[0].substring(0, 3);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#21355a]">Engineering</h1>
            <p className="mt-2 text-lg text-gray-600">Permits, inspections, and engineering contracts</p>
            <p className="mt-2 text-sm text-gray-400">Data source: {latestPermit.source}</p>
          </div>
          <Link
            href="/engineering/idiq"
            className="group inline-flex items-center gap-2 px-5 py-3 bg-[#21355a] hover:bg-[#2c4470] text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap self-start"
          >
            <FileText className="h-4 w-4" />
            Engineering Contracts (IDIQ)
            <ArrowRight className="h-4 w-4 text-[#65bc7b] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Federal & State Inspections */}
        <section className="mb-12">
          <SectionSubheader title="Federal &amp; State Inspections" />
          <div className="grid md:grid-cols-2 gap-4">
            <ReadinessCard
              title="CPRA Quarterly Inspection"
              description="State-mandated quarterly visual inspection of the levee system, with findings reported to the Coastal Protection and Restoration Authority."
              mandate={cpra.mandate}
              period={cpra.currentQuarter}
              icon={ClipboardCheck}
              big={`${cpra.currentQuarterPercent}%`}
              actual={`${cpra.currentQuarter} field inspections complete`}
              expected={`${Math.round(cpraExpected)}% by report date (100% by end of quarter)`}
              status={cpraStatus}
              note={cpra.reportSubmittedDate ? `Report submitted to CPRA ${cpra.reportSubmittedDate}` : "CPRA submission date pending"}
            />
            <ReadinessCard
              title="USACE Semi-Annual Inspection"
              description="Federal inspection of HSDRRS levees, floodwalls, PCCPs, and complex structures. 100% = on pace for this point in the half-year cycle."
              mandate={usace.mandate}
              period="Semi-Annual &middot; Ongoing"
              icon={ClipboardCheck}
              big={`${Math.min(100, Math.round(usaceRatio))}%`}
              unit="on pace"
              actual={`${usace.currentHalfPercent}% complete · LPV done; PCCP/Complex in progress Apr 14-28`}
              expected={`Target: ${Math.round(usaceExpected)}% by today, 100% by end of half`}
              status={usaceStatus}
              note={usace.reportSubmittedDate ? `Report submitted ${usace.reportSubmittedDate}` : "Submission pending"}
            />
          </div>
        </section>

        {/* Current Capital Projects */}
        <section id="current-capital-projects" className="mb-12 scroll-mt-24">
          <SectionSubheader title="Current Capital Projects" />
          <p className="text-sm text-gray-600 mb-4">
            Major capital projects currently under contract, in construction, or in active bidding.
          </p>
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

        {/* Permits */}
        <SectionSubheader title="Permits" />

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
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Permit Processing Pipeline</p>
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
            note={`Avg 69 days submittal to LNO (Letter of No Objection), 38 days LNO to approval (${operationsData.permitProcessing.period.toLowerCase()})`}
          >
            {showFullPipeline ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 py-4 flex-wrap">
                {[
                  { label: "Permit Submittal", highlight: true },
                  { label: "FPA-E Review" },
                  { label: "External Agency Coordination" },
                  { label: "Receipt of LNO", tooltip: "Letter of No Objection from the Levee District" },
                  { label: "Final Review" },
                  { label: "Permit Issued", highlight: true, success: true },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex flex-col sm:flex-row items-center">
                    <div
                      className={`flex flex-col items-center px-4 py-3 border-2 rounded-lg min-w-[100px] text-center ${
                        step.success
                          ? "border-[#65bc7b]"
                          : step.highlight
                            ? "border-[#21355a]"
                            : "border-gray-300 bg-gray-50"
                      } ${step.tooltip ? "cursor-help" : ""}`}
                      title={step.tooltip}
                    >
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
                  <span
                    className="text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-dashed border-gray-300 cursor-help"
                    title="LNO: Letter of No Objection issued by the Levee District"
                  >
                    LNO Review
                  </span>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Permits Issued</p>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Routine Maintenance Activities</p>
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
