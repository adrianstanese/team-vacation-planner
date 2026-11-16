// The public demo team (front page › "Try the live demo", link #team=demo). Anyone may sign in as any member with
// the PIN below and change anything; the server rebuilds the team from scratch on the first visit of each UTC day
// (app/api/team/route.ts GET), so the demo always looks lived-in: days are placed relative to today.
import { hashPin, type TeamDoc } from "@/lib/teamAuth";

export const DEMO_ID = "demo";
export const DEMO_PIN = "123456";

const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const at = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const plus = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
// Working days (Mon–Fri) from `start`, `count` of them
function workdays(start: Date, count: number): string[] {
  const out: string[] = [];
  for (let d = start; out.length < count; d = plus(d, 1)) { const w = d.getUTCDay(); if (w !== 0 && w !== 6) out.push(key(d)); }
  return out;
}
// The Monday of the week that contains `d`
const monday = (d: Date) => plus(d, -((d.getUTCDay() + 6) % 7));

type Seed = { id: string; name: string; country: string; region?: string; role: string; group: string; pto: number; carry?: number;
  blocks: [number, number, number][]; approved?: boolean; awayNow?: number };

/** A fresh demo team for `today`. Blocks are [month, day, working days] in the current year. */
export function buildDemo(today = new Date()): TeamDoc {
  const y = today.getUTCFullYear();
  const seeds: Seed[] = [
    { id: "maria", name: "Maria Ionescu", country: "RO", role: "Team lead", group: "Management", pto: 24, blocks: [[4, 13, 3], [8, 3, 10], [12, 21, 4]], approved: true },
    { id: "lukas", name: "Lukas Weber", country: "DE", region: "BY", role: "Engineer", group: "Engineering", pto: 30, carry: 4, blocks: [[2, 16, 5], [5, 26, 4], [8, 17, 10]], approved: true },
    { id: "sofia", name: "Sofía García", country: "ES", region: "MD", role: "Designer", group: "Design", pto: 23, blocks: [[3, 30, 4], [7, 13, 10], [10, 13, 2]], approved: true },
    { id: "erik", name: "Erik Lindqvist", country: "SE", role: "Engineer", group: "Engineering", pto: 25, blocks: [[6, 22, 15]], awayNow: 3 },
    { id: "chiara", name: "Chiara Romano", country: "IT", role: "Marketing", group: "Sales", pto: 26, blocks: [[4, 21, 3], [8, 10, 10], [12, 28, 3]] },
    { id: "aisha", name: "Aisha Al Mansoori", country: "AE", role: "Sales", group: "Sales", pto: 30, blocks: [[3, 23, 4], [7, 27, 15]], approved: true },
    { id: "tom", name: "Tom Hughes", country: "GB", region: "ENG", role: "Product manager", group: "Management", pto: 25, carry: 3, blocks: [[4, 7, 4], [8, 24, 8]] },
    { id: "yuki", name: "Yuki Tanaka", country: "JP", role: "Engineer", group: "Engineering", pto: 20, blocks: [[5, 1, 2], [8, 12, 4], [12, 28, 3]] },
    { id: "priya", name: "Priya Sharma", country: "IN", role: "Data analyst", group: "Engineering", pto: 21, blocks: [[3, 3, 2], [10, 19, 5], [11, 9, 3]] },
    { id: "joao", name: "João Silva", country: "PT", role: "Designer", group: "Design", pto: 22, blocks: [[6, 8, 5], [9, 7, 6], [12, 30, 2]] },
  ];
  const pin = hashPin(DEMO_PIN);
  const todayUtc = at(y, today.getUTCMonth() + 1, today.getUTCDate());
  const members = seeds.map(s => {
    let days: string[] = [];
    for (const [m, d, n] of s.blocks) days.push(...workdays(at(y, m, d), n));
    // Someone is away this week, so the demo shows "away today" and "back …" whatever the date
    if (s.awayNow) days.push(...workdays(monday(todayUtc), 5));
    days = [...new Set(days.filter(k => k.startsWith(y + "-")))].sort();
    const m: Record<string, unknown> = { id: s.id, name: s.name, country: s.country, role: s.role, group: s.group, pto: s.pto, days, pinHash: pin };
    if (s.region) m.region = s.region;
    if (s.carry) m.carryY = { [y]: s.carry };
    if (s.approved) m.approved = true;
    if (s.id === "maria") m.isApprover = true;
    return m as { id: string; pinHash: string };
  });
  return {
    id: DEMO_ID, name: "Lumen Studio (demo)", year: y, createdAt: today.toISOString(), locked: false, w7: false,
    approver: "maria", creatorId: "maria", members, demoDay: key(today), log: [],
  };
}

export const demoDayOf = (d = new Date()) => key(d);
