// Shared helpers for the translation scripts: find a dictionary's object literal in a source file.
import fs from "node:fs";

// Where each dictionary lives. `marker` is the text right before the opening brace of the whole dictionary
// (or, for v3Text, of the English block).
export const DICTS = [
  { id: "TX", file: "app/app.tsx", marker: "const TX=" },
  { id: "FP", file: "app/app.tsx", marker: "const FP_TX=" },
  { id: "HC", file: "app/workspace.tsx", marker: "const HC_TX=" },
  { id: "UP", file: "app/workspace.tsx", marker: "const UP_TX=" },
  { id: "NY", file: "app/workspace.tsx", marker: "const NY_TX=" },
  { id: "ABOUT", file: "lib/aboutText.ts", marker: "export const ABOUT_TX = " },
  { id: "X", file: "lib/extraText.ts", marker: "export const X_TX: Record<string, Dict> = " },
  { id: "V", file: "lib/v3Text.ts", marker: "const en: T = ", single: true },
  { id: "COFFEE", file: "components/CoffeeButton.tsx", marker: "const TX: Record<string, { cta: string; tab: string }> = " },
  { id: "SHARE", file: "components/ShareSection.tsx", marker: "const LABELS: Record<string, L> = " },
  { id: "PROMO", file: "components/WorkoseniePromo.tsx", marker: "const LABELS: Record<string, L> = " },
];

// Index of the brace that closes the one at `open` (string-aware).
export function closing(src, open) {
  let depth = 0, q = null;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; continue; }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") { depth--; if (depth === 0) return i; }
  }
  throw new Error("unbalanced");
}

export function locate(d) {
  const src = fs.readFileSync(d.file, "utf8");
  const at = src.indexOf(d.marker);
  if (at < 0) throw new Error(`marker not found: ${d.id}`);
  const open = src.indexOf("{", at + d.marker.length - 1);
  const close = closing(src, open);
  return { src, open, close };
}

export function readDict(d) {
  const { src, open, close } = locate(d);
  return (0, eval)("(" + src.slice(open, close + 1) + ")");
}
