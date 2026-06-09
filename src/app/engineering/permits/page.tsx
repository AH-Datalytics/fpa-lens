"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle, ArrowRight, X, AlertCircle, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import KPICard from "@/components/KPICard";
import {
  DISTRICTS, PERMIT_TYPES, OUTCOMES, STAGE_CONTROL, monthLabel,
  type Stage, type District, type PermitType, type PermitOutcome,
  type NormalizedPermit, type PermitsResponse,
} from "@/lib/permits";

// ---------------------------------------------------------------------------
// Lifecycle model for the UI.
//   A permit sits at exactly one point on a single lifecycle: either one of the
//   four ACTIVE stages, or one of the terminal OUTCOMES. They are mutually
//   exclusive, so the Status filter is one control spanning both.
// ---------------------------------------------------------------------------

const ACTIVE_STAGES: Stage[] = ["Submitted", "FPA Review", "External Agency Review", "Awaiting Applicant"];

type StatusValue = Stage | PermitOutcome;
const isOutcome = (s: StatusValue | "All"): s is PermitOutcome => (OUTCOMES as readonly string[]).includes(s);

const STAGE_META: Record<string, { color: string; labelColor: string }> = {
  "Submitted":              { color: "text-[#21355a]", labelColor: "text-[#21355a]" },
  "FPA Review":             { color: "text-[#21355a]", labelColor: "text-[#21355a]" },
  "External Agency Review": { color: "text-gray-400",  labelColor: "text-gray-400" },
  "Awaiting Applicant":     { color: "text-gray-400",  labelColor: "text-gray-400" },
};

// Number color for the terminal outcome box (sentiment, not stage control).
const OUTCOME_COLOR: Record<PermitOutcome, string> = {
  "Issued":     "text-[#15803d]", // green
  "Expired":    "text-gray-500",
  "Withdrawn":  "text-gray-500",
  "Denied":     "text-[#b91c1c]", // red
  "Not needed": "text-gray-500",
};

// Dynamic card-title fragment for each lifecycle state.
const STATUS_TITLE: Record<string, string> = {
  "Submitted":              "Permits in Submitted",
  "FPA Review":             "Permits in FPA Review",
  "External Agency Review": "Permits in External Agency Review",
  "Awaiting Applicant":     "Permits Awaiting Applicant",
  "Issued":                 "Permits Issued",
  "Expired":                "Permits Expired",
  "Withdrawn":              "Permits Withdrawn",
  "Denied":                 "Permits Denied",
  "Not needed":             "Permits (No Permit Needed)",
};

// Bars are a single brand color -- the hue carries no meaning, it just shows magnitude.
const BAR_COLOR = "#21355a";

const pillCls = (active: boolean) =>
  `px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
    active ? "bg-[#21355a] text-white border-[#21355a]" : "bg-white text-gray-600 border-gray-300 hover:border-[#21355a]/50"
  }`;

// ---------------------------------------------------------------------------

function FilterPills<T extends string>({
  label, options, value, onChange,
}: { label: string; options: readonly T[]; value: T | "All"; onChange: (v: T | "All") => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500 w-24 shrink-0">{label}</span>
      <button onClick={() => onChange("All")} className={pillCls(value === "All")}>All</button>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt === value ? "All" : opt)} className={pillCls(value === opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// Single lifecycle filter: All, the four active stages, a divider, then the
// terminal outcomes. Selecting any one scopes the whole page.
function StatusFilter({ value, onChange }: { value: StatusValue | "All"; onChange: (v: StatusValue | "All") => void }) {
  const pill = (label: string, key: StatusValue | "All") => (
    <button key={key} onClick={() => onChange(key === value ? "All" : key)} className={pillCls(value === key)}>
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500 w-24 shrink-0">Status</span>
      {pill("All", "All")}
      {ACTIVE_STAGES.map(s => pill(s, s))}
      <span className="text-gray-300 px-1 select-none">|</span>
      {OUTCOMES.map(o => pill(o, o))}
    </div>
  );
}

const DATE_OPTIONS = ["This year (YTD)","Last 3 months","Last 6 months","Last 12 months"] as const;
type DateRange = typeof DATE_OPTIONS[number];

// ---- month-key helpers (relative to "now", so the page stays current) ------

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function trailingMonthKeys(now: Date, n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(keyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  return keys;
}
function ytdMonthKeys(now: Date): string[] {
  const keys: string[] = [];
  for (let m = 0; m <= now.getMonth(); m++) keys.push(`${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`);
  return keys;
}

// ---------------------------------------------------------------------------

export default function PermitsPage() {
  const [data, setData]       = useState<PermitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const [districtFilter, setDistrictFilter] = useState<District    | "All">("All");
  const [statusFilter,   setStatusFilter]   = useState<StatusValue | "All">("All");
  const [typeFilter,     setTypeFilter]     = useState<PermitType  | "All">("All");
  const [dateFilter,     setDateFilter]     = useState<DateRange   | "All">("This year (YTD)");

  useEffect(() => {
    const end = new Date().toISOString().slice(0, 10);
    fetch(`/api/permits?startDate=2024-01-01&endDate=${end}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: PermitsResponse) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const permits = useMemo<NormalizedPermit[]>(() => data?.permits ?? [], [data]);
  const stageTiming = data?.stageTiming;

  const filtersActive = districtFilter !== "All" || statusFilter !== "All" || typeFilter !== "All" || dateFilter !== "All";
  const clearFilters  = () => { setDistrictFilter("All"); setStatusFilter("All"); setTypeFilter("All"); setDateFilter("All"); };

  const now = useMemo(() => new Date(), []);
  const allowedMonths = useMemo<string[] | null>(() => {
    if (dateFilter === "All")              return null;
    if (dateFilter === "This year (YTD)")  return ytdMonthKeys(now);
    const n = dateFilter === "Last 3 months" ? 3 : dateFilter === "Last 6 months" ? 6 : 12;
    return trailingMonthKeys(now, n);
  }, [dateFilter, now]);

  // One mutually-exclusive lifecycle filter: an active stage matches active
  // permits at that stage; an outcome matches closed permits with that outcome.
  const matchStatus = (p: NormalizedPermit) => {
    if (statusFilter === "All") return true;
    if (isOutcome(statusFilter)) return p.outcome === statusFilter;
    return p.isActive && p.stage === statusFilter;
  };
  const matchDate = (p: NormalizedPermit) =>
    allowedMonths === null || (p.submitMonthKey !== null && allowedMonths.includes(p.submitMonthKey));

  const filtered = useMemo(() => permits.filter(p =>
    (districtFilter === "All" || p.district   === districtFilter) &&
    (typeFilter     === "All" || p.permitType === typeFilter)     &&
    matchStatus(p) &&
    matchDate(p)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [permits, districtFilter, typeFilter, statusFilter, allowedMonths]);

  const activePermits = useMemo(() => filtered.filter(p => p.isActive), [filtered]);

  const avgProcessingDays = useMemo(() => {
    const withDays = filtered.filter(p => p.processingDays != null);
    return withDays.length
      ? Math.round(withDays.reduce((s, p) => s + (p.processingDays ?? 0), 0) / withDays.length)
      : null;
  }, [filtered]);

  // FPA-controlled share of review time, from system-wide stage timing.
  const fpaShare = useMemo(() => {
    if (!stageTiming) return 0.5;
    const fpa = stageTiming["Submitted"] + stageTiming["FPA Review"];
    const ext = stageTiming["External Agency Review"] + stageTiming["Awaiting Applicant"];
    return fpa + ext > 0 ? fpa / (fpa + ext) : 0.5;
  }, [stageTiming]);

  const fpaReviewDays = avgProcessingDays != null ? Math.round(avgProcessingDays * fpaShare) : null;
  const fpaBarWidth   = Math.round(fpaShare * 100);

  // Outcome mix of closed permits (Issued/Expired/Withdrawn/Denied/Not needed).
  const outcomeStats = useMemo(() => {
    const closed = filtered.filter(p => p.isClosed);
    const counts: Record<string, number> = {};
    for (const p of closed) if (p.outcome) counts[p.outcome] = (counts[p.outcome] ?? 0) + 1;
    return { total: closed.length, counts };
  }, [filtered]);

  const stageCounts = useMemo(() => {
    const c: Record<string, number> = {
      "Submitted": 0, "FPA Review": 0, "External Agency Review": 0, "Awaiting Applicant": 0,
    };
    for (const p of activePermits) if (p.stage !== "Closed") c[p.stage] = (c[p.stage] ?? 0) + 1;
    return c;
  }, [activePermits]);

  const outsideCount = (stageCounts["External Agency Review"] ?? 0) + (stageCounts["Awaiting Applicant"] ?? 0);

  // Terminal outcome box: shows the selected outcome, or Issued by default.
  const terminalOutcome: PermitOutcome = isOutcome(statusFilter) ? statusFilter : "Issued";
  const terminalCount = useMemo(
    () => filtered.filter(p => p.outcome === terminalOutcome).length,
    [filtered, terminalOutcome],
  );

  const districtData = useMemo(() =>
    DISTRICTS.map(d => ({ name: d, count: filtered.filter(p => p.district === d).length }))
  , [filtered]);

  const typeData = useMemo(() =>
    PERMIT_TYPES.map(t => ({ name: t, count: filtered.filter(p => p.permitType === t).length }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
  , [filtered]);

  const dateRangeLabel = useMemo(() => {
    if (allowedMonths && allowedMonths.length) {
      return `${monthLabel(allowedMonths[0])} – ${monthLabel(allowedMonths[allowedMonths.length - 1])}`;
    }
    const keys = permits.map(p => p.submitMonthKey).filter((k): k is string => k !== null).sort();
    return keys.length ? `${monthLabel(keys[0])} – ${monthLabel(keys[keys.length - 1])}` : "All time";
  }, [allowedMonths, permits]);

  const asOfLabel = data
    ? new Date(data.asOf).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  // ---- dynamic card titles, driven by the active filters ----
  const dtPhrase = [
    districtFilter !== "All" ? districtFilter : null,
    typeFilter     !== "All" ? typeFilter     : null,
  ].filter(Boolean).join(" ");
  const squish = (s: string) => s.replace(/\s+/g, " ").trim();

  const totalLabel = statusFilter === "All"
    ? squish(`Total ${dtPhrase} Permits`)
    : squish(`${dtPhrase} ${STATUS_TITLE[statusFilter]}`);
  const totalSubtitle = statusFilter === "All"
    ? "active + closed"
    : isOutcome(statusFilter) ? "closed permits" : "currently under review";
  const activeLabel   = dtPhrase ? squish(`Active ${dtPhrase} Permits`) : "Active in Pipeline";
  const procLabel     = dtPhrase ? `Avg Processing Time (${dtPhrase})` : "Avg Processing Time";
  const outcomesLabel = dtPhrase ? squish(`${dtPhrase} Permit Outcomes`) : "Permit Outcomes";

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
            such as a Letter of No Objection from the U.S. Army Corps of Engineers or the Coastal Protection and Restoration Authority,
            or a response from the applicant.
            Processing time reflects the full timeline from submission to decision, including any periods outside FPA&rsquo;s control.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading live permit data…
          </div>
        ) : error || !data ? (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
            <div>Could not load permit data from the Vinformatix API. Please refresh, or check back shortly.</div>
          </div>
        ) : (
        <>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2.5">
          <FilterPills label="District"     options={DISTRICTS}    value={districtFilter} onChange={setDistrictFilter} />
          <FilterPills label="Permit type"  options={PERMIT_TYPES} value={typeFilter}     onChange={setTypeFilter} />
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
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
            label={totalLabel}
            value={filtered.length.toLocaleString()}
            icon={<FileText className="h-5 w-5" />}
            subtitle={totalSubtitle}
            footer={`Date Range: ${dateRangeLabel}`}
          />

          <KPICard
            label={activeLabel}
            value={activePermits.length.toLocaleString()}
            icon={<FileText className="h-5 w-5" />}
            subtitle="currently under review"
          />

          {/* Processing time -- two numbers in one card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow col-span-2 md:col-span-1">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">{procLabel}</span>
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
            {avgProcessingDays != null ? (
              <div className="mt-3">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-[#21355a] h-1.5 rounded-full" style={{ width: `${fpaBarWidth}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{fpaBarWidth}% FPA-controlled · {100 - fpaBarWidth}% external/applicant</p>
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 mt-3">No permits issued in this selection yet.</p>
            )}
          </div>

          {/* Permit outcomes -- breakdown instead of a single, misleading rate */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">{outcomesLabel}</span>
              <span className="text-[#21355a]"><CheckCircle className="h-5 w-5" /></span>
            </div>
            {outcomeStats.total > 0 ? (
              <div className="space-y-1">
                {OUTCOMES.filter(o => (outcomeStats.counts[o] ?? 0) > 0).map(o => {
                  const n = outcomeStats.counts[o] ?? 0;
                  const pct = (n / outcomeStats.total) * 100;
                  const pctLabel = pct < 1 ? "<1%" : `${Math.round(pct)}%`;
                  const emph = o === "Issued";
                  return (
                    <div key={o} className="flex items-baseline justify-between text-sm">
                      <span className={emph ? "font-semibold text-[#21355a]" : "text-gray-600"}>{o}</span>
                      <span className={emph ? "font-semibold text-[#21355a]" : "text-gray-700"}>
                        {n.toLocaleString()} <span className="text-gray-400 text-xs">({pctLabel})</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No closed permits in this selection.</p>
            )}
            <p className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
              {outcomeStats.total.toLocaleString()} closed permits · FPA rarely denies; unissued permits expire or are withdrawn
            </p>
          </div>
        </div>

        {/* Permit lifecycle: active-stage snapshot + terminal outcome box */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-[#21355a] mb-1">Permit Lifecycle</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-3xl">
            The first four boxes are a live snapshot of active permits, grouped by the stage each is waiting at right now
            (they add up to the &ldquo;Active in Pipeline&rdquo; total above). The final box, set apart on the right, is the
            destination: it shows <span className="font-semibold text-gray-700">{terminalOutcome}</span> permits by default, and
            updates when you pick a different outcome in the Status filter.
          </p>

          {outsideCount > 0 && (
            <div className="flex items-start gap-2 mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
              <span>
                <span className="font-semibold">{outsideCount.toLocaleString()} permits</span> are outside FPA&rsquo;s active review queue
                ({stageCounts["External Agency Review"] ?? 0} awaiting external agency sign-off,{" "}
                {stageCounts["Awaiting Applicant"] ?? 0} awaiting applicant response).
                FPA cannot advance these until the other party acts.
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
            {ACTIVE_STAGES.map((stage, i) => {
              const meta     = STAGE_META[stage];
              const count    = stageCounts[stage] ?? 0;
              const isFpa    = STAGE_CONTROL[stage] === "fpa";
              const selected = statusFilter === stage;
              const dim      = count === 0 && !selected;
              const timing   = stageTiming?.[stage];
              return (
                <div key={stage} className="flex flex-col sm:flex-row items-stretch sm:items-center flex-1">
                  <div className={`flex flex-col items-center justify-start px-3 py-4 rounded-lg border w-full text-center min-h-[104px] bg-white border-gray-200 transition-opacity ${dim ? "opacity-40" : ""} ${selected ? "ring-2 ring-[#21355a] ring-offset-1" : ""}`}>
                    <span className={`text-2xl font-bold ${meta.color}`}>{count.toLocaleString()}</span>
                    <span className={`text-xs font-medium mt-1 ${meta.labelColor}`}>{stage}</span>
                    {timing != null && timing > 0 && (
                      <span className={`text-[10px] mt-2 ${isFpa ? "text-[#21355a]" : "text-gray-400"}`}>
                        ~{timing}d avg in stage
                      </span>
                    )}
                  </div>
                  <ArrowRight className="hidden sm:block h-4 w-4 mx-1 flex-shrink-0 text-gray-300" />
                  <ArrowRight className="sm:hidden h-4 w-4 text-gray-300 rotate-90 my-1 self-center" />
                </div>
              );
            })}

            {/* terminal outcome box -- set apart with extra gap + tinted bg */}
            <div className="flex items-stretch flex-1 sm:pl-2">
              <div className={`flex flex-col items-center justify-center px-3 py-4 rounded-lg border w-full text-center min-h-[104px] bg-gray-50 border-gray-300 transition-opacity ${terminalCount === 0 && !isOutcome(statusFilter) ? "opacity-40" : ""} ${isOutcome(statusFilter) ? "ring-2 ring-[#21355a] ring-offset-1" : ""}`}>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Outcome</span>
                <span className={`text-2xl font-bold ${OUTCOME_COLOR[terminalOutcome]}`}>{terminalCount.toLocaleString()}</span>
                <span className="text-xs font-medium mt-1 text-gray-600">{terminalOutcome}</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            ~Nd avg in stage = typical days a permit spends in that stage across all permits · navy = FPA-controlled · gray = outside FPA&rsquo;s queue
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
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={BAR_COLOR} />
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
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={BAR_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Source: Vinformatix Permitting System{asOfLabel ? `, as of ${asOfLabel}` : ""}.
          Unsubmitted draft applications are excluded.
        </p>

        </>
        )}
      </div>
    </div>
  );
}
