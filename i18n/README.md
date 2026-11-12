# Translations

`base.json` is the one file every translation starts from. It holds each English string with its
placeholders, a context note where the meaning is not obvious, a soft length limit for short labels,
the translation rules and the glossary.

The first 11 languages (en, fr, de, es, pt, ro, hu, sv, it, bg, ar) are written directly in the source
files. Every later language is one file here, `<code>.json`, and is copied into the app by a script.

## Add a language

1. Create `i18n/<code>.json` with the same groups and keys as `base.json` → `groups`, the values being
   the translated text, plus a `_lang` block (fields explained in `base.json` → `lang_block`).
2. `node scripts/i18n/check.mjs <code>`: fix every error (missing key, changed `{placeholder}`, wrong
   list length); read the warnings (label too long, text left in English).
3. `node scripts/i18n/apply.mjs`: writes the language into the app's dictionaries and `lib/langMeta.ts`.
   The language then appears in the switcher, with its date format, text direction and fonts.
4. Build and look at the app in the new language (`?lang=<code>`).

## Change English text or add a string

Edit the English in the source file, add the key to each `i18n/<code>.json`, then run
`node scripts/i18n/extract.mjs` (rebuilds `base.json`; notes live in `scripts/i18n/notes.json`),
`check.mjs` and `apply.mjs`.

## Fix a translation

Edit `i18n/<code>.json` (never the generated `/*i18n:xx*/` blocks in the source), then run `apply.mjs`.

## Country holidays

Separate from translation: add the country to `EU_C` in `app/app.tsx`, then run
`node scripts/build-holiday-dates.mjs` and
`node scripts/build-holiday-names.mjs ../NonWorkingDays.nosync/lib/data/holidays`.
