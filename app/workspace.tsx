"use client";
// The team screen (calendar, views, members, exports) and the code only it uses, split out of app.tsx so the
// front page loads without it. Shared helpers and constants are imported from ./app.
import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import qrcode from "qrcode-generator";
import { createPortal, flushSync } from "react-dom";
import BottomDuo from "@/components/WorkoseniePromo";
import CoffeeButton from "@/components/CoffeeButton";
import nextDynamic from "next/dynamic";
import TodayTiles from "@/components/v3/TodayTiles";
import { V } from "@/lib/v3Text";
import { pendingApprovals, streaksOf } from "@/lib/v3Util";
import { withTransition, celebrate, buzz } from "@/lib/motion";
import "./frontpage.css";
import { buildSheets } from "@/lib/xlsxSheets";
import { planImport } from "@/lib/importPlan";
import { findBridges } from "@/lib/bridges";
import { X, textLang, dateLocale } from "@/lib/extraText";
// Loaded only when first opened (keeps the first page load small)
import { AnimNum, Btn, CD, CM, CY, EU_C, F, FIXED, FM, G, HolBrowser, Ic, LUNAR_EXTRA, LangDrop, MC, R, REGIONS, ThPk, YEAR_MAX, YEAR_MIN, authKey, computeHolidays, dim, dk, fdm, fileBase, generateTSV, getAllHolidays, getOwner, getTokens, gid, holName, isWe, pk, reportSafe, safeLogo, safeYear, syncReload, teamForYear, useHolidayNames, useVisits, usedOf, waitIdle, withBusy, defaultRegionName, holNameFor, holNameAny } from "./app";

const ApprovalInbox=nextDynamic(()=>import("@/components/v3/ApprovalInbox"),{ssr:false});

const TimeTravel=nextDynamic(()=>import("@/components/v3/TimeTravel"),{ssr:false});

const Wrapped=nextDynamic(()=>import("@/components/v3/Wrapped"),{ssr:false});
const ApprovalsView=nextDynamic(()=>import("@/components/v3/ApprovalsView"),{ssr:false});

// Public holidays of a member for a year, cached by country + region
const HOL_CACHE=new Map();

function holSetOf(m,yr){const k=yr+"|"+((m&&m.country)||"")+"|"+((m&&m.region)||"");let v=HOL_CACHE.get(k);if(!v){v=new Set(m&&m.country?getAllHolidays(m,yr):[]);if(HOL_CACHE.size>400)HOL_CACHE.clear();HOL_CACHE.set(k,v);}return v;}

// PINs are hashed and checked on the server (app/api/team/auth, lib/teamAuth.ts)

// ═══════════════════════════════════════════════════════════════════
// TEAM VACATION PLANNER v5
// Multi-year holidays · Drag-select · Conflicts · ICS · PDF · Admin
// Heatmap · Timeline · Coverage Dashboard · Embed Widget
// ═══════════════════════════════════════════════════════════════════

// ─── CSS Animations ──────────────────────────────────────────
const CSS_ANIMS = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeSlide { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
@keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: .8; } }
@keyframes floatA { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(2deg); } }
@keyframes floatB { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px) rotate(-1.5deg); } }
@keyframes floatC { 0%,100% { transform: translateY(-4px) rotate(1deg); } 50% { transform: translateY(-16px) rotate(-2deg); } }
@keyframes glowSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes glow { 0%,100% { box-shadow: 0 0 8px rgba(99,102,241,.15); } 50% { box-shadow: 0 0 20px rgba(99,102,241,.35); } }
@keyframes popIn { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
.tvp-fade { animation: fadeIn .3s ease-out both; }
.tvp-slide { animation: fadeSlide .25s ease-out both; }
.tvp-pop { animation: popIn .2s ease-out both; }
.tvp-skel { animation: pulse 1.5s ease-in-out infinite; border-radius: 6px; }
.tvp-glow { animation: glow 3s ease-in-out infinite; }
.tvp-botnav { position:fixed; bottom:0; left:0; right:0; z-index:95; display:flex; justify-content:space-around; padding:6px 0 env(safe-area-inset-bottom,8px); }
`;

function workingDaysRemaining(member, year) {
  var today = new Date();
  var startM = today.getFullYear() === year ? today.getMonth() : 0;
  var startD = today.getFullYear() === year ? today.getDate() : 1;
  var hols = getAllHolidays(member, year);
  var holSet = {};
  for (var i = 0; i < hols.length; i++) holSet[hols[i]] = 1;
  var vacSet = {};
  var days = member.days || [];
  for (var i = 0; i < days.length; i++) vacSet[days[i]] = 1;
  var count = 0;
  for (var m = startM; m < 12; m++) {
    var daysInMonth = new Date(year, m + 1, 0).getDate();
    var sd = (m === startM) ? startD : 1;
    for (var d = sd; d <= daysInMonth; d++) {
      var dt = new Date(year, m, d);
      var dow = dt.getDay();
      if (dow === 0 || dow === 6) continue;
      var key = year + "-" + String(m+1).padStart(2,"0") + "-" + String(d).padStart(2,"0");
      if (holSet[key]) continue;
      if (vacSet[key]) continue;
      count++;
    }
  }
  return count;
}

const fmtDays=n=>Number.isInteger(n)?String(n):String(Math.round(n*10)/10);

const setToken=(id,mid,tok)=>{try{const t0=getTokens(id);t0[mid]=tok;sessionStorage.setItem(authKey(id),JSON.stringify(t0));}catch(e){}};

const hasPinOf=m=>!!(m&&(m.hasPin||m.pinHash));

async function teamAuth(body){try{const r=await fetch("/api/team/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));return {ok:r.ok,status:r.status,...j};}catch(e){return {ok:false,status:0,error:"offline"};}}

// ─── Excel export (.xlsx) ────────────────────────────────────────
function exportXLSX(team, t){
  var yr = safeYear(team);
  var hols = new Set<string>(); team.members.forEach(function(m){ if(m.country) computeHolidays(m.country,yr).forEach(function(h){hols.add(h);}); });
  var name = fileBase(team.name)+"_"+yr+".xlsx";
  return withBusy((async function(){
    var mod = await import("write-excel-file/universal");
    var sheets = buildSheets({
      teamName: team.name||"", year: yr, members: team.members, holidays: hols,
      colors: MC.map(function(c){return c.d;}),
      countryName: function(cc){ var co = cc ? EU_C.find(function(c){return c.c===cc;}) : null; return co ? co.n : ""; },
      months: t.M || ["January","February","March","April","May","June","July","August","September","October","November","December"],
      dayLabels: [t.mo||"Mo",t.tu||"Tu",t.we2||"We",t.th||"Th",t.fr||"Fr",t.sa||"Sa",t.su||"Su"],
      generated: new Date().toLocaleDateString(),
    });
    var blob = await mod.default(sheets).toBlob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  })().catch(function(e){ console.warn("xlsx failed, using legacy .xls", e); R("exportXLSLegacy")(team, t); }));
}

// ─── ICS Export ──────────────────────────────────────────────────
function generateICS(member, teamName) {
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//TeamVacationPlanner//EN","CALSCALE:GREGORIAN"];
  (member.days || []).sort().forEach(d => {
    const p = pk(d);
    const start = `${p.y}${String(p.m+1).padStart(2,"0")}${String(p.d).padStart(2,"0")}`;
    const endDt = new Date(p.y, p.m, p.d + 1);
    const end = `${endDt.getFullYear()}${String(endDt.getMonth()+1).padStart(2,"0")}${String(endDt.getDate()).padStart(2,"0")}`;
    lines.push("BEGIN:VEVENT",`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:${member.name} - Vacation`,`DESCRIPTION:Team: ${teamName}`,"END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadICS(member, teamName) {
  const ics = generateICS(member, teamName);
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${fileBase(member.name)}_vacation.ics`; a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Report ──────────────────────────────────────────────────

// ─── Print Report (opens formatted view in new window with print dialog) ──
function getEmbedCode(teamId) {
  const url = `${window.location.origin}${window.location.pathname}#team=${teamId}`;
  return `<iframe src="${url}" width="100%" height="800" frameborder="0" style="border:1px solid #e8e6e1;border-radius:12px;"></iframe>`;
}

// ─── iCal Team Subscription Feed ─────────────────────────────────
function generateTeamICS(team) {
  team = reportSafe(team);
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//TeamVacationPlanner//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH",`X-WR-CALNAME:${team.name} Vacations`];
  team.members.forEach(m => {
    (m.days || []).sort().forEach(d => {
      const p = pk(d);
      const start = `${p.y}${String(p.m+1).padStart(2,"0")}${String(p.d).padStart(2,"0")}`;
      const endDt = new Date(p.y, p.m, p.d + 1);
      const end = `${endDt.getFullYear()}${String(endDt.getMonth()+1).padStart(2,"0")}${String(endDt.getDate()).padStart(2,"0")}`;
      const uid = `${m.id}-${d}@tvp`;
      lines.push("BEGIN:VEVENT",`UID:${uid}`,`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:${m.name} - Vacation`,`DESCRIPTION:Team: ${team.name}`,"TRANSP:TRANSPARENT","END:VEVENT");
    });
  });
  // Also add team holidays
  const countries = new Set(); team.members.forEach(m => { if (m.country) countries.add(m.country); });
  const yr = safeYear(team);
  countries.forEach(cc => {
    computeHolidays(cc, yr).forEach(h => {
      const p = pk(h);
      const start = `${p.y}${String(p.m+1).padStart(2,"0")}${String(p.d).padStart(2,"0")}`;
      const endDt = new Date(p.y, p.m, p.d + 1);
      const end = `${endDt.getFullYear()}${String(endDt.getMonth()+1).padStart(2,"0")}${String(endDt.getDate()).padStart(2,"0")}`;
      const co = EU_C.find(c => c.c === cc);
      lines.push("BEGIN:VEVENT",`UID:hol-${cc}-${h}@tvp`,`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:🏛 ${holNameFor(cc,h)} (${(co&&co.n) || cc})`,`DESCRIPTION:Public holiday in ${(co&&co.n) || cc}`,"TRANSP:TRANSPARENT","END:VEVENT");
    });
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadTeamICS(team) {
  const ics = generateTeamICS(team);
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${fileBase(team.name)}_team_calendar.ics`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Holiday Clash Detector ──────────────────────────────────────
function detectHolidayClashes(member, year) {
  if (!member.country || !(member.days||[]).length) return [];
  const hols = new Set(computeHolidays(member.country, year));
  return member.days.filter(d => hols.has(d)).map(d => ({
    date: d,
    name: holNameFor(member.country, d, member.region),
    country: (EU_C.find(c => c.c === member.country)||{}).n || member.country,
  }));
}

// ─── QR Code Generator (pure SVG, no library) ───────────────────
function QRCode({ data, size = 160, th }) {
  // Real, scannable QR code (error correction M), drawn as one SVG path with a 4-module quiet zone
  let path = "", n = 21;
  try {
    const qr = qrcode(0, "M"); qr.addData(data); qr.make();
    n = qr.getModuleCount();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + 4} ${r + 4}h1v1h-1z`;
  } catch (e) { path = ""; }
  const total = n + 8;
  return <svg width={size} height={size} viewBox={`0 0 ${total} ${total}`} shapeRendering="crispEdges" role="img" aria-label="QR code" style={{ borderRadius: 8, display: "block" }}>
    <rect width={total} height={total} fill="#fff" />
    <path d={path} fill="#111827" />
  </svg>;
}

// ─── CSV Export ──────────────────────────────────────────────────
function exportCSV(team, t) {
  team = reportSafe(team);
  const yr = safeYear(team);
  let csv = "Name,Country,Start Date,End Date\n";
  team.members.forEach(m => {
    const co = m.country ? (EU_C.find(c => c.c === m.country)||{}).n || m.country : "";
    const sorted = [...(m.days || [])].sort();
    // Group consecutive days into ranges
    let i = 0;
    while (i < sorted.length) {
      const start = sorted[i];
      let end = start;
      while (i + 1 < sorted.length) {
        const curr = pk(sorted[i]);
        const next = pk(sorted[i + 1]);
        const currDt = new Date(curr.y, curr.m, curr.d);
        const nextDt = new Date(next.y, next.m, next.d);
        const diff = (nextDt - currDt) / 86400000;
        if (diff <= 3) { // Allow gaps of weekends
          i++;
          end = sorted[i];
        } else break;
      }
      csv += `"${m.name}","${co}","${start}","${end}"\n`;
      i++;
    }
    if (sorted.length === 0) csv += `"${m.name}","${co}","",""\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${fileBase(team.name)}_${yr}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function VisitCounter({ th }) {
  const visits = useVisits();
  if (!visits) return null;

  const sorted = Object.entries(visits.countries || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const flagMap = {};
  EU_C.forEach(c => { flagMap[c.c] = c.f; });
  Object.assign(flagMap, { US: "🇺🇸", AE: "🇦🇪", IN: "🇮🇳", JP: "🇯🇵", CN: "🇨🇳", AU: "🇦🇺", CA: "🇨🇦", BR: "🇧🇷", NZ: "🇳🇿", SA: "🇸🇦", BH: "🇧🇭", CL: "🇨🇱", MA: "🇲🇦", KZ: "🇰🇿", OTHER: "🌍" });

  return <div style={{ marginTop: 32, padding: "16px 20px", background: th.gbg, borderRadius: G.rSm, border: `1px solid ${th.gbd}`, backdropFilter: G.blur, WebkitBackdropFilter: G.blur, boxShadow: th.sd }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
      <Ic n="globe" s={14} c={th.t3} />
      <span style={{ fontSize: 11, fontWeight: 600, color: th.t3, textTransform: "uppercase", letterSpacing: 1 }}><AnimNum val={visits.total}/> {V("visitsLbl")}</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
      {sorted.map(([cc, count]) => <div key={cc} style={{
        display: "flex", alignItems: "center", gap: 4, padding: "3px 10px",
        background: th.sh, borderRadius: 20, fontSize: 11, fontWeight: 600, color: th.t2,
      }}>{flagMap[cc] || "🏳️"} {cc} <span style={{ color: th.ac, fontFamily: FM }}>{count}</span></div>)}
    </div>
  </div>;
}

// ─── Change Log / Activity Feed ──────────────────────────────────
function addLogEntry(team, action) {
  const log = [...(team.log || [])];
  log.push({ t: new Date().toISOString(), a: action });
  if (log.length > 50) log.splice(0, log.length - 50); // keep last 50
  return log;
}

function ChangeLogView({ team, th, t }) {
  const log = [...(team.log || [])].reverse();
  if (!log.length) return <div style={{ textAlign: "center", padding: 40, color: th.t3, fontSize: 13 }}>{t.noActivity}</div>;

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return <div style={{ maxHeight: 400, overflowY: "auto" }}>
    <div style={{ textAlign: "center", marginBottom: 16 }}><span style={{ fontSize: 18, fontWeight: 700, color: th.tx }}>{t.activityLog}</span></div>
    {log.map((entry, i) => <div key={i} style={{
      display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 12px",
      background: i % 2 === 0 ? th.gbg : "transparent", borderRadius: G.rXs,
      backdropFilter: i % 2 === 0 ? G.blur : "none",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: th.ac, marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: th.tx, fontWeight: 500 }}>{entry.a}</div>
        <div style={{ fontSize: 10, color: th.t3, marginTop: 2, fontFamily: FM }}>{timeAgo(entry.t)}</div>
      </div>
    </div>)}
  </div>;
}

// ─── XLSX Export (rich SpreadsheetML with calendar grid, timeline, stats) ────

const Toast=({message:m,visible:v})=><div role="status" aria-live="polite" className={m?undefined:"tvp-sr"}>{m?<div style={{position:"fixed",bottom:32,left:"50%",transform:"translateX(-50%) translateY("+(v?0:20)+"px)",background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",padding:"12px 24px",borderRadius:50,fontSize:14,fontWeight:600,fontFamily:F,boxShadow:"0 8px 32px rgba(99,102,241,0.3)",opacity:v?1:0,transition:"all .3s",pointerEvents:"none",zIndex:9999,display:"flex",alignItems:"center",gap:8}}><Ic n="check" s={16} c="#FFF"/>{m}</div>:null}</div>;

// ─── Country Select ──────────────────────────────────────────────
function CountrySelect({value,onChange,th,t}) {
  const[open,setOpen]=useState(false);const[search,setSearch]=useState("");
  const co=value?EU_C.find(c=>c.c===value):null;
  const filtered=EU_C.filter(c=>c.n.toLowerCase().includes(search.toLowerCase()));
  return <div style={{position:"relative"}}>
    <button onClick={()=>setOpen(!open)} style={{width:"100%",padding:"8px 12px",border:`1.5px solid ${th.bd}`,borderRadius:8,background:th.sf,color:th.tx,fontFamily:F,fontSize:13,fontWeight:500,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
      {co?<Fragment><span>{co.f}</span>{co.n}</Fragment>:<span style={{color:th.t3}}>{t.selC}</span>}
    </button>
    {open&&<div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:th.gbg,border:`1px solid ${th.gbd}`,borderRadius:G.rXs,boxShadow:th.sm,zIndex:50,maxHeight:200,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,display:"flex",flexDirection:"column"}}>
      <div style={{padding:6}}><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder={X("search")} style={{width:"100%",padding:"6px 10px",border:`1px solid ${th.bd}`,borderRadius:6,fontSize:13,fontFamily:F,outline:"none",background:th.bg,color:th.tx,boxSizing:"border-box"}}/></div>
      <div style={{overflowY:"auto",maxHeight:160}}>
        {filtered.map(c=> <button key={c.c} onClick={()=>{onChange(c.c);setOpen(false);setSearch("");}} style={{width:"100%",padding:"8px 12px",border:"none",background:c.c===value?th.al:"transparent",color:th.tx,fontFamily:F,fontSize:13,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background=th.sh} onMouseLeave={e=>e.currentTarget.style.background=c.c===value?th.al:"transparent"}><span>{c.f}</span>{c.n}</button>)}
      </div>
    </div>}
  </div>;
}

const HC_TX={
  en:{ph:"Public holiday",off:"Day off for",wk:"falls on a weekend",mn:"Moon-based date – it can move by a day"},
  fr:{ph:"Jour férié",off:"Jour chômé pour",wk:"tombe un week-end",mn:"Date lunaire – peut varier d'un jour"},
  de:{ph:"Feiertag",off:"Frei für",wk:"fällt auf ein Wochenende",mn:"Mondkalender – kann sich um einen Tag verschieben"},
  es:{ph:"Festivo",off:"Día libre para",wk:"cae en fin de semana",mn:"Fecha lunar – puede moverse un día"},
  pt:{ph:"Feriado",off:"Dia livre para",wk:"calha num fim de semana",mn:"Data lunar – pode mudar um dia"},
  ro:{ph:"Sărbătoare legală",off:"Zi liberă pentru",wk:"cade în weekend",mn:"Dată lunară – se poate muta cu o zi"},
  hu:{ph:"Munkaszüneti nap",off:"Szabadnap:",wk:"hétvégére esik",mn:"Holdnaptár szerinti – egy nappal eltolódhat"},
  sv:{ph:"Helgdag",off:"Ledigt för",wk:"infaller på en helg",mn:"Månkalender – kan flyttas en dag"},
  it:{ph:"Festività",off:"Giorno libero per",wk:"cade nel fine settimana",mn:"Data lunare – può spostarsi di un giorno"},
  bg:{ph:"Официален празник",off:"Почивен ден за",wk:"пада се в събота или неделя",mn:"Лунна дата – може да се измести с един ден"},
  ar:{ph:"عطلة رسمية",off:"يوم عطلة لـ",wk:"يصادف عطلة نهاية الأسبوع",mn:"تاريخ قمري – قد يتغير بيوم واحد"},
};

// For one date: each country (and region) in the team that has a holiday, its name and who is off
function holidayInfo(key,members,year,names){
  const groups:Record<string,{cc:string,who:string[],regions:Set<string>}>={};
  (members||[]).forEach(m=>{
    if(!m.country)return;
    if(getAllHolidays(m,year).indexOf(key)<0)return;
    const g=groups[m.country]||(groups[m.country]={cc:m.country,who:[],regions:new Set()});
    g.who.push(m.name||"");if(m.region)g.regions.add(m.region);
  });
  return Object.values(groups).map(g=>{
    const rows=(names[g.cc]&&names[g.cc].h&&names[g.cc].h[key])||[];
    let pick=rows.find(r=>!r[3]||!r[3].length)||rows.find(r=>r[3]&&r[3].some(x=>g.regions.has(x)))||rows[0];
    const local=pick?pick[0]:holName(key);const en=pick?pick[1]:"";
    const lx=LUNAR_EXTRA[g.cc]&&LUNAR_EXTRA[g.cc][year];
    const lunar=!!(lx&&lx.split(",").indexOf(key.slice(5,7)+key.slice(8,10))>=0&&!(FIXED[g.cc]||[]).includes(key.slice(5)));
    return{cc:g.cc,local,en:en&&en!==local?en:"",who:g.who,lunar};
  });
}

function HolidayCard({info,dateKey,rect,lang,th,onClose,onHover=null}){
  const ref=useRef(null);
  // Native popover: shown in the browser's top layer (above dialogs and blurred cards), entry animation in CSS
  const popRef=useCallback(el=>{ref.current=el;if(el&&el.showPopover&&!el.matches(":popover-open")){try{el.showPopover();}catch(e){}}},[]);
  const L=HC_TX[lang]||HC_TX.en;
  useEffect(()=>{
    const esc=e=>{if(e.key==="Escape")onClose();};
    const out=e=>{if(ref.current&&!ref.current.contains(e.target))onClose();};
    const sc=()=>onClose();
    window.addEventListener("keydown",esc);document.addEventListener("pointerdown",out,true);window.addEventListener("scroll",sc,true);
    return()=>{window.removeEventListener("keydown",esc);document.removeEventListener("pointerdown",out,true);window.removeEventListener("scroll",sc,true);};
  },[onClose]);
  if(!info||!info.length||!rect)return null;
  const W=260;const vw=typeof window!=="undefined"?window.innerWidth:1024;const vh=typeof window!=="undefined"?window.innerHeight:768;
  const left=Math.max(8,Math.min(vw-W-8,rect.left+rect.width/2-W/2));
  const estH=58+info.length*64;const below=rect.bottom+8+estH<vh||rect.top-8-estH<0;
  const pos=below?{top:rect.bottom+8}:{bottom:vh-rect.top+8};
  const p=pk(dateKey);const dt=new Date(p.y,p.m,p.d,12);
  let when="";try{when=dt.toLocaleDateString(lang==="en"?"en-GB":lang,{weekday:"long",day:"numeric",month:"long",year:"numeric"});}catch(e){when=dateKey;}
  const weekend=dt.getDay()===0||dt.getDay()===6;
  // Portal to <body>: the month cards use backdrop-filter, which would trap and clip a fixed-position card
  return createPortal(<div ref={popRef} popover="manual" className="tvp-pop" role="tooltip" aria-label={L.ph} onMouseEnter={()=>onHover&&onHover(true)} onMouseLeave={()=>onHover&&onHover(false)} dir={lang==="ar"?"rtl":"ltr"} style={{position:"fixed",top:"auto",right:"auto",bottom:"auto",margin:0,left,width:W,...pos,zIndex:400,background:th.sf,border:"1px solid "+th.bd,borderRadius:14,boxShadow:"0 12px 32px rgba(30,27,75,.18)",padding:"12px 14px",fontFamily:F,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,animation:"popIn .15s ease-out"}}>
    <div style={{fontSize:13,fontWeight:700,color:th.tx,marginBottom:2,textTransform:"capitalize"}}>{when}</div>
    <div style={{fontSize:11,color:th.t3,marginBottom:8}}>{L.ph}{weekend?" · "+L.wk:""}</div>
    {info.map(g=><div key={g.cc} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"6px 0",borderTop:"1px solid "+th.bl}}>
      <span style={{fontSize:10,fontWeight:800,color:"#B91C1C",background:"#FEE2E2",borderRadius:6,padding:"2px 6px",flexShrink:0,marginTop:1}}>{g.cc}</span>
      <div style={{minWidth:0}}>
        <div style={{fontSize:13,fontWeight:650,color:th.tx,lineHeight:1.3}}>{g.local}</div>
        {g.en&&<div style={{fontSize:11,color:th.t2,lineHeight:1.3}}>{g.en}</div>}
        <div style={{fontSize:11,color:th.t3,marginTop:3}}>{L.off} {g.who.join(", ")}</div>
        {g.lunar&&<div style={{fontSize:11,color:"#B45309",marginTop:2}}>{L.mn}</div>}
      </div>
    </div>)}
  </div>,document.body);
}

function Cal({year,month,members,activeId,onToggle,onDragSelect,compact,th,t,holSet,w7,approvalMode,team,setCommentDay=null,holInfo=null,lang="en"}) {
  const[card,setCard]=useState(null);const cardTimer=useRef(null);
  const openCard=(key,el)=>{if(!holInfo)return;const info=holInfo(key);if(!info.length)return;setCard({key,info,rect:el.getBoundingClientRect()});};
  const closeCard=useCallback(()=>{clearTimeout(cardTimer.current);setCard(null);},[]);
  // Keyboard: one tab stop per month (today, else the 1st); arrows move, Enter/Space books, Shift+arrows extend
  const[fd,setFd]=useState(()=>year===CY&&month===CM?CD:1);
  const focusDay=n=>{setFd(n);requestAnimationFrame(()=>{const g=gridRef.current;const el=g&&g.querySelector('[data-day="'+n+'"]');if(el)el.focus();});};
  const onCellKey=(e,day,isHolDay)=>{
    const nDays=dim(year,month);const rtl=textLang()==="ar";
    const step={ArrowRight:rtl?-1:1,ArrowLeft:rtl?1:-1,ArrowDown:7,ArrowUp:-7}[e.key];
    if(step!==undefined||e.key==="Home"||e.key==="End"){
      e.preventDefault();
      const to=e.key==="Home"?1:e.key==="End"?nDays:Math.min(nDays,Math.max(1,day+step));
      if(e.shiftKey&&activeId&&step!==undefined&&!(isWe(year,month,to)&&!w7)){
        const has=d=>((members.find(m=>m.id===activeId)||{}).days||[]).includes(dk(year,month,d));
        if(has(to)!==has(day))onToggle(year,month,to);
      }
      focusDay(to);return;
    }
    if(e.key==="Enter"||e.key===" "){
      e.preventDefault();
      if(activeId){if(!(isWe(year,month,day)&&!w7))onToggle(year,month,day);}
      else if(isHolDay&&holInfo){const info=holInfo(dk(year,month,day));if(info.length)setCard({key:dk(year,month,day),info,rect:e.currentTarget.getBoundingClientRect(),pinned:true});}
      return;
    }
    if(e.key==="Escape")closeCard();
  };
  const days=dim(year,month);const first=fdm(year,month);const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=days;d++)cells.push(d);
  const am=members.find(m=>m.id===activeId);const ai=am?members.indexOf(am):-1;const ac=ai>=0?MC[ai%MC.length]:null;
  var _tripSet=new Set();if(team&&team.trips)(team.trips).forEach(function(tr){if(!tr.start||!tr.end)return;var d1=new Date(tr.start+"T12:00:00"),d2=new Date(tr.end+"T12:00:00");for(var _d=new Date(d1);_d<=d2;_d.setDate(_d.getDate()+1)){_tripSet.add(dk(_d.getFullYear(),_d.getMonth(),_d.getDate()));}});
  const dragRef=useRef(null);
  const dayLabels=[t.mo,t.tu,t.we2,t.th,t.fr,t.sa,t.su];

  const[popDay,setPopDay]=useState(null);const handleMouseDown=(day)=>{if(!activeId||(isWe(year,month,day)&&!w7))return;setPopDay(day);setTimeout(function(){setPopDay(null);},200);dragRef.current={start:day,days:new Set([day]),adding:!(am&&am.days||[]).includes(dk(year,month,day))};onToggle(year,month,day);};
  const handleMouseEnter=(day)=>{if(!dragRef.current||!activeId||(isWe(year,month,day)&&!w7))return;const{start,days:dragDays,adding}=dragRef.current;const lo=Math.min(start,day),hi=Math.max(start,day);const newDays=new Set();for(let d=lo;d<=hi;d++){if(!isWe(year,month,d)||w7)newDays.add(d);}const toProcess=[...newDays].filter(d=>!dragDays.has(d));toProcess.forEach(d=>{const key=dk(year,month,d);const hasDayAlready=(am&&am.days||[]).includes(key);if((adding&&!hasDayAlready)||(!adding&&hasDayAlready))onToggle(year,month,d);});dragRef.current.days=newDays;};
  const handleMouseUp=()=>{dragRef.current=null;};

  useEffect(()=>{const up=()=>{dragRef.current=null;};window.addEventListener("mouseup",up);return()=>window.removeEventListener("mouseup",up);},[]);
  // Touch: drag across days with a finger. Only while a member is selected (otherwise the page scrolls as usual).
  // Native listeners with passive:false so the drag doesn't scroll the page or fire emulated mouse clicks.
  const gridRef=useRef(null);const touchRef=useRef({});
  touchRef.current={down:handleMouseDown,enter:handleMouseEnter,up:handleMouseUp,active:!!activeId};
  useEffect(()=>{
    const el=gridRef.current;if(!el)return;
    const dayAt=(x,y)=>{const c=document.elementFromPoint(x,y);const d=c&&c.closest&&c.closest("[data-day]");return d&&el.contains(d)?Number(d.getAttribute("data-day")):null;};
    let last=null;
    const start=e=>{if(!touchRef.current.active||e.touches.length!==1)return;const t0=e.touches[0];const d=dayAt(t0.clientX,t0.clientY);if(d==null)return;e.preventDefault();last=d;touchRef.current.down(d);};
    const move=e=>{if(last==null)return;e.preventDefault();const t0=e.touches[0];const d=dayAt(t0.clientX,t0.clientY);if(d!=null&&d!==last){last=d;touchRef.current.enter(d);}};
    const end=()=>{if(last==null)return;last=null;touchRef.current.up();};
    el.addEventListener("touchstart",start,{passive:false});el.addEventListener("touchmove",move,{passive:false});el.addEventListener("touchend",end);el.addEventListener("touchcancel",end);
    return()=>{el.removeEventListener("touchstart",start);el.removeEventListener("touchmove",move);el.removeEventListener("touchend",end);el.removeEventListener("touchcancel",end);};
  },[]);

  return <div className="tvp-month" data-ym={year+"-"+month} style={{background:th.gbg,borderRadius:G.rSm,border:`1px solid ${th.gbd}`,overflow:"hidden",animation:"popIn .3s ease-out",boxShadow:th.sd,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
    <div style={{padding:compact?"8px 12px":"12px 16px",borderBottom:`1px solid ${th.bl}`,background:month>=5&&month<=7?"rgba(245,158,11,.035)":month===11||month<=1?"rgba(99,102,241,.035)":month>=2&&month<=4?"rgba(16,185,129,.03)":"rgba(249,115,22,.025)",display:"flex",justifyContent:"space-between"}}>
      <span style={{fontSize:compact?13:15,fontWeight:650,color:th.tx,fontFamily:F}}>{t.M[month]}</span>
    </div>
    <div style={{padding:compact?"6px":"8px 10px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:3}}>
        {dayLabels.map(d=> <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:600,color:th.t3,padding:"3px 0",fontFamily:F,textTransform:"uppercase",letterSpacing:.5}}>{d}</div>)}
      </div>
      <div ref={gridRef} role="group" aria-label={t.M[month]+" "+year} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,touchAction:activeId?"none":"auto"}} onMouseLeave={handleMouseUp}>
        {cells.map((day,i)=>{
          if(!day) return <div key={`e${i}`}/>;
          const we=isWe(year,month,day);const key=dk(year,month,day);
          const mh=members.filter(m=>(m.days||[]).includes(key));const isA=(am&&am.days||[]).includes(key);const isUnapproved=approvalMode&&am&&!am.approved&&am.id!==(typeof team!=="undefined"?team.approver:null);
          const isTd=year===CY&&month===CM&&day===CD;
          const past=new Date(year,month,day)<new Date(CY,CM,CD);
          const isHol=(holSet&&holSet.has(key));

          // Team overview colors + overlap visibility
          var vacBg = "transparent", vacColor = th.tx, vacWeight = 400, vacBorder = "2px solid transparent", vacShadow = "none", showCount = 0;
          var others = mh.filter(function(x){return !am || x.id!==am.id;});
          if(isA && ac) {
            // Selected member's day — solid fill (half day: half filled)
            vacBg = (am.half||[]).includes(key) ? "linear-gradient(135deg," + ac.d + " 50%," + ac.d + "45 50%)" : ac.d; vacColor = "#fff"; vacWeight = 800; vacBorder = "2px solid " + ac.d; vacShadow = "0 2px 8px " + ac.d + "40";
            // If others also have this day, add a dot indicator
            if(others.length>0) { showCount = others.length + 1; }
          } else if(am && !isA && others.length > 0) {
            // A member is selected but this isn't their day — show others faintly
            if(others.length === 1) {
              var mcF = MC[members.indexOf(others[0])%MC.length];
              vacBg = mcF.d + "25"; vacColor = mcF.d; vacWeight = 600;
            } else if(others.length === 2) {
              var mcF1 = MC[members.indexOf(others[0])%MC.length];
              var mcF2 = MC[members.indexOf(others[1])%MC.length];
              vacBg = "linear-gradient(135deg," + mcF1.d + "25 50%," + mcF2.d + "25 50%)"; vacColor = th.t3; vacWeight = 600;
            } else {
              vacBg = "rgba(239,68,68,0.15)"; vacColor = "#EF4444"; vacWeight = 600; showCount = others.length;
            }
          } else if(!am && mh.length === 1) {
            // No member selected, 1 person — solid color
            var mc1 = MC[members.indexOf(mh[0])%MC.length];
            vacBg = (mh[0].half||[]).includes(key) ? "linear-gradient(135deg," + mc1.d + " 50%," + mc1.d + "45 50%)" : mc1.d; vacColor = "#fff"; vacWeight = 800; vacShadow = "0 2px 6px " + mc1.d + "35";
          } else if(!am && mh.length === 2) {
            var mcA = MC[members.indexOf(mh[0])%MC.length];
            var mcB = MC[members.indexOf(mh[1])%MC.length];
            vacBg = "linear-gradient(135deg," + mcA.d + " 50%," + mcB.d + " 50%)"; vacColor = "#fff"; vacWeight = 800; showCount = 2;
          } else if(!am && mh.length === 3) {
            var mc3a = MC[members.indexOf(mh[0])%MC.length];
            var mc3b = MC[members.indexOf(mh[1])%MC.length];
            var mc3c = MC[members.indexOf(mh[2])%MC.length];
            vacBg = "linear-gradient(135deg," + mc3a.d + " 33%," + mc3b.d + " 33% 66%," + mc3c.d + " 66%)"; vacColor = "#fff"; vacWeight = 800; showCount = 3;
          } else if(!am && mh.length >= 4) {
            vacBg = "#EF4444"; vacColor = "#fff"; vacWeight = 800; vacShadow = "0 2px 8px rgba(239,68,68,0.3)"; showCount = mh.length;
          }

          if(isHol && !isA && mh.length===0) { vacBg = th.hc; vacColor = th.ht; vacWeight = 700; }
          if(we && mh.length===0 && !isA && !w7) { vacBg = th.sh; vacColor = th.t3; }
          if(mh.length===0 && !isHol && !we && !isA) { vacBg = "transparent"; vacColor = th.tx; }
          if(mh.length===0 && !isHol && we && w7 && !isA) { vacBg = "transparent"; vacColor = th.tx; }
          if(isTd) vacBorder = "2px solid " + th.ac;
          var pendingStripe = "";
          if(isA && isUnapproved) { pendingStripe = "repeating-linear-gradient(45deg,transparent,transparent 3px," + ac.d + "20 3px," + ac.d + "20 6px)"; }
          var hasUnapprovedMember = mh.some(function(mx){return approvalMode && !mx.approved;});
          if(!isA && hasUnapprovedMember && mh.length>0) { pendingStripe = "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(245,158,11,.12) 3px,rgba(245,158,11,.12) 6px)"; }

          const cellLabel=(()=>{let d0="";try{d0=new Date(year,month,day,12).toLocaleDateString(dateLocale(),{weekday:"long",day:"numeric",month:"long"});}catch(e){d0=key;}
            const parts=[d0];
            if(isHol){const inf=holInfo?holInfo(key):[];parts.push(inf.length?inf.map(g=>g.cc+" "+g.local).join(", "):holName(key));}
            if(mh.length)parts.push(mh.map(m=>m.name+((m.half||[]).includes(key)?" (½)":"")).join(", "));
            return parts.join(" · ");})();
          return <div key={day} data-day={day} role="button" tabIndex={day===fd?0:-1} aria-pressed={activeId?isA:undefined} aria-disabled={activeId&&we&&!w7?true:undefined}
            onKeyDown={e=>onCellKey(e,day,isHol)}
            onFocus={function(e){if(fd!==day)setFd(day);if(isHol&&holInfo&&!activeId){var el=e.currentTarget;openCard(key,el);}}}
            onBlur={function(){if(isHol&&holInfo)setCard(function(c){return c&&c.key===key&&!c.pinned?null:c;});}}
            onMouseDown={e=>{e.preventDefault();handleMouseDown(day);}} onContextMenu={function(e){e.preventDefault();if(typeof setCommentDay==="function")setCommentDay(dk(year,month,day));}}
            onMouseEnter={function(e){handleMouseEnter(day);if(activeId)e.currentTarget.style.transform="scale(1.1)";if(isHol&&holInfo){var el=e.currentTarget;clearTimeout(cardTimer.current);cardTimer.current=setTimeout(function(){openCard(key,el);},180);}}}
            onMouseLeave={function(e){e.currentTarget.style.transform="";if(isHol&&holInfo){clearTimeout(cardTimer.current);cardTimer.current=setTimeout(function(){setCard(function(c){return c&&c.key===key&&!c.pinned?null:c;});},120);}}}
            onClick={function(e){if(!isHol||!holInfo||activeId)return;var el=e.currentTarget;setCard(function(c){if(c&&c.key===key)return null;var info=holInfo(key);return info.length?{key,info,rect:el.getBoundingClientRect(),pinned:true}:null;});}}
            aria-label={cellLabel}
            title={isHol&&holInfo?undefined:isHol?holNameAny(key):mh.length>0?mh.map(function(m){return m.name}).join(", "):""}
            style={{position:"relative",aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:8,cursor:(we&&!w7)||!activeId?"default":"pointer",transition:"transform .12s",transform:day===popDay?"scale(1.15)":"",
              background:vacBg, backgroundImage:pendingStripe||"none", border:vacBorder, transition:"background .1s",
              opacity:past&&mh.length===0&&!isA?0.4:1,minHeight:compact?28:34,userSelect:"none",
              boxShadow:vacShadow+(th.bg==="#0B0F1A"&&(isA||mh.length>0)?",0 0 8px "+(isA&&ac?ac.d+"35":mh.length>0?MC[members.indexOf(mh[0])%MC.length].d+"25":""):"")}}>
            <span style={{fontSize:compact?11:12,fontWeight:isTd?700:vacWeight,color:isTd&&mh.length===0?th.ac:vacColor,fontFamily:F,lineHeight:1}}>{day}</span>
            {showCount>0&&<span style={{position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:"#fff",color:"#EF4444",fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #EF4444"}}>{showCount}</span>}
            {team&&team.comments&&team.comments[key]&&setCommentDay&&<span onClick={function(e){e.stopPropagation();setCommentDay(key);}} style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50)",width:4,height:4,borderRadius:"50%",background:"#8B5CF6"}}/>}
            {(function(){if(!_tripSet.has(key))return null;var _travelers=[];if(team&&team.trips)(team.trips).forEach(function(tr){if(!tr.start||!tr.end||!tr.member)return;var d1=new Date(tr.start+"T12:00:00"),d2=new Date(tr.end+"T12:00:00"),cur=new Date(year,month,day);if(cur>=d1&&cur<=d2){var mi=members.findIndex(function(m2){return m2.id===tr.member;});if(mi>=0)_travelers.push(MC[mi%MC.length]);}});if(!_travelers.length)return null;var tc=_travelers[0].d;return <svg width="10" height="10" viewBox="0 0 24 24" style={{position:"absolute",bottom:0,right:0,filter:"drop-shadow(0 0 1px #fff)"}}><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill={tc}/></svg>;})()} 
          </div>;
        })}
      </div>
    </div>
    {card&&<HolidayCard info={card.info} dateKey={card.key} rect={card.rect} lang={lang} th={th} onClose={closeCard} onHover={function(on){clearTimeout(cardTimer.current);if(!on)cardTimer.current=setTimeout(function(){setCard(function(c){return c&&!c.pinned?null:c;});},150);}}/>}
  </div>;
}

// ─── Heatmap View ────────────────────────────────────────────────
function HeatmapView({team,th,t,holSet}) {
  const yr=team.year||CY;
  const allMonths=Array.from({length:12},(_,i)=>i);
  const counts={};
  team.members.forEach(m=>(m.days||[]).forEach(d=>{counts[d]=(counts[d]||0)+1;}));
  const max=Math.max(1,...Object.values(counts));

  // Per-member holiday sets for "effective absence" (on holiday = not working)
  const memberHolDays={};
  team.members.forEach(m=>{if(m.country){const hols=computeHolidays(m.country,yr);memberHolDays[m.id]=new Set(hols);}});

  return <div>
    <div style={{textAlign:"center",marginBottom:12}}><span style={{fontSize:18,fontWeight:700,color:th.tx}}>{t.heatmap} — {yr}</span></div>
    {/* Legend */}
    <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:14,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:th.t2}}><div style={{width:14,height:14,borderRadius:3,background:"rgba(220,38,38,.35)"}}/> Vacation (low)</div>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:th.t2}}><div style={{width:14,height:14,borderRadius:3,background:"rgba(220,38,38,.85)"}}/> Vacation (high)</div>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:th.t2}}><div style={{width:14,height:14,borderRadius:3,background:"#93C5FD"}}/> Holiday only</div>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:th.t2}}><div style={{width:14,height:14,borderRadius:3,background:"#C084FC"}}/> Holiday + Vacation</div>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:th.t2}}><div style={{width:14,height:14,borderRadius:3,background:th.sh}}/> Weekend</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
      {allMonths.map(month=>{
        const days=dim(yr,month);const first=fdm(yr,month);const cells=[];
        for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=days;d++)cells.push(d);
        return <div key={month} style={{background:th.gbg,borderRadius:G.rXs,border:`1px solid ${th.gbd}`,padding:"10px 8px",boxShadow:th.sd,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
          <div style={{fontSize:13,fontWeight:650,color:th.tx,marginBottom:6,fontFamily:F,textAlign:"center"}}>{t.M[month]}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
            {cells.map((day,i)=>{
              if(!day) return <div key={`e${i}`}/>;
              const key=dk(yr,month,day);const vacCount=counts[key]||0;const we=isWe(yr,month,day);
              const isHol=holSet&&holSet.has(key);
              const intensity=vacCount/max;

              // Determine colors: holiday-only (blue), vacation-only (red), both (purple), weekend (gray)
              let bg,color,fw=400,title="";
              if(we){
                bg=th.sh;color=th.t3;
              } else if(isHol&&vacCount>0){
                // Both holiday and vacation
                bg="#C084FC";color="#fff";fw=700;
                title=`${holNameAny(key)} + ${vacCount}`;
              } else if(isHol){
                bg="#93C5FD";color="#1E3A5F";fw=600;
                title=holNameAny(key);
              } else if(vacCount>0){
                bg=`rgba(220,38,38,${.15+intensity*.7})`;
                color=intensity>.5?"#fff":"#991B1B";fw=700;
                title=`${vacCount} ${t.mbs} out`;
              } else {
                bg="transparent";color=th.tx;
              }

              return <div key={day} title={title}
                style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:3,background:bg,fontSize:10,fontWeight:fw,color,fontFamily:F}}>{day}</div>;
            })}
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ─── Timeline/Gantt View ─────────────────────────────────────────
function TimelineView({team,th,t}) {
  const yr=team.year||CY;
  const totalDays=(new Date(yr,11,31)-new Date(yr,0,1))/(86400000)+1;
  const dayOfYear=(m,d)=>Math.floor((new Date(yr,m,d)-new Date(yr,0,1))/86400000);

  // Group consecutive days into ranges
  const getRanges=(days)=>{
    const sorted=[...days].sort();const ranges=[];let start=null,prev=null;
    sorted.forEach(d=>{const p=pk(d);const doy=dayOfYear(p.m,p.d);
      if(prev===null){start=doy;prev=doy;}else if(doy===prev+1){prev=doy;}else{ranges.push({s:start,e:prev});start=doy;prev=doy;}
    });if(start!==null)ranges.push({s:start,e:prev});return ranges;
  };

  const monthStarts=Array.from({length:12},(_,i)=>({m:i,pos:dayOfYear(i,1)/totalDays*100}));

  return <div>
    <div style={{textAlign:"center",marginBottom:16}}><span style={{fontSize:18,fontWeight:700,color:th.tx}}>{t.timeline} — {yr}</span></div>
    {/* Month labels */}
    <div style={{position:"relative",height:24,marginBottom:8,marginLeft:110,marginRight:30}}>
      {monthStarts.map(({m,pos},idx)=>{var next=idx<11?monthStarts[idx+1].pos:100;var center=(pos+next)/2;return <span key={m} style={{position:"absolute",left:center+"%",transform:"translateX(-50%)",fontSize:10,fontWeight:600,color:th.t3,fontFamily:F}}>{t.M[m].slice(0,3)}</span>;})}
    </div>
    {/* Member bars */}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {team.members.map((m,i)=>{
        const c=MC[i%MC.length];const ranges=getRanges(m.days||[]);
        return <div key={m.id} style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:100,flexShrink:0,fontSize:13,fontWeight:600,color:th.tx,fontFamily:F,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
          <div style={{flex:1,position:"relative",height:24,background:th.sh,borderRadius:4,overflow:"hidden"}}>
            {/* Month grid lines */}
            {monthStarts.map(({m:mo,pos})=> <div key={mo} style={{position:"absolute",left:`${pos}%`,top:0,bottom:0,width:1,background:th.bd}}/>)}
            {ranges.map((r,ri)=>{
              const left=(r.s/totalDays)*100;const width=((r.e-r.s+1)/totalDays)*100;
              return <div key={ri} style={{position:"absolute",left:`${left}%`,width:`${Math.max(width,.5)}%`,top:2,bottom:2,background:c.d,borderRadius:3,opacity:.85}}/>;
            })}
          </div>
          <span style={{fontSize:11,color:th.t3,fontFamily:FM,minWidth:30,textAlign:"right"}}>{(m.days||[]).length}d</span>
        </div>;
      })}
    </div>
  </div>;
}

// ─── Coverage Dashboard ──────────────────────────────────────────
function CoverageView({team,th,t}) {
  const yr=team.year||CY;
  const groups=([...new Set(team.members.map(m=>m.group).filter(Boolean))] as string[]).sort();
  const[grp,setGrp]=useState("");
  const mem=grp?team.members.filter(m=>m.group===grp):team.members;
  const total=mem.length;
  if(!team.members.length) return <div style={{textAlign:"center",padding:40,color:th.t3}}>{t.ndy}</div>;
  // Each member's own public holidays (national + regional) and half days
  const hol=mem.map(m=>new Set(m.country?getAllHolidays(m,yr):[]));
  const days=mem.map(m=>new Set(m.days||[]));const half=mem.map(m=>new Set(m.half||[]));
  // Coverage of a working day = share of people at work: not on vacation (half day = half away) and not on their own public holiday
  const dayCov=k=>{let present=0;mem.forEach((m,i)=>{if(hol[i].has(k))return;if(days[i].has(k))present+=half[i].has(k)?0.5:0;else present+=1;});return total?present/total:1;};
  const weeks=[];
  let d=new Date(yr,0,1);
  while(d.getDay()!==1)d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
  while(d.getFullYear()===yr){
    const keys=[];
    for(let i=0;i<(team.w7?7:5);i++){const cd=new Date(d.getFullYear(),d.getMonth(),d.getDate()+i);if(cd.getFullYear()===yr)keys.push(dk(cd.getFullYear(),cd.getMonth(),cd.getDate()));}
    const covs=keys.map(dayCov);
    const coverage=Math.round((covs.reduce((a2,b2)=>a2+b2,0)/(covs.length||1))*100);
    const low=Math.round(Math.min(...covs)*100);
    const weekNum=Math.ceil((d-new Date(yr,0,1))/(7*86400000))+1;
    weeks.push({num:weekNum,coverage,low,month:d.getMonth(),label:`W${weekNum}`,from:keys[0]});
    d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+7);
  }
  return <div>
    <div style={{textAlign:"center",marginBottom:10}}><span style={{fontSize:18,fontWeight:700,color:th.tx}}>{t.coverage} — {yr}</span></div>
    <div style={{textAlign:"center",fontSize:12,color:th.t3,marginBottom:12}}>{X("covHint")}</div>
    {groups.length>0&&<div role="group" aria-label={X("group")} style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
      {["",...groups].map(g=><button key={g||"all"} onClick={()=>setGrp(g)} aria-pressed={grp===g} style={{padding:"4px 12px",borderRadius:999,border:"1px solid "+(grp===g?th.ac:th.gbd),background:grp===g?th.al:th.gbg,color:grp===g?th.ac:th.t2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>{g||X("everyone")}</button>)}
    </div>}
    <div style={{display:"flex",gap:2,alignItems:"end",height:160,padding:"0 4px",marginBottom:12}}>
      {weeks.map((w,i)=>{
        const h=Math.max(4,(w.coverage/100)*140);
        const color=w.coverage>=80?"#10B981":w.coverage>=60?th.wm:"#DC2626";
        return <div key={i} title={`${w.label} (${w.from}): ${w.coverage}% on average, lowest day ${w.low}%`}
          style={{flex:1,minWidth:0,height:h,background:color,borderRadius:"3px 3px 0 0",opacity:.8,transition:"height .3s"}}/>;
      })}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",padding:"0 4px"}}>
      {Array.from({length:12},(_,i)=> <span key={i} style={{fontSize:10,color:th.t3,fontWeight:600}}>{t.M[i].slice(0,3)}</span>)}
    </div>
    <div style={{display:"flex",gap:12,marginTop:20,flexWrap:"wrap",justifyContent:"center"}}>
      {[
        {label:t.avgCov,value:`${Math.round(weeks.reduce((s2,w)=>s2+w.coverage,0)/(weeks.length||1))}%`,color:"#10B981"},
        {label:t.lowWeek,value:`${weeks.length?Math.min(...weeks.map(w=>w.coverage)):100}%`,color:"#DC2626"},
        {label:t.weeksLow,value:weeks.filter(w=>w.coverage<70).length,color:th.wm},
      ].map((s2,i)=> <div key={i} style={{background:th.gbg,border:`1px solid ${th.gbd}`,borderRadius:G.rXs,padding:"12px 20px",textAlign:"center",backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
        <div style={{fontSize:24,fontWeight:800,color:s2.color,fontFamily:F}}>{s2.value}</div>
        <div style={{fontSize:11,color:th.t3,fontWeight:600,marginTop:2}}>{s2.label}</div>
      </div>)}
    </div>
  </div>;
}

// ─── Conflict Alerts ─────────────────────────────────────────────
function ConflictAlerts({team,threshold,th,t}) {
  const allDays={};
  team.members.forEach(m=>(m.days||[]).forEach(d=>{if(!allDays[d])allDays[d]=[];allDays[d].push(m.name);}));
  const conflicts=Object.entries(allDays).filter(([,v])=>v.length>=threshold).sort(([a],[b])=>a.localeCompare(b));
  // Groups: a day where half or more of a group (and at least 2 people) is away
  const gm:Record<string,any[]>={};team.members.forEach(m=>{if(m.group)(gm[m.group]=gm[m.group]||[]).push(m);});
  const gAlerts=[];
  Object.entries(gm).forEach(([g,ms])=>{if(ms.length<2)return;const cnt:Record<string,string[]>={};ms.forEach(m=>(m.days||[]).forEach(d=>{(cnt[d]=cnt[d]||[]).push(m.name);}));Object.entries(cnt).forEach(([d,names])=>{if(names.length>=2&&names.length*2>=ms.length)gAlerts.push({g,d,names,of:ms.length});});});
  gAlerts.sort((x,y)=>x.d.localeCompare(y.d));
  if(!conflicts.length&&!gAlerts.length) return null;
  if(!conflicts.length) return <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.3)",borderRadius:8,padding:"10px 14px",marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:"#B45309",marginBottom:6}}>⚠️ {gAlerts.length} group alert{gAlerts.length>1?"s":""}</div>
    <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:100,overflowY:"auto"}}>
      {gAlerts.slice(0,5).map((a2,i)=><div key={i} style={{fontSize:11,color:"#92400E"}}><strong>{a2.d}</strong> · {a2.g}: {a2.names.length} of {a2.of} away — {a2.names.join(", ")}</div>)}
      {gAlerts.length>5&&<div style={{fontSize:11,color:"#92400E",fontStyle:"italic"}}>+{gAlerts.length-5} more</div>}
    </div>
  </div>;

  return <div style={{background:th.hc,border:`1px solid ${th.ht}30`,borderRadius:8,padding:"10px 14px",marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:th.ht,marginBottom:6}}>⚠️ {conflicts.length} coverage alert{conflicts.length>1?"s":""}</div>
    <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:100,overflowY:"auto"}}>
      {conflicts.slice(0,5).map(([d,names])=> <div key={d} style={{fontSize:11,color:th.ht}}>
        <strong>{d}</strong>: {names.length} out — {names.join(", ")}
      </div>)}
      {conflicts.length>5&&<div style={{fontSize:11,color:th.ht,fontStyle:"italic"}}>+{conflicts.length-5} more</div>}
      {gAlerts.slice(0,3).map((a2,i)=><div key={"g"+i} style={{fontSize:11,color:"#92400E"}}><strong>{a2.d}</strong> · {a2.g}: {a2.names.length} of {a2.of} away</div>)}
    </div>
  </div>;
}

function MRow({member:m,index:i,isActive,onClick,onDelete,onStartRename,isEditing,onFinishRename,onCountryChange,onPtoChange,onRegionChange,onGroupChange=null,yr,onExportICS,onOptimize,th,t,locked,approvalMode,isApprover,onSetApprover,allMembers,onToggleMemberApproval,onApproveAllMembers,dragIdx,onDragStart,onDragOver,onDrop,onDragEnd,isDragOver,isDragging}){
  const c=MC[i%MC.length];const[en,setEn]=useState(m.name);const[h,setH]=useState(false);const dc=usedOf(m);const allow=m.pto?m.pto+(m.carry||0):0;
  const co=m.country?EU_C.find(x=>x.c===m.country):null;
  useEffect(()=>{setEn(m.name);},[m.name]);

  if(isEditing) return <div style={{display:"flex",flexDirection:"column",gap:6,padding:"8px 10px",background:c.b,borderRadius:8,border:`1.5px solid ${c.d}`}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:c.d,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{(en||"?")[0].toUpperCase()}</div>
      <input autoFocus value={en} onChange={e=>setEn(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&en.trim())onFinishRename(en.trim());if(e.key==="Escape")onFinishRename(m.name);}} onBlur={()=>en.trim()?onFinishRename(en.trim()):onFinishRename(m.name)} maxLength={30} style={{flex:1,border:"none",background:"transparent",fontSize:13,fontWeight:600,fontFamily:F,color:c.t,outline:"none",padding:"3px 0"}}/>
    </div>
    <CountrySelect value={m.country} onChange={onCountryChange} th={th} t={t}/>
    {onGroupChange&&<input defaultValue={m.group||""} list="tvp-groups" maxLength={24} placeholder={X("groupPh")} aria-label={X("group")} onBlur={e=>{const v=e.target.value.trim();if(v!==(m.group||""))onGroupChange(v);}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}} style={{padding:"6px 8px",borderRadius:6,border:"1px solid "+th.gbd,background:th.sf,color:th.tx,fontSize:12,fontFamily:F}}/>}
  </div>;

  return <div draggable={!locked} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onFocus={()=>setH(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setH(false);}} style={{padding:"6px 10px",opacity:isDragging?0.4:1,borderTop:isDragOver?"2px solid "+th.ac:"none",background:isActive?c.b:h?th.sh:"transparent",borderRadius:8,cursor:"pointer",border:isActive?`1.5px solid ${c.d}40`:"1.5px solid transparent",boxShadow:isActive?th.gwAc:"none",transition:"all .15s"}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
    <div style={{width:28,height:28,borderRadius:"50%",background:c.d,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{m.name[0].toUpperCase()}</div>
    <div role="button" tabIndex={0} aria-pressed={isActive} aria-label={m.name+" · "+(dc===0?t.nd:fmtDays(dc)+" "+(dc!==1?t.dys:t.dy))} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onClick();}}} style={{flex:1,minWidth:0,borderRadius:6}}>
      <div style={{fontSize:13,fontWeight:600,color:isActive?c.t:th.tx,fontFamily:F,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"flex",alignItems:"center",gap:4}}>{m.name}{isApprover&&<span title={t.approverLabel||"Approver"} style={{fontSize:11}}>👑</span>}</div>
      <div style={{fontSize:11,color:th.t3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{co?co.f+" ":""}{m.group?<span style={{fontWeight:600}}>{m.group} · </span>:null}{dc===0?t.nd:`${fmtDays(dc)} ${dc!==1?t.dys:t.dy}`}{m.pto?<span style={{color:th.ac,fontWeight:600}}>{" / "+m.pto}{m.carry?<span title={X("carried")} style={{color:"#047857"}}>{" +"+m.carry}</span>:null}</span>:""}{approvalMode&&!isApprover?(m.approved?<span style={{color:"#10B981",fontWeight:700,fontSize:9}}>{" ✓"}</span>:<span style={{color:"#F59E0B",fontWeight:700,fontSize:9}}>{" ⏳"}</span>):""}</div>
      {m.pto&&<div style={{height:3,borderRadius:2,background:th.sh,marginTop:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:dc>allow?"#EF4444":dc>allow*0.8?"#F59E0B":c.d,width:Math.min(100,Math.round(dc/allow*100))+"%",transition:"width .3s"}}/></div>}
    {(function(){var yr2=typeof yr!=="undefined"?yr:CY;var mos=Array.from({length:12},function(_,mo){return(m.days||[]).filter(function(d){return d.startsWith(yr2+"-"+String(mo+1).padStart(2,"0"));}).length;});var mx=Math.max.apply(null,mos)||1;if(!(m.days||[]).length)return null;return <svg width="60" height="14" viewBox="0 0 60 14" style={{marginTop:3,opacity:.6}}>{mos.map(function(v,i){var h=Math.max(1,v/mx*12);return <rect key={i} x={i*5} y={14-h} width="4" height={h} rx="1" fill={c.d} opacity={v>0?.8:.15}/>;})}</svg>;})()}{(function(){var ds=(m.days||[]).filter(function(d){return d>dk(CY,CM,CD);}).sort();if(!ds.length)return null;var nd=ds[0].split("-");var diff=Math.ceil((new Date(+nd[0],+nd[1]-1,+nd[2])-new Date(CY,CM,CD))/864e5);if(diff<=0||diff>365)return null;return <div style={{fontSize:9,color:"#8B5CF6",fontWeight:600,marginTop:2,display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:11}}>🏖️</span>{diff===1?(t.tomorrow||"Tomorrow!"):diff+" "+(t.daysUntil||"days until vacation")}</div>;})()}
    </div>
    {(h||isActive)&&!locked&&<div style={{display:"flex",gap:1,flexShrink:0}}>
      {m.country&&<button onClick={e=>{e.stopPropagation();onOptimize();}} title={t.bestDays||"Suggest best days"} aria-label={(t.bestDays||"Suggest best days")+" "+m.name} style={{background:"none",border:"none",cursor:"pointer",padding:6,display:"flex"}}><Ic n="sun" s={13} c="#F59E0B"/></button>}
      <button onClick={e=>{e.stopPropagation();onExportICS();}} title={t.export} aria-label={"ICS · "+m.name} style={{background:"none",border:"none",cursor:"pointer",padding:6,display:"flex"}}><Ic n="download" s={13} c={th.t3}/></button>
      <button onClick={e=>{e.stopPropagation();onStartRename();}} aria-label={X("renameN",{n:m.name})} title={X("renameN",{n:m.name})} style={{background:"none",border:"none",cursor:"pointer",padding:6,display:"flex"}}><Ic n="edit" s={13} c={th.t3}/></button>
      <button onClick={e=>{e.stopPropagation();onDelete();}} aria-label={X("removeN",{n:m.name})} title={X("removeN",{n:m.name})} style={{background:"none",border:"none",cursor:"pointer",padding:6,display:"flex"}}><Ic n="trash" s={13} c={th.t3}/></button>
    </div>}
    </div>
    {isActive&&m.region&&<div style={{fontSize:9,color:th.ac,fontWeight:600,marginTop:2,paddingLeft:36}}>{(REGIONS[m.country]||[]).reduce(function(a,r){return r.id===m.region?r.n:a;},"")} region</div>}
    {isActive&&!isEditing&&<div style={{marginTop:6,paddingTop:6,borderTop:"1px solid "+th.gbd,display:"flex",flexDirection:"column",gap:5}}>
      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
        <span style={{color:th.t3,fontWeight:600,width:42,flexShrink:0}}>{t.pto||"PTO"}</span>
        <input type="number" min="0" max="60" placeholder="—" value={m.pto||""} onClick={function(e){e.stopPropagation();}} onChange={function(e){e.stopPropagation();onPtoChange(parseInt(e.target.value)||null);}} style={{width:44,padding:"2px 4px",border:"1px solid "+th.gbd,borderRadius:4,background:th.sf,color:th.tx,fontSize:11,fontFamily:FM,textAlign:"center"}}/>
        <span style={{color:th.t3,fontSize:10}}>{t.dys}</span>
        {m.pto&&<span style={{marginLeft:"auto",fontSize:10,color:dc>allow?"#EF4444":th.ac,fontWeight:700}}>{fmtDays(dc)}/{allow}</span>}
      </div>
      {m.country&&REGIONS[m.country]&&<div style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
        <span style={{color:th.t3,fontWeight:600,width:42,flexShrink:0}}>{t.region||"Region"}</span>
        <select value={m.region||""} onClick={function(e){e.stopPropagation();}} onChange={function(e){e.stopPropagation();onRegionChange(e.target.value||null);}} style={{flex:1,padding:"2px 4px",border:"1px solid "+th.gbd,borderRadius:4,background:th.sf,color:th.tx,fontSize:10,fontFamily:F,minWidth:0}}>
          <option value="">{defaultRegionName(m.country)?V("regDefault",{r:defaultRegionName(m.country)}):(t.natOnly||"National only")}</option>
          {REGIONS[m.country].map(function(r){return <option key={r.id} value={r.id}>{r.n}</option>;})}
        </select>
      </div>}
      {yr&&m.country&&<div style={{fontSize:10,color:th.t3,display:"flex",justifyContent:"space-between"}}>
        <span>{workingDaysRemaining(m,yr)} {t.workDaysLeft||"work days left"}</span>
        <span>{getAllHolidays(m,yr).length} {t.holCount||"holidays"}</span>
      </div>}
      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,marginTop:2}}>
        <span style={{color:th.t3,fontWeight:600,width:42,flexShrink:0}}>{t.role||"Role"}</span>
        <button onClick={function(e){e.stopPropagation();onSetApprover();}} style={{flex:1,padding:"4px 8px",borderRadius:6,border:isApprover?"1.5px solid #10B981":"1px solid "+th.gbd,background:isApprover?"#ECFDF5":"transparent",color:isApprover?"#059669":th.t3,fontSize:10,fontWeight:isApprover?700:500,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all .2s"}}>{isApprover?"👑 "+(t.approverLabel||"Approver"):(t.setApprover||"Set as Approver")}</button>
      </div>
      {isApprover&&approvalMode&&allMembers&&allMembers.length>1&&<div style={{marginTop:6,paddingTop:6,borderTop:"1px solid "+th.gbd}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:10,fontWeight:700,color:th.t3,textTransform:"uppercase",letterSpacing:.5}}>{t.teamApproval||"Team Approval"}</span>
          <button onClick={function(e){e.stopPropagation();onApproveAllMembers();}} style={{padding:"2px 10px",borderRadius:4,border:"none",background:"#10B981",color:"#fff",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:F}}>{t.approveAll||"Approve All"}</button>
        </div>
        {allMembers.filter(function(mm){return mm.id!==m.id;}).map(function(mm,idx){
          var mc2=MC[allMembers.indexOf(mm)%MC.length];
          var dayCount2=(mm.days||[]).length;
          var isAppr=mm.approved===true;
          return <div key={mm.id} onClick={function(e){e.stopPropagation();}} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 6px",borderRadius:6,marginBottom:2,background:isAppr?"#F0FDF4":"transparent",border:"1px solid "+(isAppr?"#BBF7D0":th.gbd),transition:"all .2s"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:mc2.d,flexShrink:0}}/>
            <span style={{flex:1,fontSize:10,fontWeight:600,color:th.tx,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{mm.name}</span>
            <span style={{fontSize:9,color:th.t3,fontFamily:FM,minWidth:20,textAlign:"right"}}>{dayCount2}d</span>
            <button onClick={function(e){e.stopPropagation();onToggleMemberApproval(mm.id);}} style={{width:32,height:16,borderRadius:8,border:"none",cursor:"pointer",background:isAppr?"#10B981":"#D1D5DB",position:"relative",transition:"background .2s",flexShrink:0}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:isAppr?18:2,transition:"left .2s",boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}/>
            </button>
          </div>;
        })}
      </div>}
    </div>}
  </div>;
}

// ─── Share Modal ──────────────────────────────────────────────────
function ShareModal({teamId,teamName,onClose,th,t}){
  const[cp,setCp]=useState(false);const[tab,setTab]=useState("link");
  const link=`${window.location.origin}${window.location.pathname}#team=${teamId}`;
  const embedCode=getEmbedCode(teamId);
  const feedUrl=`${window.location.origin}/api/ical?team=${teamId}`;
  const webcalUrl=feedUrl.replace(/^https?:/,"webcal:");
  const copy=(text)=>{try{navigator.clipboard.writeText(text);}catch(e){};setCp(true);setTimeout(()=>setCp(false),2500);};

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,padding:28,maxWidth:480,animation:"popIn .25s ease-out",backdropFilter:G.blur,WebkitBackdropFilter:G.blur,width:"100%",boxShadow:th.sl}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{margin:0,fontSize:18,fontWeight:700,color:th.tx}}>{t.sht}</h3>
        <button onClick={onClose} style={{background:th.sh,border:"none",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Ic n="x" s={15} c={th.t2}/></button>
      </div>
      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
        {[{k:"link",i:"link",l:t.cl},{k:"qr",i:"grid",l:"QR"},{k:"ical",i:"calendar",l:t.subscribe},{k:"widget",i:"bar",l:t.widget},{k:"embed",i:"code",l:t.embed}].map(o=> <button key={o.k} onClick={()=>setTab(o.k)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:F,cursor:"pointer",border:o.k===tab?`1.5px solid ${th.ac}`:`1px solid ${th.bd}`,background:o.k===tab?th.al:"transparent",color:o.k===tab?th.ac:th.t2,display:"flex",alignItems:"center",gap:4}}><Ic n={o.i} s={13} c={o.k===tab?th.ac:th.t3}/>{o.l}</button>)}
      </div>
      {tab==="link"&&<Fragment>
        <p style={{margin:"0 0 10px",fontSize:13,color:th.t2}}>{t.shs} {teamName}</p>
        <div style={{background:th.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${th.bd}`,marginBottom:12,wordBreak:"break-all",fontSize:12,color:th.t2,fontFamily:FM,lineHeight:1.5}}>{link}</div>
        <Btn th={th} onClick={()=>copy(link)} icon={cp?"check":"copy"} style={{width:"100%",justifyContent:"center"}}>{cp?t.cp:t.cl}</Btn>
      </Fragment>}
      {tab==="qr"&&<Fragment>
        <p style={{margin:"0 0 12px",fontSize:13,color:th.t2}}>{X("scanJoin",{n:teamName})}</p>
        <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><QRCode data={link} size={180} th={th}/></div>
        <div style={{background:th.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${th.bd}`,textAlign:"center",fontSize:11,color:th.t3,fontFamily:FM}}>{teamId}</div>
      </Fragment>}
      {tab==="ical"&&<Fragment>
        <p style={{margin:"0 0 6px",fontSize:13,color:th.t2,fontWeight:600}}>{X("icalT")}</p>
        <p style={{margin:"0 0 10px",fontSize:12,color:th.t3}}>{X("icalD")}</p>
        <div style={{background:th.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${th.bd}`,marginBottom:12,wordBreak:"break-all",fontSize:11,color:th.t2,fontFamily:FM,lineHeight:1.5}}>{feedUrl}</div>
        <Btn th={th} onClick={()=>copy(feedUrl)} icon={cp?"check":"copy"} style={{width:"100%",justifyContent:"center",marginBottom:8}}>{cp?t.cp:t.copySubURL}</Btn>
        <a href={webcalUrl} style={{display:"block",textAlign:"center",fontSize:12,fontWeight:600,color:th.ac,marginBottom:10,textDecoration:"none"}}>{X("calApp")} →</a>
        <div style={{fontSize:11,color:th.t3,lineHeight:1.6}}>
          <div style={{marginBottom:4}}><strong style={{color:th.tx}}>Google Calendar:</strong> Settings → Add calendar → From URL → paste</div>
          <div style={{marginBottom:4}}><strong style={{color:th.tx}}>Outlook:</strong> Add calendar → Subscribe from web → paste</div>
          <div><strong style={{color:th.tx}}>Apple Calendar:</strong> File → New Calendar Subscription → paste</div>
          <div style={{marginTop:6}}>{X("refreshNote")}</div>
        </div>
      </Fragment>}
      {tab==="widget"&&<Fragment>
        <p style={{margin:"0 0 6px",fontSize:13,color:th.t2,fontWeight:600}}>{X("widgetT")}</p>
        <p style={{margin:"0 0 10px",fontSize:12,color:th.t3}}>{X("widgetD")}</p>
        <div style={{background:th.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${th.bd}`,marginBottom:12,wordBreak:"break-all",fontSize:11,color:th.t2,fontFamily:FM,lineHeight:1.5}}>{"<iframe src=\"" + link.replace("#team=","?team=") + "&view=badge\" width=\"320\" height=\"220\" frameborder=\"0\" style=\"border-radius:12px;overflow:hidden\"></iframe>"}</div>
        <Btn th={th} onClick={()=>copy("<iframe src=\"" + link.replace("#team=","?team=") + "&view=badge\" width=\"320\" height=\"220\" frameborder=\"0\" style=\"border-radius:12px;overflow:hidden\"></iframe>")} icon={cp?"check":"copy"} style={{width:"100%",justifyContent:"center"}}>{cp?t.cp:t.copyWidget}</Btn>
      </Fragment>}
      {tab==="embed"&&<Fragment>
        <p style={{margin:"0 0 10px",fontSize:13,color:th.t2}}>{X("embedD")}</p>
        <div style={{background:th.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${th.bd}`,marginBottom:12,wordBreak:"break-all",fontSize:11,color:th.t2,fontFamily:FM,lineHeight:1.5}}>{embedCode}</div>
        <Btn th={th} onClick={()=>copy(embedCode)} icon={cp?"check":"copy"} style={{width:"100%",justifyContent:"center"}}>{cp?t.cp:t.copyEmbed}</Btn>
      </Fragment>}
      <p style={{margin:"12px 0 0",fontSize:11,color:th.t3,textAlign:"center"}}>{X("stored")}</p>
    </div>
  </div>;
}

// ─── Landing Page ────────────────────────────────────────────────
// ─── About Page ──────────────────────────────────────────────────

function FadeIn({children,delay}){var ref=useRef(null);var[vis,setVis]=useState(false);useEffect(function(){if(!ref.current)return;var obs=new IntersectionObserver(function(en){if(en[0].isIntersecting){setVis(true);obs.disconnect();}},{threshold:0.1});obs.observe(ref.current);return function(){obs.disconnect();};},[]);return <div ref={ref} style={{opacity:vis?1:0,transform:vis?"none":"translateY(16px)",transition:"opacity .5s ease "+(delay||0)+"ms,transform .5s ease "+(delay||0)+"ms"}}>{children}</div>;}

function TeamWorldMap({team,th,t}) {
  var countryCount = {};
  (team.members||[]).forEach(function(m){if(m.country)countryCount[m.country]=(countryCount[m.country]||0)+1;});
  var entries = Object.entries(countryCount).sort(function(a,b){return b[1]-a[1];});
  if(entries.length===0)return null;
  var max = entries[0][1];
  return <div style={{marginTop:16,padding:16,background:th.gbg,borderRadius:12,border:"1px solid "+th.gbd}}>
    <div style={{fontSize:12,fontWeight:700,color:th.tx,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Ic n="globe" s={14} c={th.ac}/>{t.teamMap||"Team Map"}</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
      {entries.map(function([cc,cnt]){
        var co=EU_C.find(function(x){return x.c===cc;});
        var pct=Math.round(cnt/max*100);
        return <div key={cc} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,background:th.sf,border:"1px solid "+th.gbd,flex:"1 1 140px",minWidth:120}}>
          <span style={{fontSize:18}}>{co?co.f:"🏳️"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:600,color:th.tx}}>{co?co.n:cc}</div>
            <div style={{height:4,borderRadius:2,background:th.sh,marginTop:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:"#8B5CF6",width:pct+"%",transition:"width .5s"}}/></div>
          </div>
          <span style={{fontSize:14,fontWeight:800,color:"#8B5CF6",fontFamily:FM}}>{cnt}</span>
        </div>;
      })}
    </div>
  </div>;
}

function PTODonut({team,th,t}){var data=[];var tU=0;var tP=0;team.members.forEach(function(m,i){var u=usedOf(m);var p=(m.pto||0)+(m.carry||0);if(p>0){data.push({n:m.name,u:u,p:p,c:MC[i%MC.length].d});tU+=u;tP+=p;}});if(!data.length)return null;var pct=Math.round(tU/tP*100);var R=55,cx=70,cy=70,C=2*Math.PI*R,off=0;return <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap",marginBottom:16,padding:16,background:th.gbg,borderRadius:12,border:"1px solid "+th.gbd}}><svg width="140" height="140" viewBox="0 0 140 140"><circle cx={cx} cy={cy} r={R} fill="none" stroke={th.sh} strokeWidth="14"/>{data.map(function(d,i){var seg=d.u/tP*C;var o=off;off+=seg;return <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={d.c} strokeWidth="14" strokeDasharray={seg+" "+(C-seg)} strokeDashoffset={-o} strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"70px 70px"}}/>;})} <text x={cx} y={cy-5} textAnchor="middle" fill={th.tx} fontSize="20" fontWeight="800" fontFamily={FM}>{pct}%</text><text x={cx} y={cy+10} textAnchor="middle" fill={th.t3} fontSize="8" fontWeight="600">{t.pto||"PTO"}</text></svg><div style={{display:"flex",flexDirection:"column",gap:3}}>{data.map(function(d){return <div key={d.n} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}><span style={{width:8,height:8,borderRadius:2,background:d.c,flexShrink:0}}></span><span style={{color:th.tx,fontWeight:600,minWidth:60}}>{d.n}</span><span style={{color:th.t3,fontFamily:FM}}>{d.u}/{d.p}</span></div>;})}</div></div>;}

function AnalyticsDashboard({team,yr,th,t}) {
  var members = team.members || [];
  if (members.length === 0) return <div className="tvp-fade" style={{textAlign:"center",padding:40,color:th.t3}}>{t.addMembers||"Add members to see analytics"}</div>;

  // Per-member stats
  var memberStats = members.map(function(m,i) {
    var days = (m.days || []).filter(function(d){ return d.startsWith(String(yr)); });
    var hols = getAllHolidays(m, yr);
    var wd = workingDaysRemaining(m, yr);
    return {name:m.name, days:usedOf({days:days,half:m.half}), hols:hols.length, wd:wd, pto:(m.pto||0)+(m.carry||0), color:MC[i%MC.length].d};
  });

  // Monthly distribution
  var monthly = [];
  for (var mo = 0; mo < 12; mo++) {
    var prefix = yr + "-" + String(mo+1).padStart(2,"0");
    var count = 0;
    members.forEach(function(m){ (m.days||[]).forEach(function(d){ if(d.startsWith(prefix)) count++; }); });
    monthly.push(count);
  }
  var maxMo = Math.max.apply(null, monthly) || 1;

  // Overlap analysis
  var allDays = {};
  members.forEach(function(m){ (m.days||[]).forEach(function(d){ if(!allDays[d])allDays[d]=[]; allDays[d].push(m.name); }); });
  var overlapDays = Object.keys(allDays).filter(function(d){ return allDays[d].length >= 2; }).length;
  var totalDays = 0; members.forEach(function(m){totalDays+=(m.days||[]).length;});

  // Top vacation month
  var topMoIdx = monthly.indexOf(Math.max.apply(null, monthly));

  // Busiest member
  var sorted = memberStats.slice().sort(function(a,b){return b.days-a.days;});

  var card = function(title, value, sub, accent) {
    return <div style={{background:th.gbg,borderRadius:G.rSm,border:"1px solid "+th.gbd,padding:"14px 16px",backdropFilter:G.blur,WebkitBackdropFilter:G.blur,boxShadow:th.gw}}>
      <div style={{fontSize:11,color:th.t3,fontWeight:600,marginBottom:4}}>{title}</div>
      <div style={{fontSize:24,fontWeight:800,color:accent||th.ac,fontFamily:FM}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:th.t3,marginTop:2}}>{sub}</div>}
    </div>;
  };

  var EN_MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return <div className="tvp-fade" style={{maxWidth:800}}>
    <PTODonut team={team} th={th} t={t}/>
    <h3 style={{fontSize:16,fontWeight:750,color:th.tx,marginBottom:14,fontFamily:F}}>{V("anTitle",{y:yr})}</h3>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,marginBottom:20}}>
      {card(t.totalVacDays, totalDays, members.length + " " + (t.mbs||"members"))}
      {card(t.overlapDays, overlapDays, V("anOut"), "#EF4444")}
      {card(t.peakMonth, (t.M||EN_MO)[topMoIdx], monthly[topMoIdx] + " " + (t.dys||"days"))}
      {card(t.avgDays, totalDays>0?Math.round(totalDays/members.length):0)}
    </div>

    <div style={{background:th.gbg,borderRadius:G.rSm,border:"1px solid "+th.gbd,padding:16,marginBottom:20,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      <div style={{fontSize:12,fontWeight:700,color:th.tx,marginBottom:10}}>{t.monthlyDist||"Monthly Distribution"}</div>
      <div style={{display:"flex",alignItems:"flex-end",gap:4,height:120}}>
        {monthly.map(function(count,i) {
          var pct = count > 0 ? Math.max(8, Math.round(count/maxMo*100)) : 0;
          return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:9,fontWeight:700,color:th.ac,fontFamily:FM}}>{count>0?count:""}</span>
            <div style={{width:"100%",height:pct+"%",minHeight:count>0?8:2,background:count>0?"linear-gradient(180deg,"+th.ac+",#6366F1)":th.sh,borderRadius:3,transition:"height .5s"}}/>
            <span style={{fontSize:8,color:th.t3,fontWeight:600}}>{EN_MO[i]}</span>
          </div>;
        })}
      </div>
    </div>

    <div style={{background:th.gbg,borderRadius:G.rSm,border:"1px solid "+th.gbd,padding:16,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      <div style={{fontSize:12,fontWeight:700,color:th.tx,marginBottom:10}}>{t.memberBreak||"Per Member Breakdown"}</div>
      {sorted.map(function(s) {
        var pct = s.pto > 0 ? Math.round(s.days/s.pto*100) : 0;
        return <div key={s.name} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid "+th.gbd}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:th.tx,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</div>
          </div>
          <div style={{fontSize:20,fontWeight:800,color:s.color,fontFamily:FM,minWidth:36,textAlign:"right"}}>{s.days}</div>
          <div style={{fontSize:10,color:th.t3,minWidth:50}}>
            {s.pto>0?pct+"% of "+s.pto:s.days+" "+t.dys}
          </div>
          <div style={{width:60,height:6,borderRadius:3,background:th.sh,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:3,background:s.pto>0&&pct>100?"#EF4444":s.color,width:Math.min(100,s.pto>0?pct:(s.days>0?50:0))+"%",transition:"width .5s"}}/>
          </div>
        </div>;
      })}
    </div>
  
    
    <TeamWorldMap team={team} th={th} t={t}/>
  </div>;
}

function TripsView({team,onUpdate,th,t,yr,holSet}){
  var trips=(team.trips||[]).sort(function(a,b){return(a.start||"").localeCompare(b.start||"");});
  var[adding,setAdding]=useState(false);
  var[editId,setEditId]=useState(null);
  var[form,setForm]=useState({member:"",start:"",end:"",dest:"",project:""});

  var resetForm=function(){setForm({member:"",start:"",end:"",dest:"",project:""});setAdding(false);setEditId(null);};

  var saveTrip=function(){
    if(!form.member||!form.start||!form.end)return;
    var allTrips=[...(team.trips||[])];
    var tripObj={id:editId||("t"+Date.now()),member:form.member,start:form.start,end:form.end,dest:form.dest,project:form.project};
    if(editId){var idx=allTrips.findIndex(function(x){return x.id===editId;});if(idx>=0)allTrips[idx]=tripObj;}
    else allTrips.push(tripObj);
    onUpdate({...team,trips:allTrips});resetForm();
  };

  var deleteTrip=function(id){
    var allTrips=(team.trips||[]).filter(function(x){return x.id!==id;});
    onUpdate({...team,trips:allTrips});
    if(editId===id)resetForm();
  };

  var startEdit=function(tr){
    setForm({member:tr.member,start:tr.start,end:tr.end,dest:tr.dest||"",project:tr.project||""});
    setEditId(tr.id);setAdding(true);
  };

  var countWorkDays=function(s,e){if(!s||!e)return 0;var d1=new Date(s+"T12:00:00"),d2=new Date(e+"T12:00:00"),cnt=0;for(var d=new Date(d1);d<=d2;d.setDate(d.getDate()+1)){var dow=d.getDay();if(dow!==0&&dow!==6)cnt++;}return cnt;};

  // Build a set of all trip days per member for the calendar
  var tripDayMap={};
  trips.forEach(function(tr){
    if(!tr.start||!tr.end)return;
    var d1=new Date(tr.start+"T12:00:00"),d2=new Date(tr.end+"T12:00:00");
    if(!tripDayMap[tr.member])tripDayMap[tr.member]=[];
    for(var d=new Date(d1);d<=d2;d.setDate(d.getDate()+1)){
      tripDayMap[tr.member].push(dk(d.getFullYear(),d.getMonth(),d.getDate()));
    }
  });

  var totalDays=trips.reduce(function(sum,tr){return sum+countWorkDays(tr.start,tr.end);},0);

  // Calendar
  var[quarter,setQuarter]=useState(null);
  var allM=Array.from({length:12},function(_,i){return{year:yr,month:i};});
  var filtered=quarter===null?allM:allM.filter(function(x){return Math.floor(x.month/3)===quarter;});
  var mob=typeof window!=="undefined"&&window.innerWidth<700;

  return <div className="tvp-fade">
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <div>
        <h3 style={{margin:0,fontSize:17,fontWeight:700,color:"#D97706",fontFamily:F,display:"flex",alignItems:"center",gap:6}}>✈️ {t.trips||"Business Trips"} {yr}</h3>
        <div style={{fontSize:11,color:th.t3,marginTop:2}}>{trips.length} {trips.length!==1?(t.trips||"trips"):(t.trip||"trip")} · {totalDays} {t.dys||"days"}</div>
      </div>
      {!adding&&<button onClick={function(){resetForm();setAdding(true);}} style={{padding:"8px 16px",borderRadius:10,border:"none",background:"#D97706",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 8px rgba(217,119,6,.25)"}}><Ic n="plus" s={13} c="#fff"/> {t.addTrip||"Add Trip"}</button>}
    </div>

    {/* Add/Edit Form */}
    {adding&&<div style={{padding:16,background:th.gbg,borderRadius:12,border:"1px solid #D97706",marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:700,color:"#D97706",marginBottom:12}}>{editId?(t.editTrip||"Edit Trip"):(t.addTrip||"New Trip")}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div>
          <label style={{fontSize:10,color:th.t3,fontWeight:600,display:"block",marginBottom:3}}>{t.mb||"Member"}</label>
          <select value={form.member} onChange={function(e){setForm({...form,member:e.target.value});}} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid "+th.gbd,background:th.sf,color:th.tx,fontSize:12,fontFamily:F}}>
            <option value="">— {t.selMember||"Select member"} —</option>
            {team.members.map(function(m){return <option key={m.id} value={m.id}>{m.name}</option>;})}
          </select>
        </div>
        <div>
          <label style={{fontSize:10,color:th.t3,fontWeight:600,display:"block",marginBottom:3}}>{t.dest||"Destination"}</label>
          <input value={form.dest} onChange={function(e){setForm({...form,dest:e.target.value});}} placeholder={X("city")} maxLength={50} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid "+th.gbd,background:th.sf,color:th.tx,fontSize:12,fontFamily:F}}/>
        </div>
        <div>
          <label style={{fontSize:10,color:th.t3,fontWeight:600,display:"block",marginBottom:3}}>{t.startDate||"Start date"}</label>
          <input type="date" value={form.start} onChange={function(e){setForm({...form,start:e.target.value});}} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid "+th.gbd,background:th.sf,color:th.tx,fontSize:12,fontFamily:F}}/>
        </div>
        <div>
          <label style={{fontSize:10,color:th.t3,fontWeight:600,display:"block",marginBottom:3}}>{t.endDate||"End date"}</label>
          <input type="date" value={form.end} onChange={function(e){setForm({...form,end:e.target.value});}} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid "+th.gbd,background:th.sf,color:th.tx,fontSize:12,fontFamily:F}}/>
        </div>
      </div>
      <div style={{marginTop:10}}>
        <label style={{fontSize:10,color:th.t3,fontWeight:600,display:"block",marginBottom:3}}>{t.project||"Project / Purpose"}</label>
        <input value={form.project} onChange={function(e){setForm({...form,project:e.target.value});}} placeholder={X("optional")} maxLength={80} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid "+th.gbd,background:th.sf,color:th.tx,fontSize:12,fontFamily:F}}/>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
        <button onClick={resetForm} style={{padding:"7px 16px",borderRadius:8,border:"1px solid "+th.gbd,background:"transparent",color:th.t2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>{t.cancel||"Cancel"}</button>
        <button onClick={saveTrip} disabled={!form.member||!form.start||!form.end} style={{padding:"7px 16px",borderRadius:8,border:"none",background:form.member&&form.start&&form.end?"#D97706":"#D1D5DB",color:"#fff",fontSize:12,fontWeight:700,cursor:form.member&&form.start&&form.end?"pointer":"default",fontFamily:F}}>{editId?(t.save||"Save"):(t.addTrip||"Add Trip")}</button>
      </div>
    </div>}

    {/* Trip list */}
    {trips.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
      {trips.map(function(tr){
        var m=team.members.find(function(x){return x.id===tr.member;});
        var mc=m?MC[team.members.indexOf(m)%MC.length]:{d:"#D97706",b:"#FAEEDA",t:"#854F0B"};
        var days=countWorkDays(tr.start,tr.end);
        var startD=tr.start?new Date(tr.start+"T12:00:00"):null;
        var endD=tr.end?new Date(tr.end+"T12:00:00"):null;
        var fmtD=function(d){if(!d)return"";return d.getDate()+" "+(t.M||["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"])[d.getMonth()];};
        return <div key={tr.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:th.gbg,borderRadius:10,border:"1px solid "+th.gbd,transition:"all .15s"}} onMouseEnter={function(e){e.currentTarget.style.borderColor="#D97706";}} onMouseLeave={function(e){e.currentTarget.style.borderColor=th.gbd;}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:mc.d,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:700,flexShrink:0}}>{m?m.name[0].toUpperCase():"?"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:th.tx}}>{m?m.name:"?"}</div>
            <div style={{fontSize:11,color:th.t3,display:"flex",flexWrap:"wrap",gap:4,marginTop:2}}>
              <span>{fmtD(startD)} – {fmtD(endD)}</span>
              {tr.dest&&<span style={{color:"#D97706",fontWeight:600}}>· {tr.dest}</span>}
              {tr.project&&<span>· {tr.project}</span>}
            </div>
          </div>
          <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:8,background:"#FAEEDA",color:"#854F0B",flexShrink:0}}>{days}d</span>
          <button onClick={function(){startEdit(tr);}} style={{background:"none",border:"none",cursor:"pointer",padding:3}}><Ic n="edit" s={13} c={th.t3}/></button>
          <button onClick={function(){deleteTrip(tr.id);}} style={{background:"none",border:"none",cursor:"pointer",padding:3}}><Ic n="trash" s={13} c={th.t3}/></button>
        </div>;
      })}
    </div>}

    {/* Empty state */}
    {trips.length===0&&!adding&&<div style={{textAlign:"center",padding:"30px 20px",marginBottom:16}}>
      <div style={{fontSize:36,marginBottom:10}}>✈️</div>
      <div style={{fontSize:15,fontWeight:700,color:th.tx,marginBottom:4}}>{t.noTrips||"No business trips yet"}</div>
      <div style={{fontSize:12,color:th.t3}}>{t.noTripsDesc||"Track your team's business travel — destinations, dates, and projects."}</div>
    </div>}

    {/* Quarter pills */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <span style={{fontSize:14,fontWeight:700,color:th.tx}}>{t.cal||"Calendar"}</span>
      <div style={{display:"flex",gap:3}}>
        {[{l:t.yr||"Year",v:null},{l:"Q1",v:0},{l:"Q2",v:1},{l:"Q3",v:2},{l:"Q4",v:3}].map(function(q){return <button key={q.l} onClick={function(){setQuarter(q.v);}} style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:600,border:quarter===q.v?"1.5px solid #D97706":"1px solid "+th.gbd,background:quarter===q.v?"#FAEEDA":"transparent",color:quarter===q.v?"#D97706":th.t3,cursor:"pointer",fontFamily:F}}>{q.l}</button>;})}
      </div>
    </div>

    {/* Calendar grid showing trips as amber days */}
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:mob?10:12}}>
      {filtered.map(function(mo){
        var year2=mo.year,month2=mo.month;
        var daysInMonth=dim(year2,month2);var first=fdm(year2,month2);
        var cells=[];for(var i2=0;i2<first;i2++)cells.push(null);for(var d2=1;d2<=daysInMonth;d2++)cells.push(d2);
        var dayLabels=[t.mo,t.tu,t.we2,t.th,t.fr,t.sa,t.su];
        var seasonBg=month2>=5&&month2<=7?"rgba(245,158,11,.04)":month2===11||month2<=1?"rgba(99,102,241,.04)":month2>=2&&month2<=4?"rgba(16,185,129,.03)":"rgba(249,115,22,.025)";

        return <div key={month2} style={{background:th.gbg,borderRadius:G.rSm,border:"1px solid "+th.gbd,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",borderBottom:"1px solid "+th.bl,background:seasonBg,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,fontWeight:650,color:th.tx,fontFamily:F}}>{t.M[month2]}</span>
          </div>
          <div style={{padding:"6px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:3}}>
              {dayLabels.map(function(dl,di){return <div key={di} style={{fontSize:9,fontWeight:600,color:th.t3,textAlign:"center",padding:2}}>{dl}</div>;})}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
              {cells.map(function(day,ci){
                if(day===null)return <div key={"e"+ci}/>;
                var key=dk(year2,month2,day);
                var we=isWe(year2,month2,day);
                var isHol=holSet&&holSet.has&&holSet.has(key);
                // Find all members traveling on this day
                var travelers=[];
                team.members.forEach(function(m2,mi){
                  if(tripDayMap[m2.id]&&tripDayMap[m2.id].indexOf(key)>=0){
                    travelers.push({name:m2.name,mc:MC[mi%MC.length]});
                  }
                });
                var hasTrip=travelers.length>0;
                var isTd=year2===CY&&month2===CM&&day===CD;

                return <div key={ci} style={{position:"relative",aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:6,
                  background:hasTrip?travelers[0].mc.b:isHol?"#DBEAFE":we?"transparent":"transparent",
                  border:hasTrip?"1.5px solid #D97706":"1px solid transparent",
                  boxShadow:hasTrip?"0 0 6px rgba(217,119,6,.2)":"none"}}>
                  <span style={{fontSize:11,fontWeight:isTd||hasTrip?700:500,color:hasTrip?"#92400E":isTd?th.ac:we?th.t3+"80":isHol?"#3B82F6":th.tx,lineHeight:1}}>{day}</span>
                  {travelers.length>1&&<span style={{position:"absolute",top:-3,right:-3,width:12,height:12,borderRadius:"50%",background:"#D97706",color:"#fff",fontSize:7,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{travelers.length}</span>}
                  {hasTrip&&travelers.length===1&&<span style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"#D97706"}}/>}
                </div>;
              })}
            </div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function YearNav({yr,onYear,th,small=false}){
  if(!onYear)return <span style={{fontSize:small?10:18,fontWeight:700,color:small?th.t3:th.tx}}>{yr}</span>;
  // Arrows follow reading direction (Arabic is right-to-left); targets at least 24×24 px
  const rtl=textLang()==="ar";const back=rtl?"›":"‹",fwd=rtl?"‹":"›";
  const bs=(on)=>({padding:small?"2px 7px":"5px 12px",minWidth:24,minHeight:24,borderRadius:small?6:8,fontSize:small?11:12,fontWeight:700,fontFamily:F,cursor:"pointer",border:on?`1.5px solid ${th.ac}`:`1px solid ${th.gbd}`,background:on?th.al:th.gbg,color:on?th.ac:th.t3,whiteSpace:"nowrap",lineHeight:1.4});
  if(!small)return <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:10,width:"100%"}}>
    <div style={{justifySelf:"end"}}>{yr>YEAR_MIN&&<button onClick={()=>onYear(yr-1)} aria-label={String(yr-1)} style={bs(false)}>{back+" "+(yr-1)}</button>}</div>
    <span style={{fontSize:22,fontWeight:750,color:th.tx,letterSpacing:-.5,textAlign:"center",minWidth:64}}>{yr}</span>
    <div style={{justifySelf:"start"}}>{yr<YEAR_MAX&&<button onClick={()=>onYear(yr+1)} aria-label={String(yr+1)} style={bs(true)}>{(yr+1)+" "+fwd}</button>}</div>
  </div>;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
    {yr>YEAR_MIN&&<button onClick={()=>onYear(yr-1)} aria-label={String(yr-1)} title={String(yr-1)} style={bs(false)}>{back}</button>}
    <span style={{fontSize:small?11:18,fontWeight:700,color:small?th.t2:th.tx}}>{yr}</span>
    {yr<YEAR_MAX&&<button onClick={()=>onYear(yr+1)} aria-label={String(yr+1)} title={String(yr+1)} style={bs(true)}>{fwd}</button>}
  </span>;
}

async function cropLogo(file){
  if(!file||!/^image\//.test(file.type))throw new Error("not an image");
  if(file.size>15*1024*1024)throw new Error("too big");
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.decoding="async";img.src=url;await img.decode();
    const side=Math.min(img.naturalWidth,img.naturalHeight);if(!side)throw new Error("empty");
    const sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
    const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d");
    g.imageSmoothingQuality="high";g.fillStyle="#fff";g.fillRect(0,0,128,128);g.drawImage(img,sx,sy,side,side,0,0,128,128);
    let out=c.toDataURL("image/webp",0.82);if(!out.startsWith("data:image/webp"))out=c.toDataURL("image/jpeg",0.85);
    if(!safeLogo(out))throw new Error("encode");
    return out;
  }finally{URL.revokeObjectURL(url);}
}

function TeamLogo({team,th,size=30,editable=false,onChange=null,locked=false}){
  const ref=useRef(null);const[busy,setBusy]=useState(false);const[menu,setMenu]=useState(false);
  const logo=safeLogo(team.logo);const initial=(team.name||"?").trim().charAt(0).toUpperCase();
  const pick=async e=>{const f=e.target.files&&e.target.files[0];e.target.value="";if(!f||!onChange)return;setBusy(true);try{onChange(await cropLogo(f));}catch(err){alert(X("logoBad"));}finally{setBusy(false);}};
  const face=<span style={{width:size,height:size,borderRadius:"50%",overflow:"hidden",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:logo?"#fff":th.al,color:th.ac,fontWeight:800,fontSize:Math.round(size*0.45),border:"1px solid "+th.bd,opacity:busy?.5:1}}>{logo?<img src={logo} alt="" width={size} height={size} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initial}</span>;
  if(!editable||locked)return face;
  return <span style={{position:"relative",display:"inline-flex"}}>
    <button type="button" onClick={()=>logo?setMenu(m=>!m):ref.current&&ref.current.click()} aria-label={logo?X("logoMenu"):X("logoAdd")} title={logo?X("logoMenu"):X("logoAdd")} style={{padding:0,border:0,background:"none",cursor:"pointer",borderRadius:"50%",display:"inline-flex",position:"relative"}}>
      {face}
      {!logo&&<span aria-hidden="true" style={{position:"absolute",right:-2,bottom:-2,width:13,height:13,borderRadius:"50%",background:th.ac,color:"#fff",fontSize:11,lineHeight:"13px",textAlign:"center",fontWeight:800,border:"1.5px solid #fff"}}>+</span>}
    </button>
    <input ref={ref} type="file" accept="image/*" onChange={pick} style={{display:"none"}}/>
    {menu&&<span role="menu" style={{position:"absolute",top:size+6,left:0,zIndex:60,background:th.sf,border:"1px solid "+th.bd,borderRadius:12,boxShadow:"0 8px 24px rgba(30,27,75,.16)",padding:4,display:"flex",flexDirection:"column",minWidth:150}}>
      <button role="menuitem" type="button" onClick={()=>{setMenu(false);ref.current&&ref.current.click();}} style={{textAlign:"start",padding:"8px 10px",border:0,background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:th.tx,borderRadius:8,fontFamily:F}}>{X("logoChange")}</button>
      <button role="menuitem" type="button" onClick={()=>{setMenu(false);onChange&&onChange(null);}} style={{textAlign:"start",padding:"8px 10px",border:0,background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"#DC2626",borderRadius:8,fontFamily:F}}>{X("logoRemove")}</button>
    </span>}
  </span>;
}

// ─── Coming up: who is away in the next 14 days, with a copyable summary ───
const UP_TX={
  en:{t:"Next 2 weeks",none:"Nobody is away in the next 2 weeks.",copy:"Copy summary",copied:"Copied",head:"who is away"},
  fr:{t:"2 prochaines semaines",none:"Personne n'est absent dans les 2 prochaines semaines.",copy:"Copier le résumé",copied:"Copié",head:"qui est absent"},
  de:{t:"Nächste 2 Wochen",none:"In den nächsten 2 Wochen ist niemand abwesend.",copy:"Zusammenfassung kopieren",copied:"Kopiert",head:"wer ist abwesend"},
  es:{t:"Próximas 2 semanas",none:"Nadie estará ausente en las próximas 2 semanas.",copy:"Copiar resumen",copied:"Copiado",head:"quién está ausente"},
  pt:{t:"Próximas 2 semanas",none:"Ninguém está ausente nas próximas 2 semanas.",copy:"Copiar resumo",copied:"Copiado",head:"quem está ausente"},
  ro:{t:"Următoarele 2 săptămâni",none:"Nimeni nu e plecat în următoarele 2 săptămâni.",copy:"Copiază rezumatul",copied:"Copiat",head:"cine lipsește"},
  hu:{t:"Következő 2 hét",none:"A következő 2 hétben senki sincs távol.",copy:"Összefoglaló másolása",copied:"Másolva",head:"ki van távol"},
  sv:{t:"Kommande 2 veckor",none:"Ingen är borta de kommande 2 veckorna.",copy:"Kopiera sammanfattning",copied:"Kopierad",head:"vem är borta"},
  it:{t:"Prossime 2 settimane",none:"Nessuno è assente nelle prossime 2 settimane.",copy:"Copia riepilogo",copied:"Copiato",head:"chi è assente"},
  bg:{t:"Следващите 2 седмици",none:"Никой не отсъства през следващите 2 седмици.",copy:"Копирайте обобщението",copied:"Копирано",head:"кой отсъства"},
  ar:{t:"الأسبوعان القادمان",none:"لا أحد غائب في الأسبوعين القادمين.",copy:"نسخ الملخص",copied:"تم النسخ",head:"من غائب"},
};

function upcomingAway(members,fromKey,days){
  const p=pk(fromKey);const keys=[];for(let i=0;i<days;i++){const d=new Date(p.y,p.m,p.d+i,12);keys.push(dk(d.getFullYear(),d.getMonth(),d.getDate()));}
  const out=[];
  (members||[]).forEach((m,mi)=>{const set=new Set(m.days||[]);let run=null;keys.forEach(k=>{if(set.has(k)){if(run)run.to=k;else run={from:k,to:k};}else if(run){out.push({m,mi,...run});run=null;}});if(run)out.push({m,mi,...run});});
  return out.sort((a,b)=>a.from.localeCompare(b.from)||String(a.m.name).localeCompare(String(b.m.name)));
}

function ComingUp({team,th,lang}){
  const L=UP_TX[lang]||UP_TX.en;const[copied,setCopied]=useState(false);
  const today=dk(CY,CM,CD);const runs=upcomingAway(team.members,today,14);
  const loc=lang==="en"?"en-GB":lang;
  const f=k=>{const p=pk(k);try{return new Date(p.y,p.m,p.d,12).toLocaleDateString(loc,{weekday:"short",day:"numeric",month:"short"});}catch(e){return k;}};
  const range=r=>r.from===r.to?f(r.from):f(r.from)+" – "+f(r.to);
  const copy=async()=>{const end=(()=>{const p=pk(today);const d=new Date(p.y,p.m,p.d+13,12);return dk(d.getFullYear(),d.getMonth(),d.getDate());})();
    const txt=team.name+" – "+L.head+" ("+f(today)+" – "+f(end)+")\n"+(runs.length?runs.map(r=>"• "+r.m.name+": "+range(r)).join("\n"):L.none);
    try{await navigator.clipboard.writeText(txt);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch(e){}};
  return <div dir={lang==="ar"?"rtl":"ltr"} style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",padding:"8px 12px",background:th.gbg,border:"1px solid "+th.gbd,borderRadius:10,marginBottom:10,fontFamily:F}}>
    <span style={{fontSize:12,fontWeight:700,color:th.tx,marginInlineEnd:4}}>{L.t}</span>
    {runs.length===0&&<span style={{fontSize:12,color:th.t3}}>{L.none}</span>}
    {runs.slice(0,8).map((r,i)=>{const c=MC[r.mi%MC.length];return <span key={i} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 10px",borderRadius:999,background:c.b,color:c.t,fontSize:12,fontWeight:600}}>{r.m.name}<span style={{fontWeight:500,opacity:.85}}>{range(r)}</span></span>;})}
    {runs.length>8&&<span style={{fontSize:12,color:th.t3}}>+{runs.length-8}</span>}
    <button onClick={copy} style={{marginInlineStart:"auto",padding:"5px 12px",borderRadius:999,border:"1px solid "+th.gbd,background:th.sf,color:th.ac,fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer",minHeight:32}}>{copied?"✓ "+L.copied:L.copy}</button>
  </div>;
}

// ─── Small strings for next-year prompt and team deletion (11 languages) ───
const NY_TX={
  en:{plan:"Time to plan {y}",sub:"Everyone's {y} holidays are ready. Start picking vacation days.",open:"Open {y}",later:"Not now",delBtn:"Delete team…",delT:"Delete this team for everyone?",delB:"Everyone with the link loses access to {n}. This cannot be undone by you.",delType:"Type the team name to confirm",delGo:"Delete for everyone",cancel:"Cancel",removed:"Team deleted"},
  fr:{plan:"Planifiez {y}",sub:"Les jours fériés {y} de chacun sont prêts. Commencez à choisir vos congés.",open:"Ouvrir {y}",later:"Plus tard",delBtn:"Supprimer l'équipe…",delT:"Supprimer cette équipe pour tout le monde ?",delB:"Tous ceux qui ont le lien perdront l'accès à {n}. Vous ne pourrez pas annuler.",delType:"Saisissez le nom de l'équipe pour confirmer",delGo:"Supprimer pour tous",cancel:"Annuler",removed:"Équipe supprimée"},
  de:{plan:"Zeit, {y} zu planen",sub:"Alle Feiertage für {y} sind da. Wählen Sie Ihre Urlaubstage.",open:"{y} öffnen",later:"Später",delBtn:"Team löschen…",delT:"Dieses Team für alle löschen?",delB:"Alle mit dem Link verlieren den Zugriff auf {n}. Sie können das nicht rückgängig machen.",delType:"Teamnamen zur Bestätigung eingeben",delGo:"Für alle löschen",cancel:"Abbrechen",removed:"Team gelöscht"},
  es:{plan:"Es hora de planificar {y}",sub:"Los festivos de {y} de todos ya están cargados. Empieza a elegir días.",open:"Abrir {y}",later:"Ahora no",delBtn:"Eliminar equipo…",delT:"¿Eliminar este equipo para todos?",delB:"Todos los que tengan el enlace perderán el acceso a {n}. No podrás deshacerlo.",delType:"Escribe el nombre del equipo para confirmar",delGo:"Eliminar para todos",cancel:"Cancelar",removed:"Equipo eliminado"},
  pt:{plan:"Hora de planear {y}",sub:"Os feriados de {y} de todos já estão prontos. Comece a escolher dias.",open:"Abrir {y}",later:"Agora não",delBtn:"Eliminar equipa…",delT:"Eliminar esta equipa para todos?",delB:"Todos com o link perdem o acesso a {n}. Não poderá desfazer.",delType:"Escreva o nome da equipa para confirmar",delGo:"Eliminar para todos",cancel:"Cancelar",removed:"Equipa eliminada"},
  ro:{plan:"E timpul să planificați {y}",sub:"Sărbătorile legale din {y} ale tuturor sunt gata. Începeți să alegeți zilele de concediu.",open:"Deschide {y}",later:"Mai târziu",delBtn:"Șterge echipa…",delT:"Ștergi echipa pentru toată lumea?",delB:"Toți cei cu linkul pierd accesul la {n}. Nu poți anula.",delType:"Scrie numele echipei pentru confirmare",delGo:"Șterge pentru toți",cancel:"Anulează",removed:"Echipa a fost ștearsă"},
  hu:{plan:"Ideje megtervezni: {y}",sub:"Mindenki ünnepnapjai készen állnak ({y}). Kezdjétek el a szabadság tervezését.",open:"{y} megnyitása",later:"Később",delBtn:"Csapat törlése…",delT:"Törlöd a csapatot mindenkinek?",delB:"A linkkel rendelkezők elveszítik a hozzáférést: {n}. Nem vonható vissza.",delType:"A megerősítéshez írd be a csapat nevét",delGo:"Törlés mindenkinek",cancel:"Mégse",removed:"Csapat törölve"},
  sv:{plan:"Dags att planera {y}",sub:"Allas helgdagar för {y} är klara. Börja välja semesterdagar.",open:"Öppna {y}",later:"Inte nu",delBtn:"Radera team…",delT:"Radera teamet för alla?",delB:"Alla med länken förlorar åtkomst till {n}. Du kan inte ångra det.",delType:"Skriv teamets namn för att bekräfta",delGo:"Radera för alla",cancel:"Avbryt",removed:"Teamet raderat"},
  it:{plan:"È ora di pianificare il {y}",sub:"Le festività {y} di tutti sono pronte. Iniziate a scegliere le ferie.",open:"Apri {y}",later:"Non ora",delBtn:"Elimina team…",delT:"Eliminare questo team per tutti?",delB:"Chi ha il link perderà l'accesso a {n}. Non potrai annullare.",delType:"Scrivi il nome del team per confermare",delGo:"Elimina per tutti",cancel:"Annulla",removed:"Team eliminato"},
  bg:{plan:"Време е да планирате {y}",sub:"Празниците за {y} на всички са готови. Започнете да избирате дни.",open:"Отворете {y}",later:"Не сега",delBtn:"Изтрийте екипа…",delT:"Да изтрия ли екипа за всички?",delB:"Всички с линка губят достъп до {n}. Не можете да отмениш.",delType:"Въведете името на екипа за потвърждение",delGo:"Изтрийте за всички",cancel:"Отказ",removed:"Екипът е изтрит"},
  ar:{plan:"حان وقت التخطيط لعام {y}",sub:"عطل الجميع لعام {y} جاهزة. ابدأوا باختيار أيام الإجازة.",open:"افتح {y}",later:"ليس الآن",delBtn:"حذف الفريق…",delT:"حذف هذا الفريق للجميع؟",delB:"سيفقد كل من لديه الرابط الوصول إلى {n}. لا يمكنك التراجع.",delType:"اكتب اسم الفريق للتأكيد",delGo:"حذف للجميع",cancel:"إلغاء",removed:"تم حذف الفريق"},
};

function NextYearPrompt({team,yr,onYear,th,lang}){
  const L=NY_TX[lang]||NY_TX.en;const ny=yr+1;const key="tvp-ny-"+team.id+"-"+ny;
  const[hidden,setHidden]=useState(true);
  useEffect(()=>{let h=true;try{h=localStorage.getItem(key)==="1";}catch(e){}const id=setTimeout(()=>setHidden(h),0);return()=>clearTimeout(id);},[key]);
  if(hidden||!onYear||yr!==CY||CM<10||ny>YEAR_MAX)return null;
  const hide=()=>{try{localStorage.setItem(key,"1");}catch(e){}setHidden(true);};
  return <div dir={lang==="ar"?"rtl":"ltr"} style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",padding:"10px 14px",borderRadius:12,marginBottom:10,background:"linear-gradient(135deg,rgba(124,58,237,.10),rgba(16,185,129,.08))",border:"1px solid "+th.gbd,fontFamily:F}}>
    <div style={{flex:"1 1 220px"}}><div style={{fontSize:14,fontWeight:700,color:th.tx}}>{L.plan.replace("{y}",ny)}</div><div style={{fontSize:12,color:th.t2}}>{L.sub.replace("{y}",ny)}</div></div>
    <button onClick={()=>onYear(ny)} style={{padding:"8px 16px",minHeight:36,borderRadius:999,border:"none",background:th.ac,color:th.ti||"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:F}}>{L.open.replace("{y}",ny)} →</button>
    <button onClick={hide} style={{padding:"8px 10px",minHeight:36,borderRadius:999,border:"none",background:"none",color:th.t2,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:F}}>{L.later}</button>
  </div>;
}

// Dialog behaviour for any dialog it is placed in: focus moves in, Tab stays inside, Escape closes,
// and focus returns to whatever opened the dialog (WCAG 2.1.2 / 2.4.3)
function TrapScope({onClose}){
  const ref=useRef(null);const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{
    const box=ref.current&&ref.current.closest('[role="dialog"],[role="alertdialog"]');if(!box)return;
    const prev=document.activeElement;
    const items=()=>[...box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&el.offsetParent!==null);
    if(!box.contains(document.activeElement)){const f=items()[0];if(f)f.focus();else{box.setAttribute("tabindex","-1");box.focus();}}
    const key=e=>{
      if(e.key==="Escape"){e.stopPropagation();closeRef.current&&closeRef.current();return;}
      if(e.key!=="Tab")return;const it=items();if(!it.length)return;
      const first=it[0],last=it[it.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    box.addEventListener("keydown",key);
    return()=>{box.removeEventListener("keydown",key);try{if(prev&&prev.focus&&document.contains(prev))prev.focus();}catch(e){}};
  },[]);
  return <span ref={ref} hidden/>;
}

function WhosOutBanner({team,th,t}){var today=dk(CY,CM,CD);var out=(team.members||[]).filter(function(m){return(m.days||[]).indexOf(today)>=0;});if(!out.length)return <div style={{padding:"8px 14px",background:"rgba(16,185,129,.08)",borderRadius:10,border:"1px solid rgba(16,185,129,.15)",marginBottom:10,display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:600,color:"#059669"}}><span>✅</span>{t.fullTeam||"Full team in today!"}</div>;return <div style={{padding:"8px 14px",background:out.length>=3?"rgba(239,68,68,.06)":"rgba(245,158,11,.06)",borderRadius:10,border:"1px solid "+(out.length>=3?"rgba(239,68,68,.15)":"rgba(245,158,11,.15)"),marginBottom:10}}><div style={{fontSize:10,fontWeight:700,color:out.length>=3?"#DC2626":"#D97706",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{t.outToday||"Out today"} ({out.length})</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{out.map(function(m){var mc=MC[team.members.indexOf(m)%MC.length];return <span key={m.id} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:8,background:mc.b,fontSize:11,fontWeight:600,color:mc.t}}><span style={{width:6,height:6,borderRadius:"50%",background:mc.d}}></span>{m.name}</span>;})}</div></div>;}

export default function WS({team,rawTeam=null,onYear=null,onUpdate,onGoHome,onDeleteForever=null,th,t,lang,setLang,theme,setTheme}){
  const[halfMode,setHalfMode]=useState(false);const[delOpen,setDelOpen]=useState(false);const[delText,setDelText]=useState("");const NY=NY_TX[lang]||NY_TX.en;
  const[aId,setAId]=useState(null);const[eId,setEId]=useState(null);const[adding,setAdding]=useState(false);const[nn,setNn]=useState("");const[nc,setNc]=useState(null);const[nr,setNr]=useState(null);
  // ─── PIN feature state (Step 1: declarations only, no UI yet) ─────
  const[nPin,setNPin]=useState("");
  const[nIsApprover,setNIsApprover]=useState(false);
  const[pinPrompt,setPinPrompt]=useState(null);
  const[pinInput,setPinInput]=useState("");
  const[pinErr,setPinErr]=useState(false);
  const[unlockedId,setUnlockedId]=useState(null);
  const[setPinFor,setSetPinFor]=useState(null);
  const[newPinInput,setNewPinInput]=useState("");
  const[confirmPinInput,setConfirmPinInput]=useState("");

  // ─── PIN access helper ────────────────────────────────────────────
  // Returns true if a member is PIN-protected and the current session is NOT unlocked for them
  // Approver, once unlocked, can manage all members
  const isPinLocked = (memberId) => {
    const target = team.members.find(x => x.id === memberId);
    if (!target || !hasPinOf(target)) return false; // No PIN → free
    if (unlockedId === memberId) return false; // Already unlocked
    const meUnlocked = team.members.find(x => x.id === unlockedId);
    const meIsApprover = meUnlocked && (meUnlocked.isApprover || team.approver === meUnlocked.id);
    if (meIsApprover) return false; // Approver bypass
    return true;
  };

  useEffect(()=>{
    if(!document.getElementById("tvp-css")){
      const s=document.createElement("style");s.id="tvp-css";s.textContent=CSS_ANIMS;document.head.appendChild(s);
    }
  },[]);
  const[showSh,setShowSh]=useState(false);const[view,setView]=useState("cal");const[toast,setToast]=useState(null);
  const[mob,setMob]=useState(window.innerWidth<768);const[sb,setSb]=useState(window.innerWidth>=768);const[settings,setSettings]=useState(false);const[holBr,setHolBr]=useState(false);
  const[threshold,setThreshold]=useState(team.threshold||2);const approvalMode=!!team.approver;
  const[showOptimizer,setShowOptimizer]=useState(null); // member id
  const[showCSVImport,setShowCSVImport]=useState(false);
  const[dragMIdx,setDragMIdx]=useState(null);const[commentDay,setCommentDay]=useState(null);const[commentText,setCommentText]=useState("");const[dragOverIdx,setDragOverIdx]=useState(null);
  const[csvText,setCsvText]=useState("");
  const[quarter,setQuarter]=useState(null); // null=full year, 0=Q1, 1=Q2, 2=Q3, 3=Q4

  // ─── Undo/Redo ───
  const historyRef=useRef([]);const redoRef=useRef([]);const skipHistoryRef=useRef(false);
  const pushHistory=(prev)=>{if(skipHistoryRef.current){skipHistoryRef.current=false;return;}historyRef.current=[...historyRef.current.slice(-19),JSON.stringify(prev)];redoRef.current=[];};
  const undo=()=>{if(!historyRef.current.length)return;const prev=historyRef.current.pop();redoRef.current.push(JSON.stringify(team));skipHistoryRef.current=true;onUpdate(JSON.parse(prev));flash(X("undo"));};
  const redo=()=>{if(!redoRef.current.length)return;const next=redoRef.current.pop();historyRef.current.push(JSON.stringify(team));skipHistoryRef.current=true;onUpdate(JSON.parse(next));flash(X("redo"));};
  // teamRef = the newest version, even before React re-renders (fast drags toggle several days per frame)
  const teamRef=useRef(team);teamRef.current=team;
  const updateWithHistory=(newTeam)=>{pushHistory(teamRef.current);teamRef.current=newTeam;onUpdate(newTeam);};
  // Undo steps belong to the year they were made in: start clean when the year changes
  useEffect(()=>{historyRef.current=[];redoRef.current=[];},[team.year]);

  useEffect(()=>{
    // Server undid a change to a PIN-protected member (e.g. the 12-hour PIN session ran out): ask for the PIN again
    const h=()=>{flash(X("reverted"));setUnlockedId(null);};
    const e=ev=>flash(String((ev&&ev.detail)||"Not saved"));
    window.addEventListener("tvp-reverted",h);window.addEventListener("tvp-save-error",e);
    return()=>{window.removeEventListener("tvp-reverted",h);window.removeEventListener("tvp-save-error",e);};
  },[]);
  // Keyboard shortcuts for undo/redo
  useEffect(()=>{const h=(e)=>{if((e.metaKey||e.ctrlKey)&&e.key==="z"){e.preventDefault();if(e.shiftKey)redo();else undo();}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[team]);

  useEffect(()=>{const h=()=>{const m=window.innerWidth<768;setMob(m);if(!m)setSb(true);};window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  // Auto-show share modal for freshly created teams so user gets the link immediately
  useEffect(()=>{if(team.members.length===0&&!showSh){setShowSh(true);}},[]);
  const flash=m=>{setToast(m);setTimeout(()=>setToast(null),2500);};
  const yr=team.year||CY;const locked=!!team.locked;const isAdmin=!team.adminId||true;// In this version, everyone can admin

  // Compute holidays for all team countries
  const holSet=new Set();team.members.forEach(m=>{if(m.country)computeHolidays(m.country,yr).forEach(h=>holSet.add(h));});
  const hNames=useHolidayNames(team.members.map(m=>m.country));
  const holInfo=key=>holidayInfo(key,team.members,yr,hNames);
  // ─── v3: approval inbox, time travel, Wrapped, Today tiles ───
  const[showInbox,setShowInbox]=useState(false);const[showTT,setShowTT]=useState(false);const[showWr,setShowWr]=useState(false);
  const colorOf=useCallback(id=>{const i=team.members.findIndex(m=>m.id===id);return MC[(i<0?0:i)%MC.length];},[team.members]);
  const holInfoCb=useCallback(key=>holidayInfo(key,team.members,yr,hNames),[team.members,yr,hNames]);
  const holOf=useCallback(m=>holSetOf(m,yr),[yr]);
  // Export code loads ahead of the first click, so print windows open straight from the click (popup blockers)
  useEffect(()=>{const t0=setTimeout(()=>{import("./reports").catch(()=>{});},1200);return()=>clearTimeout(t0);},[]);
  const pendN=team.approver?pendingApprovals(team,yr,threshold).length:0;
  const canApprove=!!getOwner(team.id)||(!!unlockedId&&(team.approver===unlockedId||!!(team.members.find(x=>x.id===unlockedId)||{}).isApprover));
  const revokeApproval=id=>{const cur=teamRef.current;const m=cur.members.find(x=>x.id===id);updateWithHistory({...cur,members:cur.members.map(x=>x.id===id?{...x,approved:false}:x),log:addLogEntry(cur,((m&&m.name)||"Member")+" approval revoked")});};
  const turnOnApprovals=mid=>{const cur=teamRef.current;updateWithHistory({...cur,approver:mid,members:cur.members.map(x=>x.id===mid?{...x,isApprover:true,approved:true}:x),log:addLogEntry(cur,"Approvals turned on")});};
  const wrOk=team.members.reduce((n,m)=>n+(m.days||[]).filter(k=>typeof k==="string"&&k.startsWith(yr+"-")).length,0)>=5;
  const approveIds=ids=>{if(!ids.length)return;const cur=teamRef.current;const set=new Set(ids);const names=cur.members.filter(m=>set.has(m.id)).map(m=>m.name||"Member");
    updateWithHistory({...cur,members:cur.members.map(mm=>set.has(mm.id)?{...mm,approved:true}:mm),log:addLogEntry(cur,names.join(", ")+" approved")});flash(V("approvedToast",{n:ids.length}));};
  const requestChanges=(m,note,day)=>{const cur=teamRef.current;if(cur.locked){flash(t.locked);return;}const by=(cur.members.find(x=>x.id===cur.approver)||{}).name||"Approver";
    const text=note?V("changesComment",{note}):V("changesNoNote");const c={...(cur.comments||{})};c[day]=[...(c[day]||[]),{by,at:new Date().toISOString(),t:("@"+(m.name||"")+" "+text).slice(0,280)}];
    updateWithHistory({...cur,comments:c,log:addLogEntry(cur,by+" asked "+(m.name||"a member")+" for changes")});flash(V("requestedToast",{n:m.name||""}));};
  // Restore = everyone's days, half days and approval for the viewed year go back to the version; people removed since
  // come back. Nobody is removed, other years and team settings stay as they are, and Undo works right after.
  const restoreVersion=(raw,at)=>{const cur=teamRef.current;if(cur.locked){flash(t.locked);return;}const old=teamForYear(raw,yr);if(!old||!Array.isArray(old.members)){flash("Not saved");return;}
    type RM={id:string;days?:string[];half?:string[];approved?:boolean};
    const om=new Map<string,RM>((old.members as RM[]).filter(m=>m&&m.id).map(m=>[m.id,m] as [string,RM]));
    const members=cur.members.map(m=>{const o=om.get(m.id);if(!o)return m;const nm={...m,days:Array.isArray(o.days)?o.days:[],approved:!!o.approved};if(Array.isArray(o.half)&&o.half.length)nm.half=o.half;else delete nm.half;return nm;});
    (old.members as RM[]).forEach(o=>{if(o&&o.id&&!cur.members.some(m=>m.id===o.id))members.push(o);});
    let when=at;try{when=new Date(at).toLocaleString(dateLocale(),{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});}catch(e){}
    updateWithHistory({...cur,members,log:addLogEntry(cur,"Restored "+yr+" days to the version from "+when)});flash(V("ttRestored",{d:when}));};

  // Creator = the first member, added from the browser that created the team (it holds the owner key)
  const firstIsCreator=team.members.length===0&&!team.creatorId&&!!getOwner(team.id);
  const startAdd=()=>{if(locked){flash(t.locked);return;}if(team.members.length>=50){flash(t.mx);return;}setAdding(true);setNn("");setNc(null);setNr(null);};
  const confirmAdd=async()=>{
    const n=nn.trim();
    if(!n||!nc)return;
    // The first person the team owner adds is the creator: approver automatically, and a PIN is required.
    // Everyone else may be added with or without a PIN. Teams that already have members are not affected.
    const isCreator=firstIsCreator;
    if((isCreator||nPin.length>0)&&!/^\d{6}$/.test(nPin)){flash(X("pin6"));return;}
    const pinForNew=nPin;
    const teamHasApprover=!!team.approver||team.members.some(x=>x.isApprover);
    const becomeApprover=isCreator?!teamHasApprover:(nIsApprover&&!teamHasApprover);
    const nm={id:gid(),name:n,country:nc,region:nr||null,days:[],pto:null,approved:becomeApprover||!team.approver,isApprover:becomeApprover};
    const co=EU_C.find(c=>c.c===nc);
    const updTeam={...team,members:[...team.members,nm],log:addLogEntry(team,`${n} (${(co&&co.f)||""} ${(co&&co.n)||nc}) joined the team`+(isCreator?" as creator and approver":""))};
    if(becomeApprover&&!team.approver)updTeam.approver=nm.id;
    if(isCreator)updTeam.creatorId=nm.id;
    updateWithHistory(updTeam);
    setAId(nm.id);
    setUnlockedId(nm.id);
    // The PIN is hashed and stored by the server once the new member is saved
    if(pinForNew)(async()=>{await waitIdle(team.id);const r=await teamAuth({op:"set",id:team.id,memberId:nm.id,pin:pinForNew});if(r.ok&&r.token){setToken(team.id,nm.id,r.token);syncReload(team.id,false);}else flash(r.error||"PIN not saved");})();
    setAdding(false);
    setNn("");setNc(null);setNr(null);
    setNPin("");setNIsApprover(false);
    if(mob)setSb(false);
  };
  const del=id=>{
    if(locked)return;
    const target=team.members.find(x=>x.id===id);
    if(!target){return;}
    // If the member has a PIN, require approver or self to delete
    if(hasPinOf(target)){
      const meUnlocked=team.members.find(x=>x.id===unlockedId);
      const meIsApprover=meUnlocked&&(meUnlocked.isApprover||team.approver===meUnlocked.id);
      if(unlockedId!==id&&!meIsApprover){
        flash(X("pinReqDel"));
        return;
      }
    }
    const m=target;updateWithHistory({...team,members:team.members.filter(x=>x.id!==id),log:addLogEntry(team,`${(m&&m.name)||"Member"} was removed`)});if(aId===id)setAId(null);flash(t.mr);};
  const ren=(id,n)=>{if(isPinLocked(id)){flash(X("pinEnter"));return;}setEId(null);const old=team.members.find(x=>x.id===id);updateWithHistory({...team,members:team.members.map(m=>m.id===id?{...m,name:n}:m),log:addLogEntry(team,`${(old&&old.name)||"Member"} renamed to ${n}`)});};
  const setCo=(id,cc)=>{if(isPinLocked(id)){flash(X("pinEnter"));return;}const m=team.members.find(x=>x.id===id);const co=EU_C.find(c=>c.c===cc);updateWithHistory({...team,members:team.members.map(x=>x.id===id?{...x,country:cc}:x),log:addLogEntry(team,`${(m&&m.name)||"Member"} → ${(co&&co.f)||""} ${(co&&co.n)||cc}`)});};
  const setPto=(id,val)=>{if(isPinLocked(id)){flash(X("pinEnter"));return;}updateWithHistory({...team,members:team.members.map(x=>x.id===id?{...x,pto:val||null}:x)});};
  // Day comments (right-click a day): this function was missing, so posting a comment did nothing
  const addComment=(day,text)=>{
    if(locked){flash(t.locked);return;}
    const by=(team.members.find(x=>x.id===(unlockedId||aId))||{}).name||"Guest";
    const c={...(team.comments||{})};c[day]=[...(c[day]||[]),{by,at:new Date().toISOString(),t:String(text).slice(0,280)}];
    updateWithHistory({...team,comments:c,log:addLogEntry(team,`${by} commented on ${day}`)});setCommentText("");
  };
  const setGroup=(id,val)=>{if(isPinLocked(id)){flash(X("pinEnter"));return;}updateWithHistory({...team,members:team.members.map(x=>{if(x.id!==id)return x;const nx={...x};if(val)nx.group=val.slice(0,24);else delete nx.group;return nx;})});};
  const setRegion=(id,val)=>{if(isPinLocked(id)){flash(X("pinEnter"));return;}updateWithHistory({...team,members:team.members.map(x=>x.id===id?{...x,region:val||null}:x)});};
  const tog=(y,m,d)=>{
    const team=teamRef.current;
    if(!aId||locked)return;
    if(isPinLocked(aId)){flash(X("pinEnter"));return;}
    const key=dk(y,m,d);
    const member=team.members.find(function(x){return x.id===aId;});
    if(!member)return;
    const ds=member.days||[];const hs=member.half||[];
    const has=ds.indexOf(key)>=0;const isHalf=hs.indexOf(key)>=0;
    let nd=ds,nh=hs,what;
    if(halfMode){
      // Half-day mode: empty → half day, full → half day, half → removed
      if(has&&isHalf){nd=ds.filter(x=>x!==key);nh=hs.filter(x=>x!==key);what=" removed half day ";}
      else{nd=has?ds:[].concat(ds,[key]);nh=[].concat(hs,[key]);what=" added half day ";}
    }else{
      nd=has?ds.filter(x=>x!==key):[].concat(ds,[key]);nh=has?hs.filter(x=>x!==key):hs;what=has?" removed ":" added ";
    }
    updateWithHistory({...team,members:team.members.map(function(mm){
      if(mm.id!==aId)return mm;
      const nm={...mm,days:nd};if(nh.length||mm.half)nm.half=nh;return nm;
    }),log:addLogEntry(team,(member.name||"Member")+what+key)});
    buzz();
    try{const pc=document.querySelector('[data-ym="'+y+"-"+m+'"] [data-day="'+d+'"]');if(pc){pc.classList.remove("tvp-popd");void (pc as HTMLElement).offsetWidth;pc.classList.add("tvp-popd");setTimeout(()=>pc.classList.remove("tvp-popd"),400);}}catch(e){}
    if(!has){try{const hol=holSetOf(member,y);const before=streaksOf({...member,days:ds},y,hol,!!team.w7).find(st=>st.start<=key&&st.end>=key);
      const after=streaksOf({...member,days:nd},y,hol,!!team.w7).find(st=>st.start<=key&&st.end>=key);
      if(after&&after.leave>=5&&!(before&&before.leave>=5)){const cell=document.querySelector('[data-ym="'+y+"-"+m+'"] [data-day="'+d+'"]');celebrate(cell);flash("🎉 "+V("celebrate",{n:after.length}));}}catch(e){}}
  };
  const setApprover=function(memberId){
    updateWithHistory({...team,approver:memberId||null});
  };
  const toggleMemberApproval=function(memberId){
    var m=team.members.find(function(x){return x.id===memberId;});
    var wasApproved=m&&m.approved;
    updateWithHistory({...team,members:team.members.map(function(mm){
      if(mm.id!==memberId)return mm;
      return{...mm,approved:!wasApproved};
    }),log:addLogEntry(team,(m?m.name:"Member")+(wasApproved?" approval revoked":" approved"))});
  };
  const reorderMember=function(fromIdx,toIdx){if(fromIdx===toIdx)return;var ms=[...team.members];var moved=ms.splice(fromIdx,1)[0];ms.splice(toIdx,0,moved);updateWithHistory({...team,members:ms});};
  const approveAll=function(){
    updateWithHistory({...team,members:team.members.map(function(mm){
      if(mm.id===team.approver)return mm;
      return{...mm,approved:true};
    }),log:addLogEntry(team,"All members approved")});
  };
  const toggleLock=()=>updateWithHistory({...team,locked:!team.locked,log:addLogEntry(team,team.locked?"Board unlocked":"Board locked")});

  const am=team.members.find(m=>m.id===aId);const ai=am?team.members.indexOf(am):-1;const ac=ai>=0?MC[ai%MC.length]:null;
  const allM=Array.from({length:12},(_,i)=>({year:yr,month:i}));

  const[vk,setVk]=useState(0);const views=[{k:"cal",i:"grid",l:t.cal},{k:"heatmap",i:"grid",l:t.heatmap},{k:"timeline",i:"bar",l:t.timeline},{k:"coverage",i:"bar",l:t.coverage},{k:"summary",i:"flag",l:t.summary},{k:"log",i:"edit",l:t.activityLog||"Log"},{k:"analytics",i:"bar",l:t.analytics||"Analytics"},{k:"trips",i:"globe",l:t.trips||"Trips"}];

  // ─── PIN unlock modal ────────────────────────────────────────────
  const tryUnlock = async () => {
    if (pinInput.length !== 6) return;
    const m = team.members.find(x => x.id === pinPrompt);
    if (!m) { setPinPrompt(null); return; }
    if (!hasPinOf(m)) {
      setUnlockedId(m.id);
      setAId(m.id);
      setPinPrompt(null);
      setPinInput("");
      return;
    }
    const r = await teamAuth({ op: "verify", id: team.id, memberId: m.id, pin: pinInput });
    if (r.ok && r.token) setToken(team.id, m.id, r.token);
    if (r.status === 429) { flash(r.error || "Too many tries"); }
    if (r.ok) {
      setUnlockedId(m.id);
      setAId(m.id);
      setPinPrompt(null);
      setPinInput("");
    } else {
      setPinErr(true);
    }
  };
  const pinModalEl = pinPrompt ? (
    <div onClick={()=>setPinPrompt(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div role="dialog" aria-modal="true" aria-label={X("pinTitle")} onClick={e=>e.stopPropagation()} style={{background:th.bg,borderRadius:16,padding:24,width:300,maxWidth:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <TrapScope onClose={()=>{setPinPrompt(null);setPinInput("");setPinErr(false);}}/>
        <div style={{fontSize:15,fontWeight:700,color:th.tx,marginBottom:4,fontFamily:F}}>{X("pinTitle")}</div>
        <div style={{fontSize:11,color:th.t3,marginBottom:16,fontFamily:F}}>{(team.members.find(x=>x.id===pinPrompt)||{}).name}</div>
        <input autoFocus type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pinInput} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,6);setPinInput(v);setPinErr(false);}} onKeyDown={e=>{if(e.key==="Enter")tryUnlock();if(e.key==="Escape")setPinPrompt(null);}} style={{width:"100%",padding:"12px",borderRadius:10,border:"2px solid "+(pinErr?"#EF4444":th.ac),fontSize:18,fontFamily:FM,color:th.tx,background:th.sf,outline:"none",letterSpacing:8,textAlign:"center"}} placeholder="______"/>
        {pinErr&&<div style={{color:"#EF4444",fontSize:11,fontWeight:600,marginTop:6,textAlign:"center",fontFamily:F}}>{X("pinWrong")}</div>}
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button onClick={tryUnlock} disabled={pinInput.length!==6} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:pinInput.length===6?th.ac:th.t3,color:"#fff",fontSize:13,fontWeight:700,fontFamily:F,cursor:pinInput.length===6?"pointer":"not-allowed",opacity:pinInput.length===6?1:0.5}}>{X("unlock")}</button>
          {getOwner(team.id)&&pinPrompt!==team.creatorId&&<button onClick={async()=>{const who=(team.members.find(x=>x.id===pinPrompt)||{}).name||"";if(!window.confirm(X("ownerResetQ",{n:who})))return;await waitIdle(team.id);const r=await teamAuth({op:"reset",id:team.id,memberId:pinPrompt,owner:getOwner(team.id)});if(r.ok){flash(X("ownerResetDone",{n:who}));syncReload(team.id,false);setPinPrompt(null);setPinInput("");}else flash(r.error||"Not reset");}} style={{padding:"10px 12px",borderRadius:10,border:"1px solid #FECACA",background:"transparent",color:"#B91C1C",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer"}}>{X("ownerReset")}</button>}
          <button onClick={()=>{setPinPrompt(null);setPinInput("");setPinErr(false);}} style={{padding:"10px 16px",borderRadius:10,border:"1px solid "+th.bd,background:"transparent",color:th.t2,fontSize:13,fontWeight:600,fontFamily:F,cursor:"pointer"}}>{X("cancel")}</button>
        </div>
      </div>
    </div>
  ) : null;

  // ─── Set-PIN modal (for legacy members opting in) ────────────────
  const savePin = async () => {
    if (newPinInput.length !== 6) return;
    if (newPinInput !== confirmPinInput) return;
    await waitIdle(team.id);
    const r = await teamAuth({ op: "set", id: team.id, memberId: setPinFor, pin: newPinInput, token: getTokens(team.id)[setPinFor], owner: getOwner(team.id) || undefined });
    if (!r.ok) { flash(r.error || "PIN not saved"); return; }
    if (r.token) setToken(team.id, setPinFor, r.token);
    syncReload(team.id, false);
    setUnlockedId(setPinFor);
    setSetPinFor(null);
    setNewPinInput("");
    setConfirmPinInput("");
    flash(X("pinSet"));
  };
  const setPinModalEl = setPinFor ? (
    <div onClick={()=>{setSetPinFor(null);setNewPinInput("");setConfirmPinInput("");}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div role="dialog" aria-modal="true" aria-label={X("setPin")} onClick={e=>e.stopPropagation()} style={{background:th.bg,borderRadius:16,padding:24,width:320,maxWidth:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <TrapScope onClose={()=>{setSetPinFor(null);setNewPinInput("");setConfirmPinInput("");}}/>
        <div style={{fontSize:15,fontWeight:700,color:th.tx,marginBottom:4,fontFamily:F}}>{X("setPin")}</div>
        <div style={{fontSize:11,color:th.t3,marginBottom:16,fontFamily:F,lineHeight:1.4}}>{X("pinProtect",{n:(team.members.find(x=>x.id===setPinFor)||{}).name||""})}</div>
        <input autoFocus type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={newPinInput} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,6);setNewPinInput(v);}} placeholder="6-digit PIN" style={{width:"100%",padding:"12px",borderRadius:10,border:"2px solid "+(newPinInput.length===6?"#10B981":th.bd),fontSize:18,fontFamily:FM,color:th.tx,background:th.sf,outline:"none",letterSpacing:8,textAlign:"center",marginBottom:8}}/>
        <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={confirmPinInput} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,6);setConfirmPinInput(v);}} onKeyDown={e=>{if(e.key==="Enter")savePin();if(e.key==="Escape"){setSetPinFor(null);setNewPinInput("");setConfirmPinInput("");}}} placeholder={X("confirmPin")} style={{width:"100%",padding:"12px",borderRadius:10,border:"2px solid "+(confirmPinInput.length===6&&confirmPinInput===newPinInput?"#10B981":th.bd),fontSize:18,fontFamily:FM,color:th.tx,background:th.sf,outline:"none",letterSpacing:8,textAlign:"center"}}/>
        {confirmPinInput.length===6&&confirmPinInput!==newPinInput&&<div style={{color:"#EF4444",fontSize:11,fontWeight:600,marginTop:6,textAlign:"center",fontFamily:F}}>{X("pinMismatch")}</div>}
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button onClick={savePin} disabled={newPinInput.length!==6||newPinInput!==confirmPinInput} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:newPinInput.length===6&&newPinInput===confirmPinInput?th.ac:th.t3,color:"#fff",fontSize:13,fontWeight:700,fontFamily:F,cursor:newPinInput.length===6&&newPinInput===confirmPinInput?"pointer":"not-allowed",opacity:newPinInput.length===6&&newPinInput===confirmPinInput?1:0.5}}>{X("savePin")}</button>
          <button onClick={()=>{setSetPinFor(null);setNewPinInput("");setConfirmPinInput("");}} style={{padding:"10px 16px",borderRadius:10,border:"1px solid "+th.bd,background:"transparent",color:th.t2,fontSize:13,fontWeight:600,fontFamily:F,cursor:"pointer"}}>{X("cancel")}</button>
        </div>
      </div>
    </div>
  ) : null;

  return <div style={{minHeight:"100vh",background:th.bg,fontFamily:F,display:"flex",flexDirection:"column"}}>
    <header className="tvp-hdr" style={{background:th.gbg,borderBottom:`1px solid ${th.gbd}`,padding:"0 12px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={onGoHome} aria-label="Home" style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><Ic n="home" s={18} c={th.t2}/></button>
        {mob&&<button onClick={()=>setSb(!sb)} aria-label="Team members" aria-expanded={sb} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><Ic n="users" s={18} c={th.t2}/></button>}
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <TeamLogo team={team} th={th} size={26} editable locked={locked} onChange={v=>{const nt={...team,log:addLogEntry(team,v?"Team logo updated":"Team logo removed")};if(v)nt.logo=v;else delete nt.logo;updateWithHistory(nt);}}/>
            <h1 style={{margin:0,fontSize:15,fontWeight:700,color:th.tx,letterSpacing:-.3,viewTransitionName:"tvp-team-name"}}>{team.name}</h1>
            {locked&&<Ic n="lock" s={13} c={th.wm}/>}
          </div>
          <div style={{fontSize:10,color:th.t3,display:"flex",alignItems:"center",gap:4}}><YearNav yr={yr} onYear={onYear} th={th} small/><span>· {team.members.length} {team.members.length!==1?t.mbs:t.mb}</span></div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:3,minWidth:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
        {!mob&&<ThPk theme={theme} set={setTheme} th={th}/>}
        {!mob&&<Fragment><svg width="22" height="22" viewBox="0 0 22 22" style={{flexShrink:0}}><circle cx="11" cy="11" r="9" fill="none" stroke={th.gbd} strokeWidth="2.5"/><circle cx="11" cy="11" r="9" fill="none" stroke={th.ac} strokeWidth="2.5" strokeDasharray={Math.round((new Date()-new Date(yr,0,1))/(365.25*864e5)*56.5)+" 56.5"} strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"11px 11px"}}/></svg><div style={{display:"flex",alignItems:"center",gap:3,padding:"3px 7px",background:th.al,borderRadius:16,cursor:"pointer",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"}} onClick={()=>{try{navigator.clipboard.writeText(team.id)}catch(e){};flash(t.cp);}}><Ic n="copy" s={10} c={th.ac}/><span style={{fontSize:9,fontWeight:700,color:th.ac,fontFamily:FM}}>{team.id.slice(0,8)}</span></div></Fragment>}
        <LangDrop lang={lang} set={setLang} th={th}/>
        <button onClick={()=>setSettings(!settings)} aria-label="Settings" aria-expanded={settings} title="Settings" style={{background:"none",border:"none",cursor:"pointer",padding:3,display:"flex"}}><Ic n="globe" s={15} c={th.t2}/></button>
        {!mob&&<div style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",background:"rgba(139,92,246,.1)",borderRadius:10}}><span style={{width:6,height:6,borderRadius:"50%",background:"#22C55E",animation:"pulse 2s 3"}}></span><span style={{fontSize:9,fontWeight:600,color:"#6D28D9",fontFamily:FM}}>{t.live||"Live"}</span></div>}
        {false&&<button type="button" className="v3-inbox-btn" onClick={()=>setShowInbox(true)} aria-label={V("inboxBadge",{n:pendN})} title={V("inbox")} style={{color:th.ac,background:th.al,borderColor:th.gbd||th.bd}}>✓{!mob&&<span>{V("inbox")}</span>}{pendN>0&&<b>{pendN}</b>}</button>}
        <Btn th={th} v="secondary" sz="sm" icon="share" onClick={()=>setShowSh(true)}>{mob?"":t.sh}</Btn>
        <CoffeeButton lang={lang} iconOnly={mob}/>

      </div>
      <i className="tvp-progress" aria-hidden="true" style={{background:th.ac}}/>
    </header>

    {settings&&<div style={{background:th.gbg,borderBottom:`1px solid ${th.gbd}`,padding:"8px 14px",display:"flex",gap:10,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,flexWrap:"wrap",justifyContent:"center",alignItems:"center"}}>
      <ThPk theme={theme} set={setTheme} th={th}/>
      <div style={{display:"flex",gap:2,alignItems:"center"}}>{["#4F46E5","#1D4ED8","#0F766E","#15803D","#B45309","#DC2626","#BE185D","#475569"].map(function(col){return <button key={col} aria-label={"Accent colour "+col} aria-pressed={team.accentColor===col} onClick={function(){updateWithHistory({...team,accentColor:col});}} style={{width:12,height:12,borderRadius:"50%",background:col,border:team.accentColor===col?"2px solid #fff":"1px solid transparent",cursor:"pointer",boxShadow:team.accentColor===col?"0 0 0 1.5px "+col:"none",padding:0}}/>;})}</div>
      <div style={{width:1,height:20,background:th.bd}}/>
      <LangDrop lang={lang} set={setLang} th={th}/>
      <div style={{width:1,height:20,background:th.bd}}/>
      <Btn th={th} v="ghost" sz="sm" onClick={undo} disabled={!historyRef.current.length} style={{fontSize:11}}>↩ {X("undo")}</Btn>
      <Btn th={th} v="ghost" sz="sm" onClick={redo} disabled={!redoRef.current.length} style={{fontSize:11}}>↪ {X("redo")}</Btn>
      <Btn th={th} v="ghost" sz="sm" icon={null} disabled={false} onClick={()=>setShowTT(true)} style={{fontSize:11}}>⏳ {V("tt")}</Btn>
      <div style={{width:1,height:20,background:th.bd}}/>
      {isAdmin&&<Btn th={th} v="ghost" sz="sm" icon={locked?"unlock":"lock"} onClick={toggleLock}>{locked?t.unlock:t.lock}</Btn>}
      <Btn th={th} v="ghost" sz="sm" icon="download" onClick={()=>R("generatePDFReport")(team,t)}>{t.pdf}</Btn>
      <Btn th={th} v="ghost" sz="sm" icon="download" onClick={()=>downloadTeamICS(team)}>Team .ics</Btn>
      <Btn th={th} v="ghost" sz="sm" icon="download" onClick={()=>exportCSV(team,t)}>CSV</Btn>
      <Btn th={th} v="ghost" sz="sm" icon="download" onClick={()=>exportXLSX(team,t)}>Excel</Btn>
      {approvalMode&&am&&am.approved===true&&(am.days||[]).length>0&&<Btn th={th} v="ghost" sz="sm" icon="check" onClick={()=>R("generateApprovedPDF")(team,t)} style={{color:"#10B981",borderColor:"#10B98140"}}>{t.approvedPdf}</Btn>}
      <Btn th={th} v="ghost" sz="sm" onClick={()=>setShowCSVImport(true)}>Import</Btn>
      <label title={X("carryTitle")} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:th.t2,fontWeight:600}}>{X("carryUpTo")}
        <input type="number" min="0" max="60" value={team.carryMax||0} onChange={e=>{const v=Math.max(0,Math.min(60,parseInt(e.target.value)||0));const nt={...team};if(v)nt.carryMax=v;else delete nt.carryMax;updateWithHistory(nt);}} style={{width:44,padding:"2px 4px",border:"1px solid "+th.gbd,borderRadius:4,background:th.sf,color:th.tx,fontSize:11}}/> {X("days")}</label>
      {getOwner(team.id)?<button onClick={async()=>{const link=window.location.origin+"/#team="+team.id+"&owner="+getOwner(team.id);try{await navigator.clipboard.writeText(link);flash(X("ownerCopied"));}catch(e){window.prompt(X("ownerLink"),link);}}} title={X("ownerLinkHint")} style={{padding:"4px 10px",borderRadius:20,border:"1px solid #A7F3D0",background:"#ECFDF5",color:"#047857",fontSize:11,fontWeight:700,fontFamily:F,cursor:"pointer"}}>★ {X("ownerYou")} · {X("ownerLink")}</button>:(team.hasOwner?<span style={{fontSize:11,color:th.t3}}>{X("ownerOther")}</span>:null)}
      {onDeleteForever&&(!team.hasOwner||getOwner(team.id))&&<Btn th={th} v="ghost" sz="sm" onClick={()=>{setDelText("");setDelOpen(true);}} style={{color:"#DC2626",borderColor:"#FECACA"}}>{NY.delBtn}</Btn>}
      <div style={{width:1,height:20,background:th.bd}}/>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:th.t2}}>
        <span style={{fontWeight:600}}>{t.alertLabel}</span>
        <select aria-label={t.alertLabel} value={threshold} onChange={function(e){var v=parseInt(e.target.value);setThreshold(v);updateWithHistory({...team,threshold:v});}} style={{padding:"2px 6px",border:"1px solid "+th.bd,borderRadius:4,background:th.sf,color:th.tx,fontSize:11,fontFamily:FM}}>
          <option value={2}>2+</option><option value={3}>3+</option><option value={4}>4+</option><option value={5}>5+</option>
        </select>
      </div>

    </div>}

    {/* View tabs */}
    {!mob&&<div style={{background:th.gbg,borderBottom:`1px solid ${th.gbd}`,padding:"6px 14px",display:"flex",gap:3,overflowX:"auto",backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      {views.map(v=> <button key={v.k} onClick={()=>{if(v.k===view)return;withTransition(()=>flushSync(()=>{setView(v.k);setVk(function(p){return p+1;});}));}} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:600,fontFamily:F,cursor:"pointer",border:v.k===view?(v.k==="trips"?"1.5px solid #D97706":`1.5px solid ${th.ac}`):`1px solid transparent`,background:v.k===view?(v.k==="trips"?"#FAEEDA":th.al):"transparent",color:v.k===view?(v.k==="trips"?"#D97706":th.ac):th.t3,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}><Ic n={v.i} s={12} c={v.k===view?(v.k==="trips"?"#D97706":th.ac):th.t3}/>{v.l}</button>)}
      {canApprove&&<button type="button" className="v3-ap-tab" aria-pressed={view==="approvals"} aria-label={V("inboxBadge",{n:pendN})} onClick={()=>{if(view==="approvals")return;withTransition(()=>flushSync(()=>{setView("approvals");setVk(function(p){return p+1;});}));}}>✓ {V("inbox")}{pendN>0&&<b>{pendN}</b>}</button>}
    </div>}

    <div style={{display:"flex",flex:1,overflow:"clip"}}>
      {sb&&<aside aria-label="Team members" style={{width:mob?"100%":240,minWidth:mob?"100%":240,background:th.gbg,borderInlineEnd:mob?"none":`1px solid ${th.gbd}`,display:"flex",flexDirection:"column",position:mob?"fixed":"relative",backdropFilter:G.blur,WebkitBackdropFilter:G.blur,top:mob?56:0,insetInlineStart:0,bottom:0,zIndex:mob?90:1,boxShadow:mob?"4px 0 24px rgba(0,0,0,.1)":"none"}}>
        <div style={{padding:"12px 12px 4px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,fontWeight:700,color:th.t3,textTransform:"uppercase",letterSpacing:1}}>{t.tm}</span><span style={{fontSize:10,color:th.t3,fontFamily:FM}}>{team.members.length}/25</span></div>
        {/* Add Member button — TOP of sidebar */}
        <div style={{padding:"4px 8px 6px",display:"flex",flexDirection:"column",gap:4}}>
          {!locked&&!adding&&<Btn th={th} sz="sm" icon="plus" onClick={startAdd} disabled={team.members.length>=50} style={{width:"100%",justifyContent:"center"}}>{t.am}</Btn>}
          {!locked&&!adding&&team.members.length<50&&<button onClick={()=>setShowCSVImport(true)} style={{width:"100%",marginTop:4,padding:"6px 8px",border:"none",background:"none",color:th.t2,fontSize:12,fontWeight:600,fontFamily:F,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>{X("several")}</button>}
          {(()=>{const am=team.members.find(x=>x.id===aId);if(!am||hasPinOf(am))return null;return <button onClick={()=>{setSetPinFor(am.id);setNewPinInput("");setConfirmPinInput("");}} style={{width:"100%",padding:"7px 10px",borderRadius:10,border:"1.5px solid #F59E0B",background:"rgba(254,243,199,0.5)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontFamily:F,fontSize:11,fontWeight:700,color:"#92400E",marginTop:4}}><Ic n="lock" s={12} c="#92400E"/> Set PIN to protect</button>;})()}
          <button onClick={function(){setHolBr(true);if(mob)setSb(false);}} style={{width:"100%",padding:"7px 10px",borderRadius:10,border:"none",background:"linear-gradient(135deg, #F59E0B, #EF4444)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontFamily:F,fontSize:11,fontWeight:700,color:"#fff",boxShadow:"0 2px 8px rgba(245,158,11,0.3)"}}><Ic n="flag" s={12} c="#fff"/> {t.ch}</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"2px 8px 8px",display:"flex",flexDirection:"column",gap:1}}>
          {adding&&<div style={{padding:"6px 2px",display:"flex",flexDirection:"column",gap:5,marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:th.al,borderRadius:8,border:`1.5px solid ${th.ac}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:MC[team.members.length%MC.length].d,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{nn.trim()?nn.trim()[0].toUpperCase():"?"}</div>
              <input autoFocus value={nn} onChange={e=>setNn(e.target.value)} placeholder={t.en2} onKeyDown={e=>{if(e.key==="Enter"&&nn.trim()&&nc)confirmAdd();if(e.key==="Escape"){setAdding(false);}}} maxLength={30} style={{flex:1,border:"none",background:"transparent",fontSize:13,fontWeight:600,fontFamily:F,color:th.tx,outline:"none",padding:"2px 0"}}/>
            </div>
            <CountrySelect value={nc} onChange={function(v){setNc(v);setNr(null);}} th={th} t={t}/>
            {nc && REGIONS[nc] && <select value={nr||""} onChange={function(e){setNr(e.target.value||null);}} style={{width:"100%",padding:"10px 12px",borderRadius:G.rXs,border:"1px solid "+th.gbd,background:th.sf,color:th.tx,fontSize:14,fontFamily:F,marginTop:6}}>
              <option value="">{defaultRegionName(nc)?V("regDefault",{r:defaultRegionName(nc)}):(t.natOnly||"National only")}</option>
              {REGIONS[nc].map(function(r){return <option key={r.id} value={r.id}>{r.n}</option>;})}
            </select>}
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={nPin} onChange={e=>{const v=e.target.value.replace(/\D/g,"").slice(0,6);setNPin(v);}} placeholder={firstIsCreator?V("pinReq"):V("pinOpt")} aria-label={firstIsCreator?V("pinReq"):V("pinOpt")} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${nPin.length===6?"#10B981":th.bd}`,fontSize:13,fontFamily:F,color:th.tx,background:th.bg,outline:"none",letterSpacing:6,textAlign:"center"}}/>
            {firstIsCreator&&<div style={{fontSize:11,fontWeight:600,color:th.ac,background:th.al,borderRadius:8,padding:"6px 10px",lineHeight:1.35}}>👑 {V("creatorHint")}</div>}
            {!firstIsCreator&&!team.approver&&!team.members.some(x=>x.isApprover)&&<label style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",cursor:"pointer",fontSize:11,fontWeight:600,color:th.t2}}><input type="checkbox" checked={nIsApprover} onChange={e=>setNIsApprover(e.target.checked)} style={{width:14,height:14,accentColor:th.ac,cursor:"pointer"}}/>Approver (can manage all members)</label>}
            <div style={{display:"flex",gap:4}}><Btn th={th} sz="sm" onClick={confirmAdd} disabled={!nn.trim()||!nc||(firstIsCreator?nPin.length!==6:(nPin.length>0&&nPin.length!==6))} icon="check" style={{flex:1,justifyContent:"center"}}>{t.add}</Btn><Btn th={th} v="ghost" sz="sm" onClick={()=>{setAdding(false);setNn("");setNc(null);setNr(null);setNPin("");setNIsApprover(false);}}>{t.can}</Btn></div>
          </div>}
          {team.members.map((m,i)=> <MRow key={m.id} member={m} index={i} dragIdx={i} onDragStart={()=>setDragMIdx(i)} onDragOver={(e)=>{e.preventDefault();setDragOverIdx(i);}} onDrop={()=>{if(dragMIdx!==null)reorderMember(dragMIdx,i);setDragMIdx(null);setDragOverIdx(null);}} onDragEnd={()=>{setDragMIdx(null);setDragOverIdx(null);}} isDragOver={dragOverIdx===i} isDragging={dragMIdx===i} th={th} t={t} locked={locked} isActive={m.id===aId} isEditing={m.id===eId} onClick={()=>{
              if(m.id===aId){setAId(null);return;}
              const meUnlocked=team.members.find(x=>x.id===unlockedId);
              const meIsAppr=meUnlocked&&(meUnlocked.isApprover||team.approver===meUnlocked.id);
              if(hasPinOf(m)&&unlockedId!==m.id&&!meIsAppr){setPinPrompt(m.id);setPinInput("");setPinErr(false);return;}
              setAId(m.id);
              if(mob)setSb(false);
            }} onDelete={()=>del(m.id)} onStartRename={()=>setEId(m.id)} onFinishRename={n=>ren(m.id,n)} onCountryChange={cc=>setCo(m.id,cc)} onPtoChange={v=>setPto(m.id,v)} onRegionChange={v=>setRegion(m.id,v)} onGroupChange={v=>setGroup(m.id,v)} yr={yr} onExportICS={()=>downloadICS(m,team.name)} onOptimize={()=>setShowOptimizer(m.id)} approvalMode={approvalMode} isApprover={team.approver===m.id} onSetApprover={()=>setApprover(m.id===team.approver?null:m.id)} allMembers={team.members} onToggleMemberApproval={toggleMemberApproval} onApproveAllMembers={approveAll}/>)}
          {team.members.length===0&&!adding&&<div style={{textAlign:"center",padding:"20px 12px",color:th.t3,fontSize:13}}><div style={{fontSize:28,marginBottom:6}}>🏖️</div>{t.es2}</div>}
        </div>
      </aside>}

      <main key={view} className="tvp-fade tvp-main" style={{flex:1,overflow:view==="cal"?"visible":"auto",minWidth:0,padding:mob?"14px 10px 80px":"20px 28px"}}>
        {/* Mobile action strip — visible only on portrait mobile */}
        {mob&&!sb&&<div style={{marginBottom:10,display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
            {!locked&&<button onClick={()=>{setSb(true);setTimeout(startAdd,150);}} style={{padding:"6px 12px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${th.ac},#6366F1)`,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:F,fontSize:11,fontWeight:700,color:"#fff",boxShadow:"0 2px 8px rgba(124,58,237,0.25)",whiteSpace:"nowrap"}}><Ic n="plus" s={12} c="#fff"/>{t.am}</button>}
            <button onClick={()=>setHolBr(true)} style={{padding:"6px 12px",borderRadius:10,border:"none",background:"linear-gradient(135deg, #F59E0B, #EF4444)",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:F,fontSize:11,fontWeight:700,color:"#fff",boxShadow:"0 2px 8px rgba(245,158,11,0.25)",whiteSpace:"nowrap"}}><Ic n="flag" s={12} c="#fff"/>{t.ch}</button>
            <button onClick={()=>setSb(true)} style={{padding:"6px 10px",borderRadius:10,border:`1px solid ${th.bd}`,background:th.sf,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:F,fontSize:11,fontWeight:600,color:th.t2,whiteSpace:"nowrap"}}><Ic n="users" s={12} c={th.t2}/>{team.members.length}/25</button>
          </div>
          {team.members.length>0&&<div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
            {team.members.map((m,i)=>{const active=m.id===aId;return <button key={m.id} onClick={()=>setAId(active?null:m.id)} style={{padding:"4px 10px",borderRadius:20,border:active?`2px solid ${MC[i%MC.length].d}`:`1px solid ${th.bd}`,background:active?MC[i%MC.length].d+"18":th.sf,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:F,fontSize:11,fontWeight:active?700:500,color:active?MC[i%MC.length].d:th.t2,whiteSpace:"nowrap",flexShrink:0}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:MC[i%MC.length].d,flexShrink:0}}/>
              {m.name}
              {(m.days||[]).length>0&&<span style={{fontSize:9,fontWeight:700,color:active?MC[i%MC.length].d:th.t3,fontFamily:FM}}>{(m.days||[]).length}d</span>}
            </button>;})}
          </div>}
        </div>}
        {/* Conflict alerts */}
        {view==="cal"&&<TodayTiles team={team} yr={yr} th={th} colorOf={colorOf} holOf={holOf} holInfo={holInfoCb} active={am||null} threshold={threshold} showWrapped={wrOk} onWrapped={()=>setShowWr(true)} onPick={id=>setAId(id)}/>}
        {view==="cal"&&<ConflictAlerts team={team} threshold={threshold} th={th} t={t}/>}
        <datalist id="tvp-groups">{([...new Set(team.members.map(m=>m.group).filter(Boolean))] as string[]).map(g=><option key={g} value={g}/>)}</datalist>

        {/* Legend at top */}
        {team.members.length>0&&view==="cal"&&<div style={{marginBottom:10,padding:"8px 12px",background:th.gbg,borderRadius:G.rXs,border:`1px solid ${th.gbd}`,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {team.members.map((m,i)=>{const c=MC[i%MC.length];const co=m.country?EU_C.find(x=>x.c===m.country):null;
              return <div key={m.id} onClick={()=>setAId(m.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 7px",background:aId===m.id?c.b:th.sh,borderRadius:14,fontSize:10,fontWeight:500,color:c.t,cursor:"pointer",border:aId===m.id?`1.5px solid ${c.d}40`:"1.5px solid transparent"}}><div style={{width:6,height:6,borderRadius:"50%",background:c.d}}/>{co?co.f+" ":""}{m.name} ({fmtDays(usedOf(m))})</div>;})}
            <div style={{display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:14,fontSize:10,color:th.ht,background:th.hc}}><div style={{width:6,height:6,borderRadius:3,background:th.ht}}/> {t.holiday}</div>
          </div>
        </div>}

        {view==="cal"&&am&&<div style={{background:ac.b,borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:8,border:`1px solid ${ac.d}30`,flexWrap:"wrap",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:ac.d,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:700}}>{am.name[0].toUpperCase()}</div>
            <span style={{fontSize:12,fontWeight:600,color:ac.t}}>{t.ed}: {am.name}</span>
            <span style={{fontSize:11,color:ac.t,opacity:.7}}>{t.tap}</span>
          </div>
          <button onClick={()=>setHalfMode(h=>!h)} aria-pressed={halfMode} title={X("halfTitle")} style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid "+ac.d,background:halfMode?ac.d:"transparent",color:halfMode?"#fff":ac.t,fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer",whiteSpace:"nowrap"}}>{halfMode?X("halfOn"):X("halfDay")}</button>
          <button onClick={()=>{setAId(null);setHalfMode(false);flash(am.name+": "+fmtDays(usedOf(am))+" "+((usedOf(am)===1)?t.dy:t.dys));}} style={{padding:"6px 16px",borderRadius:20,border:"none",background:ac.d,color:"#fff",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px "+ac.d+"40",whiteSpace:"nowrap"}}><Ic n="check" s={14} c="#fff"/>Done · {fmtDays(usedOf(am))} {(usedOf(am)===1)?t.dy:t.dys}</button>
        </div>}

        {/* Holiday Clash Warning */}
        {view==="cal"&&am&&(()=>{const clashes=detectHolidayClashes(am,yr);if(!clashes.length) return null;
          return <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:8,padding:"10px 14px",marginBottom:10,display:"flex",flexDirection:"column",gap:4}}>
            <div style={{fontSize:12,fontWeight:700,color:"#92400E",display:"flex",alignItems:"center",gap:6}}>🟡 {clashes.length} vacation day{clashes.length>1?"s":""} on public holidays</div>
            <div style={{fontSize:11,color:"#92400E",lineHeight:1.6}}>
              {clashes.map(c=> <div key={c.date}><strong>{c.date.slice(5)}</strong> is <strong>{c.name}</strong> in {c.country} — you don't need a vacation day</div>)}
            </div>
            <button onClick={()=>{const holDates=clashes.map(c=>c.date);const newDays=am.days.filter(d=>!holDates.includes(d));updateWithHistory({...team,members:team.members.map(m=>m.id===am.id?{...m,days:newDays}:m)});flash(`Removed ${clashes.length} holiday clash${clashes.length>1?"es":""}`);}}
              style={{alignSelf:"flex-start",padding:"4px 12px",borderRadius:6,border:"1px solid #FCD34D",background:"#FEF3C7",color:"#92400E",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,marginTop:2}}>
              Remove {clashes.length} wasted day{clashes.length>1?"s":""}
            </button>
          </div>;
        })()}

        <NextYearPrompt team={team} yr={yr} onYear={onYear} th={th} lang={lang}/>
        {!(view==="cal"&&yr===CY)&&<WhosOutBanner team={rawTeam||team} th={th} t={t}/>}
        <ComingUp team={rawTeam||team} th={th} lang={lang}/>
        {view==="cal"&&!am&&team.members.length>0&&!locked&&<div style={{background:th.al,borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:12,color:th.ac,fontWeight:500}}>{t.sel}</div>}
        {view==="cal"&&locked&&<div style={{background:th.wl,borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:12,color:"#92400E",fontWeight:500,display:"flex",alignItems:"center",gap:6}}><Ic n="lock" s={14} c="#92400E"/>{t.locked}</div>}

        {view==="cal"&&team.members.length>1&&<div style={{display:"flex",flexWrap:"wrap",gap:3,justifyContent:"center",marginBottom:8,padding:"5px 8px",background:th.gbg,borderRadius:8,border:"1px solid "+th.gbd}}>{team.members.map(function(m,i){var mc=MC[i%MC.length];var act=m.id===aId;return <button key={m.id} onClick={function(){setAId(m.id===aId?null:m.id);}} style={{display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:5,border:act?"1.5px solid "+mc.d:"1px solid transparent",background:act?mc.b:"transparent",cursor:"pointer",fontSize:10,fontWeight:600,color:act?mc.t:th.t2,fontFamily:F}}><span style={{width:7,height:7,borderRadius:"50%",background:mc.d}}/>{m.name}</button>;})}</div>}
        {/* Export Pill Bar */}
        {view==="cal"&&team.members.length>0&&<div style={{padding:"8px 14px",background:th.sf,borderRadius:G.rXs,border:"1px solid "+th.bd,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",marginBottom:12}}>
          <span style={{fontSize:10,fontWeight:700,color:th.t3,marginRight:2}}>EXPORT:</span>
          <button onClick={function(){R("generatePDFReport")(team,t)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>{t.pdf}</button>
          <button onClick={function(){downloadTeamICS(team)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>Team .ics</button>
          <button onClick={function(){exportXLSX(team,t)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>Excel</button>
          <button onClick={function(){exportCSV(team,t)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>CSV</button>
          <button onClick={function(){var tsv=generateTSV(team,t);var blob=new Blob([tsv],{type:"text/tab-separated-values"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download=fileBase(team.name)+"_vacations.tsv";a.click();URL.revokeObjectURL(url);}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>TSV</button>
          <button onClick={function(){setShowSh(true)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="share" s={10} c={th.ac}/>Share / QR</button>
          <button onClick={function(){R("printReport")(team,t)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>{t.printBtn}</button>
          <button onClick={function(){setShowCSVImport(true)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>Import</button>
          {approvalMode&&am&&am.approved===true&&(am.days||[]).length>0&&<button onClick={function(){R("generateApprovedPDF")(team,t)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid #A7F3D0",background:"#ECFDF5",cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:700,color:"#059669",display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="check" s={10} c="#059669"/>{t.approvedPdf||"Approved PDF"}</button>}
        </div>}

        {view==="cal"&&team.members.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40,marginBottom:12}}>🌴</div><h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:700,color:th.tx}}>{t.et}</h2><p style={{margin:"0 0 20px",fontSize:14,color:th.t2,lineHeight:1.5}}>{t.es2}</p><Btn th={th} icon="plus" onClick={()=>{setSb(true);setTimeout(startAdd,150);}}>{t.af}</Btn></div>}

        {view==="cal"&&<Fragment>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:14}}>
            <YearNav yr={yr} onYear={onYear} th={th}/>
            <div style={{display:"flex",gap:2,justifyContent:"center"}}>
              {[{l:"Year",v:null},{l:"Q1",v:0},{l:"Q2",v:1},{l:"Q3",v:2},{l:"Q4",v:3}].map(q=>
                <button key={q.l} onClick={()=>setQuarter(q.v)} style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:600,fontFamily:F,cursor:"pointer",border:quarter===q.v?`1.5px solid ${th.ac}`:`1px solid ${th.gbd}`,background:quarter===q.v?th.al:th.gbg,color:quarter===q.v?th.ac:th.t3,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>{q.l}</button>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":quarter!==null?"repeat(3,1fr)":"repeat(3,1fr)",gap:mob?10:14}}>
            {allM.filter(({month})=>quarter===null||Math.floor(month/3)===quarter).map(({year,month})=> <Cal key={month} year={year} month={month} members={team.members} activeId={locked?null:aId} onToggle={tog} compact={mob&&quarter===null} th={th} t={t} holSet={holSet} w7={team.w7} approvalMode={approvalMode} team={team} setCommentDay={setCommentDay} holInfo={holInfo} lang={lang}/>)}
          </div>
        </Fragment>}

        {view==="heatmap"&&<HeatmapView team={team} th={th} t={t} holSet={holSet}/>}
        {view==="timeline"&&<TimelineView team={team} th={th} t={t}/>}
        {view==="coverage"&&<CoverageView team={team} th={th} t={t}/>}
        {view==="log"&&<Fragment>
          <button type="button" className="v3-tt-cta" onClick={()=>setShowTT(true)} style={{color:th.tx,background:th.gbg,borderColor:th.gbd}}><span aria-hidden="true">⏳</span><span><b>{V("tt")}</b><small style={{color:th.t2}}>{V("ttSub")}</small></span></button>
          <ChangeLogView team={team} th={th} t={t}/>
        </Fragment>}
        {view==="summary"&&<Fragment>
          {wrOk&&<button type="button" className="v3-tile v3-t-wrap v3-wrap-banner" onClick={()=>setShowWr(true)}><span className="v3-t-wrap-k">✨ {V("wrCta",{y:yr})}</span><span className="v3-t-wrap-s">{V("wrCtaSub")}</span></button>}
          <h3 style={{margin:"0 0 14px",fontSize:16,fontWeight:700,color:th.tx}}>{t.tv} — {yr}</h3>
          {(()=>{const countries=new Set();team.members.forEach(m=>{if(m.country)countries.add(m.country);});
            if(!countries.size) return <div style={{color:th.t3,fontSize:13,textAlign:"center",padding:30}}>{X("noCountries")}</div>;
            const allH={};[...countries].forEach(cc=>computeHolidays(cc,yr).forEach(h=>{if(!allH[h])allH[h]=[];allH[h].push(cc);}));
            const dates=Object.keys(allH).sort();
            return <div style={{display:"flex",flexDirection:"column",gap:6}}>{dates.map(d=>{const p=pk(d);const dow=new Date(p.y,p.m,p.d).toLocaleDateString(dateLocale(),{weekday:"short"});const affected=team.members.filter(m=>(allH[d]||[]).includes(m.country));
              return <div key={d} style={{background:th.sf,borderRadius:6,border:`1px solid ${th.bd}`,padding:"8px 12px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{minWidth:36,textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:th.ht,fontFamily:F}}>{p.d}</div><div style={{fontSize:9,color:th.t3,fontWeight:600}}>{t.M[p.m].slice(0,3)}</div></div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:th.tx}}>{(()=>{const info=holInfo(d);if(!info.length)return holName(d);const nm=g=>(lang==="en"&&g.en)?g.en:g.local;const many=new Set(info.map(g=>g.cc)).size>1||countries.size>1;return info.map(g=>(many?g.cc+" ":"")+nm(g)).join(" · ");})()}</div><div style={{fontSize:10,color:th.t3}}>{dow} — {affected.map(m=>m.name).join(", ")}</div></div>
              </div>;})}</div>;
          })()}
        </Fragment>}
        {view==="approvals"&&canApprove&&<ApprovalsView team={team} yr={yr} threshold={threshold} th={th} colorOf={colorOf} onApprove={approveIds} onRequest={requestChanges} onRevoke={revokeApproval} onOneByOne={()=>setShowInbox(true)} onTurnOn={getOwner(team.id)?turnOnApprovals:null}/>}
        {view==="trips"&&<TripsView team={team} onUpdate={updateWithHistory} th={th} t={t} yr={yr} holSet={holSet}/>}
        {view==="analytics"&&<AnalyticsDashboard team={team} yr={yr} th={th} t={t}/>}
        {showInbox&&<ApprovalInbox open onClose={()=>setShowInbox(false)} team={team} yr={yr} threshold={threshold} th={th} colorOf={colorOf} onApprove={approveIds} onRequest={requestChanges}/>}
        {showTT&&<TimeTravel open onClose={()=>setShowTT(false)} teamId={team.id} team={team} yr={yr} th={th} toView={raw=>teamForYear(raw,yr)} onRestore={restoreVersion}/>}
        {showWr&&<Wrapped open onClose={()=>setShowWr(false)} team={team} yr={yr} holOf={holOf} sevenDay={!!team.w7} logo={safeLogo(team.logo)}/>}
        <FadeIn delay={200}><VisitCounter th={th}/></FadeIn>
        <BottomDuo th={th} lang={lang} compact/>
</main>
    </div>

    {mob&&sb&&<div onClick={()=>setSb(false)} style={{position:"fixed",inset:0,top:56,background:"rgba(0,0,0,.3)",zIndex:80}}/>}
    {showSh&&<ShareModal teamId={team.id} teamName={team.name} onClose={()=>setShowSh(false)} th={th} t={t}/>}
    
    {mob&&<div className="tvp-botnav" style={{background:th.gbg,borderTop:"1px solid "+th.gbd,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      {views.map(function(v){return <button key={v.k} onClick={function(){if(v.k===view)return;withTransition(function(){flushSync(function(){setView(v.k);});});}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",minWidth:48}}>
        <Ic n={v.i} s={18} c={v.k===view?th.ac:th.t3}/>
        <span style={{fontSize:9,fontWeight:v.k===view?700:500,color:v.k===view?th.ac:th.t3,fontFamily:F}}>{v.l}</span>
      </button>;})}
      {canApprove&&<button type="button" onClick={function(){setView("approvals");}} aria-label={V("inboxBadge",{n:pendN})} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 6px",color:view==="approvals"?"#15803D":th.t3,fontSize:9,fontWeight:800,fontFamily:F,position:"relative"}}><span style={{fontSize:15,lineHeight:1}}>✓</span>{V("inbox")}{pendN>0&&<span style={{position:"absolute",top:0,right:2,minWidth:15,height:15,borderRadius:99,background:"#DC2626",color:"#fff",fontSize:9,display:"grid",placeItems:"center",padding:"0 3px"}}>{pendN}</span>}</button>}
    </div>}

    
    {commentDay&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={()=>setCommentDay(null)}>
      <div role="dialog" aria-modal="true" aria-label={commentDay} onClick={e=>e.stopPropagation()} style={{background:th.bg,borderRadius:16,maxWidth:360,width:"100%",padding:20,boxShadow:th.sl}}>
        <TrapScope onClose={()=>setCommentDay(null)}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:700,color:th.tx,fontFamily:F}}>{commentDay}</h3>
          <button onClick={()=>setCommentDay(null)} style={{background:"none",border:"none",cursor:"pointer"}}><Ic n="x" s={16} c={th.t2}/></button>
        </div>
        {(team.comments&&team.comments[commentDay]||[]).map(function(cm,ci){return <div key={ci} style={{padding:"6px 8px",background:th.sh,borderRadius:8,marginBottom:4,fontSize:12}}>
          <div style={{fontWeight:600,color:th.tx}}>{cm.by} <span style={{fontWeight:400,color:th.t3,fontSize:10}}>{new Date(cm.at).toLocaleString()}</span></div>
          <div style={{color:th.t2,marginTop:2}}>{cm.t}</div>
        </div>;})}
        <div style={{display:"flex",gap:6,marginTop:8}}>
          <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&commentText.trim())addComment(commentDay,commentText.trim());}} placeholder={t.addComment||"Add a comment..."} style={{flex:1,padding:"6px 10px",borderRadius:8,border:"1px solid "+th.gbd,background:th.sf,color:th.tx,fontSize:12,fontFamily:F}}/>
          <button onClick={()=>{if(commentText.trim())addComment(commentDay,commentText.trim());}} disabled={!commentText.trim()} style={{padding:"6px 14px",borderRadius:8,border:"none",background:commentText.trim()?th.ac:"#D1D5DB",color:"#fff",fontSize:12,fontWeight:600,cursor:commentText.trim()?"pointer":"default",fontFamily:F}}>Post</button>
        </div>
        <div style={{fontSize:11,color:th.t3,marginTop:6}}>{X("commentHint")}</div>
      </div>
    </div>}

    {holBr&&<HolBrowser onClose={()=>setHolBr(false)} th={th} t={t} year={yr}/>}

    {/* Smart Optimizer Modal */}
    {showOptimizer&&(()=>{const mem=team.members.find(m=>m.id===showOptimizer);if(!mem)return null;
      // Every 1–3 working-day gap that joins this person's days off (weekends, own national + regional holidays, booked days)
      const hs=[yr-1,yr,yr+1].filter(y=>y>=YEAR_MIN&&y<=YEAR_MAX).flatMap(y=>mem.country?getAllHolidays(mem,y):[]);
      const loc=lang==="en"?"en-GB":lang;const fd=k=>{const p2=pk(k);try{return new Date(p2.y,p2.m,p2.d,12).toLocaleDateString(loc,{weekday:"short",day:"numeric",month:"short"});}catch(e){return k;}};
      const hn=k=>{const rows=hNames[mem.country]&&hNames[mem.country].h&&hNames[mem.country].h[k];return rows&&rows[0]?(rows[0][0]||rows[0][1]):holName(k);};
      const suggestions=mem.country?findBridges({year:yr,holidays:hs,booked:mem.days||[],sevenDay:!!team.w7,today:yr===CY?dk(CY,CM,CD):"",limit:10}).map(b=>({take:b.take,off:b.cost,gain:b.length,label:(b.take.length===1?fd(b.take[0]):fd(b.take[0])+" – "+fd(b.take[b.take.length-1]))+" → "+fd(b.from)+" – "+fd(b.to)+" ("+[...new Set(b.holidays.map(hn))].join(", ")+")"})):[];
      return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={()=>setShowOptimizer(null)}>
        <div role="dialog" aria-modal="true" aria-label={t.bestDays||"Best days"} onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,maxWidth:480,width:"100%",maxHeight:"70vh",display:"flex",flexDirection:"column",boxShadow:th.sl,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}><TrapScope onClose={()=>setShowOptimizer(null)}/>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${th.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{margin:0,fontSize:16,fontWeight:700,color:th.tx,fontFamily:F}}>{t.bestDays} {mem.name}</h3>
            <button onClick={()=>setShowOptimizer(null)} style={{background:th.sh,border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Ic n="x" s={14} c={th.t2}/></button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
            {suggestions.length===0?<div style={{textAlign:"center",padding:30,color:th.t3,fontSize:13}}>{X("bridgeNone",{y:yr})}</div>:
            suggestions.map((s,i)=> <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:i%2===0?th.bg:"transparent",borderRadius:8,marginBottom:4}}>
              <div style={{width:36,height:36,borderRadius:10,background:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:14,fontWeight:800,color:"#065F46"}}>{s.gain}d</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:th.tx}}>{s.label}</div>
                <div style={{fontSize:11,color:th.t3}}>{X("bridgeTake",{o:s.off,g:s.gain})}</div>
              </div>
              <Btn th={th} v="ghost" sz="sm" onClick={()=>{const newDays=[...(mem.days||[]),...s.take.filter(d=>!(mem.days||[]).includes(d))];updateWithHistory({...team,members:team.members.map(m=>m.id===mem.id?{...m,days:newDays}:m)});flash(X("added",{n:s.off}));}} style={{fontSize:11}}>+ {X("add")}</Btn>
            </div>)}
          </div>
        </div>
      </div>;
    })()}

    {/* CSV Import Modal */}
    {delOpen&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={()=>setDelOpen(false)}>
      <div role="alertdialog" aria-modal="true" aria-label={NY.delT} dir={lang==="ar"?"rtl":"ltr"} onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,maxWidth:420,width:"100%",padding:22,boxShadow:th.sl,boxSizing:"border-box",fontFamily:F}}>
        <TrapScope onClose={()=>setDelOpen(false)}/>
        <h3 style={{margin:"0 0 8px",fontSize:16,fontWeight:700,color:"#B91C1C"}}>{NY.delT}</h3>
        <p style={{margin:"0 0 12px",fontSize:13,color:th.t2,lineHeight:1.5}}>{NY.delB.replace("{n}",team.name||"")}</p>
        <label style={{fontSize:12,fontWeight:600,color:th.t2}}>{NY.delType}<input value={delText} onChange={e=>setDelText(e.target.value)} autoFocus style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"9px 12px",borderRadius:10,border:"1.5px solid "+th.bd,background:th.bg,color:th.tx,fontSize:14,fontFamily:F}}/></label>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
          <Btn th={th} v="ghost" onClick={()=>setDelOpen(false)}>{NY.cancel}</Btn>
          <button disabled={delText.trim()!==(team.name||"").trim()} onClick={()=>{setDelOpen(false);onDeleteForever&&onDeleteForever(team.id);}} style={{padding:"9px 16px",borderRadius:10,border:"none",background:"#DC2626",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:F,opacity:delText.trim()!==(team.name||"").trim()?.45:1}}>{NY.delGo}</button>
        </div>
      </div>
    </div>}
    {showCSVImport&&(()=>{
      const plan=planImport(csvText,team.members,EU_C,{sevenDay:!!team.w7,max:50});
      const nUpd=Object.keys(plan.updates).length;
      const apply=()=>{
        if(locked){flash(t.locked);return;}
        const members=team.members.map(m=>{const u=plan.updates[m.id];if(!u)return m;const nm={...m,days:[...(m.days||[]),...u.days]};if(u.country)nm.country=u.country;return nm;}).concat(plan.adds.map(a=>({id:gid(),name:a.name,country:a.country,days:a.days})));
        const msg=(plan.adds.length?`Added ${plan.adds.length} ${plan.adds.length!==1?"people":"person"}`:"")+(plan.adds.length&&nUpd?", ":"")+(nUpd?`updated ${nUpd}`:"");
        updateWithHistory({...team,members,log:addLogEntry(team,"Import: "+(msg||"no changes"))});
        setShowCSVImport(false);setCsvText("");flash(msg||"Nothing to import");
      };
      const badge=a=>a==="add"?{bg:"#ECFDF5",c:"#047857",l:X("isNew")}:a==="update"?{bg:"#EEF2FF",c:"#4338CA",l:X("update")}:{bg:"#FEF2F2",c:"#B91C1C",l:X("skip")};
      return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={()=>setShowCSVImport(false)}>
      <div role="dialog" aria-modal="true" aria-label={X("importT")} onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,maxWidth:620,width:"100%",maxHeight:"92vh",overflowY:"auto",padding:22,boxShadow:th.sl,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,boxSizing:"border-box"}}>
        <TrapScope onClose={()=>setShowCSVImport(false)}/>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:th.tx}}>{X("importT")}</h3>
          <button aria-label={X("close")} onClick={()=>setShowCSVImport(false)} style={{background:th.sh,border:"none",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Ic n="x" s={14} c={th.t2}/></button>
        </div>
        <p style={{margin:"0 0 8px",fontSize:12,color:th.t2,lineHeight:1.5}}>{X("importHelp")}</p>
        <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} placeholder={"Ana Pop, RO\nLukas Weber, Germany\nIoana Mureșan, RO, 2027-07-05, 2027-07-16"} rows={6} aria-label={X("listImport")} style={{width:"100%",padding:10,border:`1.5px solid ${th.bd}`,borderRadius:10,fontSize:12,fontFamily:FM,resize:"vertical",outline:"none",background:th.bg,color:th.tx,boxSizing:"border-box"}}/>
        <label style={{display:"inline-block",marginTop:8}}>
          <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" className="tvp-sr" onChange={e=>{const f=(e.target.files&&e.target.files[0]);if(f){const r=new FileReader();r.onload=()=>setCsvText(String(r.result||""));r.readAsText(f);}e.target.value="";}}/>
          <span style={{display:"inline-block",padding:"8px 14px",background:th.sh,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:th.t2,border:`1px solid ${th.bd}`}}>{X("chooseCsv")}</span>
        </label>
        {plan.rows.length>0&&<div style={{marginTop:12,border:`1px solid ${th.bd}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",fontSize:12,fontWeight:700,color:th.tx,background:th.sh}}>{X("preview")} · {plan.adds.length} {X("nNew")} · {nUpd} {X("nUpdated")}{plan.skipped?` · ${plan.skipped} ${X("nSkipped")}`:""}</div>
          <div style={{maxHeight:220,overflowY:"auto"}}>
            {plan.rows.slice(0,200).map((r,i)=>{const b=badge(r.action);return <div key={i} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 44px 70px 58px",gap:8,alignItems:"center",padding:"6px 12px",borderTop:i?`1px solid ${th.bl}`:"none",fontSize:12,color:th.tx}}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.note||""}>{r.name}{r.note&&<span style={{display:"block",fontSize:11,color:"#B45309"}}>{r.note}</span>}</span>
              <span style={{fontFamily:FM,fontWeight:700,color:th.t2}}>{r.country||"—"}</span>
              <span style={{color:th.t2}}>{r.days.length?`${r.days.length} ${r.days.length!==1?X("days"):X("day")}`:"—"}</span>
              <span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:6,background:b.bg,color:b.c,textAlign:"center"}}>{b.l}</span>
            </div>;})}
          </div>
        </div>}
        <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
          <Btn th={th} v="ghost" onClick={()=>setShowCSVImport(false)}>{X("cancel")}</Btn>
          <Btn th={th} disabled={locked||(!plan.adds.length&&!nUpd)} onClick={apply}>{plan.adds.length||nUpd?`${X("apply")} · ${plan.adds.length} ${X("nNew")}, ${nUpd} ${X("nUpdated")}`:X("apply")}</Btn>
        </div>
      </div>
    </div>;})()}

    <Toast message={toast} visible={!!toast}/>
    {pinModalEl}
    {setPinModalEl}
  </div>;
}
