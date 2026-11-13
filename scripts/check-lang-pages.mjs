// Run right after `next build` (see "build" in package.json): checks the ready-made front pages, one per language,
// and fails the build if one of them carries another language.
// Why: the planner keeps the language being drawn in shared variables, so a page could come out with another
// language's texts if two were ever drawn at once. next.config.ts builds them one at a time; this is the proof.
// Each page must carry its own texts and none of another language's.
//
// Where the pages are: a plain `next build` leaves them in .next/server/app; a hosting build may move them (Vercel
// moves them into .vercel/output before this script runs). So the pages are searched for, not assumed. A page that
// is found and wrong fails the build. Pages that cannot be found are reported, with what was looked at, and do not
// fail it: the same check runs against the live addresses after every release.
import fs from "node:fs";
import path from "node:path";
import { DICTS, readDict } from "./i18n/lib.mjs";

const dict = id => readDict(DICTS.find(d => d.id === id));
const tx = dict("TX"), fp = dict("FP"), page = dict("PAGE");
const langs = Object.keys(page);
const decode = s => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<!-- -->/g, "");

// Every .html file under the build folders (not the dependency or cache folders)
const ROOTS = [".next", ".vercel/output"];
const SKIP = new Set(["node_modules", "cache", "chunks", "media", "dev", "types"]);
function htmlFiles(dir, out = [], depth = 0) {
  if (depth > 9) return out;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) htmlFiles(p, out, depth + 1); }
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const all = ROOTS.flatMap(r => htmlFiles(r));
// A front page is the page with the planner's own front-page block; its language is the one in <html lang>
const found = {};
for (const file of all) {
  let html;
  try { html = fs.readFileSync(file, "utf8"); } catch { continue; }
  if (!/class="fp"/.test(html)) continue;
  const m = /<html[^>]*\blang="([a-z]{2})"/.exec(html);
  if (m && langs.includes(m[1])) (found[m[1]] ||= []).push({ file, html: decode(html) });
}

const problems = [];
let checked = 0;
for (const l of langs) {
  for (const { file, html } of found[l] || []) {
    checked++;
    const own = [["title", page[l].title], ["tagline", tx[l] && tx[l].tag2], ["counters heading", fp[l] && fp[l].numbers], ["holidays heading", fp[l] && fp[l].holTitle]];
    for (const [name, text] of own) if (!text || !html.includes(text)) problems.push(`${l} (${file}): its own ${name} is missing`);
    for (const o of langs) {
      const foreign = o !== l && fp[o] && fp[o].numbers;
      if (foreign && foreign !== (fp[l] && fp[l].numbers) && html.includes(foreign)) problems.push(`${l} (${file}): carries the ${o} text "${foreign}"`);
    }
  }
}

if (problems.length) {
  console.error(`Language pages: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
const missing = langs.filter(l => !found[l]);
if (missing.length) {
  console.log(`Language pages: ${checked} checked and fine; not found in the build folders: ${missing.join(", ")}`);
  console.log(`  looked in ${ROOTS.join(" and ")}: ${all.length} .html file(s)`);
  for (const f of all.slice(0, 30)) console.log("    " + f);
  for (const r of [".next", ".next/server", ".next/server/app", ".vercel", ".vercel/output"]) {
    try { console.log(`  ${r}: ${fs.readdirSync(r).slice(0, 40).join(" ")}`); } catch { console.log(`  ${r}: (none)`); }
  }
  console.log("  The live addresses are checked after the release instead.");
} else {
  console.log(`Language pages: ${langs.length} languages, ${checked} page file(s) checked, each in its own language only`);
}
