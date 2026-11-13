// Pure helpers for the v3 features (approval inbox, time travel, Wrapped, Today tiles). No React, no DOM:
// tested in isolation. Date keys are "YYYY-MM-DD" like everywhere else in the planner.

export type Member = { id: string; name?: string; days?: string[]; half?: string[]; approved?: boolean; country?: string; pto?: number | null; carry?: number; group?: string; logo?: string };
export type TeamView = { id?: string; name?: string; members: Member[]; approver?: string | null; threshold?: number; logo?: string; comments?: Record<string, unknown[]>; log?: unknown[]; w7?: boolean };

export const pad = (n: number) => String(n).padStart(2, "0");
export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dateOf = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (k: string, n: number) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
const inYear = (k: string, yr: number) => typeof k === "string" && k.startsWith(yr + "-");

// True when `b` is the next bookable day after `a`: the day after, or (teams on a Monday-to-Friday week) the first
// working day after the weekend in between. Reports and exports use it to print booked days as periods. It replaces
// "at most 3 days apart", which also joined a Monday with the Thursday after it and so printed working days nobody
// had booked as part of the period (and a re-import of such a CSV booked them).
export function nextLeaveDay(a: string, b: string, sevenDay: boolean): boolean {
  if (!(b > a)) return false;
  let c = addDays(a, 1);
  if (!sevenDay) for (let i = 0; i < 2 && c < b; i++) { const wd = dateOf(c).getDay(); if (wd === 0 || wd === 6) c = addDays(c, 1); else break; }
  return c === b;
}

// Days used: a half day counts 0.5
export function used(m: Member, yr?: number): number {
  const h = new Set(m.half || []);
  let n = 0;
  for (const k of m.days || []) if (yr == null || inYear(k, yr)) n += h.has(k) ? 0.5 : 1;
  return n;
}

// How many members are away on each day
export function awayCount(members: Member[]): Map<string, number> {
  const c = new Map<string, number>();
  for (const m of members) for (const k of new Set(m.days || [])) c.set(k, (c.get(k) || 0) + 1);
  return c;
}

// Consecutive date ranges from a list of keys: [["2026-03-02","2026-03-06"], ...]
export function ranges(keys: string[]): [string, string][] {
  const s = [...new Set(keys)].sort();
  const out: [string, string][] = [];
  for (const k of s) {
    const last = out[out.length - 1];
    if (last && addDays(last[1], 1) === k) last[1] = k; else out.push([k, k]);
  }
  return out;
}

// ─── Approval inbox ───
export type Pending = { member: Member; days: number; ranges: [string, string][]; overDays: string[]; worst: { day: string; away: number } | null };
export function pendingApprovals(team: TeamView, yr: number, threshold: number): Pending[] {
  const counts = awayCount(team.members);
  const lim = Math.max(1, threshold || 2);
  return team.members
    .filter(m => m && m.id !== team.approver && !m.approved && (m.days || []).some(k => inYear(k, yr)))
    .map(m => {
      const ks = (m.days || []).filter(k => inYear(k, yr)).sort();
      // Clashes only from today on: past days can't be changed any more
      const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const overDays = ks.filter(k => k >= today && (counts.get(k) || 0) >= lim);
      let worst: Pending["worst"] = null;
      for (const k of overDays) { const a = counts.get(k) || 0; if (!worst || a > worst.away) worst = { day: k, away: a }; }
      return { member: m, days: used(m, yr), ranges: ranges(ks), overDays, worst };
    });
}

// ─── Time travel: what changed between a past version and now (one year view) ───
export type MemberDiff = { id: string; name: string; added: string[]; removed: string[]; renamedFrom?: string; approval?: boolean };
export type TeamDiff = { membersAdded: string[]; membersRemoved: string[]; changed: MemberDiff[]; renamed?: { from: string; to: string }; logoChanged: boolean; total: number };
export function diffTeams(past: TeamView, now: TeamView): TeamDiff {
  const pm = new Map(past.members.map(m => [m.id, m]));
  const nm = new Map(now.members.map(m => [m.id, m]));
  const membersAdded = now.members.filter(m => !pm.has(m.id)).map(m => m.name || "?");
  const membersRemoved = past.members.filter(m => !nm.has(m.id)).map(m => m.name || "?");
  const changed: MemberDiff[] = [];
  for (const m of now.members) {
    const p = pm.get(m.id);
    if (!p) continue;
    const a = new Set(p.days || []), b = new Set(m.days || []);
    const added = [...b].filter(k => !a.has(k)).sort();
    const removed = [...a].filter(k => !b.has(k)).sort();
    const d: MemberDiff = { id: m.id, name: m.name || "?", added, removed };
    if ((p.name || "") !== (m.name || "")) d.renamedFrom = p.name || "?";
    if (!!p.approved !== !!m.approved) d.approval = !!m.approved;
    if (added.length || removed.length || d.renamedFrom || d.approval !== undefined) changed.push(d);
  }
  const renamed = (past.name || "") !== (now.name || "") ? { from: past.name || "", to: now.name || "" } : undefined;
  const logoChanged = (past.logo || "") !== (now.logo || "");
  const total = membersAdded.length + membersRemoved.length + changed.reduce((n, c) => n + c.added.length + c.removed.length + (c.renamedFrom ? 1 : 0) + (c.approval !== undefined ? 1 : 0), 0) + (renamed ? 1 : 0) + (logoChanged ? 1 : 0);
  return { membersAdded, membersRemoved, changed, renamed, logoChanged, total };
}

// ─── Wrapped ───
// "Off" = a leave day, a weekend day (unless the team works 7 days) or one of the member's public holidays.
export type Streak = { start: string; end: string; length: number; leave: number };
export function streaksOf(m: Member, yr: number, holidays: Set<string>, sevenDay: boolean): Streak[] {
  const leave = new Set((m.days || []).filter(k => inYear(k, yr)));
  if (!leave.size) return [];
  const isOff = (k: string) => {
    if (leave.has(k) || holidays.has(k)) return true;
    if (sevenDay) return false;
    const wd = dateOf(k).getDay();
    return wd === 0 || wd === 6;
  };
  const out: Streak[] = [];
  const seen = new Set<string>();
  for (const k of [...leave].sort()) {
    if (seen.has(k)) continue;
    let s = k, e = k;
    while (isOff(addDays(s, -1)) && inYear(addDays(s, -1), yr)) s = addDays(s, -1);
    while (isOff(addDays(e, 1)) && inYear(addDays(e, 1), yr)) e = addDays(e, 1);
    let len = 0, lv = 0;
    for (let c = s; c <= e; c = addDays(c, 1)) { len++; if (leave.has(c)) { lv++; seen.add(c); } }
    out.push({ start: s, end: e, length: len, leave: lv });
  }
  return out;
}

export type Persona = "summer" | "winter" | "weekender" | "marathon" | "spring" | "steady";
export type WrappedStats = {
  totalDays: number; people: number; peopleWithDays: number; weeks: number;
  months: number[]; topMonth: number;
  longest: { name: string; streak: Streak } | null;
  bestBridge: { name: string; streak: Streak; ratio: number } | null;
  personas: { name: string; persona: Persona }[];
  busiestDay: { day: string; away: number } | null;
};
export function wrappedStats(team: TeamView, yr: number, holOf: (m: Member) => Set<string>, sevenDay: boolean): WrappedStats {
  const months = new Array(12).fill(0);
  let totalDays = 0, peopleWithDays = 0;
  let longest: WrappedStats["longest"] = null, bestBridge: WrappedStats["bestBridge"] = null;
  const personas: WrappedStats["personas"] = [];
  for (const m of team.members) {
    const ks = (m.days || []).filter(k => inYear(k, yr));
    if (!ks.length) continue;
    peopleWithDays++;
    const u = used(m, yr);
    totalDays += u;
    const half = new Set(m.half || []);
    for (const k of ks) months[Number(k.slice(5, 7)) - 1] += half.has(k) ? 0.5 : 1;
    const st = streaksOf(m, yr, holOf(m), sevenDay);
    for (const s of st) {
      if (!longest || s.length > longest.streak.length) longest = { name: m.name || "?", streak: s };
      const ratio = s.length / Math.max(1, s.leave);
      if (s.leave >= 1 && s.length >= 4 && (!bestBridge || ratio > bestBridge.ratio || (ratio === bestBridge.ratio && s.length > bestBridge.streak.length))) bestBridge = { name: m.name || "?", streak: s, ratio };
    }
    const summer = ks.filter(k => ["06", "07", "08"].includes(k.slice(5, 7))).length;
    const winter = ks.filter(k => ["12", "01", "02"].includes(k.slice(5, 7))).length;
    const spring = ks.filter(k => ["03", "04", "05"].includes(k.slice(5, 7))).length;
    const maxRun = st.reduce((n, s) => Math.max(n, s.length), 0);
    const shortRuns = st.filter(s => s.leave <= 2).length;
    let persona: Persona = "steady";
    if (maxRun >= 14) persona = "marathon";
    else if (st.length >= 3 && shortRuns * 2 > st.length) persona = "weekender";
    else if (summer * 2 > ks.length) persona = "summer";
    else if (winter * 2 > ks.length) persona = "winter";
    else if (spring * 2 > ks.length) persona = "spring";
    personas.push({ name: m.name || "?", persona });
  }
  const counts = awayCount(team.members.map(m => ({ ...m, days: (m.days || []).filter(k => inYear(k, yr)) })));
  let busiestDay: WrappedStats["busiestDay"] = null;
  for (const [day, away] of counts) if (!busiestDay || away > busiestDay.away || (away === busiestDay.away && day < busiestDay.day)) busiestDay = { day, away };
  const topMonth = months.reduce((b, v, i) => (v > months[b] ? i : b), 0);
  return { totalDays, people: team.members.length, peopleWithDays, weeks: Math.round(totalDays / 5), months, topMonth, longest, bestBridge, personas, busiestDay };
}

// ─── Today tiles ───
export function outOn(team: TeamView, day: string): Member[] {
  return team.members.filter(m => (m.days || []).includes(day));
}
// Next day (from `from`, within `horizon` days) where `threshold` or more people are away
export function nextClash(team: TeamView, from: string, threshold: number, horizon = 30): { day: string; away: number } | null {
  const counts = awayCount(team.members);
  const lim = Math.max(1, threshold || 2);
  for (let i = 0, k = from; i <= horizon; i++, k = addDays(k, 1)) {
    const a = counts.get(k) || 0;
    if (a >= lim) return { day: k, away: a };
  }
  return null;
}
// Who comes back next: the earliest end of a leave range that is running today
// Who is away today and the day each is back at work: the first day after today that is neither leave nor,
// in a Mon–Fri team, a weekend or one of that person's public holidays. (It used to be simply the day after the
// last leave day in a row: off Thursday and Friday meant "back Saturday", and leave that went on after the
// weekend was cut short at the Friday.)
export function backSoon(team: TeamView, today: string, holOf?: (m: Member) => Set<string>): { id: string; name: string; back: string }[] {
  const out: { id: string; name: string; back: string }[] = [];
  const seven = !!team.w7;
  for (const m of team.members) {
    const ks = new Set(m.days || []);
    if (!ks.has(today)) continue;
    const hol = !seven && holOf ? holOf(m) : null;
    const notAtWork = (k: string) => { if (ks.has(k)) return true; if (seven) return false; const wd = dateOf(k).getDay(); return wd === 0 || wd === 6 || !!(hol && hol.has(k)); };
    let back = addDays(today, 1);
    for (let n = 0; n < 400 && notAtWork(back); n++) back = addDays(back, 1);
    out.push({ id: m.id, name: m.name || "?", back });
  }
  return out.sort((a, b) => a.back.localeCompare(b.back));
}
