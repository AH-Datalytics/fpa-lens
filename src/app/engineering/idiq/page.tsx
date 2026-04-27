"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Users,
  ClipboardList,
  DollarSign,
  ArrowLeft,
  Lightbulb,
  CalendarDays,
} from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import KPICard from "@/components/KPICard";

interface TaskOrder {
  number: string;
  status: string;
  description: string;
  projectNumber: string;
  leveeDistrict: string;
  maximum: number;
  costToDate: number;
  startDate: string | null;
  endDate: string | null;
}

interface Contract {
  number: string;
  consultant: string;
  contractDate: string | null;
  endDate: string | null;
  maximum: number;
  remaining: number;
  utilized: number;
  utilizationPct: number;
  taskOrders: TaskOrder[];
}

interface ServiceType {
  service: string;
  contractCount: number;
  totalMaximum: number;
  totalUtilized: number;
  utilizationPct: number;
  contracts: Contract[];
}

interface ContractPool {
  id: string;
  name: string;
  serviceTypes: ServiceType[];
}

interface IdiqData {
  contractPools: ContractPool[];
  summary: {
    totalContracts: number;
    totalMaxValue: number;
    totalUtilized: number;
    activeTaskOrders: number;
    completedTaskOrders: number;
    serviceTypes: number;
    firms: number;
  };
}

const ACCENT = "#2FA4A9";

// Micro-descriptions per director feedback (Apr 2026). Keys cover both the
// 2022-cycle and 2025-cycle naming variants for the same service category.
const SERVICE_DESCRIPTIONS: Record<string, string> = {
  "Civil Engineering": "Levee repair, site development, and infrastructure design",
  "Surveying": "Levee and structure elevation surveys and mapping",
  "Surveying Services": "Levee and structure elevation surveys and mapping",
  "Geotechnical Engineering": "Soil analysis, subsurface investigations, and testing",
  "Construction Materials & Testing": "Materials and soil testing for construction quality control",
  "Constuction Materials & Testing": "Materials and soil testing for construction quality control",
  "MEP Services": "Mechanical and electrical systems for facilities and pump stations",
};

const processSteps = [
  {
    label: "Qualifications-Based Selection",
    description: "Firms respond to a public solicitation and are evaluated based on qualifications and experience",
  },
  {
    label: "Pre-Approved Contract Pool",
    description: "Selected firms are placed under contract with pre-established rates and terms",
  },
  {
    label: "Task Order Awarded",
    description: "As project needs arise, specific work is assigned to a qualified firm without a full procurement",
  },
  {
    label: "Project Execution & Oversight",
    description: "The firm completes the work, with costs tracked against the contract ceiling",
  },
];

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function ContractRow({ contract }: { contract: Contract }) {
  const [expanded, setExpanded] = useState(false);
  const hasTaskOrders = contract.taskOrders.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg bg-white hover:border-gray-300 hover:shadow-sm transition-all">
      <button
        onClick={() => hasTaskOrders && setExpanded(!expanded)}
        className={`w-full text-left px-4 py-3 flex items-center justify-between ${hasTaskOrders ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-[#21355a]">{contract.consultant}</span>
            <span className="text-xs text-gray-400">#{contract.number}</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-gray-500">{formatCurrency(contract.maximum)} max</span>
            <span className="text-xs text-gray-500">{formatCurrency(contract.utilized)} used ({contract.utilizationPct}%)</span>
            <span className="text-xs text-gray-500">{contract.taskOrders.length} task order{contract.taskOrders.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="mt-2 w-full max-w-xs">
            <div className="h-2 bg-gray-100 rounded-full">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${Math.min(contract.utilizationPct, 100)}%`, backgroundColor: ACCENT }}
              />
            </div>
          </div>
        </div>
        {hasTaskOrders && (
          <ChevronDown className={`h-5 w-5 text-gray-500 flex-shrink-0 ml-2 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-4 py-3 bg-slate-50/70">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-600 pr-3">TO#</th>
                  <th className="text-left py-2 font-semibold text-gray-600 pr-3">Description</th>
                  <th className="text-left py-2 font-semibold text-gray-600 pr-3">Status</th>
                  <th className="text-left py-2 font-semibold text-gray-600 pr-3">District</th>
                  <th className="text-right py-2 font-semibold text-gray-600 pr-3">Maximum</th>
                  <th className="text-right py-2 font-semibold text-gray-600 pr-3">Cost to Date</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Period</th>
                </tr>
              </thead>
              <tbody>
                {contract.taskOrders.map((to) => (
                  <tr key={to.number} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-3 text-gray-700">{to.number}</td>
                    <td className="py-2 pr-3 text-gray-700 max-w-[200px] truncate" title={to.description}>{to.description}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        to.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {to.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{to.leveeDistrict}</td>
                    <td className="py-2 pr-3 text-right text-gray-700">{formatCurrency(to.maximum)}</td>
                    <td className="py-2 pr-3 text-right text-gray-700">{to.costToDate > 0 ? formatCurrency(to.costToDate) : "-"}</td>
                    <td className="py-2 text-gray-500">{formatDate(to.startDate)} - {formatDate(to.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCategory({ st, poolId }: { st: ServiceType; poolId: string }) {
  const [expanded, setExpanded] = useState(false);
  const micro = SERVICE_DESCRIPTIONS[st.service];
  const sortedContracts = [...st.contracts].sort((a, b) => a.consultant.localeCompare(b.consultant));

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300 transition-all overflow-hidden"
      style={{ borderLeft: `4px solid ${ACCENT}` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h3 className="text-lg font-semibold text-[#21355a]">{st.service}</h3>
              <span className="text-sm font-normal text-gray-500">
                {st.contractCount} firm{st.contractCount !== 1 ? "s" : ""}
              </span>
            </div>
            {micro && (
              <p className="text-sm text-gray-600 mt-1 leading-snug">{micro}</p>
            )}
          </div>
          <ChevronDown
            className={`h-5 w-5 text-gray-500 flex-shrink-0 mt-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>

        {/* Utilization bar */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-3 rounded-full transition-all"
                style={{ width: `${Math.min(st.utilizationPct, 100)}%`, backgroundColor: ACCENT }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold text-gray-700 w-12 text-right">{st.utilizationPct}%</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{formatCurrency(st.totalUtilized)} utilized</span>
          <span>{formatCurrency(st.totalMaximum)} total capacity</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-5 py-4 bg-slate-50/60 space-y-2">
          {sortedContracts.map((c) => (
            <ContractRow key={`${poolId}-${c.number}`} contract={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function poolSummary(pool: ContractPool) {
  let totalContracts = 0;
  let totalMaxValue = 0;
  let totalUtilized = 0;
  let activeTaskOrders = 0;
  let completedTaskOrders = 0;
  const firmNames = new Set<string>();

  for (const st of pool.serviceTypes) {
    totalContracts += st.contractCount;
    totalMaxValue += st.totalMaximum;
    totalUtilized += st.totalUtilized;
    for (const c of st.contracts) {
      firmNames.add(c.consultant);
      for (const to of c.taskOrders) {
        if (to.status === "Active") activeTaskOrders += 1;
        else if (to.status === "Complete") completedTaskOrders += 1;
      }
    }
  }

  return {
    totalContracts,
    totalMaxValue,
    totalUtilized,
    activeTaskOrders,
    completedTaskOrders,
    firms: firmNames.size,
    serviceTypes: pool.serviceTypes.length,
  };
}

export default function IdiqPage() {
  const [data, setData] = useState<IdiqData | null>(null);
  const [activePool, setActivePool] = useState("2025");

  useEffect(() => {
    fetch("/data/idiq-contracts.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64" />
            <div className="h-4 bg-gray-200 rounded w-96" />
            <div className="grid md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pool = data.contractPools.find((p) => p.id === activePool) ?? data.contractPools[0];
  const summary = poolSummary(pool);
  const sortedServices = [...pool.serviceTypes].sort((a, b) => a.service.localeCompare(b.service));

  return (
    <div className="py-12 bg-slate-50/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            href="/engineering"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#21355a] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Engineering
          </Link>
        </div>

        <SectionHeader
          title="IDIQ Contract Tracker"
          subtitle="How we procure and assign engineering and professional services work"
        />

        {/* Key Takeaway */}
        <section className="mb-8">
          <div
            className="rounded-xl p-5 flex items-start gap-4 shadow-sm"
            style={{ backgroundColor: `${ACCENT}15`, borderLeft: `4px solid ${ACCENT}` }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${ACCENT}25` }}
            >
              <Lightbulb className="h-5 w-5" style={{ color: ACCENT }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: ACCENT }}>
                Key Takeaway
              </h3>
              <p className="text-[15px] text-gray-800 leading-relaxed">
                IDIQ contracts allow the Authority to respond quickly to project needs by working with
                pre-qualified firms. Work is assigned based on project requirements and expertise, not
                preset allocation, so utilization will vary across firms.
              </p>
            </div>
          </div>
        </section>

        {/* Educational Intro */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
            <h2 className="text-xl font-bold text-[#21355a] mb-4">What is an IDIQ contract?</h2>
            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <p>
                IDIQ (Indefinite Delivery, Indefinite Quantity) contracts allow the Authority to
                pre-qualify engineering and professional service firms through a competitive,
                qualifications-based process. Task orders are issued as project needs arise, such as
                inspections, design, construction support, and facility improvements, without
                requiring a full procurement each time.
              </p>
              <p>
                IDIQ contracts are awarded in multi-year cycles (typically three years). The 2022
                contracts were active through 2025, and the 2025 contracts represent the current
                cycle.
              </p>
              <p>
                Work is assigned based on project needs, timing, and expertise. As a result,
                utilization varies across firms within each service category; this is expected and
                reflects how IDIQ programs are designed to function.
              </p>
            </div>

            {/* Process Flow */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
              {processSteps.map((step, i) => (
                <div key={step.label} className="flex flex-col sm:flex-row items-center">
                  <div
                    className="flex flex-col items-center justify-center px-3 py-3 border-2 rounded-lg min-w-[140px] text-center"
                    style={{
                      borderColor: i === processSteps.length - 1 ? "#65bc7b" : i === 0 ? "#21355a" : "#d1d5db",
                      backgroundColor: i > 0 && i < processSteps.length - 1 ? "#f9fafb" : undefined,
                    }}
                    title={step.description}
                  >
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide leading-tight"
                      style={{
                        color: i === processSteps.length - 1 ? "#65bc7b" : i === 0 ? "#21355a" : "#6b7280",
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < processSteps.length - 1 && (
                    <>
                      <ArrowRight className="hidden sm:block h-4 w-4 text-gray-400 mx-1 flex-shrink-0" />
                      <ArrowRight className="sm:hidden h-4 w-4 text-gray-400 rotate-90 my-1" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contract Cycle Selector */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <SectionSubheader title="Contract Cycle" className="mb-0" />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CalendarDays className="h-3 w-3" />
              Monthly updates
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            {data.contractPools.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePool(p.id)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                  activePool === p.id
                    ? "bg-[#21355a] text-white border-[#21355a] shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-slate-50"
                }`}
              >
                {p.id === "2022" ? "2022 Cycle (2022-2025)" : "2025 Cycle (current)"}
              </button>
            ))}
          </div>

          {/* KPI Cards for selected pool */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPICard
              label="Total Contracts"
              value={summary.totalContracts}
              icon={<FileText className="h-6 w-6" />}
              subtitle={`Across ${summary.serviceTypes} service type${summary.serviceTypes !== 1 ? "s" : ""}`}
            />
            <KPICard
              label="Pre-Qualified Firms"
              value={summary.firms}
              icon={<Users className="h-6 w-6" />}
              subtitle="Engineering and professional services"
            />
            <KPICard
              label="Active Task Orders"
              value={summary.activeTaskOrders}
              icon={<ClipboardList className="h-6 w-6" />}
              subtitle={`${summary.completedTaskOrders} completed`}
            />
            <KPICard
              label="Total Contract Value"
              value={formatCurrency(summary.totalMaxValue)}
              icon={<DollarSign className="h-6 w-6" />}
              subtitle={`${formatCurrency(summary.totalUtilized)} utilized`}
            />
          </div>

          {/* Service Categories */}
          <div className="space-y-4">
            {sortedServices.map((st) => (
              <ServiceCategory key={`${pool.id}-${st.service}`} st={st} poolId={pool.id} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
