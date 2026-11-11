"use client";
// Approval inbox: one card per member whose plan for the year is waiting. Swipe right (or press →) to approve,
// left (or ←) to ask for changes with an optional note (posted as a team comment on their first day).
// The server still decides who may approve (lib/teamAuth.ts): an unauthorised approval is reverted there.
import { useMemo, useRef, useState } from "react";
import Sheet from "./Sheet";
import { pendingApprovals, dateOf, type TeamView, type Member } from "@/lib/v3Util";
import { V } from "@/lib/v3Text";
import { dateLocale } from "@/lib/extraText";

type Th = { tx: string; t2: string; t3: string; ac: string; al: string; sf: string; bd: string; gbg?: string; gbd?: string };
type Col = { b: string; t: string; d: string };

const fmt = (k: string, withYear = false) => { try { return dateOf(k).toLocaleDateString(dateLocale(), withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" }); } catch { return k; } };
const fmtRange = ([a, b]: [string, string]) => (a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`);
const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function ApprovalInbox({ open, onClose, team, yr, threshold, th, colorOf, onApprove, onRequest }: {
  open: boolean; onClose: () => void; team: TeamView; yr: number; threshold: number; th: Th;
  colorOf: (id: string) => Col; onApprove: (ids: string[]) => void; onRequest: (m: Member, note: string, day: string) => void;
}) {
  const [done, setDone] = useState<Record<string, true>>({});
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<"" | "r" | "l">("");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState("");
  const start = useRef<{ x: number; id: number } | null>(null);
  const all = useMemo(() => pendingApprovals(team, yr, threshold), [team, yr, threshold]);
  const list = all.filter(p => !done[p.member.id]);
  const cur = list[0];

  const finish = (dir: "r" | "l", fn: () => void) => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setLeaving(dir);
    setTimeout(() => { fn(); setLeaving(""); setDx(0); }, reduce ? 0 : 260);
  };
  const approve = () => { if (!cur) return; const id = cur.member.id; finish("r", () => { setDone(d => ({ ...d, [id]: true })); onApprove([id]); }); };
  const ask = () => { if (!cur) return; setDx(0); setNoteFor(cur.member.id); setNote(""); };
  const sendNote = () => {
    if (!cur) return;
    const m = cur.member, day = cur.ranges[0][0], text = note.trim();
    finish("l", () => { setDone(d => ({ ...d, [m.id]: true })); onRequest(m, text, day); setNoteFor(null); });
  };
  const approveAll = () => { const ids = list.map(p => p.member.id); setDone(d => ({ ...d, ...Object.fromEntries(ids.map(i => [i, true as const])) })); onApprove(ids); };

  const down = (e: React.PointerEvent) => { if (noteFor) return; start.current = { x: e.clientX, id: e.pointerId }; setDragging(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => { if (start.current) setDx(e.clientX - start.current.x); };
  const up = () => {
    if (!start.current) return;
    start.current = null; setDragging(false);
    if (dx > 110) approve(); else if (dx < -110) ask(); else setDx(0);
  };
  const key = (e: React.KeyboardEvent) => { if (noteFor) return; if (e.key === "ArrowRight") { e.preventDefault(); approve(); } if (e.key === "ArrowLeft") { e.preventDefault(); ask(); } };

  const months = (m: Member) => { const a = new Array(12).fill(0); for (const k of m.days || []) if (k.startsWith(yr + "-")) a[Number(k.slice(5, 7)) - 1]++; return a; };
  const tilt = leaving ? undefined : `translateX(${dx}px) rotate(${dx / 22}deg)`;

  return <Sheet open={open} onClose={onClose} th={th} label={V("inboxTitle")}
    title={<>{V("inboxTitle")} <span className="v3-count" style={{ background: th.al, color: th.ac }}>{list.length}</span></>}>
    {!cur ? <div className="v3-empty">
      <div className="v3-empty-ico" aria-hidden="true">✓</div>
      <b style={{ color: th.tx }}>{V("allDone")}</b>
      <p style={{ color: th.t2 }}>{V("allDoneSub")}</p>
    </div> : <>
      <p className="v3-hint" style={{ color: th.t3 }}>{V("swipeHint")}</p>
      <div className="v3-stack">
        {list.slice(1, 3).reverse().map((p, i, arr) => <div key={p.member.id} className="v3-card v3-card-back" aria-hidden="true"
          style={{ background: th.sf, borderColor: th.gbd || th.bd, transform: `translateY(${(arr.length - i) * 10}px) scale(${1 - (arr.length - i) * 0.04})` }} />)}
        {(() => {
          const c = colorOf(cur.member.id), ms = months(cur.member), mx = Math.max(1, ...ms);
          return <div key={cur.member.id} className={`v3-card v3-card-top${leaving ? " v3-leave-" + leaving : ""}${dragging ? " v3-dragging" : ""}`}
            tabIndex={0} role="group" aria-label={`${cur.member.name}: ${fmtN(cur.days)} ${cur.days === 1 ? V("dayLbl") : V("daysLbl")}`}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
            style={{ background: th.sf, borderColor: th.gbd || th.bd, transform: tilt }}>
            <div className="v3-stamp v3-stamp-ok" style={{ opacity: Math.max(0, Math.min(1, dx / 110)) }}>{V("approve")}</div>
            <div className="v3-stamp v3-stamp-no" style={{ opacity: Math.max(0, Math.min(1, -dx / 110)) }}>{V("changes")}</div>
            <div className="v3-card-head">
              <span className="v3-avatar" style={{ background: c.b, color: c.t }}>{(cur.member.name || "?").slice(0, 1).toUpperCase()}</span>
              <div style={{ minWidth: 0 }}>
                <div className="v3-name" style={{ color: th.tx }}>{cur.member.name}</div>
                <div style={{ color: th.t3, fontSize: 12 }}>{yr}</div>
              </div>
              <div className="v3-big" style={{ color: c.d }}>{fmtN(cur.days)}<small style={{ color: th.t3 }}>{cur.days === 1 ? V("dayLbl") : V("daysLbl")}</small></div>
            </div>
            <div className="v3-months" aria-hidden="true">{ms.map((n, i) => <span key={i} title={String(i + 1)}><i style={{ height: `${Math.round((n / mx) * 100)}%`, background: n ? c.d : th.bd }} /></span>)}</div>
            <ul className="v3-ranges">
              {cur.ranges.slice(0, 4).map(r => <li key={r[0]} style={{ background: c.b, color: c.t }}>{fmtRange(r)}</li>)}
              {cur.ranges.length > 4 && <li style={{ background: th.al, color: th.ac }}>+{cur.ranges.length - 4}</li>}
            </ul>
            {cur.overDays.length
              ? <div className="v3-cover v3-cover-warn">⚠ {V("coverWarn", { n: cur.overDays.length })}{cur.worst && <span> · {V("worst", { d: fmt(cur.worst.day), a: cur.worst.away })}</span>}</div>
              : <div className="v3-cover v3-cover-ok">✓ {V("coverOk")}</div>}
            {noteFor === cur.member.id && <div className="v3-note" onPointerDown={e => e.stopPropagation()}>
              <textarea autoFocus value={note} maxLength={240} onChange={e => setNote(e.target.value)} placeholder={V("notePh")} aria-label={V("notePh")}
                style={{ background: th.gbg || th.sf, color: th.tx, borderColor: th.gbd || th.bd }} />
              <div className="v3-row">
                <button type="button" className="v3-btn v3-ghost" onClick={() => setNoteFor(null)} style={{ color: th.t2, borderColor: th.gbd || th.bd }}>{V("cancel")}</button>
                <button type="button" className="v3-btn v3-amber" onClick={sendNote}>{V("send")}</button>
              </div>
            </div>}
          </div>;
        })()}
      </div>
      {!noteFor && <div className="v3-actions">
        <button type="button" className="v3-round v3-round-no" onClick={ask} aria-label={V("changes")} title={V("changes")}>✕</button>
        <button type="button" className="v3-round v3-round-ok" onClick={approve} aria-label={V("approve")} title={V("approve")}>✓</button>
      </div>}
      {list.length > 1 && !noteFor && <button type="button" className="v3-link" onClick={approveAll} style={{ color: th.ac }}>{V("approveAll")} ({list.length})</button>}
    </>}
  </Sheet>;
}
