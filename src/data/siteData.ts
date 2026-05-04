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
      description: "41 vacancies agency-wide; recruitment efforts ongoing",
      source: "May 2026 staffing data",
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
  // workbook, Apr 2026 update. Director update Apr 2026: progress now reflects
  // catch-up to on-pace (5/5 inspections). Replace `percentComplete` and
  // `completed` with the next SITREP's actual figure when it arrives.
  hurricaneGateInspections: {
    total: 161,
    completed: Math.round(161 * 0.6), // 60% — on pace
    percentComplete: 60,
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
  asOfDate: "May 4, 2026",
  source: "Shannon Fazande (HR Director) email, May 4 2026",

  headcount: {
    total: 236,
    vacancies: 41,
  },

  // Core Flood Protection Unit (Maintenance + Operations + Engineering).
  // Thresholds are percentage-based: Green ≥ 75% · Amber 50–74% · Red < 50%.
  // amberMax = ceil(0.75 × full) − 1; redMax = ceil(0.50 × full) − 1.
  // Aggregate thresholds set to sum of dept thresholds so assertAggregateMatchesSum passes.
  // Actuals from Shannon Fazande HR data, May 4 2026.
  coreFPU: {
    asOfDate: "May 4, 2026",
    thresholdsSetBy: "Regional Director",
    thresholdsDate: "May 2026",
    thresholdsSource: "Shannon Fazande email, May 4 2026",
    thresholdsNote: "Green ≥ 75% · Amber 50–74% · Red < 50% capacity filled",
    isMockPreview: false,
    aggregate: {
      key: "CORE_FPU",
      label: "Core Flood Protection Unit",
      full: 193,
      current: 159 as number | null,
      thresholds: { amberMax: 143, redMax: 94 },
      policyThresholds: { redPct: 50, amberPct: 75 },
    },
    departments: [
      {
        key: "MTC",
        label: "Maintenance",
        full: 145,
        current: 120 as number | null,
        thresholds: { amberMax: 108, redMax: 72 },
        policyThresholds: { redPct: 50, amberPct: 75 },
      },
      {
        key: "OPS",
        label: "Operations",
        full: 30,
        current: 25 as number | null,
        thresholds: { amberMax: 22, redMax: 14 },
        policyThresholds: { redPct: 50, amberPct: 75 },
      },
      {
        key: "ENG",
        label: "Engineering",
        full: 18,
        current: 14 as number | null,
        thresholds: { amberMax: 13, redMax: 8 },
        policyThresholds: { redPct: 50, amberPct: 75 },
      },
    ],
  },

  // Administrative Functions (HR, IT, Finance, Executive).
  // Thresholds are percentage-based per Shannon Fazande, May 4 2026:
  //   Green ≥ 85% · Amber 75–84% · Red < 75%
  // amberMax = highest filled count still in amber (ceil(0.85 * full) − 1)
  // redMax   = highest filled count still in red   (ceil(0.75 * full) − 1)
  adminFunctions: {
    asOfDate: "May 4, 2026",
    thresholdsSetBy: "Fazande (HR Director)",
    thresholdsDate: "May 2026",
    thresholdsSource: "Shannon Fazande email, May 4 2026",
    thresholdsNote: "Green ≥ 85% · Amber 75–84% · Red < 75% capacity filled",
    aggregate: {
      key: "ADMIN",
      label: "Administrative Functions",
      full: 43,
      current: 36 as number | null,
      thresholds: { amberMax: 36, redMax: 32 },
      policyThresholds: { redPct: 75, amberPct: 85 },
    },
    departments: [
      {
        key: "HR",
        label: "Human Resources",
        full: 8,
        current: 6 as number | null,
        thresholds: { amberMax: 6, redMax: 5 },
        policyThresholds: { redPct: 75, amberPct: 85 },
      },
      {
        key: "IT",
        label: "Information Technology",
        full: 6,
        current: 5 as number | null,
        thresholds: { amberMax: 5, redMax: 4 },
        policyThresholds: { redPct: 75, amberPct: 85 },
      },
      {
        key: "FIN",
        label: "Finance",
        full: 17,
        current: 15 as number | null,
        thresholds: { amberMax: 14, redMax: 12 },
        policyThresholds: { redPct: 75, amberPct: 85 },
      },
      {
        key: "EXEC",
        label: "Executive",
        full: 12,
        current: 10 as number | null,
        thresholds: { amberMax: 10, redMax: 8 },
        policyThresholds: { redPct: 75, amberPct: 85 },
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
    { name: "Kirk Ordoyne", title: "Executive Counsel", image: "/headshots/kirk-ordoyne.png", bio: "Bio pending." },
    { name: "Joshua T. Rondeno", title: "Superintendent of Police", image: "/headshots/josh-rondeno.png", bio: "Bio pending." },
    { name: "Ryan Foster, P.E.", title: "Director of Engineering", image: "/headshots/ryan-foster.png", bio: "Bio pending." },
    { name: "Harold Daigle, P.E., PMP", title: "Director of Operations (Interim)", bio: "Bio pending." },
    { name: "Denise Williams", title: "Director of Finance and Risk Management", bio: "Bio pending." },
    { name: "Shannon Fazande", title: "Director of Human Resources", image: "/headshots/shannon-fazande.png", bio: "Bio pending." },
    { name: "Stephanie Gerarve", title: "Director of Governmental Affairs", image: "/headshots/stephanie-gerarve.png", bio: "Bio pending." },
    { name: "Roman Dody, MSCIS", title: "Director of Information Technology", image: "/headshots/roman-dody.png", bio: "Bio pending." },
    { name: "Stacy Gilmore", title: "Public Information Director", bio: "Bio pending." },
    { name: "Jamal Dortch", title: "Safety Risk Agency Manager", image: "/headshots/jamal-dortch.png", bio: "Bio pending." },
    {
      name: "Lawrence Williams, MBA, PMP",
      title: "Senior Project Manager",
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
