# Plan: Chinese (简体中文) + China's non-working days

Prepared 2026-11-12 for the next session. Goal: the whole tool in Simplified Chinese (`zh`), and China (and optionally
Hong Kong / Taiwan) as countries with correct days off for 2026–2028, without breaking any existing team.

## Decisions to confirm at the start (one line each)
1. **Script:** Simplified Chinese (`zh`, zh-CN) only. Traditional (zh-TW/HK) later if wanted.
2. **Countries:** China (CN). Add Hong Kong (HK) and Taiwan (TW) at the same time? (data is already there, cheap).
3. **Makeup working weekends (调休):** China moves weekends to make long holidays (e.g. a Saturday becomes a working day).
   The app has no "working weekend" concept today. Options: (a) show them as working days for CN members (new
   per-country list, small change in `getAllHolidays`/working-day counts), or (b) ignore them at first. Recommend (a).

## What already exists
- Holiday data: `../NonWorkingDays.nosync/lib/data/holidays/cn.json` (+ `hk.json`, `tw.json`), python-holidays based,
  Chinese names included (元旦, 春节, 清明节, 劳动节, 端午节, 中秋节, 国庆节). 2027+ are rule-based estimates.
- Generator: `node scripts/build-holiday-dates.mjs` writes `lib/holidayDates.ts` (type "P" only, 2026–2035).
- Names: `node scripts/build-holiday-names.mjs` writes `public/hn/<cc>.json`.
- Holiday audit from the 2026-11 session (594/594 exact) can be re-run with China added.

## Pitfall found
- **`CN` is already the region id of Spain's Canary Islands** in `app/app.tsx` (REGIONS ES: `{id:"CN",n:"Canary Islands"}`).
  Region ids are matched with the `_XX` suffix stripped in `getAllHolidays`/`regionalDates`. Before adding country CN,
  check every place that compares a region id to a country code (grep `region` + `CN`) so a Canary Islands member
  never gets Chinese holidays and vice versa. Do not rename the Canary Islands id (existing members store it).

## Steps (in order)
1. **Holidays**
   - Add CN (and HK/TW if chosen) to the countries list in `app/app.tsx` (EU_C or the extra-country list: flag, name,
     timezone `Asia/Shanghai` is already mapped).
   - Run the generator; verify 2026 against the official State Council notice (国务院办公厅关于2026年部分节假日安排的通知)
     and 2027 when published (usually Nov–Dec 2026; check gov.cn). Override estimates with the official list in
     `scripts/data/cn-official.json` if they differ (same pattern as `scripts/data/xk.json`).
   - Makeup workdays (if decision 3a): store per year in the same override file; teach working-day counts, heatmap,
     Summary, bridges and ICS to treat them as working days for CN members.
   - Holiday names: run `build-holiday-names.mjs`; names for zh UI come from the Chinese names in the data.
2. **Translation (`zh`)** — add a `zh` block next to the `ar` block in each of these files:
   - `app/app.tsx` (3 language blocks: main UI dictionary `T`, front page, about/landing texts), `LANGS`
     (flag 🇨🇳, label "中文"), `LANG_NAMES` ("中文"), `LANG_HOME` (zh → "CN").
   - `app/workspace.tsx` (3 blocks), `lib/v3Text.ts` (all keys; completeness test checks 11 → make it 12),
     `lib/extraText.ts`, `lib/aboutText.ts`, `components/ShareSection.tsx`, `components/WorkoseniePromo.tsx`,
     `components/CoffeeButton.tsx`, privacy page (`app/privacy/page.tsx`) if it is translated.
   - Reports (PDF/print/approved PDF, Excel, CSV, ICS) take their labels from these dictionaries: check after.
   - Date formatting: `dateLocale()` must map zh → "zh-CN". Weekday/month names then come from Intl.
3. **Fonts / layout**
   - Plus Jakarta Sans / Figtree have no CJK glyphs: add a CJK fallback in the font stack (system: "PingFang SC",
     "Microsoft YaHei", "Noto Sans SC") — no extra download needed. Check the PDF report (html → PDF) renders CJK.
   - Chinese is shorter: check buttons that rely on text width; check line-height of 12px labels.
4. **SEO / site** (organic rules): `<html lang>` = zh-CN, hreflang if the site has language URLs, `?lang=zh` link,
   sitemap only if language pages are indexed. No ISR.
5. **Test** with the 2027 walker (scratchpad `walk2027.cjs` + `seed2027.mjs`, local build on port 3458):
   add `zh` to LANGS, add a CN member to the seed, re-run, compare with English for untranslated strings.

## Effort estimate
- Translation: ~900 strings across the files above. Machine-drafted + consistency pass ≈ 1.5–2 h; native review open.
- China holidays incl. official 2026/2027 check and makeup workdays ≈ 1–1.5 h.
- Test pass in 12 languages ≈ 30 min. Deploy + live check ≈ 15 min.
