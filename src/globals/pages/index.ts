import { AboutPage } from "./aboutPage";
import { FinancePage } from "./financePage";
import { SafetyPage } from "./safetyPage";
import { EngineeringPage } from "./engineeringPage";
import { EnvironmentPage } from "./environmentPage";
import { InfrastructurePage } from "./infrastructurePage";
import { ProtectionPage } from "./protectionPage";
import { StaffingPage } from "./staffingPage";
import { TurfPage } from "./turfPage";
import { IdiqPage } from "./idiqPage";
import { PermitsPage } from "./permitsPage";

/** All per-page copy globals, registered in payload.config.ts. */
export const pageGlobals = [
  AboutPage,
  FinancePage,
  SafetyPage,
  EngineeringPage,
  EnvironmentPage,
  InfrastructurePage,
  ProtectionPage,
  StaffingPage,
  TurfPage,
  IdiqPage,
  PermitsPage,
];

/** Global slug -> public page path (for Live Preview + editor context). */
export const PAGE_GLOBAL_PATHS: Record<string, string> = {
  "about-page": "/about",
  "finance-page": "/finance",
  "safety-page": "/safety",
  "engineering-page": "/engineering",
  "environment-page": "/environment",
  "infrastructure-page": "/infrastructure",
  "protection-page": "/protection",
  "staffing-page": "/staffing",
  "turf-page": "/infrastructure/turf-maintenance",
  "idiq-page": "/engineering/idiq",
  "permits-page": "/engineering/permits",
};
