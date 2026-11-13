// Facts about the site that both root layouts state (English at the root, every other language under /<code>).
import type { Viewport } from "next";

export const SITE_URL = "https://www.vacationplanner.team";
export const SITE_NAME = "Team Vacation Planner";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const VIEWPORT: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F1EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F1A" },
  ],
};
