"use client";
// Holiday globe: a slowly turning dot-matrix Earth (land points from public/geo/land-dots.json, the same Natural Earth
// set Hourora uses) that lights up the countries where someone in the team has a public holiday in the chosen month.
// Beside it, the month's holidays with who is off. Drag to turn; click a holiday to fly there. Reduced motion: still.
import { useEffect, useMemo, useRef, useState } from "react";
import { V } from "@/lib/v3Text";
import { dateLocale, isRtl } from "@/lib/extraText";
import { dateOf } from "@/lib/v3Util";

type Vec = [number, number, number];
export type GlobeHol = { cc: string; local: string; en?: string; who: string[] };
const RAD = Math.PI / 180;
const unit = (lon: number, lat: number): Vec => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Approximate centres of the planner's countries [lat, lon]
const CENTRE: Record<string, [number, number]> = {
  AL: [41.1, 20.2], AD: [42.5, 1.6], AT: [47.5, 14.6], BY: [53.7, 28], BE: [50.5, 4.5], BA: [43.9, 17.7], BG: [42.7, 25.5], HR: [45.1, 15.2], CY: [35.1, 33.4],
  CZ: [49.8, 15.5], DK: [56.3, 9.5], EE: [58.6, 25], FI: [61.9, 25.7], FR: [46.2, 2.2], DE: [51.2, 10.4], GR: [39.1, 21.8], HU: [47.2, 19.5], IS: [64.9, -19],
  IE: [53.4, -8.2], IT: [41.9, 12.6], XK: [42.6, 20.9], LV: [56.9, 24.6], LI: [47.2, 9.6], LT: [55.2, 23.9], LU: [49.8, 6.1], MT: [35.9, 14.4], MD: [47.4, 28.4],
  MC: [43.7, 7.4], ME: [42.7, 19.4], NL: [52.1, 5.3], MK: [41.6, 21.7], NO: [60.5, 8.5], PL: [51.9, 19.1], PT: [39.4, -8.2], RO: [45.9, 25], SM: [43.9, 12.5],
  RS: [44, 21], SK: [48.7, 19.7], SI: [46.2, 15], ES: [40.5, -3.7], SE: [60.1, 18.6], CH: [46.8, 8.2], TR: [39, 35.2], UA: [48.4, 31.2], GB: [54, -2.5],
  SA: [23.9, 45.1], AE: [23.4, 53.8], CL: [-35.7, -71.5], BR: [-14.2, -51.9], MA: [31.8, -7.1], KZ: [48, 66.9], BH: [26, 50.6], US: [39.5, -98.4],
  CA: [56.1, -106.3], AU: [-25.3, 133.8], CN: [35.9, 104.2], IN: [21, 78.5], BD: [23.7, 90.4], RU: [58, 60], PK: [30.4, 69.3], JP: [36.2, 138.3],
};

let LAND: Float32Array | null = null;
let landP: Promise<Float32Array> | null = null;
function loadLand(): Promise<Float32Array> {
  if (LAND) return Promise.resolve(LAND);
  landP ||= fetch("/geo/land-dots.json").then(r => r.json()).then((p: number[]) => {
    const out = new Float32Array((p.length / 2) * 3);
    for (let i = 0, j = 0; i < p.length; i += 2, j += 3) { const v = unit(p[i], p[i + 1]); out[j] = v[0]; out[j + 1] = v[1]; out[j + 2] = v[2]; }
    return (LAND = out);
  }).catch(() => { landP = null; return new Float32Array(0); });
  return landP;
}

type Item = { key: string; groups: GlobeHol[] };
type Country = { c: string; n: string; f: string };

export default function HolidayGlobe({ yr, countries, holInfo, teamCountries, countryList }: {
  yr: number; countries: string[]; holInfo: (k: string) => GlobeHol[]; teamCountries: string[]; countryList: Country[];
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getFullYear() === yr ? now.getMonth() : 0);
  const [focus, setFocus] = useState<string | null>(null);
  const cv = useRef<HTMLCanvasElement | null>(null);
  const focusRef = useRef<string | null>(null);
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const n = new Date(yr, month + 1, 0).getDate();
    for (let d = 1; d <= n; d++) {
      const key = `${yr}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const g = holInfo(key).filter(x => countries.includes(x.cc));
      if (g.length) out.push({ key, groups: g });
    }
    return out;
  }, [yr, month, holInfo, countries]);
  const lit = useMemo(() => [...new Set(items.flatMap(i => i.groups.map(g => g.cc)))], [items]);
  const litRef = useRef(lit);
  // Redraw request from outside the animation loop (with reduced motion the loop stops after each frame)
  const reqRef = useRef<() => void>(() => {});
  useEffect(() => { litRef.current = lit; reqRef.current(); }, [lit]);
  const teamRef = useRef(teamCountries); useEffect(() => { teamRef.current = teamCountries; }, [teamCountries]);
  const name = (cc: string) => (countryList.find(c => c.c === cc) || { n: cc }).n;

  // The globe itself: one canvas, its own animation loop, paused when off screen or the tab is hidden
  useEffect(() => {
    const canvas = cv.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lon = 15, lat = 28, w = 0, h = 0, dpr = 1, raf = 0, last = performance.now(), visible = true, dead = false, held = false;
    let dots = LAND || new Float32Array(0);
    let move: { from: [number, number]; to: [number, number]; start: number; ms: number } | null = null;
    let drag: { x: number; y: number; lon: number; lat: number } | null = null;
    let lastFocus: string | null = null;
    void loadLand().then(d => { dots = d; req(); });
    const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); req(); };
    const ro = new ResizeObserver(fit); ro.observe(canvas); fit();
    const io = new IntersectionObserver(es => { visible = es.some(x => x.isIntersecting); if (visible) req(); }); io.observe(canvas);
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY, lon, lat }; move = null; try { canvas.setPointerCapture(e.pointerId); } catch { /* ok */ } };
    const mv = (e: PointerEvent) => { if (!drag) return; const R = Math.min(w, h) * 0.42; lon = drag.lon - (e.clientX - drag.x) / R * 57; lat = Math.max(-55, Math.min(60, drag.lat + (e.clientY - drag.y) / R * 57)); req(); };
    const up = () => { drag = null; };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", mv); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    const enter = () => { held = true; }, leave = () => { held = false; req(); };
    canvas.addEventListener("pointerenter", enter); canvas.addEventListener("pointerleave", leave);
    function req() { if (!raf && !dead) raf = requestAnimationFrame(frame); }
    reqRef.current = req;
    function frame(t: number) {
      raf = 0; const dt = Math.min(64, t - last); last = t;
      const f = focusRef.current;
      if (f !== lastFocus) {
        lastFocus = f;
        const c = f ? CENTRE[f] : null;
        if (c) { let dl = ((c[1] - 20 - lon) % 360 + 360) % 360; if (dl > 180) dl -= 360; const to: [number, number] = [lon + dl, Math.max(-30, Math.min(45, c[0] * 0.7))]; move = reduce ? null : { from: [lon, lat], to, start: t, ms: 1400 }; if (reduce) { lon = to[0]; lat = to[1]; } }
      }
      if (move) { const k = Math.min(1, (t - move.start) / move.ms), e = ease(k); lon = move.from[0] + (move.to[0] - move.from[0]) * e; lat = move.from[1] + (move.to[1] - move.from[1]) * e; if (k >= 1) move = null; }
      else if (!reduce && !drag && !held && !focusRef.current) lon += 4 * dt / 1000;
      draw(t);
      if (visible && !document.hidden && (!reduce || move)) req();
    }
    function draw(t: number) {
      const c = ctx!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      if (!w || !h) return;
      const R = Math.min(w, h) * 0.42, cx = w / 2, cy = h / 2;
      const centre = unit(lon, lat);
      const e: Vec = [-Math.sin(lon * RAD), Math.cos(lon * RAD), 0];
      const n: Vec = [-Math.sin(lat * RAD) * Math.cos(lon * RAD), -Math.sin(lat * RAD) * Math.sin(lon * RAD), Math.cos(lat * RAD)];
      const pr = (v: Vec): [number, number, number] => [cx + dot(v, e) * R, cy - dot(v, n) * R, dot(v, centre)];
      // halo and body
      const halo = c.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.45);
      halo.addColorStop(0, "rgba(167,139,250,.35)"); halo.addColorStop(0.4, "rgba(56,189,248,.12)"); halo.addColorStop(1, "rgba(56,189,248,0)");
      c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, R * 1.45, 0, Math.PI * 2); c.fill();
      const body = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, "#3B2D8F"); body.addColorStop(0.6, "#1B1650"); body.addColorStop(1, "#0A0828");
      c.fillStyle = body; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(196,181,253,.35)"; c.lineWidth = 1; c.stroke();
      // land dots, brighter towards the viewer
      const s0 = Math.max(1.1, R / 120);
      for (let i = 0; i < dots.length; i += 3) {
        const v: Vec = [dots[i], dots[i + 1], dots[i + 2]], z = dot(v, centre);
        if (z <= 0.03) continue;
        c.fillStyle = `rgba(165,180,252,${0.12 + z * 0.55})`;
        const s = s0 * (0.6 + 0.5 * z); c.fillRect(cx + dot(v, e) * R - s / 2, cy - dot(v, n) * R - s / 2, s, s);
      }
      // team countries: small cyan points; countries with a holiday this month: gold beacons
      const litSet = new Set(litRef.current);
      for (const cc of teamRef.current) {
        const p = CENTRE[cc]; if (!p || litSet.has(cc)) continue;
        const [x, y, z] = pr(unit(p[1], p[0])); if (z <= 0.05) continue;
        c.fillStyle = `rgba(103,232,249,${0.5 + z * 0.4})`; c.beginPath(); c.arc(x, y, 2.4, 0, Math.PI * 2); c.fill();
      }
      let i0 = 0;
      for (const cc of litSet) {
        const p = CENTRE[cc]; if (!p) continue;
        const [x, y, z] = pr(unit(p[1], p[0])); i0++; if (z <= 0.05) continue;
        const edge = Math.min(1, (z - 0.05) / 0.25), on = focusRef.current === cc;
        for (const k of [0, 0.5]) {
          const ph = reduce ? 0.4 : ((t / (on ? 1600 : 2600) + k + i0 * 0.17) % 1);
          c.strokeStyle = `rgba(252,211,77,${(1 - ph) * 0.8 * edge})`; c.lineWidth = 1.4;
          c.beginPath(); c.arc(x, y, (on ? 6 : 4) + ph * (on ? 22 : 13), 0, Math.PI * 2); c.stroke();
        }
        const g = c.createRadialGradient(x, y, 0, x, y, on ? 10 : 7);
        g.addColorStop(0, `rgba(254,243,199,${edge})`); g.addColorStop(0.5, `rgba(252,211,77,${0.85 * edge})`); g.addColorStop(1, "rgba(252,211,77,0)");
        c.fillStyle = g; c.beginPath(); c.arc(x, y, on ? 10 : 7, 0, Math.PI * 2); c.fill();
        if (on) { c.font = "700 12px system-ui, -apple-system, Segoe UI, sans-serif"; c.fillStyle = "#FEF3C7"; c.textAlign = "center"; c.fillText(cc, x, y - 16); }
      }
      // specular highlight
      const spec = c.createRadialGradient(cx - R * 0.45, cy - R * 0.5, 0, cx - R * 0.45, cy - R * 0.5, R * 0.9);
      spec.addColorStop(0, "rgba(255,255,255,.10)"); spec.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = spec; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    }
    const onVis = () => { if (!document.hidden) req(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", mv); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerenter", enter); canvas.removeEventListener("pointerleave", leave); };
  }, []);
  useEffect(() => { focusRef.current = focus; reqRef.current(); }, [focus]);

  const mName = new Date(yr, month, 15).toLocaleDateString(dateLocale(), { month: "long", year: "numeric" });
  const rtl = isRtl();
  return <section className="tvp-globe" aria-label={V("glTitle")}>
    <div className="tvp-globe-stage"><canvas ref={cv} aria-hidden="true" /><span className="tvp-globe-hint">{V("glDrag")}</span></div>
    <div className="tvp-globe-side">
      <div className="tvp-globe-head">
        <div><span className="tvp-globe-k">{V("glTitle")}</span><b>{mName}</b></div>
        <span className="tvp-globe-nav">
          <button type="button" onClick={() => { setFocus(null); setMonth(m => Math.max(0, m - 1)); }} disabled={month === 0} aria-label={V("glPrev")}>{rtl ? "›" : "‹"}</button>
          <button type="button" onClick={() => { setFocus(null); setMonth(m => Math.min(11, m + 1)); }} disabled={month === 11} aria-label={V("glNext")}>{rtl ? "‹" : "›"}</button>
        </span>
      </div>
      <span className="tvp-globe-sum">{items.length ? V("glSum", { n: items.length, c: lit.length }) : V("glNone")}</span>
      <ul className="tvp-globe-list">
        {items.map(it => {
          const d = dateOf(it.key);
          return it.groups.map((g, gi) => <li key={it.key + g.cc + gi}>
            <button type="button" className={focus === g.cc ? "on" : ""} onClick={() => setFocus(f => (f === g.cc ? null : g.cc))}>
              <span className="tvp-globe-date"><b>{d.getDate()}</b><small>{d.toLocaleDateString(dateLocale(), { weekday: "short" })}</small></span>
              <span className="tvp-globe-txt">
                <span className="tvp-globe-hn"><img src={"/flags/" + g.cc + ".svg"} alt="" width={14} height={14} className="tvp-flag" />{g.local}</span>
                <small>{name(g.cc)}{g.en && g.en !== g.local ? " · " + g.en : ""}</small>
                <small className="tvp-globe-who">🌴 {g.who.join(", ")}</small>
              </span>
            </button>
          </li>);
        })}
      </ul>
    </div>
  </section>;
}
