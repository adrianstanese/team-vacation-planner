"use client";
// Year-end pack: the yearly hand-over in one place. See who has days left, decide how many move into the next year,
// download the year, lock it, open the next one. Every step calls one of the planner's existing actions, so the same
// rules apply as everywhere else (who may lock, who may change team settings). Nothing here saves on its own.
import { useState } from "react";
import Sheet from "./Sheet";
import { carryInfo, type CarryMember } from "@/lib/v3Util";
import { V } from "@/lib/v3Text";
import { X } from "@/lib/extraText";

type Th = { tx: string; t2: string; t3: string; ac: string; al: string; sf: string; bd: string; gbg?: string; gbd?: string; ti?: string };
type ViewMember = { id: string; name?: string; days?: unknown[]; half?: unknown[]; pto?: number | null; carry?: number };
type Props = {
  team: { members: ViewMember[]; carryMax?: number; locked?: boolean };  // the year on screen
  raw: { year?: number; members?: (CarryMember & { id: string })[] } | null; // the stored team, every year
  yr: number; lastYear: number; th: Th;
  lockLabel: string; unlockLabel: string; pdfLabel: string;
  mayLock: boolean;
  onLock: () => void; onCarryMax: (days: number) => void; onXlsx: () => void; onPdf: () => void;
  onNextYear: (() => void) | null; onClose: () => void;
};

const show = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function YearEnd({ open, ...p }: Props & { open: boolean }) {
  return <Sheet open={open} onClose={p.onClose} th={p.th} wide label={V("yeTitle", { y: p.yr })} title={<>🗓️ {V("yeTitle", { y: p.yr })}</>}>
    {open && <Body {...p} />}
  </Sheet>;
}

// Mounted fresh each time the sheet opens, so nothing needs resetting
function Body({ team, raw, yr, lastYear, th, lockLabel, unlockLabel, pdfLabel, mayLock, onLock, onCarryMax, onXlsx, onPdf, onNextYear, onClose }: Props) {
  "use memo";
  const [got, setGot] = useState<{ xlsx?: boolean; pdf?: boolean }>({});
  const next = yr + 1, limit = team.carryMax || 0, locked = !!team.locked;
  const rawOf = (id: string) => (raw && raw.members ? raw.members.find(m => m.id === id) : undefined);
  const baseYear = (raw && raw.year) || yr;

  const rows = team.members.filter(m => (m.pto || 0) > 0).map(m => {
    const half = new Set((m.half || []).filter((d): d is string => typeof d === "string"));
    let taken = 0;
    for (const d of m.days || []) if (typeof d === "string" && d.startsWith(yr + "-")) taken += half.has(d) ? 0.5 : 1;
    const allowance = (m.pto || 0) + (m.carry || 0);
    const stored = rawOf(m.id);
    // What the planner will bring into next year for this person, with the limit as it stands now
    const into = stored && next <= lastYear ? carryInfo(stored, next, baseYear, limit).carry : null;
    return { id: m.id, name: m.name || "–", allowance, taken, left: Math.max(0, allowance - taken), into };
  });
  const withLeft = rows.filter(r => r.left > 0);
  const totalLeft = withLeft.reduce((n, r) => n + r.left, 0);

  const step = { borderTop: "1px solid " + (th.gbd || th.bd), padding: "14px 0 4px" } as const;
  const h3 = { margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: th.tx, display: "flex", alignItems: "center", gap: 8 } as const;
  const badge = { width: 22, height: 22, borderRadius: 11, background: th.al, color: th.ac, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as const;
  const cell = { padding: "6px 8px", borderBottom: "1px solid " + (th.gbd || th.bd), fontSize: 13 } as const;
  const numCell = { ...cell, textAlign: "end", fontVariantNumeric: "tabular-nums" } as const;
  const done = <span aria-hidden="true" style={{ color: "#059669", fontWeight: 800 }}>✓</span>;

  return <div>
    <p className="v3-hint" style={{ color: th.t2 }}>{V("yeSub", { y: yr, n: next })}</p>

    <section style={step}>
      <h3 style={h3}><span style={badge}>1</span>{V("yeLeftT", { y: yr })}</h3>
      {rows.length === 0
        ? <p className="v3-hint" style={{ color: th.t2 }}>{V("yeLeftNone")}</p>
        : <>
          <p className="v3-hint" style={{ color: th.t2 }}>{V("yeLeftSum", { p: withLeft.length, d: show(totalLeft) })}</p>
          <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid " + (th.gbd || th.bd), borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: th.tx }}>
              <thead><tr style={{ position: "sticky", top: 0, background: th.sf }}>
                <th scope="col" style={{ ...cell, textAlign: "start", color: th.t2 }}>{V("rpMember")}</th>
                <th scope="col" style={{ ...numCell, color: th.t2 }}>{V("yeAllow")}</th>
                <th scope="col" style={{ ...numCell, color: th.t2 }}>{V("yeTaken")}</th>
                <th scope="col" style={{ ...numCell, color: th.t2 }}>{V("yeLeft")}</th>
                {next <= lastYear && <th scope="col" style={{ ...numCell, color: th.t2 }}>{V("yeInto", { n: next })}</th>}
              </tr></thead>
              <tbody>{rows.map(r => <tr key={r.id}>
                <td style={{ ...cell, fontWeight: 600 }}>{r.name}</td>
                <td style={numCell}>{show(r.allowance)}</td>
                <td style={numCell}>{show(r.taken)}</td>
                <td style={{ ...numCell, fontWeight: 800 }}>{show(r.left)}</td>
                {next <= lastYear && <td style={{ ...numCell, color: th.ac, fontWeight: 700 }}>{r.into == null ? "–" : show(r.into)}</td>}
              </tr>)}</tbody>
            </table>
          </div>
        </>}
    </section>

    {next <= lastYear && <section style={step}>
      <h3 style={h3}><span style={badge}>2</span>{V("yeCarryT", { n: next })}</h3>
      <p className="v3-hint" style={{ color: th.t2 }}>{V("yeCarryHelp", { n: next })}</p>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: th.tx }}>
        {X("carryUpTo")}
        <input type="number" min={0} max={60} value={limit} onChange={e => onCarryMax(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
          style={{ width: 72, minHeight: 40, padding: "0 8px", borderRadius: 10, border: "1px solid " + (th.gbd || th.bd), background: th.sf, color: th.tx, fontSize: 15, fontWeight: 700 }} />
        {X("days")}
      </label>
    </section>}

    <section style={step}>
      <h3 style={h3}><span style={badge}>3</span>{V("yeDlT", { y: yr })}</h3>
      <div className="v3-row" style={{ justifyContent: "flex-start", marginTop: 8 }}>
        <button type="button" className="v3-btn v3-ghost" onClick={() => { onXlsx(); setGot(g => ({ ...g, xlsx: true })); }} style={{ borderColor: th.gbd || th.bd, color: th.tx }}>Excel {got.xlsx && done}</button>
        <button type="button" className="v3-btn v3-ghost" onClick={() => { onPdf(); setGot(g => ({ ...g, pdf: true })); }} style={{ borderColor: th.gbd || th.bd, color: th.tx }}>{pdfLabel} {got.pdf && done}</button>
      </div>
    </section>

    <section style={step}>
      <h3 style={h3}><span style={badge}>4</span>{V("yeLockT", { y: yr })} {locked && done}</h3>
      <p className="v3-hint" style={{ color: th.t2 }}>{locked ? V("yeLockedOk", { y: yr }) : V("yeLockHelp", { y: yr })}{!mayLock && " " + V("yeLockNo")}</p>
      {mayLock && <div className="v3-row" style={{ justifyContent: "flex-start" }}>
        <button type="button" className={"v3-btn " + (locked ? "v3-ghost" : "v3-primary")} onClick={onLock}
          style={locked ? { borderColor: th.gbd || th.bd, color: th.tx } : { background: th.ac, color: th.ti || "#fff" }}>{locked ? unlockLabel : lockLabel}</button>
      </div>}
    </section>

    <div className="v3-row" style={{ ...step, paddingTop: 16 }}>
      <button type="button" className="v3-btn v3-ghost" onClick={onClose} style={{ borderColor: th.gbd || th.bd, color: th.tx }}>{V("yeDone")}</button>
      {onNextYear && <button type="button" className="v3-btn v3-primary" onClick={onNextYear} style={{ background: th.ac, color: th.ti || "#fff" }}>{V("yeOpenT", { n: next })} →</button>}
    </div>
  </div>;
}
