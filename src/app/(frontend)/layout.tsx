import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { RefreshRouteOnSave } from "@/components/RefreshRouteOnSave";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_TITLE = "FPA Lens | Southeast Louisiana Flood Protection Authority";
const SITE_DESCRIPTION =
  "Public transparency dashboard for the Southeast Louisiana Flood Protection Authority - East. Track infrastructure readiness, finances, engineering, safety, staffing, and Lakefront flood risk.";
const OG_IMAGE_ALT =
  "FPA Lens - Your Flood Defense System - Southeast Louisiana Flood Protection Authority - East";

// No `title.template` here on purpose: the Tropical Weather page exports a
// full "Tropical Weather | FPA Lens" title, so a template would double the
// suffix. Each route's layout.tsx sets its own full "<Page> | FPA Lens" title.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.fpalens.org"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: ["flood protection", "New Orleans", "SLFPA-E", "levees", "transparency", "public dashboard"],
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: "FPA Lens",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: OG_IMAGE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      // Phones pick the largest icon offered. Until Oct 2026 that was the
      // Vercel starter src/app/favicon.ico (256x256), so mobile tabs showed a
      // black triangle; it is deleted and the FPA 180px icon listed instead.
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#21355a] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#65bc7b]"
        >
          Skip to content
        </a>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </div>
        <RefreshRouteOnSave />
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
