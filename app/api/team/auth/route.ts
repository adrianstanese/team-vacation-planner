// Member PIN and team owner actions. POST { op, id, memberId?, pin?, token?, owner? }
//   verify → correct PIN gives a member token (and upgrades an old hash)
//   set    → sets or changes a member's PIN (changing needs that member's token or the owner key)
//   reset  → owner removes a member's PIN
//   claim  → the browser that just created a team becomes its owner (only within 15 minutes of creation,
//            only if the team has no owner yet); returns the owner key once
import { NextRequest, NextResponse } from "next/server";
import { authDb, checkPin, hashPin, memberToken, newOwnerKey, pinCleared, pinFailed, tooManyPinTries, validMemberToken, validOwner, type TeamDoc } from "@/lib/teamAuth";

export const dynamic = "force-dynamic";
const ID = /^[a-z0-9]{1,64}$/i;
const H = { "Cache-Control": "no-store" };
const j = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: H });

function sameOrigin(req: NextRequest) {
  const o = req.headers.get("origin");
  if (!o) return false;
  try { return new URL(o).host === req.headers.get("host"); } catch { return false; }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return j({ error: "Forbidden" }, 403);
  let b: { op?: string; id?: string; memberId?: string; pin?: string; token?: string; owner?: string } = {};
  try { b = await req.json(); } catch { return j({ error: "Bad request" }, 400); }
  const id = String(b.id || ""), mid = String(b.memberId || ""), op = String(b.op || "");
  if (!ID.test(id)) return j({ error: "Bad id" }, 400);
  const sql = await authDb();

  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await sql`SELECT data, updated_at::text AS v FROM teams WHERE id = ${id} AND expires_at > NOW()`;
    if (!rows.length) return j({ error: "Team not found" }, 404);
    const doc = rows[0].data as TeamDoc; const v = rows[0].v;
    const save = async (next: TeamDoc) => (await sql`UPDATE teams SET data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id} AND updated_at::text = ${v} RETURNING id`).length > 0;
    const members = Array.isArray(doc.members) ? doc.members : [];
    const log = (a: string) => { const l = Array.isArray(doc.log) ? [...(doc.log as { t: string; a: string }[])] : []; l.push({ t: new Date().toISOString(), a }); return l.slice(-50); };

    if (op === "claim") {
      if (doc.ownerHash) return j({ error: "This team already has an owner" }, 409);
      const created = Date.parse(String(doc.createdAt || ""));
      if (!(created > Date.now() - 15 * 60_000)) return j({ error: "Too late to claim this team" }, 403);
      const { key, hash } = newOwnerKey();
      if (await save({ ...doc, ownerHash: hash })) return j({ ok: true, owner: key });
      continue;
    }

    if (!ID.test(mid)) return j({ error: "Bad member" }, 400);
    const m = members.find(x => x && x.id === mid);
    if (!m) return j({ error: "Member not found" }, 404);

    if (op === "verify") {
      if (!m.pinHash) return j({ ok: true, token: await memberToken(sql, id, mid) });
      if (await tooManyPinTries(sql, id, mid)) return j({ error: "Too many tries. Wait 15 minutes." }, 429);
      const res = checkPin(String(b.pin || ""), String(m.pinHash));
      if (!res.ok) { await pinFailed(sql, id, mid); return j({ error: "Wrong PIN" }, 401); }
      await pinCleared(sql, id, mid);
      if (res.legacy) { // upgrade an old unsalted hash; not critical if it races
        await save({ ...doc, members: members.map(x => x.id === mid ? { ...x, pinHash: hashPin(String(b.pin)) } : x) });
      }
      return j({ ok: true, token: await memberToken(sql, id, mid) });
    }

    if (op === "set") {
      const pin = String(b.pin || "");
      if (!/^\d{6}$/.test(pin)) return j({ error: "The PIN must be exactly 6 digits" }, 400);
      if (m.pinHash && !validOwner(doc, b.owner) && !(await validMemberToken(sql, id, mid, b.token))) return j({ error: "Enter the current PIN first" }, 403);
      const next = { ...doc, members: members.map(x => x.id === mid ? { ...x, pinHash: hashPin(pin) } : x), log: log(`PIN set for ${m.name || "member"}`) };
      if (await save(next)) return j({ ok: true, token: await memberToken(sql, id, mid) });
      continue;
    }

    if (op === "reset") {
      if (!validOwner(doc, b.owner)) return j({ error: "Only the team owner can reset PINs" }, 403);
      if (!m.pinHash) return j({ ok: true });
      const next = { ...doc, members: members.map(x => { if (x.id !== mid) return x; const c = { ...x }; delete c.pinHash; return c; }), log: log(`PIN reset by the team owner for ${m.name || "member"}`) };
      if (await save(next)) { await pinCleared(sql, id, mid); return j({ ok: true }); }
      continue;
    }
    return j({ error: "Unknown request" }, 400);
  }
  return j({ error: "Busy, try again" }, 503);
}
