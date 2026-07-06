import React from "react";

/**
 * Small brand mark shown in the admin nav header.
 * Referenced by admin.components.graphics.Icon in payload.config.ts.
 */
export function Icon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/fpa_logo.png" alt="FPA Lens" className="fpa-brand__mark fpa-brand__mark--sm" />
  );
}

export default Icon;
