import type { Metadata } from "next";
import Link from "next/link";
import CoffeeButton from "@/components/CoffeeButton";

// Privacy notice (GDPR Art. 13). Text drafted with Counsel (2026-11-11); not legal advice.
// OPERATOR_NAME / OPERATOR_ADDRESS: to be filled in by the site owner before this counts as a complete notice.
const OPERATOR_NAME = "";
const OPERATOR_ADDRESS = "";
const UPDATED = "11 November 2026";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Team Vacation Planner stores, why, for how long, and your rights.",
  alternates: { canonical: "https://www.vacationplanner.team/privacy" },
};

const wrap: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "var(--font-body), system-ui, sans-serif", color: "#2A1460", lineHeight: 1.6, fontSize: 15 };
const h2: React.CSSProperties = { fontSize: 17, margin: "28px 0 6px", color: "#4C1D95" };

export default function Privacy() {
  return <main style={{ minHeight: "100vh", background: "linear-gradient(145deg,#FEF7FF,#F0F4FF 50%,#F0FFF4)" }}>
    <div style={wrap}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Link href="/" prefetch={false} style={{ color: "#6D28D9", fontWeight: 600, textDecoration: "none" }}>← Team Vacation Planner</Link>
        <CoffeeButton />
      </div>
      <h1 style={{ fontSize: 30, margin: "18px 0 6px", color: "#3B0F80", fontFamily: "var(--font-display), system-ui, sans-serif" }}>Privacy</h1>
      <p style={{ color: "#5B4B8A", margin: 0 }}>Last updated: {UPDATED}</p>

      <h2 style={h2}>Who we are</h2>
      <p>Team Vacation Planner{OPERATOR_NAME ? <> is run by {OPERATOR_NAME}{OPERATOR_ADDRESS ? `, ${OPERATOR_ADDRESS}` : ""}</> : null}. Contact: <a href="mailto:contact@stanese.ro">contact@stanese.ro</a>.</p>

      <h2 style={h2}>What we store</h2>
      <p>For each team: the team name, members&apos; names, country and region, vacation days and half days, allowances, groups, comments, an optional logo, and an activity log. We also store hashed PINs (never the PIN itself). For security, we keep failed PIN attempts (no IP address) and failed admin sign-in attempts with the IP address, for one day, and a count of new teams per IP address for one day. We count visits by country, worked out from your browser&apos;s time zone, without storing your IP address. Our hosting provider processes IP addresses in its server logs to deliver the site and protect it from abuse.</p>

      <h2 style={h2}>Why, and on what basis</h2>
      <p>To run the planner you asked for (GDPR Art. 6(1)(b)). Colleagues added by someone else are processed for our and the team&apos;s legitimate interest in planning absences (Art. 6(1)(f)). The same basis covers security logs and site administration.</p>

      <h2 style={h2}>Who can see it</h2>
      <p>Anyone with the team link can see the team, including through the calendar and spreadsheet exports. A PIN only stops others from changing a member&apos;s days. The site administrator can see and manage all teams to give support, deal with abuse and handle deletion requests; admin actions are logged. We do not sell data and do not use ad networks or trackers. The planner shows a link to Workoșenie, another tool by the same maker, and a plain link to Buy Me a Coffee (no script or tracking is loaded from it).</p>

      <h2 style={h2}>Your browser</h2>
      <p>We keep your preferences, your list of teams, team owner keys and temporary PIN sessions in your browser&apos;s storage. They stay on your device and are used only to make the tool work. No cookies are used, except a sign-in cookie for the site administrator.</p>

      <h2 style={h2}>How long</h2>
      <p>Teams are deleted 24 months after they are created. A deleted team stays restorable for 30 days and is then erased. The admin action log is kept for 12 months. Security attempt logs are kept for one day.</p>

      <h2 style={h2}>Where</h2>
      <p>Data is hosted by Vercel Inc. (website) and Neon (database). Where data is processed outside the EU, transfers rely on the EU–US Data Privacy Framework or the European Commission&apos;s standard contractual clauses.</p>

      <h2 style={h2}>Before you add colleagues</h2>
      <p>Tell them, and don&apos;t enter reasons for absence or health details.</p>

      <h2 style={h2}>Your rights</h2>
      <p>You can ask to see, correct or delete data about you, or object to its use, by writing to <a href="mailto:contact@stanese.ro">contact@stanese.ro</a> with the team link. You may also complain to your data protection authority (in Romania: ANSPDCP, dataprotection.ro).</p>
    </div>
  </main>;
}
