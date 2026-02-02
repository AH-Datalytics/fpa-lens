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
  name: "The FPA Lens",
  tagline: "Your Flood Defense System",
  organization: "Southeast Louisiana Flood Protection Authority - East",
  organizationShort: "SLFPA-E",
  lastUpdated: "December 2025", // Source: Dec 2025 SITREP
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
    email: "JWilliams@floodauthority.org",
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
  // Source: Dec 2025 SITREP
  lastUpdated: "December 2025",
  overallStatus: "GREEN" as StatusLevel,
  categories: [
    {
      name: "Infrastructure Readiness",
      status: "GREEN" as StatusLevel,
      description: "4th Quarter Field Inspections completed; all 17 PCCP pumps available; no threats to system integrity",
      source: "Dec 2025 SITREP",
    },
    {
      name: "Staffing Readiness",
      status: "GREEN" as StatusLevel,
      description: "Nothing significant to report",
      source: "Dec 2025 SITREP",
    },
    {
      name: "Financial Readiness",
      status: "GREEN" as StatusLevel,
      description: "Nothing significant to report",
      source: "Dec 2025 SITREP",
    },
    {
      name: "Media Coverage",
      status: "GREEN" as StatusLevel,
      description: "Nothing significant to report",
      source: "Dec 2025 SITREP",
    },
  ],
  alerts: [
    {
      // Source: Dec 2025 SITREP
      title: "GIWW Sector Gate",
      description: "Experiencing control issues, contractor engaged, remedy being fast-tracked",
      severity: "notice" as const,
      source: "Dec 2025 SITREP",
    },
  ],
  // PLACEHOLDER - awaiting stakeholder input
  statusDefinitions: {
    GREEN: "[PLACEHOLDER - definition of GREEN status awaiting stakeholder input]",
    AMBER: "[PLACEHOLDER - definition of AMBER status awaiting stakeholder input]",
    RED: "[PLACEHOLDER - definition of RED status awaiting stakeholder input]",
    isPlaceholder: true,
  },
};

// ============================================================================
// KEY PERFORMANCE INDICATORS (HOMEPAGE)
// ============================================================================

export const kpiMetrics = {
  // All from Dec 2025 SITREP unless noted
  systemReadiness: {
    label: "System Readiness",
    value: "GREEN",
    type: "status" as const,
    source: "Dec 2025 SITREP",
  },
  pccpPumps: {
    label: "PCCP Pumps Available",
    value: 17,
    total: 17,
    unit: "pumps",
    source: "Dec 2025 SITREP",
  },
  ytdAccidents: {
    label: "YTD Accidents",
    value: 5,
    goal: 6,
    goalLabel: "FY26 Goal: ≤6",
    source: "Dec 2025 SITREP",
  },
  floodgateInspections: {
    label: "River Floodgate Inspections",
    value: 85,
    total: 88,
    unit: "completed",
    source: "Dec 2025 SITREP",
  },
  staffCount: {
    label: "Total Staff",
    value: 263,
    breakdown: "251 classified, 12 unclassified",
    asOf: "Dec 1, 2025",
    source: "Dec 2025 SITREP",
  },
  permitsIssued: {
    label: "Permits Issued (Dec)",
    value: 46,
    source: "Dec 2025 SITREP",
    // Note: Oct=50, Nov=46, Dec=46 per SITREPs
  },
};

// ============================================================================
// INFRASTRUCTURE ASSETS
// ============================================================================

export const infrastructureAssets = {
  // CONFIRMED DATA
  confirmed: {
    pccpStations: {
      count: 3,
      totalPumps: 17,
      stations: [
        { name: "17th Street", pumps: "[PLACEHOLDER - pump count]" },
        { name: "Orleans Avenue", pumps: "[PLACEHOLDER - pump count]" },
        { name: "London Avenue", pumps: "[PLACEHOLDER - pump count]" },
      ],
      source: "Dec 2025 SITREP",
    },
    riverFloodgates: {
      count: 88,
      source: "Inspection records",
    },
    complexStructures: [
      "IHNC Surge Barrier (North & South)",
      "Seabrook",
      "Bayou St. John Sector Gate",
      "Dupre",
      "Caernarvon",
      "GIWW Sector Gate",
    ],
    source: "Project context",
  },
  // PLACEHOLDER DATA - awaiting confirmation
  placeholders: {
    totalLeveeMiles: {
      value: "[PLACEHOLDER - total levee miles]",
      systems: ["HSDRRS", "MRL", "NFL"],
      isPlaceholder: true,
      stakeholderNeeded: "Engineering/GIS",
    },
    totalFloodgates: {
      value: "[PLACEHOLDER - ~240 mentioned but needs confirmation]",
      isPlaceholder: true,
      stakeholderNeeded: "Engineering",
    },
    floodwalls: {
      value: "[PLACEHOLDER - lakefront and outfall canal floodwall details]",
      isPlaceholder: true,
      stakeholderNeeded: "Engineering",
    },
  },
};

// ============================================================================
// FINANCIAL DATA
// ============================================================================

export const financialData = {
  // Source: Millage Roll Forward Analysis (Year 1 = 2026 projections)
  // NOTE: Per Jeff Williams email - "These files include rough, high-level estimates
  // for demonstration only; figures will need refinement."
  disclaimer: "These figures are rough, high-level estimates for demonstration only; figures will need refinement.",
  disclaimerSource: "Jeff Williams email",

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
      timeframe: "[PLACEHOLDER - timeframe not specified]",
      source: "Oct 2025 SITREP",
    },
    {
      name: "OPEB Liability",
      amount: 15000000,
      timeframe: "[PLACEHOLDER - timeframe not specified]",
      source: "Oct 2025 SITREP",
    },
  ],

  // Source: SITREPs (various months)
  capitalProjects: [
    {
      name: "Foreshore Erosion Repair",
      status: "In Progress",
      description: "Technical reviews complete, USACE funding secured, easement negotiations ongoing",
      source: "Dec 2025 SITREP",
    },
    {
      name: "Lakeshore/Franklin Safety Project",
      status: "In Progress",
      description: "Contract execution underway",
      source: "Dec 2025 SITREP",
    },
    {
      name: "West Return Wall Splash Pad",
      status: "Awarded",
      description: "Awarded 10/16/25, contract execution in progress",
      source: "Dec 2025 SITREP",
    },
    {
      name: "LPV Access Bridge",
      status: "Design Complete",
      description: "Design complete, advertisement after New Year",
      source: "Dec 2025 SITREP",
    },
    {
      name: "Franklin Vault 4 Generator",
      status: "Design Complete",
      description: "Design complete, FY26 schedule",
      source: "Dec 2025 SITREP",
    },
    {
      name: "Orpheum Slope Paving",
      status: "Under Review",
      description: "Awarded 10/16/25, bid protest under AG review, Jefferson Parish co-funding",
      source: "Dec 2025 SITREP",
    },
  ],
};

// ============================================================================
// OPERATIONS & MAINTENANCE DATA
// ============================================================================

export const operationsData = {
  // Source: SITREPs (various months)
  permitsIssued: [
    { month: "September 2025", count: 25, source: "Sep 2025 SITREP" },
    { month: "October 2025", count: 50, source: "Oct 2025 SITREP" },
    { month: "November 2025", count: 46, source: "Nov 2025 SITREP" },
    { month: "December 2025", count: 46, source: "Dec 2025 SITREP" },
  ],

  floodgateInspections: {
    completed: 85,
    total: 88,
    status: "Annual inspections in progress",
    source: "Dec 2025 SITREP",
  },

  // Source: Dec 2025 SITREP
  pccpRepairStatus: {
    overallStatus: "On schedule, substantial completion expected early 2026",
    managedBy: "JV/USACE",
    source: "Dec 2025 SITREP",
    repairs: [
      {
        issue: "Climber Screen Gearbox",
        london: { percent: 80, estimated: "Jan-26" },
        orleans: { percent: 0, estimated: "Jan-25" },
        seventeenthSt: { percent: 0, estimated: "Jan-26" },
      },
      {
        issue: "CP System",
        london: { percent: 99, estimated: "Dec-25" },
        orleans: { percent: 99, estimated: "Dec-25" },
        seventeenthSt: { percent: 99, estimated: "Dec-25" },
      },
      {
        issue: "Pump Leaks",
        london: { percent: 90, estimated: "Nov-25" },
        orleans: { percent: null, estimated: "Not Issue" },
        seventeenthSt: { percent: 90, estimated: "Nov-25" },
      },
      {
        issue: "Basement Cracks",
        london: { percent: 95, estimated: "Dec-25" },
        orleans: { percent: 95, estimated: "Dec-25" },
        seventeenthSt: { percent: 95, estimated: "Dec-25" },
      },
    ],
  },

  // Source: SITREPs (qualitative)
  maintenanceActivities: [
    "Routine mowing, trimming, debris removal, herbicide application across HSDRRS, MRL, and NFL",
    "Graffiti abatement ongoing",
    "New levee access gates installed at LPV 11",
  ],
  maintenanceSource: "Dec 2025 SITREP",
};

// ============================================================================
// SAFETY DATA
// ============================================================================

export const safetyData = {
  // Source: Dec 2025 SITREP
  fy26Goal: "≤6 reportable accidents and maintain zero lost-time, fatal, or catastrophic events",
  ytdAccidents: 5,
  goalMax: 6,
  source: "Dec 2025 SITREP",

  monthlyData: [
    {
      month: "September 2025",
      accidents: 0,
      incidents: 7,
      source: "Sep 2025 SITREP",
    },
    {
      month: "October 2025",
      accidents: 2,
      incidents: 9,
      source: "Oct 2025 SITREP",
    },
    {
      month: "November 2025",
      accidents: 0,
      incidents: 4,
      source: "Nov 2025 SITREP",
    },
    {
      month: "December 2025",
      accidents: 0,
      incidents: 4,
      note: "One incident on 12/1",
      source: "Dec 2025 SITREP",
    },
  ],

  safetyMessage: "Leadership is encouraging employees to report all hazards and near-misses so we can identify risks early and prevent future harm.",

  // PLACEHOLDER - awaiting stakeholder input
  historicalTrend: {
    data: "[PLACEHOLDER - historical multi-year trend data not provided]",
    isPlaceholder: true,
    stakeholderNeeded: "Safety/HR",
  },
};

// ============================================================================
// STAFFING DATA
// ============================================================================

export const staffingData = {
  // Source: Dec 2025 SITREP
  asOfDate: "December 1, 2025",
  source: "Dec 2025 SITREP",

  headcount: {
    total: 263,
    classified: 251,
    unclassified: 12,
    changeFromLastMonth: 10, // Increased by 10 from November
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
      position: "Mechanic III",
      location: "East Jefferson",
      source: "Dec 2025 SITREP",
    },
  ],

  // PLACEHOLDER - awaiting stakeholder input
  departmentBreakdown: {
    data: "[PLACEHOLDER - breakdown by department/function not provided]",
    isPlaceholder: true,
    stakeholderNeeded: "HR",
  },
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
  systemMap: {
    content: "[PLACEHOLDER FOR SYSTEM MAP - awaiting GIS/Engineering input]",
    isPlaceholder: true,
    stakeholderNeeded: "GIS/Engineering",
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
