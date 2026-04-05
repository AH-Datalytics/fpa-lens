import {
  Shield,
  Droplets,
  Building2,
  Waves,
  Fence,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Bell,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import StatusBadge from "@/components/StatusBadge";
import PlaceholderBox from "@/components/PlaceholderBox";
import SystemMap from "@/components/SystemMap";
import {
  infrastructureAssets,
  educationalContent,
  systemReadiness,
  kpiMetrics,
  operationsData,
} from "@/data/siteData";

const smsKeywords = [
  {
    keyword: "FLOODGATE",
    description: "Floodgate operations and maintenance affecting traffic",
  },
  {
    keyword: "LAKESHOREDRIVE",
    description: "Temporary closures or flooded areas",
  },
  {
    keyword: "RIVER",
    description: "Mississippi River levels during flood operations",
  },
  {
    keyword: "HIGHTIDE",
    description: "Gate operations due to high tides",
  },
];

export default function OurSystemPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Infrastructure"
          subtitle="Learn about the flood protection infrastructure that keeps Greater New Orleans safe"
        />

        {/* Overview */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-[#65bc7b]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-[#65bc7b]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#21355a] mb-2">Overview</h2>
                <p className="text-gray-600 leading-relaxed">
                  The Southeast Louisiana Flood Protection Authority - East (SLFPA-E) manages flood
                  protection infrastructure for the Greater New Orleans area. Our system includes levees,
                  floodgates, pump stations, and complex structures that work together to protect our
                  community from flooding caused by hurricanes, tropical storms, and other weather events.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* System Map */}
        <section className="mb-12">
          <SectionSubheader title="System Map" />
          <p className="text-gray-600 mb-4">
            Interactive map showing levee alignments, floodgates, pump stations, and complex structures
            across the SLFPA-E flood protection system. Click on features for more information.
          </p>
          <SystemMap />
          <p className="text-xs text-gray-400 mt-2">
            Source: SLFPA-E GIS Data (Centerline and Structures Shapefiles)
          </p>
        </section>

        {/* System at a Glance */}
        <section className="mb-12">
          <SectionSubheader title="System at a Glance" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <Waves className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
              <div className="text-3xl font-bold text-[#21355a]">{infrastructureAssets.totalLeveeMiles.value}</div>
              <div className="text-sm text-gray-600">Miles of Levees</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <Fence className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
              <div className="text-3xl font-bold text-[#21355a]">{infrastructureAssets.totalFloodgates.value}</div>
              <div className="text-sm text-gray-600">Floodgates</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <Shield className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
              <div className="text-3xl font-bold text-[#21355a]">{infrastructureAssets.totalValves.value}</div>
              <div className="text-sm text-gray-600">Valves</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
              <div className="text-3xl font-bold text-[#21355a]">{infrastructureAssets.complexStructures.list.length}</div>
              <div className="text-sm text-gray-600">Complex Structures</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <Droplets className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
              <div className="text-3xl font-bold text-[#21355a]">{infrastructureAssets.pccpStations.count}</div>
              <div className="text-sm text-gray-600">PCCP Stations</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <Droplets className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
              <div className="text-3xl font-bold text-[#21355a]">{infrastructureAssets.pccpStations.totalPumps}</div>
              <div className="text-sm text-gray-600">PCCP Pumps</div>
            </div>
          </div>
        </section>

        {/* Infrastructure Readiness */}
        <section id="infrastructure-readiness" className="mb-12 scroll-mt-24">
          <SectionSubheader title="Infrastructure Readiness" />
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-600 mb-2">Overall System Status</h2>
                <div className="flex items-center gap-4">
                  <StatusBadge status={systemReadiness.overallStatus} size="lg" />
                  <span className="text-gray-600">All categories operational</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">Last updated: {systemReadiness.lastUpdated}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Waves className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
                <div className="text-2xl font-bold text-[#21355a]">
                  {systemReadiness.riverConditions.level} {systemReadiness.riverConditions.unit}
                </div>
                <div className="text-xs text-gray-600">Mississippi River Level</div>
                <div className="text-xs text-gray-400 mt-1">{systemReadiness.riverConditions.status}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Droplets className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
                <div className="text-2xl font-bold text-[#21355a]">
                  {kpiMetrics.pccpPumps.value}/{kpiMetrics.pccpPumps.total}
                </div>
                <div className="text-xs text-gray-600">PCCP Pumps Available</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
                <div className="text-2xl font-bold text-[#21355a]">
                  {operationsData.floodgateInspections.hurricaneGates.percentComplete}%
                </div>
                <div className="text-xs text-gray-600">Hurricane Gate Inspections</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-[#65bc7b]" />
                <div className="text-2xl font-bold text-[#21355a]">
                  {operationsData.floodgateInspections.valveExercises.percentComplete}%
                </div>
                <div className="text-xs text-gray-600">Valve Exercises Complete</div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">GREEN</span>
                <span className="text-xs text-green-600 ml-auto">{systemReadiness.statusDefinitions.GREEN.label}</span>
              </div>
              <p className="text-sm text-green-800">{systemReadiness.statusDefinitions.GREEN.definition}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="font-semibold text-amber-800">AMBER</span>
                <span className="text-xs text-amber-600 ml-auto">{systemReadiness.statusDefinitions.AMBER.label}</span>
              </div>
              <p className="text-sm text-amber-800">{systemReadiness.statusDefinitions.AMBER.definition}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">RED</span>
                <span className="text-xs text-red-600 ml-auto">{systemReadiness.statusDefinitions.RED.label}</span>
              </div>
              <p className="text-sm text-red-800">{systemReadiness.statusDefinitions.RED.definition}</p>
            </div>
          </div>
        </section>

        {/* Stay Informed */}
        <section className="mb-12">
          <SectionSubheader title="Stay Informed" />
          <div className="bg-gradient-to-r from-[#21355a] to-[#2c3859] rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Real-Time Alerts</h3>
                </div>
                <p className="text-blue-100 text-sm mb-4">
                  Get notified about floodgate operations, road closures, river levels, and high tide
                  events. Operations issues Rave alerts for maintenance work and any activity that may
                  affect travel through structures.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {smsKeywords.map((item) => (
                    <span
                      key={item.keyword}
                      className="bg-white/10 rounded px-3 py-1 text-sm font-mono"
                      title={item.description}
                    >
                      {item.keyword}
                    </span>
                  ))}
                </div>
                <p className="text-blue-200 text-xs">
                  Text any keyword to <strong className="text-white">77295</strong> or <strong className="text-white">333111</strong>
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href="https://www.getrave.com/login/floodauthority"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <MessageSquare className="h-4 w-4" />
                  Sign Up for Alerts
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href="https://www.floodauthority.org/news/public-alerts/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <Bell className="h-4 w-4" />
                  View Active Alerts
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* How Flood Protection Works */}
        <section className="mb-12">
          <SectionSubheader title="How Flood Protection Works" />
          <PlaceholderBox
            title="Educational Content"
            description="Explanation of how the various components of the flood protection system work together to protect the Greater New Orleans area."
            stakeholderNeeded={educationalContent.howFloodProtectionWorks.stakeholderNeeded}
            type="content"
            height="h-64"
          />
        </section>

      </div>
    </div>
  );
}
