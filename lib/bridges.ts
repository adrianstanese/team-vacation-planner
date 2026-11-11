// Bridge-day finder: which 1–3 working days to take off to join existing days off into a long break.
// "Off" = weekend (unless the team works 7 days), the person's own public holidays (national + regional),
// and days they already booked. Every gap of 1–3 working days between two off blocks is a candidate.
// Ranked by days gained per day taken, then by length. Past dates are skipped.

export type Bridge = { take: string[]; from: string; to: string; length: number; cost: number; holidays: string[] };

const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

export function findBridges(opts: { year: number; holidays: string[]; booked?: string[]; sevenDay?: boolean; today?: string; maxTake?: number; limit?: number }): Bridge[] {
  const { year, sevenDay = false, maxTake = 3, limit = 10 } = opts;
  const hol = new Set(opts.holidays), booked = new Set(opts.booked || []);
  const today = opts.today || "";
  // Span the year plus a week either side so New Year bridges are found
  const start = Date.UTC(year, 0, 1) - 7 * 864e5, end = Date.UTC(year, 11, 31) + 7 * 864e5;
  const days: { k: string; off: boolean; hol: boolean }[] = [];
  for (let t = start; t <= end; t += 864e5) {
    const d = new Date(t); const k = iso(d); const wd = d.getUTCDay();
    const weekend = !sevenDay && (wd === 0 || wd === 6);
    days.push({ k, off: weekend || hol.has(k) || booked.has(k), hol: hol.has(k) });
  }
  const out: Bridge[] = [];
  for (let i = 1; i < days.length - 1; i++) {
    if (days[i].off || !days[i - 1].off) continue; // a gap must start right after an off day
    let j = i; while (j < days.length && !days[j].off) j++;
    const gap = j - i;
    if (j >= days.length || gap > maxTake) continue;
    let a = i - 1; while (a > 0 && days[a - 1].off) a--;
    let b = j; while (b < days.length - 1 && days[b + 1].off) b++;
    const span = days.slice(a, b + 1);
    // Only worth it when a public holiday is part of the break (plain weekends are not "bridges")
    const hols = span.filter(x => x.hol).map(x => x.k);
    if (!hols.length) continue;
    const take = days.slice(i, j).map(x => x.k);
    if (!take.every(k => k.startsWith(String(year)))) continue;
    if (today && take[0] < today) continue;
    out.push({ take, from: span[0].k, to: span[span.length - 1].k, length: span.length, cost: gap, holidays: hols });
  }
  return out.sort((x, y) => y.length / y.cost - x.length / x.cost || y.length - x.length || x.from.localeCompare(y.from)).slice(0, limit);
}
