import { updateTag } from "next/cache";

/**
 * Payload afterChange / afterDelete hook: invalidate the "cms" cache tag so the
 * public site (which reads via unstable_cache tagged "cms") reflects a save
 * immediately, instead of waiting for the 60s ISR window. updateTag gives
 * read-your-own-writes inside the admin's save server action. No-ops when
 * called outside that context (e.g. the seed script) — the 60s ISR covers it.
 */
export const revalidateCms = () => {
  try {
    updateTag("cms");
  } catch {
    // Not in a Server Action context — the 60s ISR window handles it.
  }
};
