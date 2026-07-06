import React from "react";

/**
 * "How to use" guide shown at the top of the admin dashboard.
 * Referenced by admin.components.beforeDashboard in payload.config.ts.
 */
export function HowToUse() {
  return (
    <section className="fpa-howto">
      <h2 className="fpa-howto__title">How to use this portal</h2>
      <ol className="fpa-howto__steps">
        <li>
          <span className="fpa-howto__num">1</span>
          <div>
            <strong>Choose what to edit</strong> from the menu on the left: any page&rsquo;s
            wording under <strong>Page Content</strong>, plus Home Content, Site Settings, and
            Staff Members.
          </div>
        </li>
        <li>
          <span className="fpa-howto__num">2</span>
          <div>
            <strong>Make your changes.</strong> Type in the fields; add a staff photo by
            dragging an image in. Nothing goes live until you save.
          </div>
        </li>
        <li>
          <span className="fpa-howto__num">3</span>
          <div>
            <strong>Click Save.</strong> The public dashboard updates within about a minute.
          </div>
        </li>
      </ol>
      <p className="fpa-howto__note">
        Only the items shown here are editable. Live data (finance, safety, turf, readiness)
        updates automatically from official sources and is not changed in this portal.
      </p>
    </section>
  );
}

export default HowToUse;
