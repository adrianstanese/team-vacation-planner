// Three-way merge of a team document, used when two people save the same team at the same time.
//   base   = the version this browser last loaded or saved
//   mine   = what this browser wants to save now
//   theirs = what is on the server now (someone else saved in between)
// Rule of thumb: keep every change either side made since base; when both changed the same thing, mine wins.
// Vacation days merge as set changes (added/removed days), so two people editing different members never
// lose each other's work, and two edits to the same member's days combine.

type Obj = Record<string, unknown>;
const J = (v: unknown) => JSON.stringify(v);
const same = (a: unknown, b: unknown) => J(a) === J(b);
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function mergeSet(base: unknown, mine: unknown, theirs: unknown): string[] | undefined {
  const b = new Set(Array.isArray(base) ? base as string[] : []);
  const m = new Set(Array.isArray(mine) ? mine as string[] : []);
  const t = Array.isArray(theirs) ? theirs as string[] : [];
  if (!Array.isArray(mine) && !Array.isArray(theirs)) return undefined;
  const added = [...m].filter(x => !b.has(x)), removed = [...b].filter(x => !m.has(x));
  const out = t.filter(x => !removed.includes(x));
  for (const x of added) if (!out.includes(x)) out.push(x);
  return out;
}

// Field-by-field: a field changed by me (vs base) takes my value, otherwise the server's
function mergeFields(base: Obj, mine: Obj, theirs: Obj, special: Record<string, (b: unknown, m: unknown, t: unknown) => unknown> = {}): Obj {
  const out: Obj = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
  for (const k of keys) {
    let v: unknown;
    if (special[k]) v = special[k](base[k], mine[k], theirs[k]);
    else if (!same(mine[k], base[k])) v = mine[k];
    else v = theirs[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// Lists of objects with an id (members, trips): merged item by item, order follows theirs, my new items appended
function mergeById(base: unknown, mine: unknown, theirs: unknown, item: (b: Obj, m: Obj, t: Obj) => Obj): Obj[] | undefined {
  if (!Array.isArray(mine) && !Array.isArray(theirs)) return undefined;
  const B = new Map((Array.isArray(base) ? base as Obj[] : []).filter(isObj).map(x => [String(x.id), x]));
  const M = new Map((Array.isArray(mine) ? mine as Obj[] : []).filter(isObj).map(x => [String(x.id), x]));
  const T = (Array.isArray(theirs) ? theirs as Obj[] : []).filter(isObj);
  const out: Obj[] = [];
  const seen = new Set<string>();
  // Keep my order when I reordered; otherwise theirs
  const myOrder = Array.isArray(mine) && Array.isArray(base) && !same((mine as Obj[]).map(x => x?.id), (base as Obj[]).map(x => x?.id))
    && (mine as Obj[]).length === (base as Obj[]).length;
  const order: string[] = myOrder ? [...M.keys()] : T.map(x => String(x.id));
  const TT = new Map(T.map(x => [String(x.id), x]));
  for (const id of order) {
    seen.add(id);
    const b = B.get(id), m = M.get(id), t = TT.get(id);
    if (b && !m) continue;                       // I deleted it
    if (!t) { if (m && !b) out.push(m); continue; } // they deleted it (unless it's my new one)
    if (!m) { out.push(t); continue; }           // they added it
    out.push(b ? item(b, m, t) : m);
  }
  for (const [id, m] of M) if (!seen.has(id) && !B.has(id)) out.push(m); // my new items
  for (const t of T) { const id = String(t.id); if (!seen.has(id) && !(B.has(id) && !M.has(id)) && !out.some(x => String(x.id) === id)) out.push(t); }
  return out;
}

function mergeLog(base: unknown, mine: unknown, theirs: unknown): unknown {
  const t = Array.isArray(theirs) ? theirs as Obj[] : [];
  const b = Array.isArray(base) ? base as Obj[] : [];
  const m = Array.isArray(mine) ? mine as Obj[] : [];
  const mineNew = m.filter(x => !b.some(y => same(x, y)));
  const out = [...t, ...mineNew.filter(x => !t.some(y => same(x, y)))]
    .sort((x, y) => String(x.t || "").localeCompare(String(y.t || "")));
  return out.slice(-50);
}

// Lists of plain items without an id (the comments of one day): my removals and my additions are applied to
// their list, so two people commenting on the same day at the same time both keep their comment.
function mergeList(base: unknown, mine: unknown, theirs: unknown): unknown[] {
  const B = Array.isArray(base) ? base : [], M = Array.isArray(mine) ? mine : [], T = Array.isArray(theirs) ? theirs : [];
  const has = (list: unknown[], x: unknown) => list.some(y => same(x, y));
  const removed = B.filter(x => !has(M, x));
  const out = T.filter(x => !has(removed, x));
  for (const x of M) if (!has(B, x) && !has(out, x)) out.push(x);
  return out;
}

function mergeComments(base: unknown, mine: unknown, theirs: unknown): unknown {
  const b = isObj(base) ? base : {}, m = isObj(mine) ? mine : {}, t = isObj(theirs) ? theirs : {};
  if (!isObj(mine) && !isObj(theirs)) return undefined;
  const out: Obj = {};
  for (const k of new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)])) {
    // A day I did not touch keeps their list as it is
    const v = same(m[k], b[k]) ? t[k] : mergeList(b[k], m[k], t[k]);
    if (v !== undefined && !(Array.isArray(v) && v.length === 0 && !(k in t))) out[k] = v;
  }
  return out;
}

// One member, merged field by field, then made consistent again:
// - a half day only exists on a day that is still booked;
// - an approval I gave does not cover days the member added after the version I was looking at. Those days were
//   never seen by the approver, so the plan goes back to "waiting" for that year (`approved` = the team's own
//   year, `apY[year]` = any other year).
function mergeMember(b: Obj, m: Obj, t: Obj, baseYear: string): Obj {
  const out = mergeFields(b, m, t, {
    days: (x, y, z) => mergeSet(x, y, z),
    half: (x, y, z) => mergeSet(x, y, z),
  });
  if (Array.isArray(out.half)) {
    const booked = new Set(Array.isArray(out.days) ? out.days as string[] : []);
    const half = (out.half as string[]).filter(d => booked.has(d));
    if (half.length || "half" in t) out.half = half; else delete out.half;
  }
  // Unseen by me: a day they added, or a half day they turned into a full one (the server and the screen count
  // that as more leave too)
  const seen = new Set(Array.isArray(b.days) ? b.days as string[] : []);
  const seenHalf = new Set(Array.isArray(b.half) ? b.half as string[] : []), theirHalf = new Set(Array.isArray(t.half) ? t.half as string[] : []);
  const unseenYears = new Set((Array.isArray(t.days) ? t.days as unknown[] : [])
    .filter((d): d is string => typeof d === "string" && (!seen.has(d) || (seenHalf.has(d) && !theirHalf.has(d)))).map(d => d.slice(0, 4)));
  if (unseenYears.size) {
    if (m.approved === true && b.approved !== true && baseYear && unseenYears.has(baseYear)) out.approved = false;
    const mineY = isObj(m.apY) ? m.apY : {}, baseY = isObj(b.apY) ? b.apY : {};
    if (isObj(out.apY)) {
      const apY: Obj = { ...out.apY };
      for (const y of unseenYears) if (mineY[y] === true && baseY[y] !== true) delete apY[y];
      if (Object.keys(apY).length) out.apY = apY; else delete out.apY;
    }
  }
  return out;
}

export function mergeTeam(base: Obj | null, mine: Obj, theirs: Obj | null): Obj {
  if (!theirs) return mine;
  if (!base) return mine; // nothing to diff against: keep the user's view (old behaviour)
  const baseYear = String(theirs.year ?? mine.year ?? new Date().getFullYear()); // a team without a year uses the current one, as everywhere else
  return mergeFields(base, mine, theirs, {
    members: (b, m, t) => mergeById(b, m, t, (bb, mm, tt) => mergeMember(bb, mm, tt, baseYear)),
    trips: (b, m, t) => mergeById(b, m, t, (bb, mm, tt) => mergeFields(bb, mm, tt)),
    log: mergeLog,
    comments: mergeComments,
  });
}
