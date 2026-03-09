import { Shield, Waves, Building2, AlertTriangle, Droplets, Users } from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import { formatCurrency } from "@/data/siteData";

export default function WhatWeDoPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="About Us"
          subtitle="Protecting Greater New Orleans from hurricane and storm surge flooding"
        />

        {/* Mission Overview */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-[#65bc7b]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-[#65bc7b]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#21355a] mb-4">Our Mission</h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  The Southeast Louisiana Flood Protection Authority - East (SLFPA-E) was established
                  after Hurricane Katrina as the regional governmental body responsible for a restored,
                  strengthened, and enhanced multi-parish integrated hurricane and flood protection system.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HSDRRS System */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-[#21355a] to-[#2c3859] rounded-xl p-8 text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-4">The Hurricane & Storm Damage Risk Reduction System</h2>
                <p className="text-blue-100 leading-relaxed mb-4">
                  More than a million neighbors in New Orleans and its surrounding areas are better
                  protected from hurricane-driven flooding today than ever before.
                </p>
                <p className="text-blue-100 leading-relaxed">
                  The <span className="text-white font-semibold">{formatCurrency(14600000000)}</span> Hurricane
                  and Storm Damage Risk Reduction System (HSDRRS) provides defense against a 100-year storm
                  surge for the citizens of Southeast Louisiana, including Orleans, Jefferson, and St. Bernard Parishes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <Waves className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">Levees</div>
                  <div className="text-sm text-blue-200">Earthen barriers</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <Building2 className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">Floodwalls</div>
                  <div className="text-sm text-blue-200">Concrete barriers</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <Shield className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">Floodgates</div>
                  <div className="text-sm text-blue-200">Surge barriers</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <Droplets className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-2xl font-bold">PCCP Stations</div>
                  <div className="text-sm text-blue-200">Canal closure pumps</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-12">
          <SectionSubheader title="Our Responsibilities" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataCard title="Operate & Maintain">
              <div className="space-y-3">
                <p className="text-gray-600">
                  We operate and maintain the HSDRRS infrastructure 24/7, ensuring all systems
                  are ready to protect our community at a moment&apos;s notice.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    Regular inspections of levees, floodwalls, and gates
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    Vegetation management and erosion control
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    Equipment maintenance and testing
                  </li>
                </ul>
              </div>
            </DataCard>

            <DataCard title="Storm Response">
              <div className="space-y-3">
                <p className="text-gray-600">
                  When storms threaten, we activate our emergency protocols to close floodgates,
                  monitor water levels, and coordinate with emergency management agencies.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    Close sector gates and floodgates before storm arrival
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    Monitor surge levels throughout the system
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    Coordinate with local, state, and federal agencies
                  </li>
                </ul>
              </div>
            </DataCard>

            <DataCard title="Permitting & Compliance">
              <div className="space-y-3">
                <p className="text-gray-600">
                  We review and issue permits for any work on or near flood protection infrastructure
                  to ensure system integrity is maintained.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    Construction permits near levees
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    Utility crossing permits
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    Encroachment reviews
                  </li>
                </ul>
              </div>
            </DataCard>
          </div>
        </section>

        {/* Surge vs. Rain */}
        <section className="mb-12">
          <SectionSubheader title="Surge Protection vs. Drainage" />

          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <p className="text-gray-600 leading-relaxed">
              Greater New Orleans has two separate flood protection systems run by two separate agencies.
              SLFPA-E is the <strong>outer perimeter</strong>: we keep hurricane surge and lake water out.
              The Sewerage &amp; Water Board of New Orleans (SWBNO) handles everything inside that perimeter:
              drainage pumps, storm drains, drinking water, and sewage. We do not operate drainage pump
              stations, and SWBNO does not operate levees or floodgates. The two systems are complementary
              but independent.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md border-t-4 border-[#21355a] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#21355a] rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#21355a]">SLFPA-E (Us)</h3>
              </div>
              <p className="text-gray-600 mb-4 font-medium">
                We protect against <span className="text-[#21355a]">storm surge</span> from hurricanes, tropical storms, and high tides.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  Levees, floodwalls, and surge barriers
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  Floodgates that close during storms
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  Permanent Canal Closure Pump Stations (PCCP)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  Lake Borgne Surge Barrier
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  Protection from Lake Pontchartrain &amp; Gulf of Mexico
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-md border-t-4 border-gray-400 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center">
                  <Droplets className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-700">SWBNO (Sewerage &amp; Water Board)</h3>
              </div>
              <p className="text-gray-600 mb-4 font-medium">
                They manage <span className="text-gray-700">rainwater drainage</span>, drinking water, and sewage services.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  Drainage pump stations that remove rainwater
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  Storm drains and underground canals
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  Drinking water treatment and distribution
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  Sewage collection and treatment
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  Street flooding from heavy rain
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 rounded-lg p-6">
            <h4 className="font-semibold text-[#21355a] mb-2">Where the Systems Connect</h4>
            <p className="text-gray-600">
              During a storm, SLFPA-E closes the floodgates at the outfall canals to block surge from
              entering the city. While those gates are closed, SWBNO&apos;s drainage pumps push rainwater
              into those same canals. Our Permanent Canal Closure Pump Stations (PCCPs) at 17th Street,
              Orleans Avenue, and London Avenue then pump that water over the gates and out to Lake
              Pontchartrain. That handoff is the one point where the two systems meet.
            </p>
          </div>

          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">
              <strong className="text-gray-600">Reporting an issue?</strong> If your concern is about
              street flooding, drainage, water service, or sewage, contact the Sewerage &amp; Water Board
              at <strong>504-529-2837</strong> or <a href="https://www.swbno.org" className="text-[#21355a] underline" target="_blank" rel="noopener noreferrer">swbno.org</a>.
              For concerns about levees, floodgates, or storm surge protection, contact us.
            </p>
          </div>
        </section>

        {/* Governance */}
        <section>
          <SectionSubheader title="Our Governance" />
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#65bc7b]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-[#65bc7b]" />
              </div>
              <div>
                <p className="text-gray-600 leading-relaxed mb-4">
                  SLFPA-E is governed by a board of commissioners appointed by the Governor and confirmed
                  by the Louisiana Senate. The Authority oversees two levee districts:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#21355a] rounded-full mt-2"></span>
                    <strong>Orleans Levee District (OLD)</strong> - Serving Orleans Parish
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#21355a] rounded-full mt-2"></span>
                    <strong>East Jefferson Levee District (EJLD)</strong> - Serving Jefferson Parish (East Bank)
                  </li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-4">
                  Together, these districts are responsible for protecting more than one million residents
                  across Orleans, Jefferson, and St. Bernard Parishes.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
