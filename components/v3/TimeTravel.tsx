"use client";
// Time travel: earlier versions of the team kept by the server (one per hour while it changes, 30 days).
// Pick a version, see what changed since, restore the viewed year to it. Restoring is a normal edit: it goes
// through the save path (PIN protection, locks) and can be undone right after.
import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import { diffTeams, dateOf, type TeamView } from "@/lib/v3Util";
import { V } from "@/lib/v3Text";
import { dateLocale } from "@/lib/extraText";

type Th = { tx: string; t2: string; t3: string; ac: string; al: string; sf: string; bd: string; gbg?: string; gbd?: string };
type Ver = { vid: string; at: string; members: number; days: number };
type Doc = { at: string; data: unknown };
type Props = { teamId: string; team: TeamView; yr: number; th: Th; toView: (raw: unknown) => TeamView; onRestore: (raw: unknown, at: string) => void; onClose: () => void };

const when = (iso: string) => { try { return new Date(iso).toLocaleString(dateLocale(), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return iso; } };
const short = (k: string) => { try { return dateOf(k).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }); } catch { return k; } };

export default function TimeTravel({ open, ...p }: Props & { open: boolean }) {
  return <Sheet open={open} onClose={p.onClose} th={p.th} wide label={V("tt")} title={<>⏳ {V("tt")}</>}>
    {open && <Body {...p} />}
  </Sheet>;
}

// Mounted fresh each time the sheet opens, so nothing needs resetting
function Body({ teamId, team, yr, th, toView, onRestore, onClose }: Props) {
  "use memo";
  const [vers, setVers] = useState<Ver[] | null>(null);
  const [err, setErr] = useState(false);
  const [sel, setSel] = useState(0);
  const [docs, setDocs] = useState<Record<string, Doc>>({});
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/team/versions?id=${encodeURIComponent(teamId)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => { if (alive) setVers(Array.isArray(d?.versions) ? d.versions : []); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, [teamId]);

  const v = vers && vers[sel];
  const doc = v ? docs[v.vid] : undefined;
  useEffect(() => {
    if (!v || docs[v.vid]) return;
    let alive = true;
    const t = setTimeout(() => {
      fetch(`/api/team/versions?id=${encodeURIComponent(teamId)}&vid=${v.vid}`, { cache: "no-store" })
        .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(d => { if (alive) setDocs(m => ({ ...m, [v.vid]: { at: d.at, data: d.data } })); })
        .catch(() => { if (alive) setErr(true); });
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [v, docs, teamId]);

  const pick = (i: number) => { setSel(i); setConfirm(false); };
  const past = doc ? toView(doc.data) : null;
  const diff = past ? diffTeams(past, team) : null;
  // What a restore changes: days, half days and approval for this year, and people removed since come back
  const changed = diff ? diff.changed.filter(c => c.added.length || c.removed.length || c.approval !== undefined) : [];
  const restorable = changed.length + (diff ? diff.membersRemoved.length : 0);

  return <>
    <p className="v3-sub" style={{ color: th.t2 }}>{V("ttSub")}</p>
    {err && <p className="v3-err">{V("ttErr")}</p>}
    {!err && vers === null && <p style={{ color: th.t3 }}>{V("ttLoading")}</p>}
    {vers && vers.length === 0 && <div className="v3-empty"><div className="v3-empty-ico" aria-hidden="true">⏳</div><p style={{ color: th.t2 }}>{V("ttEmpty")}</p></div>}
    {vers && vers.length > 0 && <>
      <div className="v3-scrub">
        <span style={{ color: th.t3 }}>{when(vers[vers.length - 1].at)}</span>
        <input type="range" min={0} max={vers.length - 1} step={1} value={vers.length - 1 - sel} aria-label={V("ttPick")}
          onChange={e => pick(vers.length - 1 - Number(e.target.value))} style={{ accentColor: th.ac }} />
        <span style={{ color: th.t3 }}>{V("ttNow")}</span>
      </div>
      <div className="v3-tt">
        <ol className="v3-vers" aria-label={V("ttPick")}>
          {vers.map((x, i) => <li key={x.vid}>
            <button type="button" aria-pressed={i === sel} onClick={() => pick(i)}
              style={{ background: i === sel ? th.al : "transparent", color: i === sel ? th.ac : th.tx, borderColor: i === sel ? th.ac : th.gbd || th.bd }}>
              <b>{when(x.at)}</b><span style={{ color: th.t3 }}>👥 {x.members} · 🗓 {x.days}</span>
            </button>
          </li>)}
        </ol>
        <div className="v3-diff" style={{ borderColor: th.gbd || th.bd }}>
          {!diff ? <p style={{ color: th.t3 }}>{V("ttLoading")}</p> : <>
            <h3 style={{ color: th.tx }}>{V("ttSince")} <span style={{ color: th.t3, fontWeight: 500 }}>· {doc && when(doc.at)}</span></h3>
            {restorable === 0 && <p style={{ color: th.t2 }}>{V("ttNone", { y: yr })}</p>}
            {diff.membersRemoved.length > 0 && <p style={{ color: th.tx }}>－ {V("ttLeft", { names: diff.membersRemoved.join(", ") })}</p>}
            <ul className="v3-dlist">
              {changed.map(c => <li key={c.id}>
                <span style={{ color: th.tx, fontWeight: 650 }}>{c.name}</span>
                {c.renamedFrom && <span style={{ color: th.t3 }}> ({V("ttRenamed", { from: c.renamedFrom })})</span>}
                <span className="v3-chips">
                  {c.added.length > 0 && <span className="v3-chip v3-plus">+{c.added.length}</span>}
                  {c.removed.length > 0 && <span className="v3-chip v3-minus">−{c.removed.length}</span>}
                  {c.approval !== undefined && <span className={c.approval ? "v3-chip v3-plus" : "v3-chip v3-minus"}>{c.approval ? "✓ " + V("ttApproved") : V("ttUnapproved")}</span>}
                </span>
                {(c.added.length > 0 || c.removed.length > 0) && <div style={{ color: th.t3, fontSize: 12 }}>
                  {c.added.length > 0 && <>+ {c.added.slice(0, 4).map(short).join(", ")}{c.added.length > 4 ? "…" : ""} </>}
                  {c.removed.length > 0 && <>− {c.removed.slice(0, 4).map(short).join(", ")}{c.removed.length > 4 ? "…" : ""}</>}
                </div>}
              </li>)}
            </ul>
            {restorable > 0 && !confirm && <button type="button" className="v3-btn v3-primary" style={{ background: th.ac }} onClick={() => setConfirm(true)}>↺ {V("ttRestore", { y: yr })}</button>}
            {confirm && doc && <div className="v3-confirm" style={{ background: th.al, color: th.tx }}>
              <p>{V("ttConfirm", { y: yr })}</p>
              <div className="v3-row">
                <button type="button" className="v3-btn v3-ghost" onClick={() => setConfirm(false)} style={{ color: th.t2, borderColor: th.gbd || th.bd }}>{V("cancel")}</button>
                <button type="button" className="v3-btn v3-primary" style={{ background: th.ac }} onClick={() => { onRestore(doc.data, doc.at); onClose(); }}>{V("ttRestoreNow")}</button>
              </div>
            </div>}
          </>}
        </div>
      </div>
    </>}
  </>;
}
