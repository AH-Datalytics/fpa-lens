import { CheckCircle, AlertTriangle, Droplets, AlertCircle } from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import StatusBadge, { StatusIndicator } from "@/components/StatusBadge";
import DataCard from "@/components/DataCard";
import PlaceholderBox from "@/components/PlaceholderBox";
import { systemReadiness, kpiMetrics } from "@/data/siteData";

export default function SystemReadinessPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="System Readiness"
          subtitle="Current operational status of all flood protection systems"
          source={systemReadiness.lastUpdated}
        />

        {/* Overall Status */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-600 mb-2">Overall System Status</h2>
                <div className="flex items-center gap-4">
                  <StatusBadge status={systemReadiness.overallStatus} size="lg" />
                  <span className="text-gray-600">All categories operational</span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-green-50 px-6 py-4 rounded-lg">
                <Droplets className="h-8 w-8 text-[#65bc7b]" />
                <div>
                  <div className="text-3xl font-bold text-[#21355a]">
                    {kpiMetrics.pccpPumps.value}/{kpiMetrics.pccpPumps.total}
                  </div>
                  <div className="text-sm text-gray-600">PCCP Pumps Available</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Readiness Categories */}
        <section className="mb-12">
          <SectionSubheader title="Readiness Categories" />
          <div className="grid md:grid-cols-2 gap-6">
            {systemReadiness.categories.map((category) => (
              <div
                key={category.name}
                className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-[#21355a]">{category.name}</h3>
                  <StatusBadge status={category.status} size="sm" />
                </div>
                <p className="text-gray-600 text-sm">{category.description}</p>
                <p className="text-xs text-gray-400 mt-3">Source: {category.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Current Alerts */}
        {systemReadiness.alerts.length > 0 && (
          <section className="mb-12">
            <SectionSubheader title="Current Notices" />
            <div className="space-y-4">
              {systemReadiness.alerts.map((alert, index) => (
                <div
                  key={index}
                  className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-6"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-800">{alert.title}</h3>
                      <p className="text-amber-700 mt-1">{alert.description}</p>
                      <p className="text-xs text-amber-600 mt-2">Source: {alert.source}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Status Definitions */}
        <section className="mb-12">
          <SectionSubheader title="Status Definitions" />
          {systemReadiness.statusDefinitions.isPlaceholder ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-6">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <p className="text-amber-700 text-sm">
                  Status level definitions are awaiting stakeholder input
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">GREEN</span>
                  </div>
                  <p className="text-sm text-amber-600">{systemReadiness.statusDefinitions.GREEN}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">AMBER</span>
                  </div>
                  <p className="text-sm text-amber-600">{systemReadiness.statusDefinitions.AMBER}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-800">RED</span>
                  </div>
                  <p className="text-sm text-amber-600">{systemReadiness.statusDefinitions.RED}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {/* Would render actual definitions here */}
            </div>
          )}
        </section>

        {/* Historical Status */}
        <section>
          <SectionSubheader title="Status History" />
          <PlaceholderBox
            title="Historical Readiness Trends"
            description="Chart showing system readiness status over time, including any periods of elevated concern."
            stakeholderNeeded="Operations"
            type="chart"
            height="h-64"
          />
        </section>
      </div>
    </div>
  );
}
