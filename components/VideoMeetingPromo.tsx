"use client";
// Front page, full width under the ProvenRead and Workoșenie cards: Free Video Meeting Space, a free
// link-only video call tool from the same maker (option A "Call preview", mockups/video-meeting-promo).
// The link is nofollow (portfolio rule: no followed links between Adrian's own sites). The call on the
// right is an illustration: names and the call title are examples, nothing is live.
import { X, isRtl } from "@/lib/extraText";
import "./videomeeting.css";

export const VIDEO_MEETING_URL = "https://pmo-private-teams.vercel.app";
type Th = { bg?: string };
const PEOPLE: [string, string, string][] = [["AM", "Ana", "#8B5CF6"], ["RK", "Radu", "#3B82F6"], ["LW", "Li Wei", "#D946EF"], ["TS", "Tomás", "#0EA5E9"]];
const Cam = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="12" height="11" rx="3" /><path d="M15 10.5l6-3v9l-6-3z" /></svg>;

export default function VideoMeetingPromo({ th, lang = "en" }: { th: Th; lang?: string }) {
  const dark = /#13111C|#1A1625|#0B0F1A/i.test(String(th.bg || ""));
  return <section className={"vmp" + (dark ? " dark" : "")} dir={isRtl(lang) ? "rtl" : "ltr"} aria-labelledby="vmp-h">
    <div className="vmp-copy">
      <div className="vmp-head">
        <div className="vmp-mark" aria-hidden="true"><Cam /></div>
        <div><span className="vmp-from">{X("sameMaker")}</span><h2 id="vmp-h" className="vmp-h">{X("vmQ")} <span lang="en">Free Video Meeting Space</span></h2></div>
      </div>
      <p className="vmp-sub">{X("vmSub")}</p>
      <ul className="vmp-feat">{["vmF1", "vmF2", "vmF3", "vmF4"].map(k => <li key={k}>{X(k)}</li>)}</ul>
      <div className="vmp-foot">
        <a className="vmp-cta" href={VIDEO_MEETING_URL} target="_blank" rel="nofollow noopener">{X("vmCta")} <span className="arr" aria-hidden="true">→</span></a>
        <span className="vmp-fine">{X("vmFine")}</span>
      </div>
    </div>
    <div className="vmp-call" role="img" aria-label={X("vmAlt")}>
      <div className="vmp-top"><b>{X("vmCall")}</b><span><i />{X("vmOf", { n: 4 })} · 12:48</span></div>
      <div className="vmp-tiles">
        {PEOPLE.map(([ini, name, c], i) => <div key={ini} className={"vmp-tile" + (i === 0 ? " talk" : "")}>
          <div className="vmp-av" style={{ background: c }}>{ini}</div><span className="nm">{name}</span>{i === 1 && <span className="hand">✋</span>}
        </div>)}
      </div>
      <div className="vmp-bar" aria-hidden="true">
        <span><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg></span>
        <span><Cam /></span>
        <span><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg></span>
        <span><svg viewBox="0 0 24 24"><path d="M4 6h16v10H9l-5 4z" /></svg></span>
        <span className="x"><svg viewBox="0 0 24 24"><path d="M4 14c4-5 12-5 16 0l-2.5 2.5-3-1.5v-3h-5v3l-3 1.5z" /></svg></span>
      </div>
    </div>
  </section>;
}
