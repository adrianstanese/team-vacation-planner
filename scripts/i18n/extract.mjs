// Builds i18n/base.json: the single source file every translation starts from.
// It holds each English string with its placeholders, a context note where the meaning is not obvious,
// and a soft length limit for short labels. Run after changing English texts:
//   node scripts/i18n/extract.mjs
import fs from "node:fs";
import { DICTS, readDict } from "./lib.mjs";

const notes = JSON.parse(fs.readFileSync("scripts/i18n/notes.json", "utf8"));
const PH = /\{[a-zA-Z0-9]+\}/g;
const groups = {};
let n = 0;
for (const d of DICTS) {
  const all = readDict(d);
  const en = d.single ? all : all.en;
  const strings = {};
  for (const [k, v] of Object.entries(en)) {
    const e = { en: v };
    const ph = [...new Set((Array.isArray(v) ? v.join(" ") : v).match(PH) || [])];
    if (ph.length) e.ph = ph;
    if (Array.isArray(v)) e.items = v.length;
    else if (v.length <= 16) e.max = Math.max(10, Math.round(v.length * 1.8) + 2); // short label: keep it short
    const note = notes[d.id] && notes[d.id][k];
    if (note) e.note = note;
    strings[k] = e;
    n++;
  }
  groups[d.id] = { where: notes._groups[d.id] || "", file: d.file, strings };
}

const base = {
  about: "Base translation file for Team Vacation Planner. To add a language: copy the shape into i18n/<code>.json " +
    "(same groups and keys, values = translated text, plus the _lang block), then run check.mjs and apply.mjs. See i18n/README.md.",
  source: "en",
  strings: n,
  rules: [
    "Translate meaning, not words: short, natural interface language a colleague would use at work.",
    "Keep every {placeholder} exactly as written (same letters, same braces); move it where the grammar needs it.",
    "Texts with a number before or after them have no plural logic: choose a form that reads acceptably with any number.",
    "Keep product names and formats unchanged: Team Vacation Planner may be translated as a description only in 'brand'; Workoșenie, Buy Me a Coffee, PIN, PDF, Excel, CSV, ICS, QR, JSON, WhatsApp, Telegram, LinkedIn, Facebook, X stay as they are.",
    "Keep symbols such as ½, ·, →, –, …, €, % and emoji where they are.",
    "'max' is a soft limit in characters for labels on buttons, tabs and chips: stay under it when the language allows.",
    "Lists ('items') keep the same number of entries in the same order.",
    "No machine-sounding literalisms; no English left over except the names above.",
    "Use one term per concept everywhere (see glossary) and one register (polite-neutral, addressing the user directly)."
  ],
  glossary: {
    "vacation / leave": "Paid annual leave an employee books. Use the everyday workplace word.",
    "public holiday": "Official non-working day by law.",
    "team": "The group of colleagues sharing one calendar.",
    "member": "A person in the team.",
    "approver": "The member who approves vacation requests.",
    "owner / creator": "The person who created the team.",
    "allowance (PTO)": "Vacation days a person may take per year.",
    "carry-over": "Unused days moved to the next year.",
    "coverage": "Share of the team at work on a given day.",
    "overlap / clash": "Several people away on the same day (clash = too many).",
    "bridge day": "A working day between a public holiday and a weekend, worth taking off.",
    "half day": "Half a vacation day.",
    "business trip": "Work travel, shown separately from vacation.",
    "heatmap": "Calendar coloured by how many people are away.",
    "timeline": "Horizontal bars per person across the year.",
    "PIN": "The 4 to 6 digit code each member sets.",
    "setup code": "One-time 8-digit code given after a PIN reset.",
    "time travel": "Version history of the calendar.",
    "Wrapped": "Year-in-review story."
  },
  lang_block: {
    code: "ISO 639-1 code used in the app, e.g. ja",
    name: "Language name in the language itself, e.g. 日本語",
    label: "2-letter label for the language switcher, e.g. JA",
    flag: "Flag emoji shown in the switcher",
    home: "ISO country code preselected for a new member using this language, e.g. JP",
    locale: "BCP 47 tag for dates and numbers, e.g. ja-JP",
    dir: "ltr or rtl",
    fonts: "CSS font-family fallbacks if the script is not Latin/Cyrillic/Greek, else empty"
  },
  groups,
};
fs.writeFileSync("i18n/base.json", JSON.stringify(base, null, 1) + "\n");
console.log(`i18n/base.json: ${n} strings in ${DICTS.length} groups, ${fs.statSync("i18n/base.json").size} bytes`);
