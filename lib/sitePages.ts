// The site's ready-made pages besides the planner's own front page: where each one lives, per language, and the
// words of the links to it. Tiny on purpose: the planner's front page links to these pages, and the pages' own
// texts must not travel with the planner.
//   template = the leave planner template (Excel, PDF)
//   about    = who runs the site, where the public holiday data comes from, what was checked, what is missing
//   embed    = how to show a team's calendar inside Notion, Microsoft Teams and SharePoint (English only)
// A page exists in a language only when that language has an address here. A language gets its own folder under
// app/[lang], named after the last part of its address (Romanian "about": app/[lang]/despre).
import { indexable } from "./langs";

export type SitePage = "template" | "about" | "embed";

export const SITE_PAGES: Record<SitePage, Record<string, string>> = {
  template: { en: "/leave-planner-template", ro: "/ro/model-programare-concedii" },
  about: { en: "/about", ro: "/ro/despre" },
  embed: { en: "/embed-vacation-calendar" },
};

/** The words of the link to each page, from the planner's front page and from the other pages' footers. */
export const PAGE_LINK: Record<SitePage, Record<string, string>> = {
  template: { en: "Leave planner {y} template (Excel, PDF)", ro: "Model programare concedii {y} (Excel, PDF)" },
  about: { en: "Where the holiday data comes from", ro: "De unde vin sărbătorile legale" },
  embed: { en: "Embed the calendar in Notion, Teams or SharePoint" },
};

/** The page's address in that language, or null when the page is not written in it. */
export const pagePath = (page: SitePage, lang: string): string | null => SITE_PAGES[page][lang] || null;

/** The last part of the address for a language living under /<code> ("despre"); null for English and unknown. */
export const pageSlug = (page: SitePage, lang: string): string | null => {
  const p = lang !== "en" ? pagePath(page, lang) : null;
  return p ? p.split("/").pop() || null : null;
};

/** rel for a link to the page: a page that search engines are asked to leave out is linked with "nofollow". */
export const pageRel = (page: SitePage, lang: string): "nofollow" | undefined => (indexable(lang, page) ? undefined : "nofollow");
/** The same for a link to the planner's front page in that language. */
export const homeRel = (lang: string): "nofollow" | undefined => (indexable(lang) ? undefined : "nofollow");
