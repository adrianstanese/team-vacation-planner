#!/usr/bin/env node
// Builds scripts/data/xk.json (same format as the NonWorkingDays dataset) for Kosovo, which python-holidays does not
// cover. Rules: Law No. 03/L-064 on Official Holidays — days off: 1–2 January, 7 January (Orthodox Christmas),
// 17 February (Independence Day), 9 April (Constitution Day), Catholic and Orthodox Easter Monday, 1 May, 9 May
// (Europe Day), first day of Eid al-Fitr and of Eid al-Adha, 25 December. Art. 4: a holiday on a Saturday or Sunday
// moves to the next working day. Memorial days (e.g. 12 June, 28 November) are working days.
// Eid dates are astronomical estimates, the same ones python-holidays uses for Albania (the Islamic Community of
// Kosovo announces the exact day each year).
//   node scripts/build-kosovo.mjs [NonWorkingDays holidays folder]
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2] || path.resolve("../NonWorkingDays.nosync/lib/data/holidays");
const pad = n => String(n).padStart(2, "0");
const key = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const add = (d, n) => new Date(d.getTime() + n * 864e5);
function westernEaster(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), dd = ((h + l - 7 * m + 114) % 31) + 1;
  return day(y, month, dd);
}
function orthodoxEaster(y) {
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31), dd = ((d + e + 114) % 31) + 1;
  return add(day(y, month, dd), 13); // Julian → Gregorian (1900–2099)
}
const al = JSON.parse(fs.readFileSync(path.join(SRC, "al.json"), "utf8")).h;
const eid = (y, en) => al.filter(r => r[0].startsWith(y + "-") && r[2].startsWith(en) && !/observed/.test(r[2])).map(r => r[0]);

const rows = [];
for (let y = 2026; y <= 2035; y++) {
  const list = [
    [day(y, 1, 1), "Viti i Ri", "New Year's Day"],
    [day(y, 1, 2), "Viti i Ri", "New Year's Day"],
    [day(y, 1, 7), "Krishtlindjet Ortodokse", "Orthodox Christmas"],
    [day(y, 2, 17), "Dita e Pavarësisë", "Independence Day"],
    [day(y, 4, 9), "Dita e Kushtetutës", "Constitution Day"],
    [day(y, 5, 1), "Dita Ndërkombëtare e Punës", "International Workers' Day"],
    [day(y, 5, 9), "Dita e Evropës", "Europe Day"],
    [day(y, 12, 25), "Krishtlindjet Katolike", "Catholic Christmas"],
    [add(westernEaster(y), 1), "E hëna e Pashkëve Katolike", "Catholic Easter Monday"],
    [add(orthodoxEaster(y), 1), "E hëna e Pashkëve Ortodokse", "Orthodox Easter Monday"],
    ...eid(y, "Eid al-Fitr").map(k => [new Date(k + "T00:00:00Z"), "Fitër Bajrami (i vlerësuar)", "Eid al-Fitr (estimated)"]),
    ...eid(y, "Eid al-Adha").map(k => [new Date(k + "T00:00:00Z"), "Kurban Bajrami (i vlerësuar)", "Eid al-Adha (estimated)"]),
  ].sort((a, b) => a[0] - b[0]);
  const taken = new Set(list.map(([d]) => key(d)));
  for (const [d, local, en] of list) {
    rows.push([key(d), local, en, "P", null]);
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) { // Art. 4: next working day that is not already a holiday
      let n = add(d, 1);
      while (n.getUTCDay() === 0 || n.getUTCDay() === 6 || taken.has(key(n))) n = add(n, 1);
      taken.add(key(n));
      rows.push([key(n), local + " (ditë pushimi e shtyrë)", en + " (observed)", "P", null]);
    }
  }
}
rows.sort((a, b) => a[0].localeCompare(b[0]));
const out = new URL("./data/xk.json", import.meta.url);
fs.mkdirSync(new URL("./data/", import.meta.url), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ cc: "XK", source: { name: "Law No. 03/L-064 on Official Holidays (Kosovo)", version: "rules", generated: new Date().toISOString().slice(0, 10) }, years: [2026, 2035], lang: "sq", regions: {}, h: rows }));
console.log("XK rows:", rows.length, "| 2026:", rows.filter(r => r[0].startsWith("2026")).map(r => r[0].slice(5)).join(" "));
