"use client";
// Approvals view (pattern from Workoșenie's Aprobări): waiting / approved tabs, a list on the left and the selected
// person's plan on the right, keyboard shortcuts (A approve · R ask for changes · J/K move), bulk approval of plans
// without clashes, and a way to turn approvals on for teams that have no approver yet. The server still decides who
// may approve (lib/teamAuth.ts).
import { useEffect, useMemo, useState } from "react";
import { pendingApprovals, ranges, used, dateOf, addDays, type TeamView, type Member } from "@/lib/v3Util";
import { V } from "@/lib/v3Text";
import { dateLocale } from "@/lib/extraText";
import "./v3.css";

type Th = { tx: string; t2: string; t3: string; ac: string; al: string; sf: string; bd: string; gbg?: string; gbd?: string };
type Col = { b: string; t: string; d: string };
const fmt = (k: string) => { try { return dateOf(k).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }); } catch { return k; } };
const fmtRange = ([a, b]: [string, string]) => (a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`);
const wd = (k: string) => { try { return dateOf(k).toLocaleDateString(dateLocale(), { weekday: "short" }); } catch { return ""; } };
const span = ([a, b]: [string, string]) => { const o: string[] = []; for (let k = a; k <= b && o.length < 400; k = addDays(k, 1)) o.push(k); return o; };
const ago = (iso: string) => { const t = Date.parse(iso); if (!t) return ""; const m = Math.round((Date.now() - t) / 60000);
  try { const r = new Intl.RelativeTimeFormat(dateLocale(), { numeric: "auto" }); return m < 60 ? r.format(-m, "minute") : m < 1440 ? r.format(-Math.round(m / 60), "hour") : r.format(-Math.round(m / 1440), "day"); } catch { return new Date(t).toLocaleString(); } };
const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const monthsOf = (m: Member, yr: number) => { const a = new Array(12).fill(0); for (const k of m.days || []) if (k.startsWith(yr + "-")) a[Number(k.slice(5, 7)) - 1]++; return a; };

export default function ApprovalsView({ team, yr, threshold, th, colorOf, onApprove, onRequest, onRevoke, onOneByOne, onTurnOn, apReq = null, onAcceptReq, onDeclineReq, pinResets = [], onResetPin, holOf, sevenDay = false }: {
  team: TeamView & { members: (Member & { role?: string })[] }; yr: number; threshold: number; th: Th; colorOf: (id: string) => Col;
  onApprove: (ids: string[]) => void; onRequest: (m: Member, note: string, day: string) => void; onRevoke: (id: string) => void;
  onOneByOne: () => void; onTurnOn: ((memberId: string) => void) | null;
  apReq?: { id: string; at?: string } | null; onAcceptReq?: () => void; onDeclineReq?: () => void;
  pinResets?: { id: string; at?: string }[]; onResetPin?: (id: string) => void;
  holOf?: (m: Member) => Set<string>; sevenDay?: boolean;
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

  // Forgotten PINs: the approver (or owner) resets; the member sets a new PIN on their next visit
  const resetCards = pinResets.map(r => { const m = team.members.find(x => x.id === r.id); if (!m) return null; const c = colorOf(m.id);
    return <div key={"pr" + m.id} className="v3-ap-req v3-ap-pr" role="region" aria-label={V("prTitle")} style={{ borderColor: "#60A5FA", background: th.sf }}>
      <span className="v3-avatar" style={{ background: c.b, color: c.t, width: 40, height: 40, fontSize: 16 }}>{(m.name || "?").slice(0, 1).toUpperCase()}</span>
      <span className="v3-ap-who"><b style={{ color: th.tx }}>🔑 {V("prTitle")}</b><small style={{ color: th.t2 }}>{V("prWants", { n: m.name || "" })}</small></span>
      <span className="v3-row"><button type="button" className="v3-btn v3-primary" style={{ background: "#2563EB" }} onClick={() => onResetPin && onResetPin(m.id)}>{V("prReset")}</button></span>
    </div>; });

  // Approvals are off for this team: let the owner pick the approver
  if (!team.approver) {
    return <div className="v3-ap">
      {resetCards}
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

  // A member asked to become the approver: accepting hands the role over (the current approver stops being one)
  const reqM = apReq ? team.members.find(m => m.id === apReq.id) : null;
  const reqCard = reqM ? <div className="v3-ap-req" role="region" aria-label={V("arTitle")} style={{ borderColor: "#F59E0B", background: th.sf }}>
    <span className="v3-avatar" style={{ background: colorOf(reqM.id).b, color: colorOf(reqM.id).t, width: 40, height: 40, fontSize: 16 }}>{(reqM.name || "?").slice(0, 1).toUpperCase()}</span>
    <span className="v3-ap-who"><b style={{ color: th.tx }}>👑 {V("arTitle")}</b><small style={{ color: th.t2 }}>{V("arWants", { n: reqM.name || "" })}</small></span>
    <span className="v3-row">
      <button type="button" className="v3-btn v3-ghost" style={{ color: th.t2, borderColor: th.gbd || th.bd }} onClick={onDeclineReq}>{V("arDecline")}</button>
      <button type="button" className="v3-btn v3-primary" style={{ background: "#16A34A" }} onClick={onAcceptReq}>✓ {V("arAccept")}</button>
    </span>
  </div> : null;

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
        <div className="v3-ap-sum">
          <span style={{ background: "#FFF7ED", color: "#9A3412" }}><b>{pending.length}</b>{V("apSumPeople")}</span>
          <span style={{ background: "#EEF2FF", color: "#3730A3" }}><b>{fmtN(pending.reduce((n, p) => n + p.days, 0))}</b>{V("apSumDays")}</span>
          <span style={{ background: pending.some(p => p.overDays.length) ? "#FEF2F2" : "#F0FDF4", color: pending.some(p => p.overDays.length) ? "#991B1B" : "#166534" }}><b>{pending.filter(p => p.overDays.length).length}</b>{V("apSumClash")}</span>
          <span style={{ background: "#F0FDF4", color: "#166534" }}><b>{approved.length}</b>{V("apTabOk")}</span>
        </div>
      </div>
      <div className="v3-row">
        {pending.length > 0 && <button type="button" className="v3-btn v3-ghost" style={{ color: th.ac, borderColor: th.gbd || th.bd }} onClick={onOneByOne}>⇆ {V("apOneByOne")}</button>}
        {safe.length > 0 && <button type="button" className="v3-btn v3-primary" style={{ background: "#16A34A" }} onClick={() => onApprove(safe.map(p => p.member.id))}>✓ {V("apBulk", { n: safe.length })}</button>}
      </div>
    </div>
    {reqCard}
    {resetCards}
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
          <span className="v3-ap-meta"><small className="v3-ap-when" style={{ color: th.t3 }}>{p.ranges.length ? fmtRange(p.ranges[0]) + (p.ranges.length > 1 ? " +" + (p.ranges.length - 1) : "") : ""}</small><b style={{ color: colorOf(p.member.id).d }}>{fmtN(p.days)}</b>{p.overDays.length > 0 ? <span className="v3-chip v3-minus">⚠ {p.overDays.length}</span> : <span className="v3-chip v3-plus">✓</span>}</span>,
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
            {(() => {
              const allow = m.pto ? m.pto + (m.carry || 0) : 0, usedN = used(m, yr), left = allow - usedN;
              const hol = holOf ? holOf(m) : new Set<string>();
              const rs = ranges((m.days || []).filter(k => k.startsWith(yr + "-")));
              const isWork = (k: string) => { const g = dateOf(k).getDay(); return (sevenDay || (g !== 0 && g !== 6)) && !hol.has(k); };
              const holIn = rs.reduce((n, r) => n + span(r).filter(k => hol.has(k)).length, 0);
              const others = team.members.filter(x => x.id !== m.id);
              const last = ((team.log || []) as { t?: string; a?: string }[]).filter(e => e && typeof e.a === "string" && m.name && e.a.includes(m.name)).slice(-1)[0];
              const crowd = (k: string) => others.filter(x => (x.days || []).includes(k));
              return <>
                <div className="v3-ap-stats">
                  <div><small style={{ color: th.t3 }}>{V("apStatReq")}</small><b style={{ color: th.tx }}>{fmtN(cur.days)}</b><span style={{ color: th.t3 }}>{V("apStatPeriods", { n: rs.length })}</span></div>
                  <div><small style={{ color: th.t3 }}>{V("apAllowance")}</small><b style={{ color: th.tx }}>{allow ? fmtN(allow) : "—"}</b><span style={{ color: th.t3 }}>{allow ? (m.carry ? V("apCarry", { n: m.carry }) : V("apPtoSet")) : V("apNoAllow")}</span></div>
                  <div className={allow && left < 0 ? "v3-ap-bad" : ""}><small style={{ color: th.t3 }}>{V("apStatLeft")}</small><b style={{ color: allow && left < 0 ? "#B91C1C" : th.tx }}>{allow ? fmtN(left) : "—"}</b><span style={{ color: allow && left < 0 ? "#B91C1C" : th.t3 }}>{allow ? (left < 0 ? V("apOverBy", { n: fmtN(-left) }) : V("apAfter")) : ""}</span></div>
                  <div><small style={{ color: th.t3 }}>{V("apStatHol")}</small><b style={{ color: th.tx }}>{holIn}</b><span style={{ color: th.t3 }}>{V("apHolSub")}</span></div>
                </div>
                <div className="v3-months" aria-hidden="true">{ms.map((n, i) => <span key={i}><i style={{ height: `${Math.round((n / mx) * 100)}%`, background: n ? c.d : th.bd }} /></span>)}</div>
                <h3 className="v3-ap-h3" style={{ color: th.t2 }}>{V("apPeriods")}</h3>
                <div className="v3-ap-table" role="table">
                  {rs.map(r => { const ks = span(r); const work = ks.filter(isWork).length; const also = new Map<string, { name: string; n: number; id: string }>();
                    ks.forEach(k => crowd(k).forEach(x => { const e = also.get(x.id) || { name: x.name || "?", n: 0, id: x.id }; e.n++; also.set(x.id, e); }));
                    const clash = ks.filter(k => cur.overDays.includes(k)).length;
                    return <div role="row" key={r[0]} className={"v3-ap-tr" + (clash ? " clash" : "")} style={{ borderColor: clash ? "#FCA5A5" : th.gbd || th.bd }}>
                      <div role="cell"><b style={{ color: th.tx }}>{fmtRange(r)}</b><small style={{ color: th.t3 }}>{wd(r[0])}{r[0] !== r[1] ? " – " + wd(r[1]) : ""} · {V("apWd", { n: work })}</small></div>
                      <div role="cell" className="v3-ap-also">{also.size ? [...also.values()].map(x => <span key={x.id} title={x.name + " · " + x.n} style={{ background: colorOf(x.id).b, color: colorOf(x.id).t }}>{x.name}<i>{x.n}</i></span>) : <small style={{ color: "#15803D" }}>✓ {V("apNobody")}</small>}</div>
                      <div role="cell">{clash ? <span className="v3-chip v3-minus">⚠ {V("apClashN", { n: clash })}</span> : <span className="v3-chip v3-plus">✓</span>}</div>
                    </div>; })}
                </div>
                {last && last.t && <p className="v3-ap-last" style={{ color: th.t3 }}>🕓 {V("apLast", { d: ago(last.t) })} · {String(last.a).slice(0, 90)}</p>}
              </>;
            })()}
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
