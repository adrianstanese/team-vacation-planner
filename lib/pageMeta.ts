// What a ready-made page tells search engines and link previews: title, description, its own address, whether it may
// be indexed (lib/langs keeps that switch, per language and per page), and its other language versions.
import type { Metadata } from "next";
import { indexable } from "./langs";
import { SITE_PAGES, type SitePage } from "./sitePages";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "./site";

export function pageMetadata(page: SitePage, lang: string, title: string, description: string): Metadata {
  const paths = SITE_PAGES[page];
  const url = SITE_URL + paths[lang];
  const open = indexable(lang, page);
  // The language versions name each other to search engines only once they are all open to them
  const langs = Object.keys(paths);
  const allOpen = langs.length > 1 && langs.every(l => indexable(l, page));
  return {
    title, description,
    robots: open
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 } }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    alternates: {
      canonical: url,
      ...(allOpen ? { languages: { ...Object.fromEntries(langs.map(l => [l, SITE_URL + paths[l]])), "x-default": SITE_URL + paths.en } } : {}),
    },
    openGraph: { type: "website", url, siteName: SITE_NAME, title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME, type: "image/png" }] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}
