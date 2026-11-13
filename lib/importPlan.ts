// Paste-a-list / CSV import, as a plan shown before anything changes.
// One line per person or per period:   Name [, Country] [, Start] [, End]
//   Ana Pop                      → add Ana (no country yet)
//   Ana Pop, RO                  → add Ana in Romania (code, or the name in English or the screen's language)
//   Ana Pop, RO, 2027-07-05, 2027-07-09   → add (or find) Ana and book those days
// Separators: comma, semicolon or tab. A header line ("Name, Country, Start, End") is skipped.
// Dates: 2027-07-05, 05.07.2027 or 05/07/2027. Slash dates are read day first, unless the list itself shows it is
// written month first (a "07/25/2027" somewhere in it): see monthFirst(). Each row reports the period it understood,
// so the preview can show it. Existing people are matched by name (case and accents ignored) and get the new days
// added; nobody is ever duplicated or removed. In a Mon–Fri team a period skips weekends and, when the caller
// supplies them, the person's public holidays (the calendar does the same when days are dragged).

export type Country = { c: string; n: string; ne?: string };
export type ExistingMember = { id: string; name?: string; country?: string | null; region?: string | null; days?: string[] };
export type PlanRow = { line: number; name: string; country: string | null; days: string[]; action: "add" | "update" | "skip"; note?: string; from?: string; to?: string };
export type HolidaysOf = (m: { country: string | null; region?: string | null }, year: number) => string[];
export type ImportPlan = { rows: PlanRow[]; adds: { name: string; country: string | null; days: string[] }[]; updates: Record<string, { days: string[]; country?: string }>; skipped: number };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const pad = (n: number) => String(n).padStart(2, "0");

// 05/07/2027 is 5 July in most of the world and May 7 in the United States. The list usually settles it: a first
// number above 12 can only be a day, and so can a second number above 12. Day first unless the list proves otherwise.
export function monthFirst(text: string): boolean {
  let dayFirst = false, monFirst = false;
  for (const m of text.matchAll(/(?<![\d/])(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d/])/g)) { if (+m[1] > 12) dayFirst = true; if (+m[2] > 12) monFirst = true; }
  return monFirst && !dayFirst;
}

export function parseDate(s: string, usOrder = false): string | null {
  const t = s.trim().replace(/^"|"$/g, "");
  let y: number, m: number, d: number;
  let mm = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (mm) { y = +mm[1]; m = +mm[2]; d = +mm[3]; }
  else if ((mm = t.match(/^(\d{1,2})([./])(\d{1,2})[./](\d{4})$/))) {
    d = +mm[1]; m = +mm[3]; y = +mm[4];
    if (usOrder && mm[2] === "/") { const x = d; d = m; m = x; }
  }
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function splitLine(line: string): string[] {
  const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
  const out: string[] = []; let cur = ""; let q = false;
  for (const ch of line) {
    if (ch === '"') { q = !q; continue; }
    if (ch === sep && !q) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const MAX_SPAN = 366; // days: a longer period is a typing mistake (wrong year), not a holiday

function rangeDays(a: string, b: string, sevenDay: boolean, isHoliday: ((day: string) => boolean) | null): string[] {
  const out: string[] = [];
  const s = Date.parse(a + "T12:00:00Z"), e = Date.parse(b + "T12:00:00Z");
  if (!(e >= s) || (e - s) / 864e5 > MAX_SPAN) return out;
  for (let t = s; t <= e; t += 864e5) {
    const d = new Date(t); const wd = d.getUTCDay();
    if (!sevenDay && (wd === 0 || wd === 6)) continue;
    const key = d.toISOString().slice(0, 10);
    if (!sevenDay && isHoliday && isHoliday(key)) continue;
    out.push(key);
  }
  return out;
}

// First cell of a header line, in the planner's languages
const HEADER = /^(name|full name|employee|nume|nom|nombre|nome|nev|namn|име|имя|фио|الاسم|اسم|नाम|নাম|نام|名前|氏名|姓名|名字)$/;

export function planImport(text: string, existing: ExistingMember[], countries: Country[], opts: { sevenDay?: boolean; max?: number; holidaysOf?: HolidaysOf } = {}): ImportPlan {
  const max = opts.max ?? 50;
  text = text.replace(/^\uFEFF/, ""); // files saved by Excel start with an invisible mark that became part of the first name
  const usOrder = monthFirst(text);
  const byCode = new Map(countries.map(c => [c.c.toUpperCase(), c.c]));
  // The name in the screen's language and, always, the English one (c.ne): "Germany" works on a German screen too
  const byName = new Map<string, string>();
  for (const c of countries) { byName.set(fold(c.n), c.c); if (c.ne) byName.set(fold(c.ne), c.c); }
  // A person's public holidays per year, looked up once
  const holCache = new Map<string, Set<string>>();
  const holidayCheck = (who: { country: string | null; region?: string | null }) => {
    const get = opts.holidaysOf;
    if (!get || !who.country) return null;
    return (day: string) => {
      const y = +day.slice(0, 4), k = who.country + "|" + (who.region || "") + "|" + y;
      let set = holCache.get(k);
      if (!set) { let list: string[] = []; try { list = get(who, y) || []; } catch { /* no data for that country or year */ } set = new Set(list); holCache.set(k, set); }
      return set.has(day);
    };
  };
  const toCountry = (v: string) => { const t = v.trim(); if (!t) return null; return byCode.get(t.toUpperCase()) || byName.get(fold(t)) || null; };
  const known = new Map(existing.map(m => [fold(m.name || ""), m]));
  const adds = new Map<string, { name: string; country: string | null; days: Set<string> }>();
  const updates: Record<string, { days: Set<string>; country?: string }> = {};
  const rows: PlanRow[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = splitLine(line);
    const name = (parts[0] || "").slice(0, 30).trim();
    if (i === 0 && HEADER.test(fold(name))) return; // header
    if (!name) return;
    let country: string | null = null, start: string | null = null, end: string | null = null, note = "";
    // A line that shows its own order (a 25 in one of the two places) decides for itself; the rest follow the list
    const rowText = parts.slice(1).join(" ");
    const rowUs = monthFirst(rowText), rowDayFirst = !rowUs && /(?<![\d/])(1[3-9]|2\d|3[01])\/\d{1,2}\/\d{4}(?![\d/])/.test(rowText);
    const us = rowUs ? true : rowDayFirst ? false : usOrder;
    for (const p of parts.slice(1)) {
      if (!p) continue;
      const d = parseDate(p, us);
      if (d) { if (!start) start = d; else if (!end) end = d; continue; }
      const c = toCountry(p);
      if (c && !country) { country = c; continue; }
      note = note || `Not understood: "${p.slice(0, 20)}"`;
    }
    const key = fold(name);
    const ex = known.get(key);
    const prior = adds.get(key);
    const who = ex ? { country: ex.country || country, region: ex.region || null } : { country: country || (prior ? prior.country : null) };
    const days = start ? rangeDays(start, end || start, !!opts.sevenDay, holidayCheck(who)) : [];
    if (start && end && end < start) note = note || "End date is before start date";
    else if (start && end && (Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / 864e5 > MAX_SPAN) note = note || "Period longer than a year: check the dates";
    // Over a month in one go is rare, and it is what a day/month mix-up looks like (2 Jan to 2 May for 1–5 Feb)
    else if (start && end && (Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / 864e5 > 31) note = note || "Long period: check the dates";
    const span = start ? { from: start, to: end && end >= start ? end : start } : {};
    if (ex) {
      const u = (updates[ex.id] ||= { days: new Set() });
      const have = new Set(ex.days || []);
      days.forEach(d => { if (!have.has(d)) u.days.add(d); });
      if (country && !ex.country) u.country = country;
      rows.push({ line: i + 1, name: ex.name || name, country: country || ex.country || null, days, action: "update", note: note || undefined, ...span });
      return;
    }
    const a = prior;
    if (a) { days.forEach(d => a.days.add(d)); if (country && !a.country) a.country = country; rows.push({ line: i + 1, name, country: country || a.country, days, action: "add", note: note || undefined, ...span }); return; }
    if (existing.length + adds.size >= max) { rows.push({ line: i + 1, name, country, days, action: "skip", note: `The team is full (${max} people)` }); return; }
    adds.set(key, { name, country, days: new Set(days) });
    rows.push({ line: i + 1, name, country, days, action: "add", note: note || undefined, ...span });
  });
  const outUpdates: ImportPlan["updates"] = {};
  for (const [id, u] of Object.entries(updates)) if (u.days.size || u.country) outUpdates[id] = { days: [...u.days].sort(), ...(u.country ? { country: u.country } : {}) };
  return {
    rows,
    adds: [...adds.values()].map(a => ({ name: a.name, country: a.country, days: [...a.days].sort() })),
    updates: outUpdates,
    skipped: rows.filter(r => r.action === "skip").length,
  };
}
