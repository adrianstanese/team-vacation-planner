"use client";
// "Today" bento tiles at the top of a team's calendar (current year only): who's out today and when they're back,
// the next public holiday, the selected member's days left, the next coverage clash, and the Wrapped teaser.
import { outOn, backSoon, nextClash, used, keyOf, addDays, dateOf, type TeamView, type Member } from "@/lib/v3Util";
import { V } from "@/lib/v3Text";
import { dateLocale } from "@/lib/extraText";
import "./v3.css";

type Th = { tx: string; t2: string; t3: string; ac: string; al: string; sf: string; bd: string; gbg?: string; gbd?: string };
type Col = { b: string; t: string; d: string };
type HolInfo = { cc: string; local: string; en?: string; who: string[] }[];

const day = (k: string) => { try { return dateOf(k).toLocaleDateString(dateLocale(), { weekday: "short", day: "numeric", month: "short" }); } catch { return k; } };
const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function TodayTiles({ team, yr, th, colorOf, holOf, holInfo, active, threshold, onWrapped, showWrapped, onPick }: {
  team: TeamView; yr: number; th: Th; colorOf: (id: string) => Col; holOf: (m: Member) => Set<string>; holInfo: (k: string) => HolInfo;
  active: Member | null; threshold: number; onWrapped: () => void; showWrapped: boolean; onPick: (id: string) => void;
}) {
  "use memo";
  const today = keyOf(new Date());
  if (!today.startsWith(yr + "-")) return null;
  const out = outOn(team, today);
  const back = new Map(backSoon(team, today).map(b => [b.name, b.back]));
  // Next public holiday for anyone in the team (from tomorrow if today is one too, today counts)
  let nextHol: { k: string; info: HolInfo } | null = null;
  const sets = team.members.filter(m => m.country).map(m => holOf(m));
  for (let k = today, n = 0; n < 370 && k.startsWith(yr + "-"); k = addDays(k, 1), n++) {
    if (sets.some(s => s.has(k))) { const info = holInfo(k); if (info.length) { nextHol = { k, info }; break; } }
  }
  const inDays = nextHol ? Math.round((dateOf(nextHol.k).getTime() - dateOf(today).getTime()) / 864e5) : 0;
  const clash = nextClash(team, today, threshold, 30);
  const allow = active && active.pto != null ? Number(active.pto) + Number(active.carry || 0) : null;
  const left = active && allow != null ? Math.max(0, allow - used(active, yr)) : null;
  const pct = allow ? Math.min(1, (left || 0) / allow) : 0;
  const tile = { background: th.gbg || th.sf, borderColor: th.gbd || th.bd };

  return <section className="v3-tiles" aria-label={V("tdOut")}>
    <div className="v3-tile v3-t-out" style={tile}>
      <h3 style={{ color: th.t3 }}>{V("tdOut")}</h3>
      {out.length === 0 ? <p className="v3-t-big" style={{ color: th.tx }}>🙌 <span>{V("tdNone")}</span></p> : <>
        <div className="v3-faces">{out.slice(0, 5).map(m => { const c = colorOf(m.id); return <button type="button" key={m.id} className="v3-face" title={m.name} onClick={() => onPick(m.id)} style={{ background: c.b, color: c.t, borderColor: th.sf }}>{(m.name || "?").slice(0, 1).toUpperCase()}</button>; })}{out.length > 5 && <span className="v3-face" style={{ background: th.al, color: th.ac, borderColor: th.sf }}>+{out.length - 5}</span>}</div>
        <ul className="v3-t-list">{out.slice(0, 3).map(m => <li key={m.id} style={{ color: th.tx }}><b>{m.name}</b> <span style={{ color: th.t3 }}>{V("tdBack", { d: day(back.get(m.name || "?") || today) })}</span></li>)}</ul>
      </>}
    </div>
    <div className="v3-tile" style={tile}>
      <h3 style={{ color: th.t3 }}>{V("tdNext")}</h3>
      {!nextHol ? <p style={{ color: th.t2 }}>{V("tdNoHol")}</p> : <>
        <p className="v3-t-big" style={{ color: th.ac }}>{inDays === 0 ? V("tdToday") : inDays === 1 ? V("tdTomorrow") : V("tdInN", { n: inDays })}</p>
        <p style={{ color: th.tx, fontWeight: 650 }}>{nextHol.info[0].local}{nextHol.info.length > 1 ? ` +${nextHol.info.length - 1}` : ""}</p>
        <p style={{ color: th.t3 }}>{day(nextHol.k)} · {nextHol.info.map(x => x.cc).join(" ")}</p>
      </>}
    </div>
    <div className="v3-tile" style={tile}>
      <h3 style={{ color: th.t3 }}>{V("tdLeft")}{active ? ` · ${active.name}` : ""}</h3>
      {!active ? <p style={{ color: th.t2 }}>{V("tdPick")}</p> : left == null ? <p style={{ color: th.t2 }}>{V("tdNoPto")}</p> : <div className="v3-ring-row">
        <svg className="v3-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="none" stroke={th.gbd || th.bd} strokeWidth="5" /><circle cx="22" cy="22" r="18" fill="none" stroke={colorOf(active.id).d} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.round(pct * 113)} 113`} transform="rotate(-90 22 22)" /></svg>
        <p className="v3-t-big" style={{ color: th.tx }}>{fmtN(left)} <small style={{ color: th.t3 }}>{V("tdOf", { n: fmtN(allow || 0) })}</small></p>
      </div>}
    </div>
    <div className="v3-tile" style={tile}>
      <h3 style={{ color: th.t3 }}>{V("tdClash")}</h3>
      {clash ? <p className="v3-t-warn">⚠ {V("tdClashOn", { a: clash.away, d: day(clash.day) })}</p> : <p className="v3-t-ok">✓ {V("tdClashOk")}</p>}
    </div>
    {showWrapped && <button type="button" className="v3-tile v3-t-wrap" onClick={onWrapped}>
      <span className="v3-t-wrap-k">✨ {V("wrCta", { y: yr })}</span>
      <span className="v3-t-wrap-s">{V("wrCtaSub")}</span>
    </button>}
  </section>;
}
