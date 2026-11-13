// Builds the team calendar feed (RFC 5545). Pure functions, no I/O, so they can be tested directly.

type Member = { id: string; name?: string; days?: unknown[]; approved?: boolean; apY?: Record<string, boolean> };
type Trip = { id?: string; member?: string; start?: string; end?: string; dest?: string; project?: string };
export type TeamDoc = { id: string; name?: string; year?: number; approver?: string | null; members?: Member[]; trips?: Trip[] };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n?|\n/g, "\\n");
}

// Fold lines longer than 75 octets (RFC 5545 §3.1)
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curLen = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (curLen + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; curLen = 0; }
    cur += ch; curLen += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

// For the calendar files built in the browser (downloads): escaped text and a UTC time stamp
export const icsText = (s: unknown): string => esc(String(s ?? ""));
export const icsStamp = (now = new Date()): string => now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

const compact = (d: string) => d.replace(/-/g, "");
function nextDay(d: string): string {
  const [y, m, dd] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, dd + 1));
  return dt.toISOString().slice(0, 10);
}

// Groups sorted ISO dates into runs of consecutive days: [[start, endInclusive], ...]
export function toRanges(days: string[]): [string, string][] {
  const sorted = Array.from(new Set(days.filter(d => DATE.test(d)))).sort();
  const out: [string, string][] = [];
  for (const d of sorted) {
    const last = out[out.length - 1];
    if (last && nextDay(last[1]) === d) last[1] = d;
    else out.push([d, d]);
  }
  return out;
}

function isApproved(team: TeamDoc, m: Member, year: number): boolean {
  if (!team.approver || m.id === team.approver) return true;
  const base = team.year || year;
  return year === base ? m.approved === true : !!(m.apY && m.apY[year]);
}

export function buildTeamFeed(team: TeamDoc, opts: { memberId?: string; origin: string; now?: Date }): string {
  const stamp = (opts.now || new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const name = team.name || "Team";
  const members = (Array.isArray(team.members) ? team.members : []).filter(m => m && typeof m === "object" && (!opts.memberId || m.id === opts.memberId));
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Team Vacation Planner//vacationplanner.team//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name + " – vacations")}`,
    "X-PUBLISHED-TTL:PT6H", "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ];
  const link = `${opts.origin}/#team=${team.id}`;
  for (const m of members) {
    const days = (m.days || []).filter((d): d is string => typeof d === "string");
    for (const [s, e] of toRanges(days)) {
      // A run that crosses New Year can have different approval states; split per year so each event is honest
      const segs: [string, string][] = [];
      let cs = s;
      while (cs.slice(0, 4) !== e.slice(0, 4)) {
        const ye = `${cs.slice(0, 4)}-12-31`;
        segs.push([cs, ye]); cs = nextDay(ye);
      }
      segs.push([cs, e]);
      for (const [a, b] of segs) {
        const pending = !isApproved(team, m, Number(a.slice(0, 4)));
        lines.push(
          "BEGIN:VEVENT", `UID:vac-${m.id}-${a}@vacationplanner.team`, `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${compact(a)}`, `DTEND;VALUE=DATE:${compact(nextDay(b))}`,
          `SUMMARY:${esc(`${m.name || "Member"} – vacation${pending ? " (pending)" : ""}`)}`,
          `DESCRIPTION:${esc(`${name}\n${link}`)}`, "TRANSP:TRANSPARENT", "END:VEVENT",
        );
      }
    }
  }
  const ids = new Set(members.map(m => m.id));
  const nameOf = (id?: string) => (team.members || []).find(m => m.id === id)?.name || "Member";
  for (const tr of team.trips || []) {
    if (!tr.start || !tr.end || !DATE.test(tr.start) || !DATE.test(tr.end) || tr.end < tr.start) continue;
    if (opts.memberId && !ids.has(tr.member || "")) continue;
    const what = ["business trip", tr.dest].filter(Boolean).join(": ");
    lines.push(
      "BEGIN:VEVENT", `UID:trip-${tr.id || tr.start}-${tr.member}@vacationplanner.team`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(tr.start)}`, `DTEND;VALUE=DATE:${compact(nextDay(tr.end))}`,
      `SUMMARY:${esc(`${nameOf(tr.member)} – ${what}`)}`,
      `DESCRIPTION:${esc([name, tr.project, link].filter(Boolean).join("\n"))}`, "TRANSP:TRANSPARENT", "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
