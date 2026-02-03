import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  Droplets,
  Activity,
  Users,
  FileText,
  HardHat,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import KPICard from "@/components/KPICard";
import StatusBadge from "@/components/StatusBadge";
import { siteConfig, kpiMetrics, systemReadiness } from "@/data/siteData";

const quickLinks = [
  {
    title: "Our System",
    description: "Learn about the infrastructure protecting Greater New Orleans",
    href: "/our-system",
    icon: Shield,
  },
  {
    title: "System Readiness",
    description: "Real-time status of all flood protection systems",
    href: "/system-readiness",
    icon: Activity,
  },
  {
    title: "Financial Transparency",
    description: "How your tax dollars are being invested",
    href: "/financial",
    icon: FileText,
  },
  {
    title: "Operations & Maintenance",
    description: "Ongoing work to maintain our defenses",
    href: "/operations",
    icon: Droplets,
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#21355a] via-[#2c3859] to-[#21355a] text-white">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
        <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-28 sm:px-6 lg:px-8 lg:pt-12 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <StatusBadge status={systemReadiness.overallStatus} size="md" />
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
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/system-readiness"
                  className="inline-flex items-center gap-2 bg-[#65bc7b] hover:bg-[#59ba4d] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  View System Status
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/our-system"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Learn About Our System
                </Link>
              </div>
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

      {/* KPI Dashboard Section */}
      <section className="relative -mt-12 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPICard
              label={kpiMetrics.systemReadiness.label}
              value="GREEN"
              status="GREEN"
              icon={<Shield className="h-6 w-6" />}
              source={kpiMetrics.systemReadiness.source}
            />
            <KPICard
              label={kpiMetrics.pccpPumps.label}
              value={kpiMetrics.pccpPumps.value}
              total={kpiMetrics.pccpPumps.total}
              unit={kpiMetrics.pccpPumps.unit}
              icon={<Droplets className="h-6 w-6" />}
              source={kpiMetrics.pccpPumps.source}
            />
            <KPICard
              label={kpiMetrics.ytdAccidents.label}
              value={kpiMetrics.ytdAccidents.value}
              goal={kpiMetrics.ytdAccidents.goal}
              goalLabel={kpiMetrics.ytdAccidents.goalLabel}
              icon={<HardHat className="h-6 w-6" />}
              source={kpiMetrics.ytdAccidents.source}
            />
            <KPICard
              label={kpiMetrics.floodgateInspections.label}
              value={kpiMetrics.floodgateInspections.value}
              total={kpiMetrics.floodgateInspections.total}
              unit={kpiMetrics.floodgateInspections.unit}
              icon={<CheckCircle className="h-6 w-6" />}
              source={kpiMetrics.floodgateInspections.source}
            />
            <KPICard
              label={kpiMetrics.staffCount.label}
              value={kpiMetrics.staffCount.value}
              subtitle={kpiMetrics.staffCount.breakdown}
              icon={<Users className="h-6 w-6" />}
              source={kpiMetrics.staffCount.source}
            />
            <KPICard
              label={kpiMetrics.permitsIssued.label}
              value={kpiMetrics.permitsIssued.value}
              unit="permits"
              icon={<FileText className="h-6 w-6" />}
              source={kpiMetrics.permitsIssued.source}
            />
          </div>
        </div>
      </section>

      {/* About the Dashboard */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-[#21355a] mb-4">
              About The FPA Lens
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              This transparency dashboard provides the public with clear, accessible information
              about how {siteConfig.organizationShort} manages and maintains the flood protection
              infrastructure that keeps Greater New Orleans safe. Our commitment to transparency
              builds public trust and demonstrates responsible stewardship of taxpayer resources.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group bg-gray-50 hover:bg-[#21355a] rounded-xl p-6 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-[#65bc7b]/10 group-hover:bg-white/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-[#65bc7b] group-hover:text-[#65bc7b]" />
                  </div>
                  <h3 className="font-semibold text-[#21355a] group-hover:text-white mb-2">
                    {link.title}
                  </h3>
                  <p className="text-sm text-gray-600 group-hover:text-blue-200">
                    {link.description}
                  </p>
                  <div className="mt-4 flex items-center text-sm font-medium text-[#65bc7b]">
                    Learn more
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
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

      {/* Hurricane Season Notice */}
      <section className="py-12 bg-gradient-to-r from-[#21355a] to-[#2c3859] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-[#65bc7b]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Hurricane Season: June 1 - November 30</h3>
                <p className="text-blue-200">
                  Monitoring continues year-round for cold fronts and non-tropical high tide events
                </p>
              </div>
            </div>
            <Link
              href="/system-readiness"
              className="inline-flex items-center gap-2 bg-white text-[#21355a] font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Check System Status
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
