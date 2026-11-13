import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler, opt-in: only components marked "use memo" (the v3 components) are compiled.
  // The older app.tsx code does not follow the compiler's rules everywhere, so it stays as it is.
  reactCompiler: { compilationMode: "annotation" },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Build the ready-made pages one at a time. The planner keeps the language being drawn in shared variables
    // (lib/extraText and app/app.tsx), so two language pages drawn at once in the same process could pick up each
    // other's texts. There are about twenty pages, so this costs nothing. scripts/check-lang-pages.mjs then checks
    // every built page and fails the build if one carries another language.
    staticGenerationMaxConcurrency: 1,
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
    // A team opened through the address itself (?team=…: the widget, the embed, the print and data views) is one
    // team's private board, not a page for search engines. The plain front pages are not affected.
    const teamView = [{ key: "X-Robots-Tag", value: "noindex" }];
    const hasTeam = [{ type: "query" as const, key: "team" }];
    return [
      { source: "/:path*", headers: base },
      { source: "/admin", headers: noFrame },
      { source: "/api/admin", headers: noFrame },
      { source: "/", has: hasTeam, headers: teamView },
      { source: "/:lang([a-z]{2})", has: hasTeam, headers: teamView },
    ];
  },
  async redirects() {
    // English lives at the root; there is no /en. Someone who types it lands on the front page.
    return [{ source: "/en", destination: "/", permanent: true }];
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
