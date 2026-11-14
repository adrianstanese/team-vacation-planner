import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AboutPage, { aboutMetadata } from "@/components/site/AboutPage";
import { pageSlug } from "@/lib/sitePages";

// The About page in Romanian. The folder name is the page's Romanian address, so the page exists for Romanian only:
// under any other language this address is "not found" (see app/[lang]/model-programare-concedii for why each
// language has a folder of its own).
const SLUG = "despre";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return pageSlug("about", lang) === SLUG ? aboutMetadata(lang) : {};
}

export default async function Page({ params }: Props) {
  const { lang } = await params;
  if (pageSlug("about", lang) !== SLUG) notFound();
  return <AboutPage lang={lang} />;
}
