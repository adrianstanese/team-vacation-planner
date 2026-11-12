"use client";
// Bottom of every screen: "Recommend this tool" next to a Workoșenie card (concept A "Orbit glass").
// The Workoșenie link is nofollow (portfolio rule: no followed links between Adrian's own sites).
import { useEffect, useRef, useState } from "react";
import ShareSection from "@/components/ShareSection";
import { X } from "@/lib/extraText";
import "./workosenie.css";

export const WORKOSENIE_URL = "https://workosenie.com/";

type Th = { bg?: string; ti?: string; tx: string; t2: string; t3: string; ac: string; al: string; gbg?: string; gbd?: string; sf: string; bd: string };
type L = { q: string; name: string; sub: string; feats: string[]; cta: string; fine: string };

const LABELS: Record<string, L> = {
  en: { q: "Want to do more?", name: "Meet Workoșenie", sub: "Shift rotas, time records and every absence type for small companies, in any country.", feats: ["Rotas and swaps", "Time records", "Leave balances", "Works in any country"], cta: "Discover Workoșenie", fine: "12 months free, then €10/month per company" },
  fr: { q: "Envie d'aller plus loin ?", name: "Découvrez Workoșenie", sub: "Plannings de roulement, relevés d'heures et tous les types d'absence pour les petites entreprises, dans tous les pays.", feats: ["Roulements et échanges", "Relevés d'heures", "Soldes de congés", "Fonctionne dans tous les pays"], cta: "Découvrir Workoșenie", fine: "12 mois gratuits, puis 10 €/mois par entreprise" },
  de: { q: "Sie brauchen mehr?", name: "Workoșenie entdecken", sub: "Schichtpläne, Zeiterfassung und alle Abwesenheitsarten für kleine Firmen, in jedem Land.", feats: ["Schichtpläne und Tausch", "Zeiterfassung", "Urlaubskonten", "Für jedes Land"], cta: "Workoșenie ansehen", fine: "12 Monate kostenlos, danach 10 €/Monat pro Firma" },
  es: { q: "¿Quieres hacer más?", name: "Conoce Workoșenie", sub: "Turnos, registro horario y todos los tipos de ausencia para pequeñas empresas, en cualquier país.", feats: ["Turnos e intercambios", "Registro horario", "Saldos de vacaciones", "Funciona en cualquier país"], cta: "Descubrir Workoșenie", fine: "12 meses gratis, luego 10 €/mes por empresa" },
  pt: { q: "Quer fazer mais?", name: "Conheça o Workoșenie", sub: "Escalas de turnos, registo de horas e todos os tipos de ausência para pequenas empresas, em qualquer país.", feats: ["Escalas e trocas", "Registo de horas", "Saldos de férias", "Funciona em qualquer país"], cta: "Descobrir o Workoșenie", fine: "12 meses grátis, depois 10 €/mês por empresa" },
  ro: { q: "Vrei mai mult?", name: "Descoperă Workoșenie", sub: "Programul pe ture, pontajul și toate tipurile de absență pentru firmele mici, din orice țară.", feats: ["Ture și schimburi", "Pontaj", "Solduri de concediu", "Funcționează în orice țară"], cta: "Descoperă Workoșenie", fine: "12 luni gratuit, apoi 10 €/lună pe firmă" },
  hu: { q: "Többre van szükséged?", name: "Ismerd meg: Workoșenie", sub: "Műszakbeosztás, munkaidő-nyilvántartás és minden távolléttípus kisvállalatoknak, bármely országban.", feats: ["Beosztás és csere", "Munkaidő", "Szabadságkeret", "Bármely országban működik"], cta: "Workoșenie megnyitása", fine: "12 hónap ingyen, utána 10 €/hó cégenként" },
  sv: { q: "Vill du göra mer?", name: "Lär känna Workoșenie", sub: "Schema, tidrapporter och alla typer av frånvaro för små företag, i vilket land som helst.", feats: ["Schema och byten", "Tidrapporter", "Semestersaldon", "Fungerar i alla länder"], cta: "Upptäck Workoșenie", fine: "12 månader gratis, sedan 10 €/månad per företag" },
  it: { q: "Vuoi fare di più?", name: "Scopri Workoșenie", sub: "Turni, presenze e ogni tipo di assenza per le piccole aziende, in qualsiasi paese.", feats: ["Turni e scambi", "Presenze", "Saldi ferie", "Funziona in ogni paese"], cta: "Scopri Workoșenie", fine: "12 mesi gratis, poi 10 €/mese per azienda" },
  bg: { q: "Искате повече?", name: "Запознайте се с Workoșenie", sub: "Графици на смени, отчитане на време и всички видове отсъствия за малки фирми, във всяка държава.", feats: ["Смени и размени", "Отчитане на време", "Остатъци от отпуск", "Работи във всяка държава"], cta: "Разгледайте Workoșenie", fine: "12 месеца безплатно, после 10 €/месец на фирма" },
  ar: { q: "هل تريد المزيد؟", name: "تعرّف على Workoșenie", sub: "جداول المناوبات وسجلات الدوام وكل أنواع الغياب للشركات الصغيرة، في أي بلد.", feats: ["المناوبات والتبديل", "سجلات الدوام", "أرصدة الإجازات", "يعمل في أي بلد"], cta: "اكتشف Workoșenie", fine: "12 شهرًا مجانًا، ثم 10 € شهرياً لكل شركة" },
};

const ROTA: { n: string; s: [number, number, string][] }[] = [
  { n: "Ana", s: [[4, 38, "#FFC94A"], [62, 30, "#FFC94A"]] },
  { n: "Radu", s: [[30, 44, "#FF9254"]] },
  { n: "Ioana", s: [[0, 26, "#7DD3FC"], [52, 46, "#C4B5FD"]] },
];

export function WorkoseniePromo({ th, lang = "en" }: { th: Th; lang?: string }) {
  const l = LABELS[lang] || LABELS.en;
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
  return <div ref={ref} className={"wpo" + (dark ? " dark" : "") + (seen ? " wpo-in" : "")} dir={lang === "ar" ? "rtl" : "ltr"}>
    <section className="wpo-card" aria-labelledby="wpo-h">
      <div className="wpo-head">
        <div className="wpo-logo" aria-hidden="true">W</div>
        <div><span className="wpo-from">{X("sameMaker")}</span><h2 id="wpo-h" className="wpo-h">{l.q} <span>{l.name}</span></h2><p className="wpo-sub">{l.sub}</p></div>
      </div>
      <div className="wpo-rota" aria-hidden="true">
        {ROTA.map((r, i) => <div className="r" key={r.n}><span>{r.n}</span><div className="bar">{r.s.map(([left, w, c], k) =>
          <b key={k} style={{ left: left + "%", width: w + "%", background: c, color: c, transitionDelay: (i * 0.15 + k * 0.2) + "s" }} />)}</div></div>)}
      </div>
      <ul className="wpo-feat">{l.feats.map(f => <li key={f}>{f}</li>)}</ul>
      <div className="wpo-foot">
        <a className="wpo-cta" href={WORKOSENIE_URL} target="_blank" rel="nofollow noopener">{l.cta} <span className="arr" aria-hidden="true">→</span></a>
        <span className="wpo-fine">{l.fine}</span>
      </div>
    </section>
  </div>;
}

// Share + Workoșenie side by side (stacked on phones)
export default function BottomDuo({ th, lang = "en", compact = false }: { th: Th; lang?: string; compact?: boolean }) {
  return <div className="wpo-duo" style={compact ? { marginTop: 28 } : undefined}>
    <ShareSection th={th} lang={lang} compact={compact} />
    <WorkoseniePromo th={th} lang={lang} />
  </div>;
}
