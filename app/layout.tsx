import type { Metadata, Viewport } from "next";
import "./globals.css";

const S = "https://vacationplanner.team";
const N = "Team Vacation Planner";
const D = "Free team vacation planner for teams up to 25. Plan vacations, see who is away, avoid overlaps. 55 countries, public holidays 2026-2035, heatmap, timeline, coverage dashboard. No login required.";

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5, themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F2F1EE" }, { media: "(prefers-color-scheme: dark)", color: "#0B0F1A" }] };

export const metadata: Metadata = { metadataBase: new URL(S), title: { default: "Team Vacation Planner — Free Team Leave Calendar 2026-2035", template: "%s | Team Vacation Planner" }, description: D, keywords: ["team vacation planner","team leave calendar","vacation planner free","employee vacation tracker","team PTO tracker","holiday planner 55 countries"], robots: { index: true, follow: true }, openGraph: { type: "website", locale: "en_US", url: S, siteName: N, title: N, description: D, images: [{ url: `${S}/og-image.png`, width: 1200, height: 630 }] }, twitter: { card: "summary_large_image", title: N, description: D }, alternates: { canonical: S } };

const jsonLd = { "@context": "https://schema.org", "@type": "WebApplication", name: N, url: S, description: D, applicationCategory: "BusinessApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
