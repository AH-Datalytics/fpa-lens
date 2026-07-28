/**
 * One-off: apply the Director's July 2026 About-page personnel updates to the
 * live CMS (staff-members collection). Mirrors the same changes made to the
 * fallback in src/data/siteData.ts. Run against prod Neon:
 *
 *   export POSTGRES_URL=$(grep '^POSTGRES_URL_NON_POOLING=' .env.vercel-prod | cut -d= -f2- | tr -d '"')
 *   export PAYLOAD_SECRET=$(grep '^PAYLOAD_SECRET=' .env.local | cut -d= -f2- | tr -d '"')
 *   npx payload run scripts/update-staff-personnel.ts
 *
 * Changes:
 *  - Delete the "Public Information Director" card (Stacy Gilmore).
 *  - Mark the Safety (Jamal Dortch) and Maintenance (Carlos Metoyer) tiles
 *    Vacant: name -> "Vacant", drop photo + bio, keep the official title.
 *  - Rename "Lawrence Williams, MBA, PMP" -> "Lawrence Williams".
 *
 * Idempotent: name lookups miss on a second run, so re-running is a no-op.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const run = async () => {
  const payload = await getPayload({ config });

  const findByName = async (name: string) => {
    const res = await payload.find({
      collection: "staff-members",
      where: { name: { equals: name } },
      limit: 1,
    });
    return res.docs[0];
  };

  // 1. Remove Public Information Director (Stacy Gilmore).
  const stacy = await findByName("Stacy Gilmore");
  if (stacy) {
    await payload.delete({ collection: "staff-members", id: stacy.id });
    payload.logger.info("Deleted staff card: Stacy Gilmore (Public Information Director)");
  } else {
    payload.logger.info("Stacy Gilmore already absent — skipping delete");
  }

  // 2. Mark Safety + Maintenance tiles Vacant (keep title, drop photo + bio).
  const vacancies: [string, string][] = [
    ["Jamal Dortch", "Safety Risk Agency Manager"],
    ["Carlos Metoyer", "Regional Director of Maintenance"],
  ];
  for (const [name, title] of vacancies) {
    const doc = await findByName(name);
    if (doc) {
      await payload.update({
        collection: "staff-members",
        id: doc.id,
        data: { name: "Vacant", photo: null, bio: [] },
      });
      payload.logger.info(`Marked Vacant: ${name} (${title})`);
    } else {
      payload.logger.info(`${name} not found (already Vacant?) — skipping`);
    }
  }

  // 3. Drop post-nominals from Lawrence Williams' displayed name.
  const lawrence = await findByName("Lawrence Williams, MBA, PMP");
  if (lawrence) {
    await payload.update({
      collection: "staff-members",
      id: lawrence.id,
      data: { name: "Lawrence Williams" },
    });
    payload.logger.info('Renamed "Lawrence Williams, MBA, PMP" -> "Lawrence Williams"');
  } else {
    payload.logger.info("Lawrence Williams already renamed — skipping");
  }

  payload.logger.info("Personnel update complete.");
};

try {
  await run();
  process.exit(0);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
