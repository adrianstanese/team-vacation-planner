// The embed page (English only): how to show a team's calendar inside Notion, SharePoint and Microsoft Teams.
// Built once when the site is published. The steps follow each tool's own help pages (linked at the end of the page,
// with the day they were read); the wording is ours. The only script is the small helper that puts a team's code
// into the addresses (EmbedMaker).
import type { Metadata } from "next";
import PageFrame, { frameText } from "./PageFrame";
import EmbedMaker, { type MakerText } from "./EmbedMaker";
import { pageMetadata } from "@/lib/pageMeta";
import { langPath } from "@/lib/langs";
import { homeRel } from "@/lib/sitePages";
import { SITE_URL, CONTACT_EMAIL } from "@/lib/site";

const LANG = "en";
/** The day the tools' help pages were last read against these steps. */
export const EMBED_READ = "14 November 2026";
const HOST = new URL(SITE_URL).host;

const TITLE = "Embed a team vacation calendar in Notion, Teams or SharePoint";
const DESC = "Step by step: show your team's vacation calendar from Team Vacation Planner inside a Notion page, a SharePoint page or a Microsoft Teams channel. Free, no sign-up.";

export const embedMetadata = (): Metadata => pageMetadata("embed", LANG, TITLE, DESC);

const MAKER: MakerText = {
  label: "Your team link or code",
  hint: "In the planner, open your team, press Share and copy the link. Paste it here.",
  bad: "That does not look like a team link. Copy it from Share in the planner.",
  local: "Nothing you type here leaves your browser.",
  planner: "Planner address", card: "“Who is away” card address",
  plannerCode: "Embed code for the planner", cardCode: "Embed code for the card",
  feed: "Calendar feed address",
  copy: "Copy", copied: "Copied", manual: "Your browser did not let this page copy. The line is selected: press Ctrl+C (⌘C on a Mac).",
};

// The help pages the steps were written from
const SOURCES: { who: string; title: string; url: string }[] = [
  { who: "Notion Help", title: "Embeds, bookmarks & link mentions", url: "https://www.notion.com/help/embed-and-connect-other-apps" },
  { who: "Microsoft Support", title: "Add content to your page using the Embed web part", url: "https://support.microsoft.com/en-us/office/add-content-to-your-page-using-the-embed-web-part-721f3b2f-437f-45ef-ac4e-df29dba74de8" },
  { who: "Microsoft Support", title: "Allow or restrict the ability to embed content on SharePoint pages", url: "https://support.microsoft.com/en-us/office/allow-or-restrict-the-ability-to-embed-content-on-sharepoint-pages-e7baf83f-09d0-4bd1-9058-4aa483ee137b" },
  { who: "Microsoft Support", title: "Add a SharePoint page, list, or document library as a tab in Teams", url: "https://support.microsoft.com/en-us/office/add-a-sharepoint-page-list-or-document-library-as-a-tab-in-teams-131edef1-455f-4c67-a8ce-efa2ebf25f0b" },
  { who: "Microsoft 365 Developer Blog", title: "Upcoming updates to loading websites in Teams tabs", url: "https://devblogs.microsoft.com/microsoft365dev/upcoming-updates-to-loading-websites-in-teams-tabs/" },
  { who: "Microsoft Learn", title: "A website doesn't load in the new Teams desktop client", url: "https://learn.microsoft.com/en-us/troubleshoot/microsoftteams/tabs/websites-not-loaded-new-teams" },
];

export default function EmbedPage() {
  const home = langPath(LANG);
  return <PageFrame lang={LANG} page="embed">
    <section className="wrap hero">
      <span className="pill"><i></i>Free · no sign-up</span>
      <h1 className="h"><span>Embed your team&apos;s vacation calendar</span></h1>
      <p className="lede">Show a small “who is away” card, or the planner itself, inside Notion, SharePoint or Microsoft Teams. You need your team&apos;s link and a few minutes.</p>
    </section>

    <div className="wrap"><div className="stack-t">
      <section className="card">
        <h2>Get your addresses</h2>
        <p className="sub">Some tools ask for an address, others for embed code. Paste your team link once and copy the line each recipe asks for.</p>
        <EmbedMaker origin={SITE_URL} tx={MAKER} />
        <h3>Card or planner?</h3>
        <ul className="plain">
          <li><b>The card</b> shows who is away today and who is next. It asks nobody to sign in, so it suits a page the whole team glances at.</li>
          <li><b>The planner</b> is the full calendar. As on this site, it asks each person for their name and PIN before it shows the calendar.</li>
        </ul>
      </section>

      <section className="card" id="notion">
        <h2>Notion</h2>
        <ol className="plain">
          <li>Copy the <b>card address</b> (or the planner address). Notion takes an address that starts with https, not embed code.</li>
          <li>In your Notion page, type <code>/embed</code> and press Enter. You can also click the + at the start of a new line and choose Embed.</li>
          <li>Paste the address into the menu that appears.</li>
          <li>Drag the bars at the sides of the block to make it as wide and tall as you need.</li>
        </ol>
        <p className="fine">Notion says a “Failed to load” message means a site does not allow embedding. This site allows it, so write to us if you see it. Notion also says embeds that need a sign-in to another site do not work in its desktop and mobile apps. The card needs none. The planner asks for a PIN, so in those apps use the card, or open the planner in a browser.</p>
      </section>

      <section className="card" id="sharepoint">
        <h2>SharePoint</h2>
        <ol className="plain">
          <li>Copy the <b>embed code for the card</b> (or for the planner). Use the code, not the bare address: Microsoft says a bare address only works for websites that offer their own service for embedding by link.</li>
          <li>Open your SharePoint page and select Edit at the top right.</li>
          <li>Open the Toolbox, select “See all web parts” and choose Embed.</li>
          <li>Select “Edit properties” and paste the code into the “Website address or embed code” box.</li>
          <li>Save or publish the page as you normally do.</li>
        </ol>
        <p className="fine">If SharePoint answers “Embedding content from this website isn&apos;t allowed”, a site collection administrator has to allow this site. On the root site of the site collection: Site settings, then HTML Field Security under Site Collection Administration, then “Allow contributors to insert iframes only from the following domains”, and add <code>{HOST}</code>.</p>
      </section>

      <section className="card" id="teams">
        <h2>Microsoft Teams</h2>
        <p className="sub">Microsoft announced that, from July 2024, the Website tab of the new Teams opens an address in a browser tab instead of showing it inside Teams. To see the calendar inside Teams, add a SharePoint page as the tab.</p>
        <h3>Inside Teams, through a SharePoint page</h3>
        <ol className="plain">
          <li>Put the card or the planner on a page of the team&apos;s SharePoint site, as described above.</li>
          <li>In Teams, open the channel and select the + on the tab bar.</li>
          <li>Select SharePoint, then Pages, and pick that page.</li>
          <li>Select Save.</li>
        </ol>
        <p className="fine">Microsoft says you must be an owner of the SharePoint site to add its pages as a tab.</p>
        <h3>As a shortcut that opens the browser</h3>
        <ol className="plain">
          <li>In the channel, select the + on the tab bar and choose Website.</li>
          <li>Give the tab a name and paste the <b>planner address</b>.</li>
        </ol>
      </section>

      <section className="card">
        <h2>Good to know</h2>
        <ul className="plain">
          <li>The card shows the names of the people who are away to everyone who can open the page it sits on. Put it only where the team itself should see it.</li>
          <li>The card cannot change anything. It reloads by itself every 30 minutes, so it can stay open on an office screen.</li>
          <li>The embedded planner is the planner itself: people choose their name, enter their PIN and then add or change their own days, exactly as on this site.</li>
          <li>Prefer your own calendar app? Subscribe to the <b>calendar feed address</b> in Outlook, Google Calendar or Apple Calendar instead.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Where these steps come from</h2>
        <p className="sub">Written from each tool&apos;s own help pages as they read on {EMBED_READ}. Menus change: if a step no longer matches what you see, write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        <ul className="plain">{SOURCES.map(s => <li key={s.url}>{s.who}: <a href={s.url} rel="noopener">{s.title}</a></li>)}</ul>
      </section>

      <section className="card cta">
        <div><h2>No team yet?</h2><p>Create one in a minute: add people and their countries, then share the link.</p></div>
        <a className="go" href={home} rel={homeRel(LANG)}>{frameText(LANG).openPlanner}</a>
      </section>
    </div></div>
  </PageFrame>;
}
