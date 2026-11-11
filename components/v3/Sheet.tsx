"use client";
// Native <dialog> shown with showModal(): top layer, focus trap, Escape and ::backdrop come from the browser.
// Bottom sheet on phones (drag the handle down to close), centred card on wider screens. Entry/exit animations
// use @starting-style in v3.css; reduced motion turns them off.
import { useEffect, useRef, type ReactNode } from "react";
import "./v3.css";

type Th = { tx: string; t2: string; t3: string; ac: string; sf: string; bd: string; gbg?: string; gbd?: string };

export default function Sheet({ open, onClose, title, th, children, wide = false, dark = false, label }: {
  open: boolean; onClose: () => void; title?: ReactNode; th: Th; children: ReactNode; wide?: boolean; dark?: boolean; label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { try { d.showModal(); } catch { d.setAttribute("open", ""); } }
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);
  const onBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => { if (e.target === ref.current) onClose(); };
  const down = (e: React.PointerEvent) => { drag.current = { y: e.clientY, dy: 0 }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    ref.current.style.translate = `0 ${drag.current.dy}px`;
  };
  const up = () => {
    if (!drag.current || !ref.current) return;
    const far = drag.current.dy > 90;
    ref.current.style.translate = "";
    drag.current = null;
    if (far) onClose();
  };
  return <dialog ref={ref} className={`v3-sheet${wide ? " v3-wide" : ""}${dark ? " v3-dark" : ""}`} aria-label={label} onClick={onBackdrop}
    style={dark ? undefined : { background: th.sf, color: th.tx, borderColor: th.gbd || th.bd }}>
    {open && <div className="v3-sheet-in">
      <div className="v3-handle" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden="true"><i /></div>
      {title != null && <div className="v3-sheet-h">
        <h2 style={{ color: dark ? "#fff" : th.tx }}>{title}</h2>
        <button type="button" className="v3-x" onClick={onClose} aria-label="Close" style={{ color: dark ? "#fff" : th.t2 }}>✕</button>
      </div>}
      {children}
    </div>}
  </dialog>;
}
