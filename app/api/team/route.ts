import { getSql } from "@/lib/db";
import { adminDb, clientIp, purgeOld } from "@/lib/adminAuth";
import { authDb, guardIncoming, newOwnerKey, publicTeam, validOwner, type TeamDoc } from "@/lib/teamAuth";
import { cleanTeam } from "@/lib/teamShape";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ID = /^[a-z0-9]{1,64}$/i;
const MAX_BYTES = 600_000; // a 50-person team with 10 years of days is about 250 KB
const MAX_NEW_PER_HOUR = 20; // new teams per IP
const NO_STORE = { "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" };

// GET ?id=  → the team JSON without PIN or owner hashes; its version comes in the X-Updated-At header
export async function GET(request: NextRequest) {
  const sql = await getSql();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!ID.test(id)) return NextResponse.json(null, { headers: NO_STORE });
  // A team is kept until it has been unused for 36 months, and opening it is use: the date moves on, at most once
  // a month per team (so reading stays a read almost every time). The version (updated_at) is not touched.
  const rows = await sql`WITH touch AS (
      UPDATE teams SET expires_at = NOW() + INTERVAL '36 months'
      WHERE id = ${id} AND expires_at > NOW() AND expires_at < NOW() + INTERVAL '35 months')
    SELECT data, updated_at::text AS v FROM teams WHERE id = ${id} AND expires_at > NOW()`;
  if (rows.length === 0) return NextResponse.json(null, { headers: NO_STORE });
  return NextResponse.json(publicTeam(rows[0].data as TeamDoc), { headers: { ...NO_STORE, "X-Updated-At": String(rows[0].v || "") } });
}

// PUT { id, data, base?, tokens?, owner? }
// base = the version this browser last saw; if the team changed since, 409 + the current team (browser merges).
// Without base (pages opened before Nov 2026) it saves as before: last write wins.
// tokens/owner = proof for changing PIN-protected members (lib/teamAuth.ts); unauthorised changes are
// reverted and listed in `reverted`. Creating a team returns its owner key once (`owner`).
export async function PUT(request: NextRequest) {
  const sql = await authDb();
  await purgeOld(sql);
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "Team too large" }, { status: 413 });
  let body: { id?: string; data?: TeamDoc; base?: string | null; tokens?: Record<string, string>; owner?: string };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const id = body.id;
  if (!id || !body.data || typeof body.data !== "object" || Array.isArray(body.data)) return NextResponse.json({ error: "Missing id or data" }, { status: 400 });
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const incoming = cleanTeam(body.data as Record<string, unknown>) as TeamDoc;
  // legacy = a tab opened before this version (it never sends a version `base`)
  const auth = { tokens: body.tokens && typeof body.tokens === "object" ? body.tokens : {}, owner: typeof body.owner === "string" ? body.owner : undefined, legacy: !("base" in body) };
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await sql`SELECT data, updated_at::text AS v FROM teams WHERE id = ${id}`;
    if (cur.length && typeof body.base === "string" && body.base && cur[0].v !== body.base) {
      return NextResponse.json({ conflict: true, data: publicTeam(cur[0].data as TeamDoc), v: cur[0].v }, { status: 409, headers: NO_STORE });
    }
    const stored = cur.length ? (cur[0].data as TeamDoc) : null;
    // A save without the member list would drop everyone unprotected: refuse it
    if (stored && Array.isArray(stored.members) && stored.members.length && !Array.isArray(incoming.members)) {
      return NextResponse.json({ error: "Missing members" }, { status: 400, headers: NO_STORE });
    }
    const { doc, reverted, adjusted } = await guardIncoming(sql, id, stored, incoming, auth);
    if (cur.length) {
      const rows = await sql`UPDATE teams SET data = ${JSON.stringify(doc)}::jsonb, updated_at = NOW(), expires_at = NOW() + INTERVAL '36 months'
        WHERE id = ${id} AND updated_at::text = ${cur[0].v} RETURNING updated_at::text AS v`;
      if (!rows.length) continue; // someone saved in between: re-read and re-check
      if (stored) await snapshot(sql, id, stored, doc);
      return NextResponse.json({ ok: true, v: rows[0].v, reverted, ...(adjusted ? { adjusted: true } : {}) }, { headers: NO_STORE });
    }
    // New team. A deleted team's id cannot be reused (its copy waits in the trash for 30 days).
    const trashed = await sql`SELECT 1 FROM team_trash WHERE id = ${id} LIMIT 1`;
    if (trashed.length) return NextResponse.json({ error: "This team was deleted. Ask the site admin to restore it." }, { status: 410, headers: NO_STORE });
    const ip = clientIp(request);
    await sql`INSERT INTO team_creates (ip) VALUES (${ip})`;
    const [c] = await sql`SELECT COUNT(*)::int AS n FROM team_creates WHERE ip = ${ip} AND at > now() - interval '1 hour'`;
    if (Number(c?.n || 0) > MAX_NEW_PER_HOUR) return NextResponse.json({ error: "Too many new teams. Try again later." }, { status: 429, headers: NO_STORE });
    // The creator becomes the owner: the key is returned once and only its hash is stored
    const { key, hash } = newOwnerKey();
    doc.ownerHash = hash;
    const rows = await sql`INSERT INTO teams (id, data, updated_at, expires_at) VALUES (${id}, ${JSON.stringify(doc)}::jsonb, NOW(), NOW() + INTERVAL '36 months')
      ON CONFLICT (id) DO NOTHING RETURNING updated_at::text AS v`;
    if (!rows.length) continue;
    return NextResponse.json({ ok: true, v: rows[0].v, reverted, owner: key }, { headers: NO_STORE });
  }
  return NextResponse.json({ error: "Busy, try again" }, { status: 503, headers: NO_STORE });
}

// Keeps the version a save replaced (time travel and recovery, 30 days): at most one copy per hour, plus one
// before a save that drops members or many days (at most one such copy per 10 minutes). Never a copy identical to
// the newest one. Per team the 4 oldest and 20 newest copies are kept, within a byte budget, so flooding a team
// cannot push its good copies out; site-wide ceilings throttle brand-new teams first. A failed snapshot never fails
// the save.
type Sql = Awaited<ReturnType<typeof authDb>>;
const KEEP_OLDEST = 4, KEEP_NEWEST = 20;         // per team: the oldest copies survive any flood of new ones
const TEAM_BUDGET = 6 * 1024 * 1024;              // per team: stored bytes of all its copies
const SOFT_CEILING = 150 * 1024 * 1024;           // all teams: above this, teams younger than 7 days get no copies
const HARD_CEILING = 300 * 1024 * 1024;           // all teams: above this, no new copies at all (logged)
const dayCount = (d: TeamDoc | null) => (d?.members || []).reduce((n, m) => n + (Array.isArray(m?.days) ? m.days.length : 0), 0);
async function snapshot(sql: Sql, id: string, before: TeamDoc, after: TeamDoc) {
  try {
    const big = (after.members || []).length < (before.members || []).length || dayCount(after) < dayCount(before) - 10;
    const [sz] = await sql`SELECT pg_total_relation_size('team_versions')::bigint AS b,
      (SELECT COALESCE(SUM(pg_column_size(data)), 0) FROM team_versions WHERE id = ${id})::bigint AS t,
      (SELECT (data->>'createdAt') > to_char((now() - interval '7 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') FROM teams WHERE id = ${id}) AS young`;
    const total = Number(sz?.b || 0);
    if (total > HARD_CEILING) { console.error("team_versions over its hard ceiling: snapshots paused", total); return; }
    if (total > SOFT_CEILING && sz?.young) { console.error("team_versions over its soft ceiling: no snapshot for a new team", id); return; }
    if (Number(sz?.t || 0) > TEAM_BUDGET) { console.error("team over its snapshot budget", id); return; }
    const json = JSON.stringify(before);
    const ins = await sql`INSERT INTO team_versions (id, data) SELECT ${id}, ${json}::jsonb
      WHERE (
        NOT EXISTS (SELECT 1 FROM team_versions WHERE id = ${id} AND at > now() - interval '1 hour')
        OR (${big} AND NOT EXISTS (SELECT 1 FROM team_versions WHERE id = ${id} AND at > now() - interval '10 minutes'))
      )
      AND NOT EXISTS (SELECT 1 FROM (SELECT data FROM team_versions WHERE id = ${id} ORDER BY at DESC LIMIT 1) n WHERE n.data = ${json}::jsonb)
      RETURNING vid`;
    if (ins.length) await sql`DELETE FROM team_versions WHERE id = ${id}
      AND vid NOT IN (SELECT vid FROM team_versions WHERE id = ${id} ORDER BY at DESC LIMIT ${KEEP_NEWEST})
      AND vid NOT IN (SELECT vid FROM team_versions WHERE id = ${id} ORDER BY at ASC LIMIT ${KEEP_OLDEST})`;
  } catch (e) { console.error("snapshot failed", e); }
}

// DELETE ?id= → the team leaves the public site and a copy is kept in team_trash (restorable by the site admin
// for 30 days). Owned teams need the owner key (X-Owner-Key). Teams without an owner but with PIN-protected
// members can only be deleted by the site admin.
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!ID.test(id)) return NextResponse.json({ ok: true });
  const sql = await adminDb(); // makes sure team_trash exists
  const cur = await sql`SELECT data FROM teams WHERE id = ${id}`;
  if (!cur.length) return NextResponse.json({ ok: true });
  const doc = cur[0].data as TeamDoc;
  if (doc?.ownerHash) {
    if (!validOwner(doc, request.headers.get("x-owner-key"))) return NextResponse.json({ error: "Only the team owner can delete this team" }, { status: 403 });
  } else if ((doc?.members || []).some(m => m && m.pinHash)) {
    return NextResponse.json({ error: "This team can only be deleted by the site admin" }, { status: 403 });
  }
  await sql`WITH gone AS (DELETE FROM teams WHERE id = ${id} RETURNING id, data, updated_at, expires_at)
    INSERT INTO team_trash (id, data, updated_at, expires_at) SELECT id, data, updated_at, expires_at FROM gone`;
  return NextResponse.json({ ok: true });
}
