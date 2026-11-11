import { getSql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ID = /^[a-z0-9]{1,64}$/i;
const MAX_BYTES = 1_000_000; // a full 50-person team with every day booked is about 250 KB
const NO_STORE = { "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" };

// GET ?id=  → the team JSON (unchanged body); its version comes in the X-Updated-At header
export async function GET(request: NextRequest) {
  const sql = await getSql();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!ID.test(id)) return NextResponse.json(null, { headers: NO_STORE });
  const rows = await sql`SELECT data, updated_at::text AS v FROM teams WHERE id = ${id} AND expires_at > NOW()`;
  if (rows.length === 0) return NextResponse.json(null, { headers: NO_STORE });
  return NextResponse.json(rows[0].data, { headers: { ...NO_STORE, "X-Updated-At": String(rows[0].v || "") } });
}

// PUT { id, data, base? }
// base = the X-Updated-At this browser last saw. When given and the team changed since, the save is refused
// with 409 and the current team, so the browser can merge instead of overwriting someone else's edits.
// Without base (pages opened before this change) it saves as before: last write wins.
export async function PUT(request: NextRequest) {
  const sql = await getSql();
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "Team too large" }, { status: 413 });
  let body: { id?: string; data?: { id?: string; members?: unknown }; base?: string | null };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const id = body.id;
  if (!id || !body.data || typeof body.data !== "object") return NextResponse.json({ error: "Missing id or data" }, { status: 400 });
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (body.data.members !== undefined && (!Array.isArray(body.data.members) || body.data.members.length > 50)) {
    return NextResponse.json({ error: "Teams are limited to 50 members" }, { status: 400 });
  }
  const jsonStr = JSON.stringify(body.data);
  if (typeof body.base === "string" && body.base) {
    const rows = await sql`UPDATE teams SET data = ${jsonStr}::jsonb, updated_at = NOW()
      WHERE id = ${id} AND updated_at::text = ${body.base} RETURNING updated_at::text AS v`;
    if (rows.length) return NextResponse.json({ ok: true, v: rows[0].v }, { headers: NO_STORE });
    const cur = await sql`SELECT data, updated_at::text AS v FROM teams WHERE id = ${id}`;
    if (cur.length) return NextResponse.json({ conflict: true, data: cur[0].data, v: cur[0].v }, { status: 409, headers: NO_STORE });
    // The team is gone (expired or deleted): fall through and recreate it, as before
  }
  const rows = await sql`INSERT INTO teams (id, data, updated_at, expires_at) VALUES (${id}, ${jsonStr}::jsonb, NOW(), NOW() + INTERVAL '24 months')
    ON CONFLICT (id) DO UPDATE SET data = ${jsonStr}::jsonb, updated_at = NOW() RETURNING updated_at::text AS v`;
  return NextResponse.json({ ok: true, v: rows[0]?.v || null }, { headers: NO_STORE });
}

export async function DELETE(request: NextRequest) {
  const sql = await getSql();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!ID.test(id)) return NextResponse.json({ ok: true });
  await sql`DELETE FROM teams WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
