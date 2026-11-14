// A template page: the leave planner files for one year, in one language. Built once when the site is published.
// The server works out everything for the language's own country (holiday table, best days off, country names),
// so the page reads complete without any script; TemplateTool takes over when the visitor picks something else.
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import TemplateTool, { type ToolData } from "./TemplateTool";
import PageFrame from "@/components/site/PageFrame";
import { TEMPLATE_TX, TEMPLATE_HOME, TEMPLATE_CHECKED, tpl } from "@/lib/templateText";
import { TEMPLATE_YEAR } from "@/lib/templateLinks";
import { TEMPLATE_COUNTRIES, TEMPLATE_YEARS, regionsOf, defaultRegion, holidayDates, holidayName, bestBreaks, onWeekdays, breaksReliable, DATA_GAPS, type NameFile } from "@/lib/templateData";
import { toRow, breakLine, fill, tplLocale } from "@/lib/templateFormat";
import { countryList } from "@/lib/countryList";
import { langPath, langDir } from "@/lib/langs";
import { pageMetadata } from "@/lib/pageMeta";
import { homeRel } from "@/lib/sitePages";

const FILE_BASE: Record<string, string> = { en: "leave-planner", ro: "programare-concedii" };

function readNames(cc: string): NameFile {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "hn", `${cc.toLowerCase()}.json`), "utf8")); } catch { return null; }
}

export function templateMetadata(lang: string): Metadata {
  const vars = { y: TEMPLATE_YEAR };
  return pageMetadata("template", lang, tpl(lang, "metaTitle", vars), tpl(lang, "metaDesc", vars));
}

export default function TemplatePage({ lang }: { lang: string }) {
  const tx = TEMPLATE_TX[lang] || TEMPLATE_TX.en;
  const year = TEMPLATE_YEAR, vars = { y: year, p: year - 1 };
  const T = (key: string) => fill(tx[key] || "", vars);
  // Countries with public holidays in the data for this year (a country whose holidays are suspended has none)
  const countries: [string, string][] = (countryList(lang) || TEMPLATE_COUNTRIES.map(c => [c, c] as [string, string]))
    .filter(([code]) => holidayDates(code, defaultRegion(code), year).length > 0);
  const nameOf = (cc: string) => (countries.find(c => c[0] === cc) || ["", cc])[1];

  // The language's own country, as the page first shows it
  const cc = TEMPLATE_HOME[lang] || "GB", region = defaultRegion(cc);
  const dates = holidayDates(cc, region, year), names = readNames(cc);
  const initial: ToolData = {
    cc, region, year,
    regions: regionsOf(cc), national: !region,
    rows: dates.map(date => { const n = holidayName(names, date, region); return toRow(date, n.name, n.en, lang); }),
    weekdays: onWeekdays(dates),
    best: breaksReliable(cc) ? bestBreaks(dates, year).map(b => breakLine(b, lang, tx.bestLine, tx.and)) : [],
    gap: DATA_GAPS[cc] || null,
  };
  const longDate = new Intl.DateTimeFormat(tplLocale(lang), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const checked = Object.fromEntries(Object.entries(TEMPLATE_CHECKED).map(([code, c]) =>
    [code, fill(tx.checked, { y: year, c: nameOf(code), d: longDate.format(new Date(c.on + "T12:00:00Z")), src: c.src[lang] || c.src.en })]));

  const inside = ["inside1", "inside2", "inside5", "inside3", "inside4"].map(T).filter(Boolean);
  const how = ["how1", "how2", "how3", "how5", "how4"].map(T).filter(Boolean);
  const law = tx.legalTitle ? [1, 2, 3, 4].map(n => ({ h: tx[`l${n}h`], q: tx[`l${n}q`], a: tx[`l${n}a`] })).filter(x => x.h && x.q) : [];
  const home = langPath(lang);

  return <PageFrame lang={lang} page="template">
    <section className="wrap hero">
      <span className="pill"><i></i>{fill(tx.pill, { n: countries.length })}</span>
      <h1 className="h"><span>{T("h1")}</span></h1>
      <p className="lede">{T("lede")}</p>
    </section>

    <div className="wrap"><div className="stack-t">
      <TemplateTool lang={lang} rtl={langDir(lang) === "rtl"} tx={tx} countries={countries} years={TEMPLATE_YEARS} pageYear={year}
        initial={initial} checked={checked} home={TEMPLATE_HOME[lang] || ""} fileBase={FILE_BASE[lang] || FILE_BASE.en} />

      <section className="card">
        <h2>{tx.insideTitle}</h2>
        <ul className="plain">{inside.map(line => <li key={line}>{line}</li>)}</ul>
      </section>

      <section className="card">
        <h2>{tx.howTitle}</h2>
        <ol className="plain">{how.map(line => <li key={line}>{line}</li>)}</ol>
      </section>

      {law.length > 0 && <section className="card">
        <h2>{tx.legalTitle}</h2>
        <p className="sub">{tx.legalLead}</p>
        <div className="law">{law.map(x => <div key={x.a}>
          <h3>{x.h}</h3>
          <blockquote>„{x.q}”<cite>{x.a}</cite></blockquote>
        </div>)}</div>
        <p className="fine">{tx.legalSrc}</p>
      </section>}

      <section className="card cta">
        <div><h2>{tx.ctaTitle}</h2><p>{tx.ctaText}</p></div>
        <a className="go" href={home} rel={homeRel(lang)}>{tx.openPlanner}</a>
      </section>
    </div></div>
  </PageFrame>;
}
