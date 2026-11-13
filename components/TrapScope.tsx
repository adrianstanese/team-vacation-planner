"use client";
import { useEffect, useRef } from "react";

// Dialog behaviour for any dialog it is placed in: focus moves in, Tab stays inside, Escape closes,
// and focus returns to whatever opened the dialog (WCAG 2.1.2 / 2.4.3).
// Render it anywhere inside the element that carries role="dialog" or role="alertdialog".
// Pass onClose={null} for a dialog that must be answered (Escape then does nothing).
export default function TrapScope({ onClose }: { onClose: (() => void) | null }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // The latest onClose, without re-running the trap each time the parent re-renders
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const box = ref.current && (ref.current.closest('[role="dialog"],[role="alertdialog"]') as HTMLElement | null);
    if (!box) return;
    const prev = document.activeElement as HTMLElement | null;
    const items = () => ([...box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')] as HTMLElement[])
      .filter(el => !(el as HTMLButtonElement).disabled && el.offsetParent !== null);
    if (!box.contains(document.activeElement)) {
      const f = items()[0];
      if (f) f.focus(); else { box.setAttribute("tabindex", "-1"); box.focus(); }
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); if (closeRef.current) closeRef.current(); return; }
      if (e.key !== "Tab") return;
      const it = items();
      if (!it.length) return;
      const first = it[0], last = it[it.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    box.addEventListener("keydown", key);
    return () => {
      box.removeEventListener("keydown", key);
      try { if (prev && prev.focus && document.contains(prev)) prev.focus(); } catch { /* element gone */ }
    };
  }, []);
  return <span ref={ref} hidden />;
}
