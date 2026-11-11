// Motion helpers: view transitions, a small celebration burst and a haptic tick. All of them do nothing
// when the person asked their device to reduce motion, or when the browser lacks the feature.
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

// Runs `update` inside a view transition. `dir` lets CSS slide ("next" / "prev") or morph ("open" / "home").
export function withTransition(update: () => void, dir = "") {
  const d = typeof document !== "undefined" ? (document as VTDoc) : null;
  if (!d || !d.startViewTransition || reduced()) { update(); return; }
  const html = d.documentElement;
  html.dataset.vt = dir || "view";
  html.classList.add("tvp-vt");
  try {
    const t = d.startViewTransition(update);
    t.finished.finally(() => { html.classList.remove("tvp-vt"); delete html.dataset.vt; });
  } catch { html.classList.remove("tvp-vt"); delete html.dataset.vt; update(); }
}

// A short confetti burst from an element (or the screen centre), made of a few absolutely placed dots
export function celebrate(from?: Element | null) {
  if (typeof document === "undefined" || reduced()) return;
  const r = from?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : innerHeight / 2;
  const layer = document.createElement("div");
  layer.className = "tvp-confetti";
  layer.setAttribute("aria-hidden", "true");
  const colors = ["#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#F43F5E"];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement("i");
    const a = (Math.PI * 2 * i) / 28 + Math.random() * 0.4, v = 70 + Math.random() * 90;
    p.style.left = x + "px"; p.style.top = y + "px"; p.style.background = colors[i % colors.length];
    if (i % 3 === 0) p.style.borderRadius = "50%";
    layer.appendChild(p);
    p.animate([
      { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * v}px), calc(-50% + ${Math.sin(a) * v - 40}px)) scale(.9) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * v * 1.2}px), calc(-50% + ${Math.sin(a) * v + 90}px)) scale(.6) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1700);
}

// A tiny haptic tick on phones that support it (Android); silent elsewhere
export function buzz(ms = 8) {
  if (reduced()) return;
  try { (navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate?.(ms); } catch { /* not allowed */ }
}
