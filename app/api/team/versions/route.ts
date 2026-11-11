import { authDb, publicTeam, type TeamDoc } from "@/lib/teamAuth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Earlier versions of a team, for time travel. Same access as the team itself (anyone with the team link sees
// the team), PIN and owner hashes are never sent. Read-only: restoring goes through the normal save (PUT /api/team),
// so PIN protection, locks and undo all still apply.
//   GET ?id=          → [{ vid, at, members, days }] newest first (last 30 days, max 100)
//   GET ?id=&vid=     → that version, public fields only
const ID = /^[a-z0-9]{1,64}$/i;
const NO_STORE = { "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  const vid = request.nextUrl.searchParams.get("vid");
  if (!ID.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400, headers: NO_STORE });
  const sql = await authDb();
  const live = await sql`SELECT 1 FROM teams WHERE id = ${id} AND expires_at > NOW()`;
  if (!live.length) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  if (vid) {
    if (!/^\d{1,18}$/.test(vid)) return NextResponse.json({ error: "Bad version" }, { status: 400, headers: NO_STORE });
    const rows = await sql`SELECT data, at FROM team_versions WHERE id = ${id} AND vid = ${vid} AND at > now() - interval '30 days'`;
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
    return NextResponse.json({ at: rows[0].at, data: publicTeam(rows[0].data as TeamDoc) }, { headers: NO_STORE });
  }
  const rows = await sql`SELECT vid::text AS vid, at,
      COALESCE(jsonb_array_length(data->'members'), 0)::int AS members,
      COALESCE((SELECT SUM(jsonb_array_length(COALESCE(m->'days', '[]'::jsonb))) FROM jsonb_array_elements(COALESCE(data->'members', '[]'::jsonb)) m), 0)::int AS days
    FROM team_versions WHERE id = ${id} AND at > now() - interval '30 days' ORDER BY at DESC LIMIT 100`;
  return NextResponse.json({ versions: rows }, { headers: NO_STORE });
}
