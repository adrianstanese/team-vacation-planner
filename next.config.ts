import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
