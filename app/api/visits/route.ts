import { getSql, type Sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Visit counter for the front page: one row per browser session, with the country the browser guessed.
// Nothing else is stored (no IP, no user agent).

// More visits than this in one minute are not recorded: the endpoint is public and unauthenticated, so this
// bounds what a script can add to the table (real traffic is nowhere near it).
const MAX_PER_MINUTE = 120;

async function totals(sql: Sql) {
  const rows = await sql`SELECT country, COUNT(*)::int as count FROM visits GROUP BY country ORDER BY count DESC LIMIT 20`;
  const total = await sql`SELECT COUNT(*)::int as total FROM visits`;
  return NextResponse.json({ total: total[0].total, countries: Object.fromEntries(rows.map(r => [r.country, r.count])) });
}

export async function GET() {
  return totals(await getSql());
}

export async function POST(request: NextRequest) {
  const sql = await getSql();
  // A missing, malformed or non-text country counts as OTHER (it used to fail the request with a 500)
  let country: unknown = null;
  try { country = (await request.json())?.country; } catch { /* no usable body */ }
  const cc = typeof country === "string" && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : "OTHER";
  await sql`INSERT INTO visits (country) SELECT ${cc}::text
    WHERE (SELECT COUNT(*) FROM visits WHERE created_at > now() - interval '1 minute') < ${MAX_PER_MINUTE}::int`;
  return totals(sql);
}
