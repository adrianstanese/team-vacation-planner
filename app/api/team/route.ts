import { getSql } from "@/lib/db";
import { adminDb } from "@/lib/adminAuth";
import { authDb, guardIncoming, publicTeam, validOwner, type TeamDoc } from "@/lib/teamAuth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ID = /^[a-z0-9]{1,64}$/i;
const MAX_BYTES = 1_000_000; // a full 50-person team with every day booked is about 250 KB
const NO_STORE = { "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" };

// GET ?id=  → the team JSON without PIN or owner hashes; its version comes in the X-Updated-At header
export async function GET(request: NextRequest) {
  const sql = await getSql();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!ID.test(id)) return NextResponse.json(null, { headers: NO_STORE });
  const rows = await sql`SELECT data, updated_at::text AS v FROM teams WHERE id = ${id} AND expires_at > NOW()`;
  if (rows.length === 0) return NextResponse.json(null, { headers: NO_STORE });
  return NextResponse.json(publicTeam(rows[0].data as TeamDoc), { headers: { ...NO_STORE, "X-Updated-At": String(rows[0].v || "") } });
}

// PUT { id, data, base?, tokens?, owner? }
// base = the version this browser last saw; if the team changed since, 409 + the current team (browser merges).
// Without base (pages opened before Nov 2026) it saves as before: last write wins.
// tokens/owner = proof for changing PIN-protected members (see lib/teamAuth.ts); unauthorised changes to
// those members are reverted and listed in `reverted`.
export async function PUT(request: NextRequest) {
  const sql = await authDb();
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "Team too large" }, { status: 413 });
  let body: { id?: string; data?: TeamDoc; base?: string | null; tokens?: Record<string, string>; owner?: string };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const id = body.id;
  if (!id || !body.data || typeof body.data !== "object") return NextResponse.json({ error: "Missing id or data" }, { status: 400 });
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (body.data.members !== undefined && (!Array.isArray(body.data.members) || body.data.members.length > 50)) {
    return NextResponse.json({ error: "Teams are limited to 50 members" }, { status: 400 });
  }
  const auth = { tokens: body.tokens && typeof body.tokens === "object" ? body.tokens : {}, owner: typeof body.owner === "string" ? body.owner : undefined };
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await sql`SELECT data, updated_at::text AS v FROM teams WHERE id = ${id}`;
    if (cur.length && typeof body.base === "string" && body.base && cur[0].v !== body.base) {
      return NextResponse.json({ conflict: true, data: publicTeam(cur[0].data as TeamDoc), v: cur[0].v }, { status: 409, headers: NO_STORE });
    }
    const stored = cur.length ? (cur[0].data as TeamDoc) : null;
    const { doc, reverted } = await guardIncoming(sql, id, stored, body.data, auth);
    const jsonStr = JSON.stringify(doc);
    if (cur.length) {
      const rows = await sql`UPDATE teams SET data = ${jsonStr}::jsonb, updated_at = NOW()
        WHERE id = ${id} AND updated_at::text = ${cur[0].v} RETURNING updated_at::text AS v`;
      if (!rows.length) continue; // someone saved in between: re-read and re-check
      return NextResponse.json({ ok: true, v: rows[0].v, reverted }, { headers: NO_STORE });
    }
    const rows = await sql`INSERT INTO teams (id, data, updated_at, expires_at) VALUES (${id}, ${jsonStr}::jsonb, NOW(), NOW() + INTERVAL '24 months')
      ON CONFLICT (id) DO NOTHING RETURNING updated_at::text AS v`;
    if (!rows.length) continue;
    return NextResponse.json({ ok: true, v: rows[0].v, reverted }, { headers: NO_STORE });
  }
  return NextResponse.json({ error: "Busy, try again" }, { status: 503, headers: NO_STORE });
}

// DELETE ?id= → the team leaves the public site but is kept in teams_trash, where the site admin can restore it.
// Teams with an owner can only be deleted with the owner key (header X-Owner-Key).
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!ID.test(id)) return NextResponse.json({ ok: true });
  const sql = await adminDb(); // makes sure teams_trash exists
  const cur = await sql`SELECT data FROM teams WHERE id = ${id}`;
  if (cur.length && (cur[0].data as TeamDoc)?.ownerHash && !validOwner(cur[0].data as TeamDoc, request.headers.get("x-owner-key"))) {
    return NextResponse.json({ error: "Only the team owner can delete this team" }, { status: 403 });
  }
  await sql`WITH gone AS (DELETE FROM teams WHERE id = ${id} RETURNING id, data, updated_at, expires_at)
    INSERT INTO teams_trash (id, data, updated_at, expires_at, deleted_at)
    SELECT id, data, updated_at, expires_at, now() FROM gone
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, expires_at = EXCLUDED.expires_at, deleted_at = now()`;
  return NextResponse.json({ ok: true });
}
