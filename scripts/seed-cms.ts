/**
 * Seed the FPA Lens CMS from the curated defaults in siteData.ts.
 *
 * Idempotent: globals are updated in place; staff and users are upserted by
 * name/email, so re-running is safe. Run with:
 *
 *   npx payload run scripts/seed-cms.ts
 *
 * (needs PAYLOAD_SECRET + a DB — DATABASE_URI for local SQLite, or POSTGRES_URL
 * in prod). Editor users are created with a random temp password; real users
 * set their own via the "Forgot password" flow (Resend email).
 */
import crypto from "crypto";
import { getPayload } from "payload";
import config from "@payload-config";
import { siteConfig, contacts, staffingData } from "../src/data/siteData";

const HERO_HEADING = "Protecting Greater New Orleans";
const HERO_SUBTEXT =
  "The FPA Lens provides transparent, real-time insight into how the SLFPA-E " +
  "protects our community through world-class flood defense infrastructure.";

const EDITORS: { email: string; name: string; role: "admin" | "editor" }[] = [
  { email: "jwilliams@slfpae.gov", name: "L. Jeff Williams", role: "editor" },
  { email: "oboochever@ahdatalytics.com", name: "Oscar Boochever", role: "admin" },
  { email: "jasher@ahdatalytics.com", name: "Asher", role: "admin" },
  { email: "bhorwitz@ahdatalytics.com", name: "Ben Horwitz", role: "admin" },
];

const tempPassword = () => crypto.randomBytes(18).toString("base64url");

const run = async () => {
  const payload = await getPayload({ config });

  // 1. Home hero copy
  await payload.updateGlobal({
    slug: "home-content",
    data: { heroHeading: HERO_HEADING, heroSubtext: HERO_SUBTEXT },
  });
  payload.logger.info("Seeded home-content");

  // 2. Site settings (footer address + contact)
  await payload.updateGlobal({
    slug: "site-settings",
    data: {
      street: siteConfig.address.street,
      city: siteConfig.address.city,
      state: siteConfig.address.state,
      zip: siteConfig.address.zip,
      phone: "(504) 286-3100",
      contactEmail: contacts.regionalDirector.email,
      contactPhone: contacts.regionalDirector.office,
    },
  });
  payload.logger.info("Seeded site-settings");

  // 3. Staff members (upsert by name; photos added later via the portal)
  for (let i = 0; i < staffingData.leadership.length; i++) {
    const leader = staffingData.leadership[i] as {
      name: string;
      title: string;
      bio?: { heading: string; text: string }[];
    };
    const data = {
      name: leader.name,
      title: leader.title,
      order: i,
      bio: (leader.bio ?? []).map((b) => ({ heading: b.heading, text: b.text })),
    };
    const existing = await payload.find({
      collection: "staff-members",
      where: { name: { equals: leader.name } },
      limit: 1,
    });
    if (existing.docs[0]) {
      await payload.update({ collection: "staff-members", id: existing.docs[0].id, data });
    } else {
      await payload.create({ collection: "staff-members", data });
    }
  }
  payload.logger.info(`Seeded ${staffingData.leadership.length} staff members`);

  // 4. Editor users (create if missing)
  let created = 0;
  for (const ed of EDITORS) {
    const existing = await payload.find({
      collection: "users",
      where: { email: { equals: ed.email } },
      limit: 1,
    });
    if (!existing.docs[0]) {
      await payload.create({
        collection: "users",
        data: { email: ed.email, name: ed.name, role: ed.role, password: tempPassword() },
      });
      created += 1;
      payload.logger.info(`Created ${ed.role}: ${ed.email} (must reset password)`);
    }
  }
  payload.logger.info(`Users: ${created} created, ${EDITORS.length - created} already existed`);

  payload.logger.info("Seed complete.");
};

// Top-level await so `payload run` waits for the seed to finish before exiting
// (a floating promise would be cut off mid-run in an ESM script).
try {
  await run();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
