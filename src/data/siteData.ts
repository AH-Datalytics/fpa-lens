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
  lastUpdated: "March 2026", // Source: Mar 2026 SITREP
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
  // Source: Mar 2026 SITREP
  lastUpdated: "March 2026",
  overallStatus: "GREEN" as StatusLevel,
  riverConditions: {
    level: 3.78,
    unit: "ft",
    status: "Below flood stage",
    forecast: "Forecast to rise to 4.5 ft in early March, then slow fall to 3.0 ft",
    source: "Mar 2026 SITREP",
  },
  categories: [
    {
      name: "Infrastructure Readiness",
      status: "GREEN" as StatusLevel,
      description: "Q4 inspections submitted to CPRA; Q1 inspections underway and on schedule; all 17 PCCP pumps available; all USACE levee and floodwall inspections complete",
      source: "Mar 2026 SITREP",
    },
    {
      name: "Staffing Readiness",
      status: "AMBER" as StatusLevel,
      description: "45 vacancies agency-wide; recruitment efforts ongoing",
      source: "Mar 2026 SITREP",
    },
    {
      name: "Financial Readiness",
      status: "GREEN" as StatusLevel,
      description: "Nothing significant to report",
      source: "Mar 2026 SITREP",
    },
    {
      name: "Media Coverage",
      status: "GREEN" as StatusLevel,
      description: "Nothing significant to report",
      source: "Mar 2026 SITREP",
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
  // All from Mar 2026 SITREP unless noted
  systemReadiness: {
    label: "System Readiness",
    value: "GREEN",
    type: "status" as const,
    source: "Mar 2026 SITREP",
  },
  pccpPumps: {
    label: "PCCP Pumps Available",
    value: 17,
    total: 17,
    unit: "pumps",
    source: "Mar 2026 SITREP",
  },
  ytdAccidents: {
    label: "YTD Accidents",
    value: 5,
    goal: 6,
    goalLabel: "FY26 Goal: ≤6",
    source: "Mar 2026 SITREP",
  },
  floodgateInspections: {
    label: "Hurricane Gate Inspections",
    value: 45,
    total: 100,
    unit: "% complete",
    source: "Mar 2026 SITREP",
  },
  staffCount: {
    label: "Total Staff",
    value: 267,
    breakdown: "255 classified, 12 unclassified",
    asOf: "Mar 1, 2026",
    source: "Mar 2026 SITREP",
  },
  permitsIssued: {
    label: "Permits Issued (Feb)",
    value: 25,
    source: "Mar 2026 SITREP",
  },
};

// ============================================================================
// INFRASTRUCTURE ASSETS
// ============================================================================

export const infrastructureAssets = {
  pccpStations: {
    count: 3,
    totalPumps: 17,
    stations: ["17th Street", "Orleans Avenue", "London Avenue"],
    source: "Dec 2025 SITREP",
  },
  complexStructures: {
    list: [
      "IHNC Surge Barrier North",
      "IHNC Surge Barrier South",
      "Seabrook",
      "Bayou St. John Sector Gate",
      "Dupre",
      "Caernarvon",
      "GIWW Sector Gate",
    ],
    source: "SLFPA-E project documentation",
  },
  totalLeveeMiles: {
    value: 183,
    source: "SLFPA-E levee centerline GIS data",
  },
  totalFloodgates: {
    value: 248,
    source: "SLFPA-E floodgate GIS data",
  },
  totalValves: {
    value: 103,
    source: "SLFPA-E valve GIS data",
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

  // Source: Mar 2026 SITREP
  capitalProjects: [
    {
      name: "Foreshore Erosion Repair",
      status: "In Progress",
      description: "USACE has determined path forward; target award June 2026",
      source: "Mar 2026 SITREP",
    },
    {
      name: "West Return Wall Splash Pad",
      status: "In Progress",
      description: "Construction ongoing, approximately 45% complete",
      source: "Mar 2026 SITREP",
    },
    {
      name: "LPV Access Bridge",
      status: "Awarded",
      description: "Awarded during February Board Meeting; contract execution ongoing",
      source: "Mar 2026 SITREP",
    },
    {
      name: "Orpheum Slope Paving",
      status: "Awarded",
      description: "Awarded during February Board Meeting; contract execution ongoing",
      source: "Mar 2026 SITREP",
    },
    {
      name: "Franklin Vault 4 Generator",
      status: "Design Complete",
      description: "Design complete, FY26 schedule",
      source: "Jan 2026 SITREP",
    },
  ],
};

// ============================================================================
// OPERATIONS & MAINTENANCE DATA
// ============================================================================

export const operationsData = {
  // Source: SITREPs (Jan-Mar 2026)
  permitsIssued: [
    { month: "September 2025", count: 25, source: "Oct 2025 SITREP" },
    { month: "October 2025", count: 50, source: "Nov 2025 SITREP" },
    { month: "November 2025", count: 46, source: "Dec 2025 SITREP" },
    { month: "December 2025", count: 10, source: "Jan 2026 SITREP" },
    { month: "January 2026", count: 42, source: "Feb 2026 SITREP" },
    { month: "February 2026", count: 25, source: "Mar 2026 SITREP" },
  ],

  floodgateInspections: {
    hurricaneGates: { percentComplete: 45, status: "Annual inspections and exercises underway" },
    valveExercises: { percentComplete: 92, status: "Quarterly valve exercises ongoing" },
    usaceInspections: "All LPV levee and floodwall USACE inspections complete; PCCP/Complex inspections scheduled April 2026",
    source: "Mar 2026 SITREP",
  },

  // Source: Mar 2026 SITREP
  pccpRepairStatus: {
    overallStatus: "Substantial completion expected early 2026; most items near completion pending final acceptance",
    managedBy: "JV/USACE",
    source: "Mar 2026 SITREP",
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

  // Source: Mar 2026 SITREP
  maintenanceActivities: [
    "USACE annual inspections completed with no issues identified",
    "17 structural repairs completed across Lakefront Seawall and HSDRRS system",
    "Second levee access gate installed at Violet Canal; fabrication underway for Deslonde Street gate",
    "Quarterly valve exercises 92% complete",
  ],
  maintenanceSource: "Mar 2026 SITREP",
};

// ============================================================================
// SAFETY DATA
// ============================================================================

export const safetyData = {
  // Source: Mar 2026 SITREP (KPI metadata only; detailed event data in public/data/safety-events.json)
  fy26Goal: "≤6 reportable accidents and maintain zero lost-time, fatal, or catastrophic events",
  ytdAccidents: 5,
  goalMax: 6,
  source: "Mar 2026 SITREP",
};

// ============================================================================
// STAFFING DATA
// ============================================================================

export const staffingData = {
  // Source: Mar 2026 SITREP
  asOfDate: "March 1, 2026",
  source: "Mar 2026 SITREP",

  headcount: {
    total: 267,
    classified: 255,
    unclassified: 12,
    vacancies: 45,
  },

  departmentStatus: [
    {
      name: "OLD Levee Maintenance",
      status: "Fully Staffed",
      source: "Dec 2025 SITREP",
    },
    {
      name: "OLD Mechanic Shop",
      status: "Fully Staffed",
      source: "Dec 2025 SITREP",
    },
    {
      name: "EJ Mechanic Shop",
      status: "Fully Staffed",
      source: "Dec 2025 SITREP",
    },
  ],

  recentHires: [
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
    { name: "Darren Austin", title: "Director of Operations" },
    { name: "Ryan Foster", title: "Director of Engineering" },
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
