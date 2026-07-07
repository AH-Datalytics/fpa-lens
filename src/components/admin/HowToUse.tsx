import React from "react";

/**
 * "How to use" guide shown at the top of the admin dashboard.
 * Rendered by the custom Dashboard view (src/components/admin/Dashboard.tsx).
 *
 * Note: inline `<strong>` runs are followed by an explicit {" "} so JSX never
 * collapses the space between the bold text and the word after it.
 */
export function HowToUse() {
  return (
    <section className="fpa-howto">
      <h2 className="fpa-howto__title">How to use this portal</h2>
      <ol className="fpa-howto__steps">
        <li>
          <span className="fpa-howto__num">1</span>
          <div>
            <strong>Pick what to edit</strong>{" "}below (or from the menu on the left):
            any page&rsquo;s wording under <strong>Website Pages</strong>, plus the
            home headline, staff, and site settings.
          </div>
        </li>
        <li>
          <span className="fpa-howto__num">2</span>
          <div>
            <strong>Make your changes.</strong>{" "}Type in the fields, or add a staff
            photo by dragging an image in. Turn on <strong>Live Preview</strong> to
            watch the page update as you type.
          </div>
        </li>
        <li>
          <span className="fpa-howto__num">3</span>
          <div>
            <strong>Click Save.</strong>{" "}The public dashboard updates within about a
            minute.
          </div>
        </li>
      </ol>
      <p className="fpa-howto__note">
        Only the items shown here are editable. Live data (finance, safety, turf,
        readiness) updates automatically from official sources and is not changed in
        this portal.
      </p>
    </section>
  );
}

export default HowToUse;
