"use client";
// Guided first visit: a few spotlight bubbles shown once after someone joins or signs in to a team (and again from
// "Show me around"). Each step points at an element found by a CSS selector; when it is not on screen (for
// example the member list on a phone) the bubble sits in the middle instead.
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { V } from "@/lib/v3Text";
import { isRtl } from "@/lib/extraText";

export type TourStep = { sel: string; title: string; body: string };
type Box = { x: number; y: number; w: number; h: number } | null;

const find = (sel: string): HTMLElement | null => {
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width && r.height) return el;
  const c = el.firstElementChild as HTMLElement | null; // display: contents wrappers
  return c && c.getBoundingClientRect().width ? c : null;
};

export default function Tour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box>(null);
  const step = steps[i];
  const measure = useCallback(() => {
    const el = step ? find(step.sel) : null;
    if (!el) { setBox(null); return; }
    const r = el.getBoundingClientRect();
    setBox(r.bottom < 0 || r.top > innerHeight ? null : { x: r.left, y: r.top, w: r.width, h: r.height });
  }, [step]);
  useLayoutEffect(() => {
    const el = step ? find(step.sel) : null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const f = requestAnimationFrame(measure), t = setTimeout(measure, 380);
    return () => { cancelAnimationFrame(f); clearTimeout(t); };
  }, [step, measure]);
  useEffect(() => {
    const on = () => measure();
    addEventListener("resize", on); addEventListener("scroll", on, true);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onDone(); else if (e.key === "ArrowRight") next(); }; // Enter already presses the focused button
    addEventListener("keydown", key);
    return () => { removeEventListener("resize", on); removeEventListener("scroll", on, true); removeEventListener("keydown", key); };
  });
  if (!step) return null;
  const last = i === steps.length - 1;
  function next() { if (last) onDone(); else setI(i + 1); }
  const pad = 8, W = Math.min(320, innerWidth - 32);
  let bx = (innerWidth - W) / 2, by = innerHeight / 2 - 90;
  if (box) {
    bx = Math.max(16, Math.min(innerWidth - W - 16, box.x + box.w / 2 - W / 2));
    by = box.y + box.h + pad + 14;
    if (by + 190 > innerHeight) by = Math.max(16, box.y - pad - 14 - 190);
  }
  return <div className="tvp-tour" role="dialog" aria-modal="true" aria-label={step.title} dir={isRtl() ? "rtl" : "ltr"}>
    {box ? <div className="tvp-tour-hole" style={{ left: box.x - pad, top: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2 }} /> : <div className="tvp-tour-dim" />}
    <div className="tvp-tour-b" style={{ left: bx, top: by, width: W }}>
      <span className="tvp-tour-n">{V("trStep", { a: i + 1, b: steps.length })}</span>
      <b>{step.title}</b>
      <p>{step.body}</p>
      <div className="tvp-tour-a">
        {!last && <button type="button" className="sk" onClick={onDone}>{V("trSkip")}</button>}
        <button type="button" className="go" autoFocus onClick={next}>{last ? V("trDone") : V("trNext")}</button>
      </div>
    </div>
  </div>;
}

/** The planner's own tour: calendar, your card, exports, inviting the team. */
export function plannerSteps(): TourStep[] {
  return [
    { sel: "[data-tour=cal]", title: V("tr1t"), body: V("tr1b") },
    { sel: ".tvp-cap.on", title: V("tr2t"), body: V("tr2b") },
    { sel: "[data-tour=exp]", title: V("tr3t"), body: V("tr3b") },
    { sel: "[data-tour=share]", title: V("tr4t"), body: V("tr4b") },
  ];
}
