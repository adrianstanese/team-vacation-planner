// Where the template pages live, per language. Tiny on purpose: the planner's front page links to them, and the
// page texts themselves (lib/templateText) must not travel with the planner.

/** The year the template pages are written for (titles, default pick). Updated once a year, in the autumn. */
export const TEMPLATE_YEAR = 2027;

export const TEMPLATE_PATH: Record<string, string> = {
  en: "/leave-planner-template",
  ro: "/ro/model-programare-concedii",
};
/** The last part of a language's template address ("model-programare-concedii"); English has its own folder. */
export const templateSlug = (lang: string): string | null => (lang !== "en" && TEMPLATE_PATH[lang] ? TEMPLATE_PATH[lang].split("/").pop() || null : null);

/** The words of the link from the planner's front page. */
export const TEMPLATE_LINK: Record<string, string> = {
  en: "Leave planner {y} template (Excel, PDF)",
  ro: "Model programare concedii {y} (Excel, PDF)",
};
