"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Clock, Users, Building2, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import KPICard from "@/components/KPICard";

interface Permit {
  permitId: string;
  permitSubmitDate: string | null;
  permitStatus: string;
  permitStatusDate: string | null;
  lnoDate: string | null;
  leveeDistrict: string | null;
  infoRequestedDate: string | null;
  applicantType: string | null;
  projectDescription: string | null;
}

// Map raw API statuses to pipeline stages
const STAGE_MAP: Record<string, string> = {
  "Pre Review":                              "Submitted",
  "With Permitting Office for Initial Review": "FPA Review",
  "Under Review - Permitting Office":         "FPA Review",
  "Under Review - 3rd Party":                 "External Agency",
  "With Applicant or Agent for Signature":    "Awaiting Applicant",
  "With Permitting Office for Signature":     "Final Review",
  "Pending Completion":                       "Final Review",
};

const PIPELINE_STAGES = [
  { key: "Submitted",         label: "Submitted",          note: "Pre-review queue" },
  { key: "FPA Review",        label: "FPA Review",         note: "Active internal review" },
  { key: "External Agency",   label: "External Agency",    note: "Outside FPA's control" },
  { key: "Awaiting Applicant",label: "Awaiting Applicant", note: "Ball in applicant's court" },
  { key: "Final Review",      label: "Issued / In Progress", note: "Permit issued, work underway" },
];

const DISTRICT_LABELS: Record<string, string> = {
  "Orleans Levee District":       "OLD",
  "East Jefferson Levee District":"EJLD",
  "Lake Borgne Levee District":   "LBBLD",
};

const DISTRICT_COLORS: Record<string, string> = {
  OLD:   "#21355a",
  EJLD:  "#65bc7b",
  LBBLD: "#2FA4A9",
};

const APPLICANT_COLORS = ["#21355a", "#65bc7b", "#2FA4A9", "#8b5cf6"];

export default function PermitsPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/permits")
      .then((r) => r.json())
      .then((data) => { setPermits(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of PIPELINE_STAGES) counts[stage.key] = 0;
    for (const p of permits) {
      const stage = STAGE_MAP[p.permitStatus ?? ""];
      if (stage) counts[stage]++;
    }
    return counts;
  }, [permits]);

  const districtData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of permits) {
      const label = DISTRICT_LABELS[p.leveeDistrict ?? ""] ?? "Other";
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [permits]);

  const applicantData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of permits) {
      const type = p.applicantType ?? "Unknown";
      counts[type] = (counts[type] ?? 0) + 1;
    }
    return Object.entries(counts)
      .filter(([k]) => k !== "Unknown")
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [permits]);

  const inFPAReview = (stageCounts["Submitted"] ?? 0) + (stageCounts["FPA Review"] ?? 0);
  const externalCount = stageCounts["External Agency"] ?? 0;
  const awaitingApplicant = stageCounts["Awaiting Applicant"] ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading permit data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500 text-sm">Failed to load permit data.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link href="/engineering" className="inline-flex items-center gap-1.5 text-sm text-[#21355a] hover:underline mb-3">
            <ArrowLeft className="h-4 w-4" /> Back to Engineering
          </Link>
          <h1 className="text-3xl font-bold text-[#21355a]">Permit Overview</h1>
          <p className="mt-1 text-gray-600">SLFPA-East reviews permit applications for construction, encroachments, and events on or near the levee system.</p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Active Permits"
            value={permits.length.toLocaleString()}
            icon={<FileText className="h-5 w-5" />}
            subtitle="currently in pipeline"
          />
          <KPICard
            label="In FPA Review"
            value={inFPAReview.toLocaleString()}
            icon={<Clock className="h-5 w-5" />}
            subtitle="under active review"
          />
          <KPICard
            label="With External Agency"
            value={externalCount.toLocaleString()}
            icon={<Building2 className="h-5 w-5" />}
            subtitle="outside FPA's control"
          />
          <KPICard
            label="Awaiting Applicant"
            value={awaitingApplicant.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
            subtitle="pending applicant response"
          />
        </div>

        {/* Pipeline flow with live counts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-[#21355a] mb-4">Active Pipeline — Where Permits Stand Today</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
            {PIPELINE_STAGES.map((stage, i) => {
              const count = stageCounts[stage.key] ?? 0;
              const isExternal = stage.key === "External Agency";
              const isAwaiting = stage.key === "Awaiting Applicant";
              const isFinal = stage.key === "Final Review";
              return (
                <div key={stage.key} className="flex flex-col sm:flex-row items-center flex-1">
                  <div className={`flex flex-col items-center justify-center px-4 py-4 rounded-lg border-2 w-full text-center min-h-[90px] ${
                    isFinal ? "border-[#65bc7b] bg-green-50" :
                    isExternal ? "border-purple-300 bg-purple-50" :
                    isAwaiting ? "border-amber-300 bg-amber-50" :
                    "border-[#21355a]/20 bg-[#21355a]/5"
                  }`}>
                    <span className={`text-2xl font-bold ${
                      isFinal ? "text-[#65bc7b]" :
                      isExternal ? "text-purple-700" :
                      isAwaiting ? "text-amber-700" :
                      "text-[#21355a]"
                    }`}>{count.toLocaleString()}</span>
                    <span className="text-xs font-semibold text-gray-700 mt-1">{stage.label}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">{stage.note}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <>
                      <ArrowRight className="hidden sm:block h-4 w-4 text-gray-300 mx-1 flex-shrink-0" />
                      <ArrowRight className="sm:hidden h-4 w-4 text-gray-300 rotate-90 my-1 self-center" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Permits in &ldquo;External Agency&rdquo; and &ldquo;Awaiting Applicant&rdquo; stages are outside FPA&rsquo;s active review queue.
            Source: Vinformatix · Updates hourly
          </p>
        </div>

        {/* District + Applicant breakdown */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-[#21355a] mb-4">Permits by Levee District</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={districtData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={48} />
                <Tooltip formatter={(v: number | undefined) => [v != null ? v.toLocaleString() : "—", "Permits"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {districtData.map((entry) => (
                    <Cell key={entry.name} fill={DISTRICT_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-[#21355a] mb-4">Permits by Applicant Type</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={applicantData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={128} />
                <Tooltip formatter={(v: number | undefined) => [v != null ? v.toLocaleString() : "—", "Permits"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {applicantData.map((entry, i) => (
                    <Cell key={entry.name} fill={APPLICANT_COLORS[i % APPLICANT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-xs text-gray-400">Source: Vinformatix Permitting System · Data refreshes hourly</p>
      </div>
    </div>
  );
}
