import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/our-system", destination: "/infrastructure", permanent: true },
      { source: "/our-system/:path*", destination: "/infrastructure/:path*", permanent: true },
      { source: "/financial", destination: "/finance", permanent: true },
      { source: "/financial/:path*", destination: "/finance/:path*", permanent: true },
      { source: "/operations", destination: "/engineering", permanent: true },
      { source: "/operations/:path*", destination: "/engineering/:path*", permanent: true },
      { source: "/our-team", destination: "/staffing", permanent: true },
      { source: "/our-team/:path*", destination: "/staffing/:path*", permanent: true },
      { source: "/environmental", destination: "/environment", permanent: true },
      { source: "/environmental/:path*", destination: "/environment/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
