import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  Droplets,
  Users,
  FileText,
  HardHat,
  Wind,
  ArrowRight,
  Info,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import SiteGuide from "@/components/SiteGuide";
import EnvironmentalCard from "@/components/EnvironmentalCard";
import StaffingZoneBar from "@/components/StaffingZoneBar";
import {
  siteConfig,
  kpiMetrics,
  systemReadiness,
  operationsData,
  staffingData,
  StatusLevel,
} from "@/data/siteData";
import { computeReadinessRollups } from "@/lib/readinessRollups";

const quickLinks = [
  {
    title: "Infrastructure",
    description: "Details and readiness of infrastructure protecting Greater New Orleans",
    href: "/infrastructure",
    icon: Shield,
  },
  {
    title: "Finance",
    description: "How your tax dollars are being invested",
    href: "/finance",
    icon: FileText,
  },
  {
    title: "Engineering",
    description: "Permits, inspections, and engineering contracts",
    href: "/engineering",
    icon: Droplets,
  },
  {
    title: "Safety",
    description: "Workplace safety and accident prevention",
    href: "/safety",
    icon: HardHat,
  },
  {
    title: "Staffing",
    description: "Leadership, headcount, and department status",
    href: "/staffing",
    icon: Users,
  },
  {
    title: "Environment",
    description: "Real-time Lakeshore Drive flood risk and weather conditions",
    href: "/environment",
    icon: Wind,
  },
  {
    title: "About Us",
    description: "What SLFPA-E does and how we protect the region",
    href: "/about/what-we-do",
    icon: Info,
  },
];

function getCategory(name: string) {
  return systemReadiness.categories.find((c) => c.name === name);
}

function statusBorder(status: StatusLevel) {
  if (status === "RED") return "border-red-500";
  if (status === "AMBER") return "border-amber-500";
  return "border-green-500";
}

function statusBg(status: StatusLevel) {
  if (status === "RED") return "bg-red-50";
  if (status === "AMBER") return "bg-amber-50";
  return "bg-green-50";
}

function statusText(status: StatusLevel) {
  if (status === "RED") return "text-red-600";
  if (status === "AMBER") return "text-amber-600";
  return "text-green-600";
}

function statusTooltip(status: StatusLevel) {
  const defs = systemReadiness.statusDefinitions;
  if (status === "RED") return `${defs.RED.label}: ${defs.RED.definition}`;
  if (status === "AMBER") return `${defs.AMBER.label}: ${defs.AMBER.definition}`;
  return `${defs.GREEN.label}: ${defs.GREEN.definition}`;
}

export default function Home() {
  const infra = getCategory("Infrastructure Readiness")!;
  const staffReadiness = getCategory("Staffing Readiness")!;
  const financial = getCategory("Financial Readiness")!;

  // O&M actuals — update these when new Dashboard Reports data arrives
  const omActual = 38_227_061;        // YTD actual through Feb 28, 2026
  const omAnnualBudget = 72_354_250;  // FY26 annual O&M budget
  const omDataDate = "2026-02-28";    // Data through date
  const omPct = Math.round((omActual / omAnnualBudget) * 100);
  const fyStart = new Date(2025, 6, 1);
  const fyEnd = new Date(2026, 5, 30);
  const fyElapsedPct = Math.min(100, Math.max(0, Math.round(((new Date(omDataDate + "T00:00:00").getTime() - fyStart.getTime()) / (fyEnd.getTime() - fyStart.getTime())) * 100)));

  const rollups = computeReadinessRollups();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#21355a] via-[#2c3859] to-[#21355a] text-white">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
        <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-28 sm:px-6 lg:px-8 lg:pt-12 lg:pb-32">
          <div className="absolute top-10 right-4 sm:right-6 lg:right-8 z-10">
            <SiteGuide />
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <StatusBadge status={systemReadiness.overallStatus} size="md" tooltip={statusTooltip(systemReadiness.overallStatus)} />
                <span className="text-sm text-blue-200">All Systems Operational</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Protecting Greater New Orleans
              </h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                The FPA Lens provides transparent, real-time insight into how the{" "}
                <span className="text-white font-semibold">{siteConfig.organizationShort}</span>{" "}
                protects our community through world-class flood defense infrastructure.
              </p>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-[#65bc7b]/20 rounded-full blur-3xl"></div>
                <Image
                  src="/fpa_logo.png"
                  alt="SLFPA-E Logo"
                  width={300}
                  height={300}
                  className="relative rounded-full bg-white p-6 shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Readiness Gauges */}
      <section className="relative -mt-12 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Infrastructure Readiness */}
            <Link
              href="/infrastructure#infrastructure-readiness"
              className={`group bg-white rounded-xl shadow-lg border-l-4 ${statusBorder(infra.status)} p-6 hover:shadow-2xl transition-shadow duration-200`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${statusBg(infra.status)} rounded-lg flex items-center justify-center`}>
                    <Shield className="h-5 w-5 text-[#21355a]" />
                  </div>
                  <h3 className="font-semibold text-[#21355a]">Infrastructure Readiness</h3>
                </div>
                <StatusBadge status={infra.status} size="sm" tooltip={statusTooltip(infra.status)} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center">
                  {/*
                    Manual override per Director, Apr 2026: display 4/5 even
                    though the rollup currently computes 5/5. When the
                    override is removed, restore:
                      {rollups.inspections.greenCount}/{rollups.inspections.total}
                    so the card auto-derives from the infrastructure data
                    again.
                  */}
                  <div className="text-xl font-bold text-[#21355a]">
                    4/{rollups.inspections.total}
                  </div>
                  <div className="text-xs text-gray-500 leading-snug mt-0.5">
                    Mandatory inspections on pace
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#21355a]">
                    {rollups.grassCutting.complete}/{rollups.grassCutting.total}
                  </div>
                  <div className="text-xs text-gray-500 leading-snug mt-0.5">
                    Turf maintenance reaches on pace
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{infra.description}</p>
              <div className={`mt-4 flex items-center text-sm font-medium ${statusText(infra.status)}`}>
                View details
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Financial Readiness */}
            <Link
              href="/finance"
              className={`group bg-white rounded-xl shadow-lg border-l-4 ${statusBorder(financial.status)} p-6 hover:shadow-2xl transition-shadow duration-200`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${statusBg(financial.status)} rounded-lg flex items-center justify-center`}>
                    <Image src="/dollar-icon.svg" alt="Dollar" width={20} height={20} className="opacity-80" />
                  </div>
                  <h3 className="font-semibold text-[#21355a]">Financial Readiness</h3>
                </div>
                <StatusBadge status={financial.status} size="sm" tooltip={statusTooltip(financial.status)} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#21355a]">${(omActual / 1_000_000).toFixed(1)}M</div>
                  <div className="text-xs text-gray-500">O&M Spent (YTD)</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#21355a]">${(omAnnualBudget / 1_000_000).toFixed(1)}M</div>
                  <div className="text-xs text-gray-500">Annual O&M Budget</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full">
                  <div className={`h-2 rounded-full ${omPct > 100 ? "bg-red-400" : "bg-green-400"}`} style={{ width: `${Math.min(omPct, 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-500">{omPct}%</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{omPct}% of annual budget used, {fyElapsedPct}% through fiscal year</p>
              <div className={`mt-4 flex items-center text-sm font-medium ${statusText(financial.status)}`}>
                View details
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Staff Readiness */}
            <Link
              href="/staffing"
              className={`group bg-white rounded-xl shadow-lg border-l-4 ${statusBorder(staffReadiness.status)} p-6 hover:shadow-2xl transition-shadow duration-200`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${statusBg(staffReadiness.status)} rounded-lg flex items-center justify-center`}>
                    <Users className="h-5 w-5 text-[#21355a]" />
                  </div>
                  <h3 className="font-semibold text-[#21355a]">Staffing Readiness</h3>
                </div>
                <StatusBadge status={staffReadiness.status} size="sm" tooltip={statusTooltip(staffReadiness.status)} />
              </div>
              <div className="mb-4">
                <StaffingZoneBar
                  group={staffingData.coreFPU.aggregate}
                  variant="compact"
                />
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{staffReadiness.description}</p>
              <div className={`mt-4 flex items-center text-sm font-medium ${statusText(staffReadiness.status)}`}>
                View details
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Environmental Conditions */}
            <EnvironmentalCard />
          </div>
        </div>
      </section>

      {/* Explore More */}
      <section className="pt-20 pb-20 -mt-6 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-[#21355a] mb-4">
              Explore the FPA Lens
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Transparent, accessible information about how {siteConfig.organizationShort} manages
              and maintains the flood protection infrastructure that keeps Greater New Orleans safe.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group bg-gray-50 hover:bg-[#21355a] rounded-xl p-4 transition-all duration-300"
                >
                  <div className="w-10 h-10 bg-[#65bc7b]/10 group-hover:bg-white/10 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-[#65bc7b] group-hover:text-[#65bc7b]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#21355a] group-hover:text-white mb-1">
                    {link.title}
                  </h3>
                  <p className="text-xs text-gray-600 group-hover:text-blue-200">
                    {link.description}
                  </p>
                  <div className="mt-3 flex items-center text-xs font-medium text-[#65bc7b]">
                    Learn more
                    <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Current Alerts */}
      {systemReadiness.alerts.length > 0 && (
        <section className="py-12 bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold text-[#21355a] mb-4">Current Notices</h2>
            <div className="space-y-4">
              {systemReadiness.alerts.map((alert, index) => (
                <div
                  key={index}
                  className="bg-white border-l-4 border-amber-400 rounded-r-lg p-4 shadow-sm"
                >
                  <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                  <p className="text-gray-600 mt-1">{alert.description}</p>
                  <p className="text-xs text-gray-400 mt-2">Source: {alert.source}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
