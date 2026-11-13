import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TemplatePage, { templateMetadata } from "@/components/template/TemplatePage";
import { templateSlug } from "@/lib/templateLinks";

// The leave planner template page in Romanian. The folder name is the page's Romanian address, so the page exists
// for Romanian only: under any other language this address is "not found". (A language gets its own folder, named
// in its own words, when its page is written. One shared folder with the name as a parameter does not build: the
// framework drops every page of such a route as soon as one language has none.)
const SLUG = "model-programare-concedii";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return templateSlug(lang) === SLUG ? templateMetadata(lang) : {};
}

export default async function Page({ params }: Props) {
  const { lang } = await params;
  if (templateSlug(lang) !== SLUG) notFound();
  return <TemplatePage lang={lang} />;
}
