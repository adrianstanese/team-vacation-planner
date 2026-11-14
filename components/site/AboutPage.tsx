// The About page: what the planner is, where its public holiday dates come from, what was checked by hand and what
// the data does not cover. Built once when the site is published, with no script of its own. Every figure and every
// list of countries is worked out here from the planner's own data, so the page cannot say more than the data has.
import fs from "node:fs";
import path from "node:path";
import { Fragment, type ReactNode } from "react";
import type { Metadata } from "next";
import PageFrame, { frameText } from "./PageFrame";
import { ABOUT_PAGE_TX } from "@/lib/aboutPageText";
import { HOLIDAY_SOURCE, ABOUT_REVIEWED } from "@/lib/holidaySource";
import { TEMPLATE_CHECKED } from "@/lib/templateText";
import { TEMPLATE_COUNTRIES, TEMPLATE_YEARS, regionsOf, defaultRegion, holidayDates, DATA_GAPS, type Gap, type NameFile } from "@/lib/templateData";
import { TEMPLATE_YEAR } from "@/lib/templateLinks";
import { RN } from "@/lib/holidayDates";
import { fill, tplLocale } from "@/lib/templateFormat";
import { countryList } from "@/lib/countryList";
import { langPath } from "@/lib/langs";
import { homeRel } from "@/lib/sitePages";
import { pageMetadata } from "@/lib/pageMeta";
import { CONTACT_EMAIL, PUBLISHER } from "@/lib/site";

const textOf = (lang: string) => ABOUT_PAGE_TX[lang] || ABOUT_PAGE_TX.en;
/** Countries that have public holidays in the data in at least one year (a country whose holidays are suspended has none). */
const coveredCountries = () => TEMPLATE_COUNTRIES.filter(c => TEMPLATE_YEARS.some(y => holidayDates(c, defaultRegion(c), y).length > 0));

export function aboutMetadata(lang: string): Metadata {
  const tx = textOf(lang);
  return pageMetadata("about", lang, tx.metaTitle, fill(tx.metaDesc, { n: coveredCountries().length }));
}

function readNames(cc: string): NameFile {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "hn", `${cc.toLowerCase()}.json`), "utf8")); } catch { return null; }
}

// Countries with public holidays whose date follows the moon: the library marks those names "(estimated)".
// Where only some regions have such a day, the regions are named (Spain: Ceuta, Melilla).
function moonPlaces(): { cc: string; regions: string[] }[] {
  const out: { cc: string; regions: string[] }[] = [];
  for (const cc of TEMPLATE_COUNTRIES) {
    const file = readNames(cc);
    if (!file || !file.h) continue;
    const national = new Set(TEMPLATE_YEARS.flatMap(y => holidayDates(cc, defaultRegion(cc), y)));
    const regions = regionsOf(cc);
    let nationwide = false;
    const inRegions = new Set<string>();
    for (const [date, rows] of Object.entries(file.h)) {
      for (const row of rows) {
        if (!String(row[2] || "").includes("P") || !/\(estimated\)/i.test(`${row[0]} ${row[1] || ""}`)) continue;
        if (!row[3] || !row[3].length) { if (national.has(date)) nationwide = true; continue; }
        for (const [code, name] of regions) if (row[3].includes(code) && holidayDates(cc, code, Number(date.slice(0, 4))).includes(date)) inRegions.add(name);
      }
    }
    if (nationwide) out.push({ cc, regions: [] });
    else if (inRegions.size) out.push({ cc, regions: [...inRegions].sort() });
  }
  return out;
}

// A sentence with links in it: "{mail}" and the like are replaced by the given pieces
function rich(text: string, slots: Record<string, ReactNode>): ReactNode[] {
  return text.split(/(\{[a-z]+\})/).map((part, i) => {
    const m = /^\{([a-z]+)\}$/.exec(part);
    return m && m[1] in slots ? <Fragment key={i}>{slots[m[1]]}</Fragment> : part;
  });
}

export default function AboutPage({ lang }: { lang: string }) {
  const tx = textOf(lang), home = langPath(lang);
  const names = new Map(countryList(lang) || []);
  const nameOf = (cc: string) => names.get(cc) || cc;
  const order = new Intl.Collator(tplLocale(lang));
  const byName = (a: string, b: string) => order.compare(nameOf(a), nameOf(b));
  const list = (items: string[]) => (items.length < 2 ? items.join("") : items.slice(0, -1).join(", ") + " " + tx.and + " " + items[items.length - 1]);
  const longDate = new Intl.DateTimeFormat(tplLocale(lang), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const day = (iso: string) => longDate.format(new Date(iso + "T12:00:00Z"));

  const covered = coveredCountries();
  const withRegions = TEMPLATE_COUNTRIES.filter(c => regionsOf(c).length > 0).sort(byName);
  const fallbacks = TEMPLATE_COUNTRIES.filter(c => defaultRegion(c)).sort(byName);
  const gap = (kind: Gap) => Object.keys(DATA_GAPS).filter(c => DATA_GAPS[c] === kind).sort(byName);
  const moon = moonPlaces().sort((a, b) => byName(a.cc, b.cc)).map(p => nameOf(p.cc) + (p.regions.length ? ` (${p.regions.join(", ")})` : ""));

  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  const lib = <a href={HOLIDAY_SOURCE.url} rel="noopener">{HOLIDAY_SOURCE.name}</a>;
  const what = ["what1", "what2", "what3", "what4", "what5"].map(k => tx[k]);
  const source: ReactNode[] = [
    rich(fill(tx.src1, { by: HOLIDAY_SOURCE.by, lic: HOLIDAY_SOURCE.licence, v: HOLIDAY_SOURCE.version, g: day(HOLIDAY_SOURCE.generated) }), { lib }),
    tx.src2,
    fill(covered.length < TEMPLATE_COUNTRIES.length ? tx.src3of : tx.src3, { n: covered.length, t: TEMPLATE_COUNTRIES.length, a: TEMPLATE_YEARS[0], b: TEMPLATE_YEARS[TEMPLATE_YEARS.length - 1] }),
    fill(tx.src4, { r: withRegions.map(c => `${nameOf(c)} (${regionsOf(c).length})`).join(", ") }),
    fill(tx.src5, { d: fallbacks.map(c => `${nameOf(c)}: ${(regionsOf(c).find(r => r[0] === defaultRegion(c)) || ["", ""])[1]}`).join("; ") }),
    ...(TEMPLATE_COUNTRIES.includes("XK") ? [tx.src6] : []),
    ...(TEMPLATE_COUNTRIES.includes("UA") && !covered.includes("UA") ? [tx.src7] : []),
  ];
  const checks = Object.entries(TEMPLATE_CHECKED).sort((a, b) => byName(a[0], b[0]))
    .map(([cc, c]) => fill(tx.chkLine, { y: TEMPLATE_YEAR, c: nameOf(cc), d: day(c.on), src: c.src[lang] || c.src.en }));
  const gaps: string[] = [
    ...(gap("moved").length ? [fill(tx.gapMoved, { c: list(gap("moved").map(nameOf)) })] : []),
    tx.gapLater,
    ...(moon.length ? [fill(tx.gapMoon, { c: list(moon) })] : []),
    ...gap("states").map(c => fill(tx.gapStates, { c: nameOf(c) })),
    ...gap("partial").map(c => fill(tx.gapPartial, { c: nameOf(c), x: regionsOf(c).length, t: Object.keys(RN[c] || {}).length })),
    tx.gapOwn,
  ];

  return <PageFrame lang={lang} page="about">
    <section className="wrap hero">
      <span className="pill"><i></i>{tx.pill}</span>
      <h1 className="h"><span>{tx.h1}</span></h1>
      <p className="lede">{tx.lede}</p>
    </section>

    <div className="wrap"><div className="stack-t">
      <section className="card">
        <h2>{tx.whatTitle}</h2>
        <ul className="plain">{what.map(line => <li key={line}>{line}</li>)}</ul>
      </section>

      <section className="card">
        <h2>{tx.srcTitle}</h2>
        <ul className="plain">{source.map((line, i) => <li key={i}>{line}</li>)}</ul>
      </section>

      <section className="card">
        <h2>{tx.chkTitle}</h2>
        <p className="sub">{tx.chkLead}</p>
        <ul className="plain">{checks.map(line => <li key={line}>{line}</li>)}</ul>
        <p className="fine">{tx.chkRest}</p>
      </section>

      <section className="card">
        <h2>{tx.gapTitle}</h2>
        <ul className="plain">{gaps.map(line => <li key={line}>{line}</li>)}</ul>
      </section>

      <section className="card">
        <h2>{tx.errTitle}</h2>
        <p className="say">{rich(tx.errText, { mail })}</p>
      </section>

      <section className="card">
        <h2>{PUBLISHER ? tx.whoTitle : tx.contactTitle}</h2>
        {PUBLISHER && <p className="say">{fill(tx.whoBy, { p: PUBLISHER })}</p>}
        <p className="say">{rich(tx.contactText, { mail })}</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a plain link on purpose: one full page load, no background request */}
        <p className="say">{rich(tx.privacyText, { privacy: <a href="/privacy">{tx.privacyWord}</a> })}</p>
        <p className="fine">{fill(tx.fine, { d: day(HOLIDAY_SOURCE.rebuilt), r: day(ABOUT_REVIEWED) })}</p>
      </section>

      <section className="card cta">
        <div><h2>{tx.ctaTitle}</h2><p>{tx.ctaText}</p></div>
        <a className="go" href={home} rel={homeRel(lang)}>{frameText(lang).openPlanner}</a>
      </section>
    </div></div>
  </PageFrame>;
}
