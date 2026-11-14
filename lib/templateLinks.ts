// Where the template pages live, per language. Tiny on purpose: the planner's front page links to them, and the
// page texts themselves (lib/templateText) must not travel with the planner. The addresses themselves are kept with
// the site's other ready-made pages in lib/sitePages.
import { SITE_PAGES, PAGE_LINK, pageSlug } from "./sitePages";

/** The year the template pages are written for (titles, default pick). Updated once a year, in the autumn. */
export const TEMPLATE_YEAR = 2027;

export const TEMPLATE_PATH: Record<string, string> = SITE_PAGES.template;
/** The last part of a language's template address ("model-programare-concedii"); English has its own folder. */
export const templateSlug = (lang: string): string | null => pageSlug("template", lang);

/** The words of the link from the planner's front page. */
export const TEMPLATE_LINK: Record<string, string> = PAGE_LINK.template;
