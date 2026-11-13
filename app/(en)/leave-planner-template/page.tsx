import type { Metadata } from "next";
import TemplatePage, { templateMetadata } from "@/components/template/TemplatePage";

// The leave planner template page in English. Every other language has its own under app/[lang], in a folder
// named after the page's address in that language (Romanian: app/[lang]/model-programare-concedii).
export const metadata: Metadata = templateMetadata("en");

export default function Page() {
  return <TemplatePage lang="en" />;
}
