"use client";
// The one part of the embed page that needs a script: paste a team's link (or its code) and get the addresses and
// the embed code with that team already in them. Nothing typed here is sent anywhere; the lines are put together in
// the browser. Before the script runs (and without it) the page shows the same lines with a stand-in code.
import { useState } from "react";
import { TEAM_STAND_IN, teamCode, embedLines, type EmbedLineKey } from "@/lib/embedLines";

export type MakerText = { label: string; hint: string; bad: string; planner: string; card: string; plannerCode: string; cardCode: string; feed: string; copy: string; copied: string; manual: string; local: string };

export default function EmbedMaker({ origin, tx }: { origin: string; tx: MakerText }) {
  const [text, setText] = useState("");
  const [done, setDone] = useState<{ key: string; ok: boolean } | null>(null);
  const code = teamCode(text);
  const bad = !!text.trim() && !code;
  const lines = embedLines(origin, code || TEAM_STAND_IN);
  const rows: [EmbedLineKey, string][] = [["planner", tx.planner], ["card", tx.card], ["plannerCode", tx.plannerCode], ["cardCode", tx.cardCode], ["feed", tx.feed]];
  const copy = async (key: string, value: string, line: Element | null) => {
    let ok = false;
    try { await navigator.clipboard.writeText(value); ok = true; } catch { /* not allowed on this page or in this browser */ }
    if (!ok && line) {
      // Select the line and try the browser's older copy command; if that fails too, the line stays selected
      try {
        const range = document.createRange();
        range.selectNodeContents(line);
        const sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(range); }
        ok = document.execCommand("copy");
      } catch { ok = false; }
    }
    setDone({ key, ok });
    setTimeout(() => setDone(d => (d && d.key === key ? null : d)), ok ? 2500 : 8000);
  };
  return <div className="maker">
    <label htmlFor="embed-team">{tx.label}</label>
    <input id="embed-team" type="text" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} value={text}
      onChange={e => setText(e.target.value)} placeholder={`${origin}/#team=…`} aria-describedby="embed-team-hint" aria-invalid={bad} />
    <p id="embed-team-hint" className="fine">{tx.hint} {tx.local}</p>
    <dl className="lines">{rows.map(([key, label]) => <div key={key}>
      <dt>{label}</dt>
      <dd><code>{lines[key]}</code>
        <button type="button" className="go alt" disabled={!code} onClick={e => copy(key, lines[key], e.currentTarget.previousElementSibling)}>{done && done.key === key && done.ok ? tx.copied : tx.copy}</button></dd>
    </div>)}</dl>
    <p className={bad ? "fine bad" : "fine"} role="status" aria-live="polite">{bad ? tx.bad : done ? (done.ok ? tx.copied : tx.manual) : ""}</p>
  </div>;
}
