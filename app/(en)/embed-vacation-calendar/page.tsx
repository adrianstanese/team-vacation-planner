import type { Metadata } from "next";
import EmbedPage, { embedMetadata } from "@/components/site/EmbedPage";

// How to show a team's calendar inside Notion, SharePoint and Microsoft Teams. Written in English only.
export const metadata: Metadata = embedMetadata();

export default function Page() {
  return <EmbedPage />;
}
