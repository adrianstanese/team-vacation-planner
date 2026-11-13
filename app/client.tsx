"use client";

import App from "./app";

// Client boundary of the planner. The server page says which language its address stands for and hands over that
// language's front-page texts, so the first HTML is already in the right language.
export default function Client({ lang, about, countries = null }: { lang: string; about: Record<string, string>; countries?: [string, string][] | null }) {
  return <App pageLang={lang} about={about} countries={countries} />;
}
