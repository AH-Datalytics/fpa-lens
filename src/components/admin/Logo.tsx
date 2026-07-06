import React from "react";

/**
 * Login-screen brand graphic for the FPA Lens Content Portal.
 * Referenced by admin.components.graphics.Logo in payload.config.ts.
 */
export function Logo() {
  return (
    <div className="fpa-brand fpa-brand--login">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fpa_logo.png" alt="SLFPA-E" className="fpa-brand__mark" />
      <div className="fpa-brand__text">
        <span className="fpa-brand__title">FPA Lens</span>
        <span className="fpa-brand__subtitle">Content Portal</span>
      </div>
    </div>
  );
}

export default Logo;
