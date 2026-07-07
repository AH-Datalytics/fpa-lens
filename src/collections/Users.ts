import type { CollectionConfig } from "payload";

/**
 * Editor accounts for the FPA Lens CMS.
 *
 * Two roles:
 *  - `admin`  — AHD staff. Can manage the editor list (create/edit/delete users)
 *               and edit all content.
 *  - `editor` — FPA (the Director). Can edit content only, not the user list.
 *
 * New users are created by an admin and receive a Payload invite / set-password
 * email via the Resend adapter configured in payload.config.ts.
 */
const isAdmin = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === "admin";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["name", "email", "role"],
    // Hide the Users collection from editors entirely (nav + dashboard). Editors
    // manage their own login via the Account page, not the user list; only admins
    // see and manage the editor roster.
    hidden: ({ user }) =>
      (user as { role?: string } | undefined)?.role !== "admin",
  },
  access: {
    // Only admins manage the editor list; editors can read/update only self.
    create: isAdmin,
    delete: isAdmin,
    update: ({ req, id }) =>
      req.user?.role === "admin" || req.user?.id === id,
    read: ({ req }) => {
      if (req.user?.role === "admin") return true;
      return { id: { equals: req.user?.id } };
    },
  },
  fields: [
    { name: "name", type: "text" },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      options: [
        { label: "Admin (AHD — manages editors + content)", value: "admin" },
        { label: "Editor (content only)", value: "editor" },
      ],
      // Only admins can change roles.
      access: { update: isAdmin },
    },
  ],
};
