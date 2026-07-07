"use client";

import { Shield, Waves, Building2, Fence, Droplets, CircleDot } from "lucide-react";
import Link from "next/link";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import LeadershipSection from "@/components/LeadershipSection";
import { formatCurrency } from "@/data/siteData";
import { ABOUT_DEFAULTS } from "@/globals/pages/aboutPage";
import { usePageCopy } from "@/lib/usePageCopy";
import type { StaffPerson } from "@/lib/cms";

export default function AboutContent({ leaders }: { leaders: StaffPerson[] }) {
  const copy = usePageCopy("about-page", ABOUT_DEFAULTS);
  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={copy.pageTitle}
          subtitle={copy.pageSubtitle}
        />

        {/* Mission + Governance */}
        <section className="mb-12 pl-6 border-l-4 border-[#21355a]">
          <p className="text-gray-700 leading-relaxed text-lg">
            {copy.missionOverview}
          </p>
        </section>

        {/* HSDRRS + MR&T: Side-by-side panels */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-[#21355a] to-[#2c3859] rounded-xl p-6 text-white flex flex-col">
              <h2 className="text-xl font-bold mb-3">{copy.hsdrrsHeading}</h2>
              <p className="text-blue-100 text-sm leading-relaxed mb-2">
                {copy.hsdrrsIntro}
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
              <h2 className="text-xl font-bold mb-3">{copy.mrtHeading}</h2>
              <p className="text-teal-100 text-sm leading-relaxed mb-2">
                {copy.mrtIntro}
              </p>
              <p className="text-teal-100 text-sm leading-relaxed mb-5">
                {copy.mrtBody}{" "}
                <span className="text-white font-semibold">{copy.mrtBodyEmphasis}</span>.
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
          <SectionSubheader title={copy.responsibilitiesHeading} />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataCard title={copy.operateMaintainTitle}>
              <div className="space-y-3">
                <p className="text-gray-600">
                  {copy.operateMaintainBody}
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    {copy.operateMaintainItem1}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    {copy.operateMaintainItem2}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    {copy.operateMaintainItem3}
                  </li>
                </ul>
              </div>
            </DataCard>

            <DataCard title={copy.stormResponseTitle}>
              <div className="space-y-3">
                <p className="text-gray-600">
                  {copy.stormResponseBody}
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    {copy.stormResponseItem1}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    {copy.stormResponseItem2}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    {copy.stormResponseItem3}
                  </li>
                </ul>
              </div>
            </DataCard>

            <DataCard title={copy.permittingTitle}>
              <div className="space-y-3">
                <p className="text-gray-600">
                  {copy.permittingBody}
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    {copy.permittingItem1}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    {copy.permittingItem2}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#65bc7b] rounded-full mt-2"></span>
                    {copy.permittingItem3}
                  </li>
                </ul>
              </div>
            </DataCard>
          </div>
        </section>

        {/* Surge vs. Rain */}
        <section className="mb-12">
          <SectionSubheader title={copy.surgeDrainageHeading} />

          <p className="text-gray-600 leading-relaxed mb-6">
            {copy.surgeDrainageIntro}{" "}
            <strong>{copy.surgeDrainageIntroEmphasis}</strong>
            {copy.surgeDrainageIntroRest}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md border-t-4 border-[#21355a] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#21355a] rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#21355a]">{copy.slfpaCardTitle}</h3>
              </div>
              <p className="text-gray-600 mb-4 font-medium">
                {copy.slfpaCardLead}{" "}
                <span className="text-[#21355a]">{copy.slfpaCardLeadEmphasis}</span>{" "}
                {copy.slfpaCardLeadRest}
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  {copy.slfpaItem1}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  {copy.slfpaItem2}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  {copy.slfpaItem3}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  {copy.slfpaItem4}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#65bc7b] font-bold">&#10003;</span>
                  {copy.slfpaItem5}
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-md border-t-4 border-gray-400 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center">
                  <Droplets className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-700">{copy.swbnoCardTitle}</h3>
              </div>
              <p className="text-gray-600 mb-4 font-medium">
                {copy.swbnoCardLead}{" "}
                <span className="text-gray-700">{copy.swbnoCardLeadEmphasis}</span>
                {copy.swbnoCardLeadRest}
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  {copy.swbnoItem1}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  {copy.swbnoItem2}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  {copy.swbnoItem3}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  {copy.swbnoItem4}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold">&bull;</span>
                  {copy.swbnoItem5}
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 rounded-lg p-6">
            <h4 className="font-semibold text-[#21355a] mb-2">{copy.systemsConnectHeading}</h4>
            <p className="text-gray-600">
              {copy.systemsConnectBody}
            </p>
          </div>

          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">
              <strong className="text-gray-600">Reporting an issue?</strong> If your concern is about
              street flooding, drainage, water service, or sewage, contact the Sewerage &amp; Water Board
              at <strong>504-529-2837</strong> or <a href="https://www.swbno.org" className="text-[#21355a] underline" target="_blank" rel="noopener noreferrer">swbno.org</a>.
              For concerns about levees, floodgates, or storm surge protection,{" "}
              <Link href="/feedback" className="text-[#21355a] underline">contact us</Link>.
            </p>
          </div>
        </section>

        {/* Governance removed — content moved to top prose block */}

        <div className="mt-12">
          <LeadershipSection leaders={leaders} />
        </div>
      </div>
    </div>
  );
}
