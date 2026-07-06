import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable copy for the About page (`/about`). Only substantive editorial prose
 * lives here — page intro, section headings, card copy, bullet points, and the
 * explainer callouts a comms person would reword. Numbers/data, the leadership
 * roster (staff are their own CMS collection), nav/link labels, and any line
 * carrying a dynamic value (e.g. the HSDRRS dollar figure, the "Reporting an
 * issue?" phone/link block) are intentionally NOT here — they stay in code.
 *
 * Each field's `defaultValue` is the current on-page wording verbatim, so the
 * form pre-fills and the page renders identically even before this global is
 * saved. The page imports ABOUT_DEFAULTS for a resilient fallback.
 */
export const ABOUT_DEFAULTS = {
  // --- Page header ---
  pageTitle: "About Us",
  pageSubtitle:
    "Protecting Greater New Orleans from hurricane surge and Mississippi River flooding",

  // --- Mission + governance overview (intro prose block) ---
  missionOverview:
    "The Southeast Louisiana Flood Protection Authority - East (SLFPA-E) was established after Hurricane Katrina as the regional governmental body responsible for a restored, strengthened, and enhanced multi-parish integrated hurricane and flood protection system. Governed by a board of commissioners appointed by the Governor and confirmed by the Louisiana Senate, the Authority oversees the Orleans Levee District (OLD) and East Jefferson Levee District (EJLD), together protecting more than one million residents across Orleans, Jefferson, and St. Bernard Parishes.",

  // --- HSDRRS panel (left) ---
  hsdrrsHeading: "The Hurricane & Storm Damage Risk Reduction System",
  hsdrrsIntro:
    "More than a million neighbors in New Orleans and its surrounding areas are better protected from hurricane-driven flooding today than ever before.",

  // --- MR&T panel (right) ---
  mrtHeading: "The Mississippi River & Tributaries Project",
  mrtIntro:
    "Authorized by the Flood Control Act of 1928 after the Great Flood of 1927, MR&T is one of the largest civil works projects in U.S. history.",
  mrtBody:
    "The east-bank river levees and floodwalls in Orleans and Jefferson Parishes are part of this national system.",
  mrtBodyEmphasis: "SLFPA-E operates and maintains it locally",

  // --- "Our Responsibilities" section ---
  responsibilitiesHeading: "Our Responsibilities",

  // Card 1: Operate & Maintain
  operateMaintainTitle: "Operate & Maintain",
  operateMaintainBody:
    "We operate and maintain the HSDRRS infrastructure 24/7, ensuring all systems are ready to protect our community at a moment's notice.",
  operateMaintainItem1: "Regular inspections of levees, floodwalls, and gates",
  operateMaintainItem2: "Vegetation management and erosion control",
  operateMaintainItem3: "Equipment maintenance and testing",

  // Card 2: Storm Response
  stormResponseTitle: "Storm Response",
  stormResponseBody:
    "When storms threaten, we activate our emergency protocols to close floodgates, monitor water levels, and coordinate with emergency management agencies.",
  stormResponseItem1: "Close sector gates and floodgates before storm arrival",
  stormResponseItem2: "Monitor surge levels throughout the system",
  stormResponseItem3: "Coordinate with local, state, and federal agencies",

  // Card 3: Permitting & Compliance
  permittingTitle: "Permitting & Compliance",
  permittingBody:
    "We review and issue permits for any work on or near flood protection infrastructure to ensure system integrity is maintained.",
  permittingItem1: "Construction permits near levees",
  permittingItem2: "Utility crossing permits",
  permittingItem3: "Encroachment reviews",

  // --- "Surge Protection vs. Drainage" section ---
  surgeDrainageHeading: "Surge Protection vs. Drainage",
  // Intro paragraph is split around an inline bold phrase ("outer perimeter").
  surgeDrainageIntro:
    "Greater New Orleans has two separate flood protection systems run by two separate agencies. SLFPA-E is the",
  surgeDrainageIntroEmphasis: "outer perimeter",
  surgeDrainageIntroRest:
    ": we keep hurricane surge and lake water out. The Sewerage & Water Board of New Orleans (SWBNO) handles everything inside that perimeter: drainage pumps, storm drains, drinking water, and sewage. We do not operate drainage pump stations, and SWBNO does not operate levees or floodgates. The two systems are complementary but independent.",

  // Comparison card: SLFPA-E (Us)
  slfpaCardTitle: "SLFPA-E (Us)",
  // Lead sentence split around an inline highlighted phrase ("storm surge").
  slfpaCardLead: "We protect against",
  slfpaCardLeadEmphasis: "storm surge",
  slfpaCardLeadRest: "from hurricanes, tropical storms, and high tides.",
  slfpaItem1: "Levees, floodwalls, and surge barriers",
  slfpaItem2: "Floodgates that close during storms",
  slfpaItem3: "Permanent Canal Closure Pump Stations (PCCP)",
  slfpaItem4: "Lake Borgne Surge Barrier",
  slfpaItem5: "Protection from Lake Pontchartrain & Gulf of Mexico",

  // Comparison card: SWBNO
  swbnoCardTitle: "SWBNO (Sewerage & Water Board)",
  // Lead sentence split around an inline highlighted phrase ("rainwater drainage").
  swbnoCardLead: "They manage",
  swbnoCardLeadEmphasis: "rainwater drainage",
  swbnoCardLeadRest: ", drinking water, and sewage services.",
  swbnoItem1: "Drainage pump stations that remove rainwater",
  swbnoItem2: "Storm drains and underground canals",
  swbnoItem3: "Drinking water treatment and distribution",
  swbnoItem4: "Sewage collection and treatment",
  swbnoItem5: "Street flooding from heavy rain",

  // "Where the Systems Connect" callout
  systemsConnectHeading: "Where the Systems Connect",
  systemsConnectBody:
    "During a storm, SLFPA-E closes the floodgates at the outfall canals to block surge from entering the city. While those gates are closed, SWBNO's drainage pumps push rainwater into those same canals. Our Permanent Canal Closure Pump Stations (PCCPs) at 17th Street, Orleans Avenue, and London Avenue then pump that water over the gates and out to Lake Pontchartrain. That handoff is the one point where the two systems meet.",
};

export const AboutPage: GlobalConfig = {
  slug: "about-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the About page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    // --- Page header ---
    {
      name: "pageTitle",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.pageTitle,
      admin: { description: "Large page heading at the top of the About page." },
    },
    {
      name: "pageSubtitle",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.pageSubtitle,
      admin: { description: "Tagline shown directly beneath the page heading." },
    },

    // --- Mission overview ---
    {
      name: "missionOverview",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.missionOverview,
      admin: {
        description:
          "Opening overview paragraph (blue left-bordered block) describing SLFPA-E's origin, governance, and coverage.",
      },
    },

    // --- HSDRRS panel ---
    {
      name: "hsdrrsHeading",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.hsdrrsHeading,
      admin: { description: "Heading of the dark-blue HSDRRS panel (left)." },
    },
    {
      name: "hsdrrsIntro",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.hsdrrsIntro,
      admin: {
        description:
          "First paragraph inside the HSDRRS panel. (The second paragraph with the dollar figure is generated automatically and is not editable here.)",
      },
    },

    // --- MR&T panel ---
    {
      name: "mrtHeading",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.mrtHeading,
      admin: { description: "Heading of the teal MR&T panel (right)." },
    },
    {
      name: "mrtIntro",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.mrtIntro,
      admin: { description: "First paragraph inside the MR&T panel." },
    },
    {
      name: "mrtBody",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.mrtBody,
      admin: {
        description:
          "Second paragraph inside the MR&T panel (the lead-in before the bold closing phrase).",
      },
    },
    {
      name: "mrtBodyEmphasis",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.mrtBodyEmphasis,
      admin: {
        description:
          "Bold closing phrase of the MR&T panel's second paragraph.",
      },
    },

    // --- "Our Responsibilities" section ---
    {
      name: "responsibilitiesHeading",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.responsibilitiesHeading,
      admin: { description: "Section heading above the three responsibility cards." },
    },

    // Card 1: Operate & Maintain
    {
      name: "operateMaintainTitle",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.operateMaintainTitle,
      admin: { description: "Title of the first responsibility card." },
    },
    {
      name: "operateMaintainBody",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.operateMaintainBody,
      admin: { description: "Intro paragraph of the 'Operate & Maintain' card." },
    },
    {
      name: "operateMaintainItem1",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.operateMaintainItem1,
      admin: { description: "'Operate & Maintain' card — first bullet point." },
    },
    {
      name: "operateMaintainItem2",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.operateMaintainItem2,
      admin: { description: "'Operate & Maintain' card — second bullet point." },
    },
    {
      name: "operateMaintainItem3",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.operateMaintainItem3,
      admin: { description: "'Operate & Maintain' card — third bullet point." },
    },

    // Card 2: Storm Response
    {
      name: "stormResponseTitle",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.stormResponseTitle,
      admin: { description: "Title of the second responsibility card." },
    },
    {
      name: "stormResponseBody",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.stormResponseBody,
      admin: { description: "Intro paragraph of the 'Storm Response' card." },
    },
    {
      name: "stormResponseItem1",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.stormResponseItem1,
      admin: { description: "'Storm Response' card — first bullet point." },
    },
    {
      name: "stormResponseItem2",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.stormResponseItem2,
      admin: { description: "'Storm Response' card — second bullet point." },
    },
    {
      name: "stormResponseItem3",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.stormResponseItem3,
      admin: { description: "'Storm Response' card — third bullet point." },
    },

    // Card 3: Permitting & Compliance
    {
      name: "permittingTitle",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.permittingTitle,
      admin: { description: "Title of the third responsibility card." },
    },
    {
      name: "permittingBody",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.permittingBody,
      admin: { description: "Intro paragraph of the 'Permitting & Compliance' card." },
    },
    {
      name: "permittingItem1",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.permittingItem1,
      admin: { description: "'Permitting & Compliance' card — first bullet point." },
    },
    {
      name: "permittingItem2",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.permittingItem2,
      admin: { description: "'Permitting & Compliance' card — second bullet point." },
    },
    {
      name: "permittingItem3",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.permittingItem3,
      admin: { description: "'Permitting & Compliance' card — third bullet point." },
    },

    // --- "Surge Protection vs. Drainage" section ---
    {
      name: "surgeDrainageHeading",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.surgeDrainageHeading,
      admin: { description: "Section heading for the surge-vs-drainage explainer." },
    },
    {
      name: "surgeDrainageIntro",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.surgeDrainageIntro,
      admin: {
        description:
          "Surge-vs-drainage intro paragraph, first part (the text before the bold phrase 'outer perimeter').",
      },
    },
    {
      name: "surgeDrainageIntroEmphasis",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.surgeDrainageIntroEmphasis,
      admin: {
        description:
          "Bold phrase within the surge-vs-drainage intro paragraph (default: 'outer perimeter').",
      },
    },
    {
      name: "surgeDrainageIntroRest",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.surgeDrainageIntroRest,
      admin: {
        description:
          "Surge-vs-drainage intro paragraph, remainder (the text after the bold phrase).",
      },
    },

    // Comparison card: SLFPA-E (Us)
    {
      name: "slfpaCardTitle",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.slfpaCardTitle,
      admin: { description: "Title of the left comparison card (SLFPA-E)." },
    },
    {
      name: "slfpaCardLead",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.slfpaCardLead,
      admin: {
        description:
          "SLFPA-E comparison card lead sentence, first part (before the highlighted phrase 'storm surge').",
      },
    },
    {
      name: "slfpaCardLeadEmphasis",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.slfpaCardLeadEmphasis,
      admin: {
        description:
          "Highlighted phrase in the SLFPA-E comparison card lead sentence (default: 'storm surge').",
      },
    },
    {
      name: "slfpaCardLeadRest",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.slfpaCardLeadRest,
      admin: {
        description:
          "SLFPA-E comparison card lead sentence, remainder (after the highlighted phrase).",
      },
    },
    {
      name: "slfpaItem1",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.slfpaItem1,
      admin: { description: "SLFPA-E comparison card — first checklist item." },
    },
    {
      name: "slfpaItem2",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.slfpaItem2,
      admin: { description: "SLFPA-E comparison card — second checklist item." },
    },
    {
      name: "slfpaItem3",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.slfpaItem3,
      admin: { description: "SLFPA-E comparison card — third checklist item." },
    },
    {
      name: "slfpaItem4",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.slfpaItem4,
      admin: { description: "SLFPA-E comparison card — fourth checklist item." },
    },
    {
      name: "slfpaItem5",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.slfpaItem5,
      admin: { description: "SLFPA-E comparison card — fifth checklist item." },
    },

    // Comparison card: SWBNO
    {
      name: "swbnoCardTitle",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.swbnoCardTitle,
      admin: { description: "Title of the right comparison card (SWBNO)." },
    },
    {
      name: "swbnoCardLead",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.swbnoCardLead,
      admin: {
        description:
          "SWBNO comparison card lead sentence, first part (before the highlighted phrase 'rainwater drainage').",
      },
    },
    {
      name: "swbnoCardLeadEmphasis",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.swbnoCardLeadEmphasis,
      admin: {
        description:
          "Highlighted phrase in the SWBNO comparison card lead sentence (default: 'rainwater drainage').",
      },
    },
    {
      name: "swbnoCardLeadRest",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.swbnoCardLeadRest,
      admin: {
        description:
          "SWBNO comparison card lead sentence, remainder (after the highlighted phrase).",
      },
    },
    {
      name: "swbnoItem1",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.swbnoItem1,
      admin: { description: "SWBNO comparison card — first list item." },
    },
    {
      name: "swbnoItem2",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.swbnoItem2,
      admin: { description: "SWBNO comparison card — second list item." },
    },
    {
      name: "swbnoItem3",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.swbnoItem3,
      admin: { description: "SWBNO comparison card — third list item." },
    },
    {
      name: "swbnoItem4",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.swbnoItem4,
      admin: { description: "SWBNO comparison card — fourth list item." },
    },
    {
      name: "swbnoItem5",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.swbnoItem5,
      admin: { description: "SWBNO comparison card — fifth list item." },
    },

    // "Where the Systems Connect" callout
    {
      name: "systemsConnectHeading",
      type: "text",
      defaultValue: ABOUT_DEFAULTS.systemsConnectHeading,
      admin: { description: "Heading of the blue 'Where the Systems Connect' callout." },
    },
    {
      name: "systemsConnectBody",
      type: "textarea",
      defaultValue: ABOUT_DEFAULTS.systemsConnectBody,
      admin: {
        description:
          "Body paragraph of the 'Where the Systems Connect' callout describing the SLFPA-E / SWBNO handoff.",
      },
    },
  ],
};
