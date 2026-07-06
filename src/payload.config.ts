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
      titleSuffix: "· FPA Lens CMS",
    },
  },
  collections: [Users, Media, StaffMembers],
  globals: [SiteSettings, HomeContent],
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
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { [Media.slug]: true },
      token: process.env.BLOB_READ_WRITE_TOKEN || "",
    }),
  ],
});
