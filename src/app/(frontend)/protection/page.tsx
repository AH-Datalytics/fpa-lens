import {
  Shield,
  Clock,
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
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import { protectionData } from "@/data/protectionData";
import { getPageContent } from "@/lib/cms";
import { PROTECTION_DEFAULTS } from "@/globals/pages/protectionPage";

export const revalidate = 60;

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

export default async function ProtectionPage() {
  const data = protectionData;
  const perDay = Math.round(data.totalActivities / data.daysInYear);
  const copy = await getPageContent<typeof PROTECTION_DEFAULTS>("protection-page");

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={copy?.pageTitle ?? PROTECTION_DEFAULTS.pageTitle}
          subtitle={copy?.pageSubtitle ?? PROTECTION_DEFAULTS.pageSubtitle}
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
                  {copy?.missionHeading ?? PROTECTION_DEFAULTS.missionHeading}
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

        {/* HEADLINE STATS */}
        <section className="mb-12">
          <SectionSubheader title={`${data.asOfYear} at a glance`} />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
                <Activity className="h-4 w-4" />
                Total infrastructure activities
              </div>
              <div className="text-3xl font-bold text-[#21355a]">
                {formatNumber(data.totalActivities)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                checks, inspections, and field support across the system
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
                continuous field activity rate
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">
                <Clock className="h-4 w-4" />
                Coverage
              </div>
              <div className="text-3xl font-bold text-[#21355a]">24/7</div>
              <div className="text-xs text-gray-500 mt-1">
                across {data.districtsCovered} police districts (OLDPD &amp; EJLDPD)
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

        {/* MONITORING ACTIVITY */}
        <section className="mb-12">
          <SectionSubheader
            title={copy?.monitoringHeading ?? PROTECTION_DEFAULTS.monitoringHeading}
            subtitle={`How ${formatNumber(data.totalActivities)} field activities map onto the flood-protection system`}
          />

          {/* Stacked bar visualization */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 mb-4">
            <div className="flex h-8 rounded-md overflow-hidden border border-gray-200">
              {data.activityCategories.map((cat) => {
                const pct = (cat.total / data.totalActivities) * 100;
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
              {data.activityCategories.map((cat) => (
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
            {data.activityCategories.map((cat) => {
              const Icon = categoryIcon[cat.key] ?? Activity;
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
                    <div className="text-3xl font-bold text-[#21355a]">
                      {formatNumber(cat.total)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 mb-3">
                      activities in {data.asOfYear}
                    </div>
                    <p className="text-xs text-gray-600 leading-snug mb-3">
                      {cat.description}
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600 mt-auto">
                      {cat.items.map((it) => (
                        <li key={it.label} className="flex items-baseline justify-between gap-2">
                          <span>{it.label}</span>
                          <span className="font-medium text-[#21355a]">
                            {formatNumber(it.count)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* LEVEE AWARENESS */}
        <section className="mb-12">
          <SectionSubheader
            title={copy?.leveeAwarenessHeading ?? PROTECTION_DEFAULTS.leveeAwarenessHeading}
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
                  {formatNumber(data.leveeAwareness.formalInspectionsPerYear)} formal levee
                  inspections logged in {data.asOfYear}, plus continuous proactive checks
                  during every shift.
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
            title={copy?.outcomesHeading ?? PROTECTION_DEFAULTS.outcomesHeading}
            subtitle={copy?.outcomesSubtitle ?? PROTECTION_DEFAULTS.outcomesSubtitle}
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
            title={copy?.workforceHeading ?? PROTECTION_DEFAULTS.workforceHeading}
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
