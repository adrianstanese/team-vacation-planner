// Report and export builders (PDF report, approved-days PDF, print view, legacy .xls), moved out of app.tsx
// so they load only when someone exports. Code unchanged.
import { downloadHtmlAsPdf } from "@/lib/htmlToPdf";
import { V } from "@/lib/v3Text";
import { dateLocale, monthShort } from "@/lib/extraText";
import { nextLeaveDay } from "@/lib/v3Util";
import { EU_C, MC, dim, dk, esc, fdm, fileBase, pk, reportSafe, safeYear, withBusy, _fd, _fd2, getAllHolidays, isWe, usedOf } from "./app";

// Day totals as the planner shows them: a half day counts 0.5
const fmtD = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);

export function generatePDFReport(team, t) {
  team = reportSafe(team);
  var yr = safeYear(team);
  var months = t.M || ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var dayL = [t.mo||"Mo",t.tu||"Tu",t.we2||"We",t.th||"Th",t.fr||"Fr",t.sa||"Sa",t.su||"Su"];

  // Collect all holidays
  var allHols = {};
  team.members.forEach(function(m){ if(m.country) getAllHolidays(m,yr).forEach(function(h){allHols[h]=true;}); });

  // Overlap analysis
  var allDays = {};
  team.members.forEach(function(m){ (m.days||[]).forEach(function(d){ if(!allDays[d])allDays[d]=[]; allDays[d].push(m.name); }); });
  var overlaps = Object.entries(allDays).filter(function(e){return e[1].length>=2;}).sort(function(a,b){return a[0].localeCompare(b[0]);});
  var totalDays = 0; team.members.forEach(function(m){totalDays+=usedOf(m);});

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+esc(team.name)+' - '+yr+'</title>';
  html += '<style>';
  html += 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;margin:30px 40px;color:#1f2937;font-size:12px}';
  html += 'h1{font-size:22px;margin:0 0 2px;color:#1f2937}';
  html += '.sub{font-size:12px;color:#6b7280;margin:0 0 16px}';
  html += '.hdr{border-bottom:3px solid #7C3AED;padding-bottom:10px;margin-bottom:16px}';
  html += '.legend{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px}';
  html += '.leg-item{display:flex;align-items:center;gap:4px;font-size:11px}';
  html += '.dot{width:10px;height:10px;border-radius:3px;display:inline-block}';
  // Timeline styles
  html += '.tl-title{font-size:13px;font-weight:700;margin:16px 0 8px;color:#374151}';
  html += '.tl-row{display:flex;align-items:center;margin-bottom:3px}';
  html += '.tl-name{width:90px;font-size:11px;font-weight:600;color:#374151;flex-shrink:0}';
  html += '.tl-bar{display:flex;gap:0}';
  html += '.tl-day{width:14px;height:14px;border-radius:2px;margin:0 0.5px}';
  html += '.tl-hdr{display:flex;margin-left:90px;margin-bottom:2px}';
  html += '.tl-hdr-d{width:14px;font-size:7px;text-align:center;color:#9ca3af;margin:0 0.5px}';
  // Calendar grid
  html += '.cal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}';
  html += '.cal-month{border:1px solid #e5e7eb;border-radius:8px;padding:10px}';
  html += '.cal-title{font-size:12px;font-weight:700;color:#1f2937;margin-bottom:6px}';
  html += '.cal-days{display:grid;grid-template-columns:repeat(7,1fr);gap:1px}';
  html += '.cal-lbl{font-size:8px;font-weight:700;color:#9ca3af;text-align:center;padding:2px}';
  html += '.cal-d{font-size:9px;text-align:center;border-radius:3px;padding:3px 0;font-weight:400;color:#374151}';
  html += '.cal-we{color:#d1d5db}';
  html += '.cal-hol{background:#fee2e2;color:#dc2626;font-weight:700}';
  html += '.cal-v1{color:#fff;font-weight:700;border-radius:3px}';
  // Stats & table
  html += '.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}';
  html += '.stat{border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center}';
  html += '.stat-val{font-size:20px;font-weight:800;color:#374151}';
  html += '.stat-lbl{font-size:10px;color:#6b7280;margin-top:2px}';
  html += 'table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11px}';
  html += 'th,td{padding:6px 10px;border:1px solid #e5e7eb;text-align:left}';
  html += 'th{background:#f9fafb;font-weight:700;color:#374151}';
  html += '.footer{margin-top:24px;font-size:9px;color:#d1d5db;text-align:right}';
  html += '@media print{body{margin:20px}}';
  html += '</style></head><body>';

  // Header
  html += '<div class="hdr"><h1>'+esc(team.name)+'</h1>';
  html += '<div class="sub">'+yr+' &middot; '+team.members.length+' '+(team.members.length!==1?t.mbs:t.mb)+' &middot; '+esc(V('rpGenOn',{d:new Date().toLocaleDateString(dateLocale())}))+'</div></div>';

  // Legend
  html += '<div class="legend">';
  team.members.forEach(function(m,i){
    var c=MC[i%MC.length];
    html += '<div class="leg-item"><span class="dot" style="background:'+c.d+'"></span><strong>'+esc(m.name)+'</strong> <span style="color:#9ca3af">('+fmtD(usedOf(m))+'d)</span></div>';
  });
  html += '<div class="leg-item"><span class="dot" style="background:#fee2e2;border:1px solid #fecaca"></span><span style="color:#dc2626;font-weight:600">'+esc(V("rpHoliday"))+'</span></div>';
  html += '</div>';

  // Stats boxes
  var avgCov = team.members.length > 0 ? Math.round((1 - totalDays / (team.members.length * 260)) * 100) : 100;
  html += '<div class="stats">';
  html += '<div class="stat"><div class="stat-val">'+totalDays+'</div><div class="stat-lbl">'+esc(V("rpTotal"))+'</div></div>';
  html += '<div class="stat"><div class="stat-val" style="color:#EF4444">'+overlaps.length+'</div><div class="stat-lbl">'+esc(V("rpOverlap"))+'</div></div>';
  html += '<div class="stat"><div class="stat-val">'+team.members.length+'</div><div class="stat-lbl">'+esc(V("rpTeam"))+'</div></div>';
  html += '<div class="stat"><div class="stat-val" style="color:#10B981">'+avgCov+'%</div><div class="stat-lbl">'+esc(V("rpAvgCov"))+'</div></div>';
  html += '</div>';

  // Timeline per month (only months with activity)
  for (var mo = 0; mo < 12; mo++) {
    var daysInMonth = dim(yr, mo);
    var hasActivity = false;
    team.members.forEach(function(m){ (m.days||[]).forEach(function(d){ var p=pk(d); if(p.m===mo) hasActivity=true; }); });
    if (!hasActivity) continue;

    html += '<div class="tl-title">'+months[mo]+' '+yr+' &mdash; Timeline</div>';
    // Day headers
    html += '<div class="tl-hdr">';
    for(var d=1;d<=daysInMonth;d++) html += '<div class="tl-hdr-d">'+d+'</div>';
    html += '</div>';
    // Member bars
    team.members.forEach(function(m,i){
      var c = MC[i%MC.length];
      html += '<div class="tl-row"><div class="tl-name">'+esc(m.name)+'</div><div class="tl-bar">';
      for(var d=1;d<=daysInMonth;d++){
        var key = dk(yr,mo,d);
        var has = (m.days||[]).indexOf(key) >= 0; var isPending=false;
        html += '<div class="tl-day" style="background:'+(has?c.d:(isPending?c.d+'80':'#f3f4f6'))+(isPending?';background-image:repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,.4) 2px,rgba(255,255,255,.4) 4px)':'')+'"></div>';
      }
      html += '</div></div>';
    });
  }

  // Calendar grid — 12 months, 3 per row
  html += '<div class="tl-title">'+esc(V("rpYearCal"))+'</div>';
  html += '<div class="cal-grid">';
  for (var mo2 = 0; mo2 < 12; mo2++) {
    html += '<div class="cal-month"><div class="cal-title">'+months[mo2]+'</div><div class="cal-days">';
    for(var dl=0;dl<7;dl++) html += '<div class="cal-lbl">'+dayL[dl]+'</div>';
    var firstDay = fdm(yr,mo2);
    var daysInMo = dim(yr,mo2);
    for(var bl=0;bl<firstDay;bl++) html += '<div></div>';
    for(var d2=1;d2<=daysInMo;d2++){
      var key2=dk(yr,mo2,d2);
      var dow=(firstDay+d2-1)%7;
      var isWe2=dow>=5;
      var isHol2=!!allHols[key2];
      var who=[];
      team.members.forEach(function(m,i){if((m.days||[]).indexOf(key2)>=0)who.push(i);});
      var cls='cal-d';
      var sty='';
      if(isWe2) cls+=' cal-we';
      if(isHol2) cls+=' cal-hol';
      if(who.length===1) { cls+=' cal-v1'; sty='background:'+MC[who[0]%MC.length].d; }
      else if(who.length===2) { cls+=' cal-v1'; sty='background:linear-gradient(135deg,'+MC[who[0]%MC.length].d+' 50%,'+MC[who[1]%MC.length].d+' 50%)'; }
      else if(who.length>=3) { cls+=' cal-v1'; sty='background:#EF4444'; }
      html += '<div class="'+cls+'"'+(sty?' style="'+sty+'"':'')+'>'+d2+'</div>';
    }
    html += '</div></div>';
  }
  html += '</div>';

  // Summary table
  html += '<div class="tl-title">'+(t.summary||'Member Summary')+'</div>';
  html += '<table><tr><th>'+(t.mb||'Member')+'</th><th>'+(t.co||'Country')+'</th><th>'+(t.dys||'Days')+'</th><th>'+(t.timeline||'Periods')+'</th></tr>';
  team.members.forEach(function(m,i){
    var co = m.country ? EU_C.find(function(c){return c.c===m.country;}) : null;
    var sorted = (m.days||[]).slice().sort();
    // Group into ranges
    var ranges = [];
    var ri = 0;
    while(ri < sorted.length){
      var start = sorted[ri]; var end = start;
      while(ri+1 < sorted.length){
        if(nextLeaveDay(sorted[ri],sorted[ri+1],!!team.w7)){ri++;end=sorted[ri];}else break;
      }
      if(start===end) ranges.push(start.slice(5));
      else ranges.push(start.slice(5)+' to '+end.slice(5));
      ri++;
    }
    html += '<tr><td><span style="color:'+MC[i%MC.length].d+';font-weight:700">&#9679;</span> '+esc(m.name)+'</td>';
    html += '<td>'+(co?co.f+' '+co.n:'—')+'</td>';
    html += '<td style="text-align:center;font-weight:700">'+fmtD(usedOf(m))+'</td>';
    html += '<td style="color:#6b7280">'+ranges.join(', ')+'</td></tr>';
  });
  html += '</table>';

  // Overlaps
  if(overlaps.length){
    html += '<div class="tl-title">'+(t.overlapDays||V('rpOverlap'))+' ('+overlaps.length+')</div>';
    html += '<table><tr><th>'+esc(V("rpDate"))+'</th><th>'+esc(V("rpOut"))+'</th></tr>';
    overlaps.forEach(function(e){
      html += '<tr><td style="color:#EF4444;font-weight:600">'+e[0]+'</td><td>'+(e[1] as string[]).map(esc).join(', ')+'</td></tr>';
    });
    html += '</table>';
  }

  html += '<div class="footer">Team Vacation Planner &middot; vacationplanner.team &middot; '+new Date().toLocaleDateString(dateLocale())+'</div>';
  html += '</body></html>';

  var base = fileBase(team.name)+"_"+yr+"_report";
  var fallback = function(){
    var blob = new Blob([html], { type: "text/html" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = base+".html"; a.click();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  };
  return withBusy(downloadHtmlAsPdf(html, base+".pdf").catch(function(e){ console.warn("PDF failed, downloading HTML instead", e); fallback(); }));
}

export function generateApprovedPDF(team, t) {
  team = reportSafe(team);
  var yr = safeYear(team);
  var MO = t.M || ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var moS = MO.map(function(_m,i){return monthShort(i);});
  var DL = [t.mo||"Mo",t.tu||"Tu",t.we2||"We",t.th||"Th",t.fr||"Fr",t.sa||"Sa",t.su||"Su"];
  var apr = team.approver ? team.members.find(function(m){return m.id===team.approver;}) : null;
  var aprName = apr ? apr.name : (t.approverLabel||"Approver");
  var now = new Date();
  var ds = now.getDate()+" "+MO[now.getMonth()]+" "+now.getFullYear();

  var am = team.members.filter(function(m){
    return m.approved===true && (m.days||[]).filter(function(x){return x.startsWith(String(yr));}).length > 0;
  });
  var tot = 0;
  am.forEach(function(m){ tot += usedOf({days:(m.days||[]).filter(function(x){return x.startsWith(String(yr));}),half:m.half}); });

  // Labels
  var L = {
    title: t.approvalCert || "Approved Vacation Schedule",
    badge: "✓ " + (t.approved||"APPROVED"),
    members: t.mbs || "Members",
    appDays: V("rpDays") + " · " + (t.approved||"Approved"),
    avg: t.avgDays || "Avg/Person",
    sect1: (t.approved||"Approved") + " — " + (t.summary||"Summary"),
    member: t.mb || "Member",
    country: t.co || "Country",
    days: t.dys || "Days",
    pto: t.pto || "PTO",
    periods: V("rpPeriods"),
    sect2: t.cal || "Calendar",
    we: t.we || "Weekend",
    hol: t.holiday || t.hol || "Holiday",
    vacation: t.onVac || "Vacation",
    approver: t.approverLabel || "Approver",
    ack: t.mb || "Team Member",
    date: V("rpDate")
  };

  var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+esc(team.name)+' — '+L.title+' '+yr+'</title>';
  h += '<style>';
  h += '@page{size:A4 landscape;margin:10mm 12mm}';
  h += '*{box-sizing:border-box}';
  h += 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;margin:0;padding:0;color:#111827;font-size:8.5px;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}';
  // Header
  h += '.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #4f46e5;padding-bottom:8px;margin-bottom:8px}';
  h += '.hd-l{display:flex;align-items:center;gap:10px}';
  h += '.hd-icon{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center}';
  h += '.hd-icon svg{width:16px;height:16px}';
  h += '.hd h1{font-size:14px;margin:0;font-weight:800;letter-spacing:-.3px}';
  h += '.hd-sub{font-size:8px;color:#6b7280;margin:1px 0 0}';
  h += '.badge{padding:3px 10px;border-radius:10px;font-size:7px;font-weight:800;letter-spacing:.6px;background:#dcfce7;color:#166534;border:1px solid #86efac;text-transform:uppercase}';
  // Stats
  h += '.st{display:flex;gap:12px;margin:6px 0 8px}';
  h += '.st-c{flex:1;text-align:center;padding:6px 0;background:#f5f3ff;border-radius:6px;border:1px solid #e0e7ff}';
  h += '.st-n{font-size:18px;font-weight:800;color:#4f46e5}';
  h += '.st-l{font-size:6.5px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;font-weight:700}';
  // Table
  h += '.s{font-size:9px;font-weight:700;color:#312e81;margin:8px 0 4px;padding-bottom:2px;border-bottom:1.5px solid #c7d2fe}';
  h += 'table{width:100%;border-collapse:collapse}';
  h += 'th{background:#f5f3ff;color:#312e81;font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;padding:4px 5px;text-align:left;border-bottom:1.5px solid #c7d2fe}';
  h += 'td{padding:3px 5px;border-bottom:1px solid #f3f4f6;font-size:8px}';
  h += 'tr:nth-child(even){background:#faf9ff}';
  h += 'tr{page-break-inside:avoid;break-inside:avoid}';
  h += '.dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:4px;vertical-align:middle}';
  h += '.ch{display:inline-block;padding:1px 6px;border-radius:3px;font-size:7px;font-weight:700;margin:0 1px;white-space:nowrap}';
  // Calendar
  h += '.cg{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:4px 0 6px}';
  h += '.cm{border:1px solid #e5e7eb;border-radius:4px;padding:3px;page-break-inside:avoid;break-inside:avoid}';
  h += '.ct{font-size:7.5px;font-weight:700;text-align:center;color:#312e81;margin-bottom:2px}';
  h += '.cd-g{display:grid;grid-template-columns:repeat(7,1fr);gap:0}';
  h += '.dl{text-align:center;font-size:5.5px;color:#9ca3af;font-weight:700}';
  h += '.d{text-align:center;font-size:6.5px;padding:1.5px 0;color:#6b7280}';
  h += '.d-we{background:#f3f4f6;color:#c9c9c9}';
  h += '.d-h{background:#fef2f2;color:#ef4444;font-weight:700}';
  h += '.d-v{background:#ef4444;color:#fff;font-weight:800;border-radius:2px}';
  h += '.d-v2{color:#fff;font-weight:800;border-radius:2px}';
  // Legend
  h += '.lg{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0;padding:3px 6px;background:#f9fafb;border-radius:3px;border:1px solid #e5e7eb;font-size:7px}';
  h += '.lg-i{display:flex;align-items:center;gap:2px}';
  h += '.lg-b{width:8px;height:8px;border-radius:2px;display:inline-block}';
  // Footer
  h += '.ft{display:flex;justify-content:space-between;align-items:flex-end;border-top:1.5px solid #4f46e5;padding-top:6px;margin-top:6px}';
  h += '.sig{flex:1}';
  h += '.sig-line{border-top:1px solid #374151;margin-top:20px;padding-top:3px}';
  h += '.sig-n{font-size:9px;font-weight:700;color:#111827}';
  h += '.sig-r{font-size:7px;color:#6b7280}';
  h += '.wm{font-size:6px;color:#d1d5db;text-align:center;margin-top:4px;letter-spacing:.3px}';
  h += '</style></head><body>';

  // ── Header
  h += '<div class="hd"><div class="hd-l">';
  h += '<div class="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg></div>';
  h += '<div><h1>'+esc(team.name)+'</h1><p class="hd-sub">'+L.title+' '+yr+' · '+ds+'</p></div>';
  h += '</div><span class="badge">'+L.badge+'</span></div>';

  // ── Stats
  h += '<div class="st">';
  h += '<div class="st-c"><div class="st-n">'+am.length+'</div><div class="st-l">'+L.members+'</div></div>';
  h += '<div class="st-c"><div class="st-n">'+tot+'</div><div class="st-l">'+L.appDays+'</div></div>';
  h += '<div class="st-c"><div class="st-n">'+Math.round(tot/(am.length||1))+'</div><div class="st-l">'+L.avg+'</div></div>';
  h += '</div>';

  // ── Table
  h += '<div class="s">'+L.sect1+'</div>';
  h += '<table><tr><th>'+L.member+'</th><th>'+L.country+'</th><th style="text-align:center;width:40px">'+L.days+'</th><th style="text-align:center;width:50px">'+L.pto+'</th><th>'+L.periods+'</th></tr>';
  am.forEach(function(m) {
    var days = (m.days||[]).filter(function(x){return x.startsWith(String(yr));}).sort();
    var co = EU_C.find(function(x){return x.c===m.country;});
    var mc = MC[team.members.indexOf(m)%MC.length];
    // Periods
    var rng=[],rS=null,rP=null,rK=null;
    days.forEach(function(d){
      var p=d.split("-");var dt=new Date(+p[0],+p[1]-1,+p[2]);
      if(!rP){rS=d;rP=dt;rK=d;return;}
      if(nextLeaveDay(rK,d,!!team.w7)){rP=dt;rK=d;}
      else{rng.push(rS==_fd2(rP,moS)?_fd(rS,moS):_fd(rS,moS)+" – "+_fd2(rP,moS));rS=d;rP=dt;rK=d;}
    });
    if(rS)rng.push(rS==_fd2(rP,moS)?_fd(rS,moS):_fd(rS,moS)+" – "+_fd2(rP,moS));
    var usedN=usedOf({days:days,half:m.half});
    var ps=m.pto?fmtD(usedN)+"/"+m.pto:"–";
    h+='<tr><td><span class="dot" style="background:'+mc.d+'"></span><strong>'+esc(m.name)+'</strong></td>';
    h+='<td>'+(co?co.f+" "+co.n:"–")+'</td>';
    h+='<td style="text-align:center;font-weight:700;color:'+mc.d+';font-size:11px">'+fmtD(usedN)+'</td>';
    h+='<td style="text-align:center;font-weight:600">'+ps+'</td>';
    h+='<td>'+rng.map(function(r){return '<span class="ch" style="color:'+mc.d+';background:'+mc.d+'10;border:1px solid '+mc.d+'30">'+r+'</span>';}).join("")+'</td></tr>';
  });
  h+='</table>';

  // ── Calendar (6 per row for landscape)
  h+='<div class="s">'+L.sect2+' '+yr+'</div>';
  h+='<div class="cg">';
  var hs={};
  am.forEach(function(m){if(m.country)getAllHolidays(m,yr).forEach(function(x){hs[x]=true;});});
  for(var mo=0;mo<12;mo++){
    h+='<div class="cm"><div class="ct">'+MO[mo]+'</div><div class="cd-g">';
    for(var dl=0;dl<7;dl++)h+='<div class="dl">'+DL[dl]+'</div>';
    var fd=fdm(yr,mo),dm2=dim(yr,mo);
    for(var bl=0;bl<fd;bl++)h+='<div></div>';
    for(var d=1;d<=dm2;d++){
      var k=dk(yr,mo,d),dw=(fd+d-1)%7,we=dw>=5,ih=!!hs[k];
      var w=[];am.forEach(function(m){if((m.days||[]).indexOf(k)>=0)w.push(team.members.indexOf(m));});
      var cl="d",st="";
      if(we)cl+=" d-we";
      if(ih&&w.length===0)cl+=" d-h";
      if(w.length===1){cl+=" d-v";st="background:"+MC[w[0]%MC.length].d;}
      else if(w.length>=2){cl+=" d-v";st="background:#dc2626";}
      h+='<div class="'+cl+'"'+(st?' style="'+st+'"':'')+'>'+d+'</div>';
    }
    h+='</div></div>';
  }
  h+='</div>';

  // ── Legend
  h+='<div class="lg">';
  am.forEach(function(m){
    var mc=MC[team.members.indexOf(m)%MC.length];
    h+='<span class="lg-i"><span class="lg-b" style="background:'+mc.d+'"></span><strong>'+esc(m.name)+'</strong></span>';
  });
  h+='<span style="color:#d1d5db">|</span>';
  h+='<span class="lg-i"><span class="lg-b" style="background:#f3f4f6;border:1px solid #d1d5db"></span>'+L.we+'</span>';
  h+='<span class="lg-i"><span class="lg-b" style="background:#fef2f2;border:1px solid #fecaca"></span>'+L.hol+'</span>';
  h+='<span class="lg-i"><span class="lg-b" style="background:#ef4444"></span>'+L.vacation+'</span>';
  h+='</div>';

  // ── Signatures
  h+='<div class="ft">';
  h+='<div class="sig"><div class="sig-line"><div class="sig-n">'+esc(aprName)+'</div><div class="sig-r">'+L.approver+' · '+ds+'</div></div></div>';
  h+='<div style="width:40px"></div>';
  h+='<div class="sig"><div class="sig-line"><div class="sig-n">&nbsp;</div><div class="sig-r">'+L.ack+' · '+L.date+'</div></div></div>';
  h+='</div>';
  h+='<div class="wm">vacationplanner.team · '+ds+'</div>';
  h+='</body></html>';

  var fname=fileBase(team.name)+"_"+yr+"_approved.pdf";
  return withBusy(downloadHtmlAsPdf(h, fname).catch(function(e){
    console.warn("PDF failed, opening print view instead", e);
    var w2=window.open("","_blank");if(!w2)return;w2.document.write(h);w2.document.close();w2.focus();setTimeout(function(){w2.print();},500);
  }));
}

export function printReport(team, t) {
  team = reportSafe(team);
  var yr = safeYear(team);
  var months = t.M || ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var dayL = [t.mo||"Mo",t.tu||"Tu",t.we2||"We",t.th||"Th",t.fr||"Fr",t.sa||"Sa",t.su||"Su"];

  var allHols = {};
  team.members.forEach(function(m){ if(m.country) getAllHolidays(m,yr).forEach(function(h){allHols[h]=true;}); });

  var allDays = {};
  team.members.forEach(function(m){ (m.days||[]).forEach(function(d){ if(!allDays[d])allDays[d]=[]; allDays[d].push(m.name); }); });
  var overlaps = Object.entries(allDays).filter(function(e){return e[1].length>=2;}).sort(function(a,b){return a[0].localeCompare(b[0]);});
  var totalDays = 0; team.members.forEach(function(m){totalDays+=usedOf(m);});

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+esc(team.name)+' - '+yr+'</title>';
  html += '<style>';
  html += '*{box-sizing:border-box;margin:0;padding:0}';
  html += 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;margin:0;padding:24px 32px;color:#1f2937;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}';
  html += '@page{margin:15mm;size:A4 landscape}';
  html += 'h1{font-size:20px;margin:0 0 2px;color:#1f2937}';
  html += '.sub{font-size:11px;color:#6b7280;margin:0 0 14px}';
  html += '.hdr{border-bottom:3px solid #7C3AED;padding-bottom:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end}';
  html += '.legend{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}';
  html += '.leg-item{display:flex;align-items:center;gap:3px;font-size:10px}';
  html += '.dot{width:8px;height:8px;border-radius:2px;display:inline-block}';
  // Stats
  html += '.stats{display:flex;gap:8px;margin-bottom:14px}';
  html += '.stat{flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:8px;text-align:center}';
  html += '.stat-val{font-size:18px;font-weight:800;color:#374151}';
  html += '.stat-red{font-size:18px;font-weight:800;color:#EF4444}';
  html += '.stat-grn{font-size:18px;font-weight:800;color:#10B981}';
  html += '.stat-lbl{font-size:9px;color:#6b7280;margin-top:1px}';
  // Timeline
  html += '.tl-title{font-size:12px;font-weight:700;margin:14px 0 6px;color:#374151;border-bottom:2px solid #7C3AED;padding-bottom:3px}';
  html += '.tl-row{display:flex;align-items:center;margin-bottom:2px}';
  html += '.tl-name{width:80px;font-size:10px;font-weight:600;color:#374151;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
  html += '.tl-bar{display:flex}';
  html += '.tl-day{width:12px;height:12px;border-radius:2px;margin:0 0.5px}';
  html += '.tl-hdr{display:flex;margin-left:80px;margin-bottom:1px}';
  html += '.tl-hdr-d{width:12px;font-size:7px;text-align:center;color:#9ca3af;margin:0 0.5px}';
  // Calendar
  html += '.cal-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}';
  html += '.cal-month{border:1px solid #e5e7eb;border-radius:6px;padding:6px}';
  html += '.cal-title{font-size:10px;font-weight:700;color:#1f2937;margin-bottom:4px}';
  html += '.cal-days{display:grid;grid-template-columns:repeat(7,1fr);gap:1px}';
  html += '.cal-lbl{font-size:7px;font-weight:700;color:#9ca3af;text-align:center;padding:1px}';
  html += '.cal-d{font-size:8px;text-align:center;border-radius:2px;padding:2px 0;color:#374151}';
  html += '.cal-we{color:#d1d5db}';
  html += '.cal-hol{background:#fee2e2;color:#dc2626;font-weight:700}';
  html += '.cal-v1{color:#fff;font-weight:700}';
  // Table
  html += 'table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}';
  html += 'th,td{padding:4px 8px;border:1px solid #e5e7eb;text-align:left}';
  html += 'th{background:#f9fafb;font-weight:700;color:#374151}';
  html += '.footer{margin-top:16px;font-size:8px;color:#d1d5db;text-align:right}';
  html += '@media print{.no-print{display:none!important}}';
  html += '</style></head><body>';

  // Print button
  html += '<div class="no-print" style="position:fixed;top:10px;right:10px;z-index:100"><button onclick="window.print()" style="padding:8px 20px;border-radius:8px;border:none;background:#7C3AED;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'+esc(V("rpPrint"))+'</button></div>';

  // Header
  html += '<div class="hdr"><div><h1>'+esc(team.name)+'</h1><div class="sub">'+yr+' &middot; '+team.members.length+' '+(team.members.length!==1?t.mbs:t.mb)+' &middot; '+esc(V('rpGenOn',{d:new Date().toLocaleDateString(dateLocale())}))+'</div></div><div style="font-size:9px;color:#9ca3af">vacationplanner.team</div></div>';

  // Legend
  html += '<div class="legend">';
  team.members.forEach(function(m,i){
    var c=MC[i%MC.length];
    html += '<div class="leg-item"><span class="dot" style="background:'+c.d+'"></span><strong>'+esc(m.name)+'</strong> <span style="color:#9ca3af">('+fmtD(usedOf(m))+'d)</span></div>';
  });
  html += '<div class="leg-item"><span class="dot" style="background:#fee2e2;border:1px solid #fecaca"></span><span style="color:#dc2626;font-weight:600">'+esc(V("rpHoliday"))+'</span></div>';
  html += '</div>';

  // Stats
  var avgCov = team.members.length > 0 ? Math.round((1 - totalDays / (team.members.length * 260)) * 100) : 100;
  html += '<div class="stats">';
  html += '<div class="stat"><div class="stat-val">'+totalDays+'</div><div class="stat-lbl">'+esc(V("rpTotal"))+'</div></div>';
  html += '<div class="stat"><div class="stat-red">'+overlaps.length+'</div><div class="stat-lbl">'+esc(V("rpOverlap"))+'</div></div>';
  html += '<div class="stat"><div class="stat-val">'+team.members.length+'</div><div class="stat-lbl">'+esc(V("rpTeam"))+'</div></div>';
  html += '<div class="stat"><div class="stat-grn">'+avgCov+'%</div><div class="stat-lbl">'+esc(V("rpAvgCov"))+'</div></div>';
  html += '</div>';

  // Timeline per active month
  for(var mo=0;mo<12;mo++){
    var daysInMonth = dim(yr,mo);
    var hasActivity = false;
    team.members.forEach(function(m){(m.days||[]).forEach(function(d){var p=pk(d);if(p.m===mo)hasActivity=true;});});
    if(!hasActivity) continue;
    html += '<div class="tl-title">'+months[mo]+' '+yr+'</div>';
    html += '<div class="tl-hdr">';
    for(var d=1;d<=daysInMonth;d++) html += '<div class="tl-hdr-d">'+d+'</div>';
    html += '</div>';
    team.members.forEach(function(m,i){
      var c=MC[i%MC.length];
      html += '<div class="tl-row"><div class="tl-name">'+esc(m.name)+'</div><div class="tl-bar">';
      for(var d2=1;d2<=daysInMonth;d2++){
        var key=dk(yr,mo,d2);
        var has=(m.days||[]).indexOf(key)>=0;var isPnd=false;
        var isHol2=!!allHols[key];
        var isWe2=isWe(yr,mo,d2);
        html += '<div class="tl-day" style="background:'+(has?c.d:isPnd?c.d+'60':isHol2?'#fecaca':isWe2?'#f3f4f6':'#f9fafb')+(isPnd?';background-image:repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,.5) 2px,rgba(255,255,255,.5) 4px)':'')+'"></div>';
      }
      html += '</div></div>';
    });
  }

  // Calendar grid — 4 per row for landscape
  html += '<div class="tl-title">'+esc(V("rpYearCal"))+' '+yr+'</div>';
  html += '<div class="cal-grid">';
  for(var mo3=0;mo3<12;mo3++){
    html += '<div class="cal-month"><div class="cal-title">'+months[mo3]+'</div><div class="cal-days">';
    for(var dl=0;dl<7;dl++) html += '<div class="cal-lbl">'+dayL[dl]+'</div>';
    var firstDay=fdm(yr,mo3);
    var daysInMo=dim(yr,mo3);
    for(var bl=0;bl<firstDay;bl++) html += '<div></div>';
    for(var d3=1;d3<=daysInMo;d3++){
      var key3=dk(yr,mo3,d3);
      var dow2=(firstDay+d3-1)%7;
      var isWe3=dow2>=5;
      var isHol3=!!allHols[key3];
      var who2=[];
      team.members.forEach(function(m,i){if((m.days||[]).indexOf(key3)>=0)who2.push(i);});
      var cls2='cal-d';
      var sty2='';
      if(isWe3) cls2+=' cal-we';
      if(isHol3) cls2+=' cal-hol';
      if(who2.length===1){cls2+=' cal-v1';sty2='background:'+MC[who2[0]%MC.length].d;}
      else if(who2.length===2){cls2+=' cal-v1';sty2='background:linear-gradient(135deg,'+MC[who2[0]%MC.length].d+' 50%,'+MC[who2[1]%MC.length].d+' 50%)';}
      else if(who2.length>=3){cls2+=' cal-v1';sty2='background:#EF4444';}
      html += '<div class="'+cls2+'"'+(sty2?' style="'+sty2+'"':'')+'>'+d3+'</div>';
    }
    html += '</div></div>';
  }
  html += '</div>';

  // Summary table
  html += '<div class="tl-title">'+esc(V("rpSummary"))+'</div>';
  html += '<table><tr><th>'+esc(V("rpMember"))+'</th><th>'+esc(V("rpCountry"))+'</th><th>'+esc(V("rpDays"))+'</th><th>'+esc(V("rpPeriods"))+'</th></tr>';
  team.members.forEach(function(m,i){
    var co = m.country ? EU_C.find(function(c){return c.c===m.country;}) : null;
    var sorted=(m.days||[]).slice().sort();
    var ranges=[]; var ri=0;
    while(ri<sorted.length){
      var start=sorted[ri],end=start;
      while(ri+1<sorted.length){if(nextLeaveDay(sorted[ri],sorted[ri+1],!!team.w7)){ri++;end=sorted[ri];}else break;}
      if(start===end)ranges.push(start.slice(5));else ranges.push(start.slice(5)+' to '+end.slice(5));ri++;
    }
    html += '<tr><td><span style="color:'+MC[i%MC.length].d+';font-weight:700">&#9679;</span> '+esc(m.name)+'</td><td>'+(co?co.f+' '+co.n:'—')+'</td><td style="text-align:center;font-weight:700">'+fmtD(usedOf(m))+'</td><td style="color:#6b7280">'+ranges.join(', ')+'</td></tr>';
  });
  html += '</table>';

  if(overlaps.length){
    html += '<div class="tl-title">'+esc(V('rpOverlap'))+' ('+overlaps.length+')</div>';
    html += '<table><tr><th>'+esc(V("rpDate"))+'</th><th>'+esc(V("rpOut"))+'</th></tr>';
    overlaps.forEach(function(e){html += '<tr><td style="color:#EF4444;font-weight:600">'+e[0]+'</td><td>'+(e[1] as string[]).map(esc).join(', ')+'</td></tr>';});
    html += '</table>';
  }

  html += '<div class="footer">'+esc(V('rpGenerated'))+' &middot; vacationplanner.team &middot; '+new Date().toLocaleDateString(dateLocale())+'</div>';
  html += '</body></html>';

  var win = window.open('','_blank','width=1100,height=800');
  if (!win) { try { window.dispatchEvent(new CustomEvent("tvp-save-error", { detail: "Your browser blocked the print window. Allow pop-ups for this site and try again." })); } catch (e) { /* no window */ } return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(function(){win.print();},500);
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
  xml += '<Row><Cell ss:StyleID="stat-val"><Data ss:Type="Number">'+totalDays+'</Data></Cell><Cell ss:StyleID="stat-red"><Data ss:Type="Number">'+overlaps.length+'</Data></Cell><Cell ss:StyleID="stat-val"><Data ss:Type="Number">'+team.members.length+'</Data></Cell><Cell ss:StyleID="stat-grn"><Data ss:Type="String">'+Math.round((1-totalDays/(team.members.length*260||1))*100)+'%</Data></Cell></Row>\n';
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
