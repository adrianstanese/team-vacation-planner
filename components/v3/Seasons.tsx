"use client";
// Seasonal decorations: a light, slow particle layer over the planner that follows the season (snow in winter,
// blossom in spring, warm sun motes in summer, leaves in autumn) or, around Diwali when someone in the team is in
// India, floating lamp glows. It plays once each time the team opens: every particle crosses the screen a single
// time, then the layer stops and goes away. Never catches clicks, stays faint, skipped with reduced motion.
// Switched off in Settings (remembered in this browser).
import { useEffect, useRef, useState } from "react";

export type Skin = "snow" | "blossom" | "sun" | "leaves" | "lamps";

/** Which decoration fits today: a festival the team observes wins over the season. */
export function skinFor(today: Date, diwali: boolean): Skin {
  if (diwali) return "lamps";
  const m = today.getMonth();
  return m === 11 || m <= 1 ? "snow" : m <= 4 ? "blossom" : m <= 7 ? "sun" : "leaves";
}

type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; spin: number; rot: number; hue: number; ph: number };

export default function Seasons({ skin }: { skin: Skin }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = cv.getContext("2d"); if (!c) return;
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now(), dead = false;
    const N = skin === "sun" ? 26 : skin === "lamps" ? 18 : 30;
    const ps: P[] = [];
    const spawn = (top: boolean): P => {
      const r = skin === "snow" ? 1.5 + Math.random() * 2.6 : skin === "sun" ? 1.4 + Math.random() * 2.4 : skin === "lamps" ? 3 + Math.random() * 3 : 4 + Math.random() * 4;
      const up = skin === "sun" || skin === "lamps";
      return { x: Math.random() * w, y: top ? (up ? h + 20 : -20) : Math.random() * h, vx: (Math.random() - 0.5) * (skin === "leaves" ? 26 : 12),
        vy: up ? -(55 + Math.random() * 45) : 60 + Math.random() * (skin === "snow" ? 50 : 60), r, a: 0.35 + Math.random() * 0.45,
        spin: (Math.random() - 0.5) * 2, rot: Math.random() * 6.3, hue: Math.random(), ph: Math.random() * 6.3 };
    };
    const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); };
    fit();
    for (let i = 0; i < N; i++) { const p = spawn(true); const up = p.vy < 0; p.y = up ? h + 20 + Math.random() * h * 0.35 : -20 - Math.random() * h * 0.35; ps.push(p); }
    let left = N; const gone = new Array(N).fill(false);
    addEventListener("resize", fit);
    const leaf = ["#F59E0B", "#EA580C", "#B45309", "#DC2626"], petal = ["#FBCFE8", "#F9A8D4", "#FCE7F3"];
    function frame(t: number) {
      raf = 0; const dt = Math.min(50, t - last) / 1000; last = t;
      c!.setTransform(dpr, 0, 0, dpr, 0, 0); c!.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.ph += dt; p.x += (p.vx + Math.sin(p.ph * 1.3) * 10) * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
        if (gone[i]) continue;
        if ((p.vy > 0 && p.y > h + 30) || (p.vy < 0 && p.y < -30) || p.x < -60 || p.x > w + 60) { gone[i] = true; left--; continue; }
        c!.save(); c!.translate(p.x, p.y); c!.rotate(p.rot); c!.globalAlpha = p.a;
        if (skin === "snow") { c!.fillStyle = "#fff"; c!.shadowColor = "rgba(186,230,253,.9)"; c!.shadowBlur = 6; c!.beginPath(); c!.arc(0, 0, p.r, 0, 6.3); c!.fill(); }
        else if (skin === "blossom") { c!.fillStyle = petal[Math.floor(p.hue * petal.length)]; c!.beginPath(); c!.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, 6.3); c!.fill(); }
        else if (skin === "leaves") { c!.fillStyle = leaf[Math.floor(p.hue * leaf.length)]; c!.beginPath(); c!.moveTo(0, -p.r); c!.quadraticCurveTo(p.r, 0, 0, p.r); c!.quadraticCurveTo(-p.r, 0, 0, -p.r); c!.fill(); }
        else { const g = c!.createRadialGradient(0, 0, 0, 0, 0, p.r * (skin === "lamps" ? 3.2 : 2.6));
          g.addColorStop(0, skin === "lamps" ? "rgba(255,237,180,1)" : "rgba(254,240,138,.95)"); g.addColorStop(0.35, skin === "lamps" ? "rgba(251,146,60,.6)" : "rgba(253,224,71,.35)"); g.addColorStop(1, "rgba(251,146,60,0)");
          c!.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(p.ph * 2)); c!.fillStyle = g; c!.beginPath(); c!.arc(0, 0, p.r * (skin === "lamps" ? 3.2 : 2.6), 0, 6.3); c!.fill(); }
        c!.restore();
      }
      if (left <= 0) { dead = true; c!.clearRect(0, 0, w, h); setDone(true); return; }
      if (!dead && !document.hidden) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    const vis = () => { if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener("visibilitychange", vis);
    return () => { dead = true; cancelAnimationFrame(raf); removeEventListener("resize", fit); document.removeEventListener("visibilitychange", vis); };
  }, [skin]);
  if (done) return null;
  return <canvas ref={ref} className="tvp-seasons" aria-hidden="true" />;
}
