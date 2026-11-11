// Normalises a team document coming from a browser before it is stored. It never rejects (old teams with odd
// data must keep saving); it drops or coerces values that are malformed, so nothing unexpected (like HTML in a
// date or a year) can reach the reports, feeds or other browsers.
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOGO = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v : v == null ? "" : String(v)).slice(0, max);
const dates = (v: unknown, max: number) => Array.isArray(v) ? [...new Set(v.filter((d): d is string => typeof d === "string" && DATE.test(d)))].slice(0, max) : undefined;
const int = (v: unknown, lo: number, hi: number) => { const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN; return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : undefined; };

export function cleanTeam(input: Obj): Obj {
  const t: Obj = { ...input };
  if ("name" in t) t.name = str(t.name, 80);
  if ("year" in t) { const y = int(t.year, 2000, 2100); if (y === undefined) delete t.year; else t.year = y; }
  if ("logo" in t && !(typeof t.logo === "string" && t.logo.length < 60000 && LOGO.test(t.logo))) delete t.logo;
  if ("accentColor" in t && !(typeof t.accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(t.accentColor))) delete t.accentColor;
  if ("carryMax" in t) { const c = int(t.carryMax, 0, 60); if (!c) delete t.carryMax; else t.carryMax = c; }
  if ("creatorId" in t && !(typeof t.creatorId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(t.creatorId))) delete t.creatorId;
  if ("approverReq" in t) { const r = t.approverReq; if (isObj(r) && typeof r.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(r.id)) t.approverReq = { id: r.id, at: str(r.at, 40) }; else delete t.approverReq; }
  if ("pinResets" in t) { const a = Array.isArray(t.pinResets) ? t.pinResets.filter(r => isObj(r) && typeof r.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(r.id)).slice(0, 20).map(r => ({ id: (r as Obj).id as string, at: str((r as Obj).at, 40) })) : []; if (a.length) t.pinResets = a; else delete t.pinResets; }
  if ("threshold" in t) { const c = int(t.threshold, 1, 50); if (c === undefined) delete t.threshold; else t.threshold = c; }
  if (Array.isArray(t.members)) {
    t.members = t.members.filter(isObj).slice(0, 50).map(m0 => {
      const m: Obj = { ...m0 };
      m.id = str(m.id, 64);
      if ("name" in m) m.name = str(m.name, 60);
      if ("country" in m && m.country != null) { const c = str(m.country, 2).toUpperCase(); if (/^[A-Z]{2}$/.test(c)) m.country = c; else m.country = null; }
      if ("region" in m && m.region != null) m.region = str(m.region, 24);
      if ("group" in m) { const g = str(m.group, 24).trim(); if (g) m.group = g; else delete m.group; }
      if ("role" in m) { const r = str(m.role, 40).trim(); if (r) m.role = r; else delete m.role; }
      const d = dates(m.days, 4000); if (d) m.days = d; else if ("days" in m) m.days = [];
      const h = dates(m.half, 4000); if (h) m.half = h; else delete m.half;
      if ("pto" in m && m.pto != null) { const p = int(m.pto, 0, 366); m.pto = p === undefined ? null : p; }
      if (isObj(m.ptoY)) { const o: Obj = {}; for (const [k, v] of Object.entries(m.ptoY)) { const p = int(v, 0, 366); if (/^\d{4}$/.test(k) && p !== undefined) o[k] = p; } if (Object.keys(o).length) m.ptoY = o; else delete m.ptoY; } else delete m.ptoY;
      if (isObj(m.apY)) { const o: Obj = {}; for (const [k, v] of Object.entries(m.apY)) if (/^\d{4}$/.test(k) && v === true) o[k] = true; if (Object.keys(o).length) m.apY = o; else delete m.apY; } else delete m.apY;
      return m;
    }).filter(m => m.id);
  }
  if (Array.isArray(t.trips)) {
    t.trips = t.trips.filter(isObj).slice(0, 500).map(x => ({ ...x, id: str(x.id, 40), member: str(x.member, 64), start: str(x.start, 10), end: str(x.end, 10), dest: str(x.dest, 60), project: str(x.project, 80) }))
      .filter(x => DATE.test(x.start) && DATE.test(x.end));
  }
  if (isObj(t.comments)) {
    const o: Obj = {};
    for (const [k, v] of Object.entries(t.comments).slice(0, 1000)) if (DATE.test(k) && Array.isArray(v)) o[k] = v.filter(isObj).slice(0, 50).map(c => ({ by: str(c.by, 60), at: str(c.at, 40), t: str(c.t, 280) }));
    t.comments = o;
  } else delete t.comments;
  if (isObj(t.lockY)) { const o: Obj = {}; for (const [k, v] of Object.entries(t.lockY)) if (/^\d{4}$/.test(k) && v === true) o[k] = true; if (Object.keys(o).length) t.lockY = o; else delete t.lockY; } else delete t.lockY;
  return t;
}
