import { Shield, Waves, Building2, Fence, Droplets, CircleDot } from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import LeadershipSection from "@/components/LeadershipSection";
import { formatCurrency } from "@/data/siteData";

export default function WhatWeDoPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="About Us"
          subtitle="Protecting Greater New Orleans from hurricane surge and Mississippi River flooding"
        />

        {/* Mission + Governance */}
        <section className="mb-12 pl-6 border-l-4 border-[#21355a]">
          <p className="text-gray-700 leading-relaxed text-lg">
            The Southeast Louisiana Flood Protection Authority - East (SLFPA-E) was established
            after Hurricane Katrina as the regional governmental body responsible for a restored,
            strengthened, and enhanced multi-parish integrated hurricane and flood protection system.
            Governed by a board of commissioners appointed by the Governor and confirmed by the Louisiana Senate,
            the Authority oversees the Orleans Levee District (OLD) and East Jefferson Levee District (EJLD),
            together protecting more than one million residents across Orleans, Jefferson, and St. Bernard Parishes.
          </p>
        </section>

        {/* HSDRRS + MR&T: Side-by-side panels */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-[#21355a] to-[#2c3859] rounded-xl p-6 text-white flex flex-col">
              <h2 className="text-xl font-bold mb-3">The Hurricane &amp; Storm Damage Risk Reduction System</h2>
              <p className="text-blue-100 text-sm leading-relaxed mb-2">
                More than a million neighbors in New Orleans and its surrounding areas are better protected from hurricane-driven flooding today than ever before.
              </p>
              <p className="text-blue-100 text-sm leading-relaxed mb-5">
                The <span className="text-white font-semibold">{formatCurrency(14600000000)}</span> HSDRRS provides defense against a 100-year storm surge for Orleans, Jefferson, and St. Bernard Parishes.
              </p>
              <div className="mt-auto grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { Icon: Waves, label: "Levees", sub: "Earthen barriers" },
                  { Icon: Building2, label: "Floodwalls", sub: "Concrete barriers" },
                  { Icon: Fence, label: "Floodgates", sub: "Surge barriers" },
                  { Icon: Droplets, label: "PCCP", sub: "Canal pumps" },
                ] as const).map(({ Icon, label, sub }) => (
                  <div key={label} className="bg-white/10 rounded-lg p-3 text-center">
                    <Icon className="h-5 w-5 mx-auto mb-1.5" />
                    <div className="text-sm font-bold leading-tight">{label}</div>
                    <div className="text-xs text-blue-200 mt-0.5 leading-tight">{sub}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#1f4d52] to-[#2c6770] rounded-xl p-6 text-white flex flex-col">
              <h2 className="text-xl font-bold mb-3">The Mississippi River &amp; Tributaries Project</h2>
              <p className="text-teal-100 text-sm leading-relaxed mb-2">
                Authorized by the Flood Control Act of 1928 after the Great Flood of 1927, MR&amp;T is one of the largest civil works projects in U.S. history.
              </p>
              <p className="text-teal-100 text-sm leading-relaxed mb-5">
                The east-bank river levees and floodwalls in Orleans and Jefferson Parishes are part of this national system.{" "}
                <span className="text-white font-semibold">SLFPA-E operates and maintains it locally</span>.
              </p>
              <div className="mt-auto grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { Icon: Waves, label: "River Levees", sub: "Earthen embankments" },
                  { Icon: Building2, label: "Floodwalls", sub: "Concrete barriers" },
                  { Icon: Fence, label: "Floodgates", sub: "Railroad & street" },
                  { Icon: CircleDot, label: "Relief Wells", sub: "Manage under-seepage" },
                ] as const).map(({ Icon, label, sub }) => (
                  <div key={label} className="bg-white/10 rounded-lg p-3 text-center">
                    <Icon className="h-5 w-5 mx-auto mb-1.5" />
                    <div className="text-sm font-bold leading-tight">{label}</div>
                    <div className="text-xs text-teal-200 mt-0.5 leading-tight">{sub}</div>
                  </div>
                ))}
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

          <p className="text-gray-600 leading-relaxed mb-6">
            Greater New Orleans has two separate flood protection systems run by two separate agencies.
            SLFPA-E is the <strong>outer perimeter</strong>: we keep hurricane surge and lake water out.
            The Sewerage &amp; Water Board of New Orleans (SWBNO) handles everything inside that perimeter:
            drainage pumps, storm drains, drinking water, and sewage. We do not operate drainage pump
            stations, and SWBNO does not operate levees or floodgates. The two systems are complementary
            but independent.
          </p>

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

        {/* Governance removed — content moved to top prose block */}

        <div className="mt-12">
          <LeadershipSection />
        </div>
      </div>
    </div>
  );
}
