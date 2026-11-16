"use client";
// Extras for the person pop-up (split view, app/workspace.tsx MRow): a backdrop that follows the next break's
// season and the person's photo, a countdown, the year ring with colleague overlaps, a 365-day ribbon, the
// vacation style badge, a private recharge meter, the long-weekend finder, the out-of-office text and a plain
// explanation of how the days are counted. Everything is worked out from data the planner already holds.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { V } from "@/lib/v3Text";
import { dateLocale, isRtl } from "@/lib/extraText";
import { addDays, dateOf, keyOf, streaksOf, type Member, type Streak } from "@/lib/v3Util";
import { findBridges } from "@/lib/bridges";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const short = (k: string) => { try { return dateOf(k).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }); } catch { return k; } };
const long = (k: string) => { try { return dateOf(k).toLocaleDateString(dateLocale(), { weekday: "long", day: "numeric", month: "long" }); } catch { return k; } };
const span = (a: string, b: string) => (a === b ? short(a) : short(a) + " – " + short(b));
const dayDiff = (a: string, b: string) => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 864e5);

export type Season = "summer" | "winter" | "spring" | "autumn" | "weekend" | "none";
// Each palette keeps white text readable: the lightest stop is the first one, the rest are deep
const PALETTE: Record<Season, [string, string, string]> = {
  summer: ["#F97316", "#DB2777", "#6B21A8"],
  winter: ["#0EA5E9", "#2563EB", "#312E81"],
  spring: ["#10B981", "#0D9488", "#1E3A8A"],
  autumn: ["#D97706", "#B45309", "#7C2D12"],
  weekend: ["#14B8A6", "#0E7490", "#1E3A8A"],
  none: ["#6366F1", "#4338CA", "#6D28D9"],
};

export type PopData = {
  days: string[]; hol: Set<string>; streaks: Streak[]; next: Streak | null; onBreak: boolean; season: Season;
  overlap: Map<string, string[]>; today: string;
};

/** Everything the pop-up shows about one person's year, from their days, their public holidays and the team. */
export function popData(m: Member, yr: number, holidays: string[], others: Member[], w7: boolean): PopData {
  const today = keyOf(new Date());
  const hol = new Set(holidays);
  const days = (m.days || []).filter(d => d.startsWith(yr + "-")).sort();
  const streaks = streaksOf(m, yr, hol, w7);
  const next = streaks.find(s => s.end >= today) || null;
  const onBreak = !!next && next.start <= today;
  let season: Season = "none";
  if (next) {
    const mo = Number(next.start.slice(5, 7));
    season = next.length <= 4 ? "weekend" : mo >= 6 && mo <= 8 ? "summer" : mo === 12 || mo <= 2 ? "winter" : mo <= 5 ? "spring" : "autumn";
  }
  const overlap = new Map<string, string[]>();
  for (const d of days) {
    const who = others.filter(o => o.id !== m.id && (o.days || []).includes(d)).map(o => o.name || "?");
    if (who.length) overlap.set(d, who);
  }
  return { days, hol, streaks, next, onBreak, season, overlap, today };
}

/** The average colour of a profile photo, darkened enough for white text on top; null without a photo. */
export function usePhotoTint(photo: string | null, active: boolean): string | null {
  const [tint, setTint] = useState<{ src: string; c: string } | null>(null);
  useEffect(() => {
    if (!active || !photo) return;
    let gone = false;
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = c.height = 16;
        const g = c.getContext("2d"); if (!g) return;
        g.drawImage(img, 0, 0, 16, 16);
        const px = g.getImageData(0, 0, 16, 16).data;
        let r = 0, gr = 0, b = 0, n = 0;
        for (let i = 0; i < px.length; i += 4) { r += px[i]; gr += px[i + 1]; b += px[i + 2]; n++; }
        const k = 0.62; // darken for contrast with white text
        const col = `rgb(${Math.round(r / n * k)}, ${Math.round(gr / n * k)}, ${Math.round(b / n * k)})`;
        if (!gone) setTint({ src: photo, c: col });
      } catch { /* a broken image keeps the season colours */ }
    };
    img.src = photo;
    return () => { gone = true; };
  }, [photo, active]);
  return tint && tint.src === photo ? tint.c : null;
}

/** Background of the coloured side: the photo's colour (or the member's) flowing into the season's palette. */
export function paneStyle(season: Season, tint: string | null, memberColor: string): CSSProperties {
  const p = PALETTE[season];
  const first = tint || (season === "none" ? `color-mix(in srgb, ${memberColor} 72%, #1E1B4B)` : p[0]);
  return {
    backgroundImage: `linear-gradient(rgba(15,10,40,.16), rgba(15,10,40,.16)), linear-gradient(150deg, ${first}, ${p[1]} 55%, ${p[2]})`,
    backgroundSize: "100% 100%, 220% 220%",
  };
}

/** Countdown to the next break, or "on a break now". */
export function Countdown({ d }: { d: PopData }) {
  if (!d.next) return null;
  if (d.onBreak) return <div className="tvp-cd on"><span className="tvp-cd-l">{V("cdOn")}</span><b>🌴</b><small>{V("tdBack", { d: short(addDays(d.next.end, 1)) })}</small></div>;
  const n = dayDiff(d.today, d.next.start);
  if (n > 400) return null;
  return <div className="tvp-cd" role="group" aria-label={V("cdLbl") + " " + n}>
    <span className="tvp-cd-l">{V("cdLbl")}</span>
    <span className="tvp-flip" aria-hidden="true">{String(n).split("").map((c, i) => <i key={i + c} style={{ animationDelay: i * 0.08 + "s" }}>{c}</i>)}</span>
    <small>{span(d.next.start, d.next.end)} · {d.next.length} {V("daysLbl")}</small>
  </div>;
}

/** The allowance ring with a thin outer ring of days when colleagues are away too (amber: one, red: two or more). */
export function YearRing({ d, used, allow, unit, onPick }: { d: PopData; used: number; allow: number; unit: string; onPick: (k: string) => void }) {
  const R = 54, C = 2 * Math.PI * R, pct = allow ? Math.min(1, used / allow) : used ? 1 : 0;
  const yrDays = (k: string) => dayDiff(k.slice(0, 4) + "-01-01", k);
  const arc = (k: string) => {
    const a0 = (yrDays(k) / 366) * 2 * Math.PI - Math.PI / 2, a1 = a0 + Math.max(2.4, 360 / 366) * Math.PI / 180;
    const r = 70; const p = (a: number) => `${75 + r * Math.cos(a)} ${75 + r * Math.sin(a)}`;
    return `M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}`;
  };
  const ol = [...d.overlap.entries()];
  return <div className="tvp-ring2">
    <svg viewBox="0 0 150 150" role="img" aria-label={fmt(used) + " " + unit + (ol.length ? " · " + V("olN", { n: ol.length }) : "")}>
      <circle cx="75" cy="75" r="70" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
      {ol.map(([k, who]) => <path key={k} d={arc(k)} fill="none" stroke={who.length > 1 ? "#F87171" : "#FBBF24"} strokeWidth="6" strokeLinecap="round" className="tvp-ol"
        onMouseEnter={() => onPick(k)} onClick={() => onPick(k)}><title>{short(k) + ": " + who.join(", ")}</title></path>)}
      <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="11" />
      {pct > 0 && <circle cx="75" cy="75" r={R} fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 75 75)" className="tvp-ring2-p" />}
    </svg>
    <div className="tvp-ring2-c"><b>{fmt(used)}</b><small>{unit}</small></div>
    <span className="tvp-ring2-ol">{ol.length ? V("olN", { n: ol.length }) : V("olNone")}</span>
  </div>;
}

/** Every day of the year as a thin bar: days off tall and bright, public holidays gold, weekends faint. */
export function Ribbon({ d, yr, w7, hl, pick, onPick }: { d: PopData; yr: number; w7: boolean; hl: Set<string> | null; pick: string | null; onPick: (k: string | null) => void }) {
  const all = useMemo(() => { const out: string[] = []; for (let k = yr + "-01-01"; k.startsWith(String(yr)); k = addDays(k, 1)) out.push(k); return out; }, [yr]);
  const off = new Set(d.days), rtl = isRtl();
  const kind = (k: string) => off.has(k) ? "off" : d.hol.has(k) ? "hol" : !w7 && [0, 6].includes(dateOf(k).getDay()) ? "we" : "wk";
  const H: Record<string, number> = { off: 34, hol: 22, we: 7, wk: 4 };
  const at = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let i = Math.floor((e.clientX - r.left) / r.width * all.length); if (rtl) i = all.length - 1 - i;
    onPick(all[Math.max(0, Math.min(all.length - 1, i))]);
  };
  const months = Array.from({ length: 12 }, (_, i) => new Date(yr, i + 1, 0).getDate());
  const info = pick && pick.startsWith(String(yr)) ? pick : null;
  const infoKind = info ? kind(info) : null;
  const who = info ? (d.overlap.get(info) || []) : [];
  return <div className="tvp-rb">
    <span className="tvp-rb-l">{V("rbLbl")}</span>
    <svg viewBox={`0 0 ${all.length} 36`} preserveAspectRatio="none" onMouseMove={at} onMouseLeave={() => onPick(null)} onClick={at} aria-hidden="true" style={rtl ? { transform: "scaleX(-1)" } : undefined}>
      {all.map((k, i) => { const t = kind(k), h = hl && hl.has(k) ? 30 : H[t];
        return <rect key={k} x={i} y={36 - h} width="1.05" height={h} rx="0.5"
          fill={hl && hl.has(k) ? "#67E8F9" : t === "off" ? "#fff" : t === "hol" ? "#FCD34D" : t === "we" ? "rgba(255,255,255,.32)" : "rgba(255,255,255,.18)"} opacity={info && k === info ? 1 : undefined} />; })}
      {info && <rect x={all.indexOf(info) - 0.5} y="0" width="2" height="36" fill="#fff" opacity=".9" />}
    </svg>
    <div className="tvp-rb-m" aria-hidden="true">{months.map((n, i) => <span key={i} style={{ flexGrow: n }}>{mInitial(i)}</span>)}</div>
    <p className="tvp-rb-i" aria-live="polite">{info ? <>{short(info)} · {infoKind === "off" ? V("rbOff") : infoKind === "hol" ? V("hmHol") : infoKind === "we" ? V("hmWe") : V("wkLbl")}{infoKind === "off" ? " · " + (who.length ? V("rbAlso", { names: who.join(", ") }) : V("rbAlone")) : ""}</> : " "}</p>
  </div>;
}
const mInitial = (k: number) => { try { const s = new Date(2024, k, 15).toLocaleDateString(dateLocale(), { month: "short" }); return /^\d/.test(s) ? String(k + 1) : Array.from(s)[0].toUpperCase(); } catch { return String(k + 1); } };

/** A playful badge that sums up how the person plans their year. */
export function StyleBadge({ d, used }: { d: PopData; used: number }) {
  let ic = "🧭", name = V("pSteady"), desc = V("dSteady");
  const n = d.days.length;
  const months = new Set(d.days.map(k => k.slice(5, 7)));
  const share = (ms: string[]) => n ? d.days.filter(k => ms.includes(k.slice(5, 7))).length / n : 0;
  const best = d.streaks.filter(s => s.leave > 0 && s.length >= 4).sort((a, b) => b.length / b.leave - a.length / a.leave)[0];
  const longest = d.streaks.reduce((x, s) => Math.max(x, s.length), 0);
  if (!used) { ic = "🌱"; name = V("pFresh"); desc = V("dFresh"); }
  else if (best && best.length / best.leave >= 2.5) { ic = "🧩"; name = V("pBridge"); desc = V("dBridge", { a: best.leave, b: best.length }); }
  else if (longest >= 10) { ic = "✈️"; name = V("pLong"); desc = V("dLong", { n: longest }); }
  else if (share(["06", "07", "08"]) >= 0.6) { ic = "☀️"; name = V("pSummer"); desc = V("dSummer"); }
  else if (share(["12", "01", "02"]) >= 0.5) { ic = "❄️"; name = V("pWinter"); desc = V("dWinter"); }
  else if (share(["03", "04", "05"]) >= 0.5) { ic = "🌸"; name = V("pSpring"); desc = V("dSpring"); }
  else if (months.size >= 6) { ic = "🌈"; name = V("pEven"); desc = V("dEven", { n: months.size }); }
  return <div className="tvp-style"><span className="tvp-style-ic" aria-hidden="true">{ic}</span><div><small>{V("psLbl")}</small><b>{name}</b><span>{desc}</span></div></div>;
}

/** Private battery: drains about 7% for every working week since the last break of 3 days or more. */
export function Recharge({ d, yr, onLow }: { d: PopData; yr: number; onLow: () => void }) {
  if (Number(d.today.slice(0, 4)) !== yr) return null;
  let level = 100, label = V("rcFull");
  if (d.onBreak) label = V("rcOn");
  else {
    const past = d.streaks.filter(s => s.end < d.today && s.length >= 3).pop();
    const from = past ? past.end : yr + "-01-01";
    const weeks = Math.floor(dayDiff(from, d.today) / 7);
    level = Math.max(4, Math.min(100, 100 - weeks * 7));
    if (weeks > 0) label = V("rcWeeks", { n: weeks });
  }
  const col = level > 60 ? "#4ADE80" : level > 30 ? "#FBBF24" : "#F87171";
  return <div className="tvp-rc">
    <div className="tvp-rc-h"><span>{V("rcLbl")}</span><small>🔒 {V("rcPriv")}</small></div>
    <div className="tvp-rc-bat" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level} aria-label={V("rcLbl")}><i style={{ width: level + "%", background: col }} /><b>{level}%</b></div>
    <small>{label}</small>
    {level <= 30 && <button type="button" className="tvp-rc-go" onClick={onLow}>{V("rcLow")}</button>}
  </div>;
}

/** Long-weekend finder: choose how many days to spend; the best stretches around public holidays come up. */
export function LongWeekend({ m, yr, d, w7, holidays, onHover, onBook, blocked }: {
  m: Member; yr: number; d: PopData; w7: boolean; holidays: string[]; onHover: (s: Set<string> | null) => void; onBook: (days: string[]) => void; blocked: string;
}) {
  const [n, setN] = useState(2);
  const thisYear = Number(d.today.slice(0, 4)) === yr;
  const all = useMemo(() => findBridges({ year: yr, holidays: [...holidays, ...holidays.map(k => k.replace(/^\d{4}/, String(yr + 1)))], booked: m.days || [], sevenDay: w7, today: thisYear ? d.today : "", maxTake: 5, limit: 60 }), [yr, holidays, m.days, w7, thisYear, d.today]);
  const fit = all.filter(b => b.cost === n);
  const list = (fit.length ? fit : all.filter(b => b.cost <= n)).sort((a, b) => b.length - a.length || a.from.localeCompare(b.from)).slice(0, 3);
  const spanSet = (b: { from: string; to: string }) => { const s = new Set<string>(); for (let k = b.from; k <= b.to; k = addDays(k, 1)) s.add(k); return s; };
  return <section className="tvp-pp-sec tvp-lw" id={"tvp-lw-" + m.id}>
    <h3>{V("lwTitle")}</h3>
    <label className="tvp-lw-sl"><span>{V("lwSpend", { n })}</span>
      <input type="range" min={1} max={5} step={1} value={n} onChange={e => setN(Number(e.target.value))} aria-valuetext={V("lwSpend", { n })} /></label>
    {list.length ? <ul className="tvp-lw-l">{list.map(b => <li key={b.from + b.cost} onMouseEnter={() => onHover(spanSet(b))} onMouseLeave={() => onHover(null)} onFocus={() => onHover(spanSet(b))} onBlur={() => onHover(null)}>
      <div><b>{V("lwGet", { a: b.cost, b: b.length })}</b><small>{span(b.from, b.to)}</small></div>
      <button type="button" disabled={!!blocked} title={blocked || undefined} onClick={() => { onBook(b.take); onHover(null); }}>{V("lwBook")}</button>
    </li>)}</ul> : <p className="tvp-lw-none">{V("lwNone")}</p>}
  </section>;
}

/** Writes the out-of-office reply for one of the person's coming breaks, with an optional colleague who covers. */
export function AwayMessage({ m, d, others }: { m: Member; d: PopData; others: Member[] }) {
  const coming = d.streaks.filter(s => s.end >= d.today);
  const [i, setI] = useState(0);
  const [who, setWho] = useState("");
  const [copied, setCopied] = useState(false);
  const s = coming[Math.min(i, coming.length - 1)];
  if (!s) return <section className="tvp-pp-sec"><h3>{V("ooTitle")}</h3><p className="tvp-lw-none">{V("ooNone")}</p></section>;
  const booked = d.days.filter(k => k >= s.start && k <= s.end);
  const from = booked[0] || s.start, to = booked[booked.length - 1] || s.end;
  const cover = others.find(o => o.id === who);
  const text = V("ooTpl", { from: long(from), to: long(to), back: long(addDays(s.end, 1)) }) + (cover ? " " + V("ooUrgent", { who: cover.name || "" }) : "") + "\n\n" + V("ooBye") + "\n" + (m.name || "");
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { const ta = document.getElementById("tvp-oo-" + m.id) as HTMLTextAreaElement | null; if (ta) { ta.focus(); ta.select(); } } };
  return <section className="tvp-pp-sec tvp-oo">
    <h3>{V("ooTitle")}</h3>
    <div className="tvp-two">
      <label className="tvp-fld"><span>{V("ooFor")}</span><select value={i} onChange={e => setI(Number(e.target.value))}>{coming.map((c, k) => <option key={c.start} value={k}>{span(c.start, c.end)}</option>)}</select></label>
      <label className="tvp-fld"><span>{V("ooWho")}</span><select value={who} onChange={e => setWho(e.target.value)}><option value="">{V("ooNobody")}</option>{others.filter(o => o.id !== m.id).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
    </div>
    <textarea id={"tvp-oo-" + m.id} readOnly value={text} rows={5} onFocus={e => e.currentTarget.select()} />
    <button type="button" className="tvp-oo-copy" onClick={copy}>{copied ? "✓ " + V("ooCopied") : V("ooCopy")}</button>
  </section>;
}

/** "How is this counted?": the allowance sum in plain words. */
export function CountHelp({ pto, carry, used, yr, holN, country, half }: { pto: number; carry: number; used: number; yr: number; holN: number; country: string; half: boolean }) {
  const left = Math.round((pto + carry - used) * 10) / 10;
  return <details className="tvp-ru"><summary>{V("ruHow")}</summary>
    <ul>
      <li>{V("ruAllow", { n: fmt(pto) })}</li>
      {carry ? <li>{V("ruCarry", { n: fmt(carry), y: yr - 1 })}</li> : null}
      <li>{V("ruBooked", { n: fmt(used) })}</li>
      <li><b>{left >= 0 ? V("ruLeft", { n: fmt(left) }) : V("ruOver", { n: fmt(-left) })}</b></li>
    </ul>
    {country ? <p>{V("ruHol", { n: holN, c: country })}</p> : null}
    {half ? <p>{V("ruHalf")}</p> : null}
  </details>;
}
