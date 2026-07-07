/**
 * Set a CMS user's role (admin utility). Run with:
 *   PW_EMAIL=user@example.com ROLE=admin npx payload run scripts/set-role.ts
 * plus the usual PAYLOAD_SECRET + DB env (POSTGRES_URL for prod). Handy for
 * promoting an editor to admin without re-running the whole seed.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const email = process.env.PW_EMAIL;
const role = process.env.ROLE;

const run = async () => {
  if (!email || (role !== "admin" && role !== "editor")) {
    throw new Error("PW_EMAIL and ROLE (admin|editor) are required");
  }
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
  });
  if (!res.docs[0]) throw new Error(`No user ${email}`);
  const before = res.docs[0].role;
  await payload.update({ collection: "users", id: res.docs[0].id, data: { role } });
  payload.logger.info(`Role for ${email}: ${before} -> ${role}`);
};

try {
  await run();
  process.exit(0);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
