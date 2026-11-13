// Data behind the template pages: the public holidays of one country (and region) in one year, the working days
// worth taking off around them, and what the data does not know about a country. Pure functions on the planner's
// own holiday data, so the server (first HTML) and the browser (after a pick) work out exactly the same lists.
import { nationalDates, regionalDates, HD, HDR, RN, DEF, DATA_YEARS } from "./holidayDates";
import { findBridges } from "./bridges";

export const TEMPLATE_YEARS: number[] = Array.from({ length: DATA_YEARS.to - DATA_YEARS.from + 1 }, (_, i) => DATA_YEARS.from + i);
export const TEMPLATE_COUNTRIES: string[] = Object.keys(HD);

/** Regions of a country that have their own holiday dates in the data: [code, name], by name. */
export function regionsOf(cc: string): [string, string][] {
  const names = RN[cc] || {}, dates = HDR[cc] || {};
  return Object.keys(names).filter(code => !!dates[code]).map(code => [code, names[code]] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], "en"));
}
/** The region a country falls back to when none is picked ("" when national holidays stand on their own). */
export const defaultRegion = (cc: string): string => (DEF[cc] && regionsOf(cc).some(r => r[0] === DEF[cc]) ? DEF[cc] : "");

/** Public holidays (YYYY-MM-DD, sorted) of a country, or of one of its regions, in a year. Empty when not covered. */
export function holidayDates(cc: string, region: string, year: number): string[] {
  const regional = region ? regionalDates(cc, region, year) : null;
  return (regional || nationalDates(cc, year) || []).slice();
}

// One row of a country's holiday-name file (public/hn/<cc>.json): [local name, English name or null, type, regions?]
export type NameRow = [string, string | null, string, string[]?];
export type NameFile = { h?: Record<string, NameRow[]> } | null;
/** The name of the holiday on a date: the row for the picked region if there is one, else the national row. */
export function holidayName(file: NameFile, date: string, region: string): { name: string; en: string } {
  const rows = (file && file.h && file.h[date]) || [];
  const row = rows.find(r => Array.isArray(r[3]) && !!region && r[3].includes(region)) || rows.find(r => !r[3]) || rows[0];
  if (!row) return { name: "", en: "" };
  return { name: row[0] || "", en: row[1] && row[1] !== row[0] ? row[1] : "" };
}

export type Break = { take: string[]; from: string; to: string; length: number };
/** Working days that join a public holiday to a weekend (one or two days of leave), best first. */
export function bestBreaks(holidays: string[], year: number, limit = 6): Break[] {
  return findBridges({ year, holidays, maxTake: 2, limit }).map(b => ({ take: b.take, from: b.from, to: b.to, length: b.length }));
}

/** How many of the dates fall on Monday to Friday. */
export const onWeekdays = (dates: string[]): number => dates.filter(d => { const w = new Date(d + "T12:00:00Z").getUTCDay(); return w !== 0 && w !== 6; }).length;

// What the data does not know about a country. Shown next to the files, so nobody trusts a count that cannot be right.
//   moved   = the government moves working days to build long weekends; those swaps are not in the data
//   states  = only nationwide holidays; the states' own holidays are missing
//   partial = some regions are missing
//   moon    = some holidays follow the lunar calendar and are confirmed shortly before the day
export type Gap = "moved" | "states" | "partial" | "moon";
export const DATA_GAPS: Record<string, Gap> = {
  HU: "moved", RU: "moved", KZ: "moved", BY: "moved", CN: "moved",
  US: "states", IN: "partial",
  AE: "moon", SA: "moon", BH: "moon", PK: "moon", BD: "moon", MA: "moon",
};
/** Counting "days off in a row" is only honest where working days are not moved around by decree. */
export const breaksReliable = (cc: string): boolean => DATA_GAPS[cc] !== "moved";
