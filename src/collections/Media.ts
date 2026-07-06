import type { CollectionConfig } from "payload";

/**
 * Uploaded media (currently staff headshots). Files are stored in Vercel Blob
 * via the storage adapter in payload.config.ts (the app already has a
 * BLOB_READ_WRITE_TOKEN), so nothing is written to the local filesystem in
 * production.
 */
export const Media: CollectionConfig = {
  slug: "media",
  access: {
    read: () => true,
  },
  upload: {
    mimeTypes: ["image/*"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      admin: { description: "Describe the image for screen readers." },
    },
  ],
};
