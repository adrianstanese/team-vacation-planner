// Paste-a-list / CSV import, as a plan shown before anything changes.
// One line per person or per period:   Name [, Country] [, Start] [, End]
//   Ana Pop                      → add Ana (no country yet)
//   Ana Pop, RO                  → add Ana in Romania (code or English name: "Romania")
//   Ana Pop, RO, 2027-07-05, 2027-07-09   → add (or find) Ana and book those days
// Separators: comma, semicolon or tab. A header line ("Name, Country, Start, End") is skipped.
// Dates: 2027-07-05, 05.07.2027 or 05/07/2027 (day first). Existing people are matched by name
// (case and accents ignored) and get the new days added; nobody is ever duplicated or removed.

export type Country = { c: string; n: string };
export type ExistingMember = { id: string; name?: string; country?: string | null; days?: string[] };
export type PlanRow = { line: number; name: string; country: string | null; days: string[]; action: "add" | "update" | "skip"; note?: string };
export type ImportPlan = { rows: PlanRow[]; adds: { name: string; country: string | null; days: string[] }[]; updates: Record<string, { days: string[]; country?: string }>; skipped: number };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const pad = (n: number) => String(n).padStart(2, "0");

export function parseDate(s: string): string | null {
  const t = s.trim().replace(/^"|"$/g, "");
  let y: number, m: number, d: number;
  let mm = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (mm) { y = +mm[1]; m = +mm[2]; d = +mm[3]; }
  else if ((mm = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/))) { d = +mm[1]; m = +mm[2]; y = +mm[3]; }
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

function rangeDays(a: string, b: string, sevenDay: boolean): string[] {
  const out: string[] = [];
  const s = Date.parse(a + "T12:00:00Z"), e = Date.parse(b + "T12:00:00Z");
  if (!(e >= s) || (e - s) / 864e5 > 366) return out;
  for (let t = s; t <= e; t += 864e5) {
    const d = new Date(t); const wd = d.getUTCDay();
    if (!sevenDay && (wd === 0 || wd === 6)) continue;
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function planImport(text: string, existing: ExistingMember[], countries: Country[], opts: { sevenDay?: boolean; max?: number } = {}): ImportPlan {
  const max = opts.max ?? 50;
  const byCode = new Map(countries.map(c => [c.c.toUpperCase(), c.c]));
  const byName = new Map(countries.map(c => [fold(c.n), c.c]));
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
    if (i === 0 && /^name$|^nume$|^nom$|^nombre$|^nome$|^név$|^namn$|^име$/i.test(fold(name))) return; // header
    if (!name) return;
    let country: string | null = null, start: string | null = null, end: string | null = null, note = "";
    for (const p of parts.slice(1)) {
      if (!p) continue;
      const d = parseDate(p);
      if (d) { if (!start) start = d; else if (!end) end = d; continue; }
      const c = toCountry(p);
      if (c && !country) { country = c; continue; }
      note = note || `Not understood: "${p.slice(0, 20)}"`;
    }
    const days = start ? rangeDays(start, end || start, !!opts.sevenDay) : [];
    if (start && end && end < start) note = note || "End date is before start date";
    const key = fold(name);
    const ex = known.get(key);
    if (ex) {
      const u = (updates[ex.id] ||= { days: new Set() });
      const have = new Set(ex.days || []);
      days.forEach(d => { if (!have.has(d)) u.days.add(d); });
      if (country && !ex.country) u.country = country;
      rows.push({ line: i + 1, name: ex.name || name, country: country || ex.country || null, days, action: "update", note: note || undefined });
      return;
    }
    const a = adds.get(key);
    if (a) { days.forEach(d => a.days.add(d)); if (country && !a.country) a.country = country; rows.push({ line: i + 1, name, country: country || a.country, days, action: "add", note: note || undefined }); return; }
    if (existing.length + adds.size >= max) { rows.push({ line: i + 1, name, country, days, action: "skip", note: `The team is full (${max} people)` }); return; }
    adds.set(key, { name, country, days: new Set(days) });
    rows.push({ line: i + 1, name, country, days, action: "add", note: note || undefined });
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
