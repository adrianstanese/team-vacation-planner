// Member PINs and team owners, enforced on the server.
// - PIN hashes and the owner key hash live only in the stored team; browsers get `hasPin: true` instead.
// - PINs: PBKDF2-SHA256 with salt ("pbkdf2$iter$salt$hash"); old unsalted SHA-256 hashes still verify and
//   are upgraded on the next correct entry. 5 wrong tries per member per 15 minutes.
// - A correct PIN gives a member token (HMAC, 12 h). The owner key (random, given once to the creator) can
//   change any member. A save that changes a PIN-protected member without one of them is reverted for that member.
import { createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql, type Sql } from "@/lib/db";

type Member = { id: string; pinHash?: string; hasPin?: boolean; [k: string]: unknown };
export type TeamDoc = { id?: string; ownerHash?: string; hasOwner?: boolean; members?: Member[]; [k: string]: unknown };

const ITER = 120_000;

let ready: Promise<Sql> | null = null;
export async function authDb(): Promise<Sql> {
  ready ||= (async () => {
    const sql = await getSql();
    await sql`CREATE TABLE IF NOT EXISTS app_secrets (k text PRIMARY KEY, v text NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS pin_attempts (team text NOT NULL, member text NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS team_trash (tid bigserial PRIMARY KEY, id text NOT NULL, data jsonb NOT NULL, updated_at timestamptz, expires_at timestamptz, deleted_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE INDEX IF NOT EXISTS team_trash_id ON team_trash (id)`;
    await sql`CREATE TABLE IF NOT EXISTS team_creates (ip text NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
    // Earlier versions of each team (time travel / recovery), at most one per hour plus one before any big loss
    await sql`CREATE TABLE IF NOT EXISTS team_versions (vid bigserial PRIMARY KEY, id text NOT NULL, data jsonb NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE INDEX IF NOT EXISTS team_versions_id_at ON team_versions (id, at DESC)`;
    return sql;
  })().catch(e => { ready = null; throw e; });
  return ready;
}

let secretCache: string | null = null;
async function secret(sql: Sql): Promise<string> {
  if (secretCache) return secretCache;
  await sql`INSERT INTO app_secrets (k, v) VALUES ('member-token', ${randomBytes(32).toString("hex")}) ON CONFLICT (k) DO NOTHING`;
  const [r] = await sql`SELECT v FROM app_secrets WHERE k = 'member-token'`;
  secretCache = String(r.v);
  return secretCache;
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const h = pbkdf2Sync(pin, salt, ITER, 32, "sha256");
  return `pbkdf2$${ITER}$${salt.toString("base64")}$${h.toString("base64")}`;
}

function eq(a: Buffer, b: Buffer) { return a.length === b.length && timingSafeEqual(a, b); }

export function checkPin(pin: string, stored: string): { ok: boolean; legacy: boolean } {
  if (!stored) return { ok: false, legacy: false };
  if (stored.startsWith("pbkdf2$")) {
    const [, it, salt, hash] = stored.split("$");
    const want = Buffer.from(hash, "base64");
    return { ok: eq(pbkdf2Sync(pin, Buffer.from(salt, "base64"), Number(it), want.length, "sha256"), want), legacy: false };
  }
  // Legacy: hex SHA-256 of the PIN (what the browser used to compute)
  const hex = createHash("sha256").update(pin).digest("hex");
  return { ok: eq(Buffer.from(hex), Buffer.from(String(stored).toLowerCase())), legacy: true };
}

// Records the attempt FIRST and then counts, so parallel guesses cannot all slip under the limit (race-safe)
export async function pinAttempt(sql: Sql, team: string, member: string): Promise<boolean> {
  await sql`INSERT INTO pin_attempts (team, member) VALUES (${team}, ${member})`;
  const [r] = await sql`SELECT COUNT(*)::int AS n FROM pin_attempts WHERE team = ${team} AND member = ${member} AND at > now() - interval '15 minutes'`;
  return Number(r?.n || 0) <= 5;
}
export async function pinCleared(sql: Sql, team: string, member: string) {
  await sql`DELETE FROM pin_attempts WHERE team = ${team} AND member = ${member}`;
}

// Member token = proof that the right PIN was entered. Bound to the member's CURRENT PIN hash, so setting or
// resetting the PIN invalidates every older token. Members without a PIN never get one.
const fp = (pinHash: string) => createHash("sha256").update(pinHash).digest("hex").slice(0, 16);
export async function memberToken(sql: Sql, team: string, member: string, pinHash: string): Promise<string> {
  const exp = Date.now() + 12 * 3600_000;
  const payload = `${team}.${member}.${exp}.${fp(pinHash)}`;
  return `${exp}.${createHmac("sha256", await secret(sql)).update(payload).digest("base64url")}`;
}
export async function validMemberToken(sql: Sql, team: string, member: string, pinHash: string | undefined, token: unknown): Promise<boolean> {
  if (typeof token !== "string" || !pinHash) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const want = createHmac("sha256", await secret(sql)).update(`${team}.${member}.${exp}.${fp(pinHash)}`).digest("base64url");
  return eq(Buffer.from(want), Buffer.from(sig));
}

export function newOwnerKey(): { key: string; hash: string } {
  const key = randomBytes(24).toString("base64url");
  return { key, hash: createHash("sha256").update(key).digest("hex") };
}
export function validOwner(doc: TeamDoc | null, key: unknown): boolean {
  if (!doc?.ownerHash || typeof key !== "string" || !key) return false;
  return eq(Buffer.from(createHash("sha256").update(key).digest("hex")), Buffer.from(doc.ownerHash));
}

// What browsers see: no hashes, just flags
export function publicTeam<T extends TeamDoc>(doc: T): T {
  if (!doc || typeof doc !== "object") return doc;
  const out: TeamDoc = { ...doc };
  if (out.ownerHash) { delete out.ownerHash; out.hasOwner = true; }
  if (Array.isArray(out.members)) out.members = out.members.map(m => {
    if (!m || typeof m !== "object" || !m.pinHash) return m;
    const { pinHash: _ph, ...rest } = m; void _ph;
    return { ...rest, hasPin: true };
  });
  return out as T;
}

// Canonical JSON: sorted keys, and day lists sorted, so key order (Postgres jsonb reorders keys) and day order
// never look like a change. Only real content differences count.
function canon(v: unknown, key = ""): unknown {
  if (Array.isArray(v)) { const a = v.map(x => canon(x)); return (key === "days" || key === "half") ? [...a].sort() : a; }
  if (v && typeof v === "object") { const o: Record<string, unknown> = {}; for (const k of Object.keys(v as object).sort()) { const x = (v as Record<string, unknown>)[k]; if (x !== undefined) o[k] = canon(x, k); } return o; }
  return v;
}
const strip = (m: Member) => { const c: Record<string, unknown> = { ...m }; delete c.pinHash; delete c.hasPin; if (c.pto === null) delete c.pto; return JSON.stringify(canon(c)); };
const APPROVAL_FIELDS = ["approved", "apY"];
const without = (m: Member, keys: string[]) => { const c: Record<string, unknown> = { ...m }; delete c.pinHash; delete c.hasPin; if (c.pto === null) delete c.pto; for (const k of keys) delete c[k]; return JSON.stringify(canon(c)); };
// Tabs opened before the Nov 2026 update still hold old unsalted PIN hashes and send them back. Until this
// date, such saves (no `base`) are treated like before: a matching legacy hash counts as proof, and a new
// member may arrive with a legacy hash. After this date old tabs simply need a reload.
const LEGACY_UNTIL = Date.parse("2026-11-26T00:00:00Z");
const LEGACY_HASH = /^[0-9a-f]{64}$/;
type LogEntry = { t?: unknown; a?: unknown };
type Trip = { id?: unknown; member?: unknown; [k: string]: unknown };

// Builds the document to store from what a browser sent: auth fields always come from the stored copy, and
// changes the browser was not allowed to make are reverted (per member, per trip) and listed in `reverted`.
//   full rights on a member  = that member's PIN token, or the owner key
//   approver rights          = the PIN token of a member who is the approver AND has a PIN; may only change
//                              approval fields (approved, apY) of other members
//   approver/isApprover/lock = only the owner, the current (PIN-protected) approver, or anyone while the team
//                              has neither an owner nor an approver yet
export async function guardIncoming(sql: Sql, teamId: string, stored: TeamDoc | null, incoming: TeamDoc, auth: { tokens?: Record<string, string>; owner?: string; legacy?: boolean }): Promise<{ doc: TeamDoc; reverted: string[] }> {
  const legacyOk = !!auth.legacy && Date.now() < LEGACY_UNTIL;
  const inById = new Map((Array.isArray(incoming.members) ? incoming.members : []).filter(m => m && typeof m === "object").map(m => [m.id, m]));
  const doc: TeamDoc = { ...incoming };
  delete doc.hasOwner;
  // createdAt is server-owned
  if (stored) { if (stored.createdAt) doc.createdAt = stored.createdAt; else delete doc.createdAt; }
  else doc.createdAt = new Date().toISOString();
  if (stored?.ownerHash) doc.ownerHash = stored.ownerHash; else delete doc.ownerHash;
  const owner = validOwner(stored, auth.owner);
  const storedMembers = (stored?.members || []).filter(m => m && typeof m.id === "string");
  const before = new Map(storedMembers.map(m => [m.id, m]));
  const tok = auth.tokens || {};
  const memberOk = new Map<string, boolean>();
  const self = async (id: string) => {
    if (!memberOk.has(id)) {
      const ph = before.get(id)?.pinHash;
      let ok = await validMemberToken(sql, teamId, id, ph, tok[id]);
      // Old tab: it sends the member's old hash back; accept a match during the transition window
      if (!ok && legacyOk && ph && LEGACY_HASH.test(ph) && inById.get(id)?.pinHash === ph) ok = true;
      memberOk.set(id, ok);
    }
    return memberOk.get(id)!;
  };
  const approverIds = storedMembers.filter(m => m.pinHash && (m.isApprover || m.id === stored?.approver)).map(m => m.id);
  let approverOk: boolean | null = null;
  const approver = async () => { if (approverOk === null) { approverOk = false; for (const a of approverIds) if (await self(a)) { approverOk = true; break; } } return approverOk; };
  // The team creator (teams created from Nov 2026 on; older teams have none): only the creator's own PIN session may
  // change, remove or re-PIN the creator. The owner key is not enough, so co-owners cannot touch the creator.
  const creatorId = typeof stored?.creatorId === "string" ? stored.creatorId : null;
  const full = async (id: string) => (id === creatorId ? await self(id) : owner || await self(id));
  const reverted = new Set<string>();

  // Team-level protected fields
  const noAuthority = stored && !stored.ownerHash && !stored.approver && !storedMembers.some(m => m.isApprover);
  const mayManage = !stored || owner || noAuthority || await approver();
  if (stored && !mayManage) {
    if ("approver" in stored) doc.approver = stored.approver; else delete doc.approver;
  }
  if (stored?.ownerHash && !owner) {
    for (const k of ["locked", "lockY"]) { if (k in stored) doc[k] = stored[k]; else delete doc[k]; }
  }
  // creatorId: set once, by the owner, when the team's first member is added; never changed afterwards
  if (creatorId) doc.creatorId = creatorId;
  else if (!((!stored || (owner && storedMembers.length === 0)) && typeof incoming.creatorId === "string" && inById.has(incoming.creatorId))) delete doc.creatorId;

  const out: Member[] = [];
  for (const m of Array.isArray(incoming.members) ? incoming.members : []) {
    if (!m || typeof m !== "object" || typeof m.id !== "string") continue;
    const old = before.get(m.id);
    const next: Member = { ...m }; delete next.hasPin; delete next.pinHash;
    if (old?.pinHash) next.pinHash = old.pinHash;
    // Old tab adding a brand-new member with the PIN it hashed itself (transition window only)
    else if (!old && legacyOk && typeof m.pinHash === "string" && LEGACY_HASH.test(m.pinHash)) next.pinHash = m.pinHash;
    // isApprover flag follows the same rule as the team approver field
    if (stored && !mayManage) { if (old && "isApprover" in old) next.isApprover = old.isApprover; else delete next.isApprover; }
    if (old?.pinHash && strip(old) !== strip(next) && !(await full(m.id))) {
      // Approver may change only approval fields of other members
      if (await approver() && without(old, APPROVAL_FIELDS) === without(next, APPROVAL_FIELDS)) { out.push(next); continue; }
      out.push(old); reverted.add(m.id); continue;
    }
    out.push(next);
  }
  // A protected member can only be removed with their token or the owner key
  for (const [id, old] of before) {
    if (old.pinHash && !out.some(m => m.id === id) && !(await full(id))) {
      const idx = storedMembers.findIndex(x => x.id === id);
      out.splice(Math.min(idx, out.length), 0, old); reverted.add(id);
    }
  }
  if (Array.isArray(incoming.members) || stored?.members) doc.members = out;
  if (doc.creatorId && !out.some(m => m.id === doc.creatorId)) delete doc.creatorId;

  // Trips of PIN-protected members follow the member's rights
  if (Array.isArray(incoming.trips) || Array.isArray(stored?.trips)) {
    const prot = new Set(storedMembers.filter(m => m.pinHash).map(m => m.id));
    const oldTrips = (Array.isArray(stored?.trips) ? stored!.trips as Trip[] : []).filter(t => t && typeof t === "object");
    const oldById = new Map(oldTrips.map(t => [String(t.id), t]));
    const res: Trip[] = [];
    for (const t of (Array.isArray(incoming.trips) ? incoming.trips as Trip[] : [])) {
      if (!t || typeof t !== "object") continue;
      const prev = oldById.get(String(t.id));
      const who = String(t.member || ""), prevWho = String(prev?.member || "");
      const touched = !prev || JSON.stringify(prev) !== JSON.stringify(t);
      if (touched && ((prot.has(who) && !(await full(who))) || (prev && prot.has(prevWho) && !(await full(prevWho))))) {
        if (prev) res.push(prev); reverted.add(prot.has(who) ? who : prevWho); continue;
      }
      res.push(t);
    }
    for (const t of oldTrips) { const who = String(t.member || ""); if (!res.some(x => String(x.id) === String(t.id)) && prot.has(who) && !(await full(who))) { res.push(t); reverted.add(who); } }
    doc.trips = res;
  }

  // Activity log is append-only: keep the stored entries, accept only new, later, well-formed ones
  if (stored) {
    const oldLog = (Array.isArray(stored.log) ? stored.log as LogEntry[] : []);
    const seen = new Set(oldLog.map(e => JSON.stringify(e)));
    const maxT = oldLog.reduce((m, e) => (typeof e?.t === "string" && e.t > m ? e.t : m), "");
    const fresh = (Array.isArray(incoming.log) ? incoming.log as LogEntry[] : [])
      .filter(e => e && typeof e.t === "string" && typeof e.a === "string" && e.t >= maxT && !seen.has(JSON.stringify(e)))
      .map(e => ({ t: String(e.t).slice(0, 40), a: String(e.a).slice(0, 200) }));
    doc.log = [...oldLog, ...fresh].slice(-50);
  }
  return { doc, reverted: [...reverted] };
}
