import type { AdminViewServerProps } from "payload";
import { Gutter } from "@payloadcms/ui";
import React from "react";
import { HowToUse } from "./HowToUse";

/**
 * Custom admin dashboard for the FPA Lens Content Portal. Replaces Payload's
 * default card grid with grouped, described cards so non-technical staff can
 * tell at a glance what each item lets them edit. Wrapped in DefaultTemplate so
 * the branded sidebar + header stay intact.
 */

type CardDef = { title: string; description: string; href: string };

const PAGE_CARDS: CardDef[] = [
  { title: "About", description: "Mission statement, responsibilities, and the surge-vs-drainage explainer.", href: "/admin/globals/about-page" },
  { title: "Finance", description: "Page intro, section headings, and the Major Projects intro.", href: "/admin/globals/finance-page" },
  { title: "Safety", description: "Page intro, section headings, and the safety term definitions.", href: "/admin/globals/safety-page" },
  { title: "Engineering", description: "Page intro, section headings, and the inspection descriptions.", href: "/admin/globals/engineering-page" },
  { title: "Environment", description: "Page intro, section headings, and the risk-driver explainers.", href: "/admin/globals/environment-page" },
  { title: "Infrastructure", description: "Page intro, section headings, and the overview text.", href: "/admin/globals/infrastructure-page" },
  { title: "Protection", description: "Page intro, mission statement, and section headings.", href: "/admin/globals/protection-page" },
  { title: "Staffing", description: "Page intro, section headings, and section descriptions.", href: "/admin/globals/staffing-page" },
  { title: "Turf Maintenance", description: "Page intro, the operational note, and the how-to-read text.", href: "/admin/globals/turf-page" },
  { title: "IDIQ Contracts", description: "Landing intro, the Key Takeaway note, and service descriptions.", href: "/admin/globals/idiq-page" },
];

const SITE_CARDS: CardDef[] = [
  { title: "Staff Members", description: "Add, edit, and reorder leadership — names, titles, bios, and photos.", href: "/admin/collections/staff-members" },
  { title: "Home Headline", description: "The large headline on the home page hero.", href: "/admin/globals/home-content" },
  { title: "Site Settings", description: "Footer address, phone, and public contact details.", href: "/admin/globals/site-settings" },
  { title: "Media Library", description: "Uploaded images — staff photos and other assets.", href: "/admin/collections/media" },
];

const ADMIN_CARDS: CardDef[] = [
  { title: "Users", description: "Who can sign in to this portal — add or remove editors and admins.", href: "/admin/collections/users" },
];

function CardGrid({ cards }: { cards: CardDef[] }) {
  return (
    <div className="fpa-dash__grid">
      {cards.map((c) => (
        <a key={c.href} href={c.href} className="fpa-dash__card">
          <span className="fpa-dash__card-title">
            {c.title}
            <span className="fpa-dash__card-arrow" aria-hidden="true">→</span>
          </span>
          <span className="fpa-dash__card-desc">{c.description}</span>
        </a>
      ))}
    </div>
  );
}

export function Dashboard({ initPageResult }: AdminViewServerProps) {
  const user = initPageResult?.req?.user;
  const isAdmin = user?.role === "admin";
  const firstName = user?.name ? String(user.name).split(" ")[0] : null;

  // RootPage already wraps the dashboard view in DefaultTemplate (sidebar +
  // header), so this component renders content only — wrapping again would
  // duplicate the admin chrome.
  return (
    <Gutter>
      <div className="fpa-dash">
        <header className="fpa-dash__welcome">
          <h1 className="fpa-dash__welcome-title">
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </h1>
          <p className="fpa-dash__welcome-sub">
            Update the public FPA Lens dashboard&rsquo;s text, staff, and settings.
          </p>
        </header>

        <HowToUse />

        <section className="fpa-dash__section">
          <h2 className="fpa-dash__section-title">Website pages</h2>
          <p className="fpa-dash__section-hint">Edit the wording on each public page.</p>
          <CardGrid cards={PAGE_CARDS} />
        </section>

        <section className="fpa-dash__section">
          <h2 className="fpa-dash__section-title">People, home &amp; settings</h2>
          <CardGrid cards={SITE_CARDS} />
        </section>

        {isAdmin && (
          <section className="fpa-dash__section">
            <h2 className="fpa-dash__section-title">Portal administration</h2>
            <CardGrid cards={ADMIN_CARDS} />
          </section>
        )}
      </div>
    </Gutter>
  );
}

export default Dashboard;
