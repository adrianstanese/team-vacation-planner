// Report and export builders (PDF report, approved-days PDF, print view, legacy .xls), moved out of app.tsx
// so they load only when someone exports.
import { downloadHtmlAsPdf } from "@/lib/htmlToPdf";
import { V } from "@/lib/v3Text";
import { dateLocale, monthShort } from "@/lib/extraText";
import { nextLeaveDay, avgCoverage, streaksOf } from "@/lib/v3Util";
import { EU_C, MC, dim, dk, esc, fdm, fileBase, pk, reportSafe, safeYear, withBusy, _fd, _fd2, getAllHolidays, isWe, usedOf, safeLogo } from "./app";

// Day totals as the planner shows them: a half day counts 0.5
const fmtD = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);

// ─── Shared report design (team report, print view, approved schedule, year-end) ───
// One look for every A4 export, in the same family as the wall planner: a deep violet header with the team logo,
// KPI cards, rounded tables with avatars, usage bars and status pills, poster-style month cards, a quiet footer.
// Everything is plain HTML/CSS that html2canvas renders the same in Chrome and Safari (no emoji, no web fonts).
var REP_CSS = ''
  + '*{box-sizing:border-box}html,body{margin:0;background:#fff}'
  + 'body{width:1123px;font:12px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1B1440;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
  + '.pg{padding:28px 34px 22px}'
  + '.hero{position:relative;overflow:hidden;display:flex;align-items:center;gap:18px;padding:22px 26px;border-radius:22px;background:linear-gradient(120deg,#1E1B4B 0%,#4C1D95 55%,#9D174D 100%);color:#fff;margin-bottom:16px}'
  + '.hero:after{content:"";position:absolute;right:-60px;top:-90px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(244,114,182,.45),rgba(244,114,182,0) 70%)}'
  + '.hero .lg{position:relative;z-index:1;width:56px;height:56px;flex:none;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:26px;font-weight:800;color:#6D28D9}'
  + '.hero .lg img{width:100%;height:100%;object-fit:contain}'
  + '.hero .tx{position:relative;z-index:1;min-width:0}'
  + '.hero .kick{font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#F9A8D4}'
  + '.hero h1{margin:3px 0 2px;font-size:27px;line-height:1.1;letter-spacing:-.02em;font-weight:800}'
  + '.hero .sub{font-size:12px;color:#DDD6FE}'
  + '.hero .rt{position:relative;z-index:1;margin-left:auto;text-align:right;display:grid;gap:6px;justify-items:end}'
  + '.hero .yr{font-size:40px;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff}'
  + '.hero .badge{display:inline-block;padding:5px 12px;border-radius:999px;background:#DCFCE7;color:#166534;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}'
  + '.kpis{display:grid;gap:12px;margin-bottom:6px}'
  + '.kpi{border-radius:16px;padding:13px 16px;background:#fff;border:1px solid #ECE9F5;box-shadow:0 10px 26px -20px rgba(40,20,110,.55)}'
  + '.kpi b{display:block;font-size:26px;line-height:1.1;letter-spacing:-.02em;font-weight:800}'
  + '.kpi span{display:block;margin-top:3px;font-size:9.5px;color:#6B6592;text-transform:uppercase;letter-spacing:.09em;font-weight:800}'
  + '.kpi.v b{color:#6D28D9}.kpi.p b{color:#DB2777}.kpi.g b{color:#059669}.kpi.a b{color:#D97706}.kpi.r b{color:#DC2626}'
  + '.sec{display:flex;align-items:center;gap:10px;margin:20px 0 10px;font-size:13.5px;font-weight:800;letter-spacing:-.01em}'
  + '.sec:before{content:"";width:6px;height:18px;border-radius:3px;background:linear-gradient(#7C3AED,#DB2777)}'
  + '.sec small{margin-left:auto;font-size:10.5px;font-weight:600;color:#8B86AE}'
  + '.card{background:#fff;border:1px solid #ECE9F5;border-radius:16px;overflow:hidden}'
  + 'table.t{width:100%;border-collapse:collapse}'
  + '.t th{font-size:8.5px;line-height:1.25;text-transform:uppercase;letter-spacing:.06em;color:#6B6592;font-weight:800;text-align:left;padding:9px 8px;background:#F7F5FF;border-bottom:1px solid #ECE9F5;vertical-align:bottom}'
  + '.t td{padding:7px 8px;border-bottom:1px solid #F1EFF8;font-size:11.5px;vertical-align:middle}'
  + '.t tr:last-child td{border-bottom:0}.t tr.z td{background:#FCFBFF}'
  + '.t .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.t .c{text-align:center}'
  + '.t td.n b{font-size:13px}.t .dim{color:#A8A3C7}'
  + '.who{display:flex;align-items:center;gap:9px;min-width:0}.who>div{min-width:0}.who b{display:block;font-size:12px;white-space:nowrap}.who small{display:block;font-size:10px;color:#8B86AE;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}'
  + '.av{width:26px;height:26px;flex:none;border-radius:50%;color:#fff;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}'
  + '.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap}'
  + '.ok{background:#DCFCE7;color:#166534}.bad{background:#FEE2E2;color:#B91C1C}.warn{background:#FEF3C7;color:#92400E}.mute{background:#F1EFF8;color:#8B86AE}'
  + '.bar{height:7px;border-radius:4px;background:#EEEAF8;overflow:hidden;width:100%;min-width:70px}.bar i{display:block;height:100%;border-radius:4px}'
  + '.chips{display:flex;flex-wrap:wrap;gap:4px}.chip{display:inline-block;padding:2px 8px;border-radius:7px;font-size:10px;font-weight:700;white-space:nowrap}'
  + '.heat{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}.heat i{height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:9.5px;font-weight:800}'
  + '.mhd{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}.mhd span{text-align:center;font-size:9px;font-weight:800;color:#8B86AE;text-transform:uppercase}'
  + '.cal{display:grid;gap:12px}'
  + '.mc{background:#fff;border-radius:16px;padding:11px 11px 9px;border:1px solid #ECE9F5;box-shadow:0 10px 26px -22px rgba(40,20,110,.6)}'
  + '.mc h3{margin:0 0 6px;font-size:13px;display:flex;justify-content:space-between;align-items:baseline}.mc h3 small{font-size:10px;font-weight:700;color:#7C3AED}'
  + '.mg{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}.mg .dh{font-size:8px;font-weight:800;text-align:center;color:#A8A3C7;text-transform:uppercase}'
  + '.mg .c{height:24px;border-radius:6px;position:relative;padding:2px 4px;font-size:9.5px;font-weight:700;color:#3B3466}'
  + '.mg .c.we{background:#F4F2FA;color:#B4AFD0}.mg .c.h{background:linear-gradient(135deg,#FEF3C7,#FDE68A);color:#92400E}.mg .c.a{background:#F5F3FF}'
  + '.mg .bars{position:absolute;left:3px;right:3px;bottom:3px;display:flex;gap:1px}.mg .bars i{flex:1;height:4px;border-radius:2px}'
  + '.mg em{position:absolute;top:2px;right:3px;font-style:normal;font-size:7.5px;font-weight:800;color:#B91C1C}'
  + '.legend{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:10px 2px 0;font-size:10.5px;font-weight:600;color:#4A4270}'
  + '.legend span{display:inline-flex;align-items:center;gap:6px}.legend i{width:11px;height:11px;border-radius:4px;display:inline-block}'
  + '.notes{display:grid;gap:8px}.note{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:14px;font-size:11.5px}'
  + '.note b{flex:none;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#fff}'
  + '.note.w{background:#FFFBEB;border:1px solid #FDE68A}.note.w b{background:#F59E0B}.note.r{background:#FEF2F2;border:1px solid #FECACA}.note.r b{background:#DC2626}'
  + '.note.i{background:#F5F3FF;border:1px solid #DDD6FE}.note.i b{background:#7C3AED}.note.g{background:#ECFDF5;border:1px solid #A7F3D0}.note.g b{background:#059669}'
  + '.sigs{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:22px}'
  + '.sig{border:1px solid #ECE9F5;border-radius:16px;padding:14px 18px 12px}.sig b{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#6B6592}'
  + '.sig span{display:block;font-size:13px;font-weight:700;margin-top:3px;min-height:18px}.sig .ln{display:flex;gap:18px;margin-top:26px}'
  + '.sig .ln div{flex:1;border-top:1.5px solid #C9C4E0;padding-top:4px;font-size:9.5px;color:#8B86AE}'
  + '.foot{display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:10px;border-top:1px solid #ECE9F5;font-size:10px;color:#8B86AE}'
  + '.foot b{color:#6D28D9}'
  + '.prt{position:fixed;top:14px;right:14px;z-index:9}.prt button{padding:10px 20px;border-radius:999px;border:0;background:linear-gradient(135deg,#7C3AED,#DB2777);color:#fff;font:700 13px inherit;cursor:pointer}'
  + '@media print{.prt{display:none}body{width:auto}@page{size:A4 landscape;margin:10mm}}';

var MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var monthsOf = function(t){ return (t && t.M) || MONTHS_EN; };
var daysOf = function(t){ return [t.mo||"Mo",t.tu||"Tu",t.we2||"We",t.th||"Th",t.fr||"Fr",t.sa||"Sa",t.su||"Su"]; };
var initial = function(s){ return esc(String(s || "?").trim().charAt(0).toUpperCase() || "?"); };
var avatar = function(name, color){ return '<span class="av" style="background:' + color + '">' + initial(name) + "</span>"; };
var countryName = function(code){ var co = code ? EU_C.find(function(c){ return c.c === code; }) : null; return co ? co.n : ""; };
var shortDate = function(k){ try { var p = k.split("-"); return new Date(+p[0], +p[1]-1, +p[2]).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" }); } catch(e){ return k; } };
var today = function(){ return new Date().toLocaleDateString(dateLocale(), { day: "numeric", month: "long", year: "numeric" }); };

// Leave periods as "3 Aug – 7 Aug" (consecutive working days, skipping weekends and holidays, are one period)
function periodsOf(days, w7){
  var s = days.slice().sort(), out = [], i = 0;
  while (i < s.length) {
    var a = s[i], b = a;
    while (i + 1 < s.length && nextLeaveDay(s[i], s[i+1], w7)) { i++; b = s[i]; }
    out.push(a === b ? shortDate(a) : shortDate(a) + " – " + shortDate(b));
    i++;
  }
  return out;
}

function heroHtml(team, kicker, sub, right){
  var logo = safeLogo(team.logo);
  return '<div class="hero"><div class="lg">' + (logo ? '<img src="' + logo + '" alt="">' : initial(team.name)) + '</div>'
    + '<div class="tx"><div class="kick">' + esc(kicker) + '</div><h1>' + esc(team.name || "") + '</h1><div class="sub">' + sub + '</div></div>'
    + '<div class="rt">' + right + '</div></div>';
}
function kpis(list){
  return '<div class="kpis" style="grid-template-columns:repeat(' + list.length + ',1fr)">' + list.map(function(k){ return '<div class="kpi ' + (k[2] || "") + '"><b>' + k[0] + '</b><span>' + esc(k[1]) + '</span></div>'; }).join("") + "</div>";
}
function footHtml(){ return '<div class="foot"><span>' + esc(V("rpGenOn", { d: today() })) + '</span><span><b>vacationplanner.team</b></span></div>'; }
function docHtml(title, body, extraHead?){
  return '<!doctype html><html lang="' + esc(document.documentElement.lang || "en") + '"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + REP_CSS + '</style>' + (extraHead || "") + '</head><body><div class="pg">' + body + footHtml() + "</div></body></html>";
}

// Poster-style month card: coloured bars for who is away, gold public holidays, shaded weekends
function monthCard(yr, mo, t, ms, hol, w7){
  var n = dim(yr, mo), first = fdm(yr, mo), cells = "", cnt = 0;
  for (var i = 0; i < first; i++) cells += "<div></div>";
  for (var d = 1; d <= n; d++) {
    var k = dk(yr, mo, d), we = !w7 && isWe(yr, mo, d), h = !!hol[k];
    var away = ms.filter(function(m){ return m.days.has(k); });
    away.forEach(function(m){ cnt += m.half.has(k) ? 0.5 : 1; });
    cells += '<div class="c' + (we ? " we" : "") + (h ? " h" : "") + (away.length && !h && !we ? " a" : "") + '">' + d
      + (away.length ? '<span class="bars">' + away.slice(0, 5).map(function(m){ return '<i style="background:' + m.c + '"></i>'; }).join("") + "</span>" : "")
      + (away.length > 5 ? "<em>" + away.length + "</em>" : "") + "</div>";
  }
  return '<div class="mc"><h3>' + esc(monthsOf(t)[mo]) + "<small>" + (cnt ? fmtD(cnt) + " " + esc(t.dys || V("rpDays")) : "") + '</small></h3><div class="mg">'
    + daysOf(t).map(function(x){ return '<div class="dh">' + esc(x) + "</div>"; }).join("") + cells + "</div></div>";
}
function calendarHtml(yr, t, ms, hol, w7, cols){
  var s = '<div class="cal" style="grid-template-columns:repeat(' + cols + ',1fr)">';
  for (var mo = 0; mo < 12; mo++) s += monthCard(yr, mo, t, ms, hol, w7);
  return s + "</div>";
}
function legendHtml(ms){
  return '<div class="legend">' + ms.map(function(m){ return '<span><i style="background:' + m.c + '"></i>' + esc(m.name) + "</span>"; }).join("")
    + '<span><i style="background:linear-gradient(135deg,#FEF3C7,#FDE68A)"></i>' + esc(V("hmHol")) + '</span><span><i style="background:#F4F2FA"></i>' + esc(V("hmWe")) + "</span></div>";
}
function membersOf(team, yr, filter?){
  var p = yr + "-";
  return (team.members || []).map(function(m, i){
    var days = (m.days || []).filter(function(d){ return String(d).startsWith(p); });
    return { m: m, i: i, name: m.name || "", c: MC[i % MC.length].d, soft: MC[i % MC.length].b, days: new Set(days), half: new Set((m.half || []).filter(function(d){ return String(d).startsWith(p); })), list: days, pm: [] as number[],
      used: usedOf({ days: days, half: m.half }) };
  }).filter(filter || function(){ return true; });
}
function holidaysOf(list, yr){ var hol = {}; list.forEach(function(x){ if (x.m.country) getAllHolidays(x.m, yr).forEach(function(h){ hol[h] = true; }); }); return hol; }

// The team report (PDF Report button and the print view share it)
function teamReportHtml(team, t, forPrint){
  team = reportSafe(team);
  var yr = safeYear(team), w7 = !!team.w7, MO = monthsOf(t);
  var ms = membersOf(team, yr), hol = holidaysOf(ms, yr);
  var byDay: Record<string, string[]> = {}; ms.forEach(function(x){ x.list.forEach(function(d){ (byDay[d] = byDay[d] || []).push(x.name); }); });
  var overlaps = Object.keys(byDay).filter(function(d){ return byDay[d].length >= 2; }).sort();
  var total = ms.reduce(function(a, x){ return a + x.used; }, 0);
  var perMonth = new Array(12).fill(0); ms.forEach(function(x){ x.list.forEach(function(d){ perMonth[+d.slice(5,7) - 1] += x.half.has(d) ? 0.5 : 1; }); });
  var peak = perMonth.indexOf(Math.max.apply(null, perMonth));
  var cov = avgCoverage(team.members, yr, w7, function(m){ return m.country ? getAllHolidays(m, yr) : []; });
  var body = heroHtml(team, t.summary || V("rpSummary"), esc(ms.length + " " + (ms.length !== 1 ? t.mbs : t.mb)) + " · " + esc(V("psPeak", { m: MO[peak] })), '<div class="yr">' + yr + "</div>");
  body += kpis([[fmtD(total), V("rpTotal"), "v"], [String(ms.length), V("rpTeam"), ""], [String(overlaps.length), V("rpOverlap"), overlaps.length ? "p" : ""], [cov + "%", V("rpAvgCov"), "g"]]);

  // Days off per person per month (heat map) + total and allowance use
  var maxM = 1; ms.forEach(function(x){ var pm = new Array(12).fill(0); x.list.forEach(function(d){ pm[+d.slice(5,7) - 1] += x.half.has(d) ? 0.5 : 1; }); x.pm = pm; pm.forEach(function(v){ if (v > maxM) maxM = v; }); });
  body += '<div class="sec">' + esc(V("rpMonthly")) + "</div>";
  body += '<div class="card"><table class="t"><thead><tr><th style="width:190px">' + esc(V("rpMember")) + '</th><th><div class="mhd">' + MO.map(function(m, i){ return "<span>" + esc(monthShort(i)) + "</span>"; }).join("") + '</div></th><th class="n" style="width:70px">' + esc(V("rpDays")) + '</th><th style="width:130px">' + esc(V("yrAllow")) + "</th></tr></thead><tbody>";
  ms.forEach(function(x, r){
    var al = (Number(x.m.pto) || 0) + (Number(x.m.carry) || 0), pct = al ? Math.min(100, Math.round(x.used / al * 100)) : 0;
    body += "<tr" + (r % 2 ? ' class="z"' : "") + '><td><div class="who">' + avatar(x.name, x.c) + "<div><b>" + esc(x.name) + "</b><small>" + esc([x.m.role, countryName(x.m.country)].filter(Boolean).join(" · ")) + '</small></div></div></td><td><div class="heat">'
      + x.pm.map(function(v){ var a = v ? 0.22 + 0.78 * v / maxM : 0; return '<i style="background:' + (v ? x.c + Math.round(a * 255).toString(16).padStart(2, "0") : "#F4F2FA") + ";color:" + (v && a > 0.55 ? "#fff" : "#1B1440") + '">' + (v ? fmtD(v) : "") + "</i>"; }).join("")
      + '</div></td><td class="n"><b>' + fmtD(x.used) + "</b></td><td>" + (al ? '<div style="display:flex;align-items:center;gap:8px"><div class="bar"><i style="width:' + pct + "%;background:" + (x.used > al ? "#DC2626" : x.c) + '"></i></div><span style="font-size:10px;font-weight:700;color:#6B6592;white-space:nowrap">' + fmtD(x.used) + "/" + fmtD(al) + "</span></div>" : '<span class="pill mute">—</span>') + "</td></tr>";
  });
  body += "</tbody></table></div>";

  body += '<div class="sec">' + esc(V("rpYearCal")) + " " + yr + "</div>" + calendarHtml(yr, t, ms, hol, w7, 4) + legendHtml(ms);

  body += '<div class="sec">' + esc(V("rpPeriods")) + "</div>";
  body += '<div class="card"><table class="t"><thead><tr><th style="width:190px">' + esc(V("rpMember")) + '</th><th class="n" style="width:60px">' + esc(V("rpDays")) + "</th><th>" + esc(V("rpPeriods")) + "</th></tr></thead><tbody>";
  ms.forEach(function(x, r){
    var ps = periodsOf(x.list, w7);
    body += "<tr" + (r % 2 ? ' class="z"' : "") + '><td><div class="who">' + avatar(x.name, x.c) + "<b>" + esc(x.name) + '</b></div></td><td class="n"><b>' + fmtD(x.used) + '</b></td><td><div class="chips">'
      + (ps.length ? ps.map(function(p){ return '<span class="chip" style="background:' + x.soft + ";color:" + x.c + '">' + esc(p) + "</span>"; }).join("") : '<span class="dim">—</span>') + "</div></td></tr>";
  });
  body += "</tbody></table></div>";

  if (overlaps.length) {
    // Consecutive overlap days with the same people become one line ("3 Aug – 7 Aug")
    var groups: { a: string; b: string; who: string[] }[] = [];
    overlaps.forEach(function(d){
      var g = groups[groups.length - 1], who = byDay[d].slice().sort();
      if (g && g.who.join("|") === who.join("|") && nextLeaveDay(g.b, d, w7)) g.b = d; else groups.push({ a: d, b: d, who: who });
    });
    var shown = groups.slice(0, 30);
    body += '<div class="sec">' + esc(V("rpOverlap")) + "<small>" + overlaps.length + "</small></div>";
    body += '<div class="card"><table class="t"><thead><tr><th style="width:190px">' + esc(V("rpDate")) + '</th><th class="n" style="width:60px">' + esc(V("rpDays")) + "</th><th>" + esc(V("rpOut")) + "</th></tr></thead><tbody>";
    shown.forEach(function(g, r){
      var nd = overlaps.filter(function(d){ return d >= g.a && d <= g.b && byDay[d].length === g.who.length; }).length;
      body += "<tr" + (r % 2 ? ' class="z"' : "") + '><td><span class="pill ' + (g.who.length >= 3 ? "bad" : "warn") + '">' + esc(g.a === g.b ? shortDate(g.a) : shortDate(g.a) + " – " + shortDate(g.b)) + '</span></td><td class="n"><b>' + nd + '</b></td><td><div class="chips">'
        + g.who.map(function(nm){ var x = ms.find(function(y){ return y.name === nm; }); return '<span class="chip" style="background:' + (x ? x.soft : "#F1EFF8") + ";color:" + (x ? x.c : "#4A4270") + '">' + esc(nm) + "</span>"; }).join("") + "</div></td></tr>";
    });
    if (groups.length > shown.length) body += '<tr><td colspan="3" class="dim">' + esc(V("rpMore", { n: groups.length - shown.length })) + "</td></tr>";
    body += "</tbody></table></div>";
  }
  var head = forPrint ? "" : "";
  var html = docHtml((team.name || "") + " · " + yr, (forPrint ? '<div class="prt"><button onclick="window.print()">' + esc(V("rpPrint")) + "</button></div>" : "") + body, head);
  return { html: html, yr: yr };
}

export function generatePDFReport(team, t) {
  var r = teamReportHtml(team, t, false);
  return pdfOrHtml(r.html, fileBase(team.name) + "_" + r.yr + "_report.pdf");
}

export function printReport(team, t) {
  var r = teamReportHtml(team, t, true);
  var win = window.open("", "_blank", "width=1180,height=820");
  if (!win) { try { window.dispatchEvent(new CustomEvent("tvp-save-error", { detail: "Your browser blocked the print window. Allow pop-ups for this site and try again." })); } catch (e) { /* no window */ } return; }
  win.document.write(r.html.replace("<body>", '<body style="margin:0 auto">'));
  win.document.close(); win.focus();
  setTimeout(function(){ win.print(); }, 600);
}

export function generateApprovedPDF(team, t) {
  team = reportSafe(team);
  var yr = safeYear(team), w7 = !!team.w7;
  var apr = team.approver ? team.members.find(function(m){ return m.id === team.approver; }) : null;
  var ms = membersOf(team, yr, function(x){ return x.m.approved === true && x.list.length > 0; }), hol = holidaysOf(ms, yr);
  var tot = ms.reduce(function(a, x){ return a + x.used; }, 0);
  var title = t.approvalCert || "Approved Vacation Schedule";
  var body = heroHtml(team, title, esc(today()), '<div class="yr">' + yr + '</div><span class="badge">✓ ' + esc(t.approved || "Approved") + "</span>");
  body += kpis([[String(ms.length), t.mbs || V("rpTeam"), ""], [fmtD(tot), V("rpDays") + " · " + (t.approved || "Approved"), "g"], [fmtD(Math.round(tot / (ms.length || 1) * 10) / 10), t.avgDays || "Avg/Person", "v"]]);
  body += '<div class="sec">' + esc((t.approved || "Approved") + " · " + V("rpPeriods")) + "</div>";
  body += '<div class="card"><table class="t"><thead><tr><th style="width:200px">' + esc(V("rpMember")) + '</th><th style="width:120px">' + esc(V("rpCountry")) + '</th><th class="n" style="width:60px">' + esc(V("rpDays")) + '</th><th style="width:130px">' + esc(V("yrAllow")) + "</th><th>" + esc(V("rpPeriods")) + "</th></tr></thead><tbody>";
  ms.forEach(function(x, r){
    var al = (Number(x.m.pto) || 0) + (Number(x.m.carry) || 0), pct = al ? Math.min(100, Math.round(x.used / al * 100)) : 0;
    body += "<tr" + (r % 2 ? ' class="z"' : "") + '><td><div class="who">' + avatar(x.name, x.c) + "<div><b>" + esc(x.name) + "</b><small>" + esc(x.m.role || "") + "</small></div></div></td><td>" + esc(countryName(x.m.country) || "—") + '</td><td class="n"><b>' + fmtD(x.used) + "</b></td><td>"
      + (al ? '<div style="display:flex;align-items:center;gap:8px"><div class="bar"><i style="width:' + pct + "%;background:" + x.c + '"></i></div><span style="font-size:10px;font-weight:700;color:#6B6592;white-space:nowrap">' + fmtD(x.used) + "/" + fmtD(al) + "</span></div>" : '<span class="pill mute">—</span>')
      + '</td><td><div class="chips">' + periodsOf(x.list, w7).map(function(p){ return '<span class="chip" style="background:' + x.soft + ";color:" + x.c + '">' + esc(p) + "</span>"; }).join("") + "</div></td></tr>";
  });
  body += "</tbody></table></div>";
  body += '<div class="sec">' + esc((t.cal || "Calendar") + " " + yr) + "</div>" + calendarHtml(yr, t, ms, hol, w7, 6) + legendHtml(ms);
  body += '<div class="sigs"><div class="sig"><b>' + esc(t.approverLabel || "Approver") + "</b><span>" + esc(apr ? apr.name : "") + '</span><div class="ln"><div>' + esc(V("yeSig")) + "</div><div>" + esc(V("yeDate")) + '</div></div></div><div class="sig"><b>' + esc(t.mb || V("rpMember")) + '</b><span></span><div class="ln"><div>' + esc(V("yeSig")) + "</div><div>" + esc(V("yeDate")) + "</div></div></div></div>";
  return pdfOrHtml(docHtml((team.name || "") + " · " + title + " " + yr, body), fileBase(team.name) + "_" + yr + "_approved.pdf");
}

function yearEndPdfHtml(d, t){
  var team = d.team, yr = d.yr, idx = {}; (team.members || []).forEach(function(m, i){ idx[m.name || ""] = i; });
  var col = function(name){ return MC[(idx[name] || 0) % MC.length]; };
  var taken = d.rows.reduce(function(a, r){ return a + r.taken; }, 0);
  var body = heroHtml(team, V("yrTitle", { y: yr }), esc(d.rows.length + " " + (d.rows.length !== 1 ? (t.mbs || "") : (t.mb || ""))) + (d.approver ? " · " + esc(t.approverLabel || "Approver") + ": " + esc(d.approver) : ""), '<div class="yr">' + yr + "</div>");
  body += kpis([[fmtN(taken), V("yrTaken"), "v"], [fmtN(d.unused), V("yeLeftT", { y: yr }), "g"], [String(d.noTwo.length), V("yeNoTwo", { names: "" }).replace(/[:：]\s*$/, "").trim(), d.noTwo.length ? "a" : ""], [String(d.over.length), V("yeOver", { names: "" }).replace(/[:：]\s*$/, "").trim(), d.over.length ? "r" : ""]]);
  var yn = function(b){ return b === null ? '<span class="pill mute">—</span>' : b ? '<span class="pill ok">' + esc(V("yeYes")) + "</span>" : '<span class="pill warn">' + esc(V("yeNo")) + "</span>"; };
  body += '<div class="sec">' + esc(V("yePeople")) + "</div>";
  body += '<div class="card"><table class="t"><thead><tr><th>' + esc(V("yePerson")) + "</th><th>" + esc(V("yeCountry")) + '</th><th class="n">' + esc(V("yrAllow")) + '</th><th class="n">' + esc(V("yeCarry", { y: yr - 1 })) + '</th><th class="n">' + esc(V("yeTotal")) + '</th><th class="n">' + esc(V("yrTaken")) + '</th><th class="n">' + esc(V("yrLeft")) + '</th><th class="n">' + esc(V("yeLong")) + '</th><th class="c">' + esc(V("yeTwo")) + "</th>" + (d.appr ? '<th class="c">' + esc(V("yeAppr")) + "</th>" : "") + "</tr></thead><tbody>";
  d.rows.forEach(function(r, i){
    var c = col(r.name), pct = r.total ? Math.min(100, Math.round(r.taken / r.total * 100)) : 0, over = r.left !== null && r.left < 0;
    body += "<tr" + (i % 2 ? ' class="z"' : "") + '><td><div class="who">' + avatar(r.name, c.d) + "<div><b>" + esc(r.name) + "</b><small>" + esc([r.role, r.group].filter(function(v, i, a){ return v && a.indexOf(v) === i; }).join(" · ")) + "</small></div></div></td>"
      + "<td>" + esc(r.country || "—") + '</td><td class="n">' + (r.pto ? fmtN(r.pto) : '<span class="dim">—</span>') + '</td><td class="n">' + (r.carry ? fmtN(r.carry) : '<span class="dim">—</span>') + '</td><td class="n">' + (r.total ? fmtN(r.total) : '<span class="dim">—</span>')
      + '</td><td class="n" style="width:84px"><b>' + fmtN(r.taken) + '</b>' + (r.total ? '<div class="bar" style="margin-top:4px;min-width:0"><i style="width:' + pct + "%;background:" + (over ? "#DC2626" : c.d) + '"></i></div>' : "") + '</td><td class="n">' + (r.left === null ? '<span class="dim">—</span>' : '<span class="pill ' + (over ? "bad" : r.left > 0 ? "ok" : "mute") + '">' + fmtN(r.left) + "</span>")
      + '</td><td class="n">' + (r.longest || '<span class="dim">—</span>') + '</td><td class="c">' + yn(r.two) + "</td>" + (d.appr ? '<td class="c">' + yn(r.approved) + "</td>" : "") + "</tr>";
  });
  body += "</tbody></table></div>";
  // Points for attention
  body += '<div class="sec">' + esc(V("yeNotes")) + '</div><div class="notes">';
  var any = false;
  if (d.over.length) { any = true; body += '<div class="note r"><b>!</b><div>' + esc(V("yeOver", { names: d.over.join(", ") })) + "</div></div>"; }
  if (d.noTwo.length) { any = true; body += '<div class="note w"><b>!</b><div>' + esc(V("yeNoTwo", { names: d.noTwo.join(", ") })) + "</div></div>"; }
  if (d.unused) { any = true; body += '<div class="note i"><b>i</b><div>' + esc(V("yeUnused", { n: fmtN(d.unused) })) + "</div></div>"; }
  if (!any) body += '<div class="note g"><b>✓</b><div>' + esc(V("yeNone")) + "</div></div>";
  body += '<div class="note i"><b>i</b><div>' + esc(V("yeHalf")) + "</div></div></div>";
  // By country
  body += '<div class="sec">' + esc(V("yeByCountry")) + "</div>";
  body += '<div class="card"><table class="t"><thead><tr><th>' + esc(V("yeCountry")) + '</th><th class="n">' + esc(V("yePeople")) + '</th><th class="n">' + esc(V("yeTotal")) + '</th><th class="n">' + esc(V("yrTaken")) + '</th><th class="n">' + esc(V("yrLeft")) + '</th><th class="n">' + esc(V("yeAvg")) + "</th></tr></thead><tbody>";
  d.countries.forEach(function(c, i){
    body += "<tr" + (i % 2 ? ' class="z"' : "") + "><td><b>" + esc(c.country) + '</b></td><td class="n">' + c.people + '</td><td class="n">' + (c.total ? fmtN(c.total) : '<span class="dim">—</span>') + '</td><td class="n"><b>' + fmtN(c.taken) + '</b></td><td class="n">' + (c.total ? fmtN(c.left) : '<span class="dim">—</span>') + '</td><td class="n">' + fmtN(c.taken / c.people) + "</td></tr>";
  });
  body += "</tbody></table></div>";
  body += '<div class="sigs"><div class="sig"><b>' + esc(V("yeSign1")) + '</b><span></span><div class="ln"><div>' + esc(V("yeSig")) + "</div><div>" + esc(V("yeDate")) + '</div></div></div><div class="sig"><b>' + esc(V("yeSign2")) + "</b><span>" + esc(d.approver || "") + '</span><div class="ln"><div>' + esc(V("yeSig")) + "</div><div>" + esc(V("yeDate")) + "</div></div></div></div>";
  return docHtml(V("yrTitle", { y: yr }) + " · " + (team.name || ""), body);
}

export function exportXLSLegacy(team, t) {
  team = reportSafe(team);
  var yr = safeYear(team);
  var months = t.M || ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var dayL = [t.mo||"Mo",t.tu||"Tu",t.we2||"We",t.th||"Th",t.fr||"Fr",t.sa||"Sa",t.su||"Su"];
  var mColors = ["#3B82F6","#EC4899","#10B981","#F59E0B","#6366F1","#F43F5E","#14B8A6","#F97316","#A855F7","#06B6D4","#EF4444","#84CC16","#F472B6","#0EA5E9","#FBBF24","#818CF8","#34D399","#F87171","#8B5CF6","#2DD4BF","#EAB308","#D946EF","#22D3EE","#FB7185","#4ADE80"];

  // Collect holidays
  var allHols = {};
  team.members.forEach(function(m){ if(m.country) getAllHolidays(m,yr).forEach(function(h){allHols[h]=true;}); });

  // Overlap analysis
  var allDays = {};
  team.members.forEach(function(m){ (m.days||[]).forEach(function(d){ if(!allDays[d])allDays[d]=[]; allDays[d].push(m.name); }); });
  var overlaps = Object.entries(allDays).filter(function(e){return e[1].length>=2;}).sort(function(a,b){return a[0].localeCompare(b[0]);});
  var totalDays = 0; team.members.forEach(function(m){totalDays+=usedOf(m);});

  var xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';

  // Styles
  xml += '<Styles>';
  xml += '<Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="10"/></Style>';
  xml += '<Style ss:ID="title"><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1F2937"/></Style>';
  xml += '<Style ss:ID="sub"><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#6B7280"/></Style>';
  xml += '<Style ss:ID="hdr"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#374151"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>';
  xml += '<Style ss:ID="hdr2"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#7C3AED" ss:Pattern="Solid"/></Style>';
  xml += '<Style ss:ID="sect"><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#374151"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#7C3AED"/></Borders></Style>';
  xml += '<Style ss:ID="stat-val"><Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1" ss:Color="#374151"/><Alignment ss:Horizontal="Center"/></Style>';
  xml += '<Style ss:ID="stat-lbl"><Font ss:FontName="Calibri" ss:Size="9" ss:Color="#6B7280"/><Alignment ss:Horizontal="Center"/></Style>';
  xml += '<Style ss:ID="stat-red"><Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1" ss:Color="#EF4444"/><Alignment ss:Horizontal="Center"/></Style>';
  xml += '<Style ss:ID="stat-grn"><Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1" ss:Color="#10B981"/><Alignment ss:Horizontal="Center"/></Style>';
  xml += '<Style ss:ID="we"><Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/><Font ss:Color="#D1D5DB" ss:FontName="Calibri" ss:Size="9"/><Alignment ss:Horizontal="Center"/></Style>';
  xml += '<Style ss:ID="hol"><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Font ss:Color="#DC2626" ss:FontName="Calibri" ss:Size="9" ss:Bold="1"/><Alignment ss:Horizontal="Center"/></Style>';
  xml += '<Style ss:ID="day"><Font ss:FontName="Calibri" ss:Size="9"/><Alignment ss:Horizontal="Center"/></Style>';
  xml += '<Style ss:ID="day-hdr"><Font ss:FontName="Calibri" ss:Size="8" ss:Bold="1" ss:Color="#9CA3AF"/><Alignment ss:Horizontal="Center"/></Style>';
  xml += '<Style ss:ID="overlap"><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Font ss:Color="#991B1B" ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/></Style>';
  xml += '<Style ss:ID="bold"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/></Style>';
  // Per-member vacation styles
  for(var si=0;si<25;si++){
    xml += '<Style ss:ID="v'+si+'"><Interior ss:Color="'+mColors[si]+'" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:FontName="Calibri" ss:Size="9" ss:Bold="1"/><Alignment ss:Horizontal="Center"/></Style>';
    xml += '<Style ss:ID="vb'+si+'"><Interior ss:Color="'+mColors[si]+'" ss:Pattern="Solid"/></Style>';
  }
  xml += '</Styles>\n';

  // ═══════════ SHEET 1: Dashboard ═══════════
  xml += '<Worksheet ss:Name="Dashboard"><Table ss:DefaultColumnWidth="65">\n';
  xml += '<Column ss:Width="120"/><Column ss:Width="100"/><Column ss:Width="100"/><Column ss:Width="100"/><Column ss:Width="100"/>\n';
  // Title
  xml += '<Row ss:Height="30"><Cell ss:StyleID="title"><Data ss:Type="String">'+esc(team.name)+'</Data></Cell></Row>\n';
  xml += '<Row><Cell ss:StyleID="sub"><Data ss:Type="String">'+yr+' | '+team.members.length+' '+(team.members.length!==1?t.mbs:t.mb)+' | '+esc(V('rpGenOn',{d:new Date().toLocaleDateString(dateLocale())}))+'</Data></Cell></Row>\n';
  xml += '<Row></Row>\n';
  // Stats
  xml += '<Row><Cell ss:StyleID="stat-val"><Data ss:Type="Number">'+totalDays+'</Data></Cell><Cell ss:StyleID="stat-red"><Data ss:Type="Number">'+overlaps.length+'</Data></Cell><Cell ss:StyleID="stat-val"><Data ss:Type="Number">'+team.members.length+'</Data></Cell><Cell ss:StyleID="stat-grn"><Data ss:Type="String">'+avgCoverage(team.members, yr, !!team.w7, function(m){return m.country?getAllHolidays(m,yr):[];})+'%</Data></Cell></Row>\n';
  xml += '<Row><Cell ss:StyleID="stat-lbl"><Data ss:Type="String">'+esc(V("rpTotal"))+'</Data></Cell><Cell ss:StyleID="stat-lbl"><Data ss:Type="String">'+esc(V("rpOverlap"))+'</Data></Cell><Cell ss:StyleID="stat-lbl"><Data ss:Type="String">'+esc(V("rpTeam"))+'</Data></Cell><Cell ss:StyleID="stat-lbl"><Data ss:Type="String">'+esc(V("rpAvgCov"))+'</Data></Cell></Row>\n';
  xml += '<Row></Row>\n';
  // Member summary
  xml += '<Row><Cell ss:StyleID="sect" ss:MergeAcross="4"><Data ss:Type="String">'+esc(V("rpSummary"))+'</Data></Cell></Row>\n';
  xml += '<Row><Cell ss:StyleID="hdr"><Data ss:Type="String">'+esc(V("rpMember"))+'</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">'+esc(V("rpCountry"))+'</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">'+esc(V("rpDays"))+'</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">'+esc(V("rpPeriods"))+'</Data></Cell></Row>\n';
  team.members.forEach(function(m,i){
    var co = m.country ? EU_C.find(function(c){return c.c===m.country;}) : null;
    var sorted = (m.days||[]).slice().sort();
    var ranges = []; var ri = 0;
    while(ri<sorted.length){
      var start=sorted[ri],end=start;
      while(ri+1<sorted.length){if(nextLeaveDay(sorted[ri],sorted[ri+1],!!team.w7)){ri++;end=sorted[ri];}else break;}
      if(start===end)ranges.push(start.slice(5));else ranges.push(start.slice(5)+' to '+end.slice(5));ri++;
    }
    xml += '<Row><Cell ss:StyleID="bold"><Data ss:Type="String">'+esc(m.name)+'</Data></Cell><Cell><Data ss:Type="String">'+(co?co.n:'')+'</Data></Cell><Cell><Data ss:Type="Number">'+usedOf(m)+'</Data></Cell><Cell><Data ss:Type="String">'+ranges.join(', ')+'</Data></Cell></Row>\n';
  });
  // Overlaps
  if(overlaps.length){
    xml += '<Row></Row><Row><Cell ss:StyleID="sect" ss:MergeAcross="3"><Data ss:Type="String">'+esc(V('rpOverlap'))+' ('+overlaps.length+')</Data></Cell></Row>\n';
    xml += '<Row><Cell ss:StyleID="hdr"><Data ss:Type="String">'+esc(V("rpDate"))+'</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">'+esc(V("rpOut"))+'</Data></Cell></Row>\n';
    overlaps.forEach(function(e){
      xml += '<Row><Cell ss:StyleID="overlap"><Data ss:Type="String">'+e[0]+'</Data></Cell><Cell><Data ss:Type="String">'+(e[1] as string[]).map(esc).join(', ')+'</Data></Cell></Row>\n';
    });
  }
  xml += '</Table></Worksheet>\n';

  // ═══════════ SHEET 2: Calendar Grid ═══════════
  xml += '<Worksheet ss:Name="Calendar"><Table ss:DefaultColumnWidth="26">\n';
  xml += '<Column ss:Width="80"/>';
  for(var ci=0;ci<37;ci++) xml += '<Column ss:Width="26"/>';
  xml += '\n';

  for(var mo=0;mo<12;mo++){
    var daysInMo = dim(yr,mo);
    var first = fdm(yr,mo);
    // Month title
    xml += '<Row ss:Height="22"><Cell ss:StyleID="sect"><Data ss:Type="String">'+months[mo]+' '+yr+'</Data></Cell></Row>\n';
    // Day headers
    xml += '<Row><Cell></Cell>';
    for(var dl=0;dl<7;dl++) xml += '<Cell ss:StyleID="day-hdr"><Data ss:Type="String">'+dayL[dl]+'</Data></Cell>';
    xml += '</Row>\n';
    // Calendar rows — each member gets a row per week
    // First, build the team combined calendar
    var weeks = []; var week = []; for(var bl=0;bl<first;bl++) week.push(null);
    for(var d=1;d<=daysInMo;d++){
      week.push(d);
      if(week.length===7){weeks.push(week);week=[];}
    }
    if(week.length) { while(week.length<7) week.push(null); weeks.push(week); }

    weeks.forEach(function(wk){
      xml += '<Row><Cell ss:StyleID="bold"><Data ss:Type="String">'+esc(V("rpTeamLbl"))+'</Data></Cell>';
      wk.forEach(function(d){
        if(!d){xml += '<Cell></Cell>';return;}
        var key = dk(yr,mo,d);
        var isWe2 = isWe(yr,mo,d);
        var isHol2 = !!allHols[key];
        var who = [];
        team.members.forEach(function(m,i){if((m.days||[]).indexOf(key)>=0) who.push(i);});
        var sty = 'day';
        if(isWe2) sty = 'we';
        if(isHol2) sty = 'hol';
        if(who.length===1) sty = 'v'+(who[0]%25);
        else if(who.length>=2) sty = 'overlap';
        xml += '<Cell ss:StyleID="'+sty+'"><Data ss:Type="Number">'+d+'</Data></Cell>';
      });
      xml += '</Row>\n';
    });
    xml += '<Row></Row>\n';
  }
  xml += '</Table></Worksheet>\n';

  // ═══════════ SHEET 3: Timeline (Gantt) ═══════════
  xml += '<Worksheet ss:Name="Timeline"><Table ss:DefaultColumnWidth="16">\n';
  xml += '<Column ss:Width="90"/>';
  for(var ti=0;ti<31;ti++) xml += '<Column ss:Width="16"/>';
  xml += '\n';

  for(var mo2=0;mo2<12;mo2++){
    var daysInMo2 = dim(yr,mo2);
    var hasActivity = false;
    team.members.forEach(function(m){(m.days||[]).forEach(function(d){var p=pk(d);if(p.m===mo2)hasActivity=true;});});
    if(!hasActivity) continue;

    xml += '<Row ss:Height="20"><Cell ss:StyleID="sect"><Data ss:Type="String">'+months[mo2]+'</Data></Cell></Row>\n';
    // Day number header
    xml += '<Row><Cell ss:StyleID="day-hdr"><Data ss:Type="String">'+esc(V("rpName"))+'</Data></Cell>';
    for(var d2=1;d2<=daysInMo2;d2++) xml += '<Cell ss:StyleID="day-hdr"><Data ss:Type="Number">'+d2+'</Data></Cell>';
    xml += '</Row>\n';
    // Member Gantt bars
    team.members.forEach(function(m,i){
      xml += '<Row><Cell ss:StyleID="bold"><Data ss:Type="String">'+esc(m.name)+'</Data></Cell>';
      for(var d3=1;d3<=daysInMo2;d3++){
        var key2 = dk(yr,mo2,d3);
        var has = (m.days||[]).indexOf(key2)>=0;
        var isWe3 = isWe(yr,mo2,d3);
        var isHol3 = !!allHols[key2];
        var sty2 = has ? 'vb'+(i%25) : isHol3 ? 'hol' : isWe3 ? 'we' : 'day';
        xml += '<Cell ss:StyleID="'+sty2+'"><Data ss:Type="String">'+(has?'V':'')+'</Data></Cell>';
      }
      xml += '</Row>\n';
    });
    xml += '<Row></Row>\n';
  }
  xml += '</Table></Worksheet>\n';

  xml += '</Workbook>';
  var blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a"); a.href = url; a.download = fileBase(team.name)+"_"+yr+".xls"; a.click();
  URL.revokeObjectURL(url);
}


// ─── Year-end leave report for HR (Excel and PDF) ───
// Per person: allowance, days brought from last year, taken, left, the longest break and whether it included 10
// working days in a row (the minimum one-block rule in several countries, e.g. Romania Art. 146); per country
// totals; points for attention; a sign-off block. Weekends and public holidays never count; a half day is 0.5.
function yearEndData(team){
  team = reportSafe(team);
  var yr = safeYear(team), w7 = !!team.w7, p = yr + "-";
  var appr = !!team.approver || (team.members||[]).some(function(m){return m.isApprover;});
  var rows = (team.members||[]).map(function(m){
    var co = m.country ? EU_C.find(function(c){return c.c===m.country;}) : null;
    var hol = new Set(m.country ? getAllHolidays(m, yr) : []);
    var mm = { ...m, days:(m.days||[]).filter(function(d){return String(d).startsWith(p);}), half:(m.half||[]).filter(function(d){return String(d).startsWith(p);}) };
    var taken = usedOf(mm), pto = Number(m.pto)||0, carry = Number(m.carry)||0, total = pto + carry;
    var st = streaksOf(mm, yr, hol, w7);
    var longest = st.reduce(function(a,s){return Math.max(a, s.length);}, 0);
    var longLeave = st.reduce(function(a,s){return Math.max(a, s.leave);}, 0);
    return { name:m.name||"", country:co?co.n:"", group:m.group||"", role:m.role||"", pto:pto, carry:carry, total:total, taken:taken,
      left: total ? Math.round((total-taken)*10)/10 : null, longest:longest, two: longLeave >= 10, approved: appr && !m.isApprover && team.approver!==m.id ? !!m.approved : null };
  }).sort(function(a,b){return a.name.localeCompare(b.name);});
  type CRow = { country: string; people: number; total: number; taken: number; left: number };
  var byC: Record<string, CRow> = {};
  rows.forEach(function(r){ var k = r.country || "—"; var c = byC[k] || (byC[k] = { country:k, people:0, total:0, taken:0, left:0 }); c.people++; c.total += r.total; c.taken += r.taken; c.left += r.left || 0; });
  var countries: CRow[] = Object.values(byC).sort(function(a,b){return a.country.localeCompare(b.country);});
  var noTwo = rows.filter(function(r){return !r.two && r.taken > 0;}).map(function(r){return r.name;});
  var never = rows.filter(function(r){return r.taken === 0;}).map(function(r){return r.name;});
  var over = rows.filter(function(r){return r.left !== null && r.left < 0;}).map(function(r){return r.name;});
  var unused = rows.reduce(function(a,r){return a + (r.left && r.left > 0 ? r.left : 0);}, 0);
  var aprM = team.approver ? (team.members||[]).find(function(m){return m.id===team.approver;}) : (team.members||[]).find(function(m){return m.isApprover;});
  return { team:team, yr:yr, appr:appr, rows:rows, countries:countries, noTwo:noTwo.concat(never), over:over, unused:Math.round(unused*10)/10, approver: aprM ? aprM.name : "" };
}
var fmtN = function(n){ return n === null || n === undefined ? "—" : String(Math.round(n*10)/10); };

// PDF exports: say that the file is being prepared, and if the PDF cannot be made, download the HTML version and say so
function pdfOrHtml(html, filename, opts?){
  var tell = function(msg){ try { window.dispatchEvent(new CustomEvent("tvp-save-error", { detail: msg })); } catch(e){ /* no window */ } };
  var note = setTimeout(function(){ tell("⏳ " + V("pdfMaking")); }, 400);
  return withBusy(downloadHtmlAsPdf(html, filename, opts).catch(function(e){
    console.warn("PDF failed, downloading HTML instead", e);
    var url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    var a = document.createElement("a"); a.href = url; a.download = filename.replace(/\.pdf$/, ".html"); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
    tell(V("pdfFail"));
  }).finally(function(){ clearTimeout(note); }));
}

export function yearEndReport(team, t, kind){
  var d = yearEndData(team);
  var title = V("yrTitle", { y: d.yr }) + " · " + (d.team.name || "");
  var gen = new Date().toLocaleDateString(dateLocale());
  var yn = function(b){ return b === null ? "—" : b ? V("yeYes") : V("yeNo"); };
  var heads = [V("yePerson"), V("yeCountry"), V("yeGroup"), V("yeRole"), V("yrAllow"), V("yeCarry",{y:d.yr-1}), V("yeTotal"), V("yrTaken"), V("yrLeft"), V("yeLong"), V("yeTwo")].concat(d.appr ? [V("yeAppr")] : []);
  var line = function(r){ return [r.name, r.country, r.group, r.role, r.pto||"—", r.carry||"—", r.total||"—", r.taken, r.left, r.longest||"—", yn(r.two)].concat(d.appr ? [yn(r.approved)] : []); };
  var notes = [];
  if (d.noTwo.length) notes.push(V("yeNoTwo", { names: d.noTwo.join(", ") }));
  if (d.over.length) notes.push(V("yeOver", { names: d.over.join(", ") }));
  if (d.unused) notes.push(V("yeUnused", { n: fmtN(d.unused) }));
  if (!notes.length) notes.push(V("yeNone"));
  var base = fileBase(d.team.name) + "_" + d.yr + "_year-end";
  if (kind === "xlsx") {
    return withBusy((async function(){
      var mod = await import("write-excel-file/universal");
      var H = function(v){ return { value: String(v), fontWeight: "bold", backgroundColor: "#EDE9FE" }; };
      var C = function(v){ return typeof v === "number" ? { value: v, type: Number } : { value: v === null || v === undefined ? "—" : String(v) }; };
      var s1: Record<string, unknown>[][] = ([[{ value: title, fontWeight: "bold", fontSize: 14 }], [{ value: gen + " · vacationplanner.team" }], [], heads.map(H)] as Record<string, unknown>[][]).concat(d.rows.map(function(r){ return line(r).map(C); }));
      s1.push([]); s1.push([{ value: V("yeNotes"), fontWeight: "bold" }]); notes.forEach(function(n){ s1.push([{ value: n }]); });
      s1.push([]); s1.push([{ value: V("yeHalf") }]);
      var s2: Record<string, unknown>[][] = ([[{ value: V("yeByCountry"), fontWeight: "bold", fontSize: 14 }], [], [V("yeCountry"), V("yePeople"), V("yeTotal"), V("yrTaken"), V("yrLeft"), V("yeAvg")].map(H)] as Record<string, unknown>[][])
        .concat(d.countries.map(function(c){ return [C(c.country), C(c.people), C(Math.round(c.total*10)/10), C(Math.round(c.taken*10)/10), C(Math.round(c.left*10)/10), C(Math.round(c.taken/c.people*10)/10)]; }));
      var w = [22,14,14,18,10,10,9,9,9,14,12,12].slice(0, heads.length).map(function(n){ return { width: n }; });
      var blob = await mod.default([{ sheet: "Year-end", data: s1, columns: w }, { sheet: "By country", data: s2, columns: [22,10,10,10,10,12].map(function(n){return {width:n};}) }] as never).toBlob();
      var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href = url; a.download = base + ".xlsx"; a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    })());
  }
  return pdfOrHtml(yearEndPdfHtml(d, t), base + ".pdf");
}


// ─── Wall planner poster (A3 landscape PDF) ───
// The whole year on one sheet for the office wall: 12 month cards, each day showing who is away as coloured bars,
// public holidays of the team's countries in gold, weekends shaded, a legend of everyone, and the team's logo.
export function wallPoster(team, t){
  team = reportSafe(team);
  var yr = safeYear(team), w7 = !!team.w7;
  var MO = t.M || ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DL = [t.mo||"Mo",t.tu||"Tu",t.we2||"We",t.th||"Th",t.fr||"Fr",t.sa||"Sa",t.su||"Su"];
  var ms = (team.members||[]).map(function(m, i){ return { name: m.name || "", c: MC[i % MC.length].d, days: new Set((m.days||[]).filter(function(d){ return String(d).startsWith(yr + "-"); })), half: new Set(m.half || []) }; });
  var hol = new Set(); (team.members||[]).forEach(function(m){ if (m.country) getAllHolidays(m, yr).forEach(function(h){ hol.add(h); }); });
  var perMonth = new Array(12).fill(0), total = 0;
  ms.forEach(function(m){ m.days.forEach(function(d){ var v = m.half.has(d) ? 0.5 : 1; perMonth[Number(d.slice(5,7)) - 1] += v; total += v; }); });
  var peak = perMonth.indexOf(Math.max.apply(null, perMonth));
  var logo = safeLogo(team.logo);
  var month = function(mo){
    var n = dim(yr, mo), first = fdm(yr, mo), cells = "";
    for (var i = 0; i < first; i++) cells += '<div class="c e"></div>';
    for (var d = 1; d <= n; d++) {
      var k = dk(yr, mo, d), we = !w7 && isWe(yr, mo, d), h = hol.has(k);
      var away = ms.filter(function(m){ return m.days.has(k); });
      var bars = away.slice(0, 4).map(function(m){ return '<i style="background:' + m.c + '"></i>'; }).join("");
      cells += '<div class="c' + (we ? " we" : "") + (h ? " h" : "") + (away.length ? " a" : "") + '"><span>' + d + "</span>" + (away.length ? '<b class="bars">' + bars + "</b>" : "") + (away.length > 4 ? '<em>' + away.length + "</em>" : "") + "</div>";
    }
    return '<section class="m"><h3>' + esc(MO[mo]) + '<small>' + (perMonth[mo] ? (Math.round(perMonth[mo]*10)/10) + " " + esc(t.dys || "days") : "") + "</small></h3><div class=\"g\">" + DL.map(function(x){ return '<div class="dh">' + esc(x) + "</div>"; }).join("") + cells + "</div></section>";
  };
  var legend = ms.map(function(m){ return '<span class="lg"><i style="background:' + m.c + '"></i>' + esc(m.name) + "</span>"; }).join("");
  var html = '<!doctype html><html><head><meta charset="utf-8"><style>'
    + '*{box-sizing:border-box}body{margin:0;width:1587px;min-height:1123px;font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1B1440;background:linear-gradient(135deg,#F5F3FF 0%,#FFFFFF 45%,#ECFEFF 100%);padding:34px 40px 26px}'
    + '.hdr{display:flex;align-items:center;gap:22px;margin-bottom:22px}.logo{width:76px;height:76px;border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:#fff;background:linear-gradient(135deg,#7C3AED,#2563EB);box-shadow:0 14px 30px -14px rgba(76,29,149,.7);overflow:hidden}.logo img{width:100%;height:100%;object-fit:cover}'
    + '.ttl{flex:0 0 auto}.ttl h1{margin:0;font-size:42px;letter-spacing:-.02em;line-height:1.05}.ttl p{margin:4px 0 0;font-size:16px;color:#6B6592}.yr{color:#7C3AED;margin-left:6px}'
    + '.legend{flex:1;display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:flex-end;max-height:84px;overflow:hidden}.lg{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600}.lg i{width:12px;height:12px;border-radius:4px}'
    + '.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.m{background:#fff;border-radius:20px;padding:14px 14px 12px;box-shadow:0 10px 28px -18px rgba(40,20,110,.45);border:1px solid rgba(124,58,237,.10)}'
    + '.m h3{margin:0 0 8px;font-size:18px;display:flex;justify-content:space-between;align-items:baseline}.m h3 small{font-size:12px;font-weight:600;color:#7C3AED}'
    + '.g{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.dh{font-size:10px;font-weight:700;text-align:center;color:#8B86AE;text-transform:uppercase;padding-bottom:2px}'
    + '.c{height:34px;border-radius:8px;position:relative;display:flex;align-items:flex-start;justify-content:flex-start;padding:3px 5px;font-size:11.5px;font-weight:600;color:#3B3466}.c.e{background:none}'
    + '.c.we{background:#F1EFF8;color:#9C97BC}.c.h{background:linear-gradient(135deg,#FEF3C7,#FDE68A);color:#92400E}.c.a{background:#F5F3FF}.c.a.h{background:linear-gradient(135deg,#FEF3C7,#FDE68A)}'
    + '.bars{position:absolute;left:4px;right:4px;bottom:4px;display:flex;gap:2px}.bars i{flex:1;height:6px;border-radius:3px}.c em{position:absolute;top:3px;right:4px;font-style:normal;font-size:9px;font-weight:800;color:#B91C1C}'
    + '.foot{display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-size:13px;color:#6B6592}.chips{display:flex;gap:10px}.chip{padding:6px 12px;border-radius:999px;background:#fff;border:1px solid rgba(124,58,237,.15);font-weight:600;color:#3B3466}'
    + '.key{display:inline-flex;align-items:center;gap:6px;margin-left:12px}.key i{width:14px;height:14px;border-radius:4px;display:inline-block}'
    + '</style></head><body>'
    + '<div class="hdr"><div class="logo">' + (logo ? '<img src="' + logo + '" alt="">' : esc((team.name||"?").trim().charAt(0).toUpperCase())) + '</div>'
    + '<div class="ttl"><h1>' + esc(team.name || "") + ' <span class="yr">' + yr + '</span></h1><p>' + esc(V("psSub")) + "</p></div>"
    + '<div class="legend">' + legend + "</div></div>"
    + '<div class="grid">' + [0,1,2,3,4,5,6,7,8,9,10,11].map(month).join("") + "</div>"
    + '<div class="foot"><div class="chips"><span class="chip">' + esc(V("psTotal", { n: Math.round(total*10)/10 })) + '</span><span class="chip">' + esc(V("psPeak", { m: MO[peak] })) + '</span><span class="chip">' + esc(V("psPeople", { n: ms.length })) + "</span>"
    + '<span class="key"><i style="background:linear-gradient(135deg,#FEF3C7,#FDE68A)"></i>' + esc(V("hmHol")) + '</span><span class="key"><i style="background:#F1EFF8"></i>' + esc(V("hmWe")) + "</span></div>"
    + "<span>vacationplanner.team</span></div></body></html>";
  return pdfOrHtml(html, fileBase(team.name) + "_" + yr + "_wall-planner.pdf", { format: "a3", onePage: true });
}
