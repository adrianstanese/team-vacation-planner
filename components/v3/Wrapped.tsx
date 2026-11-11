"use client";
// Team "Wrapped": a full-screen story of the team's year off (Spotify Wrapped style). Slides advance on their
// own (paused with reduced motion), tap right/left or use the arrow keys, hold to pause. The last slide makes a
// 1080×1920 share image on a canvas (nothing leaves the browser until the person shares or saves it).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wrappedStats, dateOf, type TeamView, type Member, type Persona } from "@/lib/v3Util";
import { V } from "@/lib/v3Text";
import { dateLocale } from "@/lib/extraText";
import "./v3.css";

const DUR = 5600;
const EMOJI: Record<Persona, string> = { summer: "☀️", winter: "❄️", weekender: "🧳", marathon: "🏃", spring: "🌸", steady: "📅" };
const PKEY: Record<Persona, string> = { summer: "pSummer", winter: "pWinter", weekender: "pWeekender", marathon: "pMarathon", spring: "pSpring", steady: "pSteady" };
const THEMES = ["w-violet", "w-lime", "w-coral", "w-ocean", "w-gold", "w-pink", "w-mint", "w-night"];

const day = (k: string) => { try { return dateOf(k).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }); } catch { return k; } };
const monthName = (i: number) => { try { return new Date(2026, i, 15).toLocaleDateString(dateLocale(), { month: "long" }); } catch { return String(i + 1); } };
const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function CountUp({ to, run }: { to: number; run: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const s = performance.now();
    const tick = (now: number) => {
      const p = reduce ? 1 : Math.min(1, (now - s) / 1400);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <>{fmtN(Math.round(n * 2) / 2)}</>;
}

export default function Wrapped({ open, onClose, team, yr, holOf, sevenDay, logo }: {
  open: boolean; onClose: () => void; team: TeamView; yr: number; holOf: (m: Member) => Set<string>; sevenDay: boolean; logo?: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { try { d.showModal(); } catch { d.setAttribute("open", ""); } }
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const c = (e: Event) => { e.preventDefault(); onClose(); };
    d.addEventListener("cancel", c);
    return () => d.removeEventListener("cancel", c);
  }, [onClose]);
  return <dialog ref={ref} className="v3-story" aria-label={V("wrCta", { y: yr })}>
    {open && <Story team={team} yr={yr} holOf={holOf} sevenDay={sevenDay} logo={logo} onClose={onClose} />}
  </dialog>;
}

function Story({ team, yr, holOf, sevenDay, logo, onClose }: { team: TeamView; yr: number; holOf: (m: Member) => Set<string>; sevenDay: boolean; logo?: string | null; onClose: () => void }) {
  const st = useMemo(() => wrappedStats(team, yr, holOf, sevenDay), [team, yr, holOf, sevenDay]);
  const reduce = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(reduce);
  const [shareMsg, setShareMsg] = useState("");
  const holdRef = useRef<{ t: number; x: number } | null>(null);
  const soFar = new Date().getFullYear() === yr && new Date().getMonth() < 11;

  const slides = useMemo(() => {
    const s: { k: string; theme: string }[] = [{ k: "intro", theme: "" }, { k: "total", theme: "" }];
    if (st.longest) s.push({ k: "longest", theme: "" });
    if (st.totalDays > 0) s.push({ k: "month", theme: "" });
    if (st.bestBridge) s.push({ k: "bridge", theme: "" });
    if (st.personas.length) s.push({ k: "personas", theme: "" });
    if (st.busiestDay && st.busiestDay.away >= 2) s.push({ k: "busiest", theme: "" });
    s.push({ k: "outro", theme: "" });
    return s.map((x, n) => ({ ...x, theme: THEMES[n % THEMES.length] }));
  }, [st]);
  const last = slides.length - 1;
  const next = useCallback(() => setI(n => Math.min(last, n + 1)), [last]);
  const prev = useCallback(() => setI(n => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (paused || i >= last) return;
    const t = setTimeout(next, DUR);
    return () => clearTimeout(t);
  }, [i, paused, last, next]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [next, prev]);

  const down = (e: React.PointerEvent) => { if ((e.target as HTMLElement).closest("button,a")) return; holdRef.current = { t: Date.now(), x: e.clientX }; setPaused(true); };
  const up = (e: React.PointerEvent) => {
    const h = holdRef.current; holdRef.current = null;
    if (!h) return;
    if (!reduce) setPaused(false);
    if (Date.now() - h.t > 350) return; // a hold only pauses
    const w = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rtl = document.documentElement.dir === "rtl" || (e.currentTarget as HTMLElement).closest("[dir=rtl]");
    const leftSide = e.clientX - w.left < w.width * 0.3;
    if (leftSide !== !!rtl) prev(); else next();
  };

  if (st.totalDays === 0) return <div className="w-slide w-violet w-on">
    <button type="button" className="w-close" onClick={onClose} aria-label={V("wrClose")}>✕</button>
    <div className="w-c"><p className="w-kick">{yr}</p><h2 className="w-huge w-grad">Wrapped</h2><p className="w-line">{V("wrNotEnough")}</p></div>
  </div>;

  const s = slides[i];
  const months = st.months, mx = Math.max(1, ...months);
  const share = async () => {
    try {
      const blob = await drawCard(team.name || "", yr, st, soFar);
      const file = new File([blob], `wrapped-${yr}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], title: V("wrCta", { y: yr }) }); return; }
      save(blob);
    } catch (e) { if ((e as Error)?.name !== "AbortError") setShareMsg("…"); }
  };
  const save = (blob: Blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `wrapped-${yr}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };

  return <div className={`w-slide ${s.theme} w-on`} key={s.k + i} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { holdRef.current = null; if (!reduce) setPaused(false); }}>
    <div className="w-blobs" aria-hidden="true"><i /><i /><i /></div>
    <div className="w-bars" aria-hidden="true">{slides.map((x, n) => <span key={x.k}><i className={n < i ? "w-full" : n === i ? (paused ? "w-run w-paused" : "w-run") : ""} style={{ animationDuration: DUR + "ms" }} /></span>)}</div>
    <div className="w-top">
      <span className="w-brand">{logo ? <img src={logo} alt="" /> : null}{team.name}</span>
      <span>
        <button type="button" className="w-ic" onClick={() => setPaused(p => !p)} aria-label={paused ? V("wrPlay") : V("wrPause")}>{paused ? "▶" : "❚❚"}</button>
        <button type="button" className="w-ic" onClick={onClose} aria-label={V("wrClose")}>✕</button>
      </span>
    </div>
    <div className="w-c" aria-live="polite">
      {s.k === "intro" && <>
        <p className="w-kick w-in1">{team.name}</p>
        <h2 className="w-huge w-grad w-in2">{yr}<br />Wrapped</h2>
        <p className="w-line w-in3">{V("wrS1")}{soFar ? ` (${V("wrSoFar")})` : ""}</p>
      </>}
      {s.k === "total" && <>
        <p className="w-kick w-in1">{V("wrS2a")}</p>
        <div className="w-num w-in2"><CountUp to={st.totalDays} run /></div>
        <p className="w-unit w-in3">{V("wrS2b")}</p>
        <p className="w-line w-in4">{V("wrS2c", { w: Math.max(1, st.weeks) })}</p>
      </>}
      {s.k === "longest" && st.longest && <>
        <p className="w-kick w-in1">{V("wrS3a")}</p>
        <h2 className="w-big w-in2">{st.longest.name}</h2>
        <div className="w-num w-in3"><CountUp to={st.longest.streak.length} run /></div>
        <p className="w-unit w-in3">{V("wrS3b")}</p>
        <p className="w-line w-in4">{day(st.longest.streak.start)} – {day(st.longest.streak.end)}</p>
      </>}
      {s.k === "month" && <>
        <p className="w-kick w-in1">{V("wrS4a")}</p>
        <h2 className="w-big w-cap w-in2">{monthName(st.topMonth)}</h2>
        <div className="w-chart w-in3" aria-hidden="true">{months.map((n, m) => <span key={m}><i className={m === st.topMonth ? "w-hot" : ""} style={{ height: `${Math.max(4, Math.round((n / mx) * 100))}%`, animationDelay: `${m * 60}ms` }} /><b>{monthName(m).slice(0, 1)}</b></span>)}</div>
        <p className="w-line w-in4">{V("wrS4c")}</p>
      </>}
      {s.k === "bridge" && st.bestBridge && <>
        <p className="w-kick w-in1">{V("wrS5a")}</p>
        <div className="w-num w-in2">{st.bestBridge.streak.leave}<span className="w-arrow">→</span>{st.bestBridge.streak.length}</div>
        <p className="w-unit w-in3">{V("wrS5b")}</p>
        <p className="w-line w-in4">{st.bestBridge.name} · {day(st.bestBridge.streak.start)} – {day(st.bestBridge.streak.end)}</p>
      </>}
      {s.k === "personas" && <>
        <p className="w-kick w-in1">{V("wrS6a")}</p>
        <ul className="w-personas">{st.personas.slice(0, 12).map((p, n) => <li key={p.name + n} style={{ animationDelay: `${200 + n * 90}ms` }}>
          <span className="w-emo" aria-hidden="true">{EMOJI[p.persona]}</span><b>{p.name}</b><small>{V(PKEY[p.persona])}</small>
        </li>)}</ul>
      </>}
      {s.k === "busiest" && st.busiestDay && <>
        <p className="w-kick w-in1">{V("wrS7a")}</p>
        <h2 className="w-big w-in2">{day(st.busiestDay.day)}</h2>
        <div className="w-num w-in3"><CountUp to={st.busiestDay.away} run /></div>
        <p className="w-unit w-in4">{V("wrS7b")}</p>
      </>}
      {s.k === "outro" && <>
        <p className="w-kick w-in1">{V("wrEnd1")}</p>
        <div className="w-sum w-in2">
          <div><b>{fmtN(st.totalDays)}</b><small>{V("wrS2b")}</small></div>
          {st.longest && <div><b>{st.longest.streak.length}</b><small>{V("wrS3b")}</small></div>}
          <div><b className="w-cap">{monthName(st.topMonth).slice(0, 3)}</b><small>{V("wrS4a")}</small></div>
          {st.bestBridge && <div><b>{st.bestBridge.streak.leave}→{st.bestBridge.streak.length}</b><small>{V("wrS5a")}</small></div>}
        </div>
        <p className="w-line w-in3">{V("wrEnd2", { y: yr + 1 })}</p>
        <div className="w-btns w-in4">
          <button type="button" className="w-btn w-btn-main" onClick={share}>↗ {V("wrShare")}</button>
          <button type="button" className="w-btn" onClick={async () => save(await drawCard(team.name || "", yr, st, soFar))}>⤓ {V("wrSave")}</button>
          <button type="button" className="w-btn" onClick={() => { setI(0); if (!reduce) setPaused(false); }}>↺ {V("wrReplay")}</button>
        </div>
        {shareMsg && <p className="w-line">{shareMsg}</p>}
      </>}
    </div>
    <div className="w-nav">
      <button type="button" className="w-ic" onClick={prev} disabled={i === 0} aria-label={V("wrPrev")}>‹</button>
      <span>{i + 1} / {slides.length}</span>
      <button type="button" className="w-ic" onClick={next} disabled={i === last} aria-label={V("wrNext")}>›</button>
    </div>
  </div>;
}

// 1080×1920 share card, drawn directly on a canvas (no external images, so it never taints)
async function drawCard(name: string, yr: number, st: ReturnType<typeof wrappedStats>, soFar: boolean): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  try { await document.fonts.ready; } catch { /* older browsers */ }
  const src = document.querySelector(".v3-story .w-kick") || document.querySelector(".v3-story") || document.body;
  const font = getComputedStyle(src).fontFamily || "system-ui, sans-serif";
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1B0B4D"); bg.addColorStop(0.55, "#4C1D95"); bg.addColorStop(1, "#BE185D");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const blob = (x: number, y: number, r: number, col: string) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H); };
  blob(180, 300, 520, "rgba(190,242,100,.55)"); blob(950, 900, 560, "rgba(56,189,248,.45)"); blob(300, 1650, 600, "rgba(251,113,133,.5)");
  g.fillStyle = "#fff"; g.textBaseline = "alphabetic";
  const fit = (txt: string, max: number, size: number, weight = 800) => { let s = size; do { g.font = `${weight} ${s}px ${font}`; s -= 4; } while (g.measureText(txt).width > max && s > 20); };
  fit(name, W - 160, 60, 700); g.globalAlpha = 0.85; g.fillText(name, 80, 190); g.globalAlpha = 1;
  g.font = `800 230px ${font}`; g.fillText(String(yr), 66, 420);
  g.font = `800 168px ${font}`; g.fillText("Wrapped", 70, 580);
  if (soFar) { g.font = `600 42px ${font}`; g.globalAlpha = 0.8; g.fillText(`(${V("wrSoFar")})`, 80, 650); g.globalAlpha = 1; }
  const rows: [string, string][] = [[fmtN(st.totalDays), V("wrS2b")]];
  if (st.longest) rows.push([String(st.longest.streak.length), V("wrS3b")]);
  rows.push([monthName(st.topMonth), V("wrS4a")]);
  if (st.bestBridge) rows.push([`${st.bestBridge.streak.leave} → ${st.bestBridge.streak.length}`, V("wrS5a")]);
  let y = 740;
  for (const [big, small] of rows) {
    g.fillStyle = "rgba(255,255,255,.13)"; roundRect(g, 64, y, W - 128, 236, 44); g.fill();
    g.fillStyle = "#fff"; fit(big, W - 230, 120, 800); g.fillText(big, 112, y + 138);
    g.font = `600 40px ${font}`; g.globalAlpha = 0.85; g.fillText(small, 114, y + 196); g.globalAlpha = 1;
    y += 266;
  }
  g.font = `700 40px ${font}`; g.globalAlpha = 0.9; g.fillText("vacationplanner.team", 80, H - 90); g.globalAlpha = 1;
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("no image"))), "image/png"));
}
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
