/**
 * Set a CMS user's password (admin utility). Run with:
 *   PW_EMAIL=user@example.com PW_VALUE=... npx payload run scripts/set-password.ts
 * plus the usual PAYLOAD_SECRET + DB env. Handy for granting initial access
 * before an editor uses the "Forgot password" email flow.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const email = process.env.PW_EMAIL;
const password = process.env.PW_VALUE;

const run = async () => {
  if (!email || !password) throw new Error("PW_EMAIL and PW_VALUE are required");
  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
  });
  if (!res.docs[0]) throw new Error(`No user ${email}`);
  await payload.update({ collection: "users", id: res.docs[0].id, data: { password } });
  payload.logger.info(`Password updated for ${email}`);
};

try {
  await run();
  process.exit(0);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
