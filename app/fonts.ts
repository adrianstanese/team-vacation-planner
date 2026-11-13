import { Plus_Jakarta_Sans, Figtree } from "next/font/google";

// Front-page fonts, self-hosted by next/font at build time (no runtime request to Google). Defined once and shared
// by the two root layouts: English at the root, every other language under /<code>.
export const display = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], weight: ["700", "800"], variable: "--font-display", display: "swap" });
export const body = Figtree({ subsets: ["latin", "latin-ext"], weight: ["400", "600", "700", "800"], variable: "--font-body", display: "swap" });
