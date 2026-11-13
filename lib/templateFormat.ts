// How the template pages write dates. Used by the server for the first HTML and by the browser after a pick.
// Kept free of the holiday data so the page's own script stays small.
export type HolRow = { date: string; label: string; day: string; name: string; en: string; weekend: boolean };

export const tplLocale = (lang: string): string => (lang === "en" ? "en-GB" : lang);
const at = (date: string) => new Date(date + "T12:00:00Z");
const fmt = (lang: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tplLocale(lang), { ...options, timeZone: "UTC" });

/** "1 January" */
export const fmtDate = (date: string, lang: string): string => fmt(lang, { day: "numeric", month: "long" }).format(at(date));
/** "Friday" */
export const fmtWeekday = (date: string, lang: string): string => fmt(lang, { weekday: "long" }).format(at(date));
/** "Friday 8 January": the form used inside sentences */
export const fmtFull = (date: string, lang: string): string => fmt(lang, { weekday: "long", day: "numeric", month: "long" }).format(at(date));

export function toRow(date: string, name: string, en: string, lang: string): HolRow {
  const w = at(date).getUTCDay();
  return { date, label: fmtDate(date, lang), day: fmtWeekday(date, lang), name, en, weekend: w === 0 || w === 6 };
}

/** One "take these days, be away that long" sentence. */
export function breakLine(b: { take: string[]; from: string; to: string; length: number }, lang: string, line: string, and: string): string {
  const days = b.take.map(d => fmtFull(d, lang));
  const list = days.length > 1 ? `${days.slice(0, -1).join(", ")} ${and} ${days[days.length - 1]}` : days[0];
  return line.split("{days}").join(list).split("{len}").join(String(b.length)).split("{from}").join(fmtFull(b.from, lang)).split("{to}").join(fmtFull(b.to, lang));
}

/** The 12 month names of a language. */
export const monthNames = (lang: string): string[] => Array.from({ length: 12 }, (_, m) => fmt(lang, { month: "long" }).format(new Date(Date.UTC(2024, m, 1, 12))));
/** The 7 weekday names of a language, Monday first. */
export const weekdayNames = (lang: string, width: "short" | "long"): string[] => Array.from({ length: 7 }, (_, i) => fmt(lang, { weekday: width }).format(new Date(Date.UTC(2024, 0, 1 + i, 12))));

/** Fills the {placeholders} of a text. */
export function fill(text: string, vars: Record<string, string | number>): string {
  let s = text || "";
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
