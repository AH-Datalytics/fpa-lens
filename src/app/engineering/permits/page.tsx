"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Clock, CheckCircle, ArrowRight, FlaskConical, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import KPICard from "@/components/KPICard";

// ---------------------------------------------------------------------------
// SAMPLE DATA -- illustrative only. Real data from Vinformatix once schema confirmed.
// ---------------------------------------------------------------------------

const MONTHS = [
  "May '25","Jun '25","Jul '25","Aug '25","Sep '25","Oct '25",
  "Nov '25","Dec '25","Jan '26","Feb '26","Mar '26","Apr '26",
];

const STAGES    = ["Submitted","FPA Review","External Agency","Awaiting Applicant","Final Review"] as const;
const DISTRICTS = ["OLD","EJLD","LBBLD"] as const;
const APPLICANT_TYPES = [
  "Contractor / Developer",
  "Individual / Property Owner",
  "Government Agency",
  "Utility Company",
] as const;

type Stage         = typeof STAGES[number];
type District      = typeof DISTRICTS[number];
type ApplicantType = typeof APPLICANT_TYPES[number];

interface FakePermit {
  id: string;
  stage: Stage;
  district: District;
  applicantType: ApplicantType;
  submitMonth: string;
  daysOpen: number;
}

// Seeded LCG for deterministic fake data
function makeSeedRand(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

const FAKE_PERMITS: FakePermit[] = (() => {
  const rand = makeSeedRand(42);
  const pick = <T,>(items: readonly T[], weights: number[], r: number): T => {
    let cum = 0;
    for (let i = 0; i < items.length; i++) {
      cum += weights[i];
      if (r < cum) return items[i];
    }
    return items[items.length - 1];
  };

  // Weights match pre-aggregated sample distributions
  const stageW    = [95, 285, 312, 118, 37].map(n => n / 847);
  const districtW = [385, 295, 167].map(n => n / 847);
  const applicantW= [312, 248, 189, 98].map(n => n / 847);
  const monthW    = [0.06,0.08,0.07,0.09,0.07,0.12,0.11,0.05,0.10,0.07,0.09,0.09];

  return Array.from({ length: 847 }, (_, i) => ({
    id:            `P-2025-${String(i + 1001).padStart(4, "0")}`,
    stage:         pick(STAGES,         stageW,    rand()),
    district:      pick(DISTRICTS,      districtW, rand()),
    applicantType: pick(APPLICANT_TYPES,applicantW,rand()),
    submitMonth:   pick(MONTHS,         monthW,    rand()),
    daysOpen:      Math.floor(rand() * 290 + 10),
  }));
})();

// ---------------------------------------------------------------------------

const STAGE_META: Record<Stage, { label: string; note: string; color: string; bg: string; border: string }> = {
  "Submitted":          { label:"Submitted",           note:"Pre-review queue",             color:"text-[#21355a]",   bg:"bg-[#21355a]/5",   border:"border-[#21355a]/20" },
  "FPA Review":         { label:"FPA Review",          note:"Active internal review",        color:"text-[#21355a]",   bg:"bg-[#21355a]/5",   border:"border-[#21355a]/20" },
  "External Agency":    { label:"External Agency",     note:"Outside FPA's control",         color:"text-purple-700",  bg:"bg-purple-50",     border:"border-purple-300"   },
  "Awaiting Applicant": { label:"Awaiting Applicant",  note:"Ball in applicant's court",     color:"text-amber-700",   bg:"bg-amber-50",      border:"border-amber-300"    },
  "Final Review":       { label:"Issued / In Progress",note:"Permit issued, work underway",  color:"text-[#65bc7b]",   bg:"bg-green-50",      border:"border-[#65bc7b]"    },
};

const STAGE_TIMING: Record<Stage, number> = {
  "Submitted": 8, "FPA Review": 32, "External Agency": 45, "Awaiting Applicant": 16, "Final Review": 6,
};

const DISTRICT_COLORS: Record<District, string> = { OLD:"#21355a", EJLD:"#65bc7b", LBBLD:"#2FA4A9" };
const APPLICANT_COLORS = ["#21355a","#65bc7b","#2FA4A9","#8b5cf6"];

// ---------------------------------------------------------------------------
// Filter pill component
// ---------------------------------------------------------------------------
function FilterPills<T extends string>({
  label, options, value, onChange,
}: { label: string; options: readonly T[]; value: T | "All"; onChange: (v: T | "All") => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500 mr-0.5">{label}</span>
      <button
        onClick={() => onChange("All")}
        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${value === "All" ? "bg-[#21355a] text-white border-[#21355a]" : "bg-white text-gray-600 border-gray-300 hover:border-[#21355a]/50"}`}
      >All</button>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt === value ? "All" : opt)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${value === opt ? "bg-[#21355a] text-white border-[#21355a]" : "bg-white text-gray-600 border-gray-300 hover:border-[#21355a]/50"}`}
        >{opt}</button>
      ))}
    </div>
  );
}

const DATE_OPTIONS = ["Last 3 months","Last 6 months","Last 12 months"] as const;
type DateRange = typeof DATE_OPTIONS[number];

// ---------------------------------------------------------------------------

export default function PermitsPage() {
  const [showTiming,     setShowTiming]     = useState(false);
  const [districtFilter, setDistrictFilter] = useState<District | "All">("All");
  const [stageFilter,    setStageFilter]    = useState<Stage    | "All">("All");
  const [applicantFilter,setApplicantFilter]= useState<ApplicantType | "All">("All");
  const [dateFilter,     setDateFilter]     = useState<DateRange | "All">("All");

  const filtersActive = districtFilter !== "All" || stageFilter !== "All" || applicantFilter !== "All" || dateFilter !== "All";

  const clearFilters = () => {
    setDistrictFilter("All"); setStageFilter("All");
    setApplicantFilter("All"); setDateFilter("All");
  };

  const allowedMonths = useMemo(() => {
    if (dateFilter === "All") return MONTHS;
    const n = dateFilter === "Last 3 months" ? 3 : dateFilter === "Last 6 months" ? 6 : 12;
    return MONTHS.slice(-n);
  }, [dateFilter]);

  const filtered = useMemo(() => FAKE_PERMITS.filter(p =>
    (districtFilter === "All" || p.district === districtFilter) &&
    (stageFilter    === "All" || p.stage    === stageFilter)    &&
    (applicantFilter=== "All" || p.applicantType === applicantFilter) &&
    allowedMonths.includes(p.submitMonth)
  ), [districtFilter, stageFilter, applicantFilter, allowedMonths]);

  const stageCounts = useMemo(() => {
    const c: Partial<Record<Stage, number>> = {};
    for (const p of filtered) c[p.stage] = (c[p.stage] ?? 0) + 1;
    return c;
  }, [filtered]);

  const districtData = useMemo(() =>
    DISTRICTS.map(d => ({ name: d, count: filtered.filter(p => p.district === d).length }))
  , [filtered]);

  const applicantData = useMemo(() =>
    APPLICANT_TYPES.map(t => ({ name: t, count: filtered.filter(p => p.applicantType === t).length }))
      .sort((a, b) => b.count - a.count)
  , [filtered]);

  const monthlyData = useMemo(() =>
    allowedMonths.map(m => ({ month: m, count: filtered.filter(p => p.submitMonth === m).length }))
  , [filtered, allowedMonths]);

  const avgDaysOpen = useMemo(() =>
    filtered.length ? Math.round(filtered.reduce((s, p) => s + p.daysOpen, 0) / filtered.length) : 0
  , [filtered]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">

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

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2.5">
          <FilterPills label="District"      options={DISTRICTS}       value={districtFilter}  onChange={setDistrictFilter} />
          <FilterPills label="Stage"         options={STAGES}          value={stageFilter}     onChange={setStageFilter} />
          <FilterPills label="Applicant"     options={APPLICANT_TYPES} value={applicantFilter} onChange={setApplicantFilter} />
          <FilterPills label="Date range"    options={DATE_OPTIONS}    value={dateFilter}      onChange={setDateFilter} />
          {filtersActive && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-1">
              <X className="h-3 w-3" /> Clear all filters
            </button>
          )}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Active in Pipeline"
            value={filtered.length.toLocaleString()}
            icon={<FileText className="h-5 w-5" />}
            subtitle={filtersActive ? "matching filters" : "currently under review"}
          />
          <KPICard
            label="Avg Days Open"
            value={avgDaysOpen}
            unit="days"
            icon={<Clock className="h-5 w-5" />}
            subtitle="for filtered permits"
          />
          <KPICard
            label="Avg Processing Time"
            value={107}
            unit="days"
            icon={<Clock className="h-5 w-5" />}
            subtitle="last 12 months, historical"
          />
          <KPICard
            label="Approval Rate"
            value={84}
            unit="%"
            icon={<CheckCircle className="h-5 w-5" />}
            subtitle="last 12 months, historical"
          />
        </div>

        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-[#21355a] mb-4">Permits by Submission Month</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number | undefined) => [v ?? "—", "Permits"]} />
              <Bar dataKey="count" name="Permits" fill="#21355a" radius={[3, 3, 0, 0]} />
            </BarChart>
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
                {STAGES.map((stage, i) => {
                  const meta = STAGE_META[stage];
                  return (
                    <div key={stage} className="flex flex-col sm:flex-row items-center flex-1">
                      <div className={`flex flex-col items-center justify-center px-3 py-4 rounded-lg border-2 w-full text-center min-h-[90px] ${meta.bg} ${meta.border}`}>
                        <span className={`text-2xl font-bold ${meta.color}`}>{STAGE_TIMING[stage]}d</span>
                        <span className="text-xs font-semibold text-gray-700 mt-1">{stage}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{meta.note}</span>
                      </div>
                      {i < STAGES.length - 1 && (
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
                {STAGES.map((stage, i) => {
                  const meta  = STAGE_META[stage];
                  const count = stageCounts[stage] ?? 0;
                  return (
                    <div key={stage} className="flex flex-col sm:flex-row items-center flex-1">
                      <div className={`flex flex-col items-center justify-center px-4 py-4 rounded-lg border-2 w-full text-center min-h-[90px] ${meta.bg} ${meta.border}`}>
                        <span className={`text-2xl font-bold ${meta.color}`}>{count.toLocaleString()}</span>
                        <span className="text-xs font-semibold text-gray-700 mt-1">{meta.label}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{meta.note}</span>
                      </div>
                      {i < STAGES.length - 1 && (
                        <>
                          <div className="hidden sm:flex flex-col items-center mx-1 flex-shrink-0">
                            <span className="text-[10px] text-gray-400 mb-0.5">{STAGE_TIMING[stage]}d avg</span>
                            <ArrowRight className="h-4 w-4 text-gray-300" />
                          </div>
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
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={districtData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={48} />
                <Tooltip formatter={(v: number | undefined) => [v != null ? v.toLocaleString() : "—", "Permits"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {districtData.map(entry => (
                    <Cell key={entry.name} fill={DISTRICT_COLORS[entry.name as District] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-[#21355a] mb-4">Active Permits by Applicant Type</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={applicantData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
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

        <p className="text-xs text-gray-400">Sample data only. Vinformatix Permitting System will supply live data once schema is confirmed.</p>
      </div>
    </div>
  );
}
