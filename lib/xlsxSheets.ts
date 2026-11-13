// Builds the three sheets (Dashboard, Calendar, Timeline) of the Excel export as plain data for write-excel-file.
// Pure: no DOM, no I/O, so it runs in the browser and in tests.

import { nextLeaveDay } from "./v3Util";

type Member = { id: string; name?: string; country?: string; days?: unknown[]; half?: unknown[] };
type Cell = { value?: string | number; type?: typeof String | typeof Number; fontWeight?: "bold"; fontSize?: number; textColor?: string; backgroundColor?: string; align?: "left" | "center" | "right"; columnSpan?: number; height?: number; wrap?: boolean } | null;
export type Sheet = { sheet: string; data: Cell[][]; columns: { width: number }[] };

export type XlsxInput = {
  teamName: string; year: number; members: Member[];
  holidays: Set<string>;                     // all public holidays of the team's countries, YYYY-MM-DD
  colors: string[];                           // member colour by list position (same as the app)
  countryName: (cc?: string) => string;
  months: string[]; dayLabels: string[];      // Monday-first
  generated: string;                          // pre-formatted date
  coverage?: number;                          // average coverage in %, worked out by the caller (lib/v3Util avgCoverage)
  sevenDay?: boolean;                         // the team works 7 days a week (weekends are bookable days)
};

const pad = (n: number) => String(n).padStart(2, "0");
const dk = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dim = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const fdm = (y: number, m: number) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };
const isWe = (y: number, m: number, d: number) => { const w = new Date(y, m, d).getDay(); return w === 0 || w === 6; };

const S = { // styles mirror the old .xls export
  title: { fontWeight: "bold", fontSize: 16, textColor: "#1F2937" },
  sub: { fontSize: 11, textColor: "#6B7280" },
  hdr: { fontWeight: "bold", textColor: "#374151", backgroundColor: "#F3F4F6" },
  sect: { fontWeight: "bold", fontSize: 12, textColor: "#374151" },
  stat: { fontWeight: "bold", fontSize: 18, textColor: "#374151", align: "center" },
  lbl: { fontSize: 9, textColor: "#6B7280", align: "center" },
  we: { backgroundColor: "#F9FAFB", textColor: "#9CA3AF", align: "center" },
  hol: { backgroundColor: "#FEE2E2", textColor: "#DC2626", fontWeight: "bold", align: "center" },
  day: { align: "center" },
  dayHdr: { fontWeight: "bold", fontSize: 8, textColor: "#9CA3AF", align: "center" },
  overlap: { backgroundColor: "#FEE2E2", textColor: "#991B1B", fontWeight: "bold" },
} as const;

const str = (value: string, style: object = {}): Cell => ({ value, type: String, ...style });
const num = (value: number, style: object = {}): Cell => ({ value, type: Number, ...style });

export function periods(days: string[], sevenDay = false): string[] {
  // Booked days in a row are one period; on a Monday-to-Friday week a period also runs across the weekend
  const sorted = days.slice().sort();
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]; let end = start;
    while (i + 1 < sorted.length && nextLeaveDay(sorted[i], sorted[i + 1], sevenDay)) { i++; end = sorted[i]; }
    out.push(start === end ? start.slice(5) : `${start.slice(5)} to ${end.slice(5)}`);
  }
  return out;
}

export function buildSheets(x: XlsxInput): Sheet[] {
  const yr = x.year, p = `${yr}-`;
  const ms = x.members.map(m => {
    const days = (m.days || []).filter((d): d is string => typeof d === "string" && d.startsWith(p));
    const half = new Set((m.half || []).filter((d): d is string => typeof d === "string" && d.startsWith(p)));
    return { ...m, days, used: days.reduce((n, d) => n + (half.has(d) ? 0.5 : 1), 0) };
  });
  const color = (i: number) => x.colors.length ? x.colors[i % x.colors.length] : "#3B82F6";
  const who: Record<string, number[]> = {};
  ms.forEach((m, i) => m.days.forEach(d => { (who[d] ||= []).push(i); }));
  const overlaps = Object.keys(who).filter(d => who[d].length >= 2).sort();
  const total = ms.reduce((s, m) => s + m.used, 0);
  const cover = typeof x.coverage === "number" ? x.coverage : Math.round((1 - total / ((ms.length * 260) || 1)) * 100);

  // Dashboard
  const dash: Cell[][] = [
    [str(x.teamName, { ...S.title, height: 24 })],
    [str(`${yr} | ${ms.length} members | Generated ${x.generated}`, S.sub)],
    [],
    [num(total, S.stat), num(overlaps.length, { ...S.stat, textColor: "#EF4444" }), num(ms.length, S.stat), str(`${cover}%`, { ...S.stat, textColor: "#10B981" })],
    [str("Total vacation days", S.lbl), str("Overlap days", S.lbl), str("Team members", S.lbl), str("Avg coverage", S.lbl)],
    [],
    [str("Member summary", { ...S.sect, columnSpan: 4 }), null, null, null],
    [str("Member", S.hdr), str("Country", S.hdr), str("Days", S.hdr), str("Periods", S.hdr)],
    ...ms.map(m => [str(m.name || "", { fontWeight: "bold" }), str(x.countryName(m.country)), num(m.used), str(periods(m.days, !!x.sevenDay).join(", "))]),
  ];
  if (overlaps.length) {
    dash.push([], [str(`Overlap days (${overlaps.length})`, { ...S.sect, columnSpan: 2 }), null], [str("Date", S.hdr), str("Members out", S.hdr)]);
    overlaps.forEach(d => dash.push([str(d, S.overlap), str(who[d].map(i => ms[i].name || "").join(", "))]));
  }

  // Calendar: one "Team" row per week, cell coloured by who is away
  const cal: Cell[][] = [];
  for (let mo = 0; mo < 12; mo++) {
    cal.push([str(`${x.months[mo]} ${yr}`, { ...S.sect, height: 18 })]);
    cal.push([null, ...x.dayLabels.map(l => str(l, S.dayHdr))]);
    const cells: (number | null)[] = Array(fdm(yr, mo)).fill(null);
    for (let d = 1; d <= dim(yr, mo); d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    for (let w = 0; w < cells.length; w += 7) {
      cal.push([str("Team", { fontWeight: "bold" }), ...cells.slice(w, w + 7).map(d => {
        if (!d) return null;
        const key = dk(yr, mo, d), away = who[key] || [];
        let st: object = S.day;
        if (isWe(yr, mo, d)) st = S.we;
        if (x.holidays.has(key)) st = S.hol;
        if (away.length === 1) st = { backgroundColor: color(away[0]), textColor: "#FFFFFF", fontWeight: "bold", align: "center" };
        else if (away.length >= 2) st = { ...S.overlap, align: "center" };
        return num(d, st);
      })]);
    }
    cal.push([]);
  }

  // Timeline: months with any vacation, one row per member, V on vacation days
  const tl: Cell[][] = [];
  for (let mo = 0; mo < 12; mo++) {
    const pre = `${yr}-${pad(mo + 1)}-`;
    if (!ms.some(m => m.days.some(d => d.startsWith(pre)))) continue;
    const n = dim(yr, mo);
    tl.push([str(x.months[mo], { ...S.sect, height: 16 })]);
    tl.push([str("Name", S.dayHdr), ...Array.from({ length: n }, (_, i) => num(i + 1, S.dayHdr))]);
    ms.forEach((m, i) => {
      const set = new Set(m.days);
      tl.push([str(m.name || "", { fontWeight: "bold" }), ...Array.from({ length: n }, (_, k) => {
        const key = dk(yr, mo, k + 1);
        if (set.has(key)) return str("V", { backgroundColor: color(i), textColor: "#FFFFFF", fontWeight: "bold", align: "center" });
        if (x.holidays.has(key)) return str("", S.hol);
        if (isWe(yr, mo, k + 1)) return str("", S.we);
        return null;
      })]);
    });
    tl.push([]);
  }
  if (!tl.length) tl.push([str("No vacation days planned for this year yet.", S.sub)]);

  return [
    { sheet: "Dashboard", data: dash, columns: [{ width: 22 }, { width: 16 }, { width: 14 }, { width: 60 }] },
    { sheet: "Calendar", data: cal, columns: [{ width: 12 }, ...Array(7).fill({ width: 5 })] },
    { sheet: "Timeline", data: tl, columns: [{ width: 16 }, ...Array(31).fill({ width: 3 })] },
  ];
}
