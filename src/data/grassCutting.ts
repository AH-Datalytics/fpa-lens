/**
 * Grass cutting page data.
 *
 * Cycle 1 is the initial cut on the new plan. As of May 2026, all three
 * districts have completed Cycle 1 and we have real per-zone start/end
 * dates and working-day totals from the maintenance team's "New Cutting
 * Plan" spreadsheet:
 *   - OLD: Mar 17 - Apr 15, 2026 (16 working days, 6 zones)
 *   - EJLD: Apr 20 - Apr 29, 2026 (11.5 working days, 4 zones)
 *   - LBBLD: Apr 8 - Apr 28, 2026 (13 working days, 4 zones)
 *
 * Cycle 2 is not yet underway / has no published schedule. Once the team
 * commits to a Cycle 2 reporting cadence we'll add an "in flight" cycle
 * back to the page.
 *
 * Per the Director (Apr 2026), the public dashboard reports calendar days
 * for system-wide summaries; per-zone totals stay as the spreadsheet's
 * working-day count (4-day work week).
 */

import turfCyclesData from "./turfCycles.json";

export interface ZoneCycleResult {
  startDate: string;
  completionDate: string;
  /** Working days, from the spreadsheet's "Total Days" column. */
  totalDays: number;
  /** Inclusive calendar days (completionDate − startDate + 1). Used for KPI rate calculation. */
  calendarDays: number;
  comments?: string;
}

export interface DistrictCycleSummary {
  label: string;
  startDate: string;
  completionDate: string;
  /** Sum of per-zone working days. */
  workingDays: number;
  /** Calendar elapsed (start to end inclusive). */
  calendarDays: number;
  /** Optional note from the team about how the cycle ran. */
  note?: string;
}

/**
 * Per-reach progress for the current reporting month. Cumulative percent
 * complete is taken from the maintenance team's weekly input workbook
 * (max value across the month's weeks per cycle column).
 */
export interface Reach {
  name: string;
  /** Estimated reach acreage from Kory's reach breakdown. */
  acres: number;
  /** Cumulative Cycle 1 % complete this reporting month, 0–1. */
  cycle1Pct: number;
  /** Cumulative Cycle 2 % complete this reporting month, 0–1. null when zone runs once per month. */
  cycle2Pct: number | null;
}

export interface ReportingMonth {
  /** Display label, e.g. "April 2026". */
  label: string;
  /** ISO year. */
  year: number;
  /** 1-indexed month (Apr = 4). */
  month: number;
  /** True when the month is past and KPI should compare to full-month target. */
  isComplete: boolean;
}

export interface OldGrassCuttingZone {
  key: string;
  name: string;
  /** Hex color matching the FPA's printed cutting plan map. */
  color: string;
  /** Lighter tint used for card accents. */
  tint: string;
  /** Use light text on dark backgrounds. */
  darkBackground: boolean;
  operators: number | string;
  /** Total mowing acreage from Kory's Apr 28 polygon shapefile. */
  acres: number;
  /** Target cycles per month (most are 2; NO East and Citrus Lakefront are ~1.5). */
  monthlyFrequency: number;
  reaches: Reach[];
  /** False when the maintenance team has not yet submitted weekly progress for this zone. */
  hasReportedData: boolean;
  lastCycle: ZoneCycleResult;
}

export interface OtherDistrictZone {
  key: string;
  name: string;
  color: string;
  /** Use light text on dark backgrounds. */
  darkBackground: boolean;
  acres: number;
  operators: number;
  /** Target cycles per month. Assume 2 for EJLD/LBBLD until Carlos confirms exceptions. */
  monthlyFrequency: number;
  reaches: Reach[];
  hasReportedData: boolean;
  lastCycle: ZoneCycleResult;
}

const rawGrassCuttingData = {
  asOfDate: "May 1, 2026",
  source: "Maintenance team cutting plan (Carlos Metoyer, March-May 2026)",

  // Reporting month for the per-zone monthly progress KPI. April 2026 is
  // the first month-completed reporting period under the new plan, so KPI
  // compares actuals to the full monthly target. When May closes out we'll
  // bump the label/year/month and flip isComplete to true.
  reportingMonth: {
    label: "April 2026",
    year: 2026,
    month: 4,
    isComplete: true,
  } as ReportingMonth,

  systemTotal: {
    miles: 104.79,
    riverLevees: 13.23,
    innerLeveesNonTidal: 18.52,
    tidalLevees: 73.04,
  },

  cadence: {
    headline: "Twice per month",
    detail:
      "Target frequency is twice per month for most OLD and EJLD reaches, with New Orleans East and Citrus Lakefront & Eastern Interior targeted at roughly 1.5 cycles per month (about every three weeks). Lake Borgne Basin currently runs once per month due to manpower and equipment constraints.",
    previousPlan: "Once per month (prior plan)",
  },

  oldCycle1: {
    label: "OLD Cycle 1",
    startDate: "March 17, 2026",
    completionDate: "April 15, 2026",
    workingDays: 16,
    calendarDays: 30,
    note: "Initial cut on the new plan; one full pass through all six zones.",
  } as DistrictCycleSummary,

  ejldCycle1: {
    label: "EJLD Cycle 1",
    startDate: "April 20, 2026",
    completionDate: "April 29, 2026",
    workingDays: 11.5,
    calendarDays: 10,
    note: "Separated into 2 cutting crews, typically 10 operators working in tandem; one full round-robin in 6-7 working days.",
  } as DistrictCycleSummary,

  lbbldCycle1: {
    label: "LBBLD Cycle 1",
    startDate: "April 8, 2026",
    completionDate: "April 28, 2026",
    workingDays: 13,
    calendarDays: 21,
    note: "One Levee Foreman B follows both the tractor and Heavy Equipment crews so the teams stay together; full round-robin in ~15 days.",
  } as DistrictCycleSummary,

  // Orleans Levee District zones — navy spectrum (district color family).
  // Sorted by acreage (largest first); colors are assigned darkest →
  // lightest so the largest zone gets the strongest shade. Legend and
  // per-zone cards follow the same order. Cycle 1 dates from the
  // "Mileage log OLD" tab. Zone keys (BLACK/NAVY_BLUE/etc.) are stable
  // identifiers carried over from the original printed cutting plan and
  // are referenced by the polygon→zone mapping in
  // public/data/grass-cutting-zones.json — do not rename.
  zones: [
    {
      key: "ORANGE",
      name: "New Orleans East",
      color: "#21355a",
      tint: "#3b5b96",
      darkBackground: true,
      operators: 3,
      acres: 650,
      monthlyFrequency: 1.5,
      reaches: [
        { name: "LPV-108", acres: 141, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "LPV-109", acres: 289, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "LPV-111", acres: 220, cycle1Pct: 1.0, cycle2Pct: 1.0 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "April 15, 2026",
        totalDays: 30,
        calendarDays: 30,
        comments: "Multiple tractor issues during this cycle.",
      },
    },
    {
      key: "LIGHT_BLUE",
      name: "Southside MRGO & Citrus Back",
      color: "#1e3a8a",
      tint: "#3b82f6",
      darkBackground: true,
      operators: "1 to 3",
      // 185 ac (Southside MRGO + Citrus Back from the original cutting
      // plan) + 122 ac for the LPV-115 / Paris Rd. to Jourdan polygon
      // Carlos confirmed in May 2026 is also Citrus Back Levee and is
      // mowed twice a month (4 working days w/ 4 operators).
      acres: 307,
      monthlyFrequency: 2,
      reaches: [
        { name: "Southside MRGO (LPV-142/LPV-143)", acres: 185, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "Citrus Back Levee — LPV-115 (Paris Rd. Bridge to Jourdan Rd)", acres: 122, cycle1Pct: 1.0, cycle2Pct: 0.75 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 30, 2026",
        totalDays: 14,
        calendarDays: 14,
        comments:
          "Cycle 1 calendar days reflect Southside MRGO only; LPV-115 / Paris Rd. to Jourdan (122 ac) is not yet logged in the Mileage log OLD tab. Carlos confirmed it's done in 4 working days with 4 operators on the same 2x/mo cadence; folding it in will likely lengthen the combined Cycle 1 footprint once the spreadsheet starts tracking it.",
      },
    },
    {
      key: "NAVY_BLUE",
      name: "Lakefront & Outfall Canals",
      color: "#1d4ed8",
      tint: "#3b82f6",
      darkBackground: true,
      operators: 3,
      acres: 300,
      monthlyFrequency: 2,
      reaches: [
        { name: "Lakefront", acres: 95, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "Outfall Canals (17th Street, Orleans, Bayou St. John, London)", acres: 123, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "IHNC West", acres: 57, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "IHNC East (E-13 to N-01)", acres: 25, cycle1Pct: 0, cycle2Pct: 1.0 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 30, 2026",
        totalDays: 14,
        calendarDays: 14,
        comments: "Longest pass in this group was Lakefront.",
      },
    },
    {
      key: "YELLOW",
      name: "Citrus Lakefront & Eastern Interior",
      color: "#3b82f6",
      tint: "#60a5fa",
      darkBackground: true,
      operators: 3,
      acres: 253,
      monthlyFrequency: 1.5,
      reaches: [
        { name: "Citrus Lakefront", acres: 57, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "Paris Rd", acres: 12, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "Maxent", acres: 41, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "Michoud Canal Floodwall", acres: 75, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "NASA", acres: 52, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "Entergy", acres: 16, cycle1Pct: 1.0, cycle2Pct: 1.0 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "April 8, 2026",
        totalDays: 23,
        calendarDays: 23,
        comments:
          "One operator on intermittent FMLA, another out on FMLA during this cycle.",
      },
    },
    {
      key: "BLACK",
      name: "Upper Protection",
      color: "#60a5fa",
      tint: "#93c5fd",
      darkBackground: false,
      operators: 2,
      // Updated May 2026 per Kory's revised OLD shapefile: zone reduced
      // from 62 → 53 ac after MRL edits east of the IHNC moved to the
      // Florida Ave zone.
      acres: 53,
      monthlyFrequency: 2,
      reaches: [
        { name: "Upper Protection (Earhart Blvd to the MRL)", acres: 8, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "MRL (Jefferson Parish line to EB-00)", acres: 45, cycle1Pct: 1.0, cycle2Pct: 1.0 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 18, 2026",
        totalDays: 2,
        calendarDays: 2,
      },
    },
    {
      key: "GREEN",
      name: "Florida Ave",
      color: "#93c5fd",
      tint: "#bfdbfe",
      darkBackground: false,
      operators: 1,
      acres: 57,
      monthlyFrequency: 2,
      reaches: [
        { name: "Florida Ave", acres: 10, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "IHNC East (E-01 to MRL)", acres: 21, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "MRL (IHNC East to St. Bernard Parish line)", acres: 26, cycle1Pct: 1.0, cycle2Pct: 1.0 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 19, 2026",
        totalDays: 3,
        calendarDays: 3,
      },
    },
  ] as OldGrassCuttingZone[],

  // East Jefferson Levee District zones — green spectrum (district color
  // family). Cycle dates from the "Mileage log EJLD" tab.
  ejldZones: [
    {
      key: "EJLD_LAKEFRONT",
      name: "EJ Lakefront Reach 1-5",
      color: "#166534", // green-800
      darkBackground: true,
      acres: 360,
      operators: 5,
      monthlyFrequency: 2,
      reaches: [
        { name: "St. Charles/Jeff Parish line to 17th St. Canal on EJ side", acres: 360, cycle1Pct: 1.0, cycle2Pct: 1.0 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "April 20, 2026",
        completionDate: "April 27, 2026",
        totalDays: 5,
        calendarDays: 8,
        comments: "One operator terminated; two tractors inoperable.",
      },
    },
    {
      key: "EJLD_MRL",
      name: "EJ MRL",
      color: "#16a34a", // green-600
      darkBackground: true,
      acres: 205,
      operators: 3,
      monthlyFrequency: 2,
      reaches: [
        { name: "Monticello to Alliance", acres: 202, cycle1Pct: 1.0, cycle2Pct: 1.0 },
        { name: "St. Charles/Jeff Parish line", acres: 3, cycle1Pct: 1.0, cycle2Pct: 1.0 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "April 20, 2026",
        completionDate: "April 27, 2026",
        totalDays: 5,
        calendarDays: 8,
      },
    },
    {
      key: "EJLD_WEST_RETURN",
      name: "EJ West Return",
      color: "#4ade80", // green-400
      darkBackground: false,
      acres: 85,
      operators: 5,
      monthlyFrequency: 2,
      reaches: [
        { name: "Airline Hwy & Lesan Dr to St. Charles/Jeff Parish line (Reach 1)", acres: 85, cycle1Pct: 1.0, cycle2Pct: 1.0 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "April 20, 2026",
        completionDate: "April 20, 2026",
        totalDays: 0.5,
        calendarDays: 1,
        comments: "5 tractors; 2 operators on leave.",
      },
    },
    {
      key: "EJLD_EAST_RETURN",
      name: "EJ East Return",
      color: "#86efac", // green-300
      darkBackground: false,
      acres: 10,
      operators: 1,
      monthlyFrequency: 2,
      reaches: [
        { name: "Along 17th St. Canal to Pinks St", acres: 10, cycle1Pct: 1.0, cycle2Pct: 1.0 },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "April 29, 2026",
        completionDate: "April 29, 2026",
        totalDays: 1,
        calendarDays: 1,
      },
    },
  ] as OtherDistrictZone[],

  // Lake Borgne Basin Levee District zones from Kory's May 1 2026 GIS
  // delivery. Acreage matches the email totals and reconciles with the
  // per-polygon Acreage field. Cycle 1 dates from the "Mileage log
  // LBBLD" tab in the cutting plan spreadsheet (5 operators per zone,
  // full round-robin in ~13 working days).
  lbbldZones: [
    {
      key: "LBBLD_LPV144_149",
      name: "LPV-144 through LPV-149",
      color: "#78350f", // amber-900
      darkBackground: true,
      acres: 592,
      operators: 5,
      monthlyFrequency: 1,
      reaches: [
        { name: "Bayou Dupre Structure (St. Bernard side) to HWY 39 at MRL", acres: 592, cycle1Pct: 1.0, cycle2Pct: null },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "April 8, 2026",
        completionDate: "April 13, 2026",
        totalDays: 3,
        calendarDays: 6,
        comments: "One day, 4 tractors, 1 driver on leave.",
      },
    },
    {
      key: "LBBLD_NFL",
      name: "Non-Federal Back Levee/NFL",
      color: "#a16207", // yellow-700
      darkBackground: true,
      acres: 316,
      operators: 5,
      monthlyFrequency: 1,
      reaches: [
        { name: "40 Arpent Levee — Orleans Parish line to HWY 46 Reggio in lower St. Bernard", acres: 316, cycle1Pct: 1.0, cycle2Pct: null },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "April 14, 2026",
        completionDate: "April 16, 2026",
        totalDays: 3,
        calendarDays: 3,
      },
    },
    {
      key: "LBBLD_LPV145",
      name: "LPV-145",
      color: "#ca8a04", // yellow-600
      darkBackground: false,
      acres: 278,
      operators: 5,
      monthlyFrequency: 1,
      reaches: [
        { name: '"The Island" (Bayou Bienvenue Structure to Bayou Dupre Structure)', acres: 278, cycle1Pct: 1.0, cycle2Pct: null },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "April 22, 2026",
        completionDate: "April 28, 2026",
        totalDays: 4,
        calendarDays: 7,
        comments:
          "One day safety meeting; two days with 4 tractors, 1 driver on leave.",
      },
    },
    {
      key: "LBBLD_MRL",
      name: "MRL",
      color: "#eab308", // yellow-500
      darkBackground: false,
      acres: 167,
      operators: 5,
      monthlyFrequency: 1,
      reaches: [
        { name: "Mississippi River Levee at HWY 39 to Arabi (Orleans Parish line)", acres: 167, cycle1Pct: 1.0, cycle2Pct: null },
      ],
      hasReportedData: true,
      lastCycle: {
        startDate: "April 20, 2026",
        completionDate: "April 22, 2026",
        totalDays: 3,
        calendarDays: 3,
        comments: "One day, 4 tractors, 1 driver on leave.",
      },
    },
  ] as OtherDistrictZone[],

  // Confirmed Apr 2026:
  //   - "1/2/3" labels on the printed map = number of operators assigned
  //     (Lavell Webb, FPA maintenance team).
  //   - Sub-rows without start/completion dates (Paris Rd, Maxent, Michoud,
  //     NASA, Entergy, IHNC East, MRL) roll up under their parent row's dates.
  //   - Citrus Back Levee currently shares Southside MRGO's zone and cycle
  //     because it has no dedicated operator; will split into its own zone
  //     once a new operator is hired.
  openQuestions: [
    "Per-reach acreage to drive monthly acreage-benchmark targets (per Director direction, Apr 2026).",
    "Format for monthly cuts data going forward (SITREP line per reach vs. separate one-pager from the maintenance team).",
    "Cycle 2 reporting cadence and timing across all three districts.",
  ],
};

// ---------------------------------------------------------------------------
// Turf-cycle overlay. Refreshes per-reach percentages from src/data/turfCycles.json
// (produced weekly by the data pipeline) ONLY when its reporting month is newer
// than the curated baseline above, so an incomplete current-month template never
// regresses confirmed values. Reaches that don't match by name keep their curated
// value; 1x/mo zones (cycle2Pct === null) stay single-cycle.
// ---------------------------------------------------------------------------
interface TurfCyclesFile {
  reportingMonth: { label: string; year: number; month: number } | null;
  reaches: { zone: string; reach: string; cycle1Pct: number | null; cycle2Pct: number | null }[];
}

const normTurf = (s: string) =>
  s.toLowerCase().replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim();

// The maintenance workbook groups a few reaches under different zones than our
// curated map (e.g. MRL and IHNC East are their own zones in the workbook), so
// normalized names alone don't line up. Map workbook "zone::reach" -> curated
// "zone::reach" for those. Verified by matching reach acreages.
const TURF_ALIASES: Record<string, string> = {
  "mrl::mrl (jefferson parish line to eb-00)": "upper protection::mrl (jefferson parish line to eb-00)",
  "ihnc east::ihnc east (e-01 to mrl)": "florida ave::ihnc east (e-01 to mrl)",
  "mrl::ihnc east to the st. bernard parish line": "florida ave::mrl (ihnc east to st. bernard parish line)",
  "non-federal back levee/nfl::40 arpent - orleans parish line to hwy 46 reggion in lower st bernard":
    "non-federal back levee/nfl::40 arpent levee - orleans parish line to hwy 46 reggio in lower st. bernard",
};

function applyTurfCycles(
  base: typeof rawGrassCuttingData,
  turf: TurfCyclesFile,
): typeof rawGrassCuttingData {
  const rm = turf.reportingMonth;
  if (!rm || !turf.reaches?.length) return base;
  const baseRank = base.reportingMonth.year * 12 + base.reportingMonth.month;
  if (rm.year * 12 + rm.month <= baseRank) return base; // not newer -> keep curated baseline

  // Flat lookup by normalized "zone::reach" (zone names are unique across districts).
  const lookup = new Map<string, { cycle1Pct: number | null; cycle2Pct: number | null }>();
  for (const r of turf.reaches) {
    const wbKey = `${normTurf(r.zone)}::${normTurf(r.reach)}`;
    lookup.set(TURF_ALIASES[wbKey] ?? wbKey, r);
  }

  const clone = JSON.parse(JSON.stringify(base)) as typeof rawGrassCuttingData;
  clone.reportingMonth = { label: rm.label, year: rm.year, month: rm.month, isComplete: false };

  // A newer reporting month is a fresh slate: matched reaches take the workbook's
  // values (absent = 0, i.e. not yet cut this month); 1x/mo zones stay single-cycle.
  // Unmatched reaches keep their curated value so a name miss never zeroes real work.
  const overlay = (zones: { name: string; reaches: Reach[] }[]) => {
    for (const zone of zones) {
      for (const reach of zone.reaches) {
        const v = lookup.get(`${normTurf(zone.name)}::${normTurf(reach.name)}`);
        if (!v) continue;
        reach.cycle1Pct = v.cycle1Pct ?? 0;
        if (reach.cycle2Pct !== null) reach.cycle2Pct = v.cycle2Pct ?? 0;
      }
    }
  };

  overlay(clone.zones);
  overlay(clone.ejldZones);
  overlay(clone.lbbldZones);
  return clone;
}

export const grassCuttingData = applyTurfCycles(
  rawGrassCuttingData,
  turfCyclesData as unknown as TurfCyclesFile,
);
