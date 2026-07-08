import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";
import { rt } from "@/lib/richText";

/**
 * Editable copy for the About page (`/about`). Substantive editorial prose only:
 * page intro, section headings, card titles/paragraphs, bullet lists, and the
 * explainer callouts. Numbers/data, the leadership roster (its own CMS
 * collection), nav/link labels, and any line carrying a dynamic value (the
 * HSDRRS dollar figure, the "Reporting an issue?" phone/link block) stay in code.
 *
 * Field types:
 *  - `text`     — short single-line headings/titles.
 *  - `richText` — prose paragraphs, edited with the WYSIWYG toolbar (bold /
 *                 italic / underline). Defaults are authored as markdown via
 *                 `rt()`; `**bold**` marks the phrases that were highlighted.
 *  - `textarea` — bullet lists, one item per line (the page splits on newlines).
 *
 * Each default is the current on-page wording, so the form pre-fills and the
 * page renders identically before this global is saved.
 */
export const ABOUT_DEFAULTS = {
  // --- Page header ---
  pageTitle: "About Us",
  pageSubtitle:
    "Protecting Greater New Orleans from hurricane surge and Mississippi River flooding",

  // --- Mission + governance overview (intro prose block) ---
  missionOverview: rt(
    "The Southeast Louisiana Flood Protection Authority - East (SLFPA-E) was established after Hurricane Katrina as the regional governmental body responsible for a restored, strengthened, and enhanced multi-parish integrated hurricane and flood protection system. Governed by a board of commissioners appointed by the Governor and confirmed by the Louisiana Senate, the Authority oversees the Orleans Levee District (OLD) and East Jefferson Levee District (EJLD), together protecting more than one million residents across Orleans, Jefferson, and St. Bernard Parishes.",
  ),

  // --- HSDRRS panel (left) ---
  hsdrrsHeading: "The Hurricane & Storm Damage Risk Reduction System",
  hsdrrsIntro: rt(
    "More than a million neighbors in New Orleans and its surrounding areas are better protected from hurricane-driven flooding today than ever before.",
  ),

  // --- MR&T panel (right) ---
  mrtHeading: "The Mississippi River & Tributaries Project",
  mrtIntro: rt(
    "Authorized by the Flood Control Act of 1928 after the Great Flood of 1927, MR&T is one of the largest civil works projects in U.S. history.",
  ),
  mrtBody: rt(
    "The east-bank river levees and floodwalls in Orleans and Jefferson Parishes are part of this national system. **SLFPA-E operates and maintains it locally.**",
  ),

  // --- "Our Responsibilities" section ---
  responsibilitiesHeading: "Our Responsibilities",

  // Card 1: Operate & Maintain
  operateMaintainTitle: "Operate & Maintain",
  operateMaintainBody: rt(
    "We operate and maintain the HSDRRS infrastructure 24/7, ensuring all systems are ready to protect our community at a moment's notice.",
  ),
  operateMaintainItems:
    "Regular inspections of levees, floodwalls, and gates\nVegetation management and erosion control\nEquipment maintenance and testing",

  // Card 2: Storm Response
  stormResponseTitle: "Storm Response",
  stormResponseBody: rt(
    "When storms threaten, we activate our emergency protocols to close floodgates, monitor water levels, and coordinate with emergency management agencies.",
  ),
  stormResponseItems:
    "Close sector gates and floodgates before storm arrival\nMonitor surge levels throughout the system\nCoordinate with local, state, and federal agencies",

  // Card 3: Permitting & Compliance
  permittingTitle: "Permitting & Compliance",
  permittingBody: rt(
    "We review and issue permits for any work on or near flood protection infrastructure to ensure system integrity is maintained.",
  ),
  permittingItems:
    "Construction permits near levees\nUtility crossing permits\nEncroachment reviews",

  // --- "Surge Protection vs. Drainage" section ---
  surgeDrainageHeading: "Surge Protection vs. Drainage",
  surgeDrainageIntro: rt(
    "Greater New Orleans has two separate flood protection systems run by two separate agencies. SLFPA-E is the **outer perimeter**: we keep hurricane surge and lake water out. The Sewerage & Water Board of New Orleans (SWBNO) handles everything inside that perimeter: drainage pumps, storm drains, drinking water, and sewage. We do not operate drainage pump stations, and SWBNO does not operate levees or floodgates. The two systems are complementary but independent.",
  ),

  // Comparison card: SLFPA-E (Us)
  slfpaCardTitle: "SLFPA-E (Us)",
  slfpaCardLead: rt(
    "We protect against **storm surge** from hurricanes, tropical storms, and high tides.",
  ),
  slfpaItems:
    "Levees, floodwalls, and surge barriers\nFloodgates that close during storms\nPermanent Canal Closure Pump Stations (PCCP)\nLake Borgne Surge Barrier\nProtection from Lake Pontchartrain & Gulf of Mexico",

  // Comparison card: SWBNO
  swbnoCardTitle: "SWBNO (Sewerage & Water Board)",
  swbnoCardLead: rt(
    "They manage **rainwater drainage**, drinking water, and sewage services.",
  ),
  swbnoItems:
    "Drainage pump stations that remove rainwater\nStorm drains and underground canals\nDrinking water treatment and distribution\nSewage collection and treatment\nStreet flooding from heavy rain",

  // "Where the Systems Connect" callout
  systemsConnectHeading: "Where the Systems Connect",
  systemsConnectBody: rt(
    "During a storm, SLFPA-E closes the floodgates at the outfall canals to block surge from entering the city. While those gates are closed, SWBNO's drainage pumps push rainwater into those same canals. Our Permanent Canal Closure Pump Stations (PCCPs) at 17th Street, Orleans Avenue, and London Avenue then pump that water over the gates and out to Lake Pontchartrain. That handoff is the one point where the two systems meet.",
  ),
};

const listHint = "One item per line. Each line becomes a bullet.";

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
    { name: "pageTitle", label: "Page title", type: "text", defaultValue: () => ABOUT_DEFAULTS.pageTitle, admin: { description: "Large page heading at the top of the About page." } },
    { name: "pageSubtitle", label: "Page subtitle", type: "text", defaultValue: () => ABOUT_DEFAULTS.pageSubtitle, admin: { description: "Tagline shown directly beneath the page heading." } },

    // --- Mission overview ---
    { name: "missionOverview", label: "Mission overview", type: "richText", defaultValue: () => ABOUT_DEFAULTS.missionOverview, admin: { description: "Opening overview paragraph (blue left-bordered block) on SLFPA-E's origin, governance, and coverage." } },

    // --- HSDRRS panel ---
    { name: "hsdrrsHeading", label: "HSDRRS panel: heading", type: "text", defaultValue: () => ABOUT_DEFAULTS.hsdrrsHeading, admin: { description: "Heading of the dark-blue HSDRRS panel (left)." } },
    { name: "hsdrrsIntro", label: "HSDRRS panel: text", type: "richText", defaultValue: () => ABOUT_DEFAULTS.hsdrrsIntro, admin: { description: "Paragraph inside the HSDRRS panel. (The line with the dollar figure is generated automatically and isn't editable here.)" } },

    // --- MR&T panel ---
    { name: "mrtHeading", label: "MR&T panel: heading", type: "text", defaultValue: () => ABOUT_DEFAULTS.mrtHeading, admin: { description: "Heading of the teal MR&T panel (right)." } },
    { name: "mrtIntro", label: "MR&T panel: first paragraph", type: "richText", defaultValue: () => ABOUT_DEFAULTS.mrtIntro, admin: { description: "First paragraph inside the MR&T panel." } },
    { name: "mrtBody", label: "MR&T panel: second paragraph", type: "richText", defaultValue: () => ABOUT_DEFAULTS.mrtBody, admin: { description: "Second paragraph inside the MR&T panel." } },

    // --- "Our Responsibilities" section ---
    { name: "responsibilitiesHeading", label: "Responsibilities: section heading", type: "text", defaultValue: () => ABOUT_DEFAULTS.responsibilitiesHeading, admin: { description: "Section heading above the three responsibility cards." } },

    // Card 1: Operate & Maintain
    { name: "operateMaintainTitle", label: "Operate & Maintain card: title", type: "text", defaultValue: () => ABOUT_DEFAULTS.operateMaintainTitle, admin: { description: "Title of the first responsibility card." } },
    { name: "operateMaintainBody", label: "Operate & Maintain card: intro", type: "richText", defaultValue: () => ABOUT_DEFAULTS.operateMaintainBody, admin: { description: "Intro paragraph of the 'Operate & Maintain' card." } },
    { name: "operateMaintainItems", label: "Operate & Maintain card: bullets", type: "textarea", defaultValue: () => ABOUT_DEFAULTS.operateMaintainItems, admin: { description: `'Operate & Maintain' card bullets. ${listHint}` } },

    // Card 2: Storm Response
    { name: "stormResponseTitle", label: "Storm Response card: title", type: "text", defaultValue: () => ABOUT_DEFAULTS.stormResponseTitle, admin: { description: "Title of the second responsibility card." } },
    { name: "stormResponseBody", label: "Storm Response card: intro", type: "richText", defaultValue: () => ABOUT_DEFAULTS.stormResponseBody, admin: { description: "Intro paragraph of the 'Storm Response' card." } },
    { name: "stormResponseItems", label: "Storm Response card: bullets", type: "textarea", defaultValue: () => ABOUT_DEFAULTS.stormResponseItems, admin: { description: `'Storm Response' card bullets. ${listHint}` } },

    // Card 3: Permitting & Compliance
    { name: "permittingTitle", label: "Permitting & Compliance card: title", type: "text", defaultValue: () => ABOUT_DEFAULTS.permittingTitle, admin: { description: "Title of the third responsibility card." } },
    { name: "permittingBody", label: "Permitting & Compliance card: intro", type: "richText", defaultValue: () => ABOUT_DEFAULTS.permittingBody, admin: { description: "Intro paragraph of the 'Permitting & Compliance' card." } },
    { name: "permittingItems", label: "Permitting & Compliance card: bullets", type: "textarea", defaultValue: () => ABOUT_DEFAULTS.permittingItems, admin: { description: `'Permitting & Compliance' card bullets. ${listHint}` } },

    // --- "Surge Protection vs. Drainage" section ---
    { name: "surgeDrainageHeading", label: "Surge vs. Drainage: section heading", type: "text", defaultValue: () => ABOUT_DEFAULTS.surgeDrainageHeading, admin: { description: "Section heading for the surge-vs-drainage explainer." } },
    { name: "surgeDrainageIntro", label: "Surge vs. Drainage: explainer paragraph", type: "richText", defaultValue: () => ABOUT_DEFAULTS.surgeDrainageIntro, admin: { description: "The surge-vs-drainage explainer paragraph." } },

    // Comparison card: SLFPA-E (Us)
    { name: "slfpaCardTitle", label: "SLFPA-E card: title", type: "text", defaultValue: () => ABOUT_DEFAULTS.slfpaCardTitle, admin: { description: "Title of the left comparison card (SLFPA-E)." } },
    { name: "slfpaCardLead", label: "SLFPA-E card: lead sentence", type: "richText", defaultValue: () => ABOUT_DEFAULTS.slfpaCardLead, admin: { description: "Lead sentence of the SLFPA-E comparison card." } },
    { name: "slfpaItems", label: "SLFPA-E card: bullets", type: "textarea", defaultValue: () => ABOUT_DEFAULTS.slfpaItems, admin: { description: `SLFPA-E comparison card checklist. ${listHint}` } },

    // Comparison card: SWBNO
    { name: "swbnoCardTitle", label: "SWBNO card: title", type: "text", defaultValue: () => ABOUT_DEFAULTS.swbnoCardTitle, admin: { description: "Title of the right comparison card (SWBNO)." } },
    { name: "swbnoCardLead", label: "SWBNO card: lead sentence", type: "richText", defaultValue: () => ABOUT_DEFAULTS.swbnoCardLead, admin: { description: "Lead sentence of the SWBNO comparison card." } },
    { name: "swbnoItems", label: "SWBNO card: bullets", type: "textarea", defaultValue: () => ABOUT_DEFAULTS.swbnoItems, admin: { description: `SWBNO comparison card list. ${listHint}` } },

    // "Where the Systems Connect" callout
    { name: "systemsConnectHeading", label: "Where the Systems Connect: heading", type: "text", defaultValue: () => ABOUT_DEFAULTS.systemsConnectHeading, admin: { description: "Heading of the blue 'Where the Systems Connect' callout." } },
    { name: "systemsConnectBody", label: "Where the Systems Connect: body", type: "richText", defaultValue: () => ABOUT_DEFAULTS.systemsConnectBody, admin: { description: "Body paragraph of the 'Where the Systems Connect' callout." } },
  ],
};
