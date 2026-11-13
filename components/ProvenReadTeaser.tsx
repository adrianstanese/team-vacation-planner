"use client";
// Front page, next to the Workoșenie card: a teaser for ProvenRead, the newest tool from the same maker.
// It is in beta and not public yet, so the card carries a badge and no link (add one, rel="nofollow noopener",
// when the product has its own address: portfolio rule, no followed links between Adrian's own sites).
// Wording: "acknowledged" and "evidence", never "signed" or "legally binding".
import { useEffect, useRef, useState } from "react";
import { X, isRtl } from "@/lib/extraText";
import "./workosenie.css";

type Th = { bg?: string };
// The three rungs of the product's promise, drawn as a small ladder (the numbers are an illustration)
const LADDER: [string, number, string][] = [["prS1", 100, "#F0ABFC"], ["prS2", 84, "#C4B5FD"], ["prS3", 68, "#A5B4FC"]];

export default function ProvenReadTeaser({ th, lang = "en" }: { th: Th; lang?: string }) {
  const dark = /#13111C|#1A1625|#0B0F1A/i.test(String(th.bg || ""));
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (typeof IntersectionObserver === "undefined") { const t = setTimeout(() => setSeen(true), 0); return () => clearTimeout(t); }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={"wpo prt" + (dark ? " dark" : "") + (seen ? " wpo-in" : "")} dir={isRtl(lang) ? "rtl" : "ltr"}>
    <section className="wpo-card" aria-labelledby="prt-h">
      <div className="wpo-head">
        <div className="wpo-logo" aria-hidden="true">P</div>
        <div><span className="wpo-from">{X("sameMaker")}</span><h2 id="prt-h" className="wpo-h">{X("prQ")} <span>ProvenRead</span></h2><p className="wpo-sub">{X("prSub")}</p></div>
      </div>
      <div className="wpo-rota prt-ladder" role="img" aria-label={LADDER.map(([k]) => X(k)).join(" → ")}>
        {LADDER.map(([k, pct, c], i) => <div className="r" key={k}><span>{X(k)}</span><div className="bar"><b style={{ insetInlineStart: 0, width: pct + "%", background: c, color: c, transitionDelay: (i * 0.2) + "s" }} /></div><em>{pct}%</em></div>)}
      </div>
      <ul className="wpo-feat">{["prF1", "prF2", "prF3"].map(k => <li key={k}>{X(k)}</li>)}</ul>
      <div className="wpo-foot"><span className="prt-beta">{X("prBeta")}</span></div>
    </section>
  </div>;
}
