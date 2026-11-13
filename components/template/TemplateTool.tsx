"use client";
// The working part of a template page: pick a country, a region, a year and a team size; see that year's public
// holidays and the best days to take off; download the Excel planner or the printable PDF.
// The page arrives with everything for its own country already worked out by the server. The holiday data and the
// file builders are loaded only when the visitor picks something else or asks for a file.
import { useRef, useState } from "react";
import { fill, toRow, breakLine, monthNames, weekdayNames, type HolRow } from "@/lib/templateFormat";

export type ToolData = {
  cc: string; region: string; year: number;
  regions: [string, string][];     // regions of the country that have their own dates
  national: boolean;               // "national holidays only" is a real choice (no fallback region)
  rows: HolRow[]; weekdays: number; best: string[];
  gap: string | null;              // what the data does not know about this country
};
type Props = {
  lang: string; rtl?: boolean;
  tx: Record<string, string>;
  countries: [string, string][];   // code and name in the page language, already in order
  years: number[]; pageYear: number;
  initial: ToolData;
  checked: Record<string, string>; // per country: the sentence saying when and against what its dates were checked
  home: string;                    // the country whose local names need no English column on this page
  fileBase: string;
};

const SIZES = [5, 10, 15, 20, 30, 50];

export default function TemplateTool({ lang, rtl = false, tx, countries, years, pageYear, initial, checked, home, fileBase }: Props) {
  const [data, setData] = useState<ToolData>(initial);
  const [size, setSize] = useState(10);
  const [busy, setBusy] = useState<"" | "xlsx" | "pdf">("");
  const [error, setError] = useState("");
  const names = useRef<Record<string, unknown>>({});
  const turn = useRef(0);
  // What the visitor has asked for so far, including picks whose lists are still being worked out. Each new pick
  // builds on this, not on what is on screen: otherwise changing the year right after the country would drop the
  // country. A region of null means "the country's usual one", which is known once the data has loaded.
  const want = useRef<{ cc: string; region: string | null; year: number }>({ cc: initial.cc, region: initial.region, year: initial.year });

  const countryName = (countries.find(c => c[0] === data.cc) || ["", data.cc])[1];
  const regionName = (data.regions.find(r => r[0] === data.region) || ["", ""])[1];
  const place = regionName ? `${countryName} · ${regionName}` : countryName;
  const vars = { y: data.year, p: data.year - 1, c: place };
  const showEn = data.rows.some(r => r.en) && !(lang !== "en" && data.cc === home);

  // Works out the lists for a new pick. The newest pick wins if several are under way.
  async function pick(next: { cc?: string; region?: string; year?: number }) {
    const mine = ++turn.current;
    const before = want.current;
    const cc = next.cc ?? before.cc, year = next.year ?? before.year;
    // A new country starts at its usual region
    const asked = next.cc && next.cc !== before.cc ? null : next.region ?? before.region;
    want.current = { cc, region: asked, year };
    setError("");
    try {
      const D = await import("@/lib/templateData");
      let noNames = false;
      if (!(cc in names.current)) {
        // A country without a name file is remembered as such; a download that failed is not, so the next pick tries again
        try {
          const r = await fetch(`/hn/${cc.toLowerCase()}.json`);
          if (r.ok) names.current[cc] = await r.json();
          else if (r.status === 404) names.current[cc] = null;
          else noNames = true;
        } catch { noNames = true; }
      }
      if (mine !== turn.current) return;
      const regions = D.regionsOf(cc);
      const fallback = D.defaultRegion(cc);
      // A region that the country does not have is dropped
      let region = asked === null ? fallback : asked;
      if (region && !regions.some(r => r[0] === region)) region = fallback;
      want.current = { cc, region, year };
      const dates = D.holidayDates(cc, region, year);
      const file = (names.current[cc] ?? null) as Parameters<typeof D.holidayName>[0];
      const rows = dates.map(date => { const n = D.holidayName(file, date, region); return toRow(date, n.name, n.en, lang); });
      const best = D.breaksReliable(cc) ? D.bestBreaks(dates, year).map(b => breakLine(b, lang, tx.bestLine, tx.and)) : [];
      setData({ cc, region, year, regions, national: !fallback, rows, weekdays: D.onWeekdays(dates), best, gap: D.DATA_GAPS[cc] || null });
      if (noNames) setError(tx.namesFailed);
    } catch {
      if (mine === turn.current) setError(tx.failed);
    }
  }

  const notes = [
    tx.check,
    data.gap ? fill(tx["gap" + data.gap.charAt(0).toUpperCase() + data.gap.slice(1)] || "", { c: countryName }) : "",
    data.cc === "RO" ? fill(tx.noteRO || "", vars) : "",
  ].filter(Boolean);
  const checkedLine = data.year === pageYear ? checked[data.cc] || "" : "";

  const input = () => ({
    lang, year: data.year, place, rows: size,
    holidays: data.rows.map(r => ({ date: r.date, name: r.name, en: r.en })),
    months: monthNames(lang), weekdays: weekdayNames(lang, "short"), weekdayNames: weekdayNames(lang, "long"),
    notes: [...notes, checkedLine].filter(Boolean),
  });
  const fileName = (ext: string) => `${fileBase}-${data.year}-${data.cc.toLowerCase()}${data.region ? "-" + data.region.toLowerCase() : ""}.${ext}`;

  async function download(kind: "xlsx" | "pdf") {
    if (busy) return;
    setBusy(kind); setError("");
    try {
      if (kind === "xlsx") {
        const [{ buildTemplateSheets }, writer] = await Promise.all([import("@/lib/templateSheets"), import("write-excel-file/universal")]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the library types its sheets more narrowly than it accepts them
        const blob: Blob = await (writer.default as any)(buildTemplateSheets(input())).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName("xlsx"); document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const [{ templateHtml }, { downloadHtmlAsPdf }] = await Promise.all([import("@/lib/templateHtml"), import("@/lib/htmlToPdf")]);
        await downloadHtmlAsPdf(templateHtml(input(), rtl), fileName("pdf"));
      }
    } catch (e) {
      console.error(e);
      setError(tx.failed);
    } finally {
      setBusy("");
    }
  }

  return <>
    <section className="card tool" aria-label={fill(tx.h1, vars)}>
      <div className="picks">
        <label><span>{tx.country}</span>
          <select value={data.cc} onChange={e => pick({ cc: e.target.value })}>
            {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        {data.regions.length > 0 && <label><span>{tx.region}</span>
          <select value={data.region} onChange={e => pick({ region: e.target.value })}>
            {data.national && <option value="">{tx.regionNone}</option>}
            {data.regions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>}
        <label><span>{tx.year}</span>
          <select value={data.year} onChange={e => pick({ year: Number(e.target.value) })}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label><span>{tx.people}</span>
          <select value={size} onChange={e => setSize(Number(e.target.value))}>
            {SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="acts">
        <button type="button" className="go" onClick={() => download("xlsx")} disabled={!!busy} aria-busy={busy === "xlsx"}>{busy === "xlsx" ? tx.busy : tx.dlExcel}</button>
        <button type="button" className="go alt" onClick={() => download("pdf")} disabled={!!busy} aria-busy={busy === "pdf"}>{busy === "pdf" ? tx.busy : tx.dlPdf}</button>
      </div>
      <p className="fine">{tx.local}</p>
      <p className="err" role="alert">{error}</p>
    </section>

    <section className="card" aria-live="polite">
      <h2>{fill(tx.holTitle, vars)}</h2>
      <p className="sub">{fill(tx.holCount, { n: data.rows.length, w: data.weekdays })}</p>
      <div className="scroll">
        <table className="hols">
          <thead><tr><th scope="col">{tx.thDate}</th><th scope="col">{tx.thDay}</th><th scope="col">{tx.thName}</th>{showEn && <th scope="col">{tx.thEn}</th>}</tr></thead>
          <tbody>{data.rows.map(r => <tr key={r.date} className={r.weekend ? "we" : undefined}>
            <td className="dt">{r.label}</td><td>{r.day}</td><td className="nm">{r.name || r.en || "–"}</td>{showEn && <td>{r.en}</td>}
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    {data.gap !== "moved" && <section className="card">
      <h2>{fill(tx.bestTitle, vars)}</h2>
      {data.best.length > 0
        ? <><p className="sub">{tx.bestLead}</p><ul className="best">{data.best.map(line => <li key={line}>{line}</li>)}</ul></>
        : <p className="sub">{tx.bestNone}</p>}
    </section>}

    <section className="card notes">
      <h2>{tx.notesTitle}</h2>
      <ul>{notes.map(n => <li key={n}>{n}</li>)}</ul>
      <p className="fine">{tx.source}{checkedLine ? " " + checkedLine : ""}</p>
    </section>
  </>;
}
