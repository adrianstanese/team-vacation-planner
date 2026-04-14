// app/api/stats/route.ts
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        COUNT(*)::int as teams,
        COALESCE(SUM(jsonb_array_length(data->'members')), 0)::int as members
      FROM "Team"
      WHERE "expiresAt" > NOW()
    `;
    return NextResponse.json({
      teams: rows[0]?.teams || 0,
      members: rows[0]?.members || 0,
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ teams: 0, members: 0 });
  }
}
