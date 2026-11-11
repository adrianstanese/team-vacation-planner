#!/usr/bin/env node
// Builds public/hn/<cc>.json: holiday NAMES (local + English) for the planner's countries, 2026–2035.
// Source: the NonWorkingDays dataset (python-holidays, MIT licence). Names only: which days count as holidays
// is still decided by the planner's own engine, so this file can never change anyone's day counts.
// Usage: node scripts/build-holiday-names.mjs ../NonWorkingDays.nosync/lib/data/holidays
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2];
if (!src || !existsSync(src)) { console.error("Pass the NonWorkingDays holidays folder"); process.exit(1); }

const app = readFileSync(join(here, "../app/app.tsx"), "utf8");
const block = app.slice(app.indexOf("const EU_C=["), app.indexOf("];", app.indexOf("const EU_C=[")));
const codes = [...block.matchAll(/\{c:"([A-Z]{2})"/g)].map(m => m[1]);
const out = join(here, "../public/hn");
mkdirSync(out, { recursive: true });

let total = 0; const missing = [];
for (const cc of codes) {
  const file = join(src, `${cc.toLowerCase()}.json`);
  if (!existsSync(file)) { missing.push(cc); continue; }
  const d = JSON.parse(readFileSync(file, "utf8"));
  const h = {};
  for (const [date, local, en, types, regions] of d.h || []) {
    const y = Number(date.slice(0, 4));
    if (y < 2026 || y > 2035) continue;
    (h[date] ||= []).push(regions && regions.length ? [local, en, types, regions] : [local, en, types]);
  }
  const body = JSON.stringify({ cc, lang: d.lang, src: `${d.source?.name || "python-holidays"} ${d.source?.version || ""} (MIT)`.trim(), h });
  writeFileSync(join(out, `${cc.toLowerCase()}.json`), body);
  total += body.length;
}
console.log(`wrote ${codes.length - missing.length} files, ${Math.round(total / 1024)} KB total; no data for: ${missing.join(", ") || "none"}`);
