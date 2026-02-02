import { Shield, Droplets, Building2, Waves, AlertCircle } from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import PlaceholderBox from "@/components/PlaceholderBox";
import { infrastructureAssets, educationalContent, hurricaneSeasonInfo } from "@/data/siteData";

export default function OurSystemPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Our System"
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

        {/* System Map Placeholder */}
        <section className="mb-12">
          <SectionSubheader title="System Map" />
          <PlaceholderBox
            title="Interactive System Map"
            description="A comprehensive map showing levee alignments, floodgates, pump stations, and complex structures across the protection system."
            stakeholderNeeded="GIS/Engineering"
            type="map"
            height="h-96"
          />
        </section>

        {/* Confirmed Assets */}
        <section className="mb-12">
          <SectionSubheader title="Infrastructure Assets" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* PCCP Stations */}
            <DataCard title="Permanent Canal Closure Pump Stations" source="Dec 2025 SITREP">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Droplets className="h-8 w-8 text-[#65bc7b]" />
                  <div>
                    <div className="text-3xl font-bold text-[#21355a]">
                      {infrastructureAssets.confirmed.pccpStations.count}
                    </div>
                    <div className="text-sm text-gray-500">PCCP Stations</div>
                  </div>
                </div>
                <div className="text-lg font-semibold text-[#21355a]">
                  {infrastructureAssets.confirmed.pccpStations.totalPumps} Total Pumps
                </div>
                <ul className="space-y-2">
                  {infrastructureAssets.confirmed.pccpStations.stations.map((station) => (
                    <li key={station.name} className="flex justify-between text-sm">
                      <span className="text-gray-600">{station.name}</span>
                      <span className="text-amber-600 text-xs">{station.pumps}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </DataCard>

            {/* River Floodgates */}
            <DataCard title="River Floodgates" source="Inspection records">
              <div className="flex items-center gap-4">
                <Building2 className="h-8 w-8 text-[#65bc7b]" />
                <div>
                  <div className="text-3xl font-bold text-[#21355a]">
                    {infrastructureAssets.confirmed.riverFloodgates.count}
                  </div>
                  <div className="text-sm text-gray-500">River Floodgates</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Inspected annually to ensure operational readiness. These gates protect against
                Mississippi River flooding.
              </p>
            </DataCard>

            {/* Complex Structures */}
            <DataCard title="Complex Structures" source="Project documentation">
              <div className="flex items-center gap-4 mb-4">
                <Waves className="h-8 w-8 text-[#65bc7b]" />
                <div>
                  <div className="text-3xl font-bold text-[#21355a]">
                    {infrastructureAssets.confirmed.complexStructures.length}
                  </div>
                  <div className="text-sm text-gray-500">Major Structures</div>
                </div>
              </div>
              <ul className="space-y-2">
                {infrastructureAssets.confirmed.complexStructures.map((structure) => (
                  <li key={structure} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#65bc7b] rounded-full"></span>
                    {structure}
                  </li>
                ))}
              </ul>
            </DataCard>
          </div>
        </section>

        {/* Placeholder Assets */}
        <section className="mb-12">
          <SectionSubheader title="Additional Infrastructure" />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Data Pending Confirmation</p>
                <p className="text-sm text-amber-700">
                  The following infrastructure details are awaiting stakeholder input for verification.
                </p>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <h4 className="font-semibold text-gray-700 mb-2">Total Levee Miles</h4>
              <p className="text-amber-600 text-sm mb-2">{infrastructureAssets.placeholders.totalLeveeMiles.value}</p>
              <p className="text-xs text-gray-500">Systems: {infrastructureAssets.placeholders.totalLeveeMiles.systems.join(", ")}</p>
              <p className="text-xs text-amber-600 mt-2">Awaiting: {infrastructureAssets.placeholders.totalLeveeMiles.stakeholderNeeded}</p>
            </div>
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <h4 className="font-semibold text-gray-700 mb-2">Total Floodgates</h4>
              <p className="text-amber-600 text-sm mb-2">{infrastructureAssets.placeholders.totalFloodgates.value}</p>
              <p className="text-xs text-amber-600 mt-2">Awaiting: {infrastructureAssets.placeholders.totalFloodgates.stakeholderNeeded}</p>
            </div>
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <h4 className="font-semibold text-gray-700 mb-2">Floodwalls</h4>
              <p className="text-amber-600 text-sm mb-2">{infrastructureAssets.placeholders.floodwalls.value}</p>
              <p className="text-xs text-amber-600 mt-2">Awaiting: {infrastructureAssets.placeholders.floodwalls.stakeholderNeeded}</p>
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

        {/* Hurricane Season Info */}
        <section>
          <div className="bg-gradient-to-r from-[#21355a] to-[#2c3859] rounded-xl p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <Waves className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold">Hurricane Season</h3>
            </div>
            <p className="text-lg mb-4">
              <span className="font-semibold">{hurricaneSeasonInfo.seasonStart} - {hurricaneSeasonInfo.seasonEnd}</span>
            </p>
            <p className="text-blue-200">{hurricaneSeasonInfo.note}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
