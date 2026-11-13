"use client";

import App from "./app";

// Client boundary of the planner. The server page passes the English front-page texts so they are in the first HTML.
export default function Client({ aboutEn }: { aboutEn: Record<string, string> }) {
  return <App aboutEn={aboutEn} />;
}
