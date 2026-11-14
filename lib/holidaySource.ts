// Where the planner's public holiday dates and names come from, as the About page states it.
// Update these when scripts/build-holiday-dates.mjs is run again: "version" and "generated" are in the source
// files' own "source" record, "rebuilt" is the day the planner's data file was last built from them.
// The unit checks compare "version" with the first line of lib/holidayDates.ts, so the two cannot drift apart.
export const HOLIDAY_SOURCE = {
  name: "holidays (python-holidays)",
  by: "Vacanza Team",
  url: "https://github.com/vacanza/holidays",
  licence: "MIT",
  version: "0.107",
  generated: "2026-10-26",
  rebuilt: "2026-11-12",
};
/** The day the About page's statements were last read against the data and the code. */
export const ABOUT_REVIEWED = "2026-11-14";
