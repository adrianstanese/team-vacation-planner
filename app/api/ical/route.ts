import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { buildTeamFeed, type TeamDoc } from "@/lib/ics";

export const dynamic = "force-dynamic";

const ID = /^[a-z0-9]{1,64}$/i;

// Calendar subscription feed: /api/ical?team=<id>[&member=<memberId>]
// Calendar apps poll this, so the CDN keeps a copy for 15 minutes to spare the database.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const id = (q.get("team") || q.get("id") || "").trim();
  const memberId = (q.get("member") || "").trim() || undefined;
  if (!ID.test(id) || (memberId && !ID.test(memberId))) {
    return new NextResponse("Unknown team", { status: 400 });
  }
  let rows: Record<string, unknown>[];
  try {
    const sql = neon(process.env.DATABASE_URL!);
    rows = await sql`SELECT data FROM teams WHERE id = ${id} AND expires_at > NOW()`;
  } catch {
    console.error("ical: database unavailable");
    return new NextResponse("Temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
  }
  if (rows.length === 0) return new NextResponse("Team not found", { status: 404 });
  const team = rows[0].data as TeamDoc;
  const body = buildTeamFeed({ ...team, id }, { memberId, origin: "https://www.vacationplanner.team" });
  const file = (team.name || "team").replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "team";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${file}.ics"`,
      "Cache-Control": "public, max-age=300",
      "Vercel-CDN-Cache-Control": "public, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
}
