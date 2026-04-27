/**
 * Infrastructure Protection Operations data.
 *
 * Source: "Legislative Brief on Levee PD Mission incl. Staffing"
 * (legislative briefing on FPA Police's role in flood-asset security).
 *
 * Framing: this is NOT a traditional policing page. It shows how the FPA
 * Police Departments (OLDPD and EJLDPD) function as a 24/7 field extension
 * of Engineering & Maintenance, protecting the regional flood-defense
 * system. Crime data is intentionally not the focus.
 */

export interface ActivityItem {
  label: string;
  count: number;
}

export interface ActivityCategory {
  key: string;
  name: string;
  description: string;
  total: number;
  items: ActivityItem[];
}

export interface StaffingSnapshot {
  period: string;
  total: number;
  breakdown: string;
}

export interface DistrictStaffing {
  name: string;
  abbreviation: string;
  snapshots: StaffingSnapshot[];
}

export const protectionData = {
  asOfYear: 2025,
  source: "Legislative Brief on Levee PD Mission (OLDPD & EJLDPD)",
  infrastructureValue: 7_000_000_000, // $7B in flood-protection infrastructure

  mission:
    "Police operations are an integrated component of flood protection, providing continuous 24/7 monitoring, real-time deficiency reporting, and field support that preserves the operability of the regional flood-defense system. Every commissioned officer is a CPRA Certified Levee Inspector, making the police districts the only division within the agency conducting proactive levee inspections around the clock.",

  // Headline metrics
  totalActivities: 91577,
  daysInYear: 365,
  certifiedLeveeInspectorsPercent: 100,
  atFaultIncidentReductionPercent: 100,
  districtsCovered: 2,

  // 13 raw activity items grouped into 5 categories that reflect how the
  // work actually maps onto the flood-protection system.
  activityCategories: [
    {
      key: "FLOOD_STRUCTURES",
      name: "Flood Structures",
      description:
        "Routine inspection and access control at flood gates, pump stations, and surge-related river infrastructure.",
      total: 47414,
      items: [
        { label: "Flood gate checks", count: 31548 },
        { label: "Pump station / reach checks", count: 13121 },
        { label: "River batcher checks", count: 2745 },
      ],
    },
    {
      key: "LEVEE_SYSTEM",
      name: "Levee System",
      description:
        "Direct levee surveillance: polders, formal inspections, gauge readings, and remote-area checks.",
      total: 15917,
      items: [
        { label: "Polder checks", count: 10688 },
        { label: "Gauge readings", count: 2523 },
        { label: "Bayou Bienvenue checks", count: 2333 },
        { label: "Levee inspections / condition checks", count: 373 },
      ],
    },
    {
      key: "FPA_FACILITIES",
      name: "FPA Facilities",
      description:
        "Security checks at Authority facilities, shelters, and waterfront properties.",
      total: 19876,
      items: [
        { label: "Shelter checks", count: 8949 },
        { label: "Marina checks", count: 6896 },
        { label: "Franklin Ave / East Jefferson facility checks", count: 4031 },
      ],
    },
    {
      key: "PATROL_COVERAGE",
      name: "Surrounding Patrol Coverage",
      description:
        "Patrol presence in adjacent neighborhoods and public access areas within district jurisdiction.",
      total: 7784,
      items: [{ label: "Neighborhood patrol / checks", count: 7784 }],
    },
    {
      key: "ENG_MAINT_SUPPORT",
      name: "Engineering & Maintenance Support",
      description:
        "Direct field support for operations and maintenance teams: traffic control during gate exercises and inspections, and maintenance escorts.",
      total: 586,
      items: [
        { label: "Traffic control during maintenance / gate exercises", count: 531 },
        { label: "FPA maintenance escorts", count: 55 },
      ],
    },
  ] as ActivityCategory[],

  // Levee awareness — the unique 24/7 proactive inspection program
  leveeAwareness: {
    formalInspectionsPerYear: 373,
    headline: "Only division running proactive 24/7 levee inspections",
    points: [
      "Every commissioned officer is a CPRA Certified Levee Inspector.",
      "Proactive levee inspections run around the clock, every day of the year.",
      "Deficiencies and irregularities are reported to Maintenance and Engineering in real time.",
      "Police are an immediate set of trained eyes on the flood-protection system.",
    ],
  },

  // Outcomes (intentionally infrastructure-focused, not crime data)
  outcomes: [
    {
      key: "AT_FAULT",
      headline: "100%",
      label: "Reduction in at-fault incidents",
      detail:
        "Investment in officer professionalization (training, supervision, equipment, accountability) has eliminated at-fault incidents creating financial risk and litigation exposure.",
    },
    {
      key: "INTEROP",
      headline: "Cross-trained",
      label: "Regional interoperability",
      detail:
        "Cross-training with local, state, and federal partners unifies response methodology, supports neighboring municipalities when called, and strengthens first-on-scene effectiveness.",
    },
    {
      key: "CONTINUITY",
      headline: "Continuous",
      label: "System integrity preserved",
      detail:
        "Visible patrol presence, repeated infrastructure checks, and 24/7 monitoring deter theft, sabotage, and tampering, protecting the operability of the flood-defense system.",
    },
  ],

  // Why it matters: real-world cautionary example, not crime data
  whyItMatters: {
    headline: "What proactive patrols help prevent",
    body: "In a recent neighboring-agency incident in Jefferson Parish, multiple suspects stole diesel fuel and copper wiring from West Bank drainage pump stations. The thefts disabled four pumps for at least a week and resulted in the loss of 6,400 gallons of diesel fuel and roughly $60,000 in wiring and conduit. A similar incident at one of the Authority's PCCP or Complex Structures could impair flood-response readiness, delay emergency capability, and strain Maintenance and Engineering resources well beyond the cost of the stolen materials.",
  },

  // Workforce context — story of post-Katrina contraction and rebuild
  workforce: [
    {
      name: "Orleans Levee District Police Department",
      abbreviation: "OLDPD",
      snapshots: [
        {
          period: "Pre-Katrina",
          total: 85,
          breakdown: "55 officers · 4 dispatchers · 2 admin · 24 reserves",
        },
        {
          period: "July 2024",
          total: 26,
          breakdown: "19 officers · 4 dispatchers · 3 reserves",
        },
        {
          period: "Current",
          total: 35,
          breakdown: "27 officers · 4 dispatchers · 4 reserves",
        },
      ],
    },
    {
      name: "East Jefferson Levee District Police Department",
      abbreviation: "EJLDPD",
      snapshots: [
        {
          period: "Pre-Katrina",
          total: 27,
          breakdown: "1 Chief · 2 Captains · 24 platoon officers",
        },
        {
          period: "2024",
          total: 19,
          breakdown: "1 Captain · 2 admin · 16 platoon officers",
        },
        {
          period: "Current",
          total: 21,
          breakdown: "1 Captain · 1 admin · 19 platoon officers",
        },
      ],
    },
  ] as DistrictStaffing[],
};
