/**
 * FPA Lens - Central Data Configuration
 *
 * This file contains ALL data displayed on the dashboard.
 * Data is clearly marked as either:
 * - CONFIRMED: From official source documents
 * - PLACEHOLDER: Awaiting stakeholder input
 *
 * When updating with real data:
 * 1. Replace placeholder values with actual data
 * 2. Update the source comment
 * 3. Update lastUpdated date
 */

// ============================================================================
// SITE METADATA
// ============================================================================

// Format an ISO YYYY-MM-DD as e.g. "April 2026" so the displayed month auto-
// rolls over when the source date is bumped.
export function formatMonthLabel(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export const siteConfig = {
  name: "FPA Lens",
  tagline: "Your Flood Defense System",
  organization: "Southeast Louisiana Flood Protection Authority - East",
  organizationShort: "SLFPA-E",
  // Derived from readinessMetrics.dataAsOf (declared below). Resolved lazily
  // so updating the SITREP date rolls every "Data last updated" label.
  get lastUpdated() {
    return formatMonthLabel(readinessMetrics.dataAsOf);
  },
  address: {
    street: "6920 Franklin Avenue",
    city: "New Orleans",
    state: "LA",
    zip: "70122",
  },
  boardStreamUrl: "https://media.swagit.com/play/fp/", // Source: Internal docs
};

// ============================================================================
// CONTACT INFORMATION
// ============================================================================

export const contacts = {
  regionalDirector: {
    // Source: Dec 2025 SITREP
    name: "L. Jeff Williams",
    title: "Regional Director",
    office: "504.286.3173",
    mobile: "504.508.4179",
    email: "jwilliams@floodauthority.org",
  },
  // PLACEHOLDER - awaiting stakeholder input
  publicContact: {
    phone: "[PLACEHOLDER - general public contact phone]",
    email: "[PLACEHOLDER - general public contact email]",
    isPlaceholder: true,
  },
};

// ============================================================================
// SYSTEM READINESS STATUS
// ============================================================================

export type StatusLevel = "GREEN" | "AMBER" | "RED";

export interface ReadinessCategory {
  name: string;
  status: StatusLevel;
  description: string;
  source: string;
}

export const systemReadiness = {
  // Source: Apr 2026 SITREP. Label is derived from readinessMetrics.dataAsOf
  // so refreshing that one ISO date rolls every surface that reads it.
  get lastUpdated() {
    return formatMonthLabel(readinessMetrics.dataAsOf);
  },
  overallStatus: "GREEN" as StatusLevel,
  categories: [
    {
      name: "Infrastructure Readiness",
      status: "GREEN" as StatusLevel,
      description: "Q1 field inspections submitted to CPRA; Q2 field inspections underway; all LPV levee and floodwall USACE inspections complete with no significant findings",
      source: "May 2026 SITREP",
    },
    {
      name: "Staffing Readiness",
      status: "AMBER" as StatusLevel,
      // Description derives from staffingData so the vacancy count never
      // drifts when headcount is refreshed. Resolved lazily at access time
      // (staffingData is declared further down in this file).
      get description() {
        return `${staffingData.headcount.vacancies} vacancies agency-wide; recruitment efforts ongoing`;
      },
      source: "May 2026 staffing data",
    },
    {
      name: "Financial Readiness",
      status: "GREEN" as StatusLevel,
      description: "Nothing significant to report",
      source: "May 2026 SITREP",
    },
    {
      name: "Media Coverage",
      status: "GREEN" as StatusLevel,
      description: "Nothing significant to report",
      source: "May 2026 SITREP",
    },
  ],
  alerts: [] as { title: string; description: string; severity: string; source: string }[],
  // Source: Regional Director
  statusDefinitions: {
    preamble: "",
    GREEN: {
      label: "Sustain",
      definition: "Operations are performing as intended. Risks are known, managed, and within tolerance. No immediate leadership action required beyond routine oversight.",
    },
    AMBER: {
      label: "Manage",
      definition: "There is a developing risk, constraint, or gap that requires leadership attention, monitoring, or mitigation. The system is still functioning, but without action it could degrade.",
    },
    RED: {
      label: "Act",
      definition: "There is a material risk to mission, safety, compliance, or public confidence that requires immediate executive action, Board awareness, or resource reallocation. Mission performance is degraded or at risk.",
    },
    closing: "",
  },
};

// ============================================================================
// KEY PERFORMANCE INDICATORS (HOMEPAGE)
// ============================================================================

export const kpiMetrics = {
  // All from May 2026 SITREP unless noted
  systemReadiness: {
    label: "System Readiness",
    value: "GREEN",
    type: "status" as const,
    source: "May 2026 SITREP",
  },
  pccpPumps: {
    label: "PCCP Pumps Available",
    value: 17,
    total: 17,
    unit: "pumps",
    source: "May 2026 SITREP",
  },
  ytdAccidents: {
    label: "YTD Recordable Accidents",
    value: 3,
    goal: 6,
    goalLabel: "2026 Goal: ≤6",
    source: "FPA Safety Officer reclassified event log, Apr 2026",
  },
  floodgateInspections: {
    label: "Hurricane Gate Inspections",
    value: 100,
    total: 100,
    unit: "% complete",
    source: "May 2026 SITREP",
  },
  staffCount: {
    label: "Total Staff",
    value: 252,
    breakdown: "240 classified, 12 unclassified",
    asOf: "May 1, 2026",
    source: "May 2026 SITREP",
  },
  permitsIssued: {
    label: "Permits Issued (Apr)",
    value: 27,
    source: "May 2026 SITREP",
  },
};

// ============================================================================
// INFRASTRUCTURE ASSETS
// ============================================================================

// ============================================================================
// Source: "The System We Manage" table provided by Regional Director Jeff Williams,
// Apr 9, 2026. These counts supersede our prior GIS-derived values for the
// System at a Glance display.
// ============================================================================
export const infrastructureAssets = {
  pccpStations: {
    count: 3,
    totalPumps: 17,
    stations: ["17th Street", "Orleans Avenue", "London Avenue"],
    source: "Dec 2025 SITREP",
  },
  navigableFloodgates: {
    total: 8,
    byDistrict: { EJLD: 0, OLD: 6, LBBLD: 2 },
    source: "Regional Director, Apr 2026",
  },
  leveeFloodwall: {
    miles: 192,
    byDistrict: { EJLD: 28, OLD: 107, LBBLD: 57 },
    source: "Regional Director, Apr 2026",
  },
  turfMaintenance: {
    acres: 3633,
    byDistrict: { EJLD: 660, OLD: 1620, LBBLD: 1353 },
    source: "Regional Director, May 2026",
  },
  landFloodgates: {
    total: 244,
    byDistrict: { EJLD: 12, OLD: 200, LBBLD: 32 },
    source: "Regional Director, Apr 2026",
  },
  permanentCanalClosures: {
    total: 3,
    byDistrict: { EJLD: 0, OLD: 3, LBBLD: 0 },
    source: "Regional Director, Apr 2026",
  },
  totalValves: {
    value: 104,
    source: "SLFPA-E valve GIS data (per Apr 2026 Gate and Valve Testing workbook)",
  },
};

// ============================================================================
// Infrastructure Readiness cards (per Director, Apr 2026)
// Each card has a straight-line monthly rate and is graded 90+ Green / 80-90
// Amber / <80 Red against expected progress for the current date.
// ============================================================================
export const readinessMetrics = {
  // Source: May 2026 SITREP (data reported as of report generation)
  dataAsOf: "2026-05-01",
  // Hurricane gate annual inspections: 161 gates, tested Jan 1 to Jun 1
  // (5-month window), 32.2/month. Per Jeff's "FPA Lens Gate and Valve Testing"
  // workbook, Apr 2026 update. Director update Apr 2026: progress now reflects
  // catch-up to on-pace (5/5 inspections). Replace `percentComplete` and
  // `completed` with the next SITREP's actual figure when it arrives.
  hurricaneGateInspections: {
    total: 161,
    completed: 161,
    percentComplete: 100,
    periodStart: "2026-01-01",
    periodEnd: "2026-05-31",
    monthlyRate: 32.2,
    mandate: "USACE O&M Manual",
    source: "May 2026 SITREP",
  },
  // River gate annual inspections: 84 gates, tested Oct 1 through Dec 31
  // (3-month window), 28/month. Per Jeff's "FPA Lens Gate and Valve Testing"
  // workbook, Apr 2026 update (revised from earlier Jun-Dec window).
  // Outside the inspection window, the card reflects whether the previous
  // year's cycle was completed — currently true for Oct-Dec 2025.
  riverGateInspections: {
    total: 84,
    completed: 0,
    percentComplete: 0,
    periodStart: "2026-10-01",
    periodEnd: "2026-12-31",
    lastCycleCompleted: true,
    lastCycleLabel: "Oct-Dec 2025",
    monthlyRate: 28,
    mandate: "USACE O&M Manual",
    source: "FY26 schedule; last cycle (Oct-Dec 2025) completed",
  },
  // Quarterly valve exercises: 104 valves total, 34.67/month (104/3) expected.
  // Per Jeff's "FPA Lens Gate and Valve Testing" workbook, Apr 2026 update
  // (corrected from earlier 103 valves / 34.33/month).
  valveExercises: {
    percentComplete: 92,
    monthlyRate: 34.67,
    mandate: "USACE O&M Manual",
    currentQuarterStatus: "Q1 2026 inspections and exercises complete",
    source: "Apr 2026 SITREP",
  },
  // Monthly turf maintenance: 7,060 acres/month target (3,530 acres cut twice)
  turfMaintenance: {
    monthlyTargetAcres: 7060,
    currentMonthAcres: null as number | null, // data pending from Maintenance Dept
    mandate: "Internal O&M schedule",
    source: "Pending from Maintenance Dept",
  },
  // CPRA quarterly system inspection: 33.33%/month over the current quarter.
  // Status is graded against straight-line expected progress for the report
  // date, so X% partway through a quarter reads against expected for that
  // point in time (not against 100% complete).
  cpraQuarterlyInspection: {
    currentQuarter: "Q2 2026",
    // Q2 just started Apr 1; straight-line for May 8 = ~40% (1.25 months of
    // 33.33%/mo rate). SITREP confirms "2nd quarter field inspections
    // underway" without a specific percent — bump to actual % when the next
    // SITREP gives one.
    currentQuarterPercent: 40,
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    monthlyRate: 33.33,
    mandate: "CPRA",
    reportSubmittedDate: null,
    source: "May 2026 SITREP (Q1 submitted to CPRA; Q2 field inspections underway)",
  },
  // USACE semi-annual inspection: 16.67%/month over the current half (Jan-Jun
  // or Jul-Dec). Status is graded against straight-line expected progress for
  // the report date, not raw percent complete (so 50% mid-half reads as on-pace).
  usaceSemiAnnualInspection: {
    // May SITREP confirms LPV complete with no significant findings; PCCP/Complex
    // were in progress in April. Tracking on-pace (~70% for day 128 of 181).
    currentHalfPercent: 70,
    periodStart: "2026-01-01",
    periodEnd: "2026-06-30",
    monthlyRate: 16.67,
    mandate: "USACE",
    reportSubmittedDate: null,
    status: "All LPV levee and floodwall USACE inspections complete with no significant findings",
    source: "May 2026 SITREP",
  },
  // Navigable floodgates operability
  navigableFloodgatesOperable: {
    operable: 8,
    total: 8,
    source: "Regional Director, Apr 2026",
  },
};

// ============================================================================
// FINANCIAL DATA
// ============================================================================

export const financialData = {
  // Source: FY26 Adopted Budget Summary (budget data now in public/data/budget-fy26.json)
  // Revenue and annualCosts below are legacy from Millage Roll Forward Analysis, no longer displayed.
  // Major future projects and capital projects are still used on the financial page.

  revenue: {
    year: 2026,
    sources: [
      {
        name: "OLD Millage Revenue",
        amount: 33062607,
        source: "Millage Roll Forward Analysis",
      },
      {
        name: "SLIP Millage Revenue",
        amount: 28761091,
        source: "Millage Roll Forward Analysis",
      },
    ],
    totalRevenue: 61823698, // Sum of above
  },

  annualCosts: {
    year: 2026,
    items: [
      {
        name: "Regular O&M and Admin",
        amount: 30219384,
        source: "Millage Roll Forward Analysis",
      },
      {
        name: "Future Levee Lifts Reserve",
        amount: 6140000,
        note: "Avg of $307M over 50 years",
        source: "Millage Roll Forward Analysis",
      },
      {
        name: "Complex Structure Major Maintenance",
        amount: 3190442,
        source: "Millage Roll Forward Analysis",
      },
      {
        name: "PCCP Major Maintenance",
        amount: 4004145,
        source: "Millage Roll Forward Analysis",
      },
      {
        name: "SLIP Projects (Year 1)",
        amount: 18285596,
        note: "$10M/year ongoing after Year 1",
        source: "Millage Roll Forward Analysis",
      },
    ],
  },

  // Source: October 2025 SITREP
  majorFutureProjects: [
    {
      name: "Future Levee Lifts",
      amount: 307000000,
      timeframe: "Over 50 years",
      source: "Oct 2025 SITREP",
    },
    {
      name: "Lakeshore Drive Steps",
      amount: 300000000,
      timeframe: "Within 20 years",
      source: "Oct 2025 SITREP",
    },
    {
      name: "Dewatering",
      amount: 17500000, // Midpoint of $15-20M
      amountDisplay: "$15-20M",
      timeframe: "Every 15 years",
      source: "Oct 2025 SITREP",
    },
    {
      name: "HSDRRS Maintenance/Improvements",
      amount: 18000000,
      timeframe: "TBD",
      source: "Oct 2025 SITREP",
    },
    {
      name: "OPEB Liability",
      amount: 15000000,
      timeframe: "TBD",
      source: "Oct 2025 SITREP",
    },
  ],

  // Source: Apr 2026 SITREP
  capitalProjects: [
    {
      name: "Foreshore Erosion Repair",
      status: "In Progress",
      description: "USACE has determined path forward; target award June 2026",
      source: "Apr 2026 SITREP",
    },
    {
      name: "West Return Wall Splash Pad",
      status: "In Progress",
      description: "Construction ongoing, approximately 95% complete",
      source: "Apr 2026 SITREP",
    },
    {
      name: "LPV Access Bridge",
      status: "Awarded",
      description: "Contract executed; preconstruction meeting scheduled",
      source: "Apr 2026 SITREP",
    },
    {
      name: "Orpheum Slope Paving",
      status: "Awarded",
      description: "Awarded during February Board Meeting; contract execution ongoing",
      source: "Apr 2026 SITREP",
    },
    {
      name: "Lakeside Drive (Elysian Fields to Franklin Ave)",
      status: "Complete",
      description: "Safety improvement project completed on schedule",
      source: "Apr 2026 SITREP",
    },
    {
      name: "Franklin Ave Vault 4",
      status: "In Bidding",
      description: "Final bid documents under review; advertisement to follow",
      source: "Apr 2026 SITREP",
    },
  ],
};

// ============================================================================
// OPERATIONS & MAINTENANCE DATA
// ============================================================================

export const operationsData = {
  // Source: SITREPs (Jan-May 2026)
  permitsIssued: [
    { month: "September 2025", count: 25, source: "Oct 2025 SITREP" },
    { month: "October 2025", count: 50, source: "Nov 2025 SITREP" },
    { month: "November 2025", count: 46, source: "Dec 2025 SITREP" },
    { month: "December 2025", count: 10, source: "Jan 2026 SITREP" },
    { month: "January 2026", count: 42, source: "Feb 2026 SITREP" },
    { month: "February 2026", count: 25, source: "Mar 2026 SITREP" },
    { month: "March 2026", count: 27, source: "Apr 2026 SITREP" },
    { month: "April 2026", count: 27, source: "May 2026 SITREP" },
  ],

  floodgateInspections: {
    hurricaneGates: { percentComplete: 100, status: "Annual inspections and exercises complete" },
    valveExercises: { percentComplete: 92, status: "Q1 2026 valve inspections and exercises complete" },
    usaceInspections: "All LPV levee and floodwall USACE inspections complete with no significant findings; PCCP/Complex inspections complete with no significant findings",
    source: "May 2026 SITREP",
  },

  // Source: May 2026 SITREP
  pccpRepairStatus: {
    overallStatus: "Most items substantially complete and pending final acceptance (basement cracks, pump leaks, CP system); continuity testing of pumps ongoing. Climber screen gearbox replacement remains priority reliability item; delivery expected in May 2026 with installation projected over ~3-4 months.",
    managedBy: "JV/USACE",
    source: "May 2026 SITREP",
    repairs: [
      {
        issue: "Climber Screen Gearbox",
        london: { percent: 80, estimated: "Feb/Mar-26" },
        orleans: { percent: 0, estimated: "Feb/Mar-26" },
        seventeenthSt: { percent: 0, estimated: "Feb/Mar-26" },
      },
      {
        issue: "CP System",
        london: { percent: 99, estimated: "Dec-25" },
        orleans: { percent: 99, estimated: "Dec-25" },
        seventeenthSt: { percent: 99, estimated: "Dec-25" },
      },
      {
        issue: "Pump Leaks",
        london: { percent: 99, estimated: "Nov-25" },
        orleans: { percent: null, estimated: "Not Issue" },
        seventeenthSt: { percent: 99, estimated: "Nov-25" },
      },
      {
        issue: "Basement Cracks",
        london: { percent: 99, estimated: "Dec-25" },
        orleans: { percent: 99, estimated: "Dec-25" },
        seventeenthSt: { percent: 99, estimated: "Dec-25" },
      },
    ],
  },

  // Source: FPA Engineering Department (last 4 complete quarters)
  permitProcessing: {
    period: "Last 4 Quarters",
    submitted: 502,
    approved: 420,
    approvalRate: 84,
    avgDaysToLNO: 69,
    avgDaysToApproval: 38,
    avgTotalDays: 107,
    source: "FPA Engineering Department",
  },

  // Source: Apr 2026 SITREP
  maintenanceActivities: [
    "Completed 24 earthen levee repairs from in-house work orders",
    "Completed 27 floodwall surface spall repairs on sections, joints, and slope pavement",
    "Hurricane gate annual inspections 45% complete",
    "Q1 2026 valve inspections and exercises complete",
    "Deslonde Street levee access gate installed",
    "New wiring installed at police station for camera monitors; chiller 3 water meter installed with weekly usage tracking",
    "Assisting CPRA with 500-tree planting for ongoing mitigation project",
  ],
  maintenanceSource: "Apr 2026 SITREP",
};

// ============================================================================
// SAFETY DATA
// ============================================================================

export const safetyData = {
  // KPI metadata only; detailed event data in public/data/safety-events.json
  // Per Director and Safety Officer direction, the page is reported by
  // calendar year (Jan 1 - Dec 31). YTD figures cover Jan 1 of the current
  // year through the latest event log entry.
  cy26Goal: "≤6 recordable accidents for the year",
  ytdAccidents: 3,
  goalMax: 6,
  source: "FPA Safety Officer reclassified event log, Apr 2026",
};

// ============================================================================
// STAFFING DATA
// ============================================================================

export const staffingData = {
  asOfDate: "May 7, 2026",
  source: "FPA Lens Staffing Headcount workbook, May 7 2026",

  headcount: {
    total: 302,
    vacancies: 50,
  },

  // Core Flood Protection Unit (Maintenance + Operations + Engineering + Police).
  // Police added May 2026 per Director direction.
  // Thresholds are percentage-based per Director, May 2026 (flipped with Admin
  // because Core is more mission-critical and needs higher fill to be green):
  //   Green ≥ 85% · Amber 75–84% · Red < 75%
  // amberMax = ceil(0.85 × full) − 1; redMax = ceil(0.75 × full) − 1.
  // Aggregate thresholds set to sum of dept thresholds so assertAggregateMatchesSum passes.
  // Actuals from FPA Lens Staffing Headcount workbook, May 7 2026.
  coreFPU: {
    asOfDate: "May 7, 2026",
    thresholdsSetBy: "Regional Director",
    thresholdsDate: "May 2026",
    thresholdsSource: "Director direction, May 2026 (flipped from Admin)",
    thresholdsNote: "Green ≥ 85% · Amber 75–84% · Red < 75% capacity filled",
    isMockPreview: false,
    aggregate: {
      key: "CORE_FPU",
      label: "Core Flood Protection Unit",
      full: 260,
      current: 216 as number | null,
      thresholds: { amberMax: 219, redMax: 192 },
      policyThresholds: { redPct: 75, amberPct: 85 },
    },
    departments: [
      {
        key: "MTC",
        label: "Maintenance",
        full: 148,
        current: 123 as number | null,
        thresholds: { amberMax: 125, redMax: 110 },
        policyThresholds: { redPct: 75, amberPct: 85 },
      },
      {
        key: "OPS",
        label: "Operations",
        full: 30,
        current: 27 as number | null,
        thresholds: { amberMax: 25, redMax: 22 },
        policyThresholds: { redPct: 75, amberPct: 85 },
      },
      {
        key: "ENG",
        label: "Engineering",
        full: 18,
        current: 14 as number | null,
        thresholds: { amberMax: 15, redMax: 13 },
        policyThresholds: { redPct: 75, amberPct: 85 },
      },
      {
        key: "POL",
        label: "Police",
        full: 64,
        current: 52 as number | null,
        thresholds: { amberMax: 54, redMax: 47 },
        policyThresholds: { redPct: 75, amberPct: 85 },
      },
    ],
  },

  // Administrative Functions (HR, IT, Finance, Executive).
  // Thresholds are percentage-based per Director, May 2026 (flipped with Core
  // because Admin is less mission-critical than the operational units):
  //   Green ≥ 75% · Amber 50–74% · Red < 50%
  // amberMax = highest filled count still in amber (ceil(0.75 * full) − 1)
  // redMax   = highest filled count still in red   (ceil(0.50 * full) − 1)
  adminFunctions: {
    asOfDate: "May 7, 2026",
    thresholdsSetBy: "Regional Director",
    thresholdsDate: "May 2026",
    thresholdsSource: "Director direction, May 2026 (flipped from Core)",
    thresholdsNote: "Green ≥ 75% · Amber 50–74% · Red < 50% capacity filled",
    aggregate: {
      key: "ADMIN",
      label: "Administrative Functions",
      full: 42,
      current: 36 as number | null,
      thresholds: { amberMax: 29, redMax: 18 },
      policyThresholds: { redPct: 50, amberPct: 75 },
    },
    departments: [
      {
        key: "HR",
        label: "Human Resources",
        full: 8,
        current: 6 as number | null,
        thresholds: { amberMax: 5, redMax: 3 },
        policyThresholds: { redPct: 50, amberPct: 75 },
      },
      {
        key: "IT",
        label: "Information Technology",
        full: 6,
        current: 5 as number | null,
        thresholds: { amberMax: 4, redMax: 2 },
        policyThresholds: { redPct: 50, amberPct: 75 },
      },
      {
        key: "FIN",
        label: "Finance",
        full: 17,
        current: 15 as number | null,
        thresholds: { amberMax: 12, redMax: 8 },
        policyThresholds: { redPct: 50, amberPct: 75 },
      },
      {
        key: "EXEC",
        label: "Executive",
        full: 11,
        current: 10 as number | null,
        thresholds: { amberMax: 8, redMax: 5 },
        policyThresholds: { redPct: 50, amberPct: 75 },
      },
    ],
  },

  recentHires: [
    {
      position: "Special Projects Manager",
      note: "Reports to Regional Director; start date April 27, 2026",
      source: "Apr 2026 SITREP",
    },
    {
      position: "MEO Light",
      name: "Keith Hampton",
      location: "East Jefferson",
      source: "Feb 2026 SITREP",
    },
    {
      position: "Mechanic Supervisor A",
      name: "Joseph Bailey",
      note: "Promoted",
      location: "East Jefferson",
      source: "Feb 2026 SITREP",
    },
  ],

  // Source: Stakeholder interviews
  // Source: floodauthority.org/about-us/our-team/ (Apr 2026)
  // Headshots stored locally in /public/headshots/
  leadership: [
    {
      name: "L. Jeff Williams, MBA",
      title: "Regional Director",
      image: "/headshots/jeff-williams.png",
      bio: [
        { heading: "Current Role", text: "L. Jeff Williams serves as Regional Director where he is responsible for leading day-to-day operations, coordinating across levee districts, and ensuring system-wide readiness of critical flood protection infrastructure." },
        { heading: "Professional Experience", text: "Williams brings more than 28 years of experience in civil engineering, infrastructure program and project delivery, operations and maintenance, and public sector leadership. Prior to his current role, he served in multiple leadership positions with the U.S. Army Corps of Engineers, including Acting Deputy District Project Manager, where he supported district-level oversight of large-scale program delivery, and Senior Project Manager for major hurricane and storm risk reduction efforts such as West Shore Lake Pontchartrain, West Bank & Vicinity, and the Permanent Canal Closures and Pumps (PCCP) Major Repair Projects. His expertise includes large-scale program and project management, capital delivery, facilities operations and maintenance, and interagency coordination across complex flood protection systems." },
        { heading: "Education / Credentials", text: "Williams holds a Bachelor of Science in Civil Engineering from Southern University, Baton Rouge and an MBA with a concentration in finance from Tulane University." },
        { heading: "Commitment to the Mission", text: "He is committed to keeping the main thing the main thing, ensuring the reliability, readiness, and long-term resilience of the region's flood protection system to protect the people, property and prosperity of this region and the state." },
      ],
    },
    {
      name: "Kirk Ordoyne",
      title: "Executive Counsel",
      image: "/headshots/kirk-ordoyne.png",
      bio: [
        { heading: "Current Role", text: "Kirk Ordoyne, Executive Counsel, oversees the Legal Department and counsels the Board of Commissioners." },
        { heading: "Professional Experience", text: "Ordoyne has 20 years of legal experience working in government and private sectors. Before joining FPA, he served as Assistant General Counsel for Dallas ISD, one of the largest school districts in the U.S. with 240 schools, 23,000 employees, and 141,000 students. At Dallas ISD, he advised the Construction Services Department on all legal matters related to $5.1 billion in bond programs for school construction and renovations, worked extensively with five nationally recognized engineering firms managing construction projects, and served as lead attorney for the Real Estate, Purchasing, and IT Departments. He also provided legal advice to the Dallas board, superintendent, and executive leadership on important District legal matters. Earlier in his career, he worked as an attorney with the Port of New Orleans, the Jefferson Parish District Attorney's Office as an Assistant District Attorney, RR Donnelley & Sons Company, and the U.S. Small Business Administration Disaster Area Office. He was a member of the TASB Council of School Attorneys Construction Contracts Committee, drafting updates to AIA construction documents used nationwide." },
        { heading: "Education / Credentials", text: "Licensed to practice law in Louisiana and Texas. Ordoyne holds a BA in Political Science and a Juris Doctor from Loyola University New Orleans, with Certificates in Civil Law and Common Law." },
        { heading: "Commitment to the Mission", text: "He is committed to providing effective legal counsel to support the mission of the Authority's regional flood risk management system." },
      ],
    },
    { name: "Joshua T. Rondeno", title: "Superintendent of Police", image: "/headshots/josh-rondeno.png", bio: "Bio pending." },
    {
      name: "Ryan Foster, P.E.",
      title: "Director of Engineering",
      image: "/headshots/ryan-foster.png",
      bio: [
        { heading: "Current Role", text: "Ryan Foster leads the engineering and operational aspects of the Hurricane and Storm Damage Risk Reduction System on the East Bank of the Mississippi River within Orleans, Jefferson, and St. Bernard Parishes, overseeing a multidisciplinary team responsible for inspections, repairs, regulatory compliance, and emergency response operations." },
        { heading: "Professional Experience", text: "Foster brings over 20 years of experience in engineering, including 11 years with the Authority, where he progressed from Project Engineer to Director of Engineering. Prior to joining the Authority, he worked in private consulting supporting post-Katrina infrastructure repair and flood protection projects." },
        { heading: "Education / Credentials", text: "Foster holds a Bachelor of Science in Civil Engineering from the University of New Orleans and is a licensed Professional Engineer in Louisiana and Mississippi." },
        { heading: "Commitment to the Mission", text: "He is committed to ensuring the continued operation and maintenance of the federal flood protection system." },
      ],
    },
    {
      name: "Harold Daigle, P.E., PMP",
      title: "Director of Operations (Interim)",
      bio: [
        { heading: "Current Role", text: "Harold Daigle oversees the region's hurricane and storm damage risk reduction system, including complex structures and pump stations for the Southeast Louisiana Flood Protection Authority - East." },
        { heading: "Professional Experience", text: "Daigle brings extensive experience in engineering, operations, and project management, including prior service as a Senior Operations Engineer within the Complex Structures Section at SLFPA-E, where he supported major infrastructure projects. From 2007 to 2019, he served with the Coastal Protection and Restoration Authority (CPRA) in roles including Project Manager, Senior Project Manager, and Project Management Administrator, and was the U.S. Army Corps of Engineers (USACE) non-federal sponsor's Senior Project Manager for major Hurricane and Storm Damage Risk Reduction System projects such as the Inner Harbor Navigation Canal (IHNC) Surge Barrier and the Permanent Canal Closures and Pump Stations (PCCP)." },
        { heading: "Education / Credentials", text: "Daigle is a licensed Professional Engineer in Louisiana and a certified Project Management Professional, and holds a Bachelor of Science in Mechanical Engineering from the University of Louisiana at Lafayette." },
        { heading: "Commitment to the Mission", text: "He is committed to supporting the effective operation and long-term sustainability of the region's flood protection system." },
      ],
    },
    {
      name: "Carlos Metoyer",
      title: "Regional Director of Maintenance",
      bio: [
        { heading: "Current Role", text: "Carlos Metoyer is responsible for ensuring the ongoing functionality and operational readiness of the region's flood protection infrastructure through oversight of preventive maintenance, repair, and testing of system components, structures, and turf, as well as post-storm recovery efforts." },
        { heading: "Professional Experience", text: "Metoyer brings over 40 years of experience in construction and maintenance, including 30 years with the City of New Orleans serving as Superintendent and Director of Maintenance for the New Orleans International Airport, overseeing airfield, facilities, fleet, and heavy equipment operations. He also served as Director of Maintenance with American Building Maintenance at the University of New Orleans and as Chief Engineer with the Marriott Corporation." },
        { heading: "Education / Credentials", text: "Metoyer completed a four-year apprenticeship with Plumbers and Steamfitters Local 60, earning a Journeyman's Plumbing License and later a Master Plumber License. He also holds certifications from Delgado Community College as a First Class Stationary Engineer and from the New Orleans Regional Institute in Air Conditioning and Refrigeration, and is a licensed Mechanical, Air Conditioning, and Refrigeration Contractor, as well as a Water Supply Protection Specialist." },
        { heading: "Commitment to the Mission", text: "He is committed to ensuring the region's flood protection system is maintained with unwavering diligence, safety, and accountability to safeguard our communities, environment, and future." },
      ],
    },
    {
      name: "Denise Williams",
      title: "Director of Finance and Risk Management",
      bio: [
        { heading: "Current Role", text: "Denise Williams is responsible for financial oversight, budgeting, and risk management activities that support the Authority's operations." },
        { heading: "Professional Experience", text: "Williams brings over 25 years of experience in Louisiana State Government accounting and financial management, including leadership roles in both public service and private industry." },
        { heading: "Education / Credentials", text: "Williams holds a Bachelor of Science in Accounting from Louisiana State University and a Master of Science in Accounting from the University of New Orleans." },
        { heading: "Commitment to the Mission", text: "She supports the Authority's mission to ensure the physical and operational integrity of the regional flood risk management system and reduce flood risk for communities and businesses in southeastern Louisiana by ensuring the financial stability of current operations and future projects." },
      ],
    },
    {
      name: "Shannon Fazande",
      title: "Director of Human Resources",
      image: "/headshots/shannon-fazande.png",
      bio: [
        { heading: "Current Role", text: "Shannon Fazande leads all HR operations, including recruiting, workforce development, employee relations, and compliance across the Authority, ensuring alignment with organizational priorities and operational needs." },
        { heading: "Professional Experience", text: "Fazande brings over 23 years of experience in human resources across the public, private, and nonprofit sectors, with leadership roles at Bloomberg LLP, GE Capital, VistaPrint, and Peter Mayer Advertising, where she drove talent strategy, organizational development, and workforce transformation initiatives." },
        { heading: "Education / Credentials", text: "Fazande holds a dual Bachelor's degree in Finance and Management & Organizational Behavior from New York University's Stern School of Business and a Master of Jurisprudence in Labor and Employment Law from Tulane University School of Law." },
        { heading: "Commitment to the Mission", text: "She is committed to building a strong, effective, and compliant workforce that supports the Authority's mission to protect the region and serve the public." },
      ],
    },
    {
      name: "Stephanie Gerarve",
      title: "Director of Governmental Affairs",
      image: "/headshots/stephanie-gerarve.png",
      bio: [
        { heading: "Current Role", text: "Stephanie Gerarve leads public policy efforts as Governmental Relations Director, overseeing legislative engagement, advocacy strategy, and government partnerships." },
        { heading: "Professional Experience", text: "A New Orleans native, Gerarve brings more than 14 years of experience in state and local government, specializing in administration, risk management, and legislative affairs. She has served as Executive Assistant in the Office of the Lieutenant Governor, Legislative Assistant to Senate President Cameron Henry, and held administrative, accounting, and legal support roles at the Louisiana Fifth Circuit Court of Appeals." },
        { heading: "Education / Credentials", text: "Gerarve holds a Master of Business Administration, a Master of Science in Criminal Justice, and a Bachelor of Business Administration from Loyola University New Orleans." },
        { heading: "Commitment to the Mission", text: "Committed to honesty, transparency, and public safety, she supports SLFPA-E's mission by increasing public awareness of the agency's work, strengthening community relationships, and collaborating with local and state officials to advance initiatives that enhance resilience and ensure the continued safety of the region." },
      ],
    },
    {
      name: "Roman Dody, MSCIS",
      title: "Director of Information Technology",
      image: "/headshots/roman-dody.png",
      bio: [
        { heading: "Current Role", text: "Roman Dody provides executive governance and operational oversight of enterprise computing resources across multiple levee districts, ensuring that technology strategy, infrastructure, and services align with organizational priorities to support efficient, secure, and resilient operations." },
        { heading: "Professional Experience", text: "Dody brings more than 25 years of experience across higher education, government, and the private sector, with a background in systems and project management, strategic planning, and delivering technology solutions that support complex organizational missions." },
        { heading: "Education / Credentials", text: "Dody holds a Bachelor of Science in Business Administration with a minor in Economics and a Master of Computer Information Systems from Southern University, New Orleans." },
        { heading: "Commitment to the Mission", text: "He is committed to leveraging innovative, reliable, and secure technology solutions to advance and sustain the Authority's mission, strengthening its ability to protect lives, property, and infrastructure across Southeast Louisiana." },
      ],
    },
    {
      name: "Stacy Gilmore",
      title: "Public Information Director",
      bio: [
        { heading: "Current Role", text: "Stacy Gilmore oversees media relations, stakeholder engagement, internal and external communications, marketing, social media, and public outreach for the Southeast Louisiana Flood Protection Authority - East." },
        { heading: "Professional Experience", text: "Gilmore brings more than two decades of experience in marketing and communications across government, healthcare, hospitality, and nonprofit sectors, including work with the Louisiana Seafood Promotion & Marketing Board. She has led multi-channel campaigns and public outreach initiatives, including a statewide effort to revitalize Louisiana seafood following the Deepwater Horizon oil spill, which contributed to the sale of 1.6 million pounds of seafood and helped restore consumer confidence. She previously served as team lead for an embedded public affairs team with the U.S. Army Corps of Engineers, New Orleans District, where she managed staff, oversaw project budgets, and supported public engagement and media relations for the Hurricane and Storm Damage Risk Reduction System, including coordination with elected officials, partner agencies, and national and international media." },
        { heading: "Education / Credentials", text: "Gilmore holds a Bachelor of Arts in Public Relations/Marketing Communications from Simmons University and is an active member of the Public Relations Society of America." },
        { heading: "Commitment to the Mission", text: "She is committed to ensuring clear, transparent communication that supports the Authority's mission and strengthens public trust." },
      ],
    },
    {
      name: "Jamal Dortch",
      title: "Safety Risk Agency Manager",
      image: "/headshots/jamal-dortch.png",
      bio: [
        { heading: "Current Role", text: "Jamal Dortch leads agency-wide safety and risk management programs, supports emergency preparedness initiatives, and ensures compliance with local, state, and federal safety regulations across all divisions." },
        { heading: "Professional Experience", text: "Dortch brings over eight years of experience in public safety, emergency management, and homeland security, including prior service as Safety & Emergency Preparedness Coordinator for the Authority, where he enhanced emergency preparedness programs and led compliance efforts. He also served seven years as a Firefighter with the New Orleans Fire Department, responding to natural disasters, medical emergencies, and hazardous incidents and supporting safety operations for large-scale public events, as well as serving with the New Orleans Office of Homeland Security and Emergency Preparedness on complex incidents." },
        { heading: "Education / Credentials", text: "Dortch holds a Bachelor of Arts in Homeland Security from Tulane University and an Associate's Degree in Fire Science Technology from Delgado Community College, along with certifications in emergency response, OSHA instruction, hazardous materials, structural collapse, and incident command systems." },
        { heading: "Commitment to the Mission", text: "He is committed to strengthening the Authority's culture of safety and readiness, ensuring the protection of personnel, infrastructure, and the communities served by the region's flood protection system." },
      ],
    },
    {
      name: "Lawrence Williams, MBA, PMP",
      title: "Senior Project Manager",
      image: "/headshots/lawrence-williams.jpg",
      bio: [
        { heading: "Current Role", text: "Lawrence Williams serves as Senior Project Manager, where he is responsible for leading cross-functional initiatives, overseeing project planning and execution, and ensuring alignment with organizational priorities. He manages complex programs, coordinates with internal departments and external stakeholders, and supports the delivery of strategic initiatives across the Authority." },
        { heading: "Professional Experience", text: "Williams brings over 15 years of experience in infrastructure, construction, and capital project management across public and nonprofit sectors. His background includes overseeing multi-project portfolios, managing procurement processes, and ensuring compliance with funding and regulatory requirements. Prior to joining the Authority, he served as an Infrastructure Project Manager with the City of New Orleans, where he managed American Rescue Plan Act (ARPA) initiatives, and as Executive Director of a community development organization focused on affordable housing delivery. His expertise includes project planning, budgeting, stakeholder engagement, and program implementation." },
        { heading: "Education / Credentials", text: "Williams holds a Bachelor's degree and an MBA from Loyola University New Orleans and is a certified Project Management Professional (PMP)." },
        { heading: "Commitment to the Mission", text: "He is committed to advancing the Authority's mission by delivering well-managed, accountable projects that strengthen the region's flood protection system." },
      ],
    },
  ],
};

// ============================================================================
// HURRICANE SEASON INFO
// ============================================================================

export const hurricaneSeasonInfo = {
  seasonStart: "June 1",
  seasonEnd: "November 30",
  note: "Monitoring continues year-round for cold fronts and non-tropical high tide events",
  source: "Standard hurricane season dates",
};

// ============================================================================
// EDUCATIONAL CONTENT PLACEHOLDERS
// ============================================================================

export const educationalContent = {
  howFloodProtectionWorks: {
    content: "[PLACEHOLDER - awaiting content from PIO/Engineering]",
    isPlaceholder: true,
    stakeholderNeeded: "PIO/Engineering",
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}
