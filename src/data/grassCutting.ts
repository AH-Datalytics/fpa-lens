/**
 * Grass cutting page data.
 *
 * Cycle 1 (Mar 17 - Apr 15, 2026) data is from the maintenance team's
 * "New Cutting Plan" spreadsheet (real). The public-facing page reports
 * calendar days (per the Director, Apr 2026); the source spreadsheet
 * tracks a 4-day work week, so calendar-day values here are derived from
 * the recorded start and completion dates.
 *
 * Current cycle progress is DEMO data for layout review and will be replaced
 * once the FPA's monthly acreage-benchmark format is wired up (per Director
 * direction, Apr 2026: target 2x/month for most reaches, ~1.5x/month for
 * NO East and Citrus Lakefront & Eastern Interior, with progress measured
 * against acreage targets).
 *
 * Zone color names match the FPA's hand-drawn cutting plan map.
 */

export type CycleStatus = "COMPLETE" | "IN_PROGRESS" | "SCHEDULED";

export interface ZoneCycleResult {
  startDate: string;
  completionDate: string;
  totalDays: number;
  comments?: string;
}

export interface ZoneCurrentProgress {
  status: CycleStatus;
  startDate: string | null;
  expectedCompletionDate: string;
  daysElapsed: number;
  daysExpected: number;
  comments?: string;
}

export interface GrassCuttingZone {
  key: string;
  name: string;
  /** Hex color matching the FPA's printed map. */
  color: string;
  /** Lighter tint used for card accents and bar fills. */
  tint: string;
  /** Use light text on dark backgrounds. */
  darkBackground: boolean;
  operators: number | string;
  /** Total mowing acreage from Kory's Apr 28 polygon shapefile. */
  acres: number;
  /** Target cycles per month (most are 2; NO East and Citrus Lakefront are ~1.5). */
  monthlyFrequency: number;
  subAreas: string[];
  lastCycle: ZoneCycleResult;
  currentCycle: ZoneCurrentProgress;
}

export const grassCuttingData = {
  asOfDate: "April 26, 2026",
  source: "Maintenance team cutting plan (Carlos Metoyer, March 2026)",

  systemTotal: {
    miles: 104.79,
    riverLevees: 13.23,
    innerLeveesNonTidal: 18.52,
    tidalLevees: 73.04,
  },

  cadence: {
    headline: "Twice per month",
    detail:
      "Target frequency is twice per month for most reaches, with New Orleans East and Citrus Lakefront & Eastern Interior targeted at roughly 1.5 cycles per month (about every three weeks).",
    previousPlan: "Once per month (prior plan)",
  },

  lastCycle: {
    label: "Cycle 1: New plan rollout",
    startDate: "March 17, 2026",
    completionDate: "April 15, 2026",
    calendarDays: 30,
  },

  // DEMO. Current cycle dates are placeholders chosen so the page renders
  // a realistic mid-cycle view. Replace with real data once the monthly
  // acreage-benchmark feed is wired up.
  currentCycle: {
    label: "Cycle 2: April 2026",
    startDate: "April 20, 2026",
    expectedCompletionDate: "May 11, 2026",
    daysElapsed: 8,
    daysExpected: 22,
  },

  zones: [
    {
      key: "BLACK",
      name: "Upper Protection",
      color: "#1f2937",
      tint: "#374151",
      darkBackground: true,
      operators: 2,
      acres: 62,
      monthlyFrequency: 2,
      subAreas: [
        "Mississippi River East Bank",
        "MRL (Jefferson Parish line to EB-00)",
        "MRL (IHNC to St. Bernard Parish line)",
      ],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 18, 2026",
        totalDays: 2,
      },
      currentCycle: {
        status: "COMPLETE",
        startDate: "April 20, 2026",
        expectedCompletionDate: "April 21, 2026",
        daysElapsed: 2,
        daysExpected: 2,
      },
    },
    {
      key: "GREEN",
      name: "Florida Ave",
      color: "#16a34a",
      tint: "#22c55e",
      darkBackground: true,
      operators: 1,
      acres: 57,
      monthlyFrequency: 2,
      subAreas: [
        "Florida Ave",
        "IHNC East (E-01 to MRL)",
      ],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 19, 2026",
        totalDays: 3,
      },
      currentCycle: {
        status: "COMPLETE",
        startDate: "April 20, 2026",
        expectedCompletionDate: "April 22, 2026",
        daysElapsed: 3,
        daysExpected: 3,
      },
    },
    {
      key: "LIGHT_BLUE",
      name: "Southside MRGO & Citrus Back",
      color: "#38bdf8",
      tint: "#7dd3fc",
      darkBackground: false,
      operators: "1 to 3",
      acres: 185,
      monthlyFrequency: 2,
      subAreas: [
        "Southside MRGO",
        "Citrus Back Levee",
      ],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 30, 2026",
        totalDays: 14,
        comments:
          "Citrus Back Levee has no dedicated operator yet. Once Southside MRGO crews finish their assigned areas, they roll over and complete Citrus Back. The two will be split into separate zones once an additional operator is in place.",
      },
      currentCycle: {
        status: "IN_PROGRESS",
        startDate: "April 20, 2026",
        expectedCompletionDate: "April 30, 2026",
        daysElapsed: 8,
        daysExpected: 11,
      },
    },
    {
      key: "NAVY_BLUE",
      name: "Lakefront & Outfall Canals",
      color: "#1e3a8a",
      tint: "#3b82f6",
      darkBackground: true,
      operators: 3,
      acres: 300,
      monthlyFrequency: 2,
      subAreas: [
        "Lakefront",
        "Outfall Canals (17th Street, Orleans, Bayou St. John, London)",
        "IHNC West",
        "IHNC East (E-13 to N-01)",
      ],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 30, 2026",
        totalDays: 14,
        comments: "Longest pass in this group was Lakefront.",
      },
      currentCycle: {
        status: "IN_PROGRESS",
        startDate: "April 20, 2026",
        expectedCompletionDate: "April 28, 2026",
        daysElapsed: 8,
        daysExpected: 9,
      },
    },
    {
      key: "YELLOW",
      name: "Citrus Lakefront & Eastern Interior",
      color: "#facc15",
      tint: "#fde047",
      darkBackground: false,
      operators: 3,
      acres: 253,
      monthlyFrequency: 1.5,
      subAreas: [
        "Citrus Lakefront",
        "Paris Rd",
        "Maxent",
        "Michoud Canal Floodwall",
        "NASA",
        "Entergy",
      ],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "April 8, 2026",
        totalDays: 23,
        comments:
          "One operator on intermittent FMLA, another out on FMLA during this cycle.",
      },
      currentCycle: {
        status: "IN_PROGRESS",
        startDate: "April 20, 2026",
        expectedCompletionDate: "May 6, 2026",
        daysElapsed: 8,
        daysExpected: 17,
      },
    },
    {
      key: "ORANGE",
      name: "New Orleans East",
      color: "#ea580c",
      tint: "#fb923c",
      darkBackground: true,
      operators: 3,
      acres: 650,
      monthlyFrequency: 1.5,
      subAreas: [
        "LPV-108",
        "LPV-109",
        "LPV-110",
        "LPV-111",
      ],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "April 15, 2026",
        totalDays: 30,
        comments: "Multiple tractor issues during this cycle.",
      },
      currentCycle: {
        status: "IN_PROGRESS",
        startDate: "April 20, 2026",
        expectedCompletionDate: "May 11, 2026",
        daysElapsed: 8,
        daysExpected: 22,
      },
    },
  ] as GrassCuttingZone[],

  // LPV-115 ("Paris Rd. to Jourdan", roughly the GIWW North area) is in
  // Kory's polygon shapefile with ~122 acres but was NOT on the original
  // hand-drawn cutting plan, and no one (Jeff, Carlos, or the maintenance
  // team) has confirmed it's actually mowed. Until that's confirmed, it
  // renders as the gray "Unassigned / pending classification" footprint
  // on the map and is left out of the 6 zones, the system-overview
  // totals, and the monthly-target math.
  pendingClassification: {
    name: "LPV-115 (Paris Rd. to Jourdan)",
    acres: 122,
    note: "Not on the original cutting plan. Pending confirmation from the Director / maintenance team about whether this is mowed and at what frequency.",
  },

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
  ],
};
