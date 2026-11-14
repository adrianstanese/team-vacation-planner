import type { Metadata } from "next";
import AboutPage, { aboutMetadata } from "@/components/site/AboutPage";

// The About page in English. Every other language has its own under app/[lang], in a folder named after the
// page's address in that language (Romanian: app/[lang]/despre).
export const metadata: Metadata = aboutMetadata("en");

export default function Page() {
  return <AboutPage lang="en" />;
}
