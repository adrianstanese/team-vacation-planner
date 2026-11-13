import Client from "./client";
import { ABOUT_TX } from "@/lib/aboutText";

// Server page: only the English "how it works" and feature texts travel with the page (about 5 KB), so search engines
// and first-time visitors get them in the HTML. The other 16 languages stay in the on-demand chunk.
export default function Page() {
  return <Client aboutEn={ABOUT_TX.en} />;
}
