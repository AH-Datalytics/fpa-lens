"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle, ArrowRight, FlaskConical, X, AlertCircle, HelpCircle } from "lucide-react";
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

const STAGES       = ["Submitted","FPA Review","External Agency","Awaiting Applicant","Final Review"] as const;
const DISTRICTS    = ["OLD","EJLD","LBBLD"] as const;
const PERMIT_TYPES = ["Levee Safety","Canal","Event","After the Fact"] as const;

type Stage      = typeof STAGES[number];
type District   = typeof DISTRICTS[number];
type PermitType = typeof PERMIT_TYPES[number];

interface FakePermit {
  id: string;
  stage: Stage | "Closed";
  district: District;
  permitType: PermitType;
  submitMonth: string;
  daysOpen: number;
  processingDays: number;
  isApproved: boolean | null;
}

function makeSeedRand(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

const FAKE_PERMITS: FakePermit[] = (() => {
  const rand = makeSeedRand(42);
  const pick = <T,>(items: readonly T[], weights: number[], r: number): T => {
    let cum = 0;
    for (let i = 0; i < items.length; i++) { cum += weights[i]; if (r < cum) return items[i]; }
    return items[items.length - 1];
  };

  const stageW   = [95, 285, 312, 118, 37].map(n => n / 847);
  const districtW= [385, 295, 167].map(n => n / 847);
  const typeW    = [0.45, 0.28, 0.17, 0.10];
  const monthW   = [0.06,0.08,0.07,0.09,0.07,0.12,0.11,0.05,0.10,0.07,0.09,0.09];

  const active: FakePermit[] = Array.from({ length: 847 }, (_, i) => ({
    id: `P-A-${i + 1001}`,
    stage:         pick(STAGES,        stageW,    rand()) as Stage,
    district:      pick(DISTRICTS,     districtW, rand()),
    permitType:    pick(PERMIT_TYPES,  typeW,     rand()),
    submitMonth:   pick(MONTHS,        monthW,    rand()),
    daysOpen:      Math.floor(rand() * 290 + 10),
    processingDays:0,
    isApproved:    null,
  }));

  const closed: FakePermit[] = Array.from({ length: 350 }, (_, i) => ({
    id: `P-C-${i + 2001}`,
    stage:          "Closed" as const,
    district:       pick(DISTRICTS,    districtW, rand()),
    permitType:     pick(PERMIT_TYPES, typeW,     rand()),
    submitMonth:    pick(MONTHS,       monthW,    rand()),
    daysOpen:       0,
    processingDays: Math.floor(rand() * 180 + 30),
    isApproved:     rand() < 0.84,
  }));

  return [...active, ...closed];
})();

// ---------------------------------------------------------------------------

const STAGE_CONTROL: Record<Stage, "fpa" | "external"> = {
  "Submitted":          "fpa",
  "FPA Review":         "fpa",
  "External Agency":    "external",
  "Awaiting Applicant": "external",
  "Final Review":       "fpa",
};

const STAGE_META: Record<Stage, { label: string; color: string; labelColor: string; border: string }> = {
  "Submitted":          { label:"Submitted",            color:"text-[#21355a]", labelColor:"text-[#21355a]", border:"border-gray-200" },
  "FPA Review":         { label:"FPA Review",           color:"text-[#21355a]", labelColor:"text-[#21355a]", border:"border-gray-200" },
  "External Agency":    { label:"External Agency",      color:"text-gray-400",  labelColor:"text-gray-400",  border:"border-gray-200" },
  "Awaiting Applicant": { label:"Awaiting Applicant",   color:"text-gray-400",  labelColor:"text-gray-400",  border:"border-gray-200" },
  "Final Review":       { label:"Issued / In Progress", color:"text-[#21355a]", labelColor:"text-[#21355a]", border:"border-gray-200" },
};

const STAGE_TIMING: Record<Stage, number> = {
  "Submitted": 8, "FPA Review": 32, "External Agency": 45, "Awaiting Applicant": 16, "Final Review": 6,
};

const FPA_DAYS      = STAGES.filter(s => STAGE_CONTROL[s] === "fpa").reduce((sum, s) => sum + STAGE_TIMING[s], 0);
const EXTERNAL_DAYS = STAGES.filter(s => STAGE_CONTROL[s] !== "fpa").reduce((sum, s) => sum + STAGE_TIMING[s], 0);
const TOTAL_DAYS    = FPA_DAYS + EXTERNAL_DAYS;

const DISTRICT_COLORS: Record<District, string> = { OLD:"#21355a", EJLD:"#65bc7b", LBBLD:"#2FA4A9" };

const TYPE_COLORS: Record<PermitType, string> = {
  "Levee Safety":   "#21355a",
  "Canal":          "#2FA4A9",
  "Event":          "#65bc7b",
  "After the Fact": "#f59e0b",
};

// ---------------------------------------------------------------------------

function FilterPills<T extends string>({
  label, options, value, onChange,
}: { label: string; options: readonly T[]; value: T | "All"; onChange: (v: T | "All") => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500 w-24 shrink-0">{label}</span>
      <button onClick={() => onChange("All")}
        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${value === "All" ? "bg-[#21355a] text-white border-[#21355a]" : "bg-white text-gray-600 border-gray-300 hover:border-[#21355a]/50"}`}>
        All
      </button>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt === value ? "All" : opt)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${value === opt ? "bg-[#21355a] text-white border-[#21355a]" : "bg-white text-gray-600 border-gray-300 hover:border-[#21355a]/50"}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

const YTD_MONTHS = MONTHS.filter(m => m.includes("'26")); // Jan '26 – Apr '26

const DATE_OPTIONS = ["This year (YTD)","Last 3 months","Last 6 months","Last 12 months"] as const;
type DateRange = typeof DATE_OPTIONS[number];

// ---------------------------------------------------------------------------

export default function PermitsPage() {
  const [districtFilter, setDistrictFilter] = useState<District   | "All">("All");
  const [stageFilter,    setStageFilter]    = useState<Stage      | "All">("All");
  const [typeFilter,     setTypeFilter]     = useState<PermitType | "All">("All");
  const [dateFilter,     setDateFilter]     = useState<DateRange  | "All">("This year (YTD)");

  const filtersActive = districtFilter !== "All" || stageFilter !== "All" || typeFilter !== "All" || dateFilter !== "All";
  const clearFilters  = () => { setDistrictFilter("All"); setStageFilter("All"); setTypeFilter("All"); setDateFilter("All"); };

  const allowedMonths = useMemo(() => {
    if (dateFilter === "All")                return MONTHS;
    if (dateFilter === "This year (YTD)")   return YTD_MONTHS;
    const n = dateFilter === "Last 3 months" ? 3 : dateFilter === "Last 6 months" ? 6 : 12;
    return MONTHS.slice(-n);
  }, [dateFilter]);

  const filtered = useMemo(() => FAKE_PERMITS.filter(p =>
    (districtFilter === "All" || p.district   === districtFilter) &&
    (stageFilter    === "All" || p.stage      === stageFilter)    &&
    (typeFilter     === "All" || p.permitType === typeFilter)     &&
    allowedMonths.includes(p.submitMonth)
  ), [districtFilter, stageFilter, typeFilter, allowedMonths]);

  const activePermits = useMemo(() => filtered.filter(p => p.stage !== "Closed"), [filtered]);
  const closedPermits = useMemo(() => filtered.filter(p => p.stage === "Closed"),  [filtered]);

  const avgProcessingDays = useMemo(() =>
    closedPermits.length ? Math.round(closedPermits.reduce((s,p) => s + p.processingDays, 0) / closedPermits.length) : null
  , [closedPermits]);

  const fpaReviewDays = useMemo(() =>
    avgProcessingDays != null ? Math.round(avgProcessingDays * FPA_DAYS / TOTAL_DAYS) : null
  , [avgProcessingDays]);

  const approvalRate = useMemo(() => {
    if (!closedPermits.length) return null;
    return Math.round((closedPermits.filter(p => p.isApproved).length / closedPermits.length) * 100);
  }, [closedPermits]);

  const stageCounts = useMemo(() => {
    const c: Partial<Record<Stage, number>> = {};
    for (const p of activePermits) c[p.stage as Stage] = (c[p.stage as Stage] ?? 0) + 1;
    return c;
  }, [activePermits]);

  const outsideCount = useMemo(() =>
    (stageCounts["External Agency"] ?? 0) + (stageCounts["Awaiting Applicant"] ?? 0)
  , [stageCounts]);

  const dateRangeLabel = `${allowedMonths[0]} – ${allowedMonths[allowedMonths.length - 1]}`;

  const districtData = useMemo(() =>
    DISTRICTS.map(d => ({ name: d, count: filtered.filter(p => p.district === d).length }))
  , [filtered]);

  const typeData = useMemo(() =>
    PERMIT_TYPES.map(t => ({ name: t, count: filtered.filter(p => p.permitType === t).length }))
      .sort((a, b) => b.count - a.count)
  , [filtered]);

  const monthlyData = useMemo(() =>
    allowedMonths.map(m => {
      const row: Record<string, string | number> = { month: m };
      for (const t of PERMIT_TYPES) row[t] = filtered.filter(p => p.submitMonth === m && p.permitType === t).length;
      return row;
    })
  , [filtered, allowedMonths]);

  const fpaBarWidth = fpaReviewDays != null && avgProcessingDays
    ? Math.round((fpaReviewDays / avgProcessingDays) * 100)
    : Math.round((FPA_DAYS / TOTAL_DAYS) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">

        <div>
          <Link href="/engineering" className="inline-flex items-center gap-1.5 text-sm text-[#21355a] hover:underline mb-3">
            <ArrowLeft className="h-4 w-4" /> Back to Engineering
          </Link>
          <h1 className="text-3xl font-bold text-[#21355a]">Permit Overview</h1>
          <p className="mt-2 text-gray-600 max-w-3xl">
            SLFPA-East reviews and approves permit applications for construction, encroachments, and events on or near the levee system.
            Once a permit is submitted, FPA conducts its own engineering review -- but some steps require action from outside parties,
            such as a federal Letter of No Objection from the U.S. Army Corps of Engineers or a response from the applicant.
            Processing time reflects the full timeline from submission to decision, including any periods outside FPA&rsquo;s control.
          </p>
        </div>

        {/* Sample data banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-900">
          <FlaskConical className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <span className="font-semibold">Sample data only.</span>{" "}
            All figures on this page are illustrative. This layout is pending approval from FPA leadership before Vinformatix connects the live database.
          </div>
        </div>

        {/* After the Fact question */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-900">
          <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <div>
            <span className="font-semibold">Open question:</span>{" "}
            After the Fact permits are currently shown on this page. Please confirm whether these should be visible on the public dashboard or kept internal.
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2.5">
          <FilterPills label="District"     options={DISTRICTS}    value={districtFilter} onChange={setDistrictFilter} />
          <FilterPills label="Permit type"  options={PERMIT_TYPES} value={typeFilter}     onChange={setTypeFilter} />
          <FilterPills label="Stage"        options={STAGES}       value={stageFilter}    onChange={setStageFilter} />
          <FilterPills label="Date range"   options={DATE_OPTIONS} value={dateFilter}     onChange={setDateFilter} />
          {filtersActive && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 pt-0.5">
              <X className="h-3 w-3" /> Clear all filters
            </button>
          )}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Total Permits (YTD)"
            value={filtered.length.toLocaleString()}
            icon={<FileText className="h-5 w-5" />}
            subtitle={filtersActive ? "matching filters" : "active + closed"}
            source={dateRangeLabel}
          />

          <KPICard
            label="Active in Pipeline"
            value={activePermits.length.toLocaleString()}
            icon={<FileText className="h-5 w-5" />}
            subtitle="currently under review"
          />

          {/* Processing time -- two numbers in one card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow col-span-2 md:col-span-1">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Avg Processing Time</span>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#21355a]">{avgProcessingDays ?? "—"}</span>
                  {avgProcessingDays != null && <span className="text-sm text-gray-500">days total</span>}
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-semibold text-[#21355a]">{fpaReviewDays ?? "—"}</span>
                  {fpaReviewDays != null && <span className="text-xs text-gray-500">days FPA review</span>}
                </div>
              </div>
            </div>
            {avgProcessingDays != null && (
              <div className="mt-3">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-[#21355a] h-1.5 rounded-full" style={{ width: `${fpaBarWidth}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{fpaBarWidth}% FPA-controlled · {100 - fpaBarWidth}% external/applicant</p>
              </div>
            )}
          </div>

          <KPICard
            label="Approval Rate"
            value={approvalRate != null ? approvalRate : "—"}
            unit={approvalRate != null ? "%" : ""}
            icon={<CheckCircle className="h-5 w-5" />}
            subtitle="closed permits, filtered"
          />
        </div>

        {/* Monthly volume by permit type */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-[#21355a] mb-4">Monthly Permit Volume by Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {PERMIT_TYPES.map(t => (
                <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {PERMIT_TYPES.map(t => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[t] }} />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Pipeline flow */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-[#21355a] mb-1">Active Pipeline: Where Permits Stand Today</h3>

          {outsideCount > 0 && (
            <div className="flex items-start gap-2 mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
              <span>
                <span className="font-semibold">{outsideCount.toLocaleString()} permits</span> are outside FPA&rsquo;s active review queue
                ({stageCounts["External Agency"] ?? 0} awaiting external agency sign-off,{" "}
                {stageCounts["Awaiting Applicant"] ?? 0} awaiting applicant response).
                FPA cannot advance these until the other party acts.
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
            {STAGES.map((stage, i) => {
              const meta  = STAGE_META[stage];
              const count = stageCounts[stage] ?? 0;
              const isFpa = STAGE_CONTROL[stage] === "fpa";
              return (
                <div key={stage} className="flex flex-col sm:flex-row items-center flex-1">
                  <div className={`flex flex-col items-center justify-center px-3 py-4 rounded-lg border w-full text-center min-h-[80px] bg-white ${meta.border}`}>
                    <span className={`text-2xl font-bold ${meta.color}`}>{count.toLocaleString()}</span>
                    <span className={`text-xs font-medium mt-1 ${meta.labelColor}`}>{meta.label}</span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <>
                      <div className="hidden sm:flex flex-col items-center mx-1 flex-shrink-0">
                        <span className={`text-[10px] mb-0.5 ${isFpa ? "text-[#21355a]" : "text-gray-400"}`}>~{STAGE_TIMING[stage]}d avg</span>
                        <ArrowRight className={`h-4 w-4 ${isFpa ? "text-[#21355a]/40" : "text-gray-300"}`} />
                      </div>
                      <ArrowRight className="sm:hidden h-4 w-4 text-gray-300 rotate-90 my-1 self-center" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Avg days to advance from each stage · navy = FPA-controlled · gray = outside FPA&rsquo;s queue · LNO = Letter of No Objection · Source: sample data
          </p>
        </div>

        {/* Permit type + District breakdown */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-[#21355a] mb-4">Permits by Type</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={96} />
                <Tooltip formatter={(v: number | undefined) => [v != null ? v.toLocaleString() : "—", "Permits"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {typeData.map(e => <Cell key={e.name} fill={TYPE_COLORS[e.name as PermitType] ?? "#94a3b8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-[#21355a] mb-4">Permits by Levee District</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={districtData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={48} />
                <Tooltip formatter={(v: number | undefined) => [v != null ? v.toLocaleString() : "—", "Permits"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {districtData.map(e => <Cell key={e.name} fill={DISTRICT_COLORS[e.name as District] ?? "#94a3b8"} />)}
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
