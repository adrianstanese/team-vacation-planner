// A template page: the leave planner files for one year, in one language. Built once when the site is published.
// The server works out everything for the language's own country (holiday table, best days off, country names),
// so the page reads complete without any script; TemplateTool takes over when the visitor picks something else.
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import "@/app/frontpage.css";
import "@/app/template.css";
import TemplateTool, { type ToolData } from "./TemplateTool";
import { TEMPLATE_TX, TEMPLATE_HOME, TEMPLATE_CHECKED, tpl } from "@/lib/templateText";
import { TEMPLATE_PATH, TEMPLATE_YEAR } from "@/lib/templateLinks";
import { TEMPLATE_COUNTRIES, TEMPLATE_YEARS, regionsOf, defaultRegion, holidayDates, holidayName, bestBreaks, onWeekdays, breaksReliable, DATA_GAPS, type NameFile } from "@/lib/templateData";
import { toRow, breakLine, fill, tplLocale } from "@/lib/templateFormat";
import { countryList } from "@/lib/countryList";
import { langPath, langDir, indexable } from "@/lib/langs";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "@/lib/site";

const FILE_BASE: Record<string, string> = { en: "leave-planner", ro: "programare-concedii" };
// Before the first paint: the theme the visitor chose in the planner, else the device's dark mode
const THEME = `(function(){try{var t=JSON.parse(localStorage.getItem("drift-theme")||"null");if(t!=="light"&&t!=="dark"&&t!=="pink")t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"";if(t)document.currentScript.parentElement.setAttribute("data-theme",t);}catch(e){}})();`;

function readNames(cc: string): NameFile {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "hn", `${cc.toLowerCase()}.json`), "utf8")); } catch { return null; }
}

export function templateMetadata(lang: string): Metadata {
  const vars = { y: TEMPLATE_YEAR };
  const title = tpl(lang, "metaTitle", vars), description = tpl(lang, "metaDesc", vars);
  const url = SITE_URL + TEMPLATE_PATH[lang];
  const open = indexable(lang, "template");
  // The language versions name each other to search engines only once they are all open to them
  const langs = Object.keys(TEMPLATE_PATH);
  const allOpen = langs.every(l => indexable(l, "template"));
  return {
    title, description,
    robots: open
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 } }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    alternates: {
      canonical: url,
      ...(allOpen ? { languages: { ...Object.fromEntries(langs.map(l => [l, SITE_URL + TEMPLATE_PATH[l]])), "x-default": SITE_URL + TEMPLATE_PATH.en } } : {}),
    },
    openGraph: { type: "website", url, siteName: SITE_NAME, title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME, type: "image/png" }] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
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

  const other = Object.keys(TEMPLATE_PATH).filter(l => l !== lang);
  const inside = ["inside1", "inside2", "inside5", "inside3", "inside4"].map(T).filter(Boolean);
  const how = ["how1", "how2", "how3", "how5", "how4"].map(T).filter(Boolean);
  const law = tx.legalTitle ? [1, 2, 3, 4].map(n => ({ h: tx[`l${n}h`], q: tx[`l${n}q`], a: tx[`l${n}a`] })).filter(x => x.h && x.q) : [];
  const home = langPath(lang);

  return <div className="fp tpl" data-theme="light" dir={langDir(lang)} lang={lang} suppressHydrationWarning>
    <script dangerouslySetInnerHTML={{ __html: THEME }} />
    <div className="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <header className="top"><div className="wrap">
      <a className="brand" href={home}>
        <span className="logo"><svg className="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg></span>
        <span className="long">{tx.home}</span>
      </a>
      {other.map(l => <a key={l} className="ghost" href={TEMPLATE_PATH[l]} lang={l}>{(TEMPLATE_TX[lang] || TEMPLATE_TX.en).otherLang}</a>)}
      <a className="ghost" href={home}>{tx.openPlanner}</a>
    </div></header>

    <main>
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
          <a className="go" href={home}>{tx.openPlanner}</a>
        </section>
      </div></div>
    </main>

    <footer className="foot"><div className="wrap">
      <span className="sp">{SITE_NAME} · {tx.foot}</span>
      <a href={home}>{tx.openPlanner}</a>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a plain link on purpose: one full page load, no background request */}
      <a href="/privacy">{tx.privacy}</a>
    </div></footer>
  </div>;
}
