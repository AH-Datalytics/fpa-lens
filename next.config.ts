import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

// Baseline security headers applied to every response. CSP is intentionally
// omitted for now: Next.js injects inline scripts for hydration, so a strict
// CSP requires a nonce-based middleware that we can add later if needed.
const securityHeaders = [
  // Browsers must use HTTPS for the next 2 years (incl. subdomains).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Block MIME-type sniffing (defense in depth against content-type confusion).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow framing entirely; nothing on this site needs to be embedded.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the origin only on cross-origin requests; full URL same-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop access to sensors and hardware features the dashboard never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/our-system", destination: "/infrastructure", permanent: true },
      { source: "/our-system/grass-cutting", destination: "/infrastructure/turf-maintenance", permanent: true },
      { source: "/our-system/:path*", destination: "/infrastructure/:path*", permanent: true },
      { source: "/infrastructure/grass-cutting", destination: "/infrastructure/turf-maintenance", permanent: true },
      { source: "/financial", destination: "/finance", permanent: true },
      { source: "/financial/:path*", destination: "/finance/:path*", permanent: true },
      { source: "/operations", destination: "/engineering", permanent: true },
      { source: "/operations/:path*", destination: "/engineering/:path*", permanent: true },
      { source: "/our-team", destination: "/staffing", permanent: true },
      { source: "/our-team/:path*", destination: "/staffing/:path*", permanent: true },
      { source: "/environmental", destination: "/environment", permanent: true },
      { source: "/environmental/:path*", destination: "/environment/:path*", permanent: true },
      { source: "/about/what-we-do", destination: "/about", permanent: true },
    ];
  },
};

export default withPayload(nextConfig);
