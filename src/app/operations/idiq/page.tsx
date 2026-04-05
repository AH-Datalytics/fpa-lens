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
} from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
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

const processSteps = [
  {
    label: "Competitive Selection",
    description: "Firms respond to a public solicitation and are evaluated based on qualifications and experience",
  },
  {
    label: "Pre-Qualified Pool",
    description: "Selected firms are placed under contract with pre-established rates and terms",
  },
  {
    label: "Task Order Issued",
    description: "As project needs arise, specific work is assigned to a qualified firm without a full procurement",
  },
  {
    label: "Project Delivered",
    description: "The firm completes the work, with costs tracked against the contract ceiling",
  },
];

function ContractRow({ contract }: { contract: Contract }) {
  const [expanded, setExpanded] = useState(false);
  const hasTaskOrders = contract.taskOrders.length > 0;

  return (
    <div className="border border-gray-100 rounded-lg">
      <button
        onClick={() => hasTaskOrders && setExpanded(!expanded)}
        className={`w-full text-left px-4 py-3 flex items-center justify-between ${hasTaskOrders ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`}
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
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div
                className="h-1.5 bg-[#65bc7b] rounded-full transition-all"
                style={{ width: `${Math.min(contract.utilizationPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
        {hasTaskOrders && (
          <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${expanded ? "rotate-180" : ""}`} />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
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

export default function IdiqPage() {
  const [data, setData] = useState<IdiqData | null>(null);
  const [activePool, setActivePool] = useState("2022");
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

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

  const pool = data.contractPools.find((p) => p.id === activePool);

  const toggleService = (service: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });
  };

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            href="/operations"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#21355a] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Operations & Maintenance
          </Link>
        </div>

        <SectionHeader
          title="IDIQ Contract Tracker"
          subtitle="How we procure and assign engineering and professional services work"
        />

        {/* Educational Intro */}
        <section className="mb-12">
          <DataCard title="What is an IDIQ contract?">
            <p className="text-sm text-gray-700 leading-relaxed mb-6">
              An IDIQ (Indefinite Delivery, Indefinite Quantity) contract allows the Authority to pre-qualify
              a group of engineering and professional service firms through a competitive process. These firms
              are selected based on their qualifications and experience, and are placed under contract with
              pre-established rates and terms. As project needs arise, the Authority issues task orders to
              these firms for specific work -- such as inspections, design, construction support, etc. --
              without having to conduct a full procurement each time. This approach allows us to respond more
              efficiently while maintaining accountability and oversight.
            </p>

            {/* Process Flow */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 py-2">
              {processSteps.map((step, i) => (
                <div key={step.label} className="flex flex-col sm:flex-row items-center">
                  <div
                    className={`flex flex-col items-center px-4 py-3 border-2 rounded-lg min-w-[100px] text-center ${
                      i === 0 || i === processSteps.length - 1
                        ? i === processSteps.length - 1
                          ? "border-[#65bc7b]"
                          : "border-[#21355a]"
                        : "border-gray-300 bg-gray-50"
                    }`}
                    title={step.description}
                  >
                    <span className={`text-xs font-medium uppercase tracking-wide ${
                      i === processSteps.length - 1 ? "text-[#65bc7b]" : i === 0 ? "text-[#21355a]" : "text-gray-500"
                    }`}>
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
          </DataCard>
        </section>

        {/* KPI Cards */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              label="Total Contracts"
              value={data.summary.totalContracts}
              icon={<FileText className="h-6 w-6" />}
              subtitle={`Across ${data.summary.serviceTypes} service types`}
            />
            <KPICard
              label="Pre-Qualified Firms"
              value={data.summary.firms}
              icon={<Users className="h-6 w-6" />}
              subtitle="Engineering and professional services"
            />
            <KPICard
              label="Active Task Orders"
              value={data.summary.activeTaskOrders}
              icon={<ClipboardList className="h-6 w-6" />}
              subtitle={`${data.summary.completedTaskOrders} completed`}
            />
            <KPICard
              label="Total Contract Value"
              value={formatCurrency(data.summary.totalMaxValue)}
              icon={<DollarSign className="h-6 w-6" />}
              subtitle={`${formatCurrency(data.summary.totalUtilized)} utilized`}
            />
          </div>
        </section>

        {/* Contract Pools */}
        <section>
          <SectionSubheader title="Contract Pools" />

          {/* Pool toggle */}
          <div className="flex gap-2 mb-6">
            {data.contractPools.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePool(p.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePool === p.id
                    ? "bg-[#21355a] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {pool && (
            <div className="space-y-6">
              {pool.serviceTypes.map((st) => {
                const isExpanded = expandedServices.has(`${pool.id}-${st.service}`);
                const serviceKey = `${pool.id}-${st.service}`;

                return (
                  <DataCard
                    key={serviceKey}
                    title={
                      <button
                        onClick={() => toggleService(serviceKey)}
                        className="w-full text-left flex items-center justify-between"
                      >
                        <div>
                          <span>{st.service}</span>
                          <span className="text-sm font-normal text-gray-500 ml-3">
                            {st.contractCount} contract{st.contractCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    }
                  >
                    {/* Utilization bar */}
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1">
                        <div className="h-3 bg-gray-100 rounded-full">
                          <div
                            className="h-3 bg-[#65bc7b] rounded-full transition-all"
                            style={{ width: `${Math.min(st.utilizationPct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 w-12 text-right">{st.utilizationPct}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mb-4">
                      <span>{formatCurrency(st.totalUtilized)} utilized</span>
                      <span>{formatCurrency(st.totalMaximum)} total capacity</span>
                    </div>

                    {isExpanded && (
                      <div className="space-y-2">
                        {st.contracts.map((c) => (
                          <ContractRow key={c.number} contract={c} />
                        ))}
                      </div>
                    )}
                  </DataCard>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
