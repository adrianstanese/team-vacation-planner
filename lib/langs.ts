// The planner's languages and their addresses. Small on purpose: the server (page headers) and the browser both
// read it, so it holds no texts.
import { LANG_META } from "./langMeta";

/** Languages written in the source files; the others come from i18n/<code>.json (lib/langMeta.ts is generated). */
export const SOURCE_LANGS = ["en", "fr", "de", "es", "pt", "ro", "hu", "sv", "it", "bg", "ar"];
export const SITE_LANGS: string[] = [...SOURCE_LANGS, ...Object.keys(LANG_META).filter(c => !SOURCE_LANGS.includes(c))];
export const isSiteLang = (lang: unknown): lang is string => typeof lang === "string" && SITE_LANGS.includes(lang);

/** Text direction of a language. */
export const langDir = (lang: string): "ltr" | "rtl" => (lang === "ar" || LANG_META[lang]?.dir === "rtl" ? "rtl" : "ltr");

/** The locale that names and sorts countries for a language. English is British, and the planner's Portuguese is
 *  European: plain "pt" gives the Brazilian names (Romênia, Polônia) next to texts that say "equipa" and "férias". */
export const nameLocale = (lang: string): string => (lang === "en" ? "en-GB" : lang === "pt" ? "pt-PT" : lang);

/** The front-page address of a language. English lives at the root: there is no /en. */
export const langPath = (lang: string): string => (lang !== "en" && isSiteLang(lang) ? "/" + lang : "/");

/** The language an address names: "/de" gives "de". The root names none (null): there the browser decides. */
export function pathLang(pathname: string | null | undefined): string | null {
  const m = /^\/([a-z]{2})\/?$/.exec(pathname || "");
  return m && m[1] !== "en" && isSiteLang(m[1]) ? m[1] : null;
}

/** True for the addresses the planner itself runs at ("/" and "/<language>"), false for any other page. */
export const isPlannerPath = (pathname: string | null | undefined): boolean => (pathname || "/") === "/" || pathLang(pathname) !== null;

/** The first language of the browser's list that the planner speaks ("pt-BR" gives "pt", "zh-Hant-TW" gives "zh"). */
export function browserLang(list: readonly string[] | null | undefined): string | null {
  for (const tag of list || []) {
    const code = String(tag || "").toLowerCase().split(/[-_]/)[0];
    if (isSiteLang(code)) return code;
  }
  return null;
}

/** Which language a visit shows, in this order: a language named in the link's query (?lang=), the person's own
 *  earlier choice, the language of the address (/de), the browser's languages, English. */
export function pickLang(o: { query?: string | null; saved?: string | null; pathname?: string | null; browser?: readonly string[] | null }): string {
  const q = (o.query || "").toLowerCase();
  if (isSiteLang(q)) return q;
  if (isSiteLang(o.saved)) return o.saved;
  return pathLang(o.pathname) || browserLang(o.browser) || "en";
}

/** The same address in another language, keeping what follows it (?team=…, #team=…) and dropping a used ?lang=. */
export function withLang(lang: string, loc: { pathname: string; search: string; hash: string }): string {
  const strip = (s: string, lead: string) => {
    const rest = s.replace(/^[?#]/, "").split("&").filter(p => p && !/^lang=/i.test(p)).join("&");
    return rest ? lead + rest : "";
  };
  return langPath(lang) + strip(loc.search, "?") + strip(loc.hash, "#");
}

// Languages whose pages search engines may index. A language is added here only after a native speaker has read its
// texts; until then its address works for people and asks search engines to leave it out. Unreviewed translations
// in a search index do a site more harm than good.
// The list is kept per page as well: a new page ships closed and is opened here once it has been checked.
//   home     = the planner's front page in that language
//   template = the leave planner template page
//   about    = the About page (what the planner is, where the holiday data comes from)
//   embed    = the page on showing a team's calendar inside Notion, Teams and SharePoint (English only)
// The pages' addresses are in lib/sitePages.
const OPEN_PAGES: Record<string, readonly string[]> = { en: ["home"] };
export const INDEXED_LANGS: ReadonlySet<string> = new Set(Object.keys(OPEN_PAGES).filter(l => OPEN_PAGES[l].includes("home")));
export const indexable = (lang: string, page = "home"): boolean => !!OPEN_PAGES[lang] && OPEN_PAGES[lang].includes(page);
