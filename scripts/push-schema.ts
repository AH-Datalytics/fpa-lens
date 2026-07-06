/**
 * Ensure the database schema matches the current Payload config by letting the
 * adapter's dev "push" create any missing tables (e.g. newly added globals or
 * collections). Additive and idempotent — it does NOT touch existing rows or
 * content. Use it to provision new schema on a DB without running the seed.
 *
 *   POSTGRES_URL=<direct/unpooled> PAYLOAD_SECRET=<secret> npx payload run scripts/push-schema.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";

const run = async () => {
  const payload = await getPayload({ config });
  payload.logger.info("Schema push complete (config tables ensured).");
};

try {
  await run();
  process.exit(0);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
