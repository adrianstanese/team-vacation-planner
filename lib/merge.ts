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

function mergeComments(base: unknown, mine: unknown, theirs: unknown): unknown {
  const b = isObj(base) ? base : {}, m = isObj(mine) ? mine : {}, t = isObj(theirs) ? theirs : {};
  if (!isObj(mine) && !isObj(theirs)) return undefined;
  const out: Obj = {};
  for (const k of new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)])) {
    const v = !same(m[k], b[k]) ? m[k] : t[k];
    if (v !== undefined && !(Array.isArray(v) && v.length === 0 && !(k in t))) out[k] = v;
  }
  return out;
}

export function mergeTeam(base: Obj | null, mine: Obj, theirs: Obj | null): Obj {
  if (!theirs) return mine;
  if (!base) return mine; // nothing to diff against: keep the user's view (old behaviour)
  return mergeFields(base, mine, theirs, {
    members: (b, m, t) => mergeById(b, m, t, (bb, mm, tt) => mergeFields(bb, mm, tt, {
      days: (x, y, z) => mergeSet(x, y, z),
      half: (x, y, z) => mergeSet(x, y, z),
    })),
    trips: (b, m, t) => mergeById(b, m, t, (bb, mm, tt) => mergeFields(bb, mm, tt)),
    log: mergeLog,
    comments: mergeComments,
  });
}
