// app/api/stats/route.ts
import { getSql } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = await getSql();
  try {
    const rows = await sql`
      SELECT 
        COUNT(*)::int as teams,
        COALESCE(SUM(jsonb_array_length(data->'members')), 0)::int as members
      FROM teams
      WHERE expires_at > NOW()
        AND jsonb_array_length(data->'members') > 0
    `;
    return NextResponse.json({
      teams: rows[0]?.teams || 0,
      members: rows[0]?.members || 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ teams: 0, members: 0 });
  }
}
