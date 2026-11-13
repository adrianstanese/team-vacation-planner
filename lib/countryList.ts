// Country names in one language, in that language's alphabetical order, worked out on the server when a language
// page is built. The page hands the list to the browser, so both draw exactly the same text. Left to themselves,
// the server and a browser with different language data could name or sort a country differently, and the browser
// would then throw the ready-made page away and draw it again.
import { HD } from "./holidayDates";
import { nameLocale } from "./langs";

export type CountryList = [code: string, name: string][];

export function countryList(lang: string): CountryList | null {
  try {
    const names = new Intl.DisplayNames([nameLocale(lang)], { type: "region" });
    const rows: CountryList = Object.keys(HD).map(code => [code, names.of(code) || ""]);
    // A code the server cannot name: say nothing, and the browser falls back to its own data as before
    if (rows.some(([code, name]) => !name || name === code)) return null;
    const order = new Intl.Collator(nameLocale(lang));
    return rows.sort((a, b) => order.compare(a[1], b[1]));
  } catch {
    return null;
  }
}
