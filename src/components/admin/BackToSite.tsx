import React from "react";

/**
 * "View public site" link in the admin nav. Referenced by
 * admin.components.afterNavLinks in payload.config.ts.
 */
export function BackToSite() {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      className="fpa-back-to-site"
    >
      <span aria-hidden="true">↗</span> View public site
    </a>
  );
}

export default BackToSite;
