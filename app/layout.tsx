import type { Metadata, Viewport } from "next";

const SITE_URL = "https://teamvacationplanner.com";
const SITE_NAME = "Team Vacation Planner";
const DESCRIPTION = "Free team vacation planner for teams up to 25. Plan vacations, see who's away, avoid overlaps. 55 countries, public holidays 2026–2035, heatmap, timeline, coverage dashboard. No login required.";

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
    default: "Team Vacation Planner — Free Team Leave Calendar 2026–2035",
    template: "%s | Team Vacation Planner",
  },
  description: DESCRIPTION,
  keywords: [
    "team vacation planner", "team leave calendar", "vacation planner free",
    "team holiday planner", "employee vacation tracker", "team absence planner",
    "vacation overlap checker", "team vacation calendar 2026", "European public holidays 2026",
    "team PTO tracker free", "vacation planner no login", "free leave management tool",
    "Urlaubsplaner Team kostenlos", "planificateur vacances équipe",
    "planificador vacaciones equipo", "planificator concedii echipa",
  ],
  authors: [{ name: "Team Vacation Planner" }],
  creator: "Team Vacation Planner",
  publisher: "Team Vacation Planner",
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website", locale: "en_US",
    alternateLocale: ["fr_FR", "de_DE", "es_ES", "pt_PT", "ro_RO", "hu_HU", "sv_SE", "it_IT", "bg_BG"],
    url: SITE_URL, siteName: SITE_NAME,
    title: "Team Vacation Planner — Free Team Leave Calendar for 2026–2035",
    description: DESCRIPTION,
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: "Team Vacation Planner" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Team Vacation Planner — Free Team Leave Calendar",
    description: "Plan vacations, see who's away, avoid overlaps. 55 countries, 10 languages, no login required.",
    images: [`${SITE_URL}/og-image.png`],
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      en: SITE_URL, fr: `${SITE_URL}?lang=fr`, de: `${SITE_URL}?lang=de`,
      es: `${SITE_URL}?lang=es`, pt: `${SITE_URL}?lang=pt`, ro: `${SITE_URL}?lang=ro`,
      hu: `${SITE_URL}?lang=hu`, sv: `${SITE_URL}?lang=sv`, it: `${SITE_URL}?lang=it`,
      bg: `${SITE_URL}?lang=bg`,
    },
  },
  category: "Productivity",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication", "@id": `${SITE_URL}/#app`,
      name: SITE_NAME, url: SITE_URL, description: DESCRIPTION,
      applicationCategory: "BusinessApplication", operatingSystem: "Any",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      softwareVersion: "5.0",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Team vacation calendar for up to 25 members",
        "Public holidays for 55 countries (2026–2035)",
        "Heatmap, Timeline, Coverage dashboard views",
        "Smart vacation optimizer with bridge day suggestions",
        "ICS, PDF, CSV, XLSX, TSV export",
        "QR code sharing, embeddable widget, JSON API",
        "10 languages, 3 themes, no login required",
      ],
    },
    {
      "@type": "FAQPage", "@id": `${SITE_URL}/#faq`,
      mainEntity: [
        { "@type": "Question", name: "What is Team Vacation Planner?", acceptedAnswer: { "@type": "Answer", text: "A free web app that helps teams of up to 25 people plan and coordinate vacations with public holidays for 55 countries. No login required." }},
        { "@type": "Question", name: "How many countries are supported?", acceptedAnswer: { "@type": "Answer", text: "55 countries across Europe, Middle East, South America, Africa, and more. Holidays computed algorithmically for 2026–2035." }},
        { "@type": "Question", name: "Do I need an account?", acceptedAnswer: { "@type": "Answer", text: "No. Create a team, get a shareable link, and anyone with that link can join. Zero accounts, zero passwords." }},
        { "@type": "Question", name: "Is it free?", acceptedAnswer: { "@type": "Answer", text: "Yes, completely free with no premium tiers, no ads, and no hidden costs." }},
      ],
    },
    { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: DESCRIPTION, publisher: { "@id": `${SITE_URL}/#org` }, inLanguage: ["en","fr","de","es","pt","ro","hu","sv","it","bg"] },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
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
