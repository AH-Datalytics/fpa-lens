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
  subAreas: string[];
  lastCycle: ZoneCycleResult;
}

export interface OtherDistrictZone {
  key: string;
  name: string;
  color: string;
  acres: number;
  operators: number;
  /** Target cycles per month. Assume 2 for EJLD/LBBLD until Carlos confirms exceptions. */
  monthlyFrequency: number;
  subAreas: string[];
  lastCycle: ZoneCycleResult;
}

export const grassCuttingData = {
  asOfDate: "May 1, 2026",
  source: "Maintenance team cutting plan (Carlos Metoyer, March-May 2026)",

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

  // Orleans Levee District zones - 6 colors matching the FPA's hand-drawn
  // cutting plan map. Cycle 1 dates from the "Mileage log OLD" tab.
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
        calendarDays: 2,
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
      subAreas: ["Florida Ave", "IHNC East (E-01 to MRL)"],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 19, 2026",
        totalDays: 3,
        calendarDays: 3,
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
      subAreas: ["Southside MRGO", "Citrus Back Levee"],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 30, 2026",
        totalDays: 14,
        calendarDays: 14,
        comments:
          "Citrus Back Levee has no dedicated operator yet. Once Southside MRGO crews finish their assigned areas, they roll over and complete Citrus Back. The two will be split into separate zones once an additional operator is in place.",
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
        calendarDays: 14,
        comments: "Longest pass in this group was Lakefront.",
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
        calendarDays: 23,
        comments:
          "One operator on intermittent FMLA, another out on FMLA during this cycle.",
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
      subAreas: ["LPV-108", "LPV-109", "LPV-110", "LPV-111"],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "April 15, 2026",
        totalDays: 30,
        calendarDays: 30,
        comments: "Multiple tractor issues during this cycle.",
      },
    },
  ] as OldGrassCuttingZone[],

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

  // East Jefferson Levee District zones from Kory's May 1 2026 GIS +
  // cutting-plan delivery. Acreage matches the email totals; cycle dates
  // are from the "Mileage log EJLD" tab. Colors chosen to be visually
  // distinct from OLD's 6-color palette.
  ejldZones: [
    {
      key: "EJLD_LAKEFRONT",
      name: "EJ Lakefront Reach 1-5",
      color: "#0369a1", // sky-700
      acres: 360,
      operators: 5,
      monthlyFrequency: 2,
      subAreas: [
        "St. Charles/Jeff Parish line to 17th St. Canal on EJ side",
      ],
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
      color: "#65a30d", // lime-600
      acres: 205,
      operators: 3,
      monthlyFrequency: 2,
      subAreas: ["Monticello to Alliance", "St. Charles/Jeff Parish line"],
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
      color: "#9333ea", // purple-600
      acres: 85,
      operators: 5,
      monthlyFrequency: 2,
      subAreas: [
        "Airline Hwy & Lesan Dr to St. Charles/Jeff Parish line (Reach 1)",
      ],
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
      color: "#c2410c", // orange-700
      acres: 10,
      operators: 1,
      monthlyFrequency: 2,
      subAreas: ["Along 17th St. Canal to Pinks St"],
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
      color: "#4338ca", // indigo-700
      acres: 592,
      operators: 5,
      monthlyFrequency: 2,
      subAreas: ["Bayou Dupre Structure (St. Bernard side) to HWY 39 at MRL"],
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
      color: "#0d9488", // teal-600
      acres: 316,
      operators: 5,
      monthlyFrequency: 2,
      subAreas: [
        '"40 Arpent"',
        "Orleans Parish line to HWY 46 Reggio in lower St. Bernard",
      ],
      lastCycle: {
        startDate: "April 14, 2026",
        completionDate: "April 16, 2026",
        totalDays: 3,
        calendarDays: 3,
      },
    },
    {
      key: "LBBLD_MRL",
      name: "MRL",
      color: "#b45309", // amber-700
      acres: 167,
      operators: 5,
      monthlyFrequency: 2,
      subAreas: [
        "Mississippi River Levee at HWY 39 to Arabi (Orleans Parish line)",
      ],
      lastCycle: {
        startDate: "April 20, 2026",
        completionDate: "April 22, 2026",
        totalDays: 3,
        calendarDays: 3,
        comments: "One day, 4 tractors, 1 driver on leave.",
      },
    },
    {
      key: "LBBLD_LPV145",
      name: "LPV-145",
      color: "#be185d", // pink-700
      acres: 278,
      operators: 5,
      monthlyFrequency: 2,
      subAreas: [
        '"The Island" (Bayou Bienvenue Structure to Bayou Dupre Structure)',
      ],
      lastCycle: {
        startDate: "April 22, 2026",
        completionDate: "April 28, 2026",
        totalDays: 4,
        calendarDays: 7,
        comments:
          "One day safety meeting; two days with 4 tractors, 1 driver on leave.",
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
