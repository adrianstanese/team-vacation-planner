"use client";
// Welcome back: on someone's first working day after a break, a card above the Today tiles. For the person who is
// signed in it greets them and offers "What did I miss?": the team as it was before the break (time travel, the
// newest saved copy from before the break started) compared with now. Others see a light "back today" line.
import { useState } from "react";
import { V } from "@/lib/v3Text";
import { dateLocale } from "@/lib/extraText";
import { addDays, dateOf, diffTeams, type Member, type TeamView, type TeamDiff } from "@/lib/v3Util";

type Back = { m: Member; from: string; to: string };
const short = (k: string) => { try { return dateOf(k).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }); } catch { return k; } };

/** Who is back today: today is a working day for them and the working day before it was a leave day. */
export function backToday(team: TeamView, today: string, holOf: (m: Member) => Set<string>, w7: boolean): Back[] {
  const out: Back[] = [];
  for (const m of team.members) {
    const days = new Set(m.days || []), hol = holOf(m);
    const off = (k: string) => hol.has(k) || (!w7 && [0, 6].includes(dateOf(k).getDay()));
    if (days.has(today) || off(today)) continue;
    let k = addDays(today, -1), n = 0;
    while (off(k) && n++ < 10) k = addDays(k, -1);
    if (!days.has(k)) continue;
    const to = k; let from = k; n = 0;
    while (n++ < 120) { const p = addDays(from, -1); if (days.has(p) || off(p)) from = p; else break; }
    while (off(from) && from < to) from = addDays(from, 1);
    out.push({ m, from, to });
  }
  return out;
}

export default function WelcomeBack({ team, teamId, yr, today, holOf, w7, meId, colorOf }: {
  team: TeamView; teamId: string; yr: number; today: string; holOf: (m: Member) => Set<string>; w7: boolean; meId: string | null; colorOf: (id: string) => { d: string };
}) {
  const [diff, setDiff] = useState<TeamDiff | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "none" | "done">("idle");
  if (!today.startsWith(yr + "-")) return null;
  const back = backToday(team, today, holOf, w7);
  if (!back.length) return null;
  const me = back.find(b => b.m.id === meId) || null;
  const others = back.filter(b => b !== me);
  const missed = async () => {
    if (!me) return;
    setState("loading");
    try {
      const list = await fetch("/api/team/versions?id=" + encodeURIComponent(teamId)).then(r => r.json());
      const start = dateOf(me.from).getTime();
      const vs: { vid: string; at: string }[] = (list && list.versions) || [];
      const pick = vs.find(v => new Date(v.at).getTime() <= start) || vs[vs.length - 1];
      if (!pick) { setState("none"); return; }
      const past = await fetch("/api/team/versions?id=" + encodeURIComponent(teamId) + "&vid=" + pick.vid).then(r => r.json());
      const doc = past && past.data;
      if (!doc) { setState("none"); return; }
      const inYr = (m: Member) => ({ ...m, days: (m.days || []).filter(d => d.startsWith(yr + "-")) });
      const d = diffTeams({ ...doc, members: (doc.members || []).map(inYr) }, { ...team, members: team.members.map(inYr) });
      d.changed = d.changed.filter(c => c.id !== me.m.id);
      const any = d.membersAdded.length || d.membersRemoved.length || d.changed.length || d.renamed;
      setDiff(d); setState(any ? "done" : "none");
    } catch { setState("none"); }
  };
  return <section className="tvp-wb" aria-label={V("wbTitle")}>
    {me && <div className="tvp-wb-me" style={{ ["--mc" as string]: colorOf(me.m.id).d }}>
      <span className="tvp-wb-wave" aria-hidden="true">👋</span>
      <div className="tvp-wb-txt">
        <b>{V("wbHi", { n: (me.m.name || "").split(" ")[0] })}</b>
        <small>{V("wbAway", { a: short(me.from), b: short(me.to) })}</small>
      </div>
      {state === "idle" && <button type="button" onClick={missed}>{V("wbMissed")}</button>}
      {state === "loading" && <span className="tvp-wb-load" aria-live="polite">…</span>}
      {state === "none" && <span className="tvp-wb-none">{V("wbNothing")}</span>}
      {state === "done" && diff && <ul className="tvp-wb-list">
        {diff.membersAdded.map(n => <li key={"a" + n}>➕ {V("wbJoined", { n })}</li>)}
        {diff.membersRemoved.map(n => <li key={"r" + n}>➖ {V("wbLeft", { n })}</li>)}
        {diff.changed.map(c => <li key={c.id}>🗓️ {c.name}: {[c.added.length ? "+" + c.added.length : "", c.removed.length ? "−" + c.removed.length : ""].filter(Boolean).join(" / ")}{c.approval !== undefined ? " · " + (c.approval ? "✓" : "↺") : ""}</li>)}
        {diff.renamed && <li>✏️ {diff.renamed.from} → {diff.renamed.to}</li>}
      </ul>}
    </div>}
    {others.length > 0 && <div className="tvp-wb-others">
      <span aria-hidden="true">👋</span>
      {others.map(b => <span key={b.m.id} className="tvp-wb-chip" style={{ ["--mc" as string]: colorOf(b.m.id).d }}><i />{V("wbBack", { n: b.m.name || "" })}<small>{short(b.from)} – {short(b.to)}</small></span>)}
    </div>}
  </section>;
}
