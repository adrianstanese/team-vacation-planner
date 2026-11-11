// Super admin: one account, configured only through environment variables (never in the repo, which is public).
//   ADMIN_USERNAME       the login name
//   ADMIN_PASSWORD_HASH  scrypt hash made by scripts/admin-password-hash.mjs (mark it Sensitive in Vercel)
// If either is missing, every admin route answers 404, so the feature is off by default.
import { createHmac, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { getSql, type Sql } from "@/lib/db";

export const COOKIE = "tvp_admin";
const SESSION_HOURS = 8;
const MAX_IP_FAILS = 5;        // per IP per 15 minutes
const MAX_GLOBAL_FAILS = 200;  // all IPs per hour: caps distributed guessing without letting strangers lock the admin out cheaply

export function adminConfigured(): boolean {
  return !!(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH);
}

// Format: scrypt:N:r:p:saltBase64:hashBase64 (colons, so .env loaders never try to expand it)
export function hashPassword(password: string, salt = randomBytes(16)): string {
  const N = 16384, r = 8, p = 1;
  const out = scryptSync(password, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", N, r, p, salt.toString("base64"), out.toString("base64")].join(":");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64");
  const got = scryptSync(password, Buffer.from(salt, "base64"), expected.length, { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

function sameText(a: string, b: string): boolean {
  const k = randomBytes(16);
  const ha = createHmac("sha256", k).update(a).digest(), hb = createHmac("sha256", k).update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME || "", h = process.env.ADMIN_PASSWORD_HASH || "";
  if (!u || !h) return false;
  const userOk = sameText(username.trim().toLowerCase(), u.trim().toLowerCase());
  const passOk = verifyPassword(password, h); // always run, so timing does not reveal the username
  return userOk && passOk;
}

// Session = base64url(payload).signature; the key is derived from the password hash, so changing the
// password signs everyone out.
function key(): string { return createHmac("sha256", process.env.ADMIN_PASSWORD_HASH || "").update("tvp-admin-session-v1").digest("hex"); }
const b64u = (s: string) => Buffer.from(s).toString("base64url");

export function makeSession(): { value: string; maxAge: number } {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  const payload = b64u(JSON.stringify({ u: process.env.ADMIN_USERNAME, exp }));
  const sig = createHmac("sha256", key()).update(payload).digest("base64url");
  return { value: `${payload}.${sig}`, maxAge: SESSION_HOURS * 3600 };
}

export function validSession(value: string | undefined): boolean {
  if (!value || !adminConfigured()) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return false;
  const want = createHmac("sha256", key()).update(payload).digest("base64url");
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return false;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return u === process.env.ADMIN_USERNAME && typeof exp === "number" && exp > Date.now();
  } catch { return false; }
}

export function clientIp(req: NextRequest): string {
  // Vercel's edge sets x-real-ip and overwrites any value a client sends; nothing else is trusted
  return (req.headers.get("x-real-ip") || "unknown").trim().slice(0, 64);
}

// Blocks cross-site requests: state-changing admin calls must come from this site's own pages
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).host === req.headers.get("host"); } catch { return false; }
}

export async function isAdmin(req: NextRequest): Promise<boolean> {
  return validSession(req.cookies.get(COOKIE)?.value);
}

let ready: Promise<void> | null = null;
export async function adminDb(): Promise<Sql> {
  const sql = await getSql();
  ready ||= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS admin_attempts (ip text NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS admin_log (id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), action text NOT NULL, team_id text, detail text)`;
    await sql`CREATE TABLE IF NOT EXISTS team_trash (tid bigserial PRIMARY KEY, id text NOT NULL, data jsonb NOT NULL, updated_at timestamptz, expires_at timestamptz, deleted_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE INDEX IF NOT EXISTS team_trash_id ON team_trash (id)`;
    await sql`CREATE TABLE IF NOT EXISTS team_creates (ip text NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
  })().catch(e => { ready = null; throw e; });
  await ready;
  return sql;
}

// Retention (privacy notice): expired teams → trash; trash erased after 30 days; admin log kept 12 months;
// login attempts 1 day. Runs at most once an hour per server instance, inside normal requests (no cron).
let lastPurge = 0;
export async function purgeOld(sql: Sql) {
  if (Date.now() - lastPurge < 3600_000) return;
  lastPurge = Date.now();
  try {
    await sql`CREATE TABLE IF NOT EXISTS team_trash (tid bigserial PRIMARY KEY, id text NOT NULL, data jsonb NOT NULL, updated_at timestamptz, expires_at timestamptz, deleted_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE INDEX IF NOT EXISTS team_trash_id ON team_trash (id)`;
    await sql`CREATE TABLE IF NOT EXISTS team_creates (ip text NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
    await sql`WITH gone AS (DELETE FROM teams WHERE expires_at < now() RETURNING id, data, updated_at, expires_at)
      INSERT INTO team_trash (id, data, updated_at, expires_at) SELECT id, data, updated_at, expires_at FROM gone`;
    await sql`DELETE FROM team_trash WHERE deleted_at < now() - interval '30 days'`;
    await sql`CREATE TABLE IF NOT EXISTS team_versions (vid bigserial PRIMARY KEY, id text NOT NULL, data jsonb NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
    await sql`DELETE FROM team_versions WHERE at < now() - interval '30 days'`;
    await sql`DELETE FROM team_creates WHERE at < now() - interval '1 day'`;
    await sql`CREATE TABLE IF NOT EXISTS admin_log (id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), action text NOT NULL, team_id text, detail text)`;
    await sql`DELETE FROM admin_log WHERE at < now() - interval '12 months'`;
    await sql`CREATE TABLE IF NOT EXISTS admin_attempts (ip text NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
    await sql`DELETE FROM admin_attempts WHERE at < now() - interval '1 day'`;
    await sql`CREATE TABLE IF NOT EXISTS pin_attempts (team text NOT NULL, member text NOT NULL, at timestamptz NOT NULL DEFAULT now())`;
    await sql`DELETE FROM pin_attempts WHERE at < now() - interval '1 day'`;
  } catch (e) { lastPurge = 0; console.error("purge failed", e instanceof Error ? e.message : "error"); }
}

// Records the attempt FIRST, then counts it (race-safe: parallel guesses all count). Cleared on success.
export async function tooManyAttempts(sql: Sql, ip: string): Promise<boolean> {
  await sql`INSERT INTO admin_attempts (ip) VALUES (${ip})`;
  const [a] = await sql`SELECT
      COUNT(*) FILTER (WHERE ip = ${ip} AND at > now() - interval '15 minutes')::int AS mine,
      COUNT(*) FILTER (WHERE at > now() - interval '1 hour')::int AS everyone
    FROM admin_attempts WHERE at > now() - interval '1 hour'`;
  return Number(a?.mine || 0) > MAX_IP_FAILS || Number(a?.everyone || 0) > MAX_GLOBAL_FAILS;
}

export async function clearFailures(sql: Sql, ip: string) {
  await sql`DELETE FROM admin_attempts WHERE ip = ${ip}`;
}

export async function logAction(sql: Sql, action: string, teamId: string | null, detail = "") {
  await sql`INSERT INTO admin_log (action, team_id, detail) VALUES (${action}, ${teamId}, ${detail.slice(0, 300)})`;
}
