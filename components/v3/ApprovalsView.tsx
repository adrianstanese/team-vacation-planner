"use client";
// Approvals view (pattern from Workoșenie's Aprobări): waiting / approved tabs, a list on the left and the selected
// person's plan on the right, keyboard shortcuts (A approve · R ask for changes · J/K move), bulk approval of plans
// without clashes, and a way to turn approvals on for teams that have no approver yet. The server still decides who
// may approve (lib/teamAuth.ts).
import { useEffect, useMemo, useState } from "react";
import { pendingApprovals, ranges, used, dateOf, type TeamView, type Member } from "@/lib/v3Util";
import { V } from "@/lib/v3Text";
import { dateLocale } from "@/lib/extraText";
import "./v3.css";

type Th = { tx: string; t2: string; t3: string; ac: string; al: string; sf: string; bd: string; gbg?: string; gbd?: string };
type Col = { b: string; t: string; d: string };
const fmt = (k: string) => { try { return dateOf(k).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }); } catch { return k; } };
const fmtRange = ([a, b]: [string, string]) => (a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`);
const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const monthsOf = (m: Member, yr: number) => { const a = new Array(12).fill(0); for (const k of m.days || []) if (k.startsWith(yr + "-")) a[Number(k.slice(5, 7)) - 1]++; return a; };

export default function ApprovalsView({ team, yr, threshold, th, colorOf, onApprove, onRequest, onRevoke, onOneByOne, onTurnOn }: {
  team: TeamView & { members: (Member & { role?: string })[] }; yr: number; threshold: number; th: Th; colorOf: (id: string) => Col;
  onApprove: (ids: string[]) => void; onRequest: (m: Member, note: string, day: string) => void; onRevoke: (id: string) => void;
  onOneByOne: () => void; onTurnOn: ((memberId: string) => void) | null;
}) {
  "use memo";
  const [tab, setTab] = useState<"wait" | "ok">("wait");
  const [sel, setSel] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pick, setPick] = useState("");
  const pending = useMemo(() => pendingApprovals(team, yr, threshold), [team, yr, threshold]);
  const approved = team.members.filter(m => m.id !== team.approver && m.approved && (m.days || []).some(k => k.startsWith(yr + "-")));
  const safe = pending.filter(p => p.overDays.length === 0);
  const cur = pending.find(p => p.member.id === sel) || pending[0] || null;

  const approveOne = (id: string) => { const i = pending.findIndex(p => p.member.id === id); onApprove([id]); const nx = pending[i + 1] || pending[i - 1]; setSel(nx ? nx.member.id : null); };
  const sendNote = () => { if (!cur) return; onRequest(cur.member, note.trim(), cur.ranges[0][0]); setNoteFor(null); setNote(""); };

  useEffect(() => {
    if (tab !== "wait" || !cur) return;
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const i = pending.findIndex(p => p.member.id === cur.member.id);
      if (e.key === "a" || e.key === "A") { e.preventDefault(); approveOne(cur.member.id); }
      else if (e.key === "r" || e.key === "R") { e.preventDefault(); setNoteFor(cur.member.id); setNote(""); }
      else if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); const n = pending[Math.min(pending.length - 1, i + 1)]; if (n) setSel(n.member.id); }
      else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); const n = pending[Math.max(0, i - 1)]; if (n) setSel(n.member.id); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  // Approvals are off for this team: let the owner pick the approver
  if (!team.approver) {
    return <div className="v3-ap">
      <div className="v3-ap-off" style={{ background: th.gbg || th.sf, borderColor: th.gbd || th.bd }}>
        <div className="v3-empty-ico" aria-hidden="true">✓</div>
        <h2 style={{ color: th.tx }}>{V("apOffT")}</h2>
        <p style={{ color: th.t2 }}>{V("apOffD")}</p>
        {onTurnOn && team.members.length > 0 && <div className="v3-row" style={{ justifyContent: "center" }}>
          <select value={pick} onChange={e => setPick(e.target.value)} aria-label={V("apPick")} style={{ borderColor: th.gbd || th.bd, color: th.tx, background: th.sf }}>
            <option value="">{V("apPick")}</option>
            {team.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button type="button" className="v3-btn v3-primary" style={{ background: th.ac }} disabled={!pick} onClick={() => pick && onTurnOn(pick)}>{V("apTurnOn")}</button>
        </div>}
      </div>
    </div>;
  }

  const row = (m: Member & { role?: string }, extra: React.ReactNode, active: boolean, onClick?: () => void) => {
    const c = colorOf(m.id);
    return <button type="button" key={m.id} className={"v3-ap-item" + (active ? " on" : "")} onClick={onClick} aria-pressed={onClick ? active : undefined}
      style={{ borderColor: active ? th.ac : th.gbd || th.bd, background: active ? th.al : th.sf }}>
      <span className="v3-avatar" style={{ background: c.b, color: c.t, width: 36, height: 36, fontSize: 15 }}>{(m.name || "?").slice(0, 1).toUpperCase()}</span>
      <span className="v3-ap-who"><b style={{ color: th.tx }}>{m.name}</b>{m.role ? <small style={{ color: th.t3 }}>{m.role}</small> : null}</span>
      {extra}
    </button>;
  };

  return <div className="v3-ap">
    <div className="v3-ap-head">
      <div>
        <h2 style={{ color: th.tx }}>{V("inbox")}</h2>
        <p style={{ color: th.t3 }}>{V("inboxWaiting", { n: pending.length })} · {V("apApprovedN", { n: approved.length })}</p>
      </div>
      <div className="v3-row">
        {pending.length > 0 && <button type="button" className="v3-btn v3-ghost" style={{ color: th.ac, borderColor: th.gbd || th.bd }} onClick={onOneByOne}>⇆ {V("apOneByOne")}</button>}
        {safe.length > 0 && <button type="button" className="v3-btn v3-primary" style={{ background: "#16A34A" }} onClick={() => onApprove(safe.map(p => p.member.id))}>✓ {V("apBulk", { n: safe.length })}</button>}
      </div>
    </div>
    <div className="seg2 v3-ap-tabs" role="tablist" aria-label={V("inbox")}>
      <button type="button" role="tab" aria-selected={tab === "wait"} onClick={() => setTab("wait")}>{V("apTabWait")} <span>{pending.length}</span></button>
      <button type="button" role="tab" aria-selected={tab === "ok"} onClick={() => setTab("ok")}>{V("apTabOk")} <span>{approved.length}</span></button>
    </div>

    {tab === "ok" && <div className="v3-ap-list v3-ap-only">
      {approved.length === 0 ? <p style={{ color: th.t3 }}>{V("apNoneOk")}</p> : approved.map(m => row(m,
        <span className="v3-ap-meta"><span style={{ color: th.t2 }}>{fmtN(used(m, yr))} {used(m, yr) === 1 ? V("dayLbl") : V("daysLbl")}</span>
          <span role="button" tabIndex={0} className="v3-link" style={{ color: "#B45309", minHeight: 0, margin: 0 }} onClick={e => { e.stopPropagation(); onRevoke(m.id); }} onKeyDown={e => { if (e.key === "Enter") onRevoke(m.id); }}>{V("apRevoke")}</span></span>, false))}
    </div>}

    {tab === "wait" && (pending.length === 0 ? <div className="v3-empty">
      <div className="v3-empty-ico" aria-hidden="true">✓</div>
      <b style={{ color: th.tx }}>{V("allDone")}</b><p style={{ color: th.t2 }}>{V("allDoneSub")}</p>
    </div> : <div className="v3-ap-grid">
      <div className="v3-ap-list" role="list">
        {pending.map(p => row(p.member as Member & { role?: string },
          <span className="v3-ap-meta"><b style={{ color: colorOf(p.member.id).d }}>{fmtN(p.days)}</b>{p.overDays.length > 0 ? <span className="v3-chip v3-minus">⚠ {p.overDays.length}</span> : <span className="v3-chip v3-plus">✓</span>}</span>,
          cur?.member.id === p.member.id, () => { setSel(p.member.id); setNoteFor(null); }))}
      </div>
      {cur && <section className="v3-ap-pane" aria-live="polite" style={{ background: th.sf, borderColor: th.gbd || th.bd }}>
        {(() => {
          const m = cur.member as Member & { role?: string }, c = colorOf(m.id), ms = monthsOf(m, yr), mx = Math.max(1, ...ms);
          return <>
            <div className="v3-card-head">
              <span className="v3-avatar" style={{ background: c.b, color: c.t }}>{(m.name || "?").slice(0, 1).toUpperCase()}</span>
              <div style={{ minWidth: 0 }}><div className="v3-name" style={{ color: th.tx }}>{m.name}</div><div style={{ color: th.t3, fontSize: 12 }}>{m.role ? m.role + " · " : ""}{yr}</div></div>
              <div className="v3-big" style={{ color: c.d }}>{fmtN(cur.days)}<small style={{ color: th.t3 }}>{cur.days === 1 ? V("dayLbl") : V("daysLbl")}</small></div>
            </div>
            <div className="v3-months" aria-hidden="true">{ms.map((n, i) => <span key={i}><i style={{ height: `${Math.round((n / mx) * 100)}%`, background: n ? c.d : th.bd }} /></span>)}</div>
            <ul className="v3-ranges">{ranges((m.days || []).filter(k => k.startsWith(yr + "-"))).map(r => <li key={r[0]} style={{ background: c.b, color: c.t }}>{fmtRange(r)}</li>)}</ul>
            {cur.overDays.length
              ? <div className="v3-cover v3-cover-warn">⚠ {V("coverWarn", { n: cur.overDays.length })}{cur.worst && <span> · {V("worst", { d: fmt(cur.worst.day), a: cur.worst.away })}</span>}</div>
              : <div className="v3-cover v3-cover-ok">✓ {V("coverOk")}</div>}
            {noteFor === m.id ? <div className="v3-note">
              <textarea autoFocus value={note} maxLength={240} onChange={e => setNote(e.target.value)} placeholder={V("notePh")} aria-label={V("notePh")} style={{ background: th.gbg || th.sf, color: th.tx, borderColor: th.gbd || th.bd }} />
              <div className="v3-row"><button type="button" className="v3-btn v3-ghost" onClick={() => setNoteFor(null)} style={{ color: th.t2, borderColor: th.gbd || th.bd }}>{V("cancel")}</button><button type="button" className="v3-btn v3-amber" onClick={sendNote}>{V("send")}</button></div>
            </div> : <div className="v3-row" style={{ marginTop: 14 }}>
              <button type="button" className="v3-btn v3-ghost" style={{ color: "#B45309", borderColor: "#FCD34D" }} onClick={() => { setNoteFor(m.id); setNote(""); }}>✕ {V("changes")} <kbd>R</kbd></button>
              <button type="button" className="v3-btn v3-primary" style={{ background: "#16A34A" }} onClick={() => approveOne(m.id)}>✓ {V("approve")} <kbd>A</kbd></button>
            </div>}
            <p className="v3-ap-keys" style={{ color: th.t3 }}>{V("apKeys")}</p>
          </>;
        })()}
      </section>}
    </div>)}
  </div>;
}
