// The printable year planner: one A4 landscape page with every day of the year, weekends and public holidays
// marked, and the list of public holidays underneath. Returned as a self-contained HTML document that
// lib/htmlToPdf turns into a PDF in the browser (so any alphabet prints correctly). Pure: no DOM, no I/O.
import { tpl } from "./templateText";
import type { TplInput } from "./templateSheets";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dim = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const dow = (y: number, m: number, d: number) => (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7; // Monday = 0
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function templateHtml(x: TplInput, rtl = false): string {
  const T = (key: string) => esc(tpl(x.lang, key, { y: x.year, p: x.year - 1, c: x.place }));
  const hol = new Set(x.holidays.map(h => h.date));
  let grid = `<tr><th class="m"></th>${Array.from({ length: 31 }, (_, i) => `<th>${i + 1}</th>`).join("")}</tr>`;
  for (let m = 0; m < 12; m++) {
    const days = dim(x.year, m);
    grid += `<tr><th class="m">${esc(x.months[m])}</th>`;
    for (let d = 1; d <= 31; d++) {
      if (d > days) { grid += `<td class="x"></td>`; continue; }
      const w = dow(x.year, m, d), k = hol.has(iso(x.year, m, d)) ? "h" : w >= 5 ? "w" : "";
      grid += `<td${k ? ` class="${k}"` : ""}><i>${esc(x.weekdays[w])}</i></td>`;
    }
    grid += "</tr>";
  }
  const list = x.holidays.map(h => {
    const [, mm, dd] = h.date.split("-").map(Number);
    return `<li><b>${dd} ${esc(x.months[mm - 1])}</b> ${esc(h.name || h.en)}</li>`;
  }).join("");
  return `<!doctype html><html lang="${esc(x.lang)}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${T("fTitle")}</title><style>
*{box-sizing:border-box}
body{margin:0;padding:22px 26px;width:1123px;background:#fff;color:#1F2937;font:12px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",Arial,sans-serif}
.hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:12px}
h1{margin:0;font-size:25px;font-weight:800;letter-spacing:-.02em;color:#4C1D95}
.sub{font-size:13px;color:#6B7280;margin-top:2px}
.legend{display:flex;gap:14px;font-size:11px;color:#4B5563;white-space:nowrap}
.legend span{display:inline-flex;align-items:center;gap:5px}
.legend i{width:13px;height:13px;border-radius:3px;border:1px solid #D1D5DB;display:inline-block}
table{border-collapse:collapse;width:100%;table-layout:fixed}
th,td{border:1px solid #D1D5DB;height:30px;text-align:center;padding:0}
th{font-size:10px;font-weight:700;color:#4B5563;background:#F5F3FF;height:20px}
th.m{width:92px;text-align:start;padding-inline:8px;font-size:11.5px;color:#4C1D95;background:#F5F3FF;height:30px}
td i{font-style:normal;font-size:8px;color:#9CA3AF;display:block;line-height:1;padding-top:3px;height:100%;text-align:start;padding-inline-start:3px}
td.w{background:#F3F4F6}
td.h{background:#FED7AA}
td.h i{color:#9A3412;font-weight:700}
td.x{background:#E5E7EB;border-color:#E5E7EB}
.card{margin-top:12px}
h2{margin:0 0 5px;font-size:13px;color:#9A3412}
ul{list-style:none;margin:0;padding:0;columns:3;column-gap:22px;font-size:11px}
li{break-inside:avoid;padding:1.5px 0;color:#374151}
li b{color:#1F2937;font-weight:700}
.foot{margin-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF}
</style></head><body>
<div class="hdr"><div><h1>${T("fTitle")}</h1><div class="sub">${T("fSub")}</div></div>
<div class="legend"><span><i style="background:#F3F4F6"></i>${T("fWeekend")}</span><span><i style="background:#FED7AA"></i>${T("fHoliday")}</span></div></div>
<table>${grid}</table>
<div class="card"><h2>${T("holTitle")}</h2><ul>${list || `<li>${T("fNoHols")}</li>`}</ul></div>
<div class="foot"><span>${T("fMade")}</span><span>${esc(String(x.year))}</span></div>
</body></html>`;
}
