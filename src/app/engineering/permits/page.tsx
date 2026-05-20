"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Clock, CheckCircle, ArrowRight, FlaskConical } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from "recharts";
import KPICard from "@/components/KPICard";

// ---------------------------------------------------------------------------
// SAMPLE DATA — illustrative only. Real data from Vinformatix once schema confirmed.
// ---------------------------------------------------------------------------

const SAMPLE_PIPELINE = [
  { key: "Submitted",          label: "Submitted",           note: "Pre-review queue",             count: 95 },
  { key: "FPA Review",         label: "FPA Review",          note: "Active internal review",        count: 285 },
  { key: "External Agency",    label: "External Agency",     note: "Outside FPA's control",         count: 312 },
  { key: "Awaiting Applicant", label: "Awaiting Applicant",  note: "Ball in applicant's court",     count: 118 },
  { key: "Final Review",       label: "Issued / In Progress",note: "Permit issued, work underway",  count: 37 },
];
// Total active: 847

const SAMPLE_STAGE_TIMING = [
  { stage: "Submitted",          days: 8,  note: "Pre-review queue" },
  { stage: "FPA Review",         days: 32, note: "Internal engineering review" },
  { stage: "External Agency",    days: 45, note: "LNO and third-party sign-off" },
  { stage: "Awaiting Applicant", days: 16, note: "Applicant signatures / docs" },
  { stage: "Final Review",       days: 6,  note: "Issuance and completion" },
];
// Total avg: 107 days

const SAMPLE_MONTHLY = [
  { month: "May '25",  issued: 24, approved: 19 },
  { month: "Jun '25",  issued: 31, approved: 26 },
  { month: "Jul '25",  issued: 28, approved: 22 },
  { month: "Aug '25",  issued: 35, approved: 29 },
  { month: "Sep '25",  issued: 25, approved: 21 },
  { month: "Oct '25",  issued: 50, approved: 43 },
  { month: "Nov '25",  issued: 46, approved: 38 },
  { month: "Dec '25",  issued: 10, approved:  9 },
  { month: "Jan '26",  issued: 42, approved: 36 },
  { month: "Feb '26",  issued: 25, approved: 21 },
  { month: "Mar '26",  issued: 27, approved: 23 },
  { month: "Apr '26",  issued: 27, approved: 22 },
];

const SAMPLE_DISTRICTS = [
  { name: "OLD",   count: 385 },
  { name: "EJLD",  count: 295 },
  { name: "LBBLD", count: 167 },
];

const SAMPLE_APPLICANTS = [
  { name: "Contractor / Developer",      count: 312 },
  { name: "Individual / Property Owner", count: 248 },
  { name: "Government Agency",           count: 189 },
  { name: "Utility Company",             count:  98 },
];

// ---------------------------------------------------------------------------

const DISTRICT_COLORS: Record<string, string> = {
  OLD:   "#21355a",
  EJLD:  "#65bc7b",
  LBBLD: "#2FA4A9",
};

const APPLICANT_COLORS = ["#21355a", "#65bc7b", "#2FA4A9", "#8b5cf6"];

export default function PermitsPage() {
  const [showTiming, setShowTiming] = useState(false);

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

        {/* Sample data banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-900">
          <FlaskConical className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <span className="font-semibold">Sample data only.</span>{" "}
            All figures on this page are illustrative. This layout is pending approval from FPA leadership before Vinformatix connects the live database.
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Active in Pipeline"
            value={(847).toLocaleString()}
            icon={<FileText className="h-5 w-5" />}
            subtitle="currently under review"
          />
          <KPICard
            label="Issued (Apr 2026)"
            value={27}
            unit="permits"
            icon={<CheckCircle className="h-5 w-5" />}
            subtitle="this month"
          />
          <KPICard
            label="Avg Processing Time"
            value={107}
            unit="days"
            icon={<Clock className="h-5 w-5" />}
            subtitle="last 12 months"
          />
          <KPICard
            label="Approval Rate"
            value={84}
            unit="%"
            icon={<CheckCircle className="h-5 w-5" />}
            subtitle="last 12 months"
          />
        </div>

        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-[#21355a] mb-4">Monthly Permits Issued vs. Approved</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={SAMPLE_MONTHLY} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="issued"   name="Issued"   stroke="#21355a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="approved" name="Approved" stroke="#65bc7b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline flow */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#21355a]">Active Pipeline: Where Permits Stand Today</h3>
            <button
              onClick={() => setShowTiming(!showTiming)}
              className="text-xs font-medium text-[#21355a] hover:text-[#21355a]/70 border border-gray-300 rounded-md px-2.5 py-1 transition-colors"
            >
              {showTiming ? "Show pipeline" : "Show timing"}
            </button>
          </div>

          {showTiming ? (
            <div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
                {SAMPLE_STAGE_TIMING.map((stage, i) => {
                  const isFinal = i === SAMPLE_STAGE_TIMING.length - 1;
                  const isExternal = stage.stage === "External Agency";
                  const isAwaiting = stage.stage === "Awaiting Applicant";
                  return (
                    <div key={stage.stage} className="flex flex-col sm:flex-row items-center flex-1">
                      <div className={`flex flex-col items-center justify-center px-3 py-4 rounded-lg border-2 w-full text-center min-h-[90px] ${
                        isFinal    ? "border-[#65bc7b] bg-green-50" :
                        isExternal ? "border-purple-300 bg-purple-50" :
                        isAwaiting ? "border-amber-300 bg-amber-50" :
                        "border-[#21355a]/20 bg-[#21355a]/5"
                      }`}>
                        <span className={`text-2xl font-bold ${
                          isFinal    ? "text-[#65bc7b]" :
                          isExternal ? "text-purple-700" :
                          isAwaiting ? "text-amber-700" :
                          "text-[#21355a]"
                        }`}>{stage.days}d</span>
                        <span className="text-xs font-semibold text-gray-700 mt-1">{stage.stage}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{stage.note}</span>
                      </div>
                      {i < SAMPLE_STAGE_TIMING.length - 1 && (
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
                Average days spent in each stage · Total avg: 107 days · LNO = Letter of No Objection · Source: sample data
              </p>
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
                {SAMPLE_PIPELINE.map((stage, i) => {
                  const isExternal = stage.key === "External Agency";
                  const isAwaiting = stage.key === "Awaiting Applicant";
                  const isFinal    = stage.key === "Final Review";
                  return (
                    <div key={stage.key} className="flex flex-col sm:flex-row items-center flex-1">
                      <div className={`flex flex-col items-center justify-center px-4 py-4 rounded-lg border-2 w-full text-center min-h-[90px] ${
                        isFinal    ? "border-[#65bc7b] bg-green-50" :
                        isExternal ? "border-purple-300 bg-purple-50" :
                        isAwaiting ? "border-amber-300 bg-amber-50" :
                        "border-[#21355a]/20 bg-[#21355a]/5"
                      }`}>
                        <span className={`text-2xl font-bold ${
                          isFinal    ? "text-[#65bc7b]" :
                          isExternal ? "text-purple-700" :
                          isAwaiting ? "text-amber-700" :
                          "text-[#21355a]"
                        }`}>{stage.count.toLocaleString()}</span>
                        <span className="text-xs font-semibold text-gray-700 mt-1">{stage.label}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{stage.note}</span>
                      </div>
                      {i < SAMPLE_PIPELINE.length - 1 && (
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
                Permits in &ldquo;External Agency&rdquo; and &ldquo;Awaiting Applicant&rdquo; are outside FPA&rsquo;s active review queue. Source: sample data
              </p>
            </div>
          )}
        </div>

        {/* District + Applicant breakdown */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-[#21355a] mb-4">Active Permits by Levee District</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={SAMPLE_DISTRICTS} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={48} />
                <Tooltip formatter={(v: number | undefined) => [v != null ? v.toLocaleString() : "—", "Permits"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {SAMPLE_DISTRICTS.map((entry) => (
                    <Cell key={entry.name} fill={DISTRICT_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-[#21355a] mb-4">Active Permits by Applicant Type</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={SAMPLE_APPLICANTS} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
                <Tooltip formatter={(v: number | undefined) => [v != null ? v.toLocaleString() : "—", "Permits"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {SAMPLE_APPLICANTS.map((entry, i) => (
                    <Cell key={entry.name} fill={APPLICANT_COLORS[i % APPLICANT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-xs text-gray-400">Sample data only. Vinformatix Permitting System will supply live data once schema is confirmed.</p>
      </div>
    </div>
  );
}
