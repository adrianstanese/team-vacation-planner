// Checks i18n/<code>.json against i18n/base.json. Errors must be fixed; warnings are for a human look.
//   node scripts/i18n/check.mjs ja        (one language)
//   node scripts/i18n/check.mjs           (every language file)
import fs from "node:fs";

const base = JSON.parse(fs.readFileSync("i18n/base.json", "utf8"));
const codes = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync("i18n").filter(f => /^[a-z]{2}\.json$/.test(f)).map(f => f.slice(0, 2));
const PH = /\{[a-zA-Z0-9]+\}/g;
const KEEP = /^(PIN|PDF|QR|ICS|JSON|CSV|Excel|Widget|Wrapped|your@email\.com|OK)$/i;
const sorted = a => [...a].sort().join(",");
let failed = false;

for (const code of codes) {
  const errors = [], warns = [];
  let t;
  try { t = JSON.parse(fs.readFileSync(`i18n/${code}.json`, "utf8")); }
  catch (e) { console.log(`${code}: cannot read i18n/${code}.json (${e.message})`); failed = true; continue; }
  const L = t._lang || {};
  for (const f of ["code", "name", "label", "flag", "home", "locale", "dir"]) if (!L[f]) errors.push(`_lang.${f} missing`);
  if (L.code && L.code !== code) errors.push(`_lang.code is ${L.code}, file is ${code}`);
  if (L.dir && !["ltr", "rtl"].includes(L.dir)) errors.push("_lang.dir must be ltr or rtl");
  const nonLatin = !/^(ltr)$/.test(L.dir || "") || /[^\u0000-ɏ]/.test(L.name || "");
  for (const [g, grp] of Object.entries(base.groups)) {
    const tg = t[g];
    if (!tg) { errors.push(`group ${g} missing`); continue; }
    for (const k of Object.keys(tg)) if (!(k in grp.strings)) errors.push(`${g}.${k}: not in base (remove it)`);
    for (const [k, e] of Object.entries(grp.strings)) {
      const v = tg[k], id = `${g}.${k}`;
      if (v === undefined) { errors.push(`${id}: missing`); continue; }
      if (Array.isArray(e.en)) {
        if (!Array.isArray(v) || v.length !== e.en.length) errors.push(`${id}: needs a list of ${e.en.length}`);
        else if (v.some(x => typeof x !== "string" || !x.trim())) errors.push(`${id}: empty list item`);
        continue;
      }
      if (typeof v !== "string" || !v.trim()) { errors.push(`${id}: empty or not text`); continue; }
      if (sorted(v.match(PH) || []) !== sorted(e.en.match(PH) || [])) errors.push(`${id}: placeholders differ (${(e.en.match(PH) || []).join(" ") || "none"})`);
      if (/[\n\r\t]/.test(v)) errors.push(`${id}: line break or tab`);
      for (const sym of ["½", "€", "%", "→"]) if (e.en.includes(sym) && !v.includes(sym) && !(sym === "%" && v.includes("٪"))) warns.push(`${id}: '${sym}' dropped`);
      if (e.max && [...v].length > e.max) warns.push(`${id}: ${[...v].length} chars, limit ${e.max} ("${v}")`);
      if (nonLatin && v === e.en && /[A-Za-z]{3}/.test(v) && !KEEP.test(v)) warns.push(`${id}: same as English ("${v}")`);
    }
  }
  console.log(`${code}: ${errors.length} errors, ${warns.length} warnings`);
  for (const e of errors) console.log("  ERROR", e);
  for (const w of warns) console.log("  warn ", w);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
