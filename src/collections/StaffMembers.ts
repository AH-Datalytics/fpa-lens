import type { CollectionConfig } from "payload";

/**
 * Leadership / staff cards shown on the About and staffing views. Mirrors the
 * shape of `staffingData.leadership` in siteData.ts so the seed script maps
 * 1:1. Editors add / remove / reorder people here; `order` drives display order.
 */
export const StaffMembers: CollectionConfig = {
  slug: "staff-members",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "title", "order"],
    description: "Leadership and staff cards. Drag order via the Order field.",
  },
  access: {
    read: () => true,
  },
  defaultSort: "order",
  fields: [
    { name: "name", type: "text", required: true },
    { name: "title", type: "text", required: true },
    {
      name: "photo",
      type: "upload",
      relationTo: "media",
      admin: { description: "Headshot. Square images look best." },
    },
    {
      name: "order",
      type: "number",
      required: true,
      defaultValue: 0,
      admin: { description: "Lower numbers appear first." },
    },
    {
      name: "bio",
      type: "array",
      labels: { singular: "Bio section", plural: "Bio sections" },
      admin: { description: "Headed paragraphs, e.g. Current Role, Experience." },
      fields: [
        { name: "heading", type: "text", required: true },
        { name: "text", type: "textarea", required: true },
      ],
    },
  ],
};
