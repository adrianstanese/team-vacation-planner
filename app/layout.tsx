import type { Metadata, Viewport } from "next";

const SITE_URL = "https://vacationplanner.team";
const SITE_NAME = "Team Vacation Planner";
const DESCRIPTION = "Free team vacation planner for teams up to 25. Plan vacations, see who is away, avoid overlaps. 55 countries, public holidays 2026-2035. No login required.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FEF7FF" },
    { media: "(prefers-color-scheme: dark)", color: "#13111C" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Team Vacation Planner — Free Team Leave Calendar 2026-2035",
    template: "%s | Team Vacation Planner",
  },
  description: DESCRIPTION,
  icons: {
    icon: "/favicon-32.png",
    shortcut: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Team Vacation Planner — Free Team Leave Calendar for 2026-2035",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Team Vacation Planner — Free Team Leave Calendar",
    description: "Plan vacations, see who is away, avoid overlaps. 55 countries, 10 languages, no login required.",
  },
  alternates: { canonical: SITE_URL },
  category: "Productivity",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
