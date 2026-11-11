// Super admin API. GET ?op=session|stats|teams|team|trash|log, POST { op: login|logout|action }.
// Everything except login needs a valid admin session; POSTs must come from this site (Origin check).
import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE, adminConfigured, adminDb, checkCredentials, clearFailures, clientIp, isAdmin, logAction,
  makeSession, purgeOld, sameOrigin, tooManyAttempts,
} from "@/lib/adminAuth";
import type { Sql } from "@/lib/db";
import { newOwnerKey } from "@/lib/teamAuth";

export const dynamic = "force-dynamic";

type Member = { id: string; name?: string; pinHash?: string; days?: unknown[]; [k: string]: unknown };
type Team = { id?: string; name?: string; year?: number; locked?: boolean; lockY?: Record<string, boolean>; approver?: string | null; members?: Member[]; log?: { t: string; a: string }[]; [k: string]: unknown };

const ID = /^[a-z0-9]{1,64}$/i;
const NO_STORE = { "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
const notFound = () => json({ error: "Not found" }, 404);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function addLog(team: Team, action: string) {
  const log = Array.isArray(team.log) ? [...team.log] : [];
  log.push({ t: new Date().toISOString(), a: action });
  if (log.length > 50) log.splice(0, log.length - 50);
  return log;
}

// Read-modify-write that only succeeds if nobody saved the team in between
async function updateTeam(sql: Sql, id: string, change: (t: Team) => Team | null): Promise<{ ok: boolean; error?: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await sql`SELECT data FROM teams WHERE id = ${id}`;
    if (!rows.length) return { ok: false, error: "Team not found" };
    const before = rows[0].data as Team;
    const after = change(JSON.parse(JSON.stringify(before)));
    if (!after) return { ok: false, error: "Nothing to change" };
    const done = await sql`UPDATE teams SET data = ${JSON.stringify(after)}::jsonb, updated_at = now()
      WHERE id = ${id} AND data = ${JSON.stringify(before)}::jsonb RETURNING id`;
    if (done.length) return { ok: true };
  }
  return { ok: false, error: "The team was being edited at the same time. Try again." };
}

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return notFound();
  const q = req.nextUrl.searchParams;
  const op = q.get("op") || "session";
  const authed = await isAdmin(req);
  if (op === "session") return json({ ok: authed });
  if (!authed) return json({ error: "Sign in again" }, 401);
  const sql = await adminDb();

  if (op === "stats") {
    const [t] = await sql`SELECT
        COUNT(*)::int AS teams,
        COUNT(*) FILTER (WHERE expires_at > now())::int AS active,
        COUNT(*) FILTER (WHERE updated_at > now() - interval '7 days')::int AS updated7,
        COUNT(*) FILTER (WHERE updated_at > now() - interval '30 days')::int AS updated30,
        COALESCE(SUM(jsonb_array_length(CASE WHEN jsonb_typeof(data->'members') = 'array' THEN data->'members' ELSE '[]'::jsonb END)), 0)::int AS members,
        COUNT(*) FILTER (WHERE jsonb_array_length(CASE WHEN jsonb_typeof(data->'members') = 'array' THEN data->'members' ELSE '[]'::jsonb END) = 0)::int AS empty
      FROM teams`;
    const countries = await sql`SELECT COALESCE(m->>'country', '—') AS cc, COUNT(*)::int AS n
      FROM teams, jsonb_array_elements(CASE WHEN jsonb_typeof(data->'members') = 'array' THEN data->'members' ELSE '[]'::jsonb END) m
      WHERE expires_at > now() GROUP BY 1 ORDER BY 2 DESC LIMIT 12`;
    const months = await sql`SELECT substr(data->>'createdAt', 1, 7) AS month, COUNT(*)::int AS n FROM teams
      WHERE data->>'createdAt' IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 12`;
    const [trash] = await sql`SELECT COUNT(DISTINCT id)::int AS n FROM team_trash`;
    let visits = 0;
    try { const [v] = await sql`SELECT COUNT(*)::int AS n FROM visits`; visits = Number(v?.n || 0); } catch { /* table may not exist locally */ }
    return json({ ...t, countries, months: months.reverse(), trash: Number(trash?.n || 0), visits });
  }

  if (op === "teams") {
    const search = (q.get("q") || "").trim().slice(0, 60);
    const like = `%${search.replace(/[%_\\]/g, m => "\\" + m)}%`;
    const page = Math.max(0, parseInt(q.get("page") || "0") || 0);
    const rows = await sql`SELECT id, data->>'name' AS name, data->>'year' AS year, data->>'createdAt' AS created,
        updated_at, expires_at, (data->>'locked') = 'true' AS locked, data->>'approver' AS approver,
        jsonb_array_length(CASE WHEN jsonb_typeof(data->'members') = 'array' THEN data->'members' ELSE '[]'::jsonb END) AS members,
        (SELECT COUNT(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(data->'members') = 'array' THEN data->'members' ELSE '[]'::jsonb END) m WHERE m ? 'pinHash')::int AS pins,
        (SELECT COALESCE(SUM(CASE WHEN jsonb_typeof(m->'days') = 'array' THEN jsonb_array_length(m->'days') ELSE 0 END), 0)
           FROM jsonb_array_elements(CASE WHEN jsonb_typeof(data->'members') = 'array' THEN data->'members' ELSE '[]'::jsonb END) m)::int AS days
      FROM teams
      WHERE ${search}::text = '' OR id ILIKE ${like} OR data->>'name' ILIKE ${like}
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(data->'members') = 'array' THEN data->'members' ELSE '[]'::jsonb END) m WHERE m->>'name' ILIKE ${like})
      ORDER BY updated_at DESC NULLS LAST, id
      LIMIT 51 OFFSET ${page * 50}`;
    return json({ teams: rows.slice(0, 50), more: rows.length > 50 });
  }

  if (op === "team") {
    const id = q.get("id") || "";
    if (!ID.test(id)) return json({ error: "Bad id" }, 400);
    const rows = await sql`SELECT data, updated_at, expires_at FROM teams WHERE id = ${id}`;
    if (!rows.length) return json({ error: "Team not found" }, 404);
    const data = rows[0].data as Team;
    // Never send PIN hashes to the browser, only whether a PIN is set
    const members = (Array.isArray(data.members) ? data.members : []).filter(m => m && typeof m === "object").map(m => { const { pinHash, ...rest } = m; return { ...rest, hasPin: !!pinHash }; });
    const { ownerHash, ...rest } = data as Team & { ownerHash?: string };
    return json({ team: { ...rest, hasOwner: !!ownerHash, members }, updated_at: rows[0].updated_at, expires_at: rows[0].expires_at });
  }

  if (op === "export") {
    const id = q.get("id") || "";
    if (!ID.test(id)) return json({ error: "Bad id" }, 400);
    const rows = await sql`SELECT data FROM teams WHERE id = ${id}`;
    if (!rows.length) return json({ error: "Team not found" }, 404);
    await logAction(sql, "export", id);
    const data = { ...(rows[0].data as Team) } as Team & { ownerHash?: string };
    delete data.ownerHash;
    data.members = (data.members || []).filter(Boolean).map(m => { const c = { ...m }; delete c.pinHash; return c; });
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: { ...NO_STORE, "Content-Type": "application/json", "Content-Disposition": `attachment; filename="team-${id}.json"` },
    });
  }

  if (op === "trash") {
    // Latest copy per team id (the trash keeps every deleted version for 30 days)
    const rows = await sql`SELECT * FROM (SELECT DISTINCT ON (id) id, data->>'name' AS name, deleted_at,
        jsonb_array_length(CASE WHEN jsonb_typeof(data->'members') = 'array' THEN data->'members' ELSE '[]'::jsonb END) AS members
      FROM team_trash ORDER BY id, deleted_at DESC) t ORDER BY deleted_at DESC LIMIT 100`;
    return json({ teams: rows });
  }

  if (op === "log") {
    const rows = await sql`SELECT at, action, team_id, detail FROM admin_log ORDER BY id DESC LIMIT 100`;
    return json({ log: rows });
  }
  return json({ error: "Unknown request" }, 400);
}

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return notFound();
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const op = String(body.op || "");
  const sql = await adminDb();
  await purgeOld(sql);

  if (op === "login") {
    const ip = clientIp(req);
    if (await tooManyAttempts(sql, ip)) {
      await sleep(600);
      return json({ error: "Too many attempts. Wait 15 minutes and try again." }, 429);
    }
    const ok = checkCredentials(String(body.username || "").slice(0, 64), String(body.password || "").slice(0, 200));
    if (!ok) {
      await sleep(600);
      return json({ error: "Wrong username or password." }, 401);
    }
    await clearFailures(sql, ip);
    await logAction(sql, "login", null, "");
    const s = makeSession();
    const res = json({ ok: true });
    res.cookies.set(COOKIE, s.value, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: s.maxAge });
    return res;
  }

  if (op === "logout") {
    const res = json({ ok: true });
    res.cookies.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
    return res;
  }

  if (!(await isAdmin(req))) return json({ error: "Sign in again" }, 401);
  if (op !== "action") return json({ error: "Unknown request" }, 400);

  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!ID.test(id)) return json({ error: "Bad id" }, 400);
  const memberId = String(body.memberId || "");

  if (action === "resetPin" || action === "removeMember") {
    if (!ID.test(memberId)) return json({ error: "Bad member" }, 400);
    let who = "";
    const r = await updateTeam(sql, id, t => {
      const m = (t.members || []).find(x => x.id === memberId);
      if (!m) return null;
      who = m.name || "member";
      if (action === "resetPin") {
        if (!m.pinHash) return null;
        delete m.pinHash;
        t.log = addLog(t, `PIN reset by the site admin for ${who}`);
      } else {
        t.members = (t.members || []).filter(x => x.id !== memberId);
        if (t.approver === memberId) t.approver = null;
        t.log = addLog(t, `${who} removed by the site admin`);
      }
      return t;
    });
    if (r.ok) await logAction(sql, action, id, who);
    // Erasure: the removed member also disappears from the team's earlier versions
    if (r.ok && action === "removeMember") {
      try {
        await sql`UPDATE team_versions SET data = jsonb_set(data, '{members}', COALESCE((SELECT jsonb_agg(m) FROM jsonb_array_elements(COALESCE(data->'members', '[]'::jsonb)) m WHERE m->>'id' IS DISTINCT FROM ${memberId}), '[]'::jsonb))
          WHERE id = ${id} AND data->'members' @> ${JSON.stringify([{ id: memberId }])}::jsonb`;
      } catch { /* table may not exist yet */ }
    }
    return json(r, r.ok ? 200 : 409);
  }

  if (action === "setLock") {
    const locked = !!body.locked;
    const year = Number(body.year) || 0;
    const r = await updateTeam(sql, id, t => {
      const base = t.year || year;
      if (!year || year === base) t.locked = locked;
      else { const ly = { ...(t.lockY || {}) }; if (locked) ly[year] = true; else delete ly[year]; t.lockY = ly; }
      t.log = addLog(t, `Board ${locked ? "locked" : "unlocked"}${year ? " for " + year : ""} by the site admin`);
      return t;
    });
    if (r.ok) await logAction(sql, locked ? "lock" : "unlock", id, year ? String(year) : "");
    return json(r, r.ok ? 200 : 409);
  }

  if (action === "rename") {
    const name = String(body.name || "").trim().slice(0, 40);
    if (!name) return json({ error: "Enter a name" }, 400);
    const r = await updateTeam(sql, id, t => { const old = t.name; t.name = name; t.log = addLog(t, `Renamed from "${old}" to "${name}" by the site admin`); return t; });
    if (r.ok) await logAction(sql, "rename", id, name);
    return json(r, r.ok ? 200 : 409);
  }

  if (action === "clearApprover") {
    const r = await updateTeam(sql, id, t => { if (!t.approver) return null; t.approver = null; t.log = addLog(t, "Approval mode turned off by the site admin"); return t; });
    if (r.ok) await logAction(sql, "clearApprover", id);
    return json(r, r.ok ? 200 : 409);
  }

  if (action === "ownerLink") {
    // New owner key for the team (replaces any previous owner key); the link is shown once
    const { key, hash } = newOwnerKey();
    const r = await updateTeam(sql, id, t => { (t as Team & { ownerHash?: string }).ownerHash = hash; t.log = addLog(t, "New owner link created by the site admin"); return t; });
    if (!r.ok) return json(r, 409);
    await logAction(sql, "ownerLink", id);
    return json({ ok: true, link: `${req.nextUrl.origin}/#team=${id}&owner=${key}` });
  }

  if (action === "extend") {
    const rows = await sql`UPDATE teams SET expires_at = GREATEST(COALESCE(expires_at, now()), now() + interval '24 months') WHERE id = ${id} RETURNING expires_at`;
    if (!rows.length) return json({ ok: false, error: "Team not found" }, 404);
    await logAction(sql, "extend", id);
    return json({ ok: true, expires_at: rows[0].expires_at });
  }

  if (action === "trash") {
    const moved = await sql`WITH gone AS (DELETE FROM teams WHERE id = ${id} RETURNING id, data, updated_at, expires_at)
      INSERT INTO team_trash (id, data, updated_at, expires_at) SELECT id, data, updated_at, expires_at FROM gone RETURNING id`;
    if (!moved.length) return json({ ok: false, error: "Team not found" }, 404);
    await logAction(sql, "trash", id);
    return json({ ok: true });
  }

  if (action === "restore") {
    // Restore the latest copy, only if the id is free (the trash copy is never lost on a failed restore)
    const live = await sql`SELECT 1 FROM teams WHERE id = ${id}`;
    if (live.length) return json({ ok: false, error: "A team with this id exists already" }, 409);
    const [last] = await sql`SELECT tid FROM team_trash WHERE id = ${id} ORDER BY deleted_at DESC LIMIT 1`;
    if (!last) return json({ ok: false, error: "Not in trash" }, 404);
    const back = await sql`WITH gone AS (DELETE FROM team_trash WHERE id = ${id} RETURNING tid, id, data, updated_at, expires_at)
      INSERT INTO teams (id, data, updated_at, expires_at)
      SELECT id, data, now(), GREATEST(COALESCE(expires_at, now()), now() + interval '30 days') FROM gone WHERE tid = ${last.tid}
      ON CONFLICT (id) DO NOTHING RETURNING id`;
    if (!back.length) return json({ ok: false, error: "Restore failed, try again" }, 409);
    await logAction(sql, "restore", id);
    return json({ ok: true });
  }

  if (action === "purge") {
    if (body.confirm !== id) return json({ error: "Type the team id to confirm" }, 400);
    const gone = await sql`DELETE FROM team_trash WHERE id = ${id} RETURNING id`;
    if (!gone.length) return json({ ok: false, error: "Not in trash" }, 404);
    try { await sql`DELETE FROM team_versions WHERE id = ${id}`; } catch { /* table may not exist yet */ }
    await logAction(sql, "purge", id);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
}
