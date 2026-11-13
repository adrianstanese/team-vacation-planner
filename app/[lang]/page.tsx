import { notFound } from "next/navigation";
import Client from "../client";
import { ABOUT_TX } from "@/lib/aboutText";
import { isSiteLang } from "@/lib/langs";
import { countryList } from "@/lib/countryList";

// The front page in one language, at /<code>. It carries that language's "how it works" and feature texts in its
// HTML, exactly as the English page at the root carries the English ones, plus the country names in that language.
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isSiteLang(lang) || lang === "en") notFound();
  const about = ABOUT_TX as Record<string, Record<string, string>>;
  return <Client lang={lang} about={about[lang] || about.en} countries={countryList(lang)} />;
}
