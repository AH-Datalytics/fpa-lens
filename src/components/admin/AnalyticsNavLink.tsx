import Link from "next/link";
import React from "react";

/**
 * "Site analytics" link in the admin nav, to the custom /admin/analytics view.
 * Referenced by admin.components.afterNavLinks in payload.config.ts.
 */
export function AnalyticsNavLink() {
  return (
    <Link href="/admin/analytics" className="fpa-nav-analytics">
      Site analytics
    </Link>
  );
}

export default AnalyticsNavLink;
