import "../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { display, body } from "../fonts";
import { SITE_URL, SITE_NAME, OG_IMAGE, VIEWPORT } from "@/lib/site";
import { SITE_LANGS, isSiteLang, langDir, indexable } from "@/lib/langs";
import { LANG_META } from "@/lib/langMeta";
import { pageText } from "@/lib/pageText";

// Root layout of every language except English: /fr, /de, /ro and so on (English is the root, app/(en)).
// Each address is built once, when the site is published, and served as a ready-made page: nothing is rendered or
// refreshed on the server afterwards. An address that is not one of the planner's languages is "not found".
export const dynamicParams = false;
export function generateStaticParams() {
  return SITE_LANGS.filter(l => l !== "en").map(lang => ({ lang }));
}

export const viewport: Viewport = VIEWPORT;

type Props = { params: Promise<{ lang: string }> };

const OG_LOCALE: Record<string, string> = { fr: "fr_FR", de: "de_DE", es: "es_ES", pt: "pt_PT", ro: "ro_RO", hu: "hu_HU", sv: "sv_SE", it: "it_IT", bg: "bg_BG", ar: "ar_AR" };
const ogLocale = (lang: string) => OG_LOCALE[lang] || (LANG_META[lang]?.locale || lang).replace("-", "_");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isSiteLang(lang) || lang === "en") return {};
  const title = pageText(lang, "title"), description = pageText(lang, "desc");
  const url = `${SITE_URL}/${lang}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s | Team Vacation Planner" },
    description,
    authors: [{ name: SITE_NAME }],
    // A language is open to search engines only once it is on the reviewed list (lib/langs). Until then the page
    // works for people and asks search engines to leave it out, while still following its links.
    robots: indexable(lang)
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 } }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      type: "website", locale: ogLocale(lang), url, siteName: SITE_NAME, title, description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME, type: "image/png" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
    alternates: { canonical: url },
    category: "Productivity",
  };
}

export default async function LangLayout({ children, params }: { children: React.ReactNode } & Props) {
  const { lang } = await params;
  if (!isSiteLang(lang) || lang === "en") notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication", "@id": `${SITE_URL}/#app`,
        name: SITE_NAME, url: `${SITE_URL}/${lang}`, inLanguage: lang, description: pageText(lang, "desc"),
        applicationCategory: "BusinessApplication", operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL },
    ],
  };
  return (
    <html lang={lang} dir={langDir(lang)} className={`${display.variable} ${body.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
