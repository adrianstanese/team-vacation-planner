import { useState, useEffect, useRef, useCallback, Fragment } from "react";

// ═══════════════════════════════════════════════════════════════════
// TEAM VACATION PLANNER v5
// Multi-year holidays · Drag-select · Conflicts · ICS · PDF · Admin
// Heatmap · Timeline · Coverage Dashboard · Embed Widget
// ═══════════════════════════════════════════════════════════════════

// ─── Algorithmic Holiday Engine (2026–2035) ──────────────────────
// Western Easter: Anonymous Gregorian algorithm
function westernEaster(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;return{m:month,d:day};}
// Orthodox Easter: Julian calendar mapped to Gregorian
function orthodoxEaster(y){const a=y%4,b=y%7,c=y%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7,month=Math.floor((d+e+114)/31),day=((d+e+114)%31)+1;const jd=day,jm=month;let gd=jd+13,gm=jm;if(gd>30&&gm===4){gd-=30;gm=5;}else if(gd>31&&gm===3){gd-=31;gm=4;}return{m:gm,d:gd};}

function addDays(y,m,d,n){const dt=new Date(y,m-1,d+n);return{m:dt.getMonth()+1,d:dt.getDate()};}

// Fixed holidays per country (MM-DD format, year-independent)
const FIXED={
AT:["01-01","01-06","05-01","08-15","10-26","11-01","12-08","12-25","12-26"],
BE:["01-01","05-01","07-21","08-15","11-01","11-11","12-25"],
BG:["01-01","03-03","05-01","05-06","05-25","09-07","09-22","12-24","12-25"],
HR:["01-01","01-06","05-01","05-30","06-22","08-05","08-15","11-01","11-18","12-25","12-26"],
CY:["01-01","01-06","03-25","04-01","05-01","08-15","10-01","10-28","12-24","12-25","12-26"],
CZ:["01-01","05-01","05-08","07-05","07-06","09-28","10-28","11-17","12-24","12-25","12-26"],
DK:["01-01","06-05","12-24","12-25","12-26"],
EE:["01-01","02-24","05-01","06-23","06-24","08-20","12-24","12-25","12-26"],
FI:["01-01","01-06","05-01","12-24","12-25","12-26"],
FR:["01-01","05-01","05-08","07-14","08-15","11-01","11-11","12-25"],
DE:["01-01","05-01","10-03","12-25","12-26"],
GR:["01-01","01-06","03-25","05-01","08-15","10-28","12-25","12-26"],
HU:["01-01","03-15","05-01","08-20","10-23","11-01","12-25","12-26"],
IS:["01-01","05-01","06-17","12-24","12-25","12-26","12-31"],
IE:["01-01","02-02","03-17","12-25","12-26"],
IT:["01-01","01-06","04-25","05-01","06-02","08-15","11-01","12-08","12-25","12-26"],
LV:["01-01","05-01","05-04","06-23","06-24","11-18","12-24","12-25","12-26","12-31"],
LI:["01-01","01-06","03-19","05-01","08-15","09-08","11-01","12-25","12-26"],
LT:["01-01","02-16","03-11","05-01","06-24","07-06","08-15","11-01","11-02","12-24","12-25","12-26"],
LU:["01-01","05-01","05-09","06-23","08-15","11-01","12-25","12-26"],
MT:["01-01","02-10","03-19","03-31","05-01","06-07","06-29","08-15","09-08","09-21","12-08","12-13","12-25"],
NL:["01-01","04-27","12-25","12-26"],
NO:["01-01","05-01","05-17","12-24","12-25","12-26"],
PL:["01-01","01-06","05-01","05-03","08-15","11-01","11-11","12-24","12-25","12-26"],
PT:["01-01","04-25","05-01","06-10","08-15","10-05","11-01","12-01","12-08","12-25"],
RO:["01-01","01-02","01-06","01-07","01-24","05-01","06-01","08-15","11-30","12-01","12-25","12-26"],
SK:["01-01","01-06","05-01","05-08","07-05","08-29","09-15","11-01","11-17","12-24","12-25","12-26"],
SI:["01-01","01-02","02-08","04-27","05-01","05-02","06-08","06-25","08-15","10-31","11-01","12-25","12-26"],
ES:["01-01","01-06","05-01","08-15","10-12","11-01","12-06","12-08","12-25"],
SE:["01-01","01-06","05-01","12-24","12-25","12-26","12-31"],
CH:["01-01","05-01","08-01","12-25","12-26"],
GB:["01-01","12-25","12-26"],
UA:["01-01","01-07","03-08","05-01","06-28","07-28","08-24","10-14","12-25"],
RS:["01-01","01-02","01-07","02-15","02-16","05-01","05-02","11-11"],
BA:["01-01","01-02","03-01","05-01","05-02","11-25"],
ME:["01-01","01-02","01-06","01-07","05-01","05-02","05-21","07-13","11-30"],
MK:["01-01","01-07","05-01","05-24","08-02","09-08","10-11","10-23","12-08"],
AL:["01-01","01-02","03-14","05-01","11-28","11-29","12-08","12-25"],
XK:["01-01","01-02","02-17","05-01","05-09","06-12","11-28","12-25"],
MD:["01-01","01-07","01-08","03-08","05-01","05-09","06-01","08-27","08-31","12-25"],
BY:["01-01","01-02","01-07","03-08","05-01","05-09","07-03","11-07","12-25"],
TR:["01-01","04-23","05-01","05-19","07-15","08-30","10-29"],
AD:["01-01","01-06","03-14","05-01","08-15","09-08","11-01","12-08","12-25","12-26"],
MC:["01-01","01-27","05-01","08-15","11-01","11-19","12-08","12-25"],
SM:["01-01","01-06","02-05","03-25","05-01","07-28","09-03","10-01","11-01","11-02","12-08","12-25","12-26"],
SA:["02-22","09-23"],
AE:["01-01","12-01","12-02","12-03"],
CL:["01-01","05-01","05-21","06-29","07-16","08-15","09-18","09-19","10-12","10-31","11-01","12-08","12-25"],
BR:["01-01","04-21","05-01","09-07","10-12","11-02","11-15","12-25"],
MA:["01-01","01-11","05-01","07-30","08-14","08-20","08-21","11-06","11-18"],
KZ:["01-01","01-02","03-08","03-21","03-22","03-23","05-01","05-07","05-09","07-06","08-30","12-01","12-16","12-17"],
BH:["01-01","05-01","12-16","12-17"],
US:["01-01","06-19","07-04","11-11","12-25"],
CA:["01-01","07-01","09-30","11-11","12-25"],
AU:["01-01","01-26","04-25","12-25","12-26"],
};

// Which moveable feasts each country observes (relative to Easter)
// W=Western, O=Orthodox, B=Both
const EASTER_RULES={
AT:{type:"W",days:["E+1","E+39","E+50","E+60"]},// Easter Mon, Ascension, Whit Mon, Corpus Christi
BE:{type:"W",days:["E+1","E+39","E+50"]},
BG:{type:"O",days:["E-2","E-1","E","E+1"]},// Good Fri, Sat, Sun, Mon
HR:{type:"W",days:["E+1","E+60"]},// Easter Mon, Corpus Christi
CY:{type:"O",days:["E-3","E-2","E","E+1","E+50"]},// Clean Mon(-48 from Orth), Good Fri, Sun, Mon, Whit Mon
CZ:{type:"W",days:["E-2","E+1"]},// Good Fri, Easter Mon
DK:{type:"W",days:["E-3","E-2","E","E+1","E+39","E+49","E+50"]},
EE:{type:"W",days:["E-2","E","E+49"]},// Good Fri, Easter, Whit Sun
FI:{type:"W",days:["E-2","E+1","E+39"]},// Good Fri, Easter Mon, Ascension + Midsummer (fixed Jun-19ish)
FR:{type:"W",days:["E+1","E+39","E+50"]},
DE:{type:"W",days:["E-2","E+1","E+39","E+50"]},
GR:{type:"O",days:["E-48","E-2","E","E+1","E+50"]},// Clean Mon, Good Fri, Sun, Mon, Whit Mon
HU:{type:"W",days:["E-2","E+1","E+50"]},// Good Fri, Easter Mon, Whit Mon
IS:{type:"W",days:["E-3","E-2","E+1","E+39","E+50"]},
IE:{type:"W",days:["E-2","E+1"]},
IT:{type:"W",days:["E+1"]},
LV:{type:"W",days:["E-2","E+1"]},
LI:{type:"W",days:["E-2","E+1","E+39","E+50","E+60"]},
LT:{type:"W",days:["E","E+1"]},
LU:{type:"W",days:["E+1","E+39","E+50"]},
MT:{type:"W",days:["E-2"]},
NL:{type:"W",days:["E-2","E+1","E+39","E+50"]},// Good Fri, Easter Mon, Ascension, Whit Mon + Liberation(05-05)
NO:{type:"W",days:["E-3","E-2","E","E+1","E+39","E+49","E+50"]},
PL:{type:"W",days:["E","E+1","E+49","E+60"]},// Easter, Mon, Pentecost, Corpus Christi
PT:{type:"W",days:["E-2","E","E+60"]},// Good Fri, Easter, Corpus Christi + Carnival(-47)
RO:{type:"O",days:["E-2","E","E+1","E+49","E+50"]},// Orth Good Fri, Easter, Mon, Pentecost, Pent Mon
SK:{type:"W",days:["E-2","E+1"]},
SI:{type:"W",days:["E+1"]},// Easter Mon + Whit Sun(E+49 not public)
ES:{type:"W",days:["E-3","E-2"]},// Holy Thu, Good Fri
SE:{type:"W",days:["E-2","E+1","E+39"]},
CH:{type:"W",days:["E-2","E+1","E+39","E+50"]},
GB:{type:"W",days:["E-2","E+1"]},
UA:{type:"O",days:["E","E+1","E+49","E+50"]},
RS:{type:"O",days:["E-2","E-1","E","E+1"]},
ME:{type:"O",days:["E-2","E-1","E","E+1"]},
MK:{type:"O",days:["E+1"]},
AL:{type:"W",days:["E","E+1"]},// Catholic Easter (small Catholic pop, plus Eid dates vary)
XK:{type:"W",days:["E","E+1"]},
MD:{type:"O",days:["E","E+1"]},
SM:{type:"W",days:["E","E+1"]},
AD:{type:"W",days:["E-2","E+1","E+39","E+50"]},
CL:{type:"W",days:["E-2","E-1"]},
BR:{type:"W",days:["E-49","E-48","E-2","E+60"]},
CA:{type:"W",days:["E-2"]},
AU:{type:"W",days:["E-2","E-1","E+1"]},
MC:{type:"W",days:["E+1","E+39","E+50","E+60"]},
};
// Note: BY, TR have no Easter-based holidays

// NL also has Liberation Day (05-05) and King's Day shift
// IE has May/Jun/Aug bank holidays (first Mon)
// GB has May/Spring/Aug bank holidays
// DK has Store Bededag removed since 2024 but still has Grundlovsdag

function computeHolidays(cc, year) {
  const fixed = (FIXED[cc] || []).map(d => `${year}-${d}`);
  const rules = EASTER_RULES[cc];
  if (!rules) return fixed;

  const e = rules.type === "O" ? orthodoxEaster(year) : westernEaster(year);
  const moveable = rules.days.map(rule => {
    // Handle Clean Monday for Greek/Cypriot Orthodox (48 days before Orthodox Easter)
    const offset = parseInt(rule.replace("E", "")) || 0;
    const dt = addDays(year, e.m, e.d, offset);
    return `${year}-${String(dt.m).padStart(2,"0")}-${String(dt.d).padStart(2,"0")}`;
  });

  let all = [...new Set([...fixed, ...moveable])];

  // Special country-specific computed holidays
  if (cc === "GB") {
    // UK bank holidays: Early May (1st Mon May), Spring (last Mon May), Summer (last Mon Aug)
    const earlyMay = nthWeekday(year, 5, 1, 1); // 1st Monday of May
    const springBH = lastWeekday(year, 5, 1); // Last Monday of May
    const summerBH = lastWeekday(year, 8, 1); // Last Monday of Aug
    all.push(dFmt(year, 5, earlyMay), dFmt(year, 5, springBH), dFmt(year, 8, summerBH));
    // Boxing Day substitute if Dec 26 is weekend
    const dec26 = new Date(year, 11, 26).getDay();
    if (dec26 === 0) all.push(dFmt(year, 12, 28)); // Sun -> Mon substitute
    else if (dec26 === 6) all.push(dFmt(year, 12, 28)); // Sat -> Mon substitute
    const dec25 = new Date(year, 11, 25).getDay();
    if (dec25 === 0) { all = all.filter(d => d !== `${year}-12-25`); all.push(dFmt(year, 12, 27)); }
    if (dec25 === 6) { all = all.filter(d => d !== `${year}-12-25`); all.push(dFmt(year, 12, 27)); }
  }
  if (cc === "US") {
    all.push(dFmt(year, 1, nthWeekday(year, 1, 1, 3))); // MLK Day
    all.push(dFmt(year, 2, nthWeekday(year, 2, 1, 3))); // Presidents Day
    all.push(dFmt(year, 5, lastWeekday(year, 5, 1))); // Memorial Day
    all.push(dFmt(year, 9, nthWeekday(year, 9, 1, 1))); // Labor Day
    all.push(dFmt(year, 10, nthWeekday(year, 10, 1, 2))); // Columbus Day
    all.push(dFmt(year, 11, nthWeekday(year, 11, 4, 4))); // Thanksgiving (4th Thu)
  }
  if (cc === "CA") {
    // Victoria Day: Monday before May 25
    for (let d = 24; d >= 18; d--) { if (new Date(year, 4, d).getDay() === 1) { all.push(dFmt(year, 5, d)); break; } }
    all.push(dFmt(year, 9, nthWeekday(year, 9, 1, 1))); // Labour Day
    all.push(dFmt(year, 10, nthWeekday(year, 10, 1, 2))); // Thanksgiving
  }
  if (cc === "AU") {
    all.push(dFmt(year, 6, nthWeekday(year, 6, 1, 2))); // Queen's Birthday (2nd Mon Jun)
  }
  if (cc === "IE") {
    all.push(dFmt(year, 5, nthWeekday(year, 5, 1, 1))); // May BH
    all.push(dFmt(year, 6, nthWeekday(year, 6, 1, 1))); // June BH
    all.push(dFmt(year, 8, nthWeekday(year, 8, 1, 1))); // Aug BH
    all.push(dFmt(year, 10, lastWeekday(year, 10, 1))); // Oct BH
  }
  if (cc === "NL") all.push(dFmt(year, 5, 5)); // Liberation Day
  if (cc === "FI") { // Midsummer Eve: Fri between Jun 19-25
    for (let d = 19; d <= 25; d++) { if (new Date(year, 5, d).getDay() === 5) { all.push(dFmt(year, 6, d)); break; } }
  }
  if (cc === "SE") { // Midsummer Eve: Fri between Jun 19-25
    for (let d = 19; d <= 25; d++) { if (new Date(year, 5, d).getDay() === 5) { all.push(dFmt(year, 6, d)); break; } }
  }
  if (cc === "IS") all.push(dFmt(year, 8, nthWeekday(year, 8, 1, 1))); // Commerce Day
  if (cc === "IS") { // First Day of Summer: Thu Apr 19-25
    for (let d = 19; d <= 25; d++) { if (new Date(year, 3, d).getDay() === 4) { all.push(dFmt(year, 4, d)); break; } }
  }
  if (cc === "CY") { // Clean Monday: 48 days before Orthodox Easter
    const oe = orthodoxEaster(year);
    const cm = addDays(year, oe.m, oe.d, -48);
    all.push(`${year}-${String(cm.m).padStart(2,"0")}-${String(cm.d).padStart(2,"0")}`);
  }
  if (cc === "PT") { // Carnival: 47 days before Easter
    const we = westernEaster(year);
    const cv = addDays(year, we.m, we.d, -47);
    all.push(`${year}-${String(cv.m).padStart(2,"0")}-${String(cv.d).padStart(2,"0")}`);
  }

  // Islamic holidays (lunar calendar - estimated dates shift ~10-11 days/year)
  // 2026 base dates from astronomical calculations, offset by year difference
  const islamicCountries = ["SA","AE","MA","BH","TR"];
  if (islamicCountries.includes(cc)) {
    // Eid al-Fitr and Eid al-Adha approximate dates
    // 2026: Eid al-Fitr ~Mar 20, Eid al-Adha ~May 27
    // Shift ~-10.6 days per year from 2026 base
    const baseYear = 2026;
    const shift = Math.round((year - baseYear) * -10.6);
    const eidFitrBase = new Date(2026, 2, 20); // Mar 20
    const eidAdhaBase = new Date(2026, 4, 27); // May 27
    const hijriNYBase = new Date(2026, 5, 16); // Jun 16
    const mawlidBase = new Date(2026, 7, 25);  // Aug 25

    const shiftDate = (base, days) => {
      const d = new Date(base.getTime() + days * 86400000);
      // Adjust to correct year
      d.setFullYear(year);
      return d;
    };

    if (cc === "SA") {
      // Eid al-Fitr (3 days) + Eid al-Adha (4 days)
      for (let i = 0; i < 3; i++) { const d = shiftDate(eidFitrBase, shift + i); all.push(dFmt(year, d.getMonth()+1, d.getDate())); }
      for (let i = 0; i < 4; i++) { const d = shiftDate(eidAdhaBase, shift + i); all.push(dFmt(year, d.getMonth()+1, d.getDate())); }
    }
    if (cc === "AE") {
      // Eid al-Fitr (3 days), Arafat+Eid al-Adha (4 days), Hijri NY, Prophet Birthday
      for (let i = 0; i < 3; i++) { const d = shiftDate(eidFitrBase, shift + i); all.push(dFmt(year, d.getMonth()+1, d.getDate())); }
      const arafat = shiftDate(eidAdhaBase, shift - 1);
      all.push(dFmt(year, arafat.getMonth()+1, arafat.getDate()));
      for (let i = 0; i < 3; i++) { const d = shiftDate(eidAdhaBase, shift + i); all.push(dFmt(year, d.getMonth()+1, d.getDate())); }
      const hijriNY = shiftDate(hijriNYBase, shift);
      all.push(dFmt(year, hijriNY.getMonth()+1, hijriNY.getDate()));
      const mawlid = shiftDate(mawlidBase, shift);
      all.push(dFmt(year, mawlid.getMonth()+1, mawlid.getDate()));
    }
    if (cc === "MA") {
      // Eid al-Fitr (2 days), Eid al-Adha (4 days), Hijri NY, Prophet Birthday
      for (let i = 0; i < 2; i++) { const d = shiftDate(eidFitrBase, shift + i); all.push(dFmt(year, d.getMonth()+1, d.getDate())); }
      for (let i = 0; i < 4; i++) { const d = shiftDate(eidAdhaBase, shift + i); all.push(dFmt(year, d.getMonth()+1, d.getDate())); }
      const hijriNY = shiftDate(hijriNYBase, shift);
      all.push(dFmt(year, hijriNY.getMonth()+1, hijriNY.getDate()));
      const mawlid = shiftDate(mawlidBase, shift);
      all.push(dFmt(year, mawlid.getMonth()+1, mawlid.getDate()));
    }
    if (cc === "BH") {
      // Eid al-Fitr (3 days), Arafat+Eid al-Adha (4 days), Hijri NY, Ashura (2 days), Prophet Birthday
      for (let i = 0; i < 3; i++) { const d = shiftDate(eidFitrBase, shift + i); all.push(dFmt(year, d.getMonth()+1, d.getDate())); }
      const arafat = shiftDate(eidAdhaBase, shift - 1);
      all.push(dFmt(year, arafat.getMonth()+1, arafat.getDate()));
      for (let i = 0; i < 3; i++) { const d = shiftDate(eidAdhaBase, shift + i); all.push(dFmt(year, d.getMonth()+1, d.getDate())); }
      const hijriNY = shiftDate(hijriNYBase, shift);
      all.push(dFmt(year, hijriNY.getMonth()+1, hijriNY.getDate()));
      // Ashura: 10th Muharram = ~25 days after Hijri NY
      const ashura1 = shiftDate(hijriNYBase, shift + 9);
      const ashura2 = shiftDate(hijriNYBase, shift + 10);
      all.push(dFmt(year, ashura1.getMonth()+1, ashura1.getDate()));
      all.push(dFmt(year, ashura2.getMonth()+1, ashura2.getDate()));
      const mawlid = shiftDate(mawlidBase, shift);
      all.push(dFmt(year, mawlid.getMonth()+1, mawlid.getDate()));
    }
  }

  return [...new Set(all)].sort();
}

function nthWeekday(y, m, dow, n) { // dow: 0=Sun,1=Mon; n: 1st,2nd...
  let count = 0;
  for (let d = 1; d <= 31; d++) { const dt = new Date(y, m-1, d); if (dt.getMonth() !== m-1) break; if (dt.getDay() === dow) { count++; if (count === n) return d; } }
  return 1;
}
function lastWeekday(y, m, dow) {
  for (let d = 31; d >= 1; d--) { const dt = new Date(y, m-1, d); if (dt.getMonth() === m-1 && dt.getDay() === dow) return d; }
  return 1;
}
function dFmt(y, m, d) { return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

// Holiday name lookup
function holName(dateStr) {
  const mmdd = dateStr.slice(5);
  return HNAMES[mmdd] || "Public Holiday";
}
const HNAMES={"01-01":"New Year's Day","01-02":"Day after New Year","01-06":"Epiphany","01-07":"Orthodox Christmas","01-08":"Day after Orthodox Christmas","01-11":"Independence Manifesto","01-19":"MLK Day","01-24":"Unification Day","01-26":"Australia Day","01-27":"St Devota","02-02":"St Brigid's Day","02-05":"St Agatha","02-08":"Prešeren Day","02-10":"St Paul's Shipwreck","02-15":"Statehood Day","02-16":"Statehood Day","02-17":"Independence Day","02-22":"Founding Day","02-24":"Independence Day","03-01":"Independence Day","03-03":"Liberation Day","03-08":"Women's Day","03-11":"Independence Day","03-14":"Summer/Constitution Day","03-15":"National Day","03-17":"St Patrick's Day","03-19":"St Joseph's Day","03-21":"Nauryz / Nowruz","03-22":"Nauryz Day 2","03-23":"Nauryz Day 3","03-25":"Annunciation/Revolution Day","03-31":"Freedom Day","04-01":"National Day","04-21":"Tiradentes Day","04-23":"Sovereignty Day","04-25":"Liberation Day","04-27":"King's Day / Resistance Day","05-01":"Labour Day","05-02":"Labour Day 2","05-03":"Constitution Day","05-04":"Independence Day","05-05":"Liberation Day","05-06":"St George's Day","05-07":"Defender's Day","05-08":"Victory Day","05-09":"Europe/Victory Day","05-17":"Constitution Day","05-19":"Youth Day","05-21":"Independence Day","05-24":"Education Day","05-25":"Education Day","05-30":"Statehood Day","06-01":"Children's Day","06-02":"Republic Day","06-05":"Constitution Day","06-07":"Sette Giugno","06-08":"Trubar Day","06-10":"National Day","06-12":"Peace Day","06-17":"Independence Day","06-19":"Juneteenth","06-22":"Anti-Fascist Day","06-23":"Midsummer / National Day","06-24":"Midsummer / St John's","06-25":"Statehood Day","06-28":"Constitution Day","06-29":"St Peter & Paul","07-01":"Canada Day","07-03":"Independence Day","07-04":"Independence Day","07-05":"Sts Cyril & Methodius","07-06":"Jan Hus Day","07-13":"Statehood Day","07-14":"Bastille Day","07-15":"Democracy Day","07-16":"Our Lady of Carmen","07-21":"National Day","07-28":"Statehood Day","07-30":"Throne Day","08-01":"National Day","08-02":"Ilinden","08-05":"Victory Day","08-14":"Oued Ed-Dahab Day","08-15":"Assumption Day","08-20":"Restoration Day","08-21":"Youth Day","08-24":"Independence Day","08-25":"Prophet's Birthday","08-27":"Independence Day","08-29":"National Uprising Day","08-30":"Victory Day","08-31":"Language Day","09-03":"Founding Day","09-07":"Unification Day","09-08":"Nativity of Mary / Victory Day","09-15":"Our Lady of Sorrows","09-18":"Independence Day","09-19":"Army Day","09-21":"Independence Day","09-22":"Independence Day","09-23":"National Day","09-28":"Statehood Day","09-30":"Truth & Reconciliation","10-01":"Independence Day","10-03":"Unity Day","10-05":"Republic Day","10-11":"Revolution Day","10-12":"National Day","10-14":"Defenders Day","10-23":"Revolution Day","10-26":"National Day","10-28":"Ohi Day","10-29":"Republic Day","10-31":"Reformation Day","11-01":"All Saints' Day","11-02":"All Souls' Day","11-06":"Green March","11-07":"Revolution Day","11-11":"Armistice/Independence Day","11-15":"Republic Day","11-17":"Freedom Day","11-18":"Remembrance/Independence Day","11-19":"National Day","11-25":"Statehood Day","11-26":"Thanksgiving","11-28":"Independence Day","11-29":"Liberation Day","11-30":"St Andrew's Day","12-01":"National Day","12-02":"National Day","12-03":"National Day","12-06":"Constitution Day","12-08":"Immaculate Conception","12-13":"Republic Day","12-16":"National Day","12-17":"National Day","12-24":"Christmas Eve","12-25":"Christmas Day","12-26":"St Stephen's/Boxing Day","12-31":"New Year's Eve"};

// ─── Country Data ────────────────────────────────────────────────
const EU_C=[{c:"AL",n:"Albania",f:"🇦🇱"},{c:"AD",n:"Andorra",f:"🇦🇩"},{c:"AT",n:"Austria",f:"🇦🇹"},{c:"BY",n:"Belarus",f:"🇧🇾"},{c:"BE",n:"Belgium",f:"🇧🇪"},{c:"BA",n:"Bosnia & Herz.",f:"🇧🇦"},{c:"BG",n:"Bulgaria",f:"🇧🇬"},{c:"HR",n:"Croatia",f:"🇭🇷"},{c:"CY",n:"Cyprus",f:"🇨🇾"},{c:"CZ",n:"Czechia",f:"🇨🇿"},{c:"DK",n:"Denmark",f:"🇩🇰"},{c:"EE",n:"Estonia",f:"🇪🇪"},{c:"FI",n:"Finland",f:"🇫🇮"},{c:"FR",n:"France",f:"🇫🇷"},{c:"DE",n:"Germany",f:"🇩🇪"},{c:"GR",n:"Greece",f:"🇬🇷"},{c:"HU",n:"Hungary",f:"🇭🇺"},{c:"IS",n:"Iceland",f:"🇮🇸"},{c:"IE",n:"Ireland",f:"🇮🇪"},{c:"IT",n:"Italy",f:"🇮🇹"},{c:"XK",n:"Kosovo",f:"🇽🇰"},{c:"LV",n:"Latvia",f:"🇱🇻"},{c:"LI",n:"Liechtenstein",f:"🇱🇮"},{c:"LT",n:"Lithuania",f:"🇱🇹"},{c:"LU",n:"Luxembourg",f:"🇱🇺"},{c:"MK",n:"N. Macedonia",f:"🇲🇰"},{c:"MT",n:"Malta",f:"🇲🇹"},{c:"MD",n:"Moldova",f:"🇲🇩"},{c:"MC",n:"Monaco",f:"🇲🇨"},{c:"ME",n:"Montenegro",f:"🇲🇪"},{c:"NL",n:"Netherlands",f:"🇳🇱"},{c:"NO",n:"Norway",f:"🇳🇴"},{c:"PL",n:"Poland",f:"🇵🇱"},{c:"PT",n:"Portugal",f:"🇵🇹"},{c:"RO",n:"Romania",f:"🇷🇴"},{c:"RS",n:"Serbia",f:"🇷🇸"},{c:"SK",n:"Slovakia",f:"🇸🇰"},{c:"SI",n:"Slovenia",f:"🇸🇮"},{c:"SM",n:"San Marino",f:"🇸🇲"},{c:"ES",n:"Spain",f:"🇪🇸"},{c:"SE",n:"Sweden",f:"🇸🇪"},{c:"CH",n:"Switzerland",f:"🇨🇭"},{c:"TR",n:"Turkey",f:"🇹🇷"},{c:"UA",n:"Ukraine",f:"🇺🇦"},{c:"GB",n:"United Kingdom",f:"🇬🇧"},{c:"SA",n:"Saudi Arabia",f:"🇸🇦"},{c:"AE",n:"UAE",f:"🇦🇪"},{c:"CL",n:"Chile",f:"🇨🇱"},{c:"BR",n:"Brazil",f:"🇧🇷"},{c:"MA",n:"Morocco",f:"🇲🇦"},{c:"KZ",n:"Kazakhstan",f:"🇰🇿"},{c:"BH",n:"Bahrain",f:"🇧🇭"},{c:"US",n:"United States",f:"🇺🇸"},{c:"CA",n:"Canada",f:"🇨🇦"},{c:"AU",n:"Australia",f:"🇦🇺"}].sort((a,b)=>a.n.localeCompare(b.n));

// ─── i18n (compact) ──────────────────────────────────────────────
const LANGS={en:{f:"🇬🇧",l:"EN"},fr:{f:"🇫🇷",l:"FR"},de:{f:"🇩🇪",l:"DE"},es:{f:"🇪🇸",l:"ES"},pt:{f:"🇵🇹",l:"PT"},ro:{f:"🇷🇴",l:"RO"},hu:{f:"🇭🇺",l:"HU"},sv:{f:"🇸🇪",l:"SV"},it:{f:"🇮🇹",l:"IT"},bg:{f:"🇧🇬",l:"BG"}};
const TX={
en:{brand:"Team Vacation Planner",tag1:"Beautiful team vacation planning.",tag2:"See who's away, avoid overlaps, stay in sync.",crt:"Create a Team",crSub:"Start a new vacation board",jnt:"Join a Team",jnSub:"Enter a team code",tn:"Team Name",tnP:"e.g. Engineering, Marketing Q3",vy:"Year",cr:"Create Team",jc:"Team Code or Link",jcP:"Paste code or link",jn:"Join Team",nf:"Team not found.",mt:"My Teams",mb:"member",mbs:"members",tm:"Team Members",am:"Add Member",en2:"Enter name…",add:"Add",can:"Cancel",mx:"Max 25",mr:"Removed",nd:"No days",dy:"day",dys:"days",ed:"Editing",tap:"tap dates to toggle · drag to select range",sel:"Select a member to edit vacation days",et:"Your team is ready!",es2:"Add your first member, then pick dates.",af:"Add First",leg:"Legend",ol:"Overlap",os:"Summary",ndy:"No vacation days yet.",dol:"day(s) with 2+ out",sh:"Share",sht:"Share Team Link",shs:"Anyone with this link can join",cl:"Copy Link",cp:"Copied!",lne:"Link never expires.",tc:"Team Code",bf:"Built for teams up to 25",ch:"Country Holidays",tv:"Team Holidays",co:"Country",hol:"holidays",selC:"Select country…",close:"Close",
cal:"Calendar",heatmap:"Heatmap",timeline:"Timeline",coverage:"Coverage",summary:"Summary",
lock:"Lock Board",unlock:"Unlock Board",locked:"Board is locked by admin",export:"Export ICS",pdf:"PDF Report",embed:"Embed Code",
wk:"Workday",we:"Weekend",conflictWarn:"Coverage alert: {n} members out on {date}",threshold:"Alert threshold",
mo:"Mo",tu:"Tu",we2:"We",th:"Th",fr:"Fr",sa:"Sa",su:"Su",
about:"About",contact:"Contact",contactTitle:"Contact & Feedback",contactSub:"We'd love to hear from you",sendFeedback:"Send Feedback",thankYou:"Thank you!",thankYouSub:"Your email client should open with the message ready to send.",yourEmail:"Your email",subjectLabel:"Subject",messageLabel:"Message",selectTopic:"Select a topic…",emailPlaceholder:"your@email.com",msgPlaceholder:"Tell us what is on your mind… (min 10 characters)",chars:"characters",emailNote:"Opens your email client with the message pre-filled. Your email is only used to reply to your feedback.",gotIt:"Got it",back:"Back",subFeedback:"General Feedback",subBug:"Bug Report",subSuggestion:"Feature Suggestion",subQuestion:"Question / How-to",subPartner:"Partnership / Integration",subData:"Data Correction (Holidays)",subOther:"Other",noActivity:"No activity yet.",activityLog:"Activity Log",bestDays:"Best Days for",copyEmbed:"Copy Embed Code",holiday:"Holiday",avgCov:"Avg Coverage",lowWeek:"Lowest Week",weeksLow:"Weeks <70%",inOffice:"In office",onVac:"On vacation",outToday:"Out today",nextVac:"Next",today:"Today",printBtn:"Print / Save as PDF",sheetsTitle:"Google Sheets Live Feed",sheetsSub:"Use =IMPORTDATA(this_url) in Google Sheets to auto-import",cookieMsg:"This tool uses local storage to save your preferences and team data. No personal data is collected or shared with third parties.",
M:["January","February","March","April","May","June","July","August","September","October","November","December"]},
fr:{brand:"Planificateur de Vacances d'Équipe",tag1:"Planification simple des congés d'équipe.",tag2:"Voyez qui est absent, évitez les chevauchements.",crt:"Créer une équipe",crSub:"Créer un nouveau planning de congés",jnt:"Rejoindre une équipe",jnSub:"Entrez le code d'équipe",tn:"Nom de l'équipe",tnP:"ex. Marketing, Ingénierie Q3",vy:"Année",cr:"Créer",jc:"Code ou lien",jcP:"Collez le code",jn:"Rejoindre",nf:"Introuvable.",mt:"Mes équipes",mb:"membre",mbs:"membres",tm:"Membres",am:"Ajouter",en2:"Nom…",add:"Ajouter",can:"Annuler",mx:"Max 25",mr:"Supprimé",nd:"Aucun jour",dy:"jour",dys:"jours",ed:"Modification",tap:"appuyez ou glissez",sel:"Sélectionnez un membre pour modifier ses congés",et:"Équipe prête !",es2:"Ajoutez votre premier membre, puis sélectionnez des dates.",af:"Ajouter",leg:"Légende",ol:"Chevauchement",os:"Résumé",ndy:"Aucun jour de congé planifié.",dol:"jour(s) 2+ absents",sh:"Partager",sht:"Partager le lien",shs:"Toute personne ayant ce lien peut voir et modifier",cl:"Copier",cp:"Copié !",lne:"Lien permanent.",tc:"Code",bf:"Conçu pour des équipes jusqu'à 25 personnes",ch:"Jours fériés",tv:"Fériés équipe",co:"Pays",hol:"jours fériés",selC:"Choisir…",close:"Fermer",
cal:"Calendrier",heatmap:"Heatmap",timeline:"Chronologie",coverage:"Couverture",summary:"Résumé",
lock:"Verrouiller",unlock:"Déverrouiller",locked:"Le tableau est verrouillé par un administrateur",export:"Exporter ICS",pdf:"Rapport PDF",embed:"Code embed",
wk:"Jour ouvré",we:"Weekend",conflictWarn:"Alerte: {n} absents le {date}",threshold:"Seuil d'alerte",
mo:"Lu",tu:"Ma",we2:"Me",th:"Je",fr:"Ve",sa:"Sa",su:"Di",
about:"À propos",contact:"Contact",contactTitle:"Contact & Retour",contactSub:"Nous aimerions avoir de vos nouvelles",sendFeedback:"Envoyer",thankYou:"Merci !",thankYouSub:"Votre client email devrait s'ouvrir avec le message.",yourEmail:"Votre email",subjectLabel:"Sujet",messageLabel:"Message",selectTopic:"Choisir un sujet…",emailPlaceholder:"votre@email.com",msgPlaceholder:"Dites-nous ce que vous pensez… (min 10 caractères)",chars:"caractères",emailNote:"Ouvre votre client email. Votre email est uniquement utilisé pour répondre.",gotIt:"Compris",back:"Retour",subFeedback:"Retour général",subBug:"Signaler un bug",subSuggestion:"Suggestion",subQuestion:"Question",subPartner:"Partenariat / Intégration",subData:"Correction de données (Jours fériés)",subOther:"Autre",noActivity:"Aucune activité.",activityLog:"Journal d'activité",bestDays:"Meilleurs jours pour",copyEmbed:"Copier le code",holiday:"Jour férié",avgCov:"Couverture moy.",lowWeek:"Semaine min.",weeksLow:"Semaines <70%",inOffice:"Au bureau",onVac:"En vacances",outToday:"Absents aujourd'hui",nextVac:"Prochain",today:"Aujourd'hui",printBtn:"Imprimer / Sauvegarder en PDF",sheetsTitle:"Flux Google Sheets",sheetsSub:"Utilisez =IMPORTDATA(url) dans Google Sheets",cookieMsg:"Cet outil utilise le stockage local pour vos préférences. Aucune donnée personnelle n'est collectée.",
M:["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]},
de:{brand:"Team-Urlaubsplaner",tag1:"Einfache Urlaubsplanung für Ihr Team.",tag2:"Sehen Sie, wer abwesend ist, und vermeiden Sie Überschneidungen.",crt:"Team erstellen",crSub:"Neuen Urlaubskalender erstellen",jnt:"Einem Team beitreten",jnSub:"Teamcode eingeben",tn:"Teamname",tnP:"z.B. Marketing, Entwicklung Q3",vy:"Jahr",cr:"Erstellen",jc:"Code oder Link",jcP:"Code einfügen",jn:"Beitreten",nf:"Nicht gefunden.",mt:"Meine Teams",mb:"Mitglied",mbs:"Mitglieder",tm:"Mitglieder",am:"Hinzufügen",en2:"Name…",add:"Hinzufügen",can:"Abbrechen",mx:"Max 25",mr:"Entfernt",nd:"Keine Tage",dy:"Tag",dys:"Tage",ed:"Bearbeitung",tap:"Tippen oder ziehen",sel:"Wählen Sie ein Mitglied, um Urlaubstage zu bearbeiten",et:"Team bereit!",es2:"Fügen Sie Ihr erstes Mitglied hinzu und wählen Sie Tage aus.",af:"Hinzufügen",leg:"Legende",ol:"Überschneidung",os:"Zusammenfassung",ndy:"Noch keine Urlaubstage geplant.",dol:"Tag(e) 2+ abwesend",sh:"Teilen",sht:"Link teilen",shs:"Jeder mit diesem Link kann sehen und bearbeiten",cl:"Kopieren",cp:"Kopiert!",lne:"Link permanent.",tc:"Code",bf:"Für Teams bis 25 Personen",ch:"Feiertage",tv:"Team-Feiertage",co:"Land",hol:"Feiertage",selC:"Land wählen…",close:"Schließen",
cal:"Kalender",heatmap:"Heatmap",timeline:"Zeitleiste",coverage:"Abdeckung",summary:"Zusammenfassung",
lock:"Sperren",unlock:"Entsperren",locked:"Das Board ist durch einen Admin gesperrt",export:"ICS Export",pdf:"PDF-Bericht",embed:"Embed-Code",
wk:"Werktag",we:"Wochenende",conflictWarn:"Warnung: {n} abwesend am {date}",threshold:"Warnschwelle",
mo:"Mo",tu:"Di",we2:"Mi",th:"Do",fr:"Fr",sa:"Sa",su:"So",
about:"Über uns",contact:"Kontakt",contactTitle:"Kontakt & Feedback",contactSub:"Wir freuen uns über Ihre Nachricht",sendFeedback:"Absenden",thankYou:"Vielen Dank!",thankYouSub:"Ihr E-Mail-Programm öffnet sich mit der Nachricht.",yourEmail:"Ihre E-Mail",subjectLabel:"Betreff",messageLabel:"Nachricht",selectTopic:"Thema wählen…",emailPlaceholder:"ihre@email.de",msgPlaceholder:"Was möchten Sie uns mitteilen? (min. 10 Zeichen)",chars:"Zeichen",emailNote:"Öffnet Ihr E-Mail-Programm. Ihre E-Mail wird nur für Antworten verwendet.",gotIt:"Verstanden",back:"Zurück",subFeedback:"Allgemeines Feedback",subBug:"Fehlerbericht",subSuggestion:"Vorschlag",subQuestion:"Frage",subPartner:"Partnerschaft / Integration",subData:"Datenkorrektur (Feiertage)",subOther:"Sonstiges",noActivity:"Keine Aktivität.",activityLog:"Aktivitätslog",bestDays:"Beste Tage für",copyEmbed:"Code kopieren",holiday:"Feiertag",avgCov:"Ø Abdeckung",lowWeek:"Niedrigste Woche",weeksLow:"Wochen <70%",inOffice:"Im Büro",onVac:"Im Urlaub",outToday:"Heute abwesend",nextVac:"Nächster",today:"Heute",printBtn:"Drucken / Als PDF speichern",sheetsTitle:"Google Sheets Feed",sheetsSub:"=IMPORTDATA(url) in Google Sheets verwenden",cookieMsg:"Dieses Tool nutzt lokalen Speicher für Einstellungen. Keine personenbezogenen Daten werden erhoben.",
M:["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"]},
es:{brand:"Planificador de Vacaciones de Equipo",tag1:"Planificación sencilla de vacaciones del equipo.",tag2:"Mira quién está ausente y evita solapamientos.",crt:"Crear equipo",crSub:"Crear un nuevo calendario de vacaciones",jnt:"Unirse a un equipo",jnSub:"Ingresa el código del equipo",tn:"Nombre del equipo",tnP:"ej. Marketing, Ingeniería Q3",vy:"Año",cr:"Crear",jc:"Código o enlace",jcP:"Pegar código",jn:"Unirse",nf:"No encontrado.",mt:"Mis equipos",mb:"miembro",mbs:"miembros",tm:"Miembros",am:"Agregar",en2:"Nombre…",add:"Agregar",can:"Cancelar",mx:"Max 25",mr:"Eliminado",nd:"Sin días",dy:"día",dys:"días",ed:"Editando",tap:"Toca o arrastra",sel:"Selecciona un miembro para editar sus vacaciones",et:"¡Equipo listo!",es2:"Agrega tu primer miembro y selecciona fechas.",af:"Agregar",leg:"Leyenda",ol:"Solapamiento",os:"Resumen",ndy:"Todavía no hay días de vacaciones planificados.",dol:"día(s) 2+ ausentes",sh:"Compartir",sht:"Compartir enlace",shs:"Cualquier persona con este enlace puede ver y editar",cl:"Copiar",cp:"¡Copiado!",lne:"Enlace permanente.",tc:"Código",bf:"Diseñado para equipos de hasta 25 personas",ch:"Festivos",tv:"Festivos equipo",co:"País",hol:"festivos",selC:"Elegir…",close:"Cerrar",
cal:"Calendario",heatmap:"Mapa de calor",timeline:"Cronología",coverage:"Cobertura",summary:"Resumen",
lock:"Bloquear",unlock:"Desbloquear",locked:"El tablero está bloqueado por un administrador",export:"Exportar ICS",pdf:"Informe PDF",embed:"Código embed",
wk:"Laborable",we:"Fin de semana",conflictWarn:"Alerta: {n} ausentes el {date}",threshold:"Umbral de alerta",
mo:"Lu",tu:"Ma",we2:"Mi",th:"Ju",fr:"Vi",sa:"Sá",su:"Do",
about:"Acerca de",contact:"Contacto",contactTitle:"Contacto y Comentarios",contactSub:"Nos encantaría saber de ti",sendFeedback:"Enviar",thankYou:"¡Gracias!",thankYouSub:"Tu cliente de correo se abrirá con el mensaje.",yourEmail:"Tu email",subjectLabel:"Asunto",messageLabel:"Mensaje",selectTopic:"Selecciona un tema…",emailPlaceholder:"tu@email.com",msgPlaceholder:"¿Qué nos quieres decir? (mín. 10 caracteres)",chars:"caracteres",emailNote:"Abre tu cliente de correo. Tu email solo se usa para responder.",gotIt:"Entendido",back:"Volver",subFeedback:"Comentario general",subBug:"Reporte de error",subSuggestion:"Sugerencia",subQuestion:"Pregunta",subPartner:"Asociación / Integración",subData:"Corrección de datos (Festivos)",subOther:"Otro",noActivity:"Sin actividad.",activityLog:"Registro de actividad",bestDays:"Mejores días para",copyEmbed:"Copiar código",holiday:"Festivo",avgCov:"Cobertura prom.",lowWeek:"Semana mín.",weeksLow:"Semanas <70%",inOffice:"En oficina",onVac:"De vacaciones",outToday:"Ausentes hoy",nextVac:"Siguiente",today:"Hoy",printBtn:"Imprimir / Guardar como PDF",sheetsTitle:"Feed de Google Sheets",sheetsSub:"Usa =IMPORTDATA(url) en Google Sheets",cookieMsg:"Esta herramienta usa almacenamiento local. No se recopilan datos personales.",
M:["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]},
pt:{brand:"Planeador de Férias de Equipa",tag1:"Planeamento simples de férias da equipa.",tag2:"Veja quem está ausente e evite sobreposições.",crt:"Criar equipa",crSub:"Criar novo calendário de férias",jnt:"Juntar-se a uma equipa",jnSub:"Código ou link da equipa",tn:"Nome da equipa",tnP:"ex. Marketing, Engenharia Q3",vy:"Ano",cr:"Criar",jc:"Código ou link",jcP:"Colar código",jn:"Juntar-se",nf:"Não encontrado.",mt:"As minhas equipas",mb:"membro",mbs:"membros",tm:"Membros",am:"Adicionar",en2:"Nome…",add:"Adicionar",can:"Cancelar",mx:"Max 25",mr:"Removido",nd:"Sem dias",dy:"dia",dys:"dias",ed:"A editar",tap:"Toque ou arraste",sel:"Selecione um membro para editar as férias",et:"Equipa pronta!",es2:"Adicione o primeiro membro e selecione datas.",af:"Adicionar",leg:"Legenda",ol:"Sobreposição",os:"Resumo",ndy:"Ainda sem dias de férias planeados.",dol:"dia(s) 2+ ausentes",sh:"Partilhar",sht:"Partilhar link",shs:"Qualquer pessoa com este link pode ver e editar",cl:"Copiar",cp:"Copiado!",lne:"Link permanente.",tc:"Código",bf:"Para equipas até 25 pessoas",ch:"Feriados",tv:"Feriados equipa",co:"País",hol:"feriados",selC:"Escolher…",close:"Fechar",
cal:"Calendário",heatmap:"Heatmap",timeline:"Cronologia",coverage:"Cobertura",summary:"Resumo",
lock:"Bloquear",unlock:"Desbloquear",locked:"O quadro está bloqueado por um administrador",export:"Exportar ICS",pdf:"Relatório PDF",embed:"Código embed",
wk:"Dia útil",we:"Fim de semana",conflictWarn:"Alerta: {n} ausentes em {date}",threshold:"Limite de alerta",
mo:"Sg",tu:"Te",we2:"Qa",th:"Qi",fr:"Sx",sa:"Sb",su:"Do",
about:"Sobre",contact:"Contacto",contactTitle:"Contacto e Feedback",contactSub:"Gostaríamos de ouvir a sua opinião",sendFeedback:"Enviar",thankYou:"Obrigado!",thankYouSub:"O seu cliente de email abrirá com a mensagem.",yourEmail:"O seu email",subjectLabel:"Assunto",messageLabel:"Mensagem",selectTopic:"Selecione um tema…",emailPlaceholder:"seu@email.com",msgPlaceholder:"O que gostaria de nos dizer? (mín. 10 caracteres)",chars:"caracteres",emailNote:"Abre o seu cliente de email. O seu email é usado apenas para responder.",gotIt:"Entendido",back:"Voltar",subFeedback:"Feedback geral",subBug:"Relatório de erro",subSuggestion:"Sugestão",subQuestion:"Pergunta",subPartner:"Parceria / Integração",subData:"Correção de dados (Feriados)",subOther:"Outro",noActivity:"Sem atividade.",activityLog:"Registo de atividade",bestDays:"Melhores dias para",copyEmbed:"Copiar código",holiday:"Feriado",avgCov:"Cobertura méd.",lowWeek:"Semana mín.",weeksLow:"Semanas <70%",inOffice:"No escritório",onVac:"De férias",outToday:"Ausentes hoje",nextVac:"Próximo",today:"Hoje",printBtn:"Imprimir / Guardar como PDF",sheetsTitle:"Feed Google Sheets",sheetsSub:"Use =IMPORTDATA(url) no Google Sheets",cookieMsg:"Esta ferramenta usa armazenamento local. Nenhum dado pessoal é recolhido.",
M:["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]},
ro:{brand:"Planificator Concedii Echipă",tag1:"Planificarea ușoară a concediilor în echipă.",tag2:"Vezi cine lipsește și evită suprapunerile.",crt:"Creează echipă",crSub:"Creează un nou calendar de concedii",jnt:"Alătură-te unei echipe",jnSub:"Introdu codul echipei",tn:"Numele echipei",tnP:"ex. Marketing, Inginerie T3",vy:"An",cr:"Creează",jc:"Cod sau link",jcP:"Lipește codul",jn:"Alătură-te",nf:"Echipa nu a fost găsită.",mt:"Echipele mele",mb:"membru",mbs:"membri",tm:"Membri",am:"Adaugă membru",en2:"Numele colegului…",add:"Adaugă",can:"Anulează",mx:"Max 25",mr:"Eliminat",nd:"Nicio zi",dy:"zi",dys:"zile",ed:"Editare",tap:"Apasă sau trage",sel:"Selectează un coleg pentru a edita zilele de concediu",et:"Echipa e gata!",es2:"Adaugă primul coleg, apoi selectează datele.",af:"Adaugă",leg:"Legendă",ol:"Suprapunere",os:"Rezumat",ndy:"Nu sunt încă zile de concediu planificate.",dol:"zi(le) 2+ absenți",sh:"Partajează",sht:"Partajează linkul echipei",shs:"Oricine are acest link poate vedea și edita",cl:"Copiază",cp:"Copiat!",lne:"Link permanent.",tc:"Cod",bf:"Creat pentru echipe de până la 25 de persoane",ch:"Sărbători legale",tv:"Sărbătorile echipei",co:"Țara",hol:"sărbători legale",selC:"Alege țara…",close:"Închide",
cal:"Calendar",heatmap:"Hartă termică",timeline:"Cronologie",coverage:"Acoperire",summary:"Rezumat",
lock:"Blochează",unlock:"Deblochează",locked:"Panoul este blocat de administrator",export:"Export ICS",pdf:"Raport PDF",embed:"Cod embed",
wk:"Zi lucrătoare",we:"Weekend",conflictWarn:"Alertă: {n} absenți pe {date}",threshold:"Prag alertă",
mo:"Lu",tu:"Ma",we2:"Mi",th:"Jo",fr:"Vi",sa:"Sâ",su:"Du",
about:"Despre",contact:"Contact",contactTitle:"Contact și Feedback",contactSub:"Ne-ar plăcea să aflăm părerea ta",sendFeedback:"Trimite",thankYou:"Mulțumim!",thankYouSub:"Clientul de email se va deschide cu mesajul.",yourEmail:"Emailul tău",subjectLabel:"Subiect",messageLabel:"Mesaj",selectTopic:"Alege un subiect…",emailPlaceholder:"email@exemplu.ro",msgPlaceholder:"Ce ne dorești să ne spui? (min. 10 caractere)",chars:"caractere",emailNote:"Deschide clientul de email. Emailul tău este folosit doar pentru răspuns.",gotIt:"Am înțeles",back:"Înapoi",subFeedback:"Feedback general",subBug:"Raport de eroare",subSuggestion:"Sugestie",subQuestion:"Întrebare",subPartner:"Parteneriat / Integrare",subData:"Corectare date (Sărbători)",subOther:"Altele",noActivity:"Nicio activitate.",activityLog:"Jurnal de activitate",bestDays:"Cele mai bune zile pentru",copyEmbed:"Copiază codul",holiday:"Sărbătoare legală",avgCov:"Acoperire medie",lowWeek:"Săptămâna min.",weeksLow:"Săptămâni <70%",inOffice:"La birou",onVac:"În concediu",outToday:"Absenți azi",nextVac:"Următor",today:"Azi",printBtn:"Printare / Salvare ca PDF",sheetsTitle:"Feed Google Sheets",sheetsSub:"Folosește =IMPORTDATA(url) în Google Sheets",cookieMsg:"Acest instrument folosește stocarea locală. Nu sunt colectate date personale.",
M:["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"]},
hu:{brand:"Csapat Szabadságtervező",tag1:"Egyszerű szabadságtervezés a csapat számára.",tag2:"Lásd, ki van távol, és kerüld el az átfedéseket.",crt:"Csapat létrehozása",crSub:"Új szabadságnaptár létrehozása",jnt:"Csatlakozás csapathoz",jnSub:"Csapatkód megadása",tn:"Csapat neve",tnP:"pl. Marketing, Fejlesztés",vy:"Év",cr:"Létrehozás",jc:"Kód vagy link",jcP:"Kód beillesztése",jn:"Csatlakozás",nf:"Nem található.",mt:"Csapataim",mb:"tag",mbs:"tag",tm:"Tagok",am:"Hozzáadás",en2:"Név…",add:"Hozzáadás",can:"Mégse",mx:"Max 25",mr:"Eltávolítva",nd:"Nincs nap",dy:"nap",dys:"nap",ed:"Szerkesztés",tap:"Koppints vagy húzd",sel:"Válassz egy tagot a szabadságnapok szerkesztéséhez",et:"Csapat kész!",es2:"Add hozzá az első tagot, majd válassz napokat.",af:"Első tag",leg:"Jelmagyarázat",ol:"Átfedés",os:"Összefoglaló",ndy:"Még nincsenek szabadságnapok tervezve.",dol:"nap 2+ távol",sh:"Megosztás",sht:"Link megosztása",shs:"Bárki hozzáfér és szerkeszthet ezzel a linkkel",cl:"Másolás",cp:"Másolva!",lne:"Állandó link.",tc:"Kód",bf:"Legfeljebb 25 fős csapatoknak",ch:"Ünnepnapok",tv:"Csapat ünnepnapok",co:"Ország",hol:"ünnepnap",selC:"Válassz…",close:"Bezárás",
cal:"Naptár",heatmap:"Hőtérkép",timeline:"Idővonal",coverage:"Lefedettség",summary:"Összefoglaló",
lock:"Zárolás",unlock:"Feloldás",locked:"A táblát egy adminisztrátor zárolta",export:"ICS export",pdf:"PDF jelentés",embed:"Beágyazó kód",
wk:"Munkanap",we:"Hétvége",conflictWarn:"Figyelem: {n} távol {date}",threshold:"Riasztási küszöb",
mo:"Hé",tu:"Ke",we2:"Sze",th:"Cs",fr:"Pé",sa:"Szo",su:"Va",
about:"Névjegy",contact:"Kapcsolat",contactTitle:"Kapcsolat és Visszajelzés",contactSub:"Szívesen hallanánk véleményét",sendFeedback:"Küldés",thankYou:"Köszönjük!",thankYouSub:"Az email kliens megnyílik az üzenettel.",yourEmail:"Az email címe",subjectLabel:"Tárgy",messageLabel:"Üzenet",selectTopic:"Válasszon témát…",emailPlaceholder:"az@emailcime.hu",msgPlaceholder:"Mit szeretne mondani? (min. 10 karakter)",chars:"karakter",emailNote:"Megnyitja az email klienst. Az email csak válaszadásra használt.",gotIt:"Értem",back:"Vissza",subFeedback:"Általános visszajelzés",subBug:"Hibajelentés",subSuggestion:"Javaslat",subQuestion:"Kérdés",subPartner:"Partnerség / Integráció",subData:"Adatjavítás (Ünnepnapok)",subOther:"Egyéb",noActivity:"Nincs aktivitás.",activityLog:"Tevékenységnapló",bestDays:"Legjobb napok:",copyEmbed:"Kód másolása",holiday:"Ünnepnap",avgCov:"Átlag lefedettség",lowWeek:"Leggyengébb hét",weeksLow:"Hetek <70%",inOffice:"Irodában",onVac:"Szabadságon",outToday:"Ma távol",nextVac:"Következő",today:"Ma",printBtn:"Nyomtatás / Mentés PDF-ként",sheetsTitle:"Google Sheets feed",sheetsSub:"=IMPORTDATA(url) a Google Sheetsben",cookieMsg:"Ez az eszköz helyi tárolót használ. Személyes adatok nem kerülnek gyűjtésre.",
M:["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"]},
sv:{brand:"Team Semesterplanerare",tag1:"Enkel semesterplanering för hela teamet.",tag2:"Se vem som är borta och undvik överlappningar.",crt:"Skapa ett team",crSub:"Skapa en ny semesterkalender",jnt:"Gå med i ett team",jnSub:"Ange teamkod",tn:"Teamnamn",tnP:"t.ex. Marknadsföring, Utveckling Q3",vy:"År",cr:"Skapa",jc:"Kod eller länk",jcP:"Klistra in kod",jn:"Gå med",nf:"Hittades inte.",mt:"Mina team",mb:"medlem",mbs:"medlemmar",tm:"Medlemmar",am:"Lägg till",en2:"Namn…",add:"Lägg till",can:"Avbryt",mx:"Max 25",mr:"Borttagen",nd:"Inga dagar",dy:"dag",dys:"dagar",ed:"Redigerar",tap:"Tryck eller dra",sel:"Välj en medlem för att redigera semesterdagar",et:"Teamet är klart!",es2:"Lägg till din första medlem och välj datum.",af:"Lägg till",leg:"Förklaring",ol:"Överlappning",os:"Sammanfattning",ndy:"Inga semesterdagar planerade ännu.",dol:"dag(ar) 2+ borta",sh:"Dela",sht:"Dela länk",shs:"Alla med denna länk kan se och redigera",cl:"Kopiera",cp:"Kopierat!",lne:"Permanent länk.",tc:"Kod",bf:"Byggt för team upp till 25 personer",ch:"Helgdagar",tv:"Teamets helgdagar",co:"Land",hol:"helgdagar",selC:"Välj land…",close:"Stäng",
cal:"Kalender",heatmap:"Värmekarta",timeline:"Tidslinje",coverage:"Täckning",summary:"Sammanfattning",
lock:"Lås",unlock:"Lås upp",locked:"Tavlan är låst av en administratör",export:"ICS-export",pdf:"PDF-rapport",embed:"Inbäddningskod",
wk:"Arbetsdag",we:"Helg",conflictWarn:"Varning: {n} borta {date}",threshold:"Varningströskel",
mo:"Må",tu:"Ti",we2:"On",th:"To",fr:"Fr",sa:"Lö",su:"Sö",
about:"Om",contact:"Kontakt",contactTitle:"Kontakt & Feedback",contactSub:"Vi vill gärna höra från dig",sendFeedback:"Skicka",thankYou:"Tack!",thankYouSub:"Din e-postklient öppnas med meddelandet.",yourEmail:"Din e-post",subjectLabel:"Ämne",messageLabel:"Meddelande",selectTopic:"Välj ett ämne…",emailPlaceholder:"din@epost.se",msgPlaceholder:"Vad vill du berätta? (minst 10 tecken)",chars:"tecken",emailNote:"Öppnar din e-postklient. Din e-post används bara för svar.",gotIt:"Förstått",back:"Tillbaka",subFeedback:"Allmän feedback",subBug:"Felrapport",subSuggestion:"Förslag",subQuestion:"Fråga",subPartner:"Partnerskap / Integration",subData:"Datakorrigering (Helgdagar)",subOther:"Övrigt",noActivity:"Ingen aktivitet.",activityLog:"Aktivitetslogg",bestDays:"Bästa dagar för",copyEmbed:"Kopiera kod",holiday:"Helgdag",avgCov:"Snitt täckning",lowWeek:"Lägsta vecka",weeksLow:"Veckor <70%",inOffice:"På kontoret",onVac:"På semester",outToday:"Borta idag",nextVac:"Nästa",today:"Idag",printBtn:"Skriv ut / Spara som PDF",sheetsTitle:"Google Sheets-flöde",sheetsSub:"Använd =IMPORTDATA(url) i Google Sheets",cookieMsg:"Detta verktyg använder lokal lagring. Inga personuppgifter samlas in.",
M:["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]},
it:{brand:"Pianificatore Ferie di Squadra",tag1:"Pianificazione semplice delle ferie del team.",tag2:"Vedi chi è assente ed evita le sovrapposizioni.",crt:"Crea un team",crSub:"Crea un nuovo calendario ferie",jnt:"Unisciti a un team",jnSub:"Inserisci il codice del team",tn:"Nome del team",tnP:"es. Marketing, Ingegneria Q3",vy:"Anno",cr:"Crea",jc:"Codice o link",jcP:"Incolla codice",jn:"Unisciti",nf:"Non trovato.",mt:"I miei team",mb:"membro",mbs:"membri",tm:"Membri",am:"Aggiungi",en2:"Nome…",add:"Aggiungi",can:"Annulla",mx:"Max 25",mr:"Rimosso",nd:"Nessun giorno",dy:"giorno",dys:"giorni",ed:"Modifica",tap:"Tocca o trascina",sel:"Seleziona un membro per modificare i giorni di ferie",et:"Il team è pronto!",es2:"Aggiungi il primo membro e seleziona le date.",af:"Aggiungi",leg:"Legenda",ol:"Sovrapposizione",os:"Riepilogo",ndy:"Nessun giorno di ferie pianificato.",dol:"giorno/i 2+ assenti",sh:"Condividi",sht:"Condividi link",shs:"Chiunque abbia questo link può vedere e modificare",cl:"Copia",cp:"Copiato!",lne:"Link permanente.",tc:"Codice",bf:"Progettato per team fino a 25 persone",ch:"Festività",tv:"Festività del team",co:"Paese",hol:"festività",selC:"Scegli paese…",close:"Chiudi",
cal:"Calendario",heatmap:"Mappa termica",timeline:"Cronologia",coverage:"Copertura",summary:"Riepilogo",
lock:"Blocca",unlock:"Sblocca",locked:"La bacheca è bloccata da un amministratore",export:"Esporta ICS",pdf:"Report PDF",embed:"Codice embed",
wk:"Feriale",we:"Fine settimana",conflictWarn:"Attenzione: {n} assenti il {date}",threshold:"Soglia di allarme",
mo:"Lu",tu:"Ma",we2:"Me",th:"Gi",fr:"Ve",sa:"Sa",su:"Do",
about:"Info",contact:"Contatti",contactTitle:"Contatti e Feedback",contactSub:"Ci piacerebbe sentire la tua opinione",sendFeedback:"Invia",thankYou:"Grazie!",thankYouSub:"Il tuo client email si aprirà con il messaggio.",yourEmail:"La tua email",subjectLabel:"Oggetto",messageLabel:"Messaggio",selectTopic:"Scegli un argomento…",emailPlaceholder:"tua@email.it",msgPlaceholder:"Cosa vorresti dirci? (min. 10 caratteri)",chars:"caratteri",emailNote:"Apre il tuo client email. La tua email è usata solo per rispondere.",gotIt:"Capito",back:"Indietro",subFeedback:"Feedback generale",subBug:"Segnalazione errore",subSuggestion:"Suggerimento",subQuestion:"Domanda",subPartner:"Partnership / Integrazione",subData:"Correzione dati (Festività)",subOther:"Altro",noActivity:"Nessuna attività.",activityLog:"Registro attività",bestDays:"Giorni migliori per",copyEmbed:"Copia codice",holiday:"Festivo",avgCov:"Copertura media",lowWeek:"Settimana min.",weeksLow:"Settimane <70%",inOffice:"In ufficio",onVac:"In ferie",outToday:"Assenti oggi",nextVac:"Prossimo",today:"Oggi",printBtn:"Stampa / Salva come PDF",sheetsTitle:"Feed Google Sheets",sheetsSub:"Usa =IMPORTDATA(url) in Google Sheets",cookieMsg:"Questo strumento usa l'archiviazione locale. Nessun dato personale viene raccolto.",
M:["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"]},
bg:{brand:"Планер за отпуски на екипа",tag1:"Лесно планиране на отпуските в екипа.",tag2:"Вижте кой отсъства и избегнете припокривания.",crt:"Създаване на екип",crSub:"Нов календар за отпуски",jnt:"Присъединяване към екип",jnSub:"Въведете код или линк на екипа",tn:"Име на екипа",tnP:"напр. Маркетинг, Разработка",vy:"Година",cr:"Създай",jc:"Код или линк",jcP:"Постави код",jn:"Присъединяване",nf:"Не е намерен.",mt:"Моите екипи",mb:"член",mbs:"членове",tm:"Членове на екипа",am:"Добавяне на член",en2:"Име на колега…",add:"Добави",can:"Отказ",mx:"Макс 25",mr:"Премахнат",nd:"Няма отпуск",dy:"ден",dys:"дни",ed:"Редактиране",tap:"Натиснете или плъзнете за избор на дати",sel:"Изберете колега за редактиране",et:"Екипът е създаден!",es2:"Добавете първия колега и изберете дати.",af:"Добави първия",leg:"Легенда",ol:"Припокриване",os:"Резюме",ndy:"Все още няма планирани отпуски.",dol:"дни с 2+ отсъстващи",sh:"Сподели",sht:"Споделяне на линк",shs:"Всеки с този линк може да вижда и редактира",cl:"Копирай",cp:"Копирано!",lne:"Линкът е постоянен.",tc:"Код",bf:"За екипи до 25 души",ch:"Официални празници",tv:"Официални празници на екипа",co:"Държава",hol:"официални празници",selC:"Изберете…",close:"Затвори",
cal:"Календар",heatmap:"Карта на натовареност",timeline:"Времева линия",coverage:"Наличност",summary:"Обобщение",
lock:"Заключване на таблото",unlock:"Отключване на таблото",locked:"Таблото е заключено от администратор",export:"Експорт в ICS",pdf:"PDF справка",embed:"Код за вграждане",
wk:"Работен ден",we:"Почивен ден",conflictWarn:"Внимание: {n} колеги отсъстват на {date}",threshold:"Праг за предупреждение",
mo:"По",tu:"Вт",we2:"Ср",th:"Чт",fr:"Пт",sa:"Сб",su:"Нд",
about:"За приложението",contact:"Обратна връзка",contactTitle:"Свържете се с нас",contactSub:"Ще се радваме на вашата обратна връзка",sendFeedback:"Изпращане",thankYou:"Благодарим ви!",thankYouSub:"Вашият имейл клиент ще се отвори с готово съобщение.",yourEmail:"Вашият имейл адрес",subjectLabel:"Тема",messageLabel:"Съобщение",selectTopic:"Изберете тема…",emailPlaceholder:"vashiat@email.bg",msgPlaceholder:"Какво искате да ни кажете? (мин. 10 символа)",chars:"символа",emailNote:"Отваря вашия имейл клиент. Имейлът ви се използва единствено за отговор.",gotIt:"Разбрах",back:"Назад",subFeedback:"Обратна връзка",subBug:"Съобщаване за грешка",subSuggestion:"Предложение за подобрение",subQuestion:"Въпрос / Как да...",subPartner:"Партньорство / Интеграция",subData:"Корекция на данни (Празници)",subOther:"Друго",noActivity:"Все още няма активност.",activityLog:"Дневник на промените",bestDays:"Най-добри дни за мостово ползване за",copyEmbed:"Копиране на кода",holiday:"Официален празник",avgCov:"Средна наличност",lowWeek:"Най-слаба седмица",weeksLow:"Седмици под 70%",inOffice:"В офиса",onVac:"В отпуск",outToday:"Отсъстващи днес",nextVac:"Следващ",today:"Днес",printBtn:"Печат / Запазване като PDF",sheetsTitle:"Поток за Google Sheets",sheetsSub:"Използвайте =IMPORTDATA(url) в Google Sheets",cookieMsg:"Това приложение използва локално хранилище за запазване на настройките. Не се събират лични данни.",
M:["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"]},
};

// ─── Themes (Liquid Glass) ────────────────────────────────────────
const G={blur:"blur(16px) saturate(1.4)",r:24,rSm:18,rXs:14,hi:"0 1px 8px rgba(99,102,241,0.06)",hiStrong:"0 2px 16px rgba(99,102,241,0.1)"};
const TH={
light:{bg:"linear-gradient(145deg, #FEF7FF 0%, #F0F4FF 50%, #F0FFF4 100%)",sf:"rgba(255,255,255,0.85)",sh:"rgba(237,233,254,0.5)",sa:"rgba(243,232,255,0.5)",bd:"rgba(147,51,234,0.08)",bl:"rgba(147,51,234,0.05)",tx:"#4C1D95",t2:"#6D28D9",t3:"#A78BFA",ti:"#FFF",ac:"#7C3AED",ah:"#6D28D9",al:"rgba(124,58,237,0.08)",am:"#C4B5FD",wm:"#F59E0B",wl:"rgba(245,158,11,0.06)",sd:G.hi,sm:G.hiStrong,sl:"0 12px 40px rgba(99,102,241,0.12)",gd:"linear-gradient(135deg,#818CF8,#6366F1)",hc:"rgba(239,68,68,0.08)",ht:"#E11D48",gbg:"rgba(255,255,255,0.7)",gbd:"rgba(147,51,234,0.1)"},
dark:{bg:"linear-gradient(145deg, #13111C 0%, #1A1625 50%, #110F1A 100%)",sf:"rgba(30,25,50,0.85)",sh:"rgba(55,48,88,0.5)",sa:"rgba(76,29,149,0.2)",bd:"rgba(139,92,246,0.15)",bl:"rgba(139,92,246,0.08)",tx:"#EDE9FE",t2:"#C4B5FD",t3:"#8B5CF6",ti:"#13111C",ac:"#A78BFA",ah:"#8B5CF6",al:"rgba(167,139,250,0.12)",am:"#3B2370",wm:"#FBBF24",wl:"rgba(251,191,36,0.08)",sd:"0 2px 12px rgba(0,0,0,0.3)",sm:"0 4px 20px rgba(0,0,0,0.4)",sl:"0 16px 48px rgba(0,0,0,0.5)",gd:"linear-gradient(135deg,#8B5CF6,#6366F1)",hc:"rgba(239,68,68,0.15)",ht:"#FB7185",gbg:"rgba(30,25,50,0.75)",gbd:"rgba(139,92,246,0.12)"},
pink:{bg:"linear-gradient(145deg, #FFF0F6 0%, #FCE7F3 50%, #FDF2F8 100%)",sf:"rgba(255,255,255,0.8)",sh:"rgba(252,231,243,0.6)",sa:"rgba(251,207,232,0.4)",bd:"rgba(236,72,153,0.1)",bl:"rgba(236,72,153,0.06)",tx:"#831843",t2:"#9D174D",t3:"#EC4899",ti:"#FFF",ac:"#EC4899",ah:"#DB2777",al:"rgba(236,72,153,0.08)",am:"#F9A8D4",wm:"#F59E0B",wl:"rgba(245,158,11,0.06)",sd:"0 1px 8px rgba(236,72,153,0.06)",sm:"0 2px 16px rgba(236,72,153,0.1)",sl:"0 12px 40px rgba(236,72,153,0.15)",gd:"linear-gradient(135deg,#EC4899,#A855F7)",hc:"rgba(239,68,68,0.08)",ht:"#E11D48",gbg:"rgba(255,255,255,0.65)",gbd:"rgba(236,72,153,0.1)"},
};
const F="'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
const FM="'SF Mono','Fira Code',monospace";
const MC=[{b:"#DBEAFE",t:"#1E40AF",d:"#3B82F6"},{b:"#FCE7F3",t:"#9D174D",d:"#EC4899"},{b:"#D1FAE5",t:"#065F46",d:"#10B981"},{b:"#FEF3C7",t:"#92400E",d:"#F59E0B"},{b:"#E0E7FF",t:"#3730A3",d:"#6366F1"},{b:"#FFE4E6",t:"#9F1239",d:"#F43F5E"},{b:"#CCFBF1",t:"#134E4A",d:"#14B8A6"},{b:"#FED7AA",t:"#9A3412",d:"#F97316"},{b:"#E9D5FF",t:"#6B21A8",d:"#A855F7"},{b:"#CFFAFE",t:"#155E75",d:"#06B6D4"},{b:"#FEE2E2",t:"#991B1B",d:"#EF4444"},{b:"#D9F99D",t:"#3F6212",d:"#84CC16"},{b:"#FBCFE8",t:"#831843",d:"#F472B6"},{b:"#BAE6FD",t:"#0C4A6E",d:"#0EA5E9"},{b:"#FDE68A",t:"#78350F",d:"#FBBF24"},{b:"#C7D2FE",t:"#3730A3",d:"#818CF8"},{b:"#A7F3D0",t:"#064E3B",d:"#34D399"},{b:"#FECACA",t:"#7F1D1D",d:"#F87171"},{b:"#DDD6FE",t:"#5B21B6",d:"#8B5CF6"},{b:"#99F6E4",t:"#115E59",d:"#2DD4BF"},{b:"#FDE047",t:"#713F12",d:"#EAB308"},{b:"#F0ABFC",t:"#701A75",d:"#D946EF"},{b:"#67E8F9",t:"#164E63",d:"#22D3EE"},{b:"#FDA4AF",t:"#881337",d:"#FB7185"},{b:"#86EFAC",t:"#14532D",d:"#4ADE80"}];

// ─── Utilities ───────────────────────────────────────────────────
const gid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36);
const dim=(y,m)=>new Date(y,m+1,0).getDate();
const fdm=(y,m)=>{const d=new Date(y,m,1).getDay();return d===0?6:d-1;};
const dk=(y,m,d)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const pk=k=>{const[y,m,d]=k.split("-").map(Number);return{y,m:m-1,d};};
const isWe=(y,m,d)=>{const w=new Date(y,m,d).getDay();return w===0||w===6;};
const N=new Date(),CY=N.getFullYear(),CM=N.getMonth(),CD=N.getDate();

// ─── Storage (hybrid: API for teams, localStorage for prefs, window.storage for artifact sandbox) ───
const API_BASE = "/api/team";
const db={
  async sv(k,d,s=false){
    try {
      // Team data → API (production) or window.storage (artifact sandbox)
      if(k.startsWith("team:")&&s){
        var teamId=k.replace("team:","");
        try{await fetch(API_BASE+"?id="+teamId,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:teamId,data:d})});}catch(e){}
      }
      // Also save to window.storage if available (artifact sandbox)
      if(window.storage){try{await window.storage.set(k,JSON.stringify(d),s);}catch(e){}}
      // Local prefs → localStorage
      if(!s){try{localStorage.setItem(k,JSON.stringify(d));}catch(e){}}
    }catch(e){console.warn(e);}
  },
  async ld(k,s=false){
    try{
      // Team data → try API first, then window.storage, then localStorage
      if(k.startsWith("team:")&&s){
        var teamId=k.replace("team:","");
        try{var res=await fetch(API_BASE+"?id="+teamId);if(res.ok){var data=await res.json();if(data)return data;}}catch(e){}
      }
      // Try window.storage (artifact sandbox)
      if(window.storage){try{var r=await window.storage.get(k,s);if(r)return JSON.parse(r.value);}catch(e){}}
      // Try localStorage
      try{var ls=localStorage.getItem(k);if(ls)return JSON.parse(ls);}catch(e){}
      return null;
    }catch(e){return null;}
  }
};

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
  const a = document.createElement("a"); a.href = url; a.download = `${member.name.replace(/\s+/g,"_")}_vacation.ics`; a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Report ──────────────────────────────────────────────────
function generatePDFReport(team, t) {
  var yr = team.year || CY;
  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var dayL = ["Mo","Tu","We","Th","Fr","Sa","Su"];

  // Collect all holidays
  var allHols = {};
  team.members.forEach(function(m){ if(m.country) computeHolidays(m.country,yr).forEach(function(h){allHols[h]=true;}); });

  // Overlap analysis
  var allDays = {};
  team.members.forEach(function(m){ (m.days||[]).forEach(function(d){ if(!allDays[d])allDays[d]=[]; allDays[d].push(m.name); }); });
  var overlaps = Object.entries(allDays).filter(function(e){return e[1].length>=2;}).sort(function(a,b){return a[0].localeCompare(b[0]);});
  var totalDays = 0; team.members.forEach(function(m){totalDays+=(m.days||[]).length;});

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+team.name+' - '+yr+'</title>';
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
  html += '<div class="hdr"><h1>'+team.name+'</h1>';
  html += '<div class="sub">'+yr+' &middot; '+team.members.length+' '+(team.members.length!==1?t.mbs:t.mb)+' &middot; Generated '+new Date().toLocaleDateString()+'</div></div>';

  // Legend
  html += '<div class="legend">';
  team.members.forEach(function(m,i){
    var c=MC[i%MC.length];
    html += '<div class="leg-item"><span class="dot" style="background:'+c.d+'"></span><strong>'+m.name+'</strong> <span style="color:#9ca3af">('+((m.days||[]).length)+'d)</span></div>';
  });
  html += '<div class="leg-item"><span class="dot" style="background:#fee2e2;border:1px solid #fecaca"></span><span style="color:#dc2626;font-weight:600">Holiday</span></div>';
  html += '</div>';

  // Stats boxes
  var avgCov = team.members.length > 0 ? Math.round((1 - totalDays / (team.members.length * 260)) * 100) : 100;
  html += '<div class="stats">';
  html += '<div class="stat"><div class="stat-val">'+totalDays+'</div><div class="stat-lbl">Total vacation days</div></div>';
  html += '<div class="stat"><div class="stat-val" style="color:#EF4444">'+overlaps.length+'</div><div class="stat-lbl">Overlap days</div></div>';
  html += '<div class="stat"><div class="stat-val">'+team.members.length+'</div><div class="stat-lbl">Team members</div></div>';
  html += '<div class="stat"><div class="stat-val" style="color:#10B981">'+avgCov+'%</div><div class="stat-lbl">Avg coverage</div></div>';
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
      html += '<div class="tl-row"><div class="tl-name">'+m.name+'</div><div class="tl-bar">';
      for(var d=1;d<=daysInMonth;d++){
        var key = dk(yr,mo,d);
        var has = (m.days||[]).indexOf(key) >= 0;
        html += '<div class="tl-day" style="background:'+(has?c.d:'#f3f4f6')+'"></div>';
      }
      html += '</div></div>';
    });
  }

  // Calendar grid — 12 months, 3 per row
  html += '<div class="tl-title">Year Calendar</div>';
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
  html += '<div class="tl-title">Member Summary</div>';
  html += '<table><tr><th>Member</th><th>Country</th><th>Days</th><th>Vacation Periods</th></tr>';
  team.members.forEach(function(m,i){
    var co = m.country ? EU_C.find(function(c){return c.c===m.country;}) : null;
    var sorted = (m.days||[]).slice().sort();
    // Group into ranges
    var ranges = [];
    var ri = 0;
    while(ri < sorted.length){
      var start = sorted[ri]; var end = start;
      while(ri+1 < sorted.length){
        var curr=pk(sorted[ri]),next=pk(sorted[ri+1]);
        var diff=(new Date(next.y,next.m,next.d)-new Date(curr.y,curr.m,curr.d))/86400000;
        if(diff<=3){ri++;end=sorted[ri];}else break;
      }
      if(start===end) ranges.push(start.slice(5));
      else ranges.push(start.slice(5)+' to '+end.slice(5));
      ri++;
    }
    html += '<tr><td><span style="color:'+MC[i%MC.length].d+';font-weight:700">&#9679;</span> '+m.name+'</td>';
    html += '<td>'+(co?co.f+' '+co.n:'—')+'</td>';
    html += '<td style="text-align:center;font-weight:700">'+sorted.length+'</td>';
    html += '<td style="color:#6b7280">'+ranges.join(', ')+'</td></tr>';
  });
  html += '</table>';

  // Overlaps
  if(overlaps.length){
    html += '<div class="tl-title">Overlap Days ('+overlaps.length+')</div>';
    html += '<table><tr><th>Date</th><th>Members Out</th></tr>';
    overlaps.forEach(function(e){
      html += '<tr><td style="color:#EF4444;font-weight:600">'+e[0]+'</td><td>'+e[1].join(', ')+'</td></tr>';
    });
    html += '</table>';
  }

  html += '<div class="footer">Generated by Team Vacation Planner &middot; vacationplanner.team &middot; '+new Date().toLocaleDateString()+'</div>';
  html += '</body></html>';

  var blob = new Blob([html], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a"); a.href = url; a.download = team.name.replace(/\s+/g,"_")+"_"+yr+"_report.html"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Embed Code Generator ───────────────────────────────────────
function getEmbedCode(teamId) {
  const url = `${window.location.origin}${window.location.pathname}#team=${teamId}`;
  return `<iframe src="${url}" width="100%" height="800" frameborder="0" style="border:1px solid #e8e6e1;border-radius:12px;"></iframe>`;
}

// ─── iCal Team Subscription Feed ─────────────────────────────────
function generateTeamICS(team) {
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
  const yr = team.year || CY;
  countries.forEach(cc => {
    computeHolidays(cc, yr).forEach(h => {
      const p = pk(h);
      const start = `${p.y}${String(p.m+1).padStart(2,"0")}${String(p.d).padStart(2,"0")}`;
      const endDt = new Date(p.y, p.m, p.d + 1);
      const end = `${endDt.getFullYear()}${String(endDt.getMonth()+1).padStart(2,"0")}${String(endDt.getDate()).padStart(2,"0")}`;
      const co = EU_C.find(c => c.c === cc);
      lines.push("BEGIN:VEVENT",`UID:hol-${cc}-${h}@tvp`,`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:🏛 ${holName(h)} (${(co&&co.n) || cc})`,`DESCRIPTION:Public holiday in ${(co&&co.n) || cc}`,"TRANSP:TRANSPARENT","END:VEVENT");
    });
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadTeamICS(team) {
  const ics = generateTeamICS(team);
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${team.name.replace(/\s+/g, "_")}_team_calendar.ics`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Holiday Clash Detector ──────────────────────────────────────
function detectHolidayClashes(member, year) {
  if (!member.country || !(member.days||[]).length) return [];
  const hols = new Set(computeHolidays(member.country, year));
  return member.days.filter(d => hols.has(d)).map(d => ({
    date: d,
    name: holName(d),
    country: (EU_C.find(c => c.c === member.country)||{}).n || member.country,
  }));
}

// ─── Print View Component ────────────────────────────────────────
function PrintView({ team, th, t }) {
  const yr = team.year || CY;
  const holSets = {};
  team.members.forEach(m => { if (m.country) holSets[m.country] = new Set(computeHolidays(m.country, yr)); });
  const allHols = new Set();
  Object.values(holSets).forEach(s => s.forEach(h => allHols.add(h)));

  return <div style={{ padding: "30px 24px", fontFamily: F, background: "#fff", color: "#1a1a1a", maxWidth: 1200, margin: "0 auto" }}>
    <style>{`@media print { body { margin: 0; } @page { size: A3 landscape; margin: 10mm; } }`}</style>

    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, borderBottom: "2px solid #1a1a1a", paddingBottom: 12 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{team.name}</h1>
        <div style={{ fontSize: 14, color: "#6b6b6b", marginTop: 4 }}>{yr} · {team.members.length} {team.members.length !== 1 ? t.mbs : t.mb}</div>
      </div>
      <div style={{ fontSize: 11, color: "#9b9b9b", textAlign: "right" }}>
        Team Vacation Planner<br />Generated {new Date().toLocaleDateString()}
      </div>
    </div>

    {/* Legend */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
      {team.members.map((m, i) => {
        const c = MC[i % MC.length];
        const co = m.country ? EU_C.find(x => x.c === m.country) : null;
        return <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.d }} />
          {co ? co.f + " " : ""}{m.name} ({(m.days || []).length}d)
        </div>;
      })}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#DC2626" }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: "#FEE2E2" }} /> Holiday
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9b9b9b" }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: "#F0EFEC" }} /> Weekend
      </div>
    </div>

    {/* 12-month grid */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {Array.from({ length: 12 }, (_, month) => {
        const days = dim(yr, month);
        const first = fdm(yr, month);
        const cells = [];
        for (let i = 0; i < first; i++) cells.push(null);
        for (let d = 1; d <= days; d++) cells.push(d);
        const dayLabels = [t.mo, t.tu, t.we2, t.th, t.fr, t.sa, t.su];

        return <div key={month} style={{ border: "1px solid #e8e6e1", borderRadius: 6, padding: "8px 6px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>{t.M[month]}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
            {dayLabels.map(d => <div key={d} style={{ textAlign: "center", fontSize: 7, fontWeight: 600, color: "#9b9b9b", padding: "1px 0" }}>{d}</div>)}
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const key = dk(yr, month, day);
              const we = isWe(yr, month, day);
              const isHol = allHols.has(key);
              const membersOut = team.members.filter(m => (m.days||[]).includes(key));
              const topMember = membersOut.length > 0 ? MC[team.members.indexOf(membersOut[0]) % MC.length] : null;

              return <div key={day} style={{
                aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: membersOut.length > 0 ? 700 : 400, borderRadius: 2,
                background: membersOut.length > 1 ? `rgba(220,38,38,${0.2 + (membersOut.length / team.members.length) * 0.6})` : membersOut.length === 1 ? topMember.b : isHol ? "#FEE2E2" : we ? "#F0EFEC" : "transparent",
                color: membersOut.length > 1 ? "#fff" : membersOut.length === 1 ? topMember.t : isHol ? "#DC2626" : we ? "#9b9b9b" : "#1a1a1a",
              }}>{day}</div>;
            })}
          </div>
        </div>;
      })}
    </div>

    {/* Member summary table */}
    <div style={{ marginTop: 20 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #1a1a1a" }}>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>Name</th>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>Country</th>
            <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 700 }}>Days</th>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>Periods</th>
          </tr>
        </thead>
        <tbody>
          {team.members.map((m, i) => {
            const c = MC[i % MC.length];
            const co = m.country ? EU_C.find(x => x.c === m.country) : null;
            const sorted = [...(m.days || [])].sort();
            // Build period strings
            const periods = [];
            let si = 0;
            while (si < sorted.length) {
              const start = sorted[si];
              let end = start;
              while (si + 1 < sorted.length) {
                const currD = new Date(pk(sorted[si]).y, pk(sorted[si]).m, pk(sorted[si]).d);
                const nextD = new Date(pk(sorted[si + 1]).y, pk(sorted[si + 1]).m, pk(sorted[si + 1]).d);
                if ((nextD - currD) / 86400000 <= 3) { si++; end = sorted[si]; } else break;
              }
              periods.push(start === end ? start.slice(5) : `${start.slice(5)} → ${end.slice(5)}`);
              si++;
            }
            return <tr key={m.id} style={{ borderBottom: "1px solid #e8e6e1" }}>
              <td style={{ padding: "5px 8px" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c.d, marginRight: 6, verticalAlign: "middle" }} />{m.name}</td>
              <td style={{ padding: "5px 8px" }}>{co ? co.f + " " + co.n : "—"}</td>
              <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: 700 }}>{sorted.length}</td>
              <td style={{ padding: "5px 8px", fontSize: 10, color: "#6b6b6b" }}>{periods.join(" · ")}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>

    {/* Print button (hidden in print) */}
    <div style={{ marginTop: 24, textAlign: "center" }}>
      <button onClick={() => window.print()} style={{
        padding: "12px 32px", borderRadius: 10, border: "none", background: "#2563EB", color: "#fff",
        fontSize: 15, fontWeight: 700, fontFamily: F, cursor: "pointer",
      }}>{t.printBtn}</button>
      <style>{`@media print { button { display: none !important; } }`}</style>
    </div>
  </div>;
}

// ─── Smart Vacation Optimizer ────────────────────────────────────
function findBridgeDays(country, year) {
  if (!country) return [];
  const holidays = computeHolidays(country, year);
  const holSet = new Set(holidays);
  const suggestions = [];

  // For each holiday, check if taking 1-2 adjacent days creates a long weekend
  holidays.forEach(h => {
    const p = pk(h);
    const dt = new Date(p.y, p.m, p.d);
    const dow = dt.getDay(); // 0=Sun,1=Mon..6=Sat

    // Holiday on Thursday → take Friday off → 4-day weekend
    if (dow === 4) {
      const fri = dk(p.y, p.m, p.d + 1);
      if (!holSet.has(fri) && !isWe(p.y, p.m, p.d + 1)) {
        suggestions.push({ take: [fri], off: 1, gain: 4, label: `Take Fri ${fri.slice(5)} off → 4 days (${holName(h)})` });
      }
    }
    // Holiday on Tuesday → take Monday off → 4-day weekend
    if (dow === 2) {
      const mon = dk(p.y, p.m, p.d - 1);
      if (!holSet.has(mon) && !isWe(p.y, p.m, p.d - 1)) {
        suggestions.push({ take: [mon], off: 1, gain: 4, label: `Take Mon ${mon.slice(5)} off → 4 days (${holName(h)})` });
      }
    }
    // Holiday on Wednesday → take Mon+Tue or Thu+Fri → 5 days for 2
    if (dow === 3) {
      const thu = dk(p.y, p.m, p.d + 1);
      const fri = dk(p.y, p.m, p.d + 2);
      if (!holSet.has(thu) && !holSet.has(fri) && !isWe(p.y, p.m, p.d + 1) && !isWe(p.y, p.m, p.d + 2)) {
        suggestions.push({ take: [thu, fri], off: 2, gain: 5, label: `Take Thu-Fri ${thu.slice(5)}–${fri.slice(5)} → 5 days (${holName(h)})` });
      }
    }
  });

  // Deduplicate by taken days
  const seen = new Set();
  return suggestions.filter(s => {
    const key = s.take.join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.gain / b.off - a.gain / a.off).slice(0, 8);
}

// ─── QR Code Generator (pure SVG, no library) ───────────────────
function QRCode({ data, size = 160, th }) {
  // Simple QR-like visual using a hash-based pattern (not a real QR scanner-readable code)
  // For a real QR, we'd need a library. This creates a visual representation + the text URL.
  const modules = 21;
  const cellSize = size / modules;
  // Generate deterministic pattern from data string
  let hash = 0;
  for (let i = 0; i < data.length; i++) hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  const rng = (i) => { let h = hash + i * 2654435761; h = ((h >> 16) ^ h) * 0x45d9f3b; h = ((h >> 16) ^ h) * 0x45d9f3b; return ((h >> 16) ^ h) & 1; };

  const cells = [];
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      // Finder patterns (corners)
      const inFinder = (cx, cy) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
      const finderFill = (cx, cy) => {
        const rx = x - cx, ry = y - cy;
        if (rx === 0 || rx === 6 || ry === 0 || ry === 6) return true;
        if (rx >= 2 && rx <= 4 && ry >= 2 && ry <= 4) return true;
        return false;
      };
      let fill = false;
      if (inFinder(0, 0)) fill = finderFill(0, 0);
      else if (inFinder(modules - 7, 0)) fill = finderFill(modules - 7, 0);
      else if (inFinder(0, modules - 7)) fill = finderFill(0, modules - 7);
      else fill = rng(y * modules + x) === 1;

      if (fill) cells.push(<rect key={`${x}-${y}`} x={x * cellSize} y={y * cellSize} width={cellSize} height={cellSize} fill={th.tx} />);
    }
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 8 }}>
    <rect width={size} height={size} fill="#fff" rx={8} />
    {cells}
  </svg>;
}

// ─── CSV Export ──────────────────────────────────────────────────
function exportCSV(team) {
  const yr = team.year || CY;
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
  const a = document.createElement("a"); a.href = url; a.download = `${team.name.replace(/\s+/g, "_")}_${yr}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV Import Parser ──────────────────────────────────────────
function parseCSVImport(text) {
  const lines = text.trim().split("\n").slice(1); // skip header
  const members = {};
  lines.forEach(line => {
    const parts = line.match(/(".*?"|[^,]+)/g);
    if (!parts || parts.length < 3) return;
    const name = parts[0].replace(/"/g, "").trim();
    const startDate = (parts[2]||"").replace(/"/g, "").trim();
    const endDate = (parts[3]||"").replace(/"/g, "").trim() || startDate;
    if (!name || !startDate) return;
    if (!members[name]) members[name] = new Set();
    // Generate all dates in range
    const sd = new Date(startDate);
    const ed = new Date(endDate || startDate);
    for (let d = new Date(sd); d <= ed; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        members[name].add(dk(d.getFullYear(), d.getMonth(), d.getDate()));
      }
    }
  });
  return Object.entries(members).map(([name, days]) => ({
    id: gid(), name, days: [...days], country: null
  }));
}

// ─── Mini Badge View ─────────────────────────────────────────────
function BadgeView({ team, th, t }) {
  const today = dk(CY, CM, CD);
  const outToday = team.members.filter(m => (m.days||[]).includes(today));
  const inToday = team.members.filter(m => !(m.days||[]).includes(today));
  // Next person going on vacation
  let nextVac = null;
  const future = [];
  team.members.forEach(m => {
    (m.days || []).forEach(d => {
      if (d > today) future.push({ name: m.name, date: d });
    });
  });
  future.sort((a, b) => a.date.localeCompare(b.date));
  if (future.length) nextVac = future[0];

  return <div style={{ padding: 20, fontFamily: F, maxWidth: 400, margin: "0 auto" }}>
    <div style={{ background: th.sf, borderRadius: 16, border: `1px solid ${th.bd}`, overflow: "hidden", boxShadow: th.sm }}>
      <div style={{ padding: "16px 20px", background: th.al, borderBottom: `1px solid ${th.bd}` }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: th.ac }}>{team.name}</div>
        <div style={{ fontSize: 12, color: th.t2, marginTop: 2 }}>Today · {new Date().toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}</div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#10B981" }}>{inToday.length}</div>
            <div style={{ fontSize: 11, color: th.t3, fontWeight: 600 }}>In office</div>
          </div>
          <div style={{ width: 1, background: th.bd }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#DC2626" }}>{outToday.length}</div>
            <div style={{ fontSize: 11, color: th.t3, fontWeight: 600 }}>On vacation</div>
          </div>
        </div>
        {outToday.length > 0 && <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: th.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Out today</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {outToday.map(m => {
              const i = team.members.indexOf(m);
              const c = MC[i % MC.length];
              return <span key={m.id} style={{ padding: "3px 10px", background: c.b, color: c.t, borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{m.name}</span>;
            })}
          </div>
        </div>}
        {nextVac && <div style={{ padding: "10px 12px", background: th.bg, borderRadius: 8, fontSize: 12, color: th.t2 }}>
          Next: <strong style={{ color: th.tx }}>{nextVac.name}</strong> starts {nextVac.date}
        </div>}
      </div>
    </div>
  </div>;
}

// ─── Visit Counter by Country ────────────────────────────────────
function VisitCounter({ th }) {
  const [visits, setVisits] = useState(null);
  const counted = useRef(false);
  useEffect(() => {
    (function(){
      // === COUNTRY DETECTION (3 layers) ===
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      var tzCountry = {
        "Europe/Bucharest": "RO", "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Paris": "FR",
        "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE",
        "Europe/Vienna": "AT", "Europe/Zurich": "CH", "Europe/Stockholm": "SE", "Europe/Oslo": "NO",
        "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI", "Europe/Warsaw": "PL", "Europe/Prague": "CZ",
        "Europe/Budapest": "HU", "Europe/Sofia": "BG", "Europe/Athens": "GR", "Europe/Lisbon": "PT",
        "Europe/Dublin": "IE", "Europe/Zagreb": "HR", "Europe/Belgrade": "RS", "Europe/Ljubljana": "SI",
        "Europe/Bratislava": "SK", "Europe/Tallinn": "EE", "Europe/Riga": "LV", "Europe/Vilnius": "LT",
        "Europe/Luxembourg": "LU", "Europe/Sarajevo": "BA", "Europe/Skopje": "MK", "Europe/Podgorica": "ME",
        "Europe/Chisinau": "MD", "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Minsk": "BY",
        "Europe/Istanbul": "TR", "Europe/Tirane": "AL",
        "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US", "America/Denver": "US",
        "America/Toronto": "CA", "America/Vancouver": "CA",
        "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Bahrain": "BH",
        "Asia/Kolkata": "IN", "Asia/Tokyo": "JP", "Asia/Shanghai": "CN", "Asia/Almaty": "KZ",
        "America/Santiago": "CL", "America/Sao_Paulo": "BR", "Africa/Casablanca": "MA",
        "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Perth": "AU",
        "Pacific/Auckland": "NZ",
      };
      var cc = tzCountry[tz] || null;
      if (!cc) {
        var navLang = (navigator.language || "").toLowerCase();
        var langCountry = {"ro":"RO","bg":"BG","sv":"SE","it":"IT","fr":"FR","de":"DE","es":"ES","pt":"PT","hu":"HU","pl":"PL","cs":"CZ","sk":"SK","el":"GR","nl":"NL","da":"DK","fi":"FI","en-gb":"GB","en-au":"AU","en-ca":"CA","en":"US","en-us":"US"};
        cc = langCountry[navLang] || langCountry[navLang.split("-")[0]] || null;
      }
      if (!cc) cc = "OTHER";

      // Check if already counted this session
      var sessionKey = "tvp-counted";
      var alreadyCounted = false;
      try { alreadyCounted = sessionStorage.getItem(sessionKey) === "1"; } catch(e) {}

      if (!alreadyCounted && !counted.current) {
        counted.current = true;
        try { sessionStorage.setItem(sessionKey, "1"); } catch(e) {}
        // POST to global counter
        fetch("/api/visits", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({country:cc})})
          .then(function(r){return r.json()})
          .then(function(data){setVisits(data)})
          .catch(function(){
            // Fallback: just GET
            fetch("/api/visits").then(function(r){return r.json()}).then(function(data){setVisits(data)}).catch(function(){});
          });
      } else {
        // Already counted, just load stats
        fetch("/api/visits").then(function(r){return r.json()}).then(function(data){setVisits(data)}).catch(function(){});
      }
    })();
  }, []);

  if (!visits) return null;

  const sorted = Object.entries(visits.countries || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const flagMap = {};
  EU_C.forEach(c => { flagMap[c.c] = c.f; });
  Object.assign(flagMap, { US: "🇺🇸", AE: "🇦🇪", IN: "🇮🇳", JP: "🇯🇵", CN: "🇨🇳", AU: "🇦🇺", CA: "🇨🇦", BR: "🇧🇷", NZ: "🇳🇿", SA: "🇸🇦", BH: "🇧🇭", CL: "🇨🇱", MA: "🇲🇦", KZ: "🇰🇿", OTHER: "🌍" });

  return <div style={{ marginTop: 32, padding: "16px 20px", background: th.gbg, borderRadius: G.rSm, border: `1px solid ${th.gbd}`, backdropFilter: G.blur, WebkitBackdropFilter: G.blur, boxShadow: th.sd }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
      <Ic n="globe" s={14} c={th.t3} />
      <span style={{ fontSize: 11, fontWeight: 600, color: th.t3, textTransform: "uppercase", letterSpacing: 1 }}>{visits.total.toLocaleString()} visits</span>
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
function exportXLSX(team) {
  var yr = team.year || CY;
  var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var dayL = ["Mo","Tu","We","Th","Fr","Sa","Su"];
  var mColors = ["#3B82F6","#EC4899","#10B981","#F59E0B","#6366F1","#F43F5E","#14B8A6","#F97316","#A855F7","#06B6D4","#EF4444","#84CC16","#F472B6","#0EA5E9","#FBBF24","#818CF8","#34D399","#F87171","#8B5CF6","#2DD4BF","#EAB308","#D946EF","#22D3EE","#FB7185","#4ADE80"];

  // Collect holidays
  var allHols = {};
  team.members.forEach(function(m){ if(m.country) computeHolidays(m.country,yr).forEach(function(h){allHols[h]=true;}); });

  // Overlap analysis
  var allDays = {};
  team.members.forEach(function(m){ (m.days||[]).forEach(function(d){ if(!allDays[d])allDays[d]=[]; allDays[d].push(m.name); }); });
  var overlaps = Object.entries(allDays).filter(function(e){return e[1].length>=2;}).sort(function(a,b){return a[0].localeCompare(b[0]);});
  var totalDays = 0; team.members.forEach(function(m){totalDays+=(m.days||[]).length;});

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
  xml += '<Row ss:Height="30"><Cell ss:StyleID="title"><Data ss:Type="String">'+team.name+'</Data></Cell></Row>\n';
  xml += '<Row><Cell ss:StyleID="sub"><Data ss:Type="String">'+yr+' | '+team.members.length+' members | Generated '+new Date().toLocaleDateString()+'</Data></Cell></Row>\n';
  xml += '<Row></Row>\n';
  // Stats
  xml += '<Row><Cell ss:StyleID="stat-val"><Data ss:Type="Number">'+totalDays+'</Data></Cell><Cell ss:StyleID="stat-red"><Data ss:Type="Number">'+overlaps.length+'</Data></Cell><Cell ss:StyleID="stat-val"><Data ss:Type="Number">'+team.members.length+'</Data></Cell><Cell ss:StyleID="stat-grn"><Data ss:Type="String">'+Math.round((1-totalDays/(team.members.length*260||1))*100)+'%</Data></Cell></Row>\n';
  xml += '<Row><Cell ss:StyleID="stat-lbl"><Data ss:Type="String">Total vacation days</Data></Cell><Cell ss:StyleID="stat-lbl"><Data ss:Type="String">Overlap days</Data></Cell><Cell ss:StyleID="stat-lbl"><Data ss:Type="String">Team members</Data></Cell><Cell ss:StyleID="stat-lbl"><Data ss:Type="String">Avg coverage</Data></Cell></Row>\n';
  xml += '<Row></Row>\n';
  // Member summary
  xml += '<Row><Cell ss:StyleID="sect" ss:MergeAcross="4"><Data ss:Type="String">Member Summary</Data></Cell></Row>\n';
  xml += '<Row><Cell ss:StyleID="hdr"><Data ss:Type="String">Member</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Country</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Days</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Periods</Data></Cell></Row>\n';
  team.members.forEach(function(m,i){
    var co = m.country ? EU_C.find(function(c){return c.c===m.country;}) : null;
    var sorted = (m.days||[]).slice().sort();
    var ranges = []; var ri = 0;
    while(ri<sorted.length){
      var start=sorted[ri],end=start;
      while(ri+1<sorted.length){var curr=pk(sorted[ri]),next=pk(sorted[ri+1]);var diff=(new Date(next.y,next.m,next.d)-new Date(curr.y,curr.m,curr.d))/86400000;if(diff<=3){ri++;end=sorted[ri];}else break;}
      if(start===end)ranges.push(start.slice(5));else ranges.push(start.slice(5)+' to '+end.slice(5));ri++;
    }
    xml += '<Row><Cell ss:StyleID="bold"><Data ss:Type="String">'+m.name+'</Data></Cell><Cell><Data ss:Type="String">'+(co?co.n:'')+'</Data></Cell><Cell><Data ss:Type="Number">'+sorted.length+'</Data></Cell><Cell><Data ss:Type="String">'+ranges.join(', ')+'</Data></Cell></Row>\n';
  });
  // Overlaps
  if(overlaps.length){
    xml += '<Row></Row><Row><Cell ss:StyleID="sect" ss:MergeAcross="3"><Data ss:Type="String">Overlap Days ('+overlaps.length+')</Data></Cell></Row>\n';
    xml += '<Row><Cell ss:StyleID="hdr"><Data ss:Type="String">Date</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Members Out</Data></Cell></Row>\n';
    overlaps.forEach(function(e){
      xml += '<Row><Cell ss:StyleID="overlap"><Data ss:Type="String">'+e[0]+'</Data></Cell><Cell><Data ss:Type="String">'+e[1].join(', ')+'</Data></Cell></Row>\n';
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
      xml += '<Row><Cell ss:StyleID="bold"><Data ss:Type="String">Team</Data></Cell>';
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
        if(who.length===1) sty = 'v'+who[0];
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
    xml += '<Row><Cell ss:StyleID="day-hdr"><Data ss:Type="String">Name</Data></Cell>';
    for(var d2=1;d2<=daysInMo2;d2++) xml += '<Cell ss:StyleID="day-hdr"><Data ss:Type="Number">'+d2+'</Data></Cell>';
    xml += '</Row>\n';
    // Member Gantt bars
    team.members.forEach(function(m,i){
      xml += '<Row><Cell ss:StyleID="bold"><Data ss:Type="String">'+m.name+'</Data></Cell>';
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
  var a = document.createElement("a"); a.href = url; a.download = team.name.replace(/\s+/g,"_")+"_"+yr+".xls"; a.click();
  URL.revokeObjectURL(url);
}

// ─── TSV Export for Google Sheets IMPORTDATA ─────────────────────
function generateTSV(team) {
  const yr = team.year || CY;
  let tsv = "Name\tCountry\tStart\tEnd\tDays\n";
  team.members.forEach(m => {
    const co = m.country ? (EU_C.find(c => c.c === m.country)||{}).n || "" : "";
    const sorted = [...(m.days || [])].sort();
    if (!sorted.length) { tsv += `${m.name}\t${co}\t\t\t0\n`; return; }
    // Group into ranges
    let i = 0;
    while (i < sorted.length) {
      const start = sorted[i]; let end = start;
      while (i + 1 < sorted.length) {
        const curr = new Date(pk(sorted[i]).y, pk(sorted[i]).m, pk(sorted[i]).d);
        const next = new Date(pk(sorted[i+1]).y, pk(sorted[i+1]).m, pk(sorted[i+1]).d);
        if ((next - curr) / 86400000 <= 3) { i++; end = sorted[i]; } else break;
      }
      const rangeLen = Math.floor((new Date(pk(end).y,pk(end).m,pk(end).d) - new Date(pk(start).y,pk(start).m,pk(start).d)) / 86400000) + 1;
      tsv += `${m.name}\t${co}\t${start}\t${end}\t${rangeLen}\n`;
      i++;
    }
  });
  return tsv;
}

// ─── Tiny Components ─────────────────────────────────────────────
const Ic=({n,s=18,c="currentColor"})=>{const p={plus:<path d="M12 5v14M5 12h14" strokeWidth="1.8" strokeLinecap="round"/>,users:<Fragment><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeWidth="1.8"/><circle cx="9" cy="7" r="4" strokeWidth="1.8"/></Fragment>,link:<Fragment><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeWidth="1.8"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeWidth="1.8"/></Fragment>,copy:<Fragment><rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="1.8"/></Fragment>,check:<path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,chevL:<path d="M15 18l-6-6 6-6" strokeWidth="1.8" strokeLinecap="round"/>,chevR:<path d="M9 18l6-6-6-6" strokeWidth="1.8" strokeLinecap="round"/>,trash:<Fragment><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="1.8"/></Fragment>,edit:<Fragment><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="1.8"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="1.8"/></Fragment>,sun:<Fragment><circle cx="12" cy="12" r="5" strokeWidth="1.8"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="1.8"/></Fragment>,moon:<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeWidth="1.8"/>,heart:<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeWidth="1.8"/>,arrow:<path d="M5 12h14M12 5l7 7-7 7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>,x:<path d="M18 6L6 18M6 6l12 12" strokeWidth="1.8" strokeLinecap="round"/>,home:<Fragment><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="1.8"/><path d="M9 22V12h6v10" strokeWidth="1.8"/></Fragment>,share:<Fragment><circle cx="18" cy="5" r="3" strokeWidth="1.8"/><circle cx="6" cy="12" r="3" strokeWidth="1.8"/><circle cx="18" cy="19" r="3" strokeWidth="1.8"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" strokeWidth="1.8"/></Fragment>,globe:<Fragment><circle cx="12" cy="12" r="10" strokeWidth="1.8"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" strokeWidth="1.8"/></Fragment>,lock:<Fragment><rect x="3" y="11" width="18" height="11" rx="2" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="1.8"/></Fragment>,unlock:<Fragment><rect x="3" y="11" width="18" height="11" rx="2" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 019.9-1" strokeWidth="1.8"/></Fragment>,download:<Fragment><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeWidth="1.8"/><path d="M7 10l5 5 5-5M12 15V3" strokeWidth="1.8"/></Fragment>,code:<Fragment><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></Fragment>,flag:<Fragment><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeWidth="1.8"/><line x1="4" y1="22" x2="4" y2="15" strokeWidth="1.8"/></Fragment>,grid:<Fragment><rect x="3" y="3" width="7" height="7" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" strokeWidth="1.8"/></Fragment>,bar:<Fragment><line x1="18" y1="20" x2="18" y2="10" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" strokeWidth="2" strokeLinecap="round"/></Fragment>,mail:<Fragment><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="1.8"/><path d="M22 6l-10 7L2 6" strokeWidth="1.8"/></Fragment>,send:<Fragment><line x1="22" y1="2" x2="11" y2="13" strokeWidth="1.8"/><polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="1.8"/></Fragment>};return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} xmlns="http://www.w3.org/2000/svg">{p[n]}</svg>;};

function Btn({children,v="primary",sz="md",icon,onClick,disabled,style={},th}){
  const[h,setH]=useState(false);const S={sm:{padding:"6px 10px",fontSize:12},md:{padding:"10px 18px",fontSize:14}};
  const V={
    primary:{background:h?"linear-gradient(135deg,"+th.ah+","+th.ac+")":th.ac,color:th.ti,boxShadow:"0 4px 20px "+th.ac+"30",borderRadius:G.rXs},
    secondary:{background:th.gbg,color:th.tx,border:`1px solid ${th.gbd}`,boxShadow:th.sd,backdropFilter:G.blur,WebkitBackdropFilter:G.blur},
    ghost:{background:h?th.sh:"transparent",color:th.t2,backdropFilter:h?G.blur:"none",WebkitBackdropFilter:h?G.blur:"none"},
  };
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:"inline-flex",alignItems:"center",gap:5,border:"none",cursor:disabled?"default":"pointer",fontFamily:F,fontWeight:600,transition:"all .25s cubic-bezier(0.4,0,0.2,1)",opacity:disabled?0.5:1,borderRadius:G.rXs,...S[sz],...V[v],...style}}>{icon&&<Ic n={icon} s={sz==="sm"?13:16}/>}{children}</button>;
}

function Inp({value,onChange,placeholder,autoFocus,maxLength,onKeyDown,th}){
  const[f,setF]=useState(false);
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} maxLength={maxLength} onKeyDown={onKeyDown} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${f?th.ac:th.gbd}`,borderRadius:G.rXs,fontSize:15,fontFamily:F,outline:"none",background:th.gbg,color:th.tx,transition:"all .25s",boxShadow:f?`0 0 0 3px ${th.al}, ${G.hi}`:`0 1px 4px rgba(0,0,0,0.03), ${G.hi}`,boxSizing:"border-box",backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}/>;
}

const Toast=({message:m,visible:v})=>m?<div style={{position:"fixed",bottom:32,left:"50%",transform:"translateX(-50%) translateY("+(v?0:20)+"px)",background:"linear-gradient(135deg,#818CF8,#6366F1)",color:"#fff",padding:"12px 24px",borderRadius:50,fontSize:14,fontWeight:600,fontFamily:F,boxShadow:"0 8px 32px rgba(99,102,241,0.3)",opacity:v?1:0,transition:"all .3s",pointerEvents:"none",zIndex:9999,display:"flex",alignItems:"center",gap:8}}><Ic n="check" s={16} c="#FFF"/>{m}</div>:null;

const LangPk=({lang,set,th})=><div style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center"}}>{Object.entries(LANGS).map(([k,v])=><button key={k} onClick={()=>set(k)} style={{padding:"3px 7px",borderRadius:6,fontSize:11,fontWeight:600,fontFamily:F,cursor:"pointer",border:k===lang?`1.5px solid ${th.ac}`:`1px solid ${th.bd}`,background:k===lang?th.al:"transparent",color:k===lang?th.ac:th.t2}}>{v.f}{v.l}</button>)}</div>;
const ThPk=({theme,set,th})=><div style={{display:"flex",gap:3}}>{[{k:"light",i:"sun"},{k:"dark",i:"moon"},{k:"pink",i:"heart"}].map(o=><button key={o.k} onClick={()=>set(o.k)} style={{padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:600,fontFamily:F,cursor:"pointer",border:o.k===theme?`1.5px solid ${th.ac}`:`1px solid ${th.bd}`,background:o.k===theme?th.al:"transparent",color:o.k===theme?th.ac:th.t2,display:"flex",alignItems:"center",gap:3}}><Ic n={o.i} s={11} c={o.k===theme?th.ac:th.t3}/></button>)}</div>;

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
      <div style={{padding:6}}><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{width:"100%",padding:"6px 10px",border:`1px solid ${th.bd}`,borderRadius:6,fontSize:13,fontFamily:F,outline:"none",background:th.bg,color:th.tx,boxSizing:"border-box"}}/></div>
      <div style={{overflowY:"auto",maxHeight:160}}>
        {filtered.map(c=> <button key={c.c} onClick={()=>{onChange(c.c);setOpen(false);setSearch("");}} style={{width:"100%",padding:"8px 12px",border:"none",background:c.c===value?th.al:"transparent",color:th.tx,fontFamily:F,fontSize:13,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background=th.sh} onMouseLeave={e=>e.currentTarget.style.background=c.c===value?th.al:"transparent"}><span>{c.f}</span>{c.n}</button>)}
      </div>
    </div>}
  </div>;
}

// ─── Calendar with Drag Selection ────────────────────────────────
function Cal({year,month,members,activeId,onToggle,onDragSelect,compact,th,t,holSet}) {
  const days=dim(year,month);const first=fdm(year,month);const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=days;d++)cells.push(d);
  const am=members.find(m=>m.id===activeId);const ai=am?members.indexOf(am):-1;const ac=ai>=0?MC[ai%MC.length]:null;
  const dragRef=useRef(null);
  const dayLabels=[t.mo,t.tu,t.we2,t.th,t.fr,t.sa,t.su];

  const handleMouseDown=(day)=>{if(!activeId||isWe(year,month,day))return;dragRef.current={start:day,days:new Set([day]),adding:!(am&&am.days||[]).includes(dk(year,month,day))};onToggle(year,month,day);};
  const handleMouseEnter=(day)=>{if(!dragRef.current||!activeId||isWe(year,month,day))return;const{start,days:dragDays,adding}=dragRef.current;const lo=Math.min(start,day),hi=Math.max(start,day);const newDays=new Set();for(let d=lo;d<=hi;d++){if(!isWe(year,month,d))newDays.add(d);}const toProcess=[...newDays].filter(d=>!dragDays.has(d));toProcess.forEach(d=>{const key=dk(year,month,d);const hasDayAlready=(am&&am.days||[]).includes(key);if((adding&&!hasDayAlready)||(!adding&&hasDayAlready))onToggle(year,month,d);});dragRef.current.days=newDays;};
  const handleMouseUp=()=>{dragRef.current=null;};

  useEffect(()=>{const up=()=>{dragRef.current=null;};window.addEventListener("mouseup",up);return()=>window.removeEventListener("mouseup",up);},[]);

  return <div style={{background:th.gbg,borderRadius:G.rSm,border:`1px solid ${th.gbd}`,overflow:"hidden",boxShadow:th.sd,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
    <div style={{padding:compact?"8px 12px":"12px 16px",borderBottom:`1px solid ${th.bl}`,display:"flex",justifyContent:"space-between"}}>
      <span style={{fontSize:compact?13:15,fontWeight:650,color:th.tx,fontFamily:F}}>{t.M[month]}</span>
    </div>
    <div style={{padding:compact?"6px":"8px 10px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:3}}>
        {dayLabels.map(d=> <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:600,color:th.t3,padding:"3px 0",fontFamily:F,textTransform:"uppercase",letterSpacing:.5}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}} onMouseLeave={handleMouseUp}>
        {cells.map((day,i)=>{
          if(!day) return <div key={`e${i}`}/>;
          const we=isWe(year,month,day);const key=dk(year,month,day);
          const mh=members.filter(m=>(m.days||[]).includes(key));const isA=(am&&am.days||[]).includes(key);
          const isTd=year===CY&&month===CM&&day===CD;
          const past=new Date(year,month,day)<new Date(CY,CM,CD);
          const isHol=(holSet&&holSet.has(key));

          // Team overview colors when no member is selected
          var vacBg = "transparent", vacColor = th.tx, vacWeight = 400, vacBorder = "2px solid transparent", vacShadow = "none", showCount = 0;
          if(isA && ac) {
            // Selected member view — solid fill
            vacBg = ac.d; vacColor = "#fff"; vacWeight = 800; vacBorder = "2px solid " + ac.d; vacShadow = "0 2px 8px " + ac.d + "40";
          } else if(mh.length === 1 && !isA) {
            // 1 member — solid color
            var mc1 = MC[members.indexOf(mh[0])%MC.length];
            vacBg = mc1.d; vacColor = "#fff"; vacWeight = 800; vacShadow = "0 2px 6px " + mc1.d + "35";
          } else if(mh.length === 2 && !isA) {
            // 2 members — two-color gradient
            var mcA = MC[members.indexOf(mh[0])%MC.length];
            var mcB = MC[members.indexOf(mh[1])%MC.length];
            vacBg = "linear-gradient(135deg," + mcA.d + " 50%," + mcB.d + " 50%)"; vacColor = "#fff"; vacWeight = 800;
          } else if(mh.length === 3 && !isA) {
            // 3 members — three-color gradient
            var mc3a = MC[members.indexOf(mh[0])%MC.length];
            var mc3b = MC[members.indexOf(mh[1])%MC.length];
            var mc3c = MC[members.indexOf(mh[2])%MC.length];
            vacBg = "linear-gradient(135deg," + mc3a.d + " 33%," + mc3b.d + " 33% 66%," + mc3c.d + " 66%)"; vacColor = "#fff"; vacWeight = 800;
          } else if(mh.length >= 4 && !isA) {
            // 4+ members — red warning with count
            vacBg = "#EF4444"; vacColor = "#fff"; vacWeight = 800; vacShadow = "0 2px 8px rgba(239,68,68,0.3)"; showCount = mh.length;
          }

          if(isHol && !isA && mh.length===0) { vacBg = th.hc; vacColor = th.ht; vacWeight = 700; }
          if(we && mh.length===0 && !isA) { vacBg = th.sh; vacColor = th.t3; }
          if(mh.length===0 && !isHol && !we && !isA) { vacBg = "transparent"; vacColor = th.tx; }
          if(isTd) vacBorder = "2px solid " + th.ac;

          return <div key={day}
            onMouseDown={e=>{e.preventDefault();handleMouseDown(day);}}
            onMouseEnter={()=>handleMouseEnter(day)}
            title={isHol?holName(key):mh.length>0?mh.map(function(m){return m.name}).join(", "):""}
            style={{position:"relative",aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:8,cursor:we||!activeId?"default":"pointer",
              background:vacBg, border:vacBorder, transition:"background .1s",
              opacity:past&&mh.length===0&&!isA?0.4:1,minHeight:compact?28:34,userSelect:"none",
              boxShadow:vacShadow}}>
            <span style={{fontSize:compact?11:12,fontWeight:isTd?700:vacWeight,color:isTd&&mh.length===0?th.ac:vacColor,fontFamily:F,lineHeight:1}}>{day}</span>
            {showCount>0&&<span style={{position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:"#fff",color:"#EF4444",fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #EF4444"}}>{showCount}</span>}
          </div>;
        })}
      </div>
    </div>
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
                title=`${holName(key)} + ${vacCount} on vacation`;
              } else if(isHol){
                bg="#93C5FD";color="#1E3A5F";fw=600;
                title=holName(key);
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
    <div style={{position:"relative",height:24,marginBottom:8}}>
      {monthStarts.map(({m,pos})=> <span key={m} style={{position:"absolute",left:`${pos}%`,fontSize:10,fontWeight:600,color:th.t3,fontFamily:F}}>{t.M[m].slice(0,3)}</span>)}
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
  const yr=team.year||CY;const total=team.members.length;
  if(!total) return <div style={{textAlign:"center",padding:40,color:th.t3}}>{t.ndy}</div>;

  // Weekly coverage
  const weeks=[];
  let d=new Date(yr,0,1);
  // Find first Monday
  while(d.getDay()!==1)d=new Date(d.getTime()+86400000);
  while(d.getFullYear()===yr){
    const weekStart=new Date(d);const weekDays=[];
    for(let i=0;i<5;i++){// Mon-Fri
      const cd=new Date(weekStart.getTime()+i*86400000);
      if(cd.getFullYear()===yr)weekDays.push(dk(cd.getFullYear(),cd.getMonth(),cd.getDate()));
    }
    let maxOut=0;
    weekDays.forEach(wd=>{const out=team.members.filter(m=>(m.days||[]).includes(wd)).length;if(out>maxOut)maxOut=out;});
    const avgOut=weekDays.reduce((sum,wd)=>sum+team.members.filter(m=>(m.days||[]).includes(wd)).length,0)/(weekDays.length||1);
    const coverage=Math.round(((total-avgOut)/total)*100);
    const weekNum=Math.ceil((d-new Date(yr,0,1))/(7*86400000))+1;
    weeks.push({num:weekNum,coverage,maxOut,month:d.getMonth(),label:`W${weekNum}`});
    d=new Date(d.getTime()+7*86400000);
  }

  return <div>
    <div style={{textAlign:"center",marginBottom:16}}><span style={{fontSize:18,fontWeight:700,color:th.tx}}>{t.coverage} — {yr}</span></div>
    {/* Bar chart */}
    <div style={{display:"flex",gap:2,alignItems:"end",height:160,padding:"0 4px",marginBottom:12}}>
      {weeks.map((w,i)=>{
        const h=Math.max(4,(w.coverage/100)*140);
        const color=w.coverage>=80?"#10B981":w.coverage>=60?th.wm:"#DC2626";
        return <div key={i} title={`${w.label}: ${w.coverage}% coverage`}
          style={{flex:1,minWidth:0,height:h,background:color,borderRadius:"3px 3px 0 0",opacity:.8,transition:"height .3s"}}/>;
      })}
    </div>
    {/* Month labels */}
    <div style={{display:"flex",justifyContent:"space-between",padding:"0 4px"}}>
      {Array.from({length:12},(_,i)=> <span key={i} style={{fontSize:10,color:th.t3,fontWeight:600}}>{t.M[i].slice(0,3)}</span>)}
    </div>
    {/* Stats */}
    <div style={{display:"flex",gap:12,marginTop:20,flexWrap:"wrap",justifyContent:"center"}}>
      {[
        {label:t.avgCov,value:`${Math.round(weeks.reduce((s,w)=>s+w.coverage,0)/weeks.length)}%`,color:"#10B981"},
        {label:t.lowWeek,value:`${Math.min(...weeks.map(w=>w.coverage))}%`,color:"#DC2626"},
        {label:t.weeksLow,value:weeks.filter(w=>w.coverage<70).length,color:th.wm},
      ].map((s,i)=> <div key={i} style={{background:th.gbg,border:`1px solid ${th.gbd}`,borderRadius:G.rXs,padding:"12px 20px",textAlign:"center",backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
        <div style={{fontSize:24,fontWeight:800,color:s.color,fontFamily:F}}>{s.value}</div>
        <div style={{fontSize:11,color:th.t3,fontWeight:600,marginTop:2}}>{s.label}</div>
      </div>)}
    </div>
  </div>;
}

// ─── Conflict Alerts ─────────────────────────────────────────────
function ConflictAlerts({team,threshold,th,t}) {
  const allDays={};
  team.members.forEach(m=>(m.days||[]).forEach(d=>{if(!allDays[d])allDays[d]=[];allDays[d].push(m.name);}));
  const conflicts=Object.entries(allDays).filter(([,v])=>v.length>=threshold).sort(([a],[b])=>a.localeCompare(b));
  if(!conflicts.length) return null;

  return <div style={{background:th.hc,border:`1px solid ${th.ht}30`,borderRadius:8,padding:"10px 14px",marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:th.ht,marginBottom:6}}>⚠️ {conflicts.length} coverage alert{conflicts.length>1?"s":""}</div>
    <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:100,overflowY:"auto"}}>
      {conflicts.slice(0,5).map(([d,names])=> <div key={d} style={{fontSize:11,color:th.ht}}>
        <strong>{d}</strong>: {names.length} out — {names.join(", ")}
      </div>)}
      {conflicts.length>5&&<div style={{fontSize:11,color:th.ht,fontStyle:"italic"}}>+{conflicts.length-5} more</div>}
    </div>
  </div>;
}

// ─── Member Row ──────────────────────────────────────────────────
function MRow({member:m,index:i,isActive,onClick,onDelete,onStartRename,isEditing,onFinishRename,onCountryChange,onExportICS,onOptimize,th,t,locked}){
  const c=MC[i%MC.length];const[en,setEn]=useState(m.name);const[h,setH]=useState(false);const dc=(m.days||[]).length||0;
  const co=m.country?EU_C.find(x=>x.c===m.country):null;
  useEffect(()=>{setEn(m.name);},[m.name]);

  if(isEditing) return <div style={{display:"flex",flexDirection:"column",gap:6,padding:"8px 10px",background:c.b,borderRadius:8,border:`1.5px solid ${c.d}`}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:c.d,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{(en||"?")[0].toUpperCase()}</div>
      <input autoFocus value={en} onChange={e=>setEn(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&en.trim())onFinishRename(en.trim());if(e.key==="Escape")onFinishRename(m.name);}} onBlur={()=>en.trim()?onFinishRename(en.trim()):onFinishRename(m.name)} maxLength={30} style={{flex:1,border:"none",background:"transparent",fontSize:13,fontWeight:600,fontFamily:F,color:c.t,outline:"none",padding:"3px 0"}}/>
    </div>
    <CountrySelect value={m.country} onChange={onCountryChange} th={th} t={t}/>
  </div>;

  return <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:isActive?c.b:h?th.sh:"transparent",borderRadius:8,cursor:"pointer",border:isActive?`1.5px solid ${c.d}40`:"1.5px solid transparent",transition:"all .15s"}}>
    <div style={{width:28,height:28,borderRadius:"50%",background:c.d,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{m.name[0].toUpperCase()}</div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13,fontWeight:600,color:isActive?c.t:th.tx,fontFamily:F,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
      <div style={{fontSize:11,color:th.t3}}>{co?co.f+" ":""}{dc===0?t.nd:`${dc} ${dc!==1?t.dys:t.dy}`}</div>
    </div>
    {(h||isActive)&&!locked&&<div style={{display:"flex",gap:1,flexShrink:0}}>
      {m.country&&<button onClick={e=>{e.stopPropagation();onOptimize();}} title="Suggest best days" style={{background:"none",border:"none",cursor:"pointer",padding:3,display:"flex"}}><Ic n="sun" s={13} c="#F59E0B"/></button>}
      <button onClick={e=>{e.stopPropagation();onExportICS();}} title={t.export} style={{background:"none",border:"none",cursor:"pointer",padding:3,display:"flex"}}><Ic n="download" s={13} c={th.t3}/></button>
      <button onClick={e=>{e.stopPropagation();onStartRename();}} style={{background:"none",border:"none",cursor:"pointer",padding:3,display:"flex"}}><Ic n="edit" s={13} c={th.t3}/></button>
      <button onClick={e=>{e.stopPropagation();onDelete();}} style={{background:"none",border:"none",cursor:"pointer",padding:3,display:"flex"}}><Ic n="trash" s={13} c={th.t3}/></button>
    </div>}
  </div>;
}

// ─── Holiday Browser ─────────────────────────────────────────────
function HolBrowser({onClose,th,t,year}){
  const[sel,setSel]=useState(null);
  const co=sel?EU_C.find(c=>c.c===sel):null;
  const hols=sel?computeHolidays(sel,year).map(h=>({date:h,name:holName(h)})).sort((a,b)=>a.date.localeCompare(b.date)):[];

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,maxWidth:540,width:"100%",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:th.sl,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${th.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {sel&&<button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><Ic n="chevL" s={18} c={th.t2}/></button>}
          <h3 style={{margin:0,fontSize:17,fontWeight:700,color:th.tx,fontFamily:F}}>{sel?`${co.f} ${co.n}`:t.ch} {year}</h3>
        </div>
        <button onClick={onClose} style={{background:th.sh,border:"none",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Ic n="x" s={15} c={th.t2}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
        {!sel?<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:5}}>
          {EU_C.map(c=>{const cnt=computeHolidays(c.c,year).length;return <button key={c.c} onClick={()=>setSel(c.c)} style={{background:th.sf,border:`1px solid ${th.bd}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,textAlign:"left",fontFamily:F,transition:"all .15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=th.ac} onMouseLeave={e=>e.currentTarget.style.borderColor=th.bd}>
            <span style={{fontSize:18}}>{c.f}</span>
            <div><div style={{fontSize:12,fontWeight:600,color:th.tx}}>{c.n}</div><div style={{fontSize:10,color:th.t3}}>{cnt} {t.hol}</div></div>
          </button>;})}
        </div>:<div style={{display:"flex",flexDirection:"column",gap:3}}>
          {(()=>{const wk=hols.filter(h=>{const p=pk(h.date);return new Date(p.y,p.m,p.d).getDay()!==0&&new Date(p.y,p.m,p.d).getDay()!==6;}).length;return <div style={{padding:"8px 12px",background:th.al,borderRadius:8,marginBottom:6,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:600,color:th.ac}}>{hols.length} {t.hol}</span>
            <span style={{fontSize:12,color:"#065F46",fontWeight:600,background:"#D1FAE5",padding:"2px 6px",borderRadius:8}}>{wk} {t.wk}</span>
            <span style={{fontSize:12,color:"#92400E",fontWeight:600,background:"#FEF3C7",padding:"2px 6px",borderRadius:8}}>{hols.length-wk} {t.we}</span>
          </div>;})()}
          {hols.map(h=>{const p=pk(h.date);const dt=new Date(p.y,p.m,p.d);const dow=dt.toLocaleDateString("en",{weekday:"long"});const isWknd=dt.getDay()===0||dt.getDay()===6;
          return <div key={h.date} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:th.bg,borderRadius:6}}>
            <div style={{minWidth:40,textAlign:"center"}}><div style={{fontSize:17,fontWeight:700,color:isWknd?th.t3:th.ac,fontFamily:F}}>{p.d}</div><div style={{fontSize:10,color:th.t3,fontWeight:600}}>{t.M[p.m].slice(0,3)}</div></div>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:th.tx}}>{h.name}</div><div style={{fontSize:10,color:th.t3}}>{dow}</div></div>
            <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:8,background:isWknd?"#FEF3C7":"#D1FAE5",color:isWknd?"#92400E":"#065F46"}}>{isWknd?t.we:t.wk}</span>
          </div>;})}
        </div>}
      </div>
    </div>
  </div>;
}

// ─── Share Modal ──────────────────────────────────────────────────
function ShareModal({teamId,teamName,onClose,th,t}){
  const[cp,setCp]=useState(false);const[tab,setTab]=useState("link");
  const link=`${window.location.origin}${window.location.pathname}#team=${teamId}`;
  const embedCode=getEmbedCode(teamId);
  const copy=(text)=>{try{navigator.clipboard.writeText(text);}catch(e){};setCp(true);setTimeout(()=>setCp(false),2500);};

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,padding:28,maxWidth:480,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,width:"100%",boxShadow:th.sl}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{margin:0,fontSize:18,fontWeight:700,color:th.tx}}>{t.sht}</h3>
        <button onClick={onClose} style={{background:th.sh,border:"none",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Ic n="x" s={15} c={th.t2}/></button>
      </div>
      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {[{k:"link",i:"link",l:t.cl},{k:"qr",i:"grid",l:"QR"},{k:"embed",i:"code",l:t.embed}].map(o=> <button key={o.k} onClick={()=>setTab(o.k)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:F,cursor:"pointer",border:o.k===tab?`1.5px solid ${th.ac}`:`1px solid ${th.bd}`,background:o.k===tab?th.al:"transparent",color:o.k===tab?th.ac:th.t2,display:"flex",alignItems:"center",gap:4}}><Ic n={o.i} s={13} c={o.k===tab?th.ac:th.t3}/>{o.l}</button>)}
      </div>
      {tab==="link"&&<Fragment>
        <p style={{margin:"0 0 10px",fontSize:13,color:th.t2}}>{t.shs} {teamName}</p>
        <div style={{background:th.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${th.bd}`,marginBottom:12,wordBreak:"break-all",fontSize:12,color:th.t2,fontFamily:FM,lineHeight:1.5}}>{link}</div>
        <Btn th={th} onClick={()=>copy(link)} icon={cp?"check":"copy"} style={{width:"100%",justifyContent:"center"}}>{cp?t.cp:t.cl}</Btn>
      </Fragment>}
      {tab==="qr"&&<Fragment>
        <p style={{margin:"0 0 12px",fontSize:13,color:th.t2}}>Scan to join {teamName}</p>
        <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><QRCode data={link} size={180} th={th}/></div>
        <div style={{background:th.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${th.bd}`,textAlign:"center",fontSize:11,color:th.t3,fontFamily:FM}}>{teamId}</div>
      </Fragment>}
      {tab==="embed"&&<Fragment>
        <p style={{margin:"0 0 10px",fontSize:13,color:th.t2}}>Paste this code into any website to embed the team calendar:</p>
        <div style={{background:th.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${th.bd}`,marginBottom:12,wordBreak:"break-all",fontSize:11,color:th.t2,fontFamily:FM,lineHeight:1.5}}>{embedCode}</div>
        <Btn th={th} onClick={()=>copy(embedCode)} icon={cp?"check":"copy"} style={{width:"100%",justifyContent:"center"}}>{cp?t.cp:t.copyEmbed}</Btn>
      </Fragment>}
      <p style={{margin:"12px 0 0",fontSize:11,color:th.t3,textAlign:"center"}}>Teams are stored for 24 months. Bookmark this link to return anytime.</p>
    </div>
  </div>;
}

// ─── Landing Page ────────────────────────────────────────────────
// ─── About Page ──────────────────────────────────────────────────
function AboutPage({th,t,onBack,lang,setLang,theme,setTheme}) {
  const Section=({icon,title,children})=> <div style={{marginBottom:28}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={{width:36,height:36,borderRadius:G.rXs,background:th.al,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic n={icon} s={18} c={th.ac}/></div>
      <h2 style={{margin:0,fontSize:18,fontWeight:750,color:th.tx,letterSpacing:-.3}}>{title}</h2>
    </div>
    <div style={{fontSize:14,color:th.t2,lineHeight:1.7}}>{children}</div>
  </div>;

  const Feature=({emoji,title,desc})=> <div style={{display:"flex",gap:12,padding:"12px 14px",background:th.gbg,borderRadius:G.rXs,border:`1px solid ${th.gbd}`,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,marginBottom:8}}>
    <span style={{fontSize:20,flexShrink:0,lineHeight:1.5}}>{emoji}</span>
    <div><div style={{fontSize:13,fontWeight:650,color:th.tx,marginBottom:2}}>{title}</div><div style={{fontSize:12,color:th.t3,lineHeight:1.5}}>{desc}</div></div>
  </div>;

  return <div style={{minHeight:"100vh",background:th.bg,fontFamily:F,padding:"0 20px 60px"}}>
    {/* Header */}
    <div style={{maxWidth:640,margin:"0 auto",paddingTop:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:th.gbg,border:`1px solid ${th.gbd}`,borderRadius:G.rXs,padding:"8px 14px",cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:600,color:th.t2,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=th.ac} onMouseLeave={e=>e.currentTarget.style.borderColor=th.gbd}><Ic n="chevL" s={16} c={th.t2}/>{t.back}</button>
        <div style={{display:"flex",gap:8}}><ThPk theme={theme} set={setTheme} th={th}/><LangPk lang={lang} set={setLang} th={th}/></div>
      </div>

      {/* Hero */}
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{width:56,height:56,borderRadius:16,background:th.gd,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:`0 8px 40px ${th.ac}50, inset 0 1px 0 rgba(255,255,255,0.3)`}}><Ic n="sun" s={26} c="#fff"/></div>
        <h1 style={{margin:"0 0 8px",fontSize:28,fontWeight:800,color:th.tx,letterSpacing:-.6}}>Team Vacation Planner</h1>
        <p style={{margin:0,fontSize:15,color:th.t2,lineHeight:1.6}}>A beautiful, free, zero-login team vacation planning tool for teams up to 25. Built with Apple's Liquid Glass design language. 55 countries, 10 languages, 2026–2035.</p>
      </div>

      {/* How It Works */}
      <Section icon="arrow" title="How It Works">
        <div style={{marginBottom:8}}><strong style={{color:th.tx}}>1. Create a team</strong> — pick a name and year. You get an instant shareable link.</div>
        <div style={{marginBottom:8}}><strong style={{color:th.tx}}>2. Add members</strong> — enter each person's name and country. Their public holidays are automatically loaded.</div>
        <div style={{marginBottom:8}}><strong style={{color:th.tx}}>3. Pick vacation days</strong> — select a member, then click or drag across calendar dates. Weekends are excluded automatically.</div>
        <div style={{marginBottom:8}}><strong style={{color:th.tx}}>4. Share the link</strong> — anyone with the link can view and edit. No accounts, no passwords, no sign-ups.</div>
        <div><strong style={{color:th.tx}}>5. Analyze & export</strong> — switch between views, download reports, and keep your team in sync.</div>
      </Section>

      {/* Feature Categories */}
      <Section icon="grid" title="Calendar & Planning">
        <Feature emoji="📅" title="12-Month Calendar View" desc="Full-year overview with all team members color-coded. Click any day to toggle vacation. Today is highlighted."/>
        <Feature emoji="👆" title="Drag-to-Select" desc="Click and drag across multiple days to select an entire vacation range in one motion. Automatically skips weekends."/>
        <Feature emoji="🔄" title="Multi-Year Support (2026–2035)" desc="Holidays are computed algorithmically — Western & Orthodox Easter, moveable feasts, country-specific rules — for any year in the range."/>
        <Feature emoji="🗓️" title="Quarterly Focus View" desc="Toggle Q1/Q2/Q3/Q4 to zoom into three months at a time with larger calendar cards for tactical planning."/>
        <Feature emoji="🏛️" title="45 European Country Holidays" desc="Automatic public holiday detection for all EU, EEA, EFTA countries plus UK, Balkans, Turkey, Ukraine, and more."/>
        <Feature emoji="🟡" title="Holiday Clash Detector" desc="Warns when someone books vacation on their own country's public holiday — with a one-click button to remove wasted days."/>
        <Feature emoji="☀️" title="Smart Vacation Optimizer" desc="Analyzes each member's country holidays and suggests optimal bridge days: 'Take 1 day off → get 4 days free.'"/>
      </Section>

      <Section icon="bar" title="Views & Analytics">
        <Feature emoji="🔥" title="Heatmap View" desc="Color-intensity grid showing who's out each day. Blue = public holiday, red = vacation density, purple = both overlap."/>
        <Feature emoji="📊" title="Timeline / Gantt View" desc="Horizontal bars per member showing vacation blocks across the year. Instant visual of team distribution."/>
        <Feature emoji="📈" title="Coverage Dashboard" desc="Weekly bar chart of team availability percentage. Stats show average coverage, lowest week, and weeks under 70%."/>
        <Feature emoji="🏳️" title="Team Holidays Summary" desc="Aggregated view of all public holidays affecting your team, with which members are impacted by each one."/>
        <Feature emoji="📝" title="Activity Log" desc="Chronological feed of all changes — who added, removed, or modified vacation days, with relative timestamps."/>
      </Section>

      <Section icon="share" title="Sharing & Collaboration">
        <Feature emoji="🔗" title="Instant Share Link" desc="Every team gets a unique URL. Share it via chat, email, or scan the QR code."/>
        <Feature emoji="📱" title="QR Code" desc="The share modal includes a QR code tab for in-office scanning — colleagues join with their phone camera."/>
        <Feature emoji="🖼️" title="Embeddable Widget" desc="Generate an iframe code to embed the team calendar on any website, wiki, or intranet page."/>
        <Feature emoji="🔒" title="Lock / Unlock Board" desc="Admin can lock the board to prevent edits during review periods. A lock icon shows in the header."/>
        <Feature emoji="↩️" title="Undo / Redo" desc="Ctrl+Z and Ctrl+Shift+Z with 20-action history. Also available as buttons in the toolbar."/>
      </Section>

      <Section icon="download" title="Export & Integration">
        <Feature emoji="📥" title="ICS Calendar Export" desc="Download individual member or full team .ics files. Import into Google Calendar, Outlook, or Apple Calendar."/>
        <Feature emoji="📄" title="PDF / HTML Report" desc="Downloadable annual report with member table, date chips, overlap analysis, and team summary."/>
        <Feature emoji="📊" title="CSV Import & Export" desc="Bulk upload vacation data from spreadsheets or export the full team as CSV for HR systems."/>
        <Feature emoji="📗" title="Excel (XLSX) Export" desc="SpreadsheetML file that opens natively in Excel with formatted columns — ready for payroll or HR."/>
        <Feature emoji="📋" title="TSV / Google Sheets Feed" desc="Append &view=tsv to any team URL. Use Google Sheets IMPORTDATA() for a live auto-refreshing feed."/>
        <Feature emoji="🖥️" title="JSON API" desc="Append &view=json to get structured data for dashboards, Slack bots, or any integration."/>
      </Section>

      <Section icon="globe" title="Design & Accessibility">
        <Feature emoji="🌐" title="10 Languages" desc="English, French, German, Spanish, Portuguese, Romanian, Hungarian, Swedish, Italian, Bulgarian — all UI strings fully localized."/>
        <Feature emoji="🎨" title="3 Themes with Liquid Glass" desc="Light, Dark, and Pink themes — all with Apple's Liquid Glass design: frosted translucent surfaces, blur, inner highlights."/>
        <Feature emoji="🌙" title="Dark Mode Auto-Detection" desc="Respects your OS preference on first load. If your device is in dark mode, the app auto-selects the dark theme."/>
        <Feature emoji="🖨️" title="Print-Optimized View" desc="Append &view=print for an A3 landscape year-at-a-glance — designed for office walls with clean ink-friendly styling."/>
        <Feature emoji="📺" title="Mini Dashboard Badge" desc="Append &view=badge for a compact 'Who's in today' widget — ideal for TV screens or Slack channel topics."/>
        <Feature emoji="📊" title="Visit Counter" desc="Anonymous timezone-based visit tracking by country, shown at the bottom of the landing page."/>
      </Section>

      <Section icon="flag" title="Data & Privacy">
        <Feature emoji="🔐" title="No Login Required" desc="Zero accounts, zero passwords, zero email collection. The team link IS the access key."/>
        <Feature emoji="⏰" title="24-Month Auto-Cleanup" desc="Teams are automatically deleted after 24 months of inactivity. Expired links redirect to the home page."/>
        <Feature emoji="💾" title="Shared Storage" desc="Team data is persisted via the platform's shared storage API. Anyone with the link can access and edit."/>
      </Section>

      {/* Footer */}
      <div style={{textAlign:"center",marginTop:40,paddingTop:24,borderTop:`1px solid ${th.gbd}`}}>
        <p style={{fontSize:12,color:th.t3,margin:0}}>Built with care for teams who value simplicity.</p>
        <button onClick={onBack} style={{marginTop:16,padding:"10px 28px",borderRadius:G.rXs,border:"none",background:th.ac,color:th.ti,fontSize:14,fontWeight:700,fontFamily:F,cursor:"pointer",boxShadow:`0 4px 20px ${th.ac}35`}}>← {t.back}</button>
      </div>
    </div>
  </div>;
}

// ─── Contact / Feedback Modal ────────────────────────────────────
function ContactModal({onClose, th, t}) {
  const[email,setEmail]=useState("");
  const[subject,setSubject]=useState("");
  const[message,setMessage]=useState("");
  const[sent,setSent]=useState(false);

  const subjects = [
    { value: "feedback", label: t.subFeedback },
    { value: "bug", label: t.subBug },
    { value: "suggestion", label: t.subSuggestion },
    { value: "question", label: t.subQuestion },
    { value: "partnership", label: t.subPartner },
    { value: "data", label: t.subData },
    { value: "other", label: t.subOther },
  ];

  const canSend = email.trim() && email.includes("@") && subject && message.trim().length >= 10;

  const handleSend = () => {
    if (!canSend) return;
    var to = ["adrian","stanese.ro"].join("@");
    var sl = (subjects.find(function(s){return s.value===subject})||{}).label || subject;
    var subjectLine = "[TVP] " + sl;
    var body = "From: " + email + "\n\nSubject: " + subjectLine + "\n\n" + message + "\n\n---\nSent from Team Vacation Planner";
    var mailto = "mailto:" + to + "?subject=" + encodeURIComponent(subjectLine) + "&body=" + encodeURIComponent(body);
    window.open(mailto, "_blank");
    setSent(true);
    setTimeout(function() { setSent(false); onClose(); }, 2500);
  };

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,padding:28,maxWidth:480,width:"100%",boxShadow:th.sl,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:G.rXs,background:th.al,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="mail" s={18} c={th.ac}/></div>
          <div><div style={{fontSize:16,fontWeight:700,color:th.tx}}>{t.contactTitle}</div><div style={{fontSize:11,color:th.t3,marginTop:1}}>{t.contactSub}</div></div>
        </div>
        <button onClick={onClose} style={{background:th.sh,border:"none",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Ic n="x" s={15} c={th.t2}/></button>
      </div>

      {sent ? <div style={{textAlign:"center",padding:"40px 20px"}}>
        <div style={{fontSize:40,marginBottom:12}}>✉️</div>
        <div style={{fontSize:16,fontWeight:700,color:th.tx,marginBottom:6}}>{t.thankYou}</div>
        <div style={{fontSize:13,color:th.t2}}>{t.thankYouSub}</div>
      </div> : <Fragment>
        {/* Email */}
        <label style={{fontSize:12,fontWeight:600,color:th.t2,marginBottom:4,display:"block"}}>{t.yourEmail} *</label>
        <Inp th={th} value={email} onChange={setEmail} placeholder={t.emailPlaceholder} maxLength={100}/>

        {/* Subject dropdown */}
        <label style={{fontSize:12,fontWeight:600,color:th.t2,marginBottom:4,display:"block",marginTop:14}}>{t.subjectLabel} *</label>
        <div style={{position:"relative"}}>
          <select value={subject} onChange={e=>setSubject(e.target.value)} style={{
            width:"100%",padding:"10px 14px",border:`1.5px solid ${th.gbd}`,borderRadius:G.rXs,fontSize:14,fontFamily:F,
            outline:"none",background:th.gbg,color:subject?th.tx:th.t3,appearance:"none",cursor:"pointer",
            backdropFilter:G.blur,WebkitBackdropFilter:G.blur,boxSizing:"border-box",
          }}>
            <option value="" disabled>{t.selectTopic}</option>
            {subjects.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><Ic n="chevR" s={14} c={th.t3}/></div>
        </div>

        {/* Message */}
        <label style={{fontSize:12,fontWeight:600,color:th.t2,marginBottom:4,display:"block",marginTop:14}}>{t.messageLabel} *</label>
        <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder={t.msgPlaceholder} rows={5} style={{
          width:"100%",padding:"10px 14px",border:`1.5px solid ${th.gbd}`,borderRadius:G.rXs,fontSize:14,fontFamily:F,
          outline:"none",background:th.gbg,color:th.tx,resize:"vertical",boxSizing:"border-box",lineHeight:1.5,
          backdropFilter:G.blur,WebkitBackdropFilter:G.blur,
        }}/>
        <div style={{fontSize:10,color:th.t3,marginTop:4,textAlign:"right"}}>{message.length} {t.chars}</div>

        {/* Send button */}
        <div style={{marginTop:14}}>
          <Btn th={th} onClick={handleSend} disabled={!canSend} icon="send" style={{width:"100%",justifyContent:"center"}}>
            {t.sendFeedback}
          </Btn>
        </div>
        <p style={{fontSize:10,color:th.t3,textAlign:"center",marginTop:10,lineHeight:1.5}}>
          {t.emailNote}
        </p>
      </Fragment>}
    </div>
  </div>;
}

function Landing({onCreateTeam,onJoinTeam,myTeams,onOpenTeam,th,t,lang,setLang,theme,setTheme}){
  const[name,setName]=useState("");const[yr,setYr]=useState(CY>=2026?CY:2026);const[code,setCode]=useState("");const[mode,setMode]=useState(null);const[err,setErr]=useState(null);const[holBr,setHolBr]=useState(false);const[about,setAbout]=useState(false);const[contact,setContact]=useState(false);
  const YRS=Array.from({length:10},(_,i)=>2026+i);

  if(about) return <AboutPage th={th} t={t} onBack={()=>setAbout(false)} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}/>;

  return <div style={{minHeight:"100vh",background:th.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",fontFamily:F}}>
    <div style={{textAlign:"center",maxWidth:520,width:"100%"}}>
      <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <ThPk theme={theme} set={setTheme} th={th}/>
        <LangPk lang={lang} set={setLang} th={th}/>
        <button onClick={()=>setAbout(true)} style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600,fontFamily:F,cursor:"pointer",border:`1px solid ${th.gbd}`,background:th.gbg,color:th.t2,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,display:"flex",alignItems:"center",gap:4,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=th.ac} onMouseLeave={e=>e.currentTarget.style.borderColor=th.gbd}><Ic n="globe" s={11} c={th.t3}/>{t.about}</button>
        <button onClick={()=>setContact(true)} style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600,fontFamily:F,cursor:"pointer",border:`1px solid ${th.gbd}`,background:th.gbg,color:th.t2,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,display:"flex",alignItems:"center",gap:4,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=th.ac} onMouseLeave={e=>e.currentTarget.style.borderColor=th.gbd}><Ic n="mail" s={11} c={th.t3}/>{t.contact}</button>
      </div>
      <div style={{width:60,height:60,borderRadius:18,background:th.gd,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:`0 8px 40px ${th.ac}50, inset 0 1px 0 rgba(255,255,255,0.3)`}}><Ic n="sun" s={28} c="#fff"/></div>
      <h1 style={{fontSize:26,fontWeight:800,color:th.tx,margin:"0 0 6px",letterSpacing:-.6,lineHeight:1.15}}>{t.brand}</h1>
      <p style={{fontSize:15,color:th.t2,margin:"0 0 32px",lineHeight:1.5}}>{t.tag1}<br/>{t.tag2}</p>

      {!mode&&<div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        {[
          {m:"create",i:"plus",grad:"linear-gradient(135deg, rgba(129,140,248,0.15), rgba(99,102,241,0.1))",glowColor:"rgba(99,102,241,0.2)",iconGrad:"linear-gradient(135deg, #818CF8, #6366F1)",tt:t.crt,st:t.crSub},
          {m:"join",i:"link",grad:"linear-gradient(135deg, rgba(52,211,153,0.12), rgba(16,185,129,0.08))",glowColor:"rgba(16,185,129,0.18)",iconGrad:"linear-gradient(135deg, #34D399, #10B981)",tt:t.jnt,st:t.jnSub},
        ].map(o=>
          <button key={o.m} onClick={()=>{setMode(o.m);setErr(null);}} style={{
            background:o.grad,
            backdropFilter:"blur(20px) saturate(1.8)",
            WebkitBackdropFilter:"blur(20px) saturate(1.8)",
            border:"1px solid rgba(255,255,255,0.45)",
            borderRadius:20,padding:"20px 22px",cursor:"pointer",textAlign:"left",
            display:"flex",alignItems:"center",gap:16,
            transition:"all 0.35s cubic-bezier(0.4,0,0.2,1)",
            boxShadow:`0 2px 16px ${o.glowColor}, 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)`,
            fontFamily:F,position:"relative",overflow:"hidden",
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px) scale(1.01)";e.currentTarget.style.boxShadow=`0 8px 32px ${o.glowColor}, 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.boxShadow=`0 2px 16px ${o.glowColor}, 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)`;}}>
            <div style={{width:44,height:44,borderRadius:14,background:o.iconGrad,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 4px 16px ${o.glowColor}`,border:"1px solid rgba(255,255,255,0.3)"}}><Ic n={o.i} s={22} c="#fff"/></div>
            <div><div style={{fontSize:16,fontWeight:700,color:th.tx,letterSpacing:-0.2}}>{o.tt}</div><div style={{fontSize:12,color:th.t2,marginTop:3,fontWeight:450}}>{o.st}</div></div>
          </button>)}
      </div>}

      {mode==="create"&&<div style={{background:th.gbg,borderRadius:G.rSm,padding:24,border:`1px solid ${th.gbd}`,boxShadow:th.sm,marginBottom:24,textAlign:"left",backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{margin:0,fontSize:16,fontWeight:700,color:th.tx}}>{t.crt}</h3><button onClick={()=>setMode(null)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><Ic n="x" s={16} c={th.t3}/></button></div>
        <label style={{fontSize:12,fontWeight:600,color:th.t2,marginBottom:4,display:"block"}}>{t.tn}</label>
        <Inp th={th} value={name} onChange={setName} placeholder={t.tnP} autoFocus maxLength={40} onKeyDown={e=>{if(e.key==="Enter"&&name.trim())onCreateTeam(name.trim(),yr);}}/>
        <label style={{fontSize:12,fontWeight:600,color:th.t2,marginBottom:4,display:"block",marginTop:12}}>{t.vy}</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{YRS.map(y=> <button key={y} onClick={()=>setYr(y)} style={{padding:"6px 12px",borderRadius:6,fontSize:13,fontWeight:600,fontFamily:F,cursor:"pointer",border:y===yr?`2px solid ${th.ac}`:`1.5px solid ${th.bd}`,background:y===yr?th.al:th.sf,color:y===yr?th.ac:th.tx}}>{y}</button>)}</div>
        <div style={{marginTop:14}}><Btn th={th} onClick={()=>name.trim()&&onCreateTeam(name.trim(),yr)} disabled={!name.trim()} icon="arrow" style={{width:"100%",justifyContent:"center"}}>{t.cr}</Btn></div>
      </div>}

      {mode==="join"&&<div style={{background:th.gbg,borderRadius:G.rSm,padding:24,border:`1px solid ${th.gbd}`,boxShadow:th.sm,marginBottom:24,textAlign:"left",backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{margin:0,fontSize:16,fontWeight:700,color:th.tx}}>{t.jnt}</h3><button onClick={()=>setMode(null)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><Ic n="x" s={16} c={th.t3}/></button></div>
        <Inp th={th} value={code} onChange={setCode} placeholder={t.jcP} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&code.trim()){setErr(null);onJoinTeam(code.trim(),e2=>setErr(e2));}}}/>
        {err&&<div style={{marginTop:6,fontSize:12,color:"#DC2626"}}>{err}</div>}
        <div style={{marginTop:14}}><Btn th={th} onClick={()=>{if(code.trim()){setErr(null);onJoinTeam(code.trim(),e2=>setErr(e2));}}} disabled={!code.trim()} icon="arrow" style={{width:"100%",justifyContent:"center"}}>{t.jn}</Btn></div>
      </div>}

      {myTeams.length>0&&<div style={{textAlign:"left",marginBottom:16}}><h3 style={{fontSize:12,fontWeight:600,color:th.t3,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.mt}</h3>
        {myTeams.map(tm=> <button key={tm.id} onClick={()=>onOpenTeam(tm.id)} style={{width:"100%",background:th.gbg,border:`1px solid ${th.gbd}`,borderRadius:G.rXs,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:F,marginBottom:5,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,transition:"all .25s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=th.ac} onMouseLeave={e=>e.currentTarget.style.borderColor=th.bd}><div style={{textAlign:"left"}}><div style={{fontSize:14,fontWeight:600,color:th.tx}}>{tm.name}</div><div style={{fontSize:11,color:th.t3,marginTop:1}}>{tm.year||"—"} · {tm.mc||0} {(tm.mc||0)!==1?t.mbs:t.mb}</div></div><Ic n="chevR" s={16} c={th.t3}/></button>)}
      </div>}

      {/* Country Holidays */}
      <button onClick={()=>setHolBr(true)} style={{
        width:"100%",marginTop:8,
        background:"linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08))",
        backdropFilter:"blur(20px) saturate(1.8)",
        WebkitBackdropFilter:"blur(20px) saturate(1.8)",
        border:"1px solid rgba(255,255,255,0.45)",
        borderRadius:20,padding:"20px 22px",cursor:"pointer",textAlign:"left",
        display:"flex",alignItems:"center",gap:16,
        transition:"all 0.35s cubic-bezier(0.4,0,0.2,1)",
        boxShadow:"0 2px 16px rgba(245,158,11,0.12), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)",
        fontFamily:F,
      }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px) scale(1.01)";e.currentTarget.style.boxShadow="0 8px 32px rgba(245,158,11,0.18), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.boxShadow="0 2px 16px rgba(245,158,11,0.12), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)";}}>
        <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg, #F59E0B, #EF4444)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(245,158,11,0.25)",border:"1px solid rgba(255,255,255,0.3)"}}><Ic n="flag" s={22} c="#fff"/></div>
        <div><div style={{fontSize:16,fontWeight:700,color:th.tx,letterSpacing:-0.2}}>{t.ch}</div><div style={{fontSize:12,color:th.t2,marginTop:3,fontWeight:450}}>2026–2035 · 55 countries</div></div>
      </button>
    </div>
    <div style={{marginTop:40,fontSize:11,color:th.t3}}>{t.bf}</div>
    <VisitCounter th={th}/>
    {holBr&&<HolBrowser onClose={()=>setHolBr(false)} th={th} t={t} year={yr}/>}
    {contact&&<ContactModal onClose={()=>setContact(false)} th={th} t={t}/>}
  </div>;
}

// ─── Workspace ───────────────────────────────────────────────────
function WS({team,onUpdate,onGoHome,th,t,lang,setLang,theme,setTheme}){
  const[aId,setAId]=useState(null);const[eId,setEId]=useState(null);const[adding,setAdding]=useState(false);const[nn,setNn]=useState("");const[nc,setNc]=useState(null);
  const[showSh,setShowSh]=useState(false);const[view,setView]=useState("cal");const[toast,setToast]=useState(null);
  const[mob,setMob]=useState(window.innerWidth<768);const[sb,setSb]=useState(window.innerWidth>=768);const[settings,setSettings]=useState(false);const[holBr,setHolBr]=useState(false);
  const[threshold,setThreshold]=useState(team.threshold||2);
  const[showOptimizer,setShowOptimizer]=useState(null); // member id
  const[showCSVImport,setShowCSVImport]=useState(false);
  const[csvText,setCsvText]=useState("");
  const[quarter,setQuarter]=useState(null); // null=full year, 0=Q1, 1=Q2, 2=Q3, 3=Q4

  // ─── Undo/Redo ───
  const historyRef=useRef([]);const redoRef=useRef([]);const skipHistoryRef=useRef(false);
  const pushHistory=(prev)=>{if(skipHistoryRef.current){skipHistoryRef.current=false;return;}historyRef.current=[...historyRef.current.slice(-19),JSON.stringify(prev)];redoRef.current=[];};
  const undo=()=>{if(!historyRef.current.length)return;const prev=historyRef.current.pop();redoRef.current.push(JSON.stringify(team));skipHistoryRef.current=true;onUpdate(JSON.parse(prev));flash("Undo");};
  const redo=()=>{if(!redoRef.current.length)return;const next=redoRef.current.pop();historyRef.current.push(JSON.stringify(team));skipHistoryRef.current=true;onUpdate(JSON.parse(next));flash("Redo");};
  const updateWithHistory=(newTeam)=>{pushHistory(team);onUpdate(newTeam);};

  // Keyboard shortcuts for undo/redo
  useEffect(()=>{const h=(e)=>{if((e.metaKey||e.ctrlKey)&&e.key==="z"){e.preventDefault();if(e.shiftKey)redo();else undo();}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[team]);

  useEffect(()=>{const h=()=>{const m=window.innerWidth<768;setMob(m);if(!m)setSb(true);};window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  // Auto-show share modal for freshly created teams so user gets the link immediately
  useEffect(()=>{if(team.members.length===0&&!showSh){setShowSh(true);}},[]);
  const flash=m=>{setToast(m);setTimeout(()=>setToast(null),2500);};
  const yr=team.year||CY;const locked=!!team.locked;const isAdmin=!team.adminId||true;// In this version, everyone can admin

  // Compute holidays for all team countries
  const holSet=new Set();team.members.forEach(m=>{if(m.country)computeHolidays(m.country,yr).forEach(h=>holSet.add(h));});

  const startAdd=()=>{if(locked){flash(t.locked);return;}if(team.members.length>=25){flash(t.mx);return;}setAdding(true);setNn("");setNc(null);};
  const confirmAdd=()=>{const n=nn.trim();if(!n||!nc)return;const nm={id:gid(),name:n,country:nc,days:[]};const co=EU_C.find(c=>c.c===nc);updateWithHistory({...team,members:[...team.members,nm],log:addLogEntry(team,`${n} (${(co&&co.f)||""} ${(co&&co.n)||nc}) joined the team`)});setAId(nm.id);setAdding(false);setNn("");setNc(null);if(mob)setSb(false);};
  const del=id=>{if(locked)return;const m=team.members.find(x=>x.id===id);updateWithHistory({...team,members:team.members.filter(x=>x.id!==id),log:addLogEntry(team,`${(m&&m.name)||"Member"} was removed`)});if(aId===id)setAId(null);flash(t.mr);};
  const ren=(id,n)=>{setEId(null);const old=team.members.find(x=>x.id===id);updateWithHistory({...team,members:team.members.map(m=>m.id===id?{...m,name:n}:m),log:addLogEntry(team,`${(old&&old.name)||"Member"} renamed to ${n}`)});};
  const setCo=(id,cc)=>{const m=team.members.find(x=>x.id===id);const co=EU_C.find(c=>c.c===cc);updateWithHistory({...team,members:team.members.map(x=>x.id===id?{...x,country:cc}:x),log:addLogEntry(team,`${(m&&m.name)||"Member"} → ${(co&&co.f)||""} ${(co&&co.n)||cc}`)});};
  const tog=(y,m,d)=>{if(!aId||locked)return;const key=dk(y,m,d);const adding2=!(am&&am.days||[]).includes(key);updateWithHistory({...team,members:team.members.map(mm=>{if(mm.id!==aId)return mm;const ds=mm.days||[];return{...mm,days:ds.includes(key)?ds.filter(x=>x!==key):[...ds,key]};}),log:addLogEntry(team,`${(am&&am.name)||"Member"} ${adding2?"added":"removed"} ${key}`)});};
  const toggleLock=()=>updateWithHistory({...team,locked:!team.locked,log:addLogEntry(team,team.locked?"Board unlocked":"Board locked")});

  const am=team.members.find(m=>m.id===aId);const ai=am?team.members.indexOf(am):-1;const ac=ai>=0?MC[ai%MC.length]:null;
  const allM=Array.from({length:12},(_,i)=>({year:yr,month:i}));

  const views=[{k:"cal",i:"grid",l:t.cal},{k:"heatmap",i:"grid",l:t.heatmap},{k:"timeline",i:"bar",l:t.timeline},{k:"coverage",i:"bar",l:t.coverage},{k:"summary",i:"flag",l:t.summary},{k:"log",i:"edit",l:"Log"}];

  return <div style={{minHeight:"100vh",background:th.bg,fontFamily:F,display:"flex",flexDirection:"column"}}>
    <header style={{background:th.gbg,borderBottom:`1px solid ${th.gbd}`,padding:"0 12px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={onGoHome} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><Ic n="home" s={18} c={th.t2}/></button>
        {mob&&<button onClick={()=>setSb(!sb)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><Ic n="users" s={18} c={th.t2}/></button>}
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <h1 style={{margin:0,fontSize:15,fontWeight:700,color:th.tx,letterSpacing:-.3}}>{team.name}</h1>
            {locked&&<Ic n="lock" s={13} c={th.wm}/>}
          </div>
          <div style={{fontSize:10,color:th.t3}}>{yr} · {team.members.length} {team.members.length!==1?t.mbs:t.mb}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:3}}>
        <ThPk theme={theme} set={setTheme} th={th}/>
        <div style={{display:"flex",alignItems:"center",gap:3,padding:"3px 7px",background:th.al,borderRadius:16,cursor:"pointer",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"}} onClick={()=>{try{navigator.clipboard.writeText(team.id)}catch(e){};flash(t.cp);}}><Ic n="copy" s={10} c={th.ac}/><span style={{fontSize:9,fontWeight:700,color:th.ac,fontFamily:FM}}>{team.id.slice(0,8)}</span></div>
        <button onClick={()=>setSettings(!settings)} style={{background:"none",border:"none",cursor:"pointer",padding:3,display:"flex"}}><Ic n="globe" s={15} c={th.t2}/></button>
        <Btn th={th} v="secondary" sz="sm" icon="share" onClick={()=>setShowSh(true)}>{mob?"":t.sh}</Btn>
      </div>
    </header>

    {settings&&<div style={{background:th.gbg,borderBottom:`1px solid ${th.gbd}`,padding:"8px 14px",display:"flex",gap:10,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,flexWrap:"wrap",justifyContent:"center",alignItems:"center"}}>
      <ThPk theme={theme} set={setTheme} th={th}/>
      <div style={{width:1,height:20,background:th.bd}}/>
      <LangPk lang={lang} set={setLang} th={th}/>
      <div style={{width:1,height:20,background:th.bd}}/>
      <Btn th={th} v="ghost" sz="sm" onClick={undo} disabled={!historyRef.current.length} style={{fontSize:11}}>↩ Undo</Btn>
      <Btn th={th} v="ghost" sz="sm" onClick={redo} disabled={!redoRef.current.length} style={{fontSize:11}}>↪ Redo</Btn>
      <div style={{width:1,height:20,background:th.bd}}/>
      {isAdmin&&<Btn th={th} v="ghost" sz="sm" icon={locked?"unlock":"lock"} onClick={toggleLock}>{locked?t.unlock:t.lock}</Btn>}
      <Btn th={th} v="ghost" sz="sm" icon="download" onClick={()=>generatePDFReport(team,t)}>{t.pdf}</Btn>
      <Btn th={th} v="ghost" sz="sm" icon="download" onClick={()=>downloadTeamICS(team)}>Team .ics</Btn>
      <Btn th={th} v="ghost" sz="sm" icon="download" onClick={()=>exportCSV(team)}>CSV</Btn>
      <Btn th={th} v="ghost" sz="sm" icon="download" onClick={()=>exportXLSX(team)}>Excel</Btn>
      <Btn th={th} v="ghost" sz="sm" onClick={()=>setShowCSVImport(true)}>Import</Btn>
    </div>}

    {/* View tabs */}
    <div style={{background:th.gbg,borderBottom:`1px solid ${th.gbd}`,padding:"6px 14px",display:"flex",gap:3,overflowX:"auto",backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      {views.map(v=> <button key={v.k} onClick={()=>setView(v.k)} style={{padding:"5px 10px",borderRadius:6,fontSize:11,fontWeight:600,fontFamily:F,cursor:"pointer",border:v.k===view?`1.5px solid ${th.ac}`:`1px solid transparent`,background:v.k===view?th.al:"transparent",color:v.k===view?th.ac:th.t3,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}><Ic n={v.i} s={12} c={v.k===view?th.ac:th.t3}/>{v.l}</button>)}
    </div>

    <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      {sb&&<aside style={{width:mob?"100%":240,minWidth:mob?"100%":240,background:th.gbg,borderRight:mob?"none":`1px solid ${th.gbd}`,display:"flex",flexDirection:"column",position:mob?"fixed":"relative",backdropFilter:G.blur,WebkitBackdropFilter:G.blur,top:mob?56:0,left:0,bottom:0,zIndex:mob?90:1,boxShadow:mob?"4px 0 24px rgba(0,0,0,.1)":"none"}}>
        <div style={{padding:"12px 12px 4px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,fontWeight:700,color:th.t3,textTransform:"uppercase",letterSpacing:1}}>{t.tm}</span><span style={{fontSize:10,color:th.t3,fontFamily:FM}}>{team.members.length}/25</span></div>
        {/* Add Member button — TOP of sidebar */}
        <div style={{padding:"4px 8px 6px"}}>
          {!locked&&!adding&&<Btn th={th} sz="sm" icon="plus" onClick={startAdd} disabled={team.members.length>=25} style={{width:"100%",justifyContent:"center"}}>{t.am}</Btn>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"2px 8px 8px",display:"flex",flexDirection:"column",gap:1}}>
          {adding&&<div style={{padding:"6px 2px",display:"flex",flexDirection:"column",gap:5,marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:th.al,borderRadius:8,border:`1.5px solid ${th.ac}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:MC[team.members.length%MC.length].d,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{nn.trim()?nn.trim()[0].toUpperCase():"?"}</div>
              <input autoFocus value={nn} onChange={e=>setNn(e.target.value)} placeholder={t.en2} onKeyDown={e=>{if(e.key==="Enter"&&nn.trim()&&nc)confirmAdd();if(e.key==="Escape"){setAdding(false);}}} maxLength={30} style={{flex:1,border:"none",background:"transparent",fontSize:13,fontWeight:600,fontFamily:F,color:th.tx,outline:"none",padding:"2px 0"}}/>
            </div>
            <CountrySelect value={nc} onChange={setNc} th={th} t={t}/>
            <div style={{display:"flex",gap:4}}><Btn th={th} sz="sm" onClick={confirmAdd} disabled={!nn.trim()||!nc} icon="check" style={{flex:1,justifyContent:"center"}}>{t.add}</Btn><Btn th={th} v="ghost" sz="sm" onClick={()=>setAdding(false)}>{t.can}</Btn></div>
          </div>}
          {team.members.map((m,i)=> <MRow key={m.id} member={m} index={i} th={th} t={t} locked={locked} isActive={m.id===aId} isEditing={m.id===eId} onClick={()=>{setAId(m.id===aId?null:m.id);if(mob)setSb(false);}} onDelete={()=>del(m.id)} onStartRename={()=>setEId(m.id)} onFinishRename={n=>ren(m.id,n)} onCountryChange={cc=>setCo(m.id,cc)} onExportICS={()=>downloadICS(m,team.name)} onOptimize={()=>setShowOptimizer(m.id)}/>)}
          {team.members.length===0&&!adding&&<div style={{textAlign:"center",padding:"20px 12px",color:th.t3,fontSize:13}}><div style={{fontSize:28,marginBottom:6}}>🏖️</div>{t.es2}</div>}
        </div>
        <div style={{padding:"8px 12px",borderTop:`1px solid ${th.bl}`,display:"flex",flexDirection:"column",gap:3}}>
          <Btn th={th} v="ghost" sz="sm" onClick={()=>{setHolBr(true);if(mob)setSb(false);}} style={{width:"100%",justifyContent:"center",fontSize:11}}><Ic n="flag" s={11}/> {t.ch}</Btn>
        </div>
      </aside>}

      <main style={{flex:1,overflow:"auto",padding:mob?"14px 10px":"20px 28px"}}>
        {/* Conflict alerts */}
        {view==="cal"&&<ConflictAlerts team={team} threshold={threshold} th={th} t={t}/>}

        {/* Legend at top */}
        {team.members.length>0&&view==="cal"&&<div style={{marginBottom:10,padding:"8px 12px",background:th.gbg,borderRadius:G.rXs,border:`1px solid ${th.gbd}`,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {team.members.map((m,i)=>{const c=MC[i%MC.length];const co=m.country?EU_C.find(x=>x.c===m.country):null;
              return <div key={m.id} onClick={()=>setAId(m.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 7px",background:aId===m.id?c.b:th.sh,borderRadius:14,fontSize:10,fontWeight:500,color:c.t,cursor:"pointer",border:aId===m.id?`1.5px solid ${c.d}40`:"1.5px solid transparent"}}><div style={{width:6,height:6,borderRadius:"50%",background:c.d}}/>{co?co.f+" ":""}{m.name} ({(m.days||[]).length})</div>;})}
            <div style={{display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:14,fontSize:10,color:th.ht,background:th.hc}}><div style={{width:6,height:6,borderRadius:3,background:th.ht}}/> {t.holiday}</div>
          </div>
        </div>}

        {view==="cal"&&am&&<div style={{background:ac.b,borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:8,border:`1px solid ${ac.d}30`,flexWrap:"wrap",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:ac.d,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:700}}>{am.name[0].toUpperCase()}</div>
            <span style={{fontSize:12,fontWeight:600,color:ac.t}}>{t.ed}: {am.name}</span>
            <span style={{fontSize:11,color:ac.t,opacity:.7}}>{t.tap}</span>
          </div>
          <button onClick={()=>{setAId(null);flash(am.name+": "+(am.days||[]).length+" "+(((am.days||[]).length===1)?t.dy:t.dys));}} style={{padding:"6px 16px",borderRadius:20,border:"none",background:ac.d,color:"#fff",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px "+ac.d+"40",whiteSpace:"nowrap"}}><Ic n="check" s={14} c="#fff"/>Done · {(am.days||[]).length} {((am.days||[]).length===1)?t.dy:t.dys}</button>
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

        {view==="cal"&&!am&&team.members.length>0&&!locked&&<div style={{background:th.al,borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:12,color:th.ac,fontWeight:500}}>{t.sel}</div>}
        {view==="cal"&&locked&&<div style={{background:th.wl,borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:12,color:"#92400E",fontWeight:500,display:"flex",alignItems:"center",gap:6}}><Ic n="lock" s={14} c="#92400E"/>{t.locked}</div>}

        {/* Export Pill Bar */}
        {view==="cal"&&team.members.length>0&&<div style={{padding:"8px 14px",background:th.sf,borderRadius:G.rXs,border:"1px solid "+th.bd,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",marginBottom:12}}>
          <span style={{fontSize:10,fontWeight:700,color:th.t3,marginRight:2}}>EXPORT:</span>
          <button onClick={function(){generatePDFReport(team,t)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>{t.pdf}</button>
          <button onClick={function(){downloadTeamICS(team)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>Team .ics</button>
          <button onClick={function(){exportXLSX(team)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>Excel</button>
          <button onClick={function(){exportCSV(team)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>CSV</button>
          <button onClick={function(){var tsv=generateTSV(team);var blob=new Blob([tsv],{type:"text/tab-separated-values"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download=team.name.replace(/\s/g,"_")+"_vacations.tsv";a.click();URL.revokeObjectURL(url);}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>TSV</button>
          <button onClick={function(){setShowSh(true)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="share" s={10} c={th.ac}/>Share / QR</button>
          <button onClick={function(){window.print()}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>{t.printBtn}</button>
          <button onClick={function(){setShowCSVImport(true)}} style={{padding:"4px 10px",borderRadius:20,border:"1px solid "+th.bd,background:th.sf,cursor:"pointer",fontFamily:F,fontSize:10,fontWeight:600,color:th.ac,display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}><Ic n="download" s={10} c={th.ac}/>Import</button>
        </div>}

        {view==="cal"&&team.members.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40,marginBottom:12}}>🌴</div><h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:700,color:th.tx}}>{t.et}</h2><p style={{margin:"0 0 20px",fontSize:14,color:th.t2,lineHeight:1.5}}>{t.es2}</p><Btn th={th} icon="plus" onClick={()=>{setSb(true);setTimeout(startAdd,150);}}>{t.af}</Btn></div>}

        {view==="cal"&&<Fragment>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{fontSize:18,fontWeight:700,color:th.tx,letterSpacing:-.5}}>{yr}</span>
            <div style={{display:"flex",gap:2}}>
              {[{l:"Year",v:null},{l:"Q1",v:0},{l:"Q2",v:1},{l:"Q3",v:2},{l:"Q4",v:3}].map(q=>
                <button key={q.l} onClick={()=>setQuarter(q.v)} style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:600,fontFamily:F,cursor:"pointer",border:quarter===q.v?`1.5px solid ${th.ac}`:`1px solid ${th.gbd}`,background:quarter===q.v?th.al:th.gbg,color:quarter===q.v?th.ac:th.t3,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>{q.l}</button>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":quarter!==null?"repeat(3,1fr)":"repeat(3,1fr)",gap:mob?10:14}}>
            {allM.filter(({month})=>quarter===null||Math.floor(month/3)===quarter).map(({year,month})=> <Cal key={month} year={year} month={month} members={team.members} activeId={locked?null:aId} onToggle={tog} compact={mob&&quarter===null} th={th} t={t} holSet={holSet}/>)}
          </div>
        </Fragment>}

        {view==="heatmap"&&<HeatmapView team={team} th={th} t={t} holSet={holSet}/>}
        {view==="timeline"&&<TimelineView team={team} th={th} t={t}/>}
        {view==="coverage"&&<CoverageView team={team} th={th} t={t}/>}
        {view==="log"&&<ChangeLogView team={team} th={th} t={t}/>}
        {view==="summary"&&<Fragment>
          <h3 style={{margin:"0 0 14px",fontSize:16,fontWeight:700,color:th.tx}}>{t.tv} — {yr}</h3>
          {(()=>{const countries=new Set();team.members.forEach(m=>{if(m.country)countries.add(m.country);});
            if(!countries.size) return <div style={{color:th.t3,fontSize:13,textAlign:"center",padding:30}}>No countries assigned.</div>;
            const allH={};[...countries].forEach(cc=>computeHolidays(cc,yr).forEach(h=>{if(!allH[h])allH[h]=[];allH[h].push(cc);}));
            const dates=Object.keys(allH).sort();
            return <div style={{display:"flex",flexDirection:"column",gap:6}}>{dates.map(d=>{const p=pk(d);const dow=new Date(p.y,p.m,p.d).toLocaleDateString("en",{weekday:"short"});const affected=team.members.filter(m=>(allH[d]||[]).includes(m.country));
              return <div key={d} style={{background:th.sf,borderRadius:6,border:`1px solid ${th.bd}`,padding:"8px 12px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{minWidth:36,textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:th.ht,fontFamily:F}}>{p.d}</div><div style={{fontSize:9,color:th.t3,fontWeight:600}}>{t.M[p.m].slice(0,3)}</div></div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:th.tx}}>{holName(d)}</div><div style={{fontSize:10,color:th.t3}}>{dow} — {affected.map(m=>m.name).join(", ")}</div></div>
              </div>;})}</div>;
          })()}
        </Fragment>}
      </main>
    </div>

    {mob&&sb&&<div onClick={()=>setSb(false)} style={{position:"fixed",inset:0,top:56,background:"rgba(0,0,0,.3)",zIndex:80}}/>}
    {showSh&&<ShareModal teamId={team.id} teamName={team.name} onClose={()=>setShowSh(false)} th={th} t={t}/>}
    {holBr&&<HolBrowser onClose={()=>setHolBr(false)} th={th} t={t} year={yr}/>}

    {/* Smart Optimizer Modal */}
    {showOptimizer&&(()=>{const mem=team.members.find(m=>m.id===showOptimizer);if(!mem)return null;const suggestions=findBridgeDays(mem.country,yr);
      return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={()=>setShowOptimizer(null)}>
        <div onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,maxWidth:480,width:"100%",maxHeight:"70vh",display:"flex",flexDirection:"column",boxShadow:th.sl,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${th.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{margin:0,fontSize:16,fontWeight:700,color:th.tx,fontFamily:F}}>{t.bestDays} {mem.name}</h3>
            <button onClick={()=>setShowOptimizer(null)} style={{background:th.sh,border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Ic n="x" s={14} c={th.t2}/></button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
            {suggestions.length===0?<div style={{textAlign:"center",padding:30,color:th.t3,fontSize:13}}>No bridge day opportunities found for {yr}.</div>:
            suggestions.map((s,i)=> <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:i%2===0?th.bg:"transparent",borderRadius:8,marginBottom:4}}>
              <div style={{width:36,height:36,borderRadius:10,background:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:14,fontWeight:800,color:"#065F46"}}>{s.gain}d</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:th.tx}}>{s.label}</div>
                <div style={{fontSize:11,color:th.t3}}>Take {s.off} day{s.off>1?"s":""} off → get {s.gain} consecutive days</div>
              </div>
              <Btn th={th} v="ghost" sz="sm" onClick={()=>{const newDays=[...(mem.days||[]),...s.take.filter(d=>!(mem.days||[]).includes(d))];updateWithHistory({...team,members:team.members.map(m=>m.id===mem.id?{...m,days:newDays}:m)});flash(`Added ${s.off} day${s.off>1?"s":""}`);}} style={{fontSize:11}}>+ Add</Btn>
            </div>)}
          </div>
        </div>
      </div>;
    })()}

    {/* CSV Import Modal */}
    {showCSVImport&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={()=>setShowCSVImport(false)}>
      <div onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,maxWidth:500,width:"100%",padding:24,boxShadow:th.sl,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:th.tx}}>Import CSV</h3>
          <button onClick={()=>setShowCSVImport(false)} style={{background:th.sh,border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Ic n="x" s={14} c={th.t2}/></button>
        </div>
        <p style={{margin:"0 0 10px",fontSize:12,color:th.t2}}>Format: Name, Country, Start Date (YYYY-MM-DD), End Date</p>
        <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} placeholder={'Name,Country,Start,End\n"John Doe","Romania","2026-07-01","2026-07-15"'} rows={8} style={{width:"100%",padding:10,border:`1.5px solid ${th.bd}`,borderRadius:8,fontSize:12,fontFamily:FM,resize:"vertical",outline:"none",background:th.bg,color:th.tx,boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <label style={{flex:1}}>
            <input type="file" accept=".csv,.txt" style={{display:"none"}} onChange={e=>{const f=(e.target.files&&e.target.files[0]);if(f){const r=new FileReader();r.onload=()=>setCsvText(r.result);r.readAsText(f);}}}/>
            <div style={{padding:"8px 14px",background:th.sh,borderRadius:8,textAlign:"center",cursor:"pointer",fontSize:12,fontWeight:600,color:th.t2,border:`1px solid ${th.bd}`}}>Choose File</div>
          </label>
          <Btn th={th} disabled={!csvText.trim()} onClick={()=>{const imported=parseCSVImport(csvText);if(imported.length){updateWithHistory({...team,members:[...team.members,...imported]});setShowCSVImport(false);setCsvText("");flash(`Imported ${imported.length} member${imported.length>1?"s":""}`);}else{flash("No valid data found");}}}>Import {csvText.trim()?`(${parseCSVImport(csvText).length} found)`:""}</Btn>
        </div>
      </div>
    </div>}

    <Toast message={toast} visible={!!toast}/>
  </div>;
}

// ─── Error Boundary (functional wrapper) ─────────────────────────
function ErrorBoundary({children}) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    const handler = (event) => { setHasError(true); event.preventDefault(); };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);
  if (hasError) {
    return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:F,padding:40,background:"#F2F1EE",textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:16}}>🌴</div>
      <h1 style={{fontSize:22,fontWeight:700,color:"#1A1A1A",margin:"0 0 8px"}}>Something went wrong</h1>
      <p style={{fontSize:14,color:"#6B6B6B",margin:"0 0 24px",lineHeight:1.6}}>The app encountered an unexpected error. Your team data is safe.</p>
      <button onClick={()=>{window.location.hash="";window.location.reload();}} style={{padding:"12px 28px",borderRadius:10,border:"none",background:"#2563EB",color:"#fff",fontSize:14,fontWeight:700,fontFamily:F,cursor:"pointer"}}>Go to Home Page</button>
    </div>;
  }
  return children;
}

// ─── Cookie / Privacy Notice ─────────────────────────────────────
function CookieNotice({th, t}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem("tvp-cookie-ok")) setShow(true); } catch(e) { setShow(true); }
  }, []);
  const accept = () => {
    setShow(false);
    try { localStorage.setItem("tvp-cookie-ok", "1"); } catch(e) {}
  };
  if (!show) return null;
  return <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9999,padding:"12px 20px",background:"linear-gradient(135deg,rgba(76,29,149,0.95),rgba(99,102,241,0.95))",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
    <span style={{fontSize:12,color:"#EDE9FE",fontFamily:F,lineHeight:1.5}}>{t.cookieMsg}</span>
    <button onClick={accept} style={{padding:"6px 18px",borderRadius:20,border:"1px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:12,fontWeight:600,fontFamily:F,cursor:"pointer",whiteSpace:"nowrap"}}>{t.gotIt}</button>
  </div>;
}

// ─── App ─────────────────────────────────────────────────────────
export default function App(){
  const[screen,setScreen]=useState("home");const[team,setTeam]=useState(null);const[myTeams,setMyTeams]=useState([]);const[lang,setLang]=useState("en");const[theme,setTheme]=useState("light");
  const th=TH[theme];const t=TX[lang];

  useEffect(()=>{(async()=>{
    const sl=await db.ld("drift-lang");const st=await db.ld("drift-theme");
    if(sl){setLang(sl);}else{
      // Auto-detect language from timezone on first visit
      const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";
      const tzLang={
        "Europe/Stockholm":"sv","Europe/Gothenburg":"sv",
        "Europe/Rome":"it","Europe/Vatican":"it",
        "Europe/Sofia":"bg",
        "Europe/Paris":"fr","Europe/Brussels":"fr","America/Guadeloupe":"fr",
        "Europe/Berlin":"de","Europe/Vienna":"de","Europe/Zurich":"de",
        "Europe/Madrid":"es","Europe/Canary":"es","America/Santiago":"es",
        "Europe/Lisbon":"pt","America/Sao_Paulo":"pt","Atlantic/Madeira":"pt",
        "Europe/Bucharest":"ro",
        "Europe/Budapest":"hu",
      };
      const detected=tzLang[tz];
      if(detected&&TX[detected]){setLang(detected);db.sv("drift-lang",detected);}
    }
    // Dark mode auto-detection: respect OS preference on first visit
    if(st){setTheme(st);}else{
      const prefersDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme:dark)").matches;
      if(prefersDark){setTheme("dark");db.sv("drift-theme","dark");}
    }

    // 24-month TTL cleanup
    const sv=await db.ld("my-teams");
    const teams=sv||[];
    const now=Date.now();const TTL=24*30*24*60*60*1000; // ~24 months in ms
    const valid=[];const expired=[];
    for(var _ti=0;_ti<teams.length;_ti++){var tm=teams[_ti];
      // Check if team data still exists and isn't expired
      const td=await db.ld(`team:${tm.id}`,true);
      if(td&&td.createdAt){
        const age=now-new Date(td.createdAt).getTime();
        if(age<TTL){valid.push(tm);}else{expired.push(tm.id);}
      } else if(td){valid.push(tm);} // No createdAt = legacy, keep
      // If td is null, team was deleted, skip it
    }
    // Clean up expired teams from shared storage
    for(var _ei=0;_ei<expired.length;_ei++){var id=expired[_ei];try{if(window.storage)await window.storage.delete(`team:${id}`,true);}catch(e){}}
    if(expired.length>0||valid.length!==teams.length){await db.sv("my-teams",valid);}
    setMyTeams(valid);

    // Link-only access: check URL hash
    const hash=window.location.hash;const match=hash.match(/team=([a-z0-9]+)/i);
    if(match){const ld=await db.ld(`team:${match[1]}`,true);if(ld){
      // Check TTL
      if(ld.createdAt){const age=now-new Date(ld.createdAt).getTime();if(age>=TTL){setScreen("home");return;}}
      setTeam(ld);setScreen("ws");
      // Silently track in my-teams for cleanup purposes (not displayed)
      if(!valid.find(x=>x.id===match[1])){const u=[...valid,{id:match[1],name:ld.name,year:ld.year,mc:ld.members.length}];setMyTeams(u);db.sv("my-teams",u);}
    }}
  })();},[]);

  const cL=l=>{setLang(l);db.sv("drift-lang",l);};const cT=t=>{setTheme(t);db.sv("drift-theme",t);};

  const create=(name,year)=>{const nt={id:gid(),name,year,members:[],createdAt:new Date().toISOString(),locked:false};setTeam(nt);setScreen("ws");window.location.hash=`team=${nt.id}`;const u=[...myTeams,{id:nt.id,name,year,mc:0}];setMyTeams(u);db.sv(`team:${nt.id}`,nt,true);db.sv("my-teams",u);};

  const join=async(code,onErr)=>{let id=code;const m=code.match(/team=([a-z0-9]+)/i);if(m)id=m[1];id=id.replace(/[^a-z0-9]/gi,"");const ld=await db.ld(`team:${id}`,true);if(ld){setTeam(ld);setScreen("ws");window.location.hash=`team=${id}`;if(!myTeams.find(x=>x.id===id)){const u=[...myTeams,{id,name:ld.name,year:ld.year,mc:ld.members.length}];setMyTeams(u);db.sv("my-teams",u);}}else onErr(t.nf);};

  const open=async id=>{const ld=await db.ld(`team:${id}`,true);if(ld){setTeam(ld);setScreen("ws");window.location.hash=`team=${id}`;}else{const u=myTeams.filter(x=>x.id!==id);setMyTeams(u);db.sv("my-teams",u);}};

  const update=u=>{setTeam(u);db.sv(`team:${u.id}`,u,true);const ut=myTeams.map(x=>x.id===u.id?{...x,name:u.name,year:u.year,mc:u.members.length}:x);setMyTeams(ut);db.sv("my-teams",ut);};

  const goHome=()=>{setTeam(null);setScreen("home");window.location.hash="";};

  if(screen==="ws"&&team) {
    // Check for special view modes via hash params
    const hash = window.location.hash;
    const viewMatch = hash.match(/view=(badge|json|print|tsv)/i);
    if (viewMatch) {
      const vw = viewMatch[1].toLowerCase();
      if (vw === "badge") return <ErrorBoundary><div style={{minHeight:"100vh",background:th.bg}}><BadgeView team={team} th={th} t={t}/></div></ErrorBoundary>;
      if (vw === "print") return <ErrorBoundary><PrintView team={team} th={th} t={t}/></ErrorBoundary>;
      if (vw === "tsv") {
        const tsv = generateTSV(team);
        return <ErrorBoundary><div style={{minHeight:"100vh",background:th.bg,padding:20,fontFamily:FM}}>
          <div style={{marginBottom:12,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:th.tx,marginBottom:4}}>{t.sheetsTitle}</div>
            <div style={{fontSize:11,color:th.t3}}>{t.sheetsSub}</div>
          </div>
          <pre style={{background:th.gbg,border:`1px solid ${th.gbd}`,borderRadius:G.rSm,padding:20,fontSize:12,color:th.tx,overflow:"auto",maxHeight:"80vh",whiteSpace:"pre-wrap",backdropFilter:G.blur}}>{tsv}</pre>
        </div></ErrorBoundary>;
      }
      if (vw === "json") {
        const jsonData = JSON.stringify({
          name: team.name, year: team.year, members: team.members.map(m => ({
            name: m.name, country: m.country,
            days: (m.days || []).sort(),
            daysCount: (m.days || []).length,
          })),
          generatedAt: new Date().toISOString(),
        }, null, 2);
        return <ErrorBoundary><div style={{minHeight:"100vh",background:th.bg,padding:20,fontFamily:FM}}>
          <pre style={{background:th.sf,border:`1px solid ${th.bd}`,borderRadius:12,padding:20,fontSize:12,color:th.tx,overflow:"auto",maxHeight:"90vh",whiteSpace:"pre-wrap"}}>{jsonData}</pre>
        </div></ErrorBoundary>;
      }
    }
    return <ErrorBoundary><WS team={team} onUpdate={update} onGoHome={goHome} th={th} t={t} lang={lang} setLang={cL} theme={theme} setTheme={cT}/><CookieNotice th={th} t={t}/></ErrorBoundary>;
  }
  return <ErrorBoundary><Landing onCreateTeam={create} onJoinTeam={join} myTeams={myTeams} onOpenTeam={open} th={th} t={t} lang={lang} setLang={cL} theme={theme} setTheme={cT}/><CookieNotice th={th} t={t}/></ErrorBoundary>;
}
