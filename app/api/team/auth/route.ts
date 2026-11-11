// Member PIN and team owner actions. POST { op, id, memberId, pin?, token?, owner? }
//   verify → correct PIN gives a member token (and upgrades an old hash). Members without a PIN get no token.
//   set    → sets or changes a member's PIN (changing needs that member's token or the owner key)
//   reset  → owner (owner key) or the team's approver (approverId + their token) removes a member's PIN
// Ownership is given only by the server when a team is first created (PUT /api/team returns the owner key)
// or by the site admin (owner link); there is no way to claim an existing team.
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { authDb, checkPin, hashPin, memberToken, pinAttempt, pinCleared, validMemberToken, validOwner, type TeamDoc } from "@/lib/teamAuth";

export const dynamic = "force-dynamic";
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const eq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
type M = { id: string; name?: unknown; pinHash?: string; resetHash?: string; resetExp?: number; isApprover?: boolean; [k: string]: unknown };
const H = { "Cache-Control": "no-store" };
const j = (b: unknown, s = 200) => NextResponse.json(b, { status: s, headers: H });

function sameOrigin(req: NextRequest) {
  const o = req.headers.get("origin");
  if (!o) return false;
  try { return new URL(o).host === req.headers.get("host"); } catch { return false; }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return j({ error: "Forbidden" }, 403);
  let b: { op?: string; id?: string; memberId?: string; pin?: string; token?: string; owner?: string; approverId?: string; code?: string; member?: { name?: unknown; country?: unknown; region?: unknown }; creator?: boolean } = {};
  try { b = await req.json(); } catch { return j({ error: "Bad request" }, 400); }
  const id = String(b.id || ""), mid = String(b.memberId || ""), op = String(b.op || "");
  if (!/^[a-z0-9]{1,64}$/i.test(id)) return j({ error: "Bad id" }, 400);
  if (op === "claim") return j({ error: "Ownership is given when a team is created" }, 410);
  if (!ID.test(mid)) return j({ error: "Bad member" }, 400);
  const sql = await authDb();

  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await sql`SELECT data, updated_at::text AS v FROM teams WHERE id = ${id} AND expires_at > NOW()`;
    if (!rows.length) return j({ error: "Team not found" }, 404);
    const doc = rows[0].data as TeamDoc; const v = rows[0].v;
    const save = async (next: TeamDoc) => (await sql`UPDATE teams SET data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id} AND updated_at::text = ${v} RETURNING id`).length > 0;
    const members = Array.isArray(doc.members) ? doc.members : [];
    const log = (a: string) => { const l = Array.isArray(doc.log) ? [...(doc.log as { t: string; a: string }[])] : []; l.push({ t: new Date().toISOString(), a }); return l.slice(-50); };
    const m = members.find(x => x && x.id === mid) as M | undefined;

    // join → adds a new member WITH their PIN in one step (no window where the member exists without a PIN).
    // The team owner may add the first member as the team creator (approver automatically).
    if (op === "join") {
      if (m) return j({ error: "Member exists" }, 409);
      const pin = String(b.pin || "");
      if (!/^\d{6}$/.test(pin)) return j({ error: "The PIN must be exactly 6 digits" }, 400);
      const nm = b.member || {};
      const nmName = (typeof nm.name === "string" ? nm.name : "").trim().slice(0, 30);
      const cc = typeof nm.country === "string" && /^[A-Za-z]{2}$/.test(nm.country) ? nm.country.toUpperCase() : null;
      const region = typeof nm.region === "string" && nm.region ? nm.region.slice(0, 24) : null;
      if (!nmName || !cc) return j({ error: "Name and country are required" }, 400);
      if (members.length >= 50) return j({ error: "Team is full" }, 400);
      if (members.some(x => x && typeof x.name === "string" && x.name.trim().toLowerCase() === nmName.toLowerCase())) return j({ error: "Name taken", code: "dup" }, 409);
      const asCreator = !!b.creator;
      if (asCreator && !(validOwner(doc, b.owner) && members.length === 0 && !doc.creatorId)) return j({ error: "Only the team owner can add the creator" }, 403);
      const hash = hashPin(pin);
      const isAppr = asCreator && !doc.approver && !members.some(x => x && x.isApprover);
      const member = { id: mid, name: nmName, country: cc, region, days: [], pto: null, approved: isAppr || !doc.approver, isApprover: isAppr, pinHash: hash };
      const next: TeamDoc = { ...doc, members: [...members, member], log: log(`${nmName} joined the team` + (asCreator ? " as creator and approver" : "")) };
      if (asCreator) { next.creatorId = mid; if (isAppr) next.approver = mid; }
      if (await save(next)) return j({ ok: true, token: await memberToken(sql, id, mid, hash) });
      continue;
    }
    if (!m) return j({ error: "Member not found" }, 404);
    const name = typeof m.name === "string" ? m.name.slice(0, 40) : "member";

    if (op === "verify") {
      if (!m.pinHash) return j({ ok: true, token: null });
      // Count the attempt before checking, so parallel guesses can't race past the limit
      if (!(await pinAttempt(sql, id, mid))) return j({ error: "Too many tries. Wait 15 minutes." }, 429);
      const res = checkPin(String(b.pin || ""), String(m.pinHash));
      if (!res.ok) return j({ error: "Wrong PIN" }, 401);
      await pinCleared(sql, id, mid);
      let hash = String(m.pinHash);
      if (res.legacy) { // upgrade an old unsalted hash
        const up = hashPin(String(b.pin));
        if (await save({ ...doc, members: members.map(x => x.id === mid ? { ...x, pinHash: up } : x) })) hash = up;
      }
      return j({ ok: true, token: await memberToken(sql, id, mid, hash) });
    }

    if (op === "set") {
      const pin = String(b.pin || "");
      if (!/^\d{6}$/.test(pin)) return j({ error: "The PIN must be exactly 6 digits" }, 400);
      // The team creator's PIN can only be changed with the creator's own PIN session (not with the owner key)
      const ownerMay = mid !== doc.creatorId && validOwner(doc, b.owner);
      if (m.pinHash && !ownerMay && !(await validMemberToken(sql, id, mid, String(m.pinHash), b.token))) return j({ error: "Enter the current PIN first" }, 403);
      if (!m.pinHash && mid === doc.creatorId && !validOwner(doc, b.owner)) return j({ error: "Only the team owner or the site admin can set the creator's PIN" }, 403);
      if (!m.pinHash && m.resetHash && !ownerMay) {
        // PIN was reset: the approver gave the person a one-time code
        if (!(await pinAttempt(sql, id, mid))) return j({ error: "Too many tries. Wait 15 minutes." }, 429);
        if (!(typeof m.resetExp === "number" && m.resetExp > Date.now()) || !eq(sha(String(b.code || "").trim()), String(m.resetHash))) return j({ error: "Wrong or expired setup code", code: "code" }, 403);
        await pinCleared(sql, id, mid);
      }
      const hash = hashPin(pin);
      const next = { ...doc, members: members.map(x => { if (x.id !== mid) return x; const c = { ...x, pinHash: hash } as M; delete c.resetHash; delete c.resetExp; return c; }), log: log(`PIN set for ${name}`) };
      if (await save(next)) return j({ ok: true, token: await memberToken(sql, id, mid, hash) });
      continue;
    }

    if (op === "reset") {
      // The approver may reset a forgotten PIN with their own PIN session (not their own PIN)
      const aid = String(b.approverId || "");
      const ap = aid && aid !== mid ? members.find(x => x && x.id === aid && x.pinHash && (x.isApprover || x.id === doc.approver)) : null;
      const apOk = !!ap && await validMemberToken(sql, id, aid, String(ap.pinHash), b.token);
      if (!validOwner(doc, b.owner) && !apOk) return j({ error: "Only the approver or the team owner can reset PINs" }, 403);
      if (mid === doc.creatorId) return j({ error: "The team creator's PIN can only be changed by the creator (or, if forgotten, by the site admin)" }, 403);
      const pr = (Array.isArray(doc.pinResets) ? doc.pinResets as { id?: string }[] : []).filter(r => r && r.id !== mid);
      // One-time setup code (24 h): only the person who reset sees it and hands it over; nobody else can claim the member
      const code = String(randomInt(0, 100000000)).padStart(8, "0");
      const next: TeamDoc = { ...doc, members: members.map(x => { if (x.id !== mid) return x; const c = { ...x, resetHash: sha(code), resetExp: Date.now() + 864e5 } as M; delete c.pinHash; return c; }), log: log(`PIN reset by the ${apOk ? "approver" : "team owner"} for ${name}`) };
      if (pr.length) next.pinResets = pr; else delete next.pinResets;
      if (await save(next)) { await pinCleared(sql, id, mid); return j({ ok: true, code }); }
      continue;
    }
    return j({ error: "Unknown request" }, 400);
  }
  return j({ error: "Busy, try again" }, 503);
}
