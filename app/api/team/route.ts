import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const rows = await sql`SELECT data FROM teams WHERE id = ${id} AND expires_at > NOW()`;
  if (rows.length === 0) return NextResponse.json(null);
  return NextResponse.json(rows[0].data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const id = body.id;
  const jsonStr = JSON.stringify(body.data);
  if (!id || !body.data) return NextResponse.json({ error: "Missing id or data" }, { status: 400 });
  await sql`INSERT INTO teams (id, data, updated_at, expires_at) VALUES (${id}, ${jsonStr}::jsonb, NOW(), NOW() + INTERVAL '24 months') ON CONFLICT (id) DO UPDATE SET data = ${jsonStr}::jsonb, updated_at = NOW()`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await sql`DELETE FROM teams WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
