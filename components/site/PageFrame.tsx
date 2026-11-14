// The frame every ready-made page shares (template, about, embed): the front page's look, a header that leads back
// to the planner, and a footer that links the pages to each other. Built once when the site is published; no script
// of its own besides the one line that picks the visitor's theme before the first paint.
import type { ReactNode } from "react";
import "@/app/frontpage.css";
import "@/app/template.css";
import { langPath, langDir } from "@/lib/langs";
import { SITE_PAGES, PAGE_LINK, pagePath, pageRel, homeRel, type SitePage } from "@/lib/sitePages";
import { TEMPLATE_YEAR } from "@/lib/templateLinks";
import { SITE_NAME } from "@/lib/site";

// The few words the frame itself says, in the languages the pages are written in
const FRAME_TX: Record<string, { home: string; openPlanner: string; foot: string; privacy: string; name: string }> = {
  en: { home: "Team Vacation Planner", openPlanner: "Open the planner", foot: "Free · no sign-up", privacy: "Privacy", name: "English" },
  ro: { home: "Planificator Concedii Echipă", openPlanner: "Deschide planificatorul", foot: "Gratuit · fără cont", privacy: "Confidențialitate", name: "Română" },
};
// Before the first paint: the theme the visitor chose in the planner, else the device's dark mode
const THEME = `(function(){try{var t=JSON.parse(localStorage.getItem("drift-theme")||"null");if(t!=="light"&&t!=="dark"&&t!=="pink")t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"";if(t)document.currentScript.parentElement.setAttribute("data-theme",t);}catch(e){}})();`;
const ORDER: SitePage[] = ["template", "about", "embed"];

export const frameText = (lang: string) => FRAME_TX[lang] || FRAME_TX.en;

export default function PageFrame({ lang, page, children }: { lang: string; page: SitePage; children: ReactNode }) {
  const tx = frameText(lang), home = langPath(lang);
  // The same page in the other languages it is written in
  const others = Object.keys(SITE_PAGES[page]).filter(l => l !== lang);
  // The other ready-made pages this language has
  const more = ORDER.filter(p => p !== page && pagePath(p, lang));
  return <div className="fp tpl" data-theme="light" dir={langDir(lang)} lang={lang} suppressHydrationWarning>
    <script dangerouslySetInnerHTML={{ __html: THEME }} />
    <div className="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <header className="top"><div className="wrap">
      <a className="brand" href={home} rel={homeRel(lang)}>
        <span className="logo"><svg className="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg></span>
        <span className="long">{tx.home}</span>
      </a>
      {others.map(l => <a key={l} className="ghost" href={SITE_PAGES[page][l]} rel={pageRel(page, l)} lang={l}>{frameText(l).name}</a>)}
      <a className="ghost" href={home} rel={homeRel(lang)}>{tx.openPlanner}</a>
    </div></header>

    <main>{children}</main>

    <footer className="foot"><div className="wrap">
      <span className="sp">{SITE_NAME} · {tx.foot}</span>
      <a href={home} rel={homeRel(lang)}>{tx.openPlanner}</a>
      {more.map(p => <a key={p} href={pagePath(p, lang) || home} rel={pageRel(p, lang)}>{PAGE_LINK[p][lang].replace("{y}", String(TEMPLATE_YEAR))}</a>)}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a plain link on purpose: one full page load, no background request */}
      <a href="/privacy">{tx.privacy}</a>
    </div></footer>
  </div>;
}
