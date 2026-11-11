import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // No frame-ancestors here: the embed and widget features are meant to be framed by other sites
      { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'" },
    ];
    const noFrame = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ];
    return [
      { source: "/:path*", headers: base },
      { source: "/admin", headers: noFrame },
      { source: "/api/admin", headers: noFrame },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Old subscribe links (/?team=ID&view=ics) shown in the Share window before Nov 2026
        { source: "/", has: [{ type: "query", key: "view", value: "ics" }], destination: "/api/ical" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
