/**
 * Grass cutting page data.
 *
 * Cycle 1 (Mar 17 - Apr 15, 2026) data is from the maintenance team's
 * "New Cutting Plan" spreadsheet (real).
 *
 * Current cycle progress is DEMO data for layout review and will be replaced
 * once the cadence/format for ongoing updates is confirmed with the FPA
 * maintenance team.
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
      "Mon to Thu work schedule. Holidays and rain days are excluded from completion totals.",
    previousPlan: "Once per month (prior plan)",
  },

  lastCycle: {
    label: "Cycle 1: New plan rollout",
    startDate: "March 17, 2026",
    completionDate: "April 15, 2026",
    workingDays: 16,
  },

  // DEMO. Current cycle dates are placeholders chosen so the page renders
  // a realistic mid-cycle view. Replace with real data once the maintenance
  // team confirms cadence and provides a feed.
  currentCycle: {
    label: "Cycle 2: April 2026",
    startDate: "April 20, 2026",
    expectedCompletionDate: "May 11, 2026",
    workingDayElapsed: 4,
    workingDaysExpected: 16,
  },

  zones: [
    {
      key: "BLACK",
      name: "Upper Protection",
      color: "#1f2937",
      tint: "#374151",
      darkBackground: true,
      operators: 2,
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
      subAreas: [
        "Southside MRGO",
        "Citrus Back Levee",
      ],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 30, 2026",
        totalDays: 8,
      },
      currentCycle: {
        status: "IN_PROGRESS",
        startDate: "April 20, 2026",
        expectedCompletionDate: "April 30, 2026",
        daysElapsed: 4,
        daysExpected: 8,
      },
    },
    {
      key: "NAVY_BLUE",
      name: "Lakefront & Outfall Canals",
      color: "#1e3a8a",
      tint: "#3b82f6",
      darkBackground: true,
      operators: 3,
      subAreas: [
        "Lakefront",
        "Outfall Canals (17th Street, Orleans, Bayou St. John, London)",
        "IHNC West",
        "IHNC East (E-13 to N-01)",
      ],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "March 30, 2026",
        totalDays: 7,
        comments: "Longest pass in this group: Lakefront at 7 working days.",
      },
      currentCycle: {
        status: "IN_PROGRESS",
        startDate: "April 20, 2026",
        expectedCompletionDate: "April 28, 2026",
        daysElapsed: 4,
        daysExpected: 7,
      },
    },
    {
      key: "YELLOW",
      name: "Citrus Lakefront & Eastern Interior",
      color: "#facc15",
      tint: "#fde047",
      darkBackground: false,
      operators: 3,
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
        totalDays: 12,
        comments:
          "One operator on intermittent FMLA, another out on FMLA during this cycle.",
      },
      currentCycle: {
        status: "IN_PROGRESS",
        startDate: "April 20, 2026",
        expectedCompletionDate: "May 6, 2026",
        daysElapsed: 4,
        daysExpected: 12,
      },
    },
    {
      key: "ORANGE",
      name: "New Orleans East",
      color: "#ea580c",
      tint: "#fb923c",
      darkBackground: true,
      operators: 3,
      subAreas: [
        "LPV-108",
        "LPV-109",
        "LPV-110",
        "LPV-111",
      ],
      lastCycle: {
        startDate: "March 17, 2026",
        completionDate: "April 15, 2026",
        totalDays: 16,
        comments: "Multiple tractor issues during this cycle.",
      },
      currentCycle: {
        status: "IN_PROGRESS",
        startDate: "April 20, 2026",
        expectedCompletionDate: "May 11, 2026",
        daysElapsed: 4,
        daysExpected: 16,
      },
    },
  ] as GrassCuttingZone[],

  openQuestions: [
    'What do the "1", "2", and "3" labels on the printed map mean? Cycle order, priority tier, operator count, route number?',
    "Three zones (black, navy blue, orange) are not shaded in the spreadsheet. Are our zone assignments correct?",
    "Several rows have no start or completion dates (Paris Rd, Maxent, Michoud, NASA, Entergy, the IHNC East and MRL sub-rows). Are these sub-areas rolled up under their parent, or sections that have not been cut yet?",
    "Citrus Back Levee is shaded the same light blue as Southside MRGO but with a separate crew and start date. Same zone with a sequenced second crew, or actually a different zone?",
    "What is the cadence and format for cycle updates moving forward, and who should we expect them from?",
  ],
};
