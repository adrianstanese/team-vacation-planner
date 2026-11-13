import Client from "../client";
import { ABOUT_TX } from "@/lib/aboutText";

// The English front page, at the root. Only this language's "how it works" and feature texts travel with the page
// (about 5 KB), so search engines and first-time visitors get them in the HTML. The other languages have their own
// address (app/[lang]/page.tsx) and bring their own texts.
export default function Page() {
  return <Client lang="en" about={ABOUT_TX.en} />;
}
