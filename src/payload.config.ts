import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { lexicalEditor, FixedToolbarFeature } from "@payloadcms/richtext-lexical";
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

// Canonical site origin. Local dev sets NEXT_PUBLIC_SERVER_URL; production uses
// the custom domain. Used both for Payload's serverURL (absolute reset/invite
// email links) and for the absolute OpenGraph image URL below (link unfurlers
// can't resolve relative paths).
const siteURL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_ENV === "production" ? "https://fpalens.org" : undefined);

// One-line summary shared by the browser meta description and the OG unfurl.
const portalDescription =
  "Staff sign-in to edit page text, staff profiles, and site settings for the SLFPA-E FPA Lens public dashboard.";

export default buildConfig({
  // Without this, Payload can't infer the host behind Vercel's proxy and emits a
  // hostname-less "http:///admin/reset/<token>" link in emails.
  serverURL: siteURL,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    // Controls the browser tab title, favicon, and the card that unfurls when
    // the /admin link is shared in Slack / iMessage / email. `robots` stays at
    // Payload's noindex default (unfurlers still read OG tags regardless).
    meta: {
      titleSuffix: "· FPA Lens Content Portal",
      description: portalDescription,
      // Use our branded static card instead of Payload's per-view dynamic one.
      defaultOGImageType: "off",
      icons: [
        { rel: "icon", type: "image/png", url: "/favicon-32x32.png" },
        { rel: "icon", type: "image/png", url: "/favicon-16x16.png" },
        { rel: "apple-touch-icon", type: "image/png", url: "/apple-touch-icon.png" },
      ],
      openGraph: {
        title: "FPA Lens Content Portal",
        description: portalDescription,
        siteName: "FPA Lens",
        images: [
          {
            url: `${siteURL || "https://fpalens.org"}/admin-og.png`,
            width: 1200,
            height: 630,
          },
        ],
      },
    },
    components: {
      graphics: {
        Logo: "/components/admin/Logo#Logo",
        Icon: "/components/admin/Icon#Icon",
      },
      beforeLogin: ["/components/admin/BeforeLogin#BeforeLogin"],
      afterNavLinks: ["/components/admin/BackToSite#BackToSite"],
      views: {
        // Custom dashboard: grouped, described cards instead of Payload's bare
        // default grid. Renders the "How to use" guide itself, so beforeDashboard
        // is no longer needed.
        dashboard: {
          Component: "/components/admin/Dashboard#Dashboard",
        },
      },
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
  // A persistent toolbar pinned to the top of each rich-text field, instead of
  // the default floating toolbar (which overlapped/cut off over the text).
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter((feature) => feature.key !== "toolbarInline"),
      FixedToolbarFeature(),
    ],
  }),
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
    // Admin/account emails (password reset, editor invites) send from this
    // address. Any local-part on the verified fpalens.org Resend domain works;
    // kept separate from the digest/alert sender (alerts@fpalens.org).
    defaultFromAddress: "password@fpalens.org",
    defaultFromName: "FPA Lens Content Portal",
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
