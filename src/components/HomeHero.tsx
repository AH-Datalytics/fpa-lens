"use client";

import Image from "next/image";
import StatusBadge from "@/components/StatusBadge";
import SiteGuide from "@/components/SiteGuide";
import { siteConfig, StatusLevel } from "@/data/siteData";
import { usePageCopy } from "@/lib/usePageCopy";
import { HOME_DEFAULTS } from "@/globals/HomeContent";

/**
 * Home page hero. Rendered as a Client Component so the editable headline
 * updates in real time inside the Payload admin Live Preview iframe (before
 * save). The overall-status badge/tooltip are computed on the server and passed
 * in as props; the supporting subtext is fixed here.
 */
export default function HomeHero({
  overallStatus,
  overallTooltip,
}: {
  overallStatus: StatusLevel;
  overallTooltip: string;
}) {
  const copy = usePageCopy("home-content", HOME_DEFAULTS);
  return (
    <section className="relative bg-gradient-to-br from-[#21355a] via-[#2c3859] to-[#21355a] text-white">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
      <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-28 sm:px-6 lg:px-8 lg:pt-12 lg:pb-32">
        <div className="absolute top-10 right-4 sm:right-6 lg:right-8 z-10">
          <SiteGuide />
        </div>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <StatusBadge status={overallStatus} size="md" tooltip={overallTooltip} />
              <span className="text-sm text-blue-200">All Systems Operational</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              {copy.heroHeading}
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
  );
}
