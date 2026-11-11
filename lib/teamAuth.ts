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
const AUTH_FIELDS = ["pinHash"] as const;

let ready: Promise<Sql> | null = null;
export async function authDb(): Promise<Sql> {
  ready ||= (async () => {
    const sql = await getSql();
    await sql`CREATE TABLE IF NOT EXISTS app_secrets (k text PRIMARY KEY, v text NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS pin_attempts (team text NOT NULL, member text NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
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

export async function tooManyPinTries(sql: Sql, team: string, member: string) {
  const [r] = await sql`SELECT COUNT(*)::int AS n FROM pin_attempts WHERE team = ${team} AND member = ${member} AND at > now() - interval '15 minutes'`;
  return Number(r?.n || 0) >= 5;
}
export async function pinFailed(sql: Sql, team: string, member: string) {
  await sql`INSERT INTO pin_attempts (team, member) VALUES (${team}, ${member})`;
  await sql`DELETE FROM pin_attempts WHERE at < now() - interval '1 day'`;
}
export async function pinCleared(sql: Sql, team: string, member: string) {
  await sql`DELETE FROM pin_attempts WHERE team = ${team} AND member = ${member}`;
}

export async function memberToken(sql: Sql, team: string, member: string): Promise<string> {
  const exp = Date.now() + 12 * 3600_000;
  const payload = `${team}.${member}.${exp}`;
  return `${exp}.${createHmac("sha256", await secret(sql)).update(payload).digest("base64url")}`;
}
export async function validMemberToken(sql: Sql, team: string, member: string, token: unknown): Promise<boolean> {
  if (typeof token !== "string") return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const want = createHmac("sha256", await secret(sql)).update(`${team}.${member}.${exp}`).digest("base64url");
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

const strip = (m: Member) => { const c: Record<string, unknown> = { ...m }; delete c.pinHash; delete c.hasPin; return JSON.stringify(c); };

// Builds the document to store from what a browser sent, keeping auth fields from the stored copy and
// reverting changes to PIN-protected members that the browser was not allowed to make.
export async function guardIncoming(sql: Sql, teamId: string, stored: TeamDoc | null, incoming: TeamDoc, auth: { tokens?: Record<string, string>; owner?: string }): Promise<{ doc: TeamDoc; reverted: string[] }> {
  const doc: TeamDoc = { ...incoming };
  delete doc.hasOwner;
  if (stored?.ownerHash) doc.ownerHash = stored.ownerHash; else delete doc.ownerHash;
  const owner = validOwner(stored, auth.owner);
  const before = new Map((stored?.members || []).filter(m => m && m.id).map(m => [m.id, m]));
  const reverted: string[] = [];
  // The team's approver, once unlocked with their PIN, may manage every member (as the app always allowed)
  const approverIds = (stored?.members || []).filter(m => m && (m.isApprover || m.id === stored?.approver)).map(m => m.id);
  let approverOk: boolean | null = null;
  const approver = async () => {
    if (approverOk === null) { approverOk = false; for (const a of approverIds) if (await validMemberToken(sql, teamId, a, auth.tokens?.[a])) { approverOk = true; break; } }
    return approverOk;
  };
  const allowed = async (id: string) => owner || await validMemberToken(sql, teamId, id, auth.tokens?.[id]) || await approver();
  const out: Member[] = [];
  for (const m of Array.isArray(incoming.members) ? incoming.members : []) {
    if (!m || typeof m !== "object") continue;
    const old = before.get(m.id);
    const next: Member = { ...m }; delete next.hasPin;
    for (const f of AUTH_FIELDS) { if (old && old[f]) next[f] = old[f]; else delete next[f]; }
    if (old?.pinHash && strip(old) !== strip(m) && !(await allowed(m.id))) { out.push(old); reverted.push(m.id); continue; }
    out.push(next);
  }
  // A protected member can only be removed with their token or the owner key
  for (const [id, old] of before) {
    if (old.pinHash && !out.some(m => m.id === id) && !(await allowed(id))) {
      const idx = (stored?.members || []).findIndex(x => x.id === id);
      out.splice(Math.min(idx, out.length), 0, old); reverted.push(id);
    }
  }
  if (Array.isArray(incoming.members) || stored?.members) doc.members = out;
  return { doc, reverted };
}
