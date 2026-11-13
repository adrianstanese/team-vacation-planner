"use client";
// Super admin console: all teams, PIN resets, locks, expiry, trash and an action log.
import { useEffect, useState } from "react";
import Link from "next/link";

const F = "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
const C = { bg: "#F4F2FB", card: "#FFFFFF", tx: "#1E1B4B", t2: "#4B5563", t3: "#64648A", bd: "#E6E3F3", ac: "#6D28D9", al: "#EDE9FE", red: "#DC2626", redBg: "#FEF2F2", green: "#047857", greenBg: "#ECFDF5", amber: "#B45309", amberBg: "#FFFBEB" };

type Stats = { teams: number; active: number; updated7: number; updated30: number; members: number; empty: number; trash: number; visits: number; countries: { cc: string; n: number }[]; months: { month: string; n: number }[] };
type TeamRow = { id: string; name: string; year: string; created: string; updated_at: string; expires_at: string; locked: boolean; approver: string | null; members: number; pins: number; days: number };
type Member = { id: string; name?: string; country?: string; region?: string; days?: string[]; hasPin?: boolean; resetPending?: boolean; pto?: number; approved?: boolean };
type TeamDetail = { team: { id?: string; name?: string; year?: number; locked?: boolean; hasOwner?: boolean; lockY?: Record<string, boolean>; approver?: string | null; members: Member[]; createdAt?: string; log?: { t: string; a: string }[] }; updated_at: string; expires_at: string };

const fmt = (s?: string | null) => { if (!s) return "—"; const d = new Date(s); return isNaN(+d) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); };
const ago = (s?: string | null) => { if (!s) return "—"; const d = (Date.now() - new Date(s).getTime()) / 864e5; if (d < 1) return "today"; if (d < 2) return "yesterday"; if (d < 60) return `${Math.floor(d)} days ago`; return fmt(s); };

async function api(path: string, body?: unknown) {
  const res = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

function Btn({ children, onClick, tone = "plain", small = false, disabled = false }: { children: React.ReactNode; onClick?: () => void; tone?: "plain" | "primary" | "danger"; small?: boolean; disabled?: boolean }) {
  const s = tone === "primary" ? { background: C.ac, color: "#fff", border: `1px solid ${C.ac}` } : tone === "danger" ? { background: C.redBg, color: C.red, border: "1px solid #FECACA" } : { background: C.card, color: C.tx, border: `1px solid ${C.bd}` };
  return <button disabled={disabled} onClick={onClick} style={{ ...s, padding: small ? "4px 10px" : "8px 14px", borderRadius: 10, fontSize: small ? 12 : 13, fontWeight: 600, fontFamily: F, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap" }}>{children}</button>;
}

function Login({ onDone }: { onDone: () => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!u || !p) { setErr("Enter your username and password."); return; }
    setBusy(true); setErr("");
    const r = await api("/api/admin", { op: "login", username: u, password: p });
    setBusy(false);
    if (r.status === 200) { setP(""); onDone(); } else setErr(String(r.data.error || "Sign-in failed."));
  };
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ width: "100%", maxWidth: 360, background: C.card, border: `1px solid ${C.bd}`, borderRadius: 20, padding: 28 }}>
      <h1 style={{ fontSize: 20, fontWeight: 750, color: C.tx, margin: "0 0 4px" }}>Admin sign-in</h1>
      <div style={{ fontSize: 13, color: C.t3, marginBottom: 18 }}>Team Vacation Planner</div>
      <label htmlFor="adm-u" style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>Username</label>
      <input id="adm-u" autoComplete="username" value={u} onChange={e => { setU(e.target.value); setErr(""); }} style={inp} />
      <label htmlFor="adm-p" style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>Password</label>
      <input id="adm-p" type="password" autoComplete="current-password" value={p} onChange={e => { setP(e.target.value); setErr(""); }} style={inp} />
      {err && <div role="alert" style={{ fontSize: 13, color: C.red, margin: "2px 0 10px" }}>{err}</div>}
      <button type="submit" disabled={busy} style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: C.ac, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: F, cursor: "pointer", opacity: busy ? 0.7 : 1 }}>{busy ? "Signing in…" : "Sign in"}</button>
      <Link href="/" prefetch={false} style={{ display: "block", textAlign: "center", marginTop: 14, fontSize: 12, color: C.t3, textDecoration: "none" }}>Back to the planner</Link>
    </form>
  </div>;
}
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 12px", margin: "4px 0 12px", borderRadius: 10, border: `1px solid ${C.bd}`, fontSize: 14, fontFamily: F, color: C.tx };

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return <div style={{ background: C.card, border: `1px solid ${C.bd}`, borderRadius: 16, padding: "14px 16px" }}>
    <div style={{ fontSize: 12, color: C.t3, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 750, color: C.tx, marginTop: 2 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: C.t3 }}>{sub}</div>}
  </div>;
}

function Bars({ items, label }: { items: { k: string; n: number }[]; label: string }) {
  const max = Math.max(1, ...items.map(i => i.n));
  return <div style={{ background: C.card, border: `1px solid ${C.bd}`, borderRadius: 16, padding: "14px 16px" }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 10 }}>{label}</div>
    {items.length === 0 && <div style={{ fontSize: 12, color: C.t3 }}>No data yet.</div>}
    {items.map(i => <div key={i.k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, fontSize: 12 }}>
      <span style={{ width: 62, color: C.t2, fontVariantNumeric: "tabular-nums" }}>{i.k}</span>
      <span style={{ flex: 1, height: 8, borderRadius: 4, background: C.al, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${Math.round(i.n / max * 100)}%`, background: C.ac, borderRadius: 4 }} /></span>
      <span style={{ width: 28, textAlign: "right", color: C.tx, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{i.n}</span>
    </div>)}
  </div>;
}

function Detail({ id, onClose, onChanged, flash }: { id: string; onClose: () => void; onChanged: () => void; flash: (m: string) => void }) {
  const [d, setD] = useState<TeamDetail | null>(null); const [err, setErr] = useState(""); const [name, setName] = useState("");
  const [ver, setVer] = useState(0);
  useEffect(() => {
    let alive = true;
    api(`/api/admin?op=team&id=${id}`).then(r => {
      if (!alive) return;
      if (r.status === 200) { const td = r.data as unknown as TeamDetail; setD(td); setName(String(td.team.name || "")); setErr(""); }
      else setErr(String(r.data.error || "Could not load the team."));
    });
    return () => { alive = false; };
  }, [id, ver]);
  const act = async (payload: Record<string, unknown>, done: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const r = await api("/api/admin", { op: "action", id, ...payload });
    if (r.status === 200) {
      flash(done);
      // A PIN reset comes with a one-time setup code: only the person who gets it from you can set the new PIN
      if (payload.action === "resetPin" && r.data.code) window.alert(`${done}.\n\nOne-time setup code: ${r.data.code}\n\nGive it to them (valid for 24 hours). They need it to set a new PIN; nobody else with the team link can.`);
      if (payload.action === "trash") { onChanged(); onClose(); return; } setVer(v => v + 1); onChanged();
    }
    else flash(String(r.data.error || "That did not work."));
  };
  if (err) return <Panel onClose={onClose}><div style={{ color: C.red, fontSize: 14 }}>{err}</div></Panel>;
  if (!d) return <Panel onClose={onClose}><div style={{ color: C.t3, fontSize: 14 }}>Loading…</div></Panel>;
  const t = d.team; const base = t.year || new Date().getFullYear();
  const lockedYears = [t.locked ? String(base) : null, ...Object.keys(t.lockY || {})].filter(Boolean);
  return <Panel onClose={onClose}>
    <div style={{ fontSize: 12, color: C.t3, fontFamily: "monospace" }}>{id}</div>
    <div style={{ display: "flex", gap: 8, margin: "6px 0 12px" }}>
      <input value={name} maxLength={40} onChange={e => setName(e.target.value)} style={{ ...inp, margin: 0, fontSize: 16, fontWeight: 700 }} aria-label="Team name" />
      <Btn small onClick={() => act({ action: "rename", name }, "Renamed")} disabled={!name.trim() || name === t.name}>Rename</Btn>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, fontSize: 12, color: C.t2, marginBottom: 14 }}>
      <div>Year<br /><b style={{ color: C.tx }}>{t.year || "—"}</b></div>
      <div>Created<br /><b style={{ color: C.tx }}>{fmt(t.createdAt)}</b></div>
      <div>Last saved<br /><b style={{ color: C.tx }}>{ago(d.updated_at)}</b></div>
      <div>Expires<br /><b style={{ color: new Date(d.expires_at) < new Date() ? C.red : C.tx }}>{fmt(d.expires_at)}</b></div>
      <div>Locked<br /><b style={{ color: C.tx }}>{lockedYears.length ? lockedYears.join(", ") : "No"}</b></div>
      <div>Approval mode<br /><b style={{ color: C.tx }}>{t.approver ? "On" : "Off"}</b></div>
      <div>Owner<br /><b style={{ color: C.tx }}>{t.hasOwner ? "Yes" : "None"}</b></div>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
      <a href={`/#team=${id}`} target="_blank" rel="noopener" style={{ textDecoration: "none" }}><Btn small tone="primary">Open team</Btn></a>
      <a href={`/api/admin?op=export&id=${id}`} style={{ textDecoration: "none" }}><Btn small>Download JSON</Btn></a>
      <Btn small onClick={() => act({ action: "extend" }, "Expiry extended by 24 months")}>Extend 24 months</Btn>
      <Btn small onClick={async () => {
        if (t.hasOwner && !window.confirm("This team already has an owner. A new link replaces the old owner key. Continue?")) return;
        const r = await api("/api/admin", { op: "action", id, action: "ownerLink" });
        if (r.status === 200) { const link = String(r.data.link); try { await navigator.clipboard.writeText(link); flash("Owner link copied (shown once)"); } catch { window.prompt("Owner link (shown once):", link); } setVer(v => v + 1); }
        else flash(String(r.data.error || "That did not work."));
      }}>Create owner link</Btn>
      {t.locked ? <Btn small onClick={() => act({ action: "setLock", locked: false, year: base }, `Unlocked ${base}`)}>Unlock {base}</Btn> : <Btn small onClick={() => act({ action: "setLock", locked: true, year: base }, `Locked ${base}`)}>Lock {base}</Btn>}
      {Object.keys(t.lockY || {}).map(y => <Btn key={y} small onClick={() => act({ action: "setLock", locked: false, year: Number(y) }, `Unlocked ${y}`)}>Unlock {y}</Btn>)}
      {t.approver && <Btn small onClick={() => act({ action: "clearApprover" }, "Approval mode turned off", "Turn off approval mode for this team?")}>Turn off approval</Btn>}
      <Btn small tone="danger" onClick={() => act({ action: "trash" }, "Moved to trash", `Move "${t.name}" to the trash? People with the link will no longer find it. You can restore it from Trash.`)}>Move to trash</Btn>
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 8 }}>Members ({t.members.length})</div>
    <div style={{ border: `1px solid ${C.bd}`, borderRadius: 12, overflow: "hidden", marginBottom: 18 }}>
      {t.members.length === 0 && <div style={{ padding: 12, fontSize: 13, color: C.t3 }}>No members yet.</div>}
      {t.members.map((m, i) => <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderTop: i ? `1px solid ${C.bd}` : "none", fontSize: 13 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || "—"}{t.approver === m.id && <span style={{ marginLeft: 6, fontSize: 11, color: C.ac }}>approver</span>}</div>
          <div style={{ fontSize: 11, color: C.t3 }}>{m.country || "—"}{m.region ? "·" + m.region : ""} · {(m.days || []).length} days{m.pto ? ` · allowance ${m.pto}` : ""}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: m.hasPin ? C.greenBg : "#F3F4F6", color: m.hasPin ? C.green : C.t3 }}>{m.hasPin ? "PIN set" : "No PIN"}</span>
        <Btn small disabled={!m.hasPin && !m.resetPending} onClick={() => act({ action: "resetPin", memberId: m.id }, `PIN reset for ${m.name}`, `Reset the PIN for ${m.name}? You will get a one-time setup code to pass on; they need it to set a new PIN.`)}>Reset PIN</Btn>
        <Btn small tone="danger" onClick={() => act({ action: "removeMember", memberId: m.id }, `${m.name} removed`, `Remove ${m.name} and all their days from "${t.name}"? This cannot be undone.`)}>Remove</Btn>
      </div>)}
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 8 }}>Team activity (latest 10)</div>
    <div style={{ fontSize: 12, color: C.t2 }}>
      {(t.log || []).slice(-10).reverse().map((l, i) => <div key={i} style={{ padding: "3px 0" }}><span style={{ color: C.t3 }}>{fmt(l.t)}</span> · {l.a}</div>)}
      {!(t.log || []).length && <div style={{ color: C.t3 }}>Nothing recorded.</div>}
    </div>
  </Panel>;
}

function Panel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(30,27,75,.25)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
    <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Team details" style={{ width: "100%", maxWidth: 560, height: "100%", overflowY: "auto", background: C.bg, padding: 20, boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn small onClick={onClose}>Close</Btn></div>
      {children}
    </div>
  </div>;
}

function Console({ onSignOut }: { onSignOut: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<TeamRow[]>([]); const [more, setMore] = useState(false); const [page, setPage] = useState(0);
  const [q, setQ] = useState(""); const [tab, setTab] = useState<"teams" | "trash" | "log">("teams");
  const [open, setOpen] = useState<string | null>(null); const [toast, setToast] = useState("");
  const [trash, setTrash] = useState<{ id: string; name: string; deleted_at: string; members: number }[]>([]);
  const [log, setLog] = useState<{ at: string; action: string; team_id: string | null; detail: string }[]>([]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  const [ver, setVer] = useState(0);
  const refresh = () => setVer(v => v + 1);
  useEffect(() => {
    let alive = true;
    api("/api/admin?op=stats").then(r => { if (!alive) return; if (r.status === 401) onSignOut(); else if (r.status === 200) setStats(r.data as unknown as Stats); });
    return () => { alive = false; };
  }, [ver, onSignOut]);
  useEffect(() => {
    let alive = true;
    const h = setTimeout(() => {
      api(`/api/admin?op=teams&page=${page}&q=${encodeURIComponent(q)}`).then(r => {
        if (!alive) return;
        if (r.status === 401) onSignOut();
        else if (r.status === 200) { setRows(r.data.teams as TeamRow[]); setMore(!!r.data.more); }
      });
    }, 250);
    return () => { alive = false; clearTimeout(h); };
  }, [q, page, ver, onSignOut]);
  useEffect(() => {
    if (tab === "teams") return;
    let alive = true;
    api(`/api/admin?op=${tab}`).then(r => {
      if (!alive) return;
      if (r.status === 401) onSignOut();
      else if (r.status === 200) { if (tab === "trash") setTrash(r.data.teams as typeof trash); else setLog(r.data.log as typeof log); }
    });
    return () => { alive = false; };
  }, [tab, ver, onSignOut]);

  const signOut = async () => { await api("/api/admin", { op: "logout" }); onSignOut(); };
  const trashAct = async (id: string, action: "restore" | "purge") => {
    let confirm: string | undefined;
    if (action === "purge") { const v = window.prompt(`Delete this team forever? This cannot be undone.\nType the team id to confirm:\n${id}`); if (v === null) return; confirm = v.trim(); }
    const r = await api("/api/admin", { op: "action", action, id, confirm });
    flash(r.status === 200 ? (action === "restore" ? "Team restored" : "Deleted forever") : String(r.data.error || "That did not work."));
    refresh();
  };

  return <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 16px 60px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
      <div><div style={{ fontSize: 22, fontWeight: 750, color: C.tx }}>Admin</div><div style={{ fontSize: 12, color: C.t3 }}>Team Vacation Planner · all teams</div></div>
      <div style={{ display: "flex", gap: 8 }}><Link href="/" prefetch={false} style={{ textDecoration: "none" }}><Btn small>Open planner</Btn></Link><Btn small onClick={signOut}>Sign out</Btn></div>
    </div>
    {stats && <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 10 }}>
        <Stat label="Teams" value={stats.active} sub={`${stats.teams} stored · ${stats.empty} empty`} />
        <Stat label="Members" value={stats.members} />
        <Stat label="Edited in 7 days" value={stats.updated7} sub={`${stats.updated30} in 30 days`} />
        <Stat label="Visits counted" value={stats.visits} />
        <Stat label="In trash" value={stats.trash} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 10, marginBottom: 18 }}>
        <Bars label="Teams created per month" items={stats.months.map(m => ({ k: m.month, n: m.n }))} />
        <Bars label="Members by country" items={stats.countries.map(c => ({ k: c.cc, n: c.n }))} />
      </div>
    </>}
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      {(["teams", "trash", "log"] as const).map(k => <button key={k} onClick={() => setTab(k)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${tab === k ? C.ac : C.bd}`, background: tab === k ? C.al : C.card, color: tab === k ? C.ac : C.t2, fontWeight: 600, fontSize: 13, fontFamily: F, cursor: "pointer" }}>{k === "teams" ? "Teams" : k === "trash" ? "Trash" : "Admin log"}</button>)}
    </div>

    {tab === "teams" && <>
      <input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Search by team name, member name or team id" aria-label="Search teams" style={{ ...inp, maxWidth: 420, margin: "0 0 10px" }} />
      <div style={{ background: C.card, border: `1px solid ${C.bd}`, borderRadius: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
          <thead><tr style={{ textAlign: "left", color: C.t3, fontSize: 12 }}>
            {["Team", "Year", "Members", "Days", "PINs", "Last saved", "Expires", ""].map(h => <th key={h} style={{ padding: "10px 12px", fontWeight: 600, borderBottom: `1px solid ${C.bd}` }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(r => { const expired = r.expires_at && new Date(r.expires_at) < new Date(); return <tr key={r.id} onClick={() => setOpen(r.id)} style={{ cursor: "pointer", borderBottom: `1px solid ${C.bd}` }}>
              <td style={{ padding: "9px 12px" }}><div style={{ fontWeight: 600, color: C.tx }}>{r.name || "—"} {r.locked && <span style={{ fontSize: 11, color: C.amber }}>locked</span>}</div><div style={{ fontSize: 11, color: C.t3, fontFamily: "monospace" }}>{r.id.slice(0, 12)}…</div></td>
              <td style={{ padding: "9px 12px", color: C.t2 }}>{r.year || "—"}</td>
              <td style={{ padding: "9px 12px", color: C.t2 }}>{r.members}</td>
              <td style={{ padding: "9px 12px", color: C.t2 }}>{r.days}</td>
              <td style={{ padding: "9px 12px", color: C.t2 }}>{r.pins}</td>
              <td style={{ padding: "9px 12px", color: C.t2 }}>{ago(r.updated_at)}</td>
              <td style={{ padding: "9px 12px", color: expired ? C.red : C.t2 }}>{expired ? "Expired" : fmt(r.expires_at)}</td>
              <td style={{ padding: "9px 12px", textAlign: "right" }}><span style={{ color: C.ac, fontWeight: 600, fontSize: 12 }}>Manage →</span></td>
            </tr>; })}
            {rows.length === 0 && <tr><td colSpan={8} style={{ padding: 16, color: C.t3 }}>{q ? "No team matches that search." : "No teams yet."}</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <Btn small disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</Btn>
        <Btn small disabled={!more} onClick={() => setPage(p => p + 1)}>Next</Btn>
      </div>
    </>}

    {tab === "trash" && <div style={{ background: C.card, border: `1px solid ${C.bd}`, borderRadius: 16 }}>
      {trash.length === 0 && <div style={{ padding: 16, fontSize: 13, color: C.t3 }}>The trash is empty.</div>}
      {trash.map((t, i) => <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i ? `1px solid ${C.bd}` : "none", fontSize: 13 }}>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: C.tx }}>{t.name || "—"}</div><div style={{ fontSize: 11, color: C.t3 }}>{t.members} members · moved to trash {ago(t.deleted_at)}</div></div>
        <Btn small onClick={() => trashAct(t.id, "restore")}>Restore</Btn>
        <Btn small tone="danger" onClick={() => trashAct(t.id, "purge")}>Delete forever</Btn>
      </div>)}
    </div>}

    {tab === "log" && <div style={{ background: C.card, border: `1px solid ${C.bd}`, borderRadius: 16, padding: "6px 14px" }}>
      {log.length === 0 && <div style={{ padding: 10, fontSize: 13, color: C.t3 }}>No admin actions yet.</div>}
      {log.map((l, i) => <div key={i} style={{ padding: "7px 0", borderTop: i ? `1px solid ${C.bd}` : "none", fontSize: 13, color: C.t2 }}>
        <span style={{ color: C.t3 }}>{new Date(l.at).toLocaleString()}</span> · <b style={{ color: C.tx }}>{l.action}</b>{l.team_id ? <> · <span style={{ fontFamily: "monospace", fontSize: 12 }}>{l.team_id.slice(0, 12)}</span></> : null}{l.detail ? ` · ${l.detail}` : ""}
      </div>)}
    </div>}

    {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={refresh} flash={flash} />}
    {toast && <div role="status" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.tx, color: "#fff", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, zIndex: 60 }}>{toast}</div>}
  </div>;
}

// Stable sign-out callback (effects depend on it)
function useMemoSignOut(setState: (s: "out") => void) {
  const [fn] = useState(() => () => setState("out"));
  return fn;
}

export default function AdminPage() {
  const [state, setState] = useState<"loading" | "off" | "out" | "in">("loading");
  useEffect(() => {
    let alive = true;
    api("/api/admin?op=session").then(r => { if (alive) setState(r.status === 404 ? "off" : r.data.ok ? "in" : "out"); });
    return () => { alive = false; };
  }, []);
  const signedOut = useMemoSignOut(setState);
  return <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F, color: C.tx }}>
    {state === "loading" && <div style={{ padding: 40, textAlign: "center", color: C.t3, fontSize: 14 }}>Loading…</div>}
    {state === "off" && <div style={{ padding: 40, textAlign: "center", color: C.t3, fontSize: 14 }}>Admin is not set up on this site.</div>}
    {state === "out" && <Login onDone={() => setState("in")} />}
    {state === "in" && <Console onSignOut={signedOut} />}
  </div>;
}
