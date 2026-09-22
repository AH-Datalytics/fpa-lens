"use client";

import { useMemo, useState } from "react";
import {
  Shield,
  CalendarDays,
  BadgeCheck,
  Building2,
  Layers,
  Fence,
  MapPin,
  HardHat,
  Activity,
  Award,
  TrendingUp,
  Users,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import { protectionData } from "@/data/protectionData";
import {
  policeActivity,
  buildPeriods,
  sumKey,
  sumKeys,
  sumAll,
  daysCovered,
  shortMonthLabel,
  DISTRICT_NAMES,
  type DistrictKey,
} from "@/lib/policeActivity";
import { usePageCopy } from "@/lib/usePageCopy";
import { PROTECTION_DEFAULTS } from "@/globals/pages/protectionPage";

const formatNumber = (n: number) => n.toLocaleString();

const categoryIcon: Record<string, LucideIcon> = {
  FLOOD_STRUCTURES: Fence,
  LEVEE_SYSTEM: Layers,
  FPA_FACILITIES: Building2,
  PATROL_COVERAGE: MapPin,
  ENG_MAINT_SUPPORT: HardHat,
};

const categoryColor: Record<string, string> = {
  FLOOD_STRUCTURES: "#21355a",
  LEVEE_SYSTEM: "#2FA4A9",
  FPA_FACILITIES: "#65bc7b",
  PATROL_COVERAGE: "#9ca3af",
  ENG_MAINT_SUPPORT: "#f59e0b",
};

const districtColor: Record<DistrictKey, string> = {
  OLDPD: "#21355a",
  EJLDPD: "#2FA4A9",
};

const fieldLabel = Object.fromEntries(policeActivity.fields.map((f) => [f.key, f.label]));

export default function ProtectionPage() {
  const data = protectionData;
  const copy = usePageCopy("protection-page", PROTECTION_DEFAULTS);

  const periods = useMemo(() => buildPeriods(), []);
  const [periodKey, setPeriodKey] = useState(periods[0]?.key ?? "");
  const period = periods.find((p) => p.key === periodKey) ?? periods[0];
  const months = period?.months ?? [];

  const allMonths = useMemo(
    () => [...policeActivity.months].sort((a, b) => a.month.localeCompare(b.month)),
    [],
  );
  const latest = allMonths[allMonths.length - 1];
  const previous = allMonths[allMonths.length - 2];
  const latestTotal = latest ? sumAll([latest]) : 0;
  const previousTotal = previous ? sumAll([previous]) : 0;
  const monthChange = previous && previousTotal > 0 ? ((latestTotal - previousTotal) / previousTotal) * 100 : null;

  const periodTotal = sumAll(months);
  const perDay = months.length ? Math.round(periodTotal / daysCovered(months)) : 0;
  const leveeInspections = sumKey(months, "leveeInspections");

  const categoryTotals = data.activityCategories.map((cat) => ({
    ...cat,
    total: sumKeys(months, cat.items),
  }));

  // Monthly trend, stacked by category, across the whole series.
  const trendData = allMonths.map((m) => {
    const row: Record<string, number | string> = { month: shortMonthLabel(m.month) };
    for (const cat of data.activityCategories) row[cat.key] = sumKeys([m], cat.items);
    return row;
  });

  // Per-category sparkline: monthly totals over the selected period.
  const sparkline = (items: typeof data.activityCategories[number]["items"]) =>
    months.map((m) => ({ month: shortMonthLabel(m.month), v: sumKeys([m], items) }));

  const districtTotals = (Object.keys(DISTRICT_NAMES) as DistrictKey[]).map((d) => ({
    key: d,
    name: DISTRICT_NAMES[d],
    total: sumAll(months, d),
  }));

  const periodPhrase = period ? `${period.label} (${period.range})` : "";
  const dataThrough = latest ? latest.label : "";

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={copy.pageTitle}
          subtitle={copy.pageSubtitle}
        />

        {/* MISSION */}
        <section className="mb-10">
          <div className="bg-gradient-to-r from-[#21355a] to-[#2c3859] rounded-xl p-8 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-3">
                  {copy.missionHeading}
                </h2>
                <p className="text-blue-100 leading-relaxed">{data.mission}</p>
                <p className="text-blue-100 leading-relaxed mt-3">
                  Continued investment in the police districts is, in practical effect, an
                  infrastructure-focused investment in the protection, operability, and continuity
                  of approximately{" "}
                  <span className="text-white font-semibold">
                    ${(data.infrastructureValue / 1_000_000_000).toFixed(0)} billion
                  </span>{" "}
                  in flood-protection infrastructure and related Authority assets.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PERIOD SELECTOR + HEADLINE STATS */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <SectionSubheader
              title={period ? `${period.label} at a glance` : "At a glance"}
              subtitle={period ? `${period.range} · data through ${dataThrough}` : undefined}
              className="mb-0"
            />
            {periods.length > 1 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Reporting period">
                {periods.map((p) => {
                  const active = p.key === period?.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPeriodKey(p.key)}
                      aria-pressed={active}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? "bg-[#21355a] text-white border-[#21355a]"
                          : "bg-white text-[#21355a] border-gray-200 hover:border-[#21355a]"
                      }`}
                      title={p.range}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
                <Activity className="h-4 w-4" />
                Total infrastructure activities
              </div>
              <div className="text-3xl font-bold text-[#21355a]">
                {formatNumber(periodTotal)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                checks, inspections, and field support, {period?.range}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
                <TrendingUp className="h-4 w-4" />
                Per day
              </div>
              <div className="text-3xl font-bold text-[#21355a]">
                ~{formatNumber(perDay)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                continuous 24/7 field activity across {data.districtsCovered} police districts (OLDPD &amp; EJLDPD)
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
                <CalendarDays className="h-4 w-4" />
                Latest month
              </div>
              <div className="text-3xl font-bold text-[#21355a]">
                {formatNumber(latestTotal)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {latest?.label}
                {monthChange !== null && previous && (
                  <>
                    {" · "}
                    <span className={monthChange >= 0 ? "text-[#65bc7b] font-medium" : "text-amber-600 font-medium"}>
                      {monthChange >= 0 ? "+" : ""}
                      {monthChange.toFixed(0)}%
                    </span>{" "}
                    vs {shortMonthLabel(previous.month)}
                  </>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
                <BadgeCheck className="h-4 w-4" />
                CPRA Certified Levee Inspectors
              </div>
              <div className="text-3xl font-bold text-[#21355a]">
                {data.certifiedLeveeInspectorsPercent}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                every commissioned officer
              </div>
            </div>
          </div>
        </section>

        {/* MONTHLY TREND */}
        <section className="mb-12">
          <SectionSubheader
            title="Monthly infrastructure activity"
            subtitle="Field activities logged each month, grouped by the part of the flood-protection system they cover"
          />
          <div className="grid lg:grid-cols-3 gap-6">
            <DataCard
              title="Activities by month"
              className="lg:col-span-2"
              source="Levee District Police monthly activity summaries"
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString()} width={56} />
                    <Tooltip
                      formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {data.activityCategories.map((cat, i) => (
                      <Bar
                        key={cat.key}
                        dataKey={cat.key}
                        name={cat.name}
                        stackId="a"
                        fill={categoryColor[cat.key]}
                        radius={i === data.activityCategories.length - 1 ? [3, 3, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DataCard>

            <DataCard title="By police district" source={`${period?.label}, ${period?.range}`}>
              <div className="space-y-5">
                {districtTotals.map((d) => {
                  const pct = periodTotal ? (d.total / periodTotal) * 100 : 0;
                  return (
                    <div key={d.key}>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#21355a]">{d.key}</span>
                        <span className="text-lg font-bold text-[#21355a]">{formatNumber(d.total)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: districtColor[d.key] }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                        <span>{d.name}</span>
                        <span>{pct.toFixed(0)}% of activities</span>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-500 leading-snug pt-2 border-t border-gray-100">
                  Each department patrols its own levee district. Activity mix differs by geography:
                  river batture and polder checks concentrate in East Jefferson; gauge readings and
                  Bayou Bienvenue checks in Orleans.
                </p>
              </div>
            </DataCard>
          </div>
        </section>

        {/* MONITORING ACTIVITY */}
        <section className="mb-12">
          <SectionSubheader
            title={copy.monitoringHeading}
            subtitle={`How ${formatNumber(periodTotal)} field activities (${periodPhrase}) map onto the flood-protection system`}
          />

          {/* Stacked share bar */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 mb-4">
            <div className="flex h-8 rounded-md overflow-hidden border border-gray-200">
              {categoryTotals.map((cat) => {
                const pct = periodTotal ? (cat.total / periodTotal) * 100 : 0;
                return (
                  <div
                    key={cat.key}
                    className="flex items-center justify-center text-white text-xs font-semibold"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: categoryColor[cat.key],
                      minWidth: pct > 4 ? undefined : "auto",
                    }}
                    title={`${cat.name}: ${formatNumber(cat.total)} (${pct.toFixed(1)}%)`}
                  >
                    {pct >= 8 ? `${pct.toFixed(0)}%` : ""}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
              {categoryTotals.map((cat) => (
                <div key={cat.key} className="flex items-start gap-2 text-xs">
                  <span
                    className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0"
                    style={{ backgroundColor: categoryColor[cat.key] }}
                    aria-hidden="true"
                  />
                  <span className="text-gray-700 leading-snug">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-category cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTotals.map((cat) => {
              const Icon = categoryIcon[cat.key] ?? Activity;
              const spark = sparkline(cat.items);
              return (
                <div
                  key={cat.key}
                  className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden h-full flex flex-col"
                >
                  <div
                    className="px-5 py-3 border-b border-gray-100 flex items-center gap-2"
                    style={{ backgroundColor: `${categoryColor[cat.key]}10` }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: categoryColor[cat.key] }}
                    />
                    <h3 className="font-semibold text-[#21355a] text-sm">{cat.name}</h3>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="text-3xl font-bold text-[#21355a]">
                          {formatNumber(cat.total)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          activities, {period?.range}
                        </div>
                      </div>
                      <div className="h-12 w-28 flex-shrink-0" aria-hidden="true">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
                            <Bar dataKey="v" fill={categoryColor[cat.key]} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 text-right -mt-1 mb-3">by month</div>
                    <p className="text-xs text-gray-600 leading-snug mb-3">
                      {cat.description}
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600 mt-auto">
                      {cat.items.map((key) => (
                        <li key={key} className="flex items-baseline justify-between gap-2">
                          <span>{fieldLabel[key]}</span>
                          <span className="font-medium text-[#21355a]">
                            {formatNumber(sumKey(months, key))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            <span className="font-semibold text-gray-600">About this data.</span> Counts come from the
            Levee District Police monthly activity summaries for the Orleans and East Jefferson police
            departments. Each officer records activity on a Daily Activity Sheet; platoon supervisors
            compile those into a monthly platoon summary, and the district Captains combine the platoons
            into the agency&apos;s monthly statistical recap. FPA Lens reads the recap workbook the Police
            Department uploads each month and updates this page automatically. Fiscal years run July 1
            through June 30. Data through {dataThrough}.
          </p>
        </section>

        {/* LEVEE AWARENESS */}
        <section className="mb-12">
          <SectionSubheader
            title={copy.leveeAwarenessHeading}
          />
          <div className="bg-[#65bc7b]/5 border border-[#65bc7b]/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#65bc7b]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="h-6 w-6 text-[#65bc7b]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#21355a]">
                  {data.leveeAwareness.headline}
                </h3>
                <p className="text-sm text-gray-700 mt-1 mb-4">
                  {formatNumber(leveeInspections)} formal levee inspections logged {period?.label}{" "}
                  ({period?.range}), plus continuous proactive checks during every shift.
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  {data.leveeAwareness.points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <span className="text-[#65bc7b] font-bold mt-0.5">&#10003;</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* OUTCOMES */}
        <section className="mb-12">
          <SectionSubheader
            title={copy.outcomesHeading}
            subtitle={copy.outcomesSubtitle}
          />
          <div className="grid md:grid-cols-2 gap-4">
            {data.outcomes.map((o) => (
              <div
                key={o.key}
                className="bg-white rounded-xl shadow-md border border-gray-100 p-5"
              >
                <div className="text-3xl font-bold text-[#21355a]">{o.headline}</div>
                <div className="text-sm font-semibold text-[#21355a] mt-1">{o.label}</div>
                <p className="text-xs text-gray-600 leading-snug mt-2">{o.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WORKFORCE */}
        <section className="mb-12">
          <SectionSubheader
            title={copy.workforceHeading}
          />
          <div className="grid md:grid-cols-2 gap-4">
            {data.workforce.map((d) => (
              <div
                key={d.abbreviation}
                className="bg-white rounded-xl shadow-md border border-gray-100 p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-[#21355a]" />
                  <h3 className="font-semibold text-[#21355a] text-sm">
                    {d.name} ({d.abbreviation})
                  </h3>
                </div>
                <dl className="divide-y divide-gray-100">
                  {d.snapshots.map((s) => {
                    const isCurrent = s.period === "Current";
                    return (
                      <div key={s.period} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className={isCurrent ? "text-sm font-semibold text-[#21355a]" : "text-sm text-gray-600"}>
                            {s.period}
                          </dt>
                          <dd className={isCurrent ? "text-base font-bold text-[#21355a]" : "text-sm font-medium text-gray-700"}>
                            {s.total} positions
                          </dd>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{s.breakdown}</p>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Source: {data.workforceSource}</p>
        </section>

        {/* WHY IT MATTERS - cautionary callout */}
        <section className="mb-12">
          <div className="bg-amber-50 border-l-4 border-amber-300 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">
                  {data.whyItMatters.headline}
                </h4>
                <p className="text-sm text-amber-900 leading-relaxed">
                  {data.whyItMatters.body}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
