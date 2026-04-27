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

export const siteConfig = {
  name: "FPA Lens",
  tagline: "Your Flood Defense System",
  organization: "Southeast Louisiana Flood Protection Authority - East",
  organizationShort: "SLFPA-E",
  lastUpdated: "April 2026", // Source: Apr 2026 SITREP
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
  // Source: Apr 2026 SITREP
  lastUpdated: "April 2026",
  overallStatus: "GREEN" as StatusLevel,
  categories: [
    {
      name: "Infrastructure Readiness",
      status: "GREEN" as StatusLevel,
      description: "Q1 field inspections complete and under engineering review; LPV levee and floodwall USACE inspections complete with no significant findings",
      source: "Apr 2026 SITREP",
    },
    {
      name: "Staffing Readiness",
      status: "AMBER" as StatusLevel,
      description: "45 vacancies agency-wide; recruitment efforts ongoing",
      source: "Apr 2026 SITREP",
    },
    {
      name: "Financial Readiness",
      status: "GREEN" as StatusLevel,
      description: "Nothing significant to report",
      source: "Apr 2026 SITREP",
    },
    {
      name: "Media Coverage",
      status: "GREEN" as StatusLevel,
      description: "Nothing significant to report",
      source: "Apr 2026 SITREP",
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
  // All from Apr 2026 SITREP unless noted
  systemReadiness: {
    label: "System Readiness",
    value: "GREEN",
    type: "status" as const,
    source: "Apr 2026 SITREP",
  },
  pccpPumps: {
    label: "PCCP Pumps Available",
    value: 17,
    total: 17,
    unit: "pumps",
    source: "Apr 2026 SITREP",
  },
  ytdAccidents: {
    label: "YTD At-Fault Accidents",
    value: 3,
    goal: 6,
    goalLabel: "2026 Goal: ≤6",
    source: "FPA Safety Officer reclassified event log, Apr 2026",
  },
  floodgateInspections: {
    label: "Hurricane Gate Inspections",
    value: 45,
    total: 100,
    unit: "% complete",
    source: "Apr 2026 SITREP",
  },
  staffCount: {
    label: "Total Staff",
    value: 256,
    breakdown: "244 classified, 12 unclassified",
    asOf: "Apr 1, 2026",
    source: "Apr 2026 SITREP",
  },
  permitsIssued: {
    label: "Permits Issued (Mar)",
    value: 27,
    source: "Apr 2026 SITREP",
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
    acres: 3530,
    byDistrict: { EJLD: 730, OLD: 1400, LBBLD: 1400 },
    source: "Regional Director, Apr 2026",
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
  // Source: Apr 2026 SITREP (data reported as of report generation)
  dataAsOf: "2026-04-01",
  // Hurricane gate annual inspections: 161 gates, tested Jan 1 to Jun 1
  // (5-month window), 32.2/month. Per Jeff's "FPA Lens Gate and Valve Testing"
  // workbook, Apr 2026 update.
  hurricaneGateInspections: {
    total: 161,
    completed: Math.round(161 * 0.45), // 45% per SITREP
    percentComplete: 45,
    periodStart: "2026-01-01",
    periodEnd: "2026-05-31",
    monthlyRate: 32.2,
    mandate: "USACE O&M Manual",
    source: "Apr 2026 SITREP",
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
    currentQuarter: "Q1 2026",
    currentQuarterPercent: 100,
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    monthlyRate: 33.33,
    mandate: "CPRA",
    reportSubmittedDate: null, // pending confirmation in next SITREP
    source: "Apr 2026 SITREP (Q1 field inspections complete and under engineering review)",
  },
  // USACE semi-annual inspection: 16.67%/month over the current half (Jan-Jun
  // or Jul-Dec). Status is graded against straight-line expected progress for
  // the report date, not raw percent complete (so 50% mid-half reads as on-pace).
  usaceSemiAnnualInspection: {
    currentHalfPercent: 50, // LPV complete, PCCP/Complex in progress Apr 14-28
    periodStart: "2026-01-01",
    periodEnd: "2026-06-30",
    monthlyRate: 16.67,
    mandate: "USACE",
    reportSubmittedDate: null,
    status: "LPV Levee/Floodwall inspections complete, no significant findings; PCCP/Complex inspections in progress Apr 14-28, 2026",
    source: "Apr 2026 SITREP",
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
  // Source: SITREPs (Jan-Apr 2026)
  permitsIssued: [
    { month: "September 2025", count: 25, source: "Oct 2025 SITREP" },
    { month: "October 2025", count: 50, source: "Nov 2025 SITREP" },
    { month: "November 2025", count: 46, source: "Dec 2025 SITREP" },
    { month: "December 2025", count: 10, source: "Jan 2026 SITREP" },
    { month: "January 2026", count: 42, source: "Feb 2026 SITREP" },
    { month: "February 2026", count: 25, source: "Mar 2026 SITREP" },
    { month: "March 2026", count: 27, source: "Apr 2026 SITREP" },
  ],

  floodgateInspections: {
    hurricaneGates: { percentComplete: 45, status: "Annual inspections and exercises underway" },
    valveExercises: { percentComplete: 92, status: "Q1 2026 valve inspections and exercises complete" },
    usaceInspections: "All LPV levee and floodwall USACE inspections complete with no significant findings; PCCP/Complex inspections in progress April 14-28, 2026",
    source: "Apr 2026 SITREP",
  },

  // Source: Apr 2026 SITREP
  pccpRepairStatus: {
    overallStatus: "Most items substantially complete and pending final acceptance (basement cracks, pump leaks, CP system); continuity testing of pumps underway. Climber screen gearbox replacement remains priority issue with delivery expected late April-early May 2026 and ~3-4 month installation.",
    managedBy: "JV/USACE",
    source: "Apr 2026 SITREP",
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
  cy26Goal: "≤6 at-fault accidents and maintain zero lost-time, fatal, or catastrophic events",
  ytdAtFaultAccidents: 3,
  goalMax: 6,
  source: "FPA Safety Officer reclassified event log, Apr 2026",
};

// ============================================================================
// STAFFING DATA
// ============================================================================

export const staffingData = {
  // Source: Apr 2026 SITREP
  asOfDate: "April 1, 2026",
  source: "Apr 2026 SITREP",

  headcount: {
    total: 256,
    classified: 244,
    unclassified: 12,
    vacancies: 45,
  },

  // Core Flood Protection Unit (MTC + OPS + ENG) zone framework.
  // Thresholds from Austin/Metoyer/Foster per Darren's Apr 1 2026 email;
  // RED thresholds are provisional pending HR confirmation of COVID-era lows.
  //
  // `current` values are MOCK previews until HR provides the real MTC/OPS/ENG
  // breakdown (expected week of 2026-04-27). Mocks chosen to show a realistic
  // Amber-for-MTC, Green-for-smaller-depts scenario so the UI is meaningful.
  // When real data arrives: replace each `current` and set isMockPreview=false.
  coreFPU: {
    asOfDate: "April 1, 2026",
    thresholdsSetBy: "Austin (Ops), Metoyer (Maintenance), Foster (Engineering)",
    thresholdsDate: "April 2026",
    thresholdsSource: "Darren Austin email, Apr 1 2026 (Subject: RE: FPA Lens: Staffing)",
    isMockPreview: true,
    aggregate: {
      key: "CORE_FPU",
      label: "Core Flood Protection Unit",
      full: 202,
      current: 162 as number | null, // MOCK
      thresholds: { amberMax: 175, redMax: 95 },
    },
    departments: [
      {
        key: "MTC",
        label: "Maintenance",
        full: 151,
        current: 120 as number | null, // MOCK
        thresholds: { amberMax: 136, redMax: 71 },
      },
      {
        key: "OPS",
        label: "Operations",
        full: 34,
        current: 28 as number | null, // MOCK
        thresholds: { amberMax: 26, redMax: 16 },
      },
      {
        key: "ENG",
        label: "Engineering",
        full: 17,
        current: 14 as number | null, // MOCK
        thresholds: { amberMax: 13, redMax: 8 },
      },
    ],
  },

  // Operational Support zones (Exec, HR, IT, Finance) — framework in development
  // with Regional Director. Placeholder only; no thresholds yet.
  opSupport: {
    status: "placeholder" as const,
    label: "Operational Support",
    groups: ["Executive", "Human Resources", "Information Technology", "Finance"],
    note: "Framework in development with Regional Director; thresholds to come",
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
  leadership: [
    { name: "L. Jeff Williams", title: "Regional Director" },
    { name: "Ryan Foster", title: "Director of Engineering" },
    { name: "Darren Austin", title: "Director of Operations" },
    { name: "Carlos Metoyer", title: "Director of Maintenance" },
    { name: "Denise Williams", title: "Director of Finance" },
    { name: "Joshua Rondeno", title: "Chief of Police" },
    { name: "Jamal Dortch", title: "Safety & Risk Manager" },
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
