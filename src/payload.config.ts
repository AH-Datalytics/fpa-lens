import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { StaffMembers } from "./collections/StaffMembers";
import { SiteSettings } from "./globals/SiteSettings";
import { HomeContent } from "./globals/HomeContent";
import { pageGlobals, PAGE_GLOBAL_PATHS } from "./globals/pages";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Prod (Vercel) provides a Postgres connection string; local dev falls back to
// a zero-setup SQLite file. Same collections/globals either way.
const postgresUrl =
  process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: "· FPA Lens Content Portal",
      description: "Content portal for the SLFPA-E FPA Lens dashboard.",
    },
    components: {
      graphics: {
        Logo: "/components/admin/Logo#Logo",
        Icon: "/components/admin/Icon#Icon",
      },
      beforeLogin: ["/components/admin/BeforeLogin#BeforeLogin"],
      beforeDashboard: ["/components/admin/HowToUse#HowToUse"],
      afterNavLinks: ["/components/admin/BackToSite#BackToSite"],
    },
    livePreview: {
      url: ({ collectionConfig, globalConfig }) => {
        const base = process.env.NEXT_PUBLIC_SERVER_URL || "";
        if (globalConfig?.slug && PAGE_GLOBAL_PATHS[globalConfig.slug]) {
          return `${base}${PAGE_GLOBAL_PATHS[globalConfig.slug]}`;
        }
        if (collectionConfig?.slug === "staff-members") return `${base}/about`;
        return `${base}/`;
      },
      globals: ["home-content", "site-settings", ...Object.keys(PAGE_GLOBAL_PATHS)],
      collections: ["staff-members"],
    },
  },
  collections: [Users, Media, StaffMembers],
  globals: [SiteSettings, HomeContent, ...pageGlobals],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresUrl
    ? postgresAdapter({ pool: { connectionString: postgresUrl } })
    : sqliteAdapter({
        client: { url: process.env.DATABASE_URI || "file:./cms-dev.db" },
      }),
  email: resendAdapter({
    defaultFromAddress: "alerts@fpalens.org",
    defaultFromName: "FPA Lens",
    apiKey: process.env.RESEND_API_KEY || "",
  }),
  plugins: [
    // Staff photos go to a dedicated PUBLIC Vercel Blob store, addressed by its
    // own token (CMS_MEDIA_BLOB_TOKEN) so it stays separate from the lakefront
    // store's BLOB_READ_WRITE_TOKEN. Enabled whenever that token is present;
    // local dev without it falls back to disk / the curated /headshots assets.
    ...(process.env.CMS_MEDIA_BLOB_TOKEN
      ? [
          vercelBlobStorage({
            enabled: true,
            collections: { [Media.slug]: true },
            token: process.env.CMS_MEDIA_BLOB_TOKEN,
          }),
        ]
      : []),
  ],
});
