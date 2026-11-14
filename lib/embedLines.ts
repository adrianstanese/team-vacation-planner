// The addresses and the embed code for showing one team's calendar somewhere else. Pure functions, used by the
// embed page's helper (components/site/EmbedMaker.tsx) and by the unit checks.
// A team is opened through the address itself here ("?team=", the form the planner's widget has always used):
// tools that take an address keep the part after "?" but may drop the part after "#".

/** Height of the "who is away" card's frame. The card is about 290 px tall when someone is away today and the next
 *  person is named; the 220 px the Share window used until Nov 2026 cut that last line off. */
export const CARD_HEIGHT = 300;

/** Shown in the lines until a real team link has been pasted. */
export const TEAM_STAND_IN = "YOUR-TEAM-CODE";

/** The team's code from whatever was pasted: a full link (#team= or ?team=), or the code alone. "" when there is none.
 *  A code is 6 to 64 lower-case letters and digits and must end where the link's next part begins: a damaged link
 *  gives no code at all, never a shortened one. */
export function teamCode(text: string): string {
  const s = (text || "").trim();
  const m = /[#?&]team=([a-z0-9]{6,64})(?=$|[&#/?\s])/.exec(s) || /^([a-z0-9]{6,64})$/.exec(s);
  return m ? m[1] : "";
}

/** The addresses and embed codes for one team, on the planner's own address (origin: "https://www.vacationplanner.team"). */
export function embedLines(origin: string, code: string) {
  const planner = `${origin}/?team=${code}`, card = `${planner}&view=badge`;
  return {
    planner, card,
    plannerCode: `<iframe src="${planner}" width="100%" height="800" frameborder="0" style="border:1px solid #e8e6e1;border-radius:12px;"></iframe>`,
    cardCode: `<iframe src="${card}" width="320" height="${CARD_HEIGHT}" frameborder="0" style="border-radius:12px;overflow:hidden"></iframe>`,
    feed: `${origin}/api/ical?team=${code}`,
  };
}
export type EmbedLineKey = keyof ReturnType<typeof embedLines>;
