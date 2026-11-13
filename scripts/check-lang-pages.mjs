// Run right after `next build` (see "build" in package.json): checks every ready-made language page in
// .next/server/app and fails the build if one is wrong.
// Why: the planner keeps the language being drawn in shared variables, so a page could come out carrying another
// language's texts if two were ever drawn at once. next.config.ts builds them one at a time; this is the proof.
// Each page must name its own language in <html lang>, carry its own texts, and carry none of another language's.
import fs from "node:fs";
import { DICTS, readDict } from "./i18n/lib.mjs";

const dir = ".next/server/app";
const dict = id => readDict(DICTS.find(d => d.id === id));
const tx = dict("TX"), fp = dict("FP"), page = dict("PAGE");
const langs = Object.keys(page);
const decode = s => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<!-- -->/g, "");
const problems = [];

for (const l of langs) {
  const file = `${dir}/${l === "en" ? "index" : l}.html`;
  if (!fs.existsSync(file)) { problems.push(`${l}: ${file} was not built`); continue; }
  const html = decode(fs.readFileSync(file, "utf8"));
  if (!new RegExp(`<html[^>]*\\blang="${l}"`).test(html)) problems.push(`${l}: <html lang> is not "${l}"`);
  const own = [["title", page[l].title], ["tagline", tx[l] && tx[l].tag2], ["counters heading", fp[l] && fp[l].numbers], ["holidays heading", fp[l] && fp[l].holTitle]];
  for (const [name, text] of own) if (!text || !html.includes(text)) problems.push(`${l}: its own ${name} is missing`);
  for (const o of langs) {
    const foreign = o !== l && fp[o] && fp[o].numbers;
    if (foreign && foreign !== (fp[l] && fp[l].numbers) && html.includes(foreign)) problems.push(`${l}: carries the ${o} text "${foreign}"`);
  }
}

if (problems.length) {
  console.error(`Language pages: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`Language pages: ${langs.length} checked, each in its own language only`);
