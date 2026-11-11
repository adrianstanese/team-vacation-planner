import { getSql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const sql = await getSql();
  const rows = await sql`SELECT country, COUNT(*)::int as count FROM visits GROUP BY country ORDER BY count DESC LIMIT 20`;
  const total = await sql`SELECT COUNT(*)::int as total FROM visits`;
  return NextResponse.json({ total: total[0].total, countries: Object.fromEntries(rows.map(r => [r.country, r.count])) });
}

export async function POST(request: NextRequest) {
  const sql = await getSql();
  const { country } = await request.json();
  const cc = (country || "OTHER").toUpperCase().slice(0, 5);
  await sql`INSERT INTO visits (country) VALUES (${cc})`;
  const rows = await sql`SELECT country, COUNT(*)::int as count FROM visits GROUP BY country ORDER BY count DESC LIMIT 20`;
  const total = await sql`SELECT COUNT(*)::int as total FROM visits`;
  return NextResponse.json({ total: total[0].total, countries: Object.fromEntries(rows.map(r => [r.country, r.count])) });
}
