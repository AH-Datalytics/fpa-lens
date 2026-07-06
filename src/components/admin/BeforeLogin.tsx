import React from "react";

/**
 * Short welcome shown above the login form.
 * Referenced by admin.components.beforeLogin in payload.config.ts.
 */
export function BeforeLogin() {
  return (
    <div className="fpa-before-login">
      <p>
        Welcome to the <strong>FPA Lens Content Portal</strong>. Sign in to update the
        public dashboard&rsquo;s text, staff, and settings. Need access? Contact AH Datalytics.
      </p>
    </div>
  );
}

export default BeforeLogin;
