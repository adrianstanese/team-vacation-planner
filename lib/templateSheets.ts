// Builds the empty leave planner for a year as plain sheet data for write-excel-file: a working file, not a picture.
//   Team      names, allowance, days carried over; days taken and days left are formulas
//   Plan      every month of the year; weekends and public holidays shaded; a typed day turns green and is counted
//   Holidays  the public holidays of the country and region picked on the page
//   How to use
// The Romanian file adds "Programare CO", the leave schedule table employers print and have signed.
// Pure: no DOM, no I/O, so it runs in the browser and in tests.
import { tpl } from "./templateText";

type Cell = Record<string, unknown> | null;
export type TplHoliday = { date: string; name: string; en: string };
export type TplInput = {
  lang: string; year: number;
  place: string;                 // country, with the region when one was picked: "United Kingdom · Scotland"
  holidays: TplHoliday[];        // sorted by date
  rows: number;                  // people in the team
  months: string[];              // 12 month names in the page language
  weekdays: string[];            // 7 short weekday names, Monday first
  weekdayNames: string[];        // 7 full weekday names, Monday first
  notes: string[];               // what to know about the dates (printed under the holiday list)
};
export type TplSheet = { sheet: string; data: Cell[][]; columns: { width: number }[]; [option: string]: unknown };

const INK = "#1F2937", MUTED = "#6B7280", LINE = "#D1D5DB";
const C = { weekend: "#F3F4F6", holiday: "#FED7AA", none: "#E5E7EB", leave: "#86EFAC", head: "#EDE9FE" };
const str = (value: string, style: object = {}): Cell => ({ value, type: String, ...style });
const num = (value: number, style: object = {}): Cell => ({ value, type: Number, ...style });
// A formula is stored in the file without its leading "=" (that is how the file format wants it; Excel itself is
// strict about it). They are written here the way people type them, and the sign is dropped on the way in.
const bare = (formula: string) => formula.replace(/^=/, "");
const fx = (formula: string, style: object = {}): Cell => ({ value: bare(formula), type: "Formula", ...style });
const box = { borderColor: LINE, borderStyle: "thin" };

/** Column letter(s) of a 1-based column number: 1 is A, 27 is AA. */
export function colName(n: number): string {
  let s = "";
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
const dim = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const dow = (y: number, m: number, d: number) => (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7; // Monday = 0
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
/** A sheet name as it must be written inside a formula. */
const ref = (sheet: string) => `'${sheet.replace(/'/g, "''")}'`;

// Layout of the Plan sheet: columns A (number), B (name), C..AG (days 1 to 31), AH (days counted)
const DAY0 = 3, DAYN = 33, TOTAL = 34;
const TEAM_FIRST = 5;   // first person row on the Team sheet
const PLAN_FIRST = 4;   // first row of the first month block
/** Rows of one month block: header, weekdays, working-day marks, the people, and the month's holidays. */
export const blockHeight = (rows: number) => rows + 4;
/** The row of person `i` (0-based) in month `m` (0-based) on the Plan sheet. */
export const planRow = (rows: number, m: number, i: number) => PLAN_FIRST + m * blockHeight(rows) + 3 + i;

export function buildTemplateSheets(x: TplInput): TplSheet[] {
  const T = (key: string, vars?: Record<string, string | number>) => tpl(x.lang, key, { y: x.year, p: x.year - 1, c: x.place, ...vars });
  const rows = Math.max(1, Math.min(100, Math.round(x.rows) || 10));
  const holByDate = new Map(x.holidays.map(h => [h.date, h]));
  const sTeam = T("sTeam"), sPlan = T("sPlan");
  const title = { fontWeight: "bold", fontSize: 16, textColor: INK };
  const sub = { fontSize: 10, textColor: MUTED };
  const head = { fontWeight: "bold", textColor: INK, backgroundColor: C.head, ...box, wrap: true, alignVertical: "center" };

  // ── Team ──
  const team: Cell[][] = [
    [str(T("fTitle"), title)],
    [str(T("fSub"), sub)],
    [],
    [str(T("cNo"), { ...head, align: "center" }), str(T("cName"), head), str(T("cAllow"), { ...head, align: "center" }), str(T("cCarry"), { ...head, align: "center" }), str(T("cTaken"), { ...head, align: "center" }), str(T("cLeft"), { ...head, align: "center" })],
  ];
  for (let i = 0; i < rows; i++) {
    const r = TEAM_FIRST + i;
    const taken = Array.from({ length: 12 }, (_, m) => `${ref(sPlan)}!${colName(TOTAL)}${planRow(rows, m, i)}`).join("+");
    team.push([
      num(i + 1, { ...box, align: "center", textColor: MUTED }), str("", box), str("", { ...box, align: "center" }), str("", { ...box, align: "center" }),
      fx(`=${taken}`, { ...box, align: "center", fontWeight: "bold" }),
      fx(`=IF(C${r}="","",C${r}+D${r}-E${r})`, { ...box, align: "center", fontWeight: "bold" }),
    ]);
  }
  team.push([], [str(T("fMade"), sub)]);

  // ── Plan ──
  const plan: Cell[][] = [[null, str(T("fTitle") + " · " + x.place, title)], [null, str(T("fLegend"), sub)], []];
  const marks: { cellRange: { from: { row: number; column: number }; to: { row: number; column: number } }; condition: { formula: string }; style: object }[] = [];
  for (let m = 0; m < 12; m++) {
    const r0 = PLAN_FIRST + m * blockHeight(rows), days = dim(x.year, m);
    const kind = (d: number) => (d > days ? "none" : holByDate.has(iso(x.year, m, d)) ? "holiday" : dow(x.year, m, d) >= 5 ? "weekend" : "work");
    const fill = (d: number) => { const k = kind(d); return k === "work" ? {} : { backgroundColor: C[k] }; };
    const each = (make: (d: number) => Cell) => Array.from({ length: 31 }, (_, i) => make(i + 1));
    plan.push([null, str(x.months[m], { fontWeight: "bold", fontSize: 12, textColor: INK }), ...each(d => (d > days ? str("", fill(d)) : num(d, { fontWeight: "bold", fontSize: 9, align: "center", ...box, ...fill(d) }))), str(T("cDays"), { ...head, align: "center", fontSize: 9 })]);
    plan.push([null, null, ...each(d => str(d > days ? "" : x.weekdays[dow(x.year, m, d)], { fontSize: 7, textColor: MUTED, align: "center", ...fill(d) })), null]);
    // 1 marks a working day; the totals count typed cells on those days only
    plan.push([null, str(T("fWork"), { fontSize: 7, textColor: "#9CA3AF", align: "right" }), ...each(d => (d > days ? str("") : num(kind(d) === "work" ? 1 : 0, { fontSize: 6, textColor: "#9CA3AF", align: "center" }))), null]);
    for (let i = 0; i < rows; i++) {
      const R = r0 + 3 + i;
      plan.push([
        num(i + 1, { fontSize: 9, textColor: MUTED, align: "center" }),
        fx(`=IF(${ref(sTeam)}!B${TEAM_FIRST + i}="","",${ref(sTeam)}!B${TEAM_FIRST + i})`, { fontSize: 10, ...box }),
        ...each(d => str("", { align: "center", fontSize: 9, ...box, ...fill(d) })),
        fx(`=SUMPRODUCT((${colName(DAY0)}${R}:${colName(DAYN)}${R}<>"")*(${colName(DAY0)}$${r0 + 2}:${colName(DAYN)}$${r0 + 2}=1))`, { align: "center", fontWeight: "bold", fontSize: 10, ...box }),
      ]);
    }
    const list = x.holidays.filter(h => h.date.startsWith(`${x.year}-${String(m + 1).padStart(2, "0")}-`)).map(h => `${Number(h.date.slice(8))} ${h.name || h.en}`.trim());
    plan.push([null, str(list.length ? `${T("fHols")} ${list.join(" · ")}` : "", { fontSize: 8, textColor: "#B45309", columnSpan: 33 })]);
    marks.push({
      cellRange: { from: { row: r0 + 3, column: DAY0 }, to: { row: r0 + 2 + rows, column: DAYN } },
      condition: { formula: bare(`=AND(${colName(DAY0)}${r0 + 3}<>"",${colName(DAY0)}$${r0 + 2}=1)`) },
      style: { backgroundColor: C.leave, fontWeight: "bold" },
    });
  }

  // ── Holidays ──
  const withEn = x.holidays.some(h => h.en && h.en !== h.name);
  const hol: Cell[][] = [
    [str(T("holTitle"), title)],
    [],
    [str(T("thDate"), head), str(T("thDay"), head), str(T("thName"), head), ...(withEn ? [str(T("thEn"), head)] : [])],
    ...x.holidays.map(h => {
      const [yy, mm, dd] = h.date.split("-").map(Number), wd = dow(yy, mm - 1, dd);
      const off = wd >= 5 ? { textColor: MUTED } : {};
      return [
        { value: new Date(Date.UTC(yy, mm - 1, dd)), type: Date, format: "dd mmm yyyy", align: "left", ...box, ...off },
        str(x.weekdayNames[wd], { ...box, ...off }), str(h.name || h.en, { ...box, ...off, fontWeight: "bold" }),
        ...(withEn ? [str(h.en, { ...box, ...off })] : []),
      ] as Cell[];
    }),
    [],
    ...[T("source"), ...x.notes].map(line => [str(line, { ...sub, wrap: true, columnSpan: withEn ? 4 : 3, alignVertical: "top", height: 30 })] as Cell[]),
    [str(T("fMade"), sub)],
  ];

  // ── How to use ──
  // how5 (fill in the schedule sheet) exists only where the file has that sheet
  const steps = ["how1", "how2", "how3", "how5", "how4"].map(k => tpl(x.lang, k, { y: x.year })).filter(Boolean);
  const how: Cell[][] = [
    [str(T("howTitle"), title)],
    [],
    ...steps.map((line, i) => [str(`${i + 1}. ${line}`, { fontSize: 11, textColor: INK, wrap: true, alignVertical: "top", height: 32 })] as Cell[]),
    [],
    [str(T("fLive"), { fontSize: 11, textColor: "#6D28D9", fontWeight: "bold" })],
    [str(T("fMade"), sub)],
  ];

  const sheets: TplSheet[] = [
    // Widths are chosen so that a sheet prints across one landscape page: all 31 days and the count for the Plan
    { sheet: sTeam, data: team, columns: [{ width: 6 }, { width: 28 }, { width: 16 }, { width: 16 }, { width: 11 }, { width: 11 }], stickyRowsCount: 4, orientation: "landscape" },
    { sheet: sPlan, data: plan, columns: [{ width: 3.5 }, { width: 20 }, ...Array.from({ length: 31 }, () => ({ width: 2.9 })), { width: 5.5 }], stickyColumnsCount: 2, orientation: "landscape", conditionalFormatting: marks },
  ];

  // ── Romania: the leave schedule to print and sign ──
  if (x.lang === "ro") {
    const ro: Cell[][] = [
      [str(T("roTitle"), { ...title, fontSize: 14, columnSpan: 9, align: "center" })],
      [str(T("roEmployer"), { fontSize: 10, textColor: INK, columnSpan: 9 })],
      [],
      [str(T("cNo"), { ...head, align: "center" }), str(T("cName"), head), str(T("roRole"), head), str(T("cAllow"), { ...head, align: "center" }), str(T("cCarry"), { ...head, align: "center" }), str(T("roP1"), { ...head, align: "center" }), str(T("roP2"), { ...head, align: "center" }), str(T("roP3"), { ...head, align: "center" }), str(T("roSign"), { ...head, align: "center" })],
    ];
    for (let i = 0; i < rows; i++) {
      const t = TEAM_FIRST + i, cell = { ...box, height: 22, alignVertical: "center" };
      ro.push([
        num(i + 1, { ...cell, align: "center", textColor: MUTED }),
        fx(`=IF(${ref(sTeam)}!B${t}="","",${ref(sTeam)}!B${t})`, cell), str("", cell),
        fx(`=IF(${ref(sTeam)}!C${t}="","",${ref(sTeam)}!C${t})`, { ...cell, align: "center" }),
        fx(`=IF(${ref(sTeam)}!D${t}="","",${ref(sTeam)}!D${t})`, { ...cell, align: "center" }),
        str("", cell), str("", cell), str("", cell), str("", cell),
      ]);
    }
    ro.push([], [str(T("roNote"), { ...sub, wrap: true, columnSpan: 9, alignVertical: "top", height: 44 })], [], [str(T("roFoot"), { fontSize: 10, textColor: INK, columnSpan: 9 })]);
    sheets.push({ sheet: T("sRo"), data: ro, columns: [{ width: 6 }, { width: 28 }, { width: 18 }, { width: 13 }, { width: 13 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 18 }], orientation: "landscape", stickyRowsCount: 4 });
  }

  sheets.push(
    { sheet: T("sHol"), data: hol, columns: [{ width: 16 }, { width: 14 }, { width: 44 }, ...(withEn ? [{ width: 40 }] : [])] },
    { sheet: T("sHow"), data: how, columns: [{ width: 110 }] },
  );
  return sheets;
}
