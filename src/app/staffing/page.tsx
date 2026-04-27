"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, ChevronDown, ChevronRight, X, ArrowRight } from "lucide-react";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import StaffingZoneBar from "@/components/StaffingZoneBar";
import ZoneLegend from "@/components/ZoneLegend";
import { staffingData } from "@/data/siteData";
import { assertAggregateMatchesSum } from "@/lib/staffingZones";

interface Person {
  name: string;
  title: string;
  image?: string;
  bio?: string;
}

function PersonCard({ person, onOpen }: { person: Person; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`View bio for ${person.name}`}
      className="group relative bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#21355a]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#21355a] focus-visible:ring-offset-2"
    >
      <div className="relative w-24 h-24 mb-3 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ring-2 ring-transparent group-hover:ring-[#21355a]/20 transition-all">
        {person.image ? (
          <Image
            src={person.image}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-semibold">
            {person.name.charAt(0)}
          </div>
        )}
      </div>
      <p className="font-semibold text-[#21355a] leading-tight">{person.name}</p>
      <p className="text-sm text-gray-600 mt-1 leading-snug">{person.title}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#21355a]/70 group-hover:text-[#21355a] transition-colors">
        Read bio
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </button>
  );
}

function BioModal({ person, onClose }: { person: Person; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bio-modal-name"
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]"
    >
      <button
        type="button"
        aria-label="Close bio"
        onClick={onClose}
        className="absolute inset-0 bg-[#0b1626]/70 backdrop-blur-sm"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-[scaleIn_180ms_cubic-bezier(0.16,1,0.3,1)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-[#21355a] shadow-sm transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="bg-gradient-to-br from-[#21355a] to-[#2c4470] h-24" aria-hidden="true" />
        <div className="px-6 pb-6 -mt-16">
          <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden bg-white ring-4 ring-white shadow-lg">
            {person.image ? (
              <Image
                src={person.image}
                alt=""
                fill
                sizes="128px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-4xl font-semibold">
                {person.name.charAt(0)}
              </div>
            )}
          </div>
          <h3 id="bio-modal-name" className="mt-4 text-xl font-bold text-[#21355a] text-center">
            {person.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-gray-600 text-center">{person.title}</p>
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed">
              {person.bio ?? "Bio pending."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type ZoneViewMode = "percent" | "raw";

export default function OurTeamPage() {
  const { coreFPU, opSupport } = staffingData;
  const [viewMode, setViewMode] = useState<ZoneViewMode>("percent");
  const [showDepts, setShowDepts] = useState(false);
  const [activePerson, setActivePerson] = useState<Person | null>(null);

  if (typeof window !== "undefined") {
    assertAggregateMatchesSum(coreFPU.aggregate, coreFPU.departments);
  }

  const aggregateFull = coreFPU.aggregate.full;
  const scaleFor = (full: number) =>
    viewMode === "raw" && aggregateFull > 0 ? full / aggregateFull : 1;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Staffing"
          subtitle="The dedicated professionals protecting Greater New Orleans"
          source={staffingData.source}
        />

        {/* Summary line */}
        <section className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <span className="text-2xl font-bold text-[#21355a]">
                {staffingData.headcount.total}
              </span>
              <span className="ml-2 text-sm text-gray-600">total staff</span>
              <span className="ml-1 text-xs text-gray-500">
                ({staffingData.headcount.classified} classified,{" "}
                {staffingData.headcount.unclassified} unclassified)
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold text-amber-500">
                {staffingData.headcount.vacancies}
              </span>
              <span className="ml-2 text-sm text-gray-600">vacancies agency-wide</span>
            </div>
            <div className="text-xs text-gray-500 ml-auto">
              As of {staffingData.asOfDate}
            </div>
          </div>
        </section>

        {/* Core Flood Protection Unit — zone framework */}
        <section className="mb-10">
          <SectionSubheader title="Core Flood Protection Unit" />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <p className="text-sm text-gray-600 max-w-2xl">
                Operational capacity across Maintenance, Operations, and
                Engineering. Thresholds set by {coreFPU.thresholdsSetBy} in{" "}
                {coreFPU.thresholdsDate}.
              </p>
              <div
                role="group"
                aria-label="Bar width view"
                className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("percent")}
                  aria-pressed={viewMode === "percent"}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === "percent"
                      ? "bg-[#21355a] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Percentage
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("raw")}
                  aria-pressed={viewMode === "raw"}
                  className={`px-3 py-1 rounded transition-colors ${
                    viewMode === "raw"
                      ? "bg-[#21355a] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Raw count
                </button>
              </div>
            </div>

            {/* Color-coded definitions legend */}
            <div className="mb-6">
              <ZoneLegend />
            </div>

            {coreFPU.isMockPreview && (
              <div className="mb-6 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Demo data.</strong> Per-department headcount is a
                  placeholder preview; real numbers arrive from HR the week of
                  April 27, 2026.
                </span>
              </div>
            )}

            <div className="mb-5">
              <StaffingZoneBar
                group={coreFPU.aggregate}
                variant="full"
                widthScale={1}
                axisMode={viewMode}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowDepts((s) => !s)}
              aria-expanded={showDepts}
              className="flex items-center gap-1.5 text-sm font-medium text-[#21355a] hover:underline"
            >
              {showDepts ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              {showDepts
                ? "Hide department breakdown"
                : "Show department breakdown"}
            </button>

            {showDepts && (
              <div className="mt-5 ml-2 pl-5 border-l-2 border-gray-200">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-4">
                  By department
                </p>
                <div className="space-y-7">
                  {coreFPU.departments.map((dept) => (
                    <StaffingZoneBar
                      key={dept.key}
                      group={dept}
                      variant="full"
                      widthScale={scaleFor(dept.full)}
                      axisMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-6">
              Red zone thresholds are provisional pending validation against
              2020 low-headcount data.
            </p>
          </div>
        </section>

        {/* Operational Support — placeholder */}
        <section className="mb-10">
          <SectionSubheader title={opSupport.label} />
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6">
            <p className="text-sm text-gray-600">
              Covering {opSupport.groups.join(", ")}.
            </p>
            <p className="text-sm text-gray-500 italic mt-2">
              {opSupport.note}.
            </p>
          </div>
        </section>

        {/* Leadership */}
        <section>
          <SectionSubheader title="Leadership" />
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {staffingData.leadership.map((leader) => (
              <PersonCard
                key={leader.name}
                person={leader}
                onOpen={() => setActivePerson(leader)}
              />
            ))}
          </div>
        </section>
      </div>
      {activePerson && (
        <BioModal person={activePerson} onClose={() => setActivePerson(null)} />
      )}
    </div>
  );
}
