import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import BottomDuo from "@/components/WorkoseniePromo";
import CoffeeButton from "@/components/CoffeeButton";
import nextDynamic from "next/dynamic";
import { withTransition } from "@/lib/motion";
import "./frontpage.css";
import { mergeTeam } from "@/lib/merge";
import { X, setTextLang, dateLocale } from "@/lib/extraText";
// Loaded only when first opened (keeps the first page load small)
// The team screen lives in app/workspace.tsx and loads on demand: team links start loading it at once,
// the front page fetches it when the browser is idle, so opening a team stays instant.
const loadWS=()=>import("./workspace");
const WS=nextDynamic(loadWS,{ssr:false,loading:()=><div style={{minHeight:"100vh"}} aria-busy="true"/>});
if(typeof window!=="undefined"){try{if(/team=/.test(window.location.hash))loadWS();else{const ric=(window as Window&{requestIdleCallback?:(cb:()=>void)=>number}).requestIdleCallback;if(ric)ric(()=>{loadWS();});else setTimeout(()=>{loadWS();},1500);}}catch(e){}}
// Report and export builders load on the first click (app/reports.ts)
export const R=fn=>(...a)=>import("./reports").then(m=>m[fn](...a)).catch(e=>{console.error(e);try{window.dispatchEvent(new CustomEvent("tvp-save-error",{detail:"Could not start the export. Reload the page and try again."}));}catch(_){/* no window */}});
// ─── Algorithmic Holiday Engine (2026–2035) ──────────────────────
// Western Easter: Anonymous Gregorian algorithm
function westernEaster(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;return{m:month,d:day};}
// Orthodox Easter: Julian calendar mapped to Gregorian
function orthodoxEaster(y){const a=y%4,b=y%7,c=y%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7,month=Math.floor((d+e+114)/31),day=((d+e+114)%31)+1;const jd=day,jm=month;let gd=jd+13,gm=jm;if(gd>30&&gm===4){gd-=30;gm=5;}else if(gd>31&&gm===3){gd-=31;gm=4;}return{m:gm,d:gd};}

function addDays(y,m,d,n){const dt=new Date(y,m-1,d+n);return{m:dt.getMonth()+1,d:dt.getDate()};}

// Fixed holidays per country (MM-DD format, year-independent)
export const FIXED={
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

// Public holidays for countries on the Islamic calendar, 2026–2035, from python-holidays 0.107 (MIT) via the
// NonWorkingDays dataset. Added on top of the rules above (never removes a date). Built by scripts/build-holiday-names.mjs data.
export const LUNAR_EXTRA={"SA":{"2026":"0222,0319,0320,0321,0322,0323,0324,0526,0527,0528,0529,0531,0923","2027":"0222,0309,0310,0311,0312,0314,0515,0516,0517,0518,0519,0923","2028":"0222,0226,0227,0228,0229,0301,0504,0505,0506,0507,0508,0509,0923,0924","2029":"0214,0215,0216,0217,0218,0219,0222,0423,0424,0425,0426,0923","2030":"0203,0204,0205,0206,0221,0222,0412,0413,0414,0415,0416,0417,0923","2031":"0124,0125,0126,0127,0128,0129,0222,0223,0401,0402,0403,0404,0406,0923","2032":"0113,0114,0115,0116,0118,0222,0321,0322,0323,0324,0923","2033":"0102,0103,0104,0105,0222,0310,0311,0312,0313,0314,0315,0922,0923,1222,1223,1224,1225,1226,1227","2034":"0222,0228,0301,0302,0303,0305,0923,0924,1211,1212,1213,1214","2035":"0217,0218,0219,0220,0221,0222,0923,1130,1201,1202,1203,1204,1205"},"AE":{"2026":"0101,0320,0321,0322,0526,0527,0528,0529,0616,0825,1202,1203","2027":"0101,0309,0310,0311,0515,0516,0517,0518,0606,0814,1202,1203","2028":"0101,0226,0227,0228,0504,0505,0506,0507,0525,0803,1202,1203","2029":"0101,0214,0215,0216,0423,0424,0425,0426,0514,0724,1202,1203","2030":"0101,0204,0205,0206,0412,0413,0414,0415,0503,0713,1202,1203","2031":"0101,0124,0125,0126,0401,0402,0403,0404,0423,0702,1202,1203","2032":"0101,0114,0115,0116,0321,0322,0323,0324,0411,0620,1202,1203","2033":"0101,0102,0103,0104,0310,0311,0312,0313,0401,0609,1202,1203,1223,1224,1225","2034":"0101,0228,0301,0302,0303,0321,0530,1202,1203,1212,1213,1214","2035":"0101,0217,0218,0219,0220,0311,0520,1201,1202,1203"},"MA":{"2026":"0101,0111,0114,0320,0321,0501,0527,0528,0616,0730,0814,0820,0821,0825,0826,1031,1106,1118","2027":"0101,0111,0114,0309,0310,0501,0516,0517,0606,0730,0814,0815,0820,0821,1031,1106,1118","2028":"0101,0111,0114,0226,0227,0501,0505,0506,0525,0730,0803,0804,0814,0820,0821,1031,1106,1118","2029":"0101,0111,0114,0214,0215,0424,0425,0501,0514,0724,0725,0730,0814,0820,0821,1031,1106,1118","2030":"0101,0111,0114,0204,0205,0413,0414,0501,0503,0713,0714,0730,0814,0820,0821,1031,1106,1118","2031":"0101,0111,0114,0124,0125,0402,0403,0423,0501,0702,0703,0730,0814,0820,0821,1031,1106,1118","2032":"0101,0111,0114,0115,0322,0323,0411,0501,0620,0621,0730,0814,0820,0821,1031,1106,1118","2033":"0101,0102,0103,0111,0114,0311,0312,0401,0501,0609,0610,0730,0814,0820,0821,1031,1106,1118,1223,1224","2034":"0101,0111,0114,0301,0302,0321,0501,0530,0531,0730,0814,0820,0821,1031,1106,1118,1212,1213","2035":"0101,0111,0114,0218,0219,0311,0501,0520,0521,0730,0814,0820,0821,1031,1106,1118,1201,1202"},"BH":{"2026":"0101,0320,0321,0322,0501,0527,0528,0529,0616,0624,0625,0825,1216,1217","2027":"0101,0309,0310,0311,0501,0516,0517,0518,0606,0614,0615,0814,1216,1217","2028":"0101,0226,0227,0228,0501,0505,0506,0507,0525,0602,0603,0803,1216,1217","2029":"0101,0214,0215,0216,0424,0425,0426,0501,0514,0522,0523,0724,1216,1217","2030":"0101,0204,0205,0206,0413,0414,0415,0501,0503,0511,0512,0713,1216,1217","2031":"0101,0124,0125,0126,0402,0403,0404,0423,0501,0502,0702,1216,1217","2032":"0101,0114,0115,0116,0322,0323,0324,0411,0419,0420,0501,0620,1216,1217","2033":"0101,0102,0103,0104,0311,0312,0313,0401,0409,0410,0501,0609,1216,1217,1223,1224,1225","2034":"0101,0301,0302,0303,0321,0329,0330,0501,0530,1212,1213,1214,1216,1217","2035":"0101,0218,0219,0220,0311,0319,0320,0501,0520,1201,1202,1203,1216,1217"},"TR":{"2026":"0101,0320,0321,0322,0423,0501,0519,0527,0528,0529,0530,0715,0830,1029","2027":"0101,0309,0310,0311,0423,0501,0516,0517,0518,0519,0715,0830,1029","2028":"0101,0226,0227,0228,0423,0501,0505,0506,0507,0508,0519,0715,0830,1029","2029":"0101,0214,0215,0216,0423,0424,0425,0426,0427,0501,0519,0715,0830,1029","2030":"0101,0204,0205,0206,0413,0414,0415,0416,0423,0501,0519,0715,0830,1029","2031":"0101,0124,0125,0126,0402,0403,0404,0405,0423,0501,0519,0715,0830,1029","2032":"0101,0114,0115,0116,0322,0323,0324,0325,0423,0501,0519,0715,0830,1029","2033":"0101,0102,0103,0104,0311,0312,0313,0314,0423,0501,0519,0715,0830,1029,1223,1224,1225","2034":"0101,0301,0302,0303,0304,0423,0501,0519,0715,0830,1029,1212,1213,1214","2035":"0101,0218,0219,0220,0221,0423,0501,0519,0715,0830,1029,1201,1202,1203"}};
export function computeHolidays(cc, year) {
  const fixed = (FIXED[cc] || []).map(d => `${year}-${d}`);
  const rules = EASTER_RULES[cc];
  if (!rules) { const lx0=LUNAR_EXTRA[cc]&&LUNAR_EXTRA[cc][year]; if(!lx0) return fixed; return [...new Set(fixed.concat(lx0.split(",").map(function(md){return year+"-"+md.slice(0,2)+"-"+md.slice(2);})))].sort(); }

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

  
  if(cc==="SA"){all.push(dFmt(year,2,22));all.push(dFmt(year,9,23));}
  const lx=LUNAR_EXTRA[cc]&&LUNAR_EXTRA[cc][year];
  if(lx)lx.split(",").forEach(function(md){all.push(year+"-"+md.slice(0,2)+"-"+md.slice(2));});

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
export function holName(dateStr) {
  const mmdd = dateStr.slice(5);
  return HNAMES[mmdd] || "Public Holiday";
}
const HNAMES={"01-01":"New Year's Day","01-02":"Day after New Year","01-06":"Epiphany","01-07":"Orthodox Christmas","01-08":"Day after Orthodox Christmas","01-11":"Independence Manifesto","01-19":"MLK Day","01-24":"Unification Day","01-26":"Australia Day","01-27":"St Devota","02-02":"St Brigid's Day","02-05":"St Agatha","02-08":"Prešeren Day","02-10":"St Paul's Shipwreck","02-15":"Statehood Day","02-16":"Statehood Day","02-17":"Independence Day","02-22":"Founding Day","02-24":"Independence Day","03-01":"Independence Day","03-03":"Liberation Day","03-08":"Women's Day","03-11":"Independence Day","03-14":"Summer/Constitution Day","03-15":"National Day","03-17":"St Patrick's Day","03-19":"St Joseph's Day","03-21":"Nauryz / Nowruz","03-22":"Nauryz Day 2","03-23":"Nauryz Day 3","03-25":"Annunciation/Revolution Day","03-31":"Freedom Day","04-01":"National Day","04-21":"Tiradentes Day","04-23":"Sovereignty Day","04-25":"Liberation Day","04-27":"King's Day / Resistance Day","05-01":"Labour Day","05-02":"Labour Day 2","05-03":"Constitution Day","05-04":"Independence Day","05-05":"Liberation Day","05-06":"St George's Day","05-07":"Defender's Day","05-08":"Victory Day","05-09":"Europe/Victory Day","05-17":"Constitution Day","05-19":"Youth Day","05-21":"Independence Day","05-24":"Education Day","05-25":"Education Day","05-30":"Statehood Day","06-01":"Children's Day","06-02":"Republic Day","06-05":"Constitution Day","06-07":"Sette Giugno","06-08":"Trubar Day","06-10":"National Day","06-12":"Peace Day","06-17":"Independence Day","06-19":"Juneteenth","06-22":"Anti-Fascist Day","06-23":"Midsummer / National Day","06-24":"Midsummer / St John's","06-25":"Statehood Day","06-28":"Constitution Day","06-29":"St Peter & Paul","07-01":"Canada Day","07-03":"Independence Day","07-04":"Independence Day","07-05":"Sts Cyril & Methodius","07-06":"Jan Hus Day","07-13":"Statehood Day","07-14":"Bastille Day","07-15":"Democracy Day","07-16":"Our Lady of Carmen","07-21":"National Day","07-28":"Statehood Day","07-30":"Throne Day","08-01":"National Day","08-02":"Ilinden","08-05":"Victory Day","08-14":"Oued Ed-Dahab Day","08-15":"Assumption Day","08-20":"Restoration Day","08-21":"Youth Day","08-24":"Independence Day","08-25":"Prophet's Birthday","08-27":"Independence Day","08-29":"National Uprising Day","08-30":"Victory Day","08-31":"Language Day","09-03":"Founding Day","09-07":"Unification Day","09-08":"Nativity of Mary / Victory Day","09-15":"Our Lady of Sorrows","09-18":"Independence Day","09-19":"Army Day","09-21":"Independence Day","09-22":"Independence Day","09-23":"National Day","09-28":"Statehood Day","09-30":"Truth & Reconciliation","10-01":"Independence Day","10-03":"Unity Day","10-05":"Republic Day","10-11":"Revolution Day","10-12":"National Day","10-14":"Defenders Day","10-23":"Revolution Day","10-26":"National Day","10-28":"Ohi Day","10-29":"Republic Day","10-31":"Reformation Day","11-01":"All Saints' Day","11-02":"All Souls' Day","11-06":"Green March","11-07":"Revolution Day","11-11":"Armistice/Independence Day","11-15":"Republic Day","11-17":"Freedom Day","11-18":"Remembrance/Independence Day","11-19":"National Day","11-25":"Statehood Day","11-26":"Thanksgiving","11-28":"Independence Day","11-29":"Liberation Day","11-30":"St Andrew's Day","12-01":"National Day","12-02":"National Day","12-03":"National Day","12-06":"Constitution Day","12-08":"Immaculate Conception","12-13":"Republic Day","12-16":"National Day","12-17":"National Day","12-24":"Christmas Eve","12-25":"Christmas Day","12-26":"St Stephen's/Boxing Day","12-31":"New Year's Eve"};

// ─── Regional/State Holidays ────────────────────────────────────
export const REGIONS={
ES:[
{id:"AN",n:"Andalusia",add:["02-28"]},
{id:"AR",n:"Aragon",add:["04-23"],maundy:true},
{id:"AS",n:"Asturias",add:["09-08"],maundy:true},
{id:"IB",n:"Balearic Islands",add:["03-01"],maundy:true,eMon:true},
{id:"CN",n:"Canary Islands",add:["05-30"],maundy:true},
{id:"CB",n:"Cantabria",add:["07-28"],maundy:true},
{id:"CL_ES",n:"Castilla y León",add:["04-23"],maundy:true},
{id:"CM",n:"Castilla-La Mancha",add:["05-31"],maundy:true},
{id:"CT",n:"Catalonia",add:["09-11","12-26"],eMon:true},
{id:"EX",n:"Extremadura",add:["09-08"],maundy:true},
{id:"GA",n:"Galicia",add:["05-17","07-25"],maundy:true},
{id:"MD",n:"Madrid",add:["05-02","07-25"],maundy:true},
{id:"MC",n:"Murcia",add:["03-19","06-09"],maundy:true},
{id:"NC",n:"Navarra",add:["12-03"],maundy:true,eMon:true},
{id:"PV",n:"Basque Country",add:["03-19","07-25"],eMon:true},
{id:"RI",n:"La Rioja",add:["06-09"],maundy:true,eMon:true},
{id:"VC",n:"Valencia",add:["03-19","06-24","10-09"],eMon:true}
],
DE:[
{id:"BW",n:"Baden-Württemberg",add:["01-06"],cc:true,allSaints:true},
{id:"BY",n:"Bavaria",add:["01-06"],cc:true,assumption:true,allSaints:true},
{id:"BE_DE",n:"Berlin",add:["03-08"]},
{id:"BB",n:"Brandenburg",add:["03-08","10-31"]},
{id:"HB",n:"Bremen",add:["10-31"]},
{id:"HH",n:"Hamburg",add:["10-31"]},
{id:"HE",n:"Hesse",cc:true},
{id:"MV",n:"Meckl.-Vorpommern",add:["10-31"]},
{id:"NI",n:"Lower Saxony",add:["10-31"]},
{id:"NW",n:"N. Rhine-Westphalia",cc:true,allSaints:true},
{id:"RP",n:"Rhineland-Palatinate",cc:true,allSaints:true},
{id:"SL",n:"Saarland",cc:true,assumption:true,allSaints:true},
{id:"SN",n:"Saxony",add:["10-31","11-19"]},
{id:"ST",n:"Saxony-Anhalt",add:["01-06","10-31"]},
{id:"SH",n:"Schleswig-Holstein",add:["10-31"]},
{id:"TH",n:"Thuringia",add:["09-20","10-31"]}
],
CH:[
{id:"ZH",n:"Zürich",add:["05-01"],eMon:true},
{id:"BE_CH",n:"Bern",add:["01-02"],gFri:true,eMon:true,ascen:true,whitMon:true},
{id:"LU_CH",n:"Lucerne",add:["01-06","03-19"],cc:true,assumption:true,allSaints:true},
{id:"GE",n:"Geneva",gFri:true,eMon:true,ascen:true,whitMon:true,add:["09-10"]},
{id:"TI",n:"Ticino",add:["01-06","03-19","06-29"],eMon:true,ascen:true,whitMon:true,cc:true,assumption:true,allSaints:true},
{id:"VD",n:"Vaud",add:["01-02"],gFri:true,eMon:true,ascen:true,whitMon:true}
],
AU:[
{id:"NSW",n:"New South Wales"},
{id:"VIC",n:"Victoria"},
{id:"QLD",n:"Queensland"},
{id:"WA_AU",n:"Western Australia"},
{id:"SA_AU",n:"South Australia"},
{id:"TAS",n:"Tasmania"}
],
CA:[
{id:"ON",n:"Ontario"},
{id:"QC",n:"Quebec",add:["06-24"]},
{id:"BC",n:"British Columbia"},
{id:"AB",n:"Alberta"}
]
};

// ─── Country Data ────────────────────────────────────────────────
export const EU_C=[{c:"AL",n:"Albania",f:"🇦🇱"},{c:"AD",n:"Andorra",f:"🇦🇩"},{c:"AT",n:"Austria",f:"🇦🇹"},{c:"BY",n:"Belarus",f:"🇧🇾"},{c:"BE",n:"Belgium",f:"🇧🇪"},{c:"BA",n:"Bosnia & Herz.",f:"🇧🇦"},{c:"BG",n:"Bulgaria",f:"🇧🇬"},{c:"HR",n:"Croatia",f:"🇭🇷"},{c:"CY",n:"Cyprus",f:"🇨🇾"},{c:"CZ",n:"Czechia",f:"🇨🇿"},{c:"DK",n:"Denmark",f:"🇩🇰"},{c:"EE",n:"Estonia",f:"🇪🇪"},{c:"FI",n:"Finland",f:"🇫🇮"},{c:"FR",n:"France",f:"🇫🇷"},{c:"DE",n:"Germany",f:"🇩🇪"},{c:"GR",n:"Greece",f:"🇬🇷"},{c:"HU",n:"Hungary",f:"🇭🇺"},{c:"IS",n:"Iceland",f:"🇮🇸"},{c:"IE",n:"Ireland",f:"🇮🇪"},{c:"IT",n:"Italy",f:"🇮🇹"},{c:"XK",n:"Kosovo",f:"🇽🇰"},{c:"LV",n:"Latvia",f:"🇱🇻"},{c:"LI",n:"Liechtenstein",f:"🇱🇮"},{c:"LT",n:"Lithuania",f:"🇱🇹"},{c:"LU",n:"Luxembourg",f:"🇱🇺"},{c:"MK",n:"N. Macedonia",f:"🇲🇰"},{c:"MT",n:"Malta",f:"🇲🇹"},{c:"MD",n:"Moldova",f:"🇲🇩"},{c:"MC",n:"Monaco",f:"🇲🇨"},{c:"ME",n:"Montenegro",f:"🇲🇪"},{c:"NL",n:"Netherlands",f:"🇳🇱"},{c:"NO",n:"Norway",f:"🇳🇴"},{c:"PL",n:"Poland",f:"🇵🇱"},{c:"PT",n:"Portugal",f:"🇵🇹"},{c:"RO",n:"Romania",f:"🇷🇴"},{c:"RS",n:"Serbia",f:"🇷🇸"},{c:"SK",n:"Slovakia",f:"🇸🇰"},{c:"SI",n:"Slovenia",f:"🇸🇮"},{c:"SM",n:"San Marino",f:"🇸🇲"},{c:"ES",n:"Spain",f:"🇪🇸"},{c:"SE",n:"Sweden",f:"🇸🇪"},{c:"CH",n:"Switzerland",f:"🇨🇭"},{c:"TR",n:"Turkey",f:"🇹🇷"},{c:"UA",n:"Ukraine",f:"🇺🇦"},{c:"GB",n:"United Kingdom",f:"🇬🇧"},{c:"SA",n:"Saudi Arabia",f:"🇸🇦"},{c:"AE",n:"UAE",f:"🇦🇪"},{c:"CL",n:"Chile",f:"🇨🇱"},{c:"BR",n:"Brazil",f:"🇧🇷"},{c:"MA",n:"Morocco",f:"🇲🇦"},{c:"KZ",n:"Kazakhstan",f:"🇰🇿"},{c:"BH",n:"Bahrain",f:"🇧🇭"},{c:"US",n:"United States",f:"🇺🇸"},{c:"CA",n:"Canada",f:"🇨🇦"},{c:"AU",n:"Australia",f:"🇦🇺"}].sort((a,b)=>a.n.localeCompare(b.n));

// ─── i18n (compact) ──────────────────────────────────────────────
const LANGS={en:{f:"🇬🇧",l:"EN"},fr:{f:"🇫🇷",l:"FR"},de:{f:"🇩🇪",l:"DE"},es:{f:"🇪🇸",l:"ES"},pt:{f:"🇵🇹",l:"PT"},ro:{f:"🇷🇴",l:"RO"},hu:{f:"🇭🇺",l:"HU"},sv:{f:"🇸🇪",l:"SV"},it:{f:"🇮🇹",l:"IT"},bg:{f:"🇧🇬",l:"BG"},ar:{f:"🇦🇪",l:"AR"}};
const TX={
en:{brand:"Team Vacation Planner",tag1:"Beautiful team vacation planning.",tag2:"See who's away, avoid overlaps, stay in sync.",crt:"Create a Team",crSub:"Start a new vacation board",jnt:"Join a Team",jnSub:"Enter a team code",tn:"Team Name",tnP:"e.g. Engineering, Marketing Q3",vy:"Year",cr:"Create Team",jc:"Team Code or Link",jcP:"Paste code or link",jn:"Join Team",nf:"Team not found.",mt:"My Teams",mb:"member",mbs:"members",tm:"Team Members",am:"Add Member",en2:"Enter name…",add:"Add",can:"Cancel",mx:"Max 50",mr:"Removed",nd:"No days",dy:"day",dys:"days",ed:"Editing",tap:"tap dates to toggle · drag to select range",sel:"Select a member to edit days",et:"Your team is ready!",es2:"Add your first member, then pick dates.",af:"Add First",leg:"Legend",ol:"Overlap",os:"Summary",ndy:"No vacation days yet.",dol:"day(s) with 2+ out",sh:"Share",sht:"Share Team Link",shs:"Anyone with this link can join",cl:"Copy Link",cp:"Copied!",lne:"Link never expires.",tc:"Team Code",bf:"Built for teams up to 50",ch:"Country Holidays",tv:"Team Holidays",co:"Country",hol:"holidays",selC:"Select country…",close:"Close",
cal:"Calendar",heatmap:"Heatmap",timeline:"Timeline",coverage:"Coverage",summary:"Summary",
lock:"Lock Board",unlock:"Unlock Board",locked:"Board is locked by admin",export:"Export ICS",pdf:"PDF Report",embed:"Embed Code",
wk:"Workday",we:"Weekend",conflictWarn:"Coverage alert: {n} members out on {date}",threshold:"Alert threshold",
mo:"Mo",tu:"Tu",we2:"We",th:"Th",fr:"Fr",sa:"Sa",su:"Su",
about:"About",contact:"Contact",contactTitle:"Contact & Feedback",contactSub:"We'd love to hear from you",sendFeedback:"Send Feedback",thankYou:"Thank you!",thankYouSub:"Your email client should open with the message ready to send.",yourEmail:"Your email",subjectLabel:"Subject",messageLabel:"Message",selectTopic:"Select a topic…",emailPlaceholder:"your@email.com",msgPlaceholder:"Tell us what is on your mind… (min 10 characters)",chars:"characters",emailNote:"Opens your email client with the message pre-filled. Your email is only used to reply to your feedback.",gotIt:"Got it",back:"Back",subFeedback:"General Feedback",subBug:"Bug Report",subSuggestion:"Feature Suggestion",subQuestion:"Question / How-to",subPartner:"Partnership / Integration",subData:"Data Correction (Holidays)",subOther:"Other",noActivity:"No activity yet.",activityLog:"Activity Log",bestDays:"Best Days for",copyEmbed:"Copy Embed Code",holiday:"Holiday",avgCov:"Avg Coverage",lowWeek:"Lowest Week",weeksLow:"Weeks <70%",inOffice:"In office",onVac:"On vacation",outToday:"Out today",nextVac:"Next",today:"Today",printBtn:"Print / Save as PDF",sheetsTitle:"Google Sheets Live Feed",sheetsSub:"Use =IMPORTDATA(this_url) in Google Sheets to auto-import",cookieMsg:"This tool uses local storage to save your preferences and team data. No personal data is collected or shared with third parties.",
workDays:"Working Days",stdWeek:"Standard (Mon–Fri)",fullWeek:"7-Day Operations",
natOnly:"National only",region:"Region",pto:"PTO",role:"Role",setApprover:"Set as Approver",approverLabel:"Approver",teamApproval:"Team Approval",approveAll:"Approve All",workDaysLeft:"work days left",holCount:"holidays",subscribe:"Subscribe",widget:"Widget",copySubURL:"Copy Subscribe URL",copyWidget:"Copy Widget Code",analytics:"Analytics",totalVacDays:"Total Vacation Days",overlapDays:"Overlap Days",peakMonth:"Peak Month",avgDays:"Avg Days/Person",monthlyDist:"Monthly Distribution",memberBreak:"Per Member Breakdown",approvedPdf:"Approved PDF",approvalCert:"Approval Certification",alertLabel:"Alert",pending:"pending",approved:"Approved",addMembers:"Add members to see analytics",iCalTitle:"iCal Subscribe URL",iCalDesc:"Add this URL to Google Calendar, Outlook, or Apple Calendar. It updates automatically when vacations change.",widgetDesc:"A compact widget showing who is out this week. Perfect for Notion, wikis, or TV screens.",offToday:"Non-working day today",shareThis:"Share this tool",teamsCreated:"Teams",totalMembers:"Members",live:"Live",addComment:"Add a comment...",daysUntil:"days until vacation",tomorrow:"Tomorrow!",teamMap:"Team countries",fullTeam:"Full team in today!",outToday:"Out today",trips:"Business Trips",trip:"trip",addTrip:"Add Trip",editTrip:"Edit Trip",dest:"Destination",startDate:"Start",endDate:"End",project:"Project",noTrips:"No business trips yet",noTripsDesc:"Track your team's business travel.",cancel:"Cancel",save:"Save",M:["January","February","March","April","May","June","July","August","September","October","November","December"]},
fr:{brand:"Planificateur de Vacances d'Équipe",tag1:"Planification simple des congés d'équipe.",tag2:"Voyez qui est absent, évitez les chevauchements.",crt:"Créer une équipe",crSub:"Créer un nouveau planning de congés",jnt:"Rejoindre une équipe",jnSub:"Entrez le code d'équipe",tn:"Nom de l'équipe",tnP:"ex. Marketing, Ingénierie Q3",vy:"Année",cr:"Créer",jc:"Code ou lien",jcP:"Collez le code",jn:"Rejoindre",nf:"Introuvable.",mt:"Mes équipes",mb:"membre",mbs:"membres",tm:"Membres",am:"Ajouter",en2:"Nom…",add:"Ajouter",can:"Annuler",mx:"Max 50",mr:"Supprimé",nd:"Aucun jour",dy:"jour",dys:"jours",ed:"Modification",tap:"appuyez ou glissez",sel:"Sélectionnez un membre pour modifier ses congés",et:"Équipe prête !",es2:"Ajoutez votre premier membre, puis sélectionnez des dates.",af:"Ajouter",leg:"Légende",ol:"Chevauchement",os:"Résumé",ndy:"Aucun jour de congé planifié.",dol:"jour(s) 2+ absents",sh:"Partager",sht:"Partager le lien",shs:"Toute personne ayant ce lien peut voir et modifier",cl:"Copier",cp:"Copié !",lne:"Lien permanent.",tc:"Code",bf:"Conçu pour des équipes jusqu'à 50 personnes",ch:"Jours fériés",tv:"Fériés équipe",co:"Pays",hol:"jours fériés",selC:"Choisir…",close:"Fermer",
cal:"Calendrier",heatmap:"Heatmap",timeline:"Chronologie",coverage:"Couverture",summary:"Résumé",
lock:"Verrouiller",unlock:"Déverrouiller",locked:"Le tableau est verrouillé par un administrateur",export:"Exporter ICS",pdf:"Rapport PDF",embed:"Code embed",
wk:"Jour ouvré",we:"Weekend",conflictWarn:"Alerte: {n} absents le {date}",threshold:"Seuil d'alerte",
mo:"Lu",tu:"Ma",we2:"Me",th:"Je",fr:"Ve",sa:"Sa",su:"Di",
about:"À propos",contact:"Contact",contactTitle:"Contact & Retour",contactSub:"Nous aimerions avoir de vos nouvelles",sendFeedback:"Envoyer",thankYou:"Merci !",thankYouSub:"Votre client email devrait s'ouvrir avec le message.",yourEmail:"Votre email",subjectLabel:"Sujet",messageLabel:"Message",selectTopic:"Choisir un sujet…",emailPlaceholder:"votre@email.com",msgPlaceholder:"Dites-nous ce que vous pensez… (min 10 caractères)",chars:"caractères",emailNote:"Ouvre votre client email. Votre email est uniquement utilisé pour répondre.",gotIt:"Compris",back:"Retour",subFeedback:"Retour général",subBug:"Signaler un bug",subSuggestion:"Suggestion",subQuestion:"Question",subPartner:"Partenariat / Intégration",subData:"Correction de données (Jours fériés)",subOther:"Autre",noActivity:"Aucune activité.",activityLog:"Journal d'activité",bestDays:"Meilleurs jours pour",copyEmbed:"Copier le code",holiday:"Jour férié",avgCov:"Couverture moy.",lowWeek:"Semaine min.",weeksLow:"Semaines <70%",inOffice:"Au bureau",onVac:"En vacances",outToday:"Absents aujourd'hui",nextVac:"Prochain",today:"Aujourd'hui",printBtn:"Imprimer / Sauvegarder en PDF",sheetsTitle:"Flux Google Sheets",sheetsSub:"Utilisez =IMPORTDATA(url) dans Google Sheets",cookieMsg:"Cet outil utilise le stockage local pour vos préférences. Aucune donnée personnelle n'est collectée.",
workDays:"Jours ouvrables",stdWeek:"Standard (Lun–Ven)",fullWeek:"7 jours sur 7",
natOnly:"National uniquement",region:"Région",pto:"Jours",role:"Rôle",setApprover:"Définir approbateur",approverLabel:"Approbateur",teamApproval:"Approbation équipe",approveAll:"Tout approuver",workDaysLeft:"jours ouvrés restants",holCount:"jours fériés",subscribe:"S'abonner",widget:"Widget",copySubURL:"Copier l'URL d'abonnement",copyWidget:"Copier le widget",analytics:"Analytique",totalVacDays:"Total jours de congé",overlapDays:"Chevauchements",peakMonth:"Mois pic",avgDays:"Moy. jours/pers.",monthlyDist:"Distribution mensuelle",memberBreak:"Détail par membre",approvedPdf:"PDF approuvé",approvalCert:"Certification d'approbation",alertLabel:"Alerte",pending:"en attente",approved:"Approuvé",addMembers:"Ajoutez des membres pour voir l'analytique",iCalTitle:"URL d'abonnement iCal",iCalDesc:"Ajoutez cette URL à Google Calendar, Outlook ou Apple Calendar. Mise à jour automatique.",widgetDesc:"Un widget compact montrant qui est absent cette semaine.",offToday:"Jour non travaillé aujourd'hui",shareThis:"Partagez cet outil",teamsCreated:"Équipes",totalMembers:"Membres",live:"En direct",addComment:"Ajouter un commentaire...",daysUntil:"jours avant les vacances",tomorrow:"Demain !",teamMap:"Pays de l'équipe",fullTeam:"Équipe au complet !",outToday:"Absents",trips:"Voyages d'affaires",trip:"voyage",addTrip:"Ajouter",editTrip:"Modifier",dest:"Destination",startDate:"Début",endDate:"Fin",project:"Projet",noTrips:"Aucun voyage",noTripsDesc:"Suivez les déplacements de votre équipe.",cancel:"Annuler",save:"Enregistrer",M:["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]},
de:{brand:"Team-Urlaubsplaner",tag1:"Einfache Urlaubsplanung für Ihr Team.",tag2:"Sehen Sie, wer abwesend ist, und vermeiden Sie Überschneidungen.",crt:"Team erstellen",crSub:"Neuen Urlaubskalender erstellen",jnt:"Einem Team beitreten",jnSub:"Teamcode eingeben",tn:"Teamname",tnP:"z.B. Marketing, Entwicklung Q3",vy:"Jahr",cr:"Erstellen",jc:"Code oder Link",jcP:"Code einfügen",jn:"Beitreten",nf:"Nicht gefunden.",mt:"Meine Teams",mb:"Mitglied",mbs:"Mitglieder",tm:"Mitglieder",am:"Hinzufügen",en2:"Name…",add:"Hinzufügen",can:"Abbrechen",mx:"Max 50",mr:"Entfernt",nd:"Keine Tage",dy:"Tag",dys:"Tage",ed:"Bearbeitung",tap:"Tippen oder ziehen",sel:"Wählen Sie ein Mitglied, um Urlaubstage zu bearbeiten",et:"Team bereit!",es2:"Fügen Sie Ihr erstes Mitglied hinzu und wählen Sie Tage aus.",af:"Hinzufügen",leg:"Legende",ol:"Überschneidung",os:"Zusammenfassung",ndy:"Noch keine Urlaubstage geplant.",dol:"Tag(e) 2+ abwesend",sh:"Teilen",sht:"Link teilen",shs:"Jeder mit diesem Link kann sehen und bearbeiten",cl:"Kopieren",cp:"Kopiert!",lne:"Link permanent.",tc:"Code",bf:"Für Teams bis 50 Personen",ch:"Feiertage",tv:"Team-Feiertage",co:"Land",hol:"Feiertage",selC:"Land wählen…",close:"Schließen",
cal:"Kalender",heatmap:"Heatmap",timeline:"Zeitleiste",coverage:"Abdeckung",summary:"Zusammenfassung",
lock:"Sperren",unlock:"Entsperren",locked:"Das Board ist durch einen Admin gesperrt",export:"ICS Export",pdf:"PDF-Bericht",embed:"Embed-Code",
wk:"Werktag",we:"Wochenende",conflictWarn:"Warnung: {n} abwesend am {date}",threshold:"Warnschwelle",
mo:"Mo",tu:"Di",we2:"Mi",th:"Do",fr:"Fr",sa:"Sa",su:"So",
about:"Über uns",contact:"Kontakt",contactTitle:"Kontakt & Feedback",contactSub:"Wir freuen uns über Ihre Nachricht",sendFeedback:"Absenden",thankYou:"Vielen Dank!",thankYouSub:"Ihr E-Mail-Programm öffnet sich mit der Nachricht.",yourEmail:"Ihre E-Mail",subjectLabel:"Betreff",messageLabel:"Nachricht",selectTopic:"Thema wählen…",emailPlaceholder:"ihre@email.de",msgPlaceholder:"Was möchten Sie uns mitteilen? (min. 10 Zeichen)",chars:"Zeichen",emailNote:"Öffnet Ihr E-Mail-Programm. Ihre E-Mail wird nur für Antworten verwendet.",gotIt:"Verstanden",back:"Zurück",subFeedback:"Allgemeines Feedback",subBug:"Fehlerbericht",subSuggestion:"Vorschlag",subQuestion:"Frage",subPartner:"Partnerschaft / Integration",subData:"Datenkorrektur (Feiertage)",subOther:"Sonstiges",noActivity:"Keine Aktivität.",activityLog:"Aktivitätslog",bestDays:"Beste Tage für",copyEmbed:"Code kopieren",holiday:"Feiertag",avgCov:"Ø Abdeckung",lowWeek:"Niedrigste Woche",weeksLow:"Wochen <70%",inOffice:"Im Büro",onVac:"Im Urlaub",outToday:"Heute abwesend",nextVac:"Nächster",today:"Heute",printBtn:"Drucken / Als PDF speichern",sheetsTitle:"Google Sheets Feed",sheetsSub:"=IMPORTDATA(url) in Google Sheets verwenden",cookieMsg:"Dieses Tool nutzt lokalen Speicher für Einstellungen. Keine personenbezogenen Daten werden erhoben.",
workDays:"Arbeitstage",stdWeek:"Standard (Mo–Fr)",fullWeek:"7-Tage-Betrieb",
natOnly:"Nur national",region:"Region",pto:"Urlaub",role:"Rolle",setApprover:"Als Genehmiger festlegen",approverLabel:"Genehmiger",teamApproval:"Teamgenehmigung",approveAll:"Alle genehmigen",workDaysLeft:"Arbeitstage übrig",holCount:"Feiertage",subscribe:"Abonnieren",widget:"Widget",copySubURL:"Abo-URL kopieren",copyWidget:"Widget kopieren",analytics:"Analytik",totalVacDays:"Urlaubstage gesamt",overlapDays:"Überschneidungen",peakMonth:"Spitzenmonat",avgDays:"Ø Tage/Person",monthlyDist:"Monatsverteilung",memberBreak:"Aufschlüsselung",approvedPdf:"Genehmigtes PDF",approvalCert:"Genehmigungszertifikat",alertLabel:"Warnung",pending:"ausstehend",approved:"Genehmigt",addMembers:"Mitglieder hinzufügen für Analytik",iCalTitle:"iCal-Abo-URL",iCalDesc:"Fügen Sie diese URL zu Google Kalender, Outlook oder Apple Kalender hinzu. Automatische Aktualisierung.",widgetDesc:"Kompaktes Widget das zeigt wer diese Woche abwesend ist.",offToday:"Heute arbeitsfrei",shareThis:"Dieses Tool teilen",teamsCreated:"Teams",totalMembers:"Mitglieder",live:"Live",addComment:"Kommentar hinzufügen...",daysUntil:"Tage bis zum Urlaub",tomorrow:"Morgen!",teamMap:"Teamländer",fullTeam:"Ganzes Team da!",outToday:"Abwesend",trips:"Dienstreisen",trip:"Reise",addTrip:"Hinzufügen",editTrip:"Bearbeiten",dest:"Ziel",startDate:"Beginn",endDate:"Ende",project:"Projekt",noTrips:"Keine Dienstreisen",noTripsDesc:"Geschäftsreisen Ihres Teams verfolgen.",cancel:"Abbrechen",save:"Speichern",M:["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"]},
es:{brand:"Planificador de Vacaciones de Equipo",tag1:"Planificación sencilla de vacaciones del equipo.",tag2:"Mira quién está ausente y evita solapamientos.",crt:"Crear equipo",crSub:"Crear un nuevo calendario de vacaciones",jnt:"Unirse a un equipo",jnSub:"Ingresa el código del equipo",tn:"Nombre del equipo",tnP:"ej. Marketing, Ingeniería Q3",vy:"Año",cr:"Crear",jc:"Código o enlace",jcP:"Pegar código",jn:"Unirse",nf:"No encontrado.",mt:"Mis equipos",mb:"miembro",mbs:"miembros",tm:"Miembros",am:"Agregar",en2:"Nombre…",add:"Agregar",can:"Cancelar",mx:"Max 50",mr:"Eliminado",nd:"Sin días",dy:"día",dys:"días",ed:"Editando",tap:"Toca o arrastra",sel:"Selecciona un miembro para editar sus vacaciones",et:"¡Equipo listo!",es2:"Agrega tu primer miembro y selecciona fechas.",af:"Agregar",leg:"Leyenda",ol:"Solapamiento",os:"Resumen",ndy:"Todavía no hay días de vacaciones planificados.",dol:"día(s) 2+ ausentes",sh:"Compartir",sht:"Compartir enlace",shs:"Cualquier persona con este enlace puede ver y editar",cl:"Copiar",cp:"¡Copiado!",lne:"Enlace permanente.",tc:"Código",bf:"Diseñado para equipos de hasta 50 personas",ch:"Festivos",tv:"Festivos equipo",co:"País",hol:"festivos",selC:"Elegir…",close:"Cerrar",
cal:"Calendario",heatmap:"Mapa de calor",timeline:"Cronología",coverage:"Cobertura",summary:"Resumen",
lock:"Bloquear",unlock:"Desbloquear",locked:"El tablero está bloqueado por un administrador",export:"Exportar ICS",pdf:"Informe PDF",embed:"Código embed",
wk:"Laborable",we:"Fin de semana",conflictWarn:"Alerta: {n} ausentes el {date}",threshold:"Umbral de alerta",
mo:"Lu",tu:"Ma",we2:"Mi",th:"Ju",fr:"Vi",sa:"Sá",su:"Do",
about:"Acerca de",contact:"Contacto",contactTitle:"Contacto y Comentarios",contactSub:"Nos encantaría saber de ti",sendFeedback:"Enviar",thankYou:"¡Gracias!",thankYouSub:"Tu cliente de correo se abrirá con el mensaje.",yourEmail:"Tu email",subjectLabel:"Asunto",messageLabel:"Mensaje",selectTopic:"Selecciona un tema…",emailPlaceholder:"tu@email.com",msgPlaceholder:"¿Qué nos quieres decir? (mín. 10 caracteres)",chars:"caracteres",emailNote:"Abre tu cliente de correo. Tu email solo se usa para responder.",gotIt:"Entendido",back:"Volver",subFeedback:"Comentario general",subBug:"Reporte de error",subSuggestion:"Sugerencia",subQuestion:"Pregunta",subPartner:"Asociación / Integración",subData:"Corrección de datos (Festivos)",subOther:"Otro",noActivity:"Sin actividad.",activityLog:"Registro de actividad",bestDays:"Mejores días para",copyEmbed:"Copiar código",holiday:"Festivo",avgCov:"Cobertura prom.",lowWeek:"Semana mín.",weeksLow:"Semanas <70%",inOffice:"En oficina",onVac:"De vacaciones",outToday:"Ausentes hoy",nextVac:"Siguiente",today:"Hoy",printBtn:"Imprimir / Guardar como PDF",sheetsTitle:"Feed de Google Sheets",sheetsSub:"Usa =IMPORTDATA(url) en Google Sheets",cookieMsg:"Esta herramienta usa almacenamiento local. No se recopilan datos personales.",
workDays:"Dias laborables",stdWeek:"Estandar (Lun–Vie)",fullWeek:"Operaciones 7 dias",
natOnly:"Solo nacional",region:"Región",pto:"Días",role:"Rol",setApprover:"Definir aprobador",approverLabel:"Aprobador",teamApproval:"Aprobación del equipo",approveAll:"Aprobar todo",workDaysLeft:"días laborables restantes",holCount:"festivos",subscribe:"Suscribirse",widget:"Widget",copySubURL:"Copiar URL de suscripción",copyWidget:"Copiar widget",analytics:"Analítica",totalVacDays:"Total días de vacaciones",overlapDays:"Solapamientos",peakMonth:"Mes pico",avgDays:"Media días/persona",monthlyDist:"Distribución mensual",memberBreak:"Desglose por miembro",approvedPdf:"PDF aprobado",approvalCert:"Certificación de aprobación",alertLabel:"Alerta",pending:"pendiente",approved:"Aprobado",addMembers:"Añade miembros para ver la analítica",iCalTitle:"URL de suscripción iCal",iCalDesc:"Añade esta URL a Google Calendar, Outlook o Apple Calendar. Se actualiza automáticamente.",widgetDesc:"Un widget compacto mostrando quién está ausente esta semana.",offToday:"Día no laborable hoy",shareThis:"Comparte esta herramienta",teamsCreated:"Equipos",totalMembers:"Miembros",live:"En vivo",addComment:"Añadir comentario...",daysUntil:"días hasta vacaciones",tomorrow:"¡Mañana!",teamMap:"Países del equipo",fullTeam:"Equipo completo!",outToday:"Ausentes",trips:"Viajes de negocios",trip:"viaje",addTrip:"Añadir",editTrip:"Editar",dest:"Destino",startDate:"Inicio",endDate:"Fin",project:"Proyecto",noTrips:"Sin viajes",noTripsDesc:"Registra los viajes de tu equipo.",cancel:"Cancelar",save:"Guardar",M:["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]},
pt:{brand:"Planeador de Férias de Equipa",tag1:"Planeamento simples de férias da equipa.",tag2:"Veja quem está ausente e evite sobreposições.",crt:"Criar equipa",crSub:"Criar novo calendário de férias",jnt:"Juntar-se a uma equipa",jnSub:"Código ou link da equipa",tn:"Nome da equipa",tnP:"ex. Marketing, Engenharia Q3",vy:"Ano",cr:"Criar",jc:"Código ou link",jcP:"Colar código",jn:"Juntar-se",nf:"Não encontrado.",mt:"As minhas equipas",mb:"membro",mbs:"membros",tm:"Membros",am:"Adicionar",en2:"Nome…",add:"Adicionar",can:"Cancelar",mx:"Max 50",mr:"Removido",nd:"Sem dias",dy:"dia",dys:"dias",ed:"A editar",tap:"Toque ou arraste",sel:"Selecione um membro para editar as férias",et:"Equipa pronta!",es2:"Adicione o primeiro membro e selecione datas.",af:"Adicionar",leg:"Legenda",ol:"Sobreposição",os:"Resumo",ndy:"Ainda sem dias de férias planeados.",dol:"dia(s) 2+ ausentes",sh:"Partilhar",sht:"Partilhar link",shs:"Qualquer pessoa com este link pode ver e editar",cl:"Copiar",cp:"Copiado!",lne:"Link permanente.",tc:"Código",bf:"Para equipas até 50 pessoas",ch:"Feriados",tv:"Feriados equipa",co:"País",hol:"feriados",selC:"Escolher…",close:"Fechar",
cal:"Calendário",heatmap:"Heatmap",timeline:"Cronologia",coverage:"Cobertura",summary:"Resumo",
lock:"Bloquear",unlock:"Desbloquear",locked:"O quadro está bloqueado por um administrador",export:"Exportar ICS",pdf:"Relatório PDF",embed:"Código embed",
wk:"Dia útil",we:"Fim de semana",conflictWarn:"Alerta: {n} ausentes em {date}",threshold:"Limite de alerta",
mo:"Sg",tu:"Te",we2:"Qa",th:"Qi",fr:"Sx",sa:"Sb",su:"Do",
about:"Sobre",contact:"Contacto",contactTitle:"Contacto e Feedback",contactSub:"Gostaríamos de ouvir a sua opinião",sendFeedback:"Enviar",thankYou:"Obrigado!",thankYouSub:"O seu cliente de email abrirá com a mensagem.",yourEmail:"O seu email",subjectLabel:"Assunto",messageLabel:"Mensagem",selectTopic:"Selecione um tema…",emailPlaceholder:"seu@email.com",msgPlaceholder:"O que gostaria de nos dizer? (mín. 10 caracteres)",chars:"caracteres",emailNote:"Abre o seu cliente de email. O seu email é usado apenas para responder.",gotIt:"Entendido",back:"Voltar",subFeedback:"Feedback geral",subBug:"Relatório de erro",subSuggestion:"Sugestão",subQuestion:"Pergunta",subPartner:"Parceria / Integração",subData:"Correção de dados (Feriados)",subOther:"Outro",noActivity:"Sem atividade.",activityLog:"Registo de atividade",bestDays:"Melhores dias para",copyEmbed:"Copiar código",holiday:"Feriado",avgCov:"Cobertura méd.",lowWeek:"Semana mín.",weeksLow:"Semanas <70%",inOffice:"No escritório",onVac:"De férias",outToday:"Ausentes hoje",nextVac:"Próximo",today:"Hoje",printBtn:"Imprimir / Guardar como PDF",sheetsTitle:"Feed Google Sheets",sheetsSub:"Use =IMPORTDATA(url) no Google Sheets",cookieMsg:"Esta ferramenta usa armazenamento local. Nenhum dado pessoal é recolhido.",
workDays:"Dias de trabalho",stdWeek:"Padrao (Seg–Sex)",fullWeek:"7 dias por semana",
natOnly:"Apenas nacional",region:"Região",pto:"Dias",role:"Função",setApprover:"Definir aprovador",approverLabel:"Aprovador",teamApproval:"Aprovação da equipa",approveAll:"Aprovar tudo",workDaysLeft:"dias úteis restantes",holCount:"feriados",subscribe:"Subscrever",widget:"Widget",copySubURL:"Copiar URL de subscrição",copyWidget:"Copiar widget",analytics:"Análise",totalVacDays:"Total dias de férias",overlapDays:"Sobreposições",peakMonth:"Mês de pico",avgDays:"Média dias/pessoa",monthlyDist:"Distribuição mensal",memberBreak:"Detalhe por membro",approvedPdf:"PDF aprovado",approvalCert:"Certificação de aprovação",alertLabel:"Alerta",pending:"pendente",approved:"Aprovado",addMembers:"Adicione membros para ver a análise",iCalTitle:"URL de subscrição iCal",iCalDesc:"Adicione este URL ao Google Calendar, Outlook ou Apple Calendar. Atualização automática.",widgetDesc:"Um widget compacto mostrando quem está ausente esta semana.",offToday:"Dia não útil hoje",shareThis:"Partilhe esta ferramenta",teamsCreated:"Equipas",totalMembers:"Membros",live:"Ao vivo",addComment:"Adicionar comentário...",daysUntil:"dias até férias",tomorrow:"Amanhã!",teamMap:"Países da equipa",fullTeam:"Equipa completa!",outToday:"Ausentes",trips:"Viagens de negócios",trip:"viagem",addTrip:"Adicionar",editTrip:"Editar",dest:"Destino",startDate:"Início",endDate:"Fim",project:"Projeto",noTrips:"Sem viagens",noTripsDesc:"Registe as viagens da equipa.",cancel:"Cancelar",save:"Guardar",M:["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]},
ro:{brand:"Planificator Concedii Echipă",tag1:"Planificarea ușoară a concediilor în echipă.",tag2:"Vezi cine lipsește și evită suprapunerile.",crt:"Creează echipă",crSub:"Creează un nou calendar de concedii",jnt:"Alătură-te unei echipe",jnSub:"Introdu codul echipei",tn:"Numele echipei",tnP:"ex. Marketing, Inginerie T3",vy:"An",cr:"Creează",jc:"Cod sau link",jcP:"Lipește codul",jn:"Alătură-te",nf:"Echipa nu a fost găsită.",mt:"Echipele mele",mb:"membru",mbs:"membri",tm:"Membri",am:"Adaugă membru",en2:"Numele colegului…",add:"Adaugă",can:"Anulează",mx:"Max 50",mr:"Eliminat",nd:"Nicio zi",dy:"zi",dys:"zile",ed:"Editare",tap:"Apasă sau trage",sel:"Selectează un coleg pentru a edita zilele de concediu",et:"Echipa e gata!",es2:"Adaugă primul coleg, apoi selectează datele.",af:"Adaugă",leg:"Legendă",ol:"Suprapunere",os:"Rezumat",ndy:"Nu sunt încă zile de concediu planificate.",dol:"zi(le) 2+ absenți",sh:"Partajează",sht:"Partajează linkul echipei",shs:"Oricine are acest link poate vedea și edita",cl:"Copiază",cp:"Copiat!",lne:"Link permanent.",tc:"Cod",bf:"Creat pentru echipe de până la 50 de persoane",ch:"Sărbători legale",tv:"Sărbătorile echipei",co:"Țara",hol:"sărbători legale",selC:"Alege țara…",close:"Închide",
cal:"Calendar",heatmap:"Hartă termică",timeline:"Cronologie",coverage:"Acoperire",summary:"Rezumat",
lock:"Blochează",unlock:"Deblochează",locked:"Panoul este blocat de administrator",export:"Export ICS",pdf:"Raport PDF",embed:"Cod embed",
wk:"Zi lucrătoare",we:"Weekend",conflictWarn:"Alertă: {n} absenți pe {date}",threshold:"Prag alertă",
mo:"Lu",tu:"Ma",we2:"Mi",th:"Jo",fr:"Vi",sa:"Sâ",su:"Du",
about:"Despre",contact:"Contact",contactTitle:"Contact și Feedback",contactSub:"Ne-ar plăcea să aflăm părerea ta",sendFeedback:"Trimite",thankYou:"Mulțumim!",thankYouSub:"Clientul de email se va deschide cu mesajul.",yourEmail:"Emailul tău",subjectLabel:"Subiect",messageLabel:"Mesaj",selectTopic:"Alege un subiect…",emailPlaceholder:"email@exemplu.ro",msgPlaceholder:"Ce ne dorești să ne spui? (min. 10 caractere)",chars:"caractere",emailNote:"Deschide clientul de email. Emailul tău este folosit doar pentru răspuns.",gotIt:"Am înțeles",back:"Înapoi",subFeedback:"Feedback general",subBug:"Raport de eroare",subSuggestion:"Sugestie",subQuestion:"Întrebare",subPartner:"Parteneriat / Integrare",subData:"Corectare date (Sărbători)",subOther:"Altele",noActivity:"Nicio activitate.",activityLog:"Jurnal de activitate",bestDays:"Cele mai bune zile pentru",copyEmbed:"Copiază codul",holiday:"Sărbătoare legală",avgCov:"Acoperire medie",lowWeek:"Săptămâna min.",weeksLow:"Săptămâni <70%",inOffice:"La birou",onVac:"În concediu",outToday:"Absenți azi",nextVac:"Următor",today:"Azi",printBtn:"Printare / Salvare ca PDF",sheetsTitle:"Feed Google Sheets",sheetsSub:"Folosește =IMPORTDATA(url) în Google Sheets",cookieMsg:"Acest instrument folosește stocarea locală. Nu sunt colectate date personale.",
workDays:"Zile lucratoare",stdWeek:"Standard (Lu–Vi)",fullWeek:"7 zile pe saptamana",
natOnly:"Doar național",region:"Regiune",pto:"Zile",role:"Rol",setApprover:"Setează aprobator",approverLabel:"Aprobator",teamApproval:"Aprobare echipă",approveAll:"Aprobă tot",workDaysLeft:"zile lucrătoare rămase",holCount:"sărbători",subscribe:"Abonare",widget:"Widget",copySubURL:"Copiază URL abonare",copyWidget:"Copiază widget",analytics:"Analiză",totalVacDays:"Total zile concediu",overlapDays:"Suprapuneri",peakMonth:"Luna de vârf",avgDays:"Media zile/persoană",monthlyDist:"Distribuție lunară",memberBreak:"Detalii per membru",approvedPdf:"PDF aprobat",approvalCert:"Certificare aprobare",alertLabel:"Alertă",pending:"în așteptare",approved:"Aprobat",addMembers:"Adaugă membri pentru analiză",iCalTitle:"URL abonare iCal",iCalDesc:"Adaugă acest URL în Google Calendar, Outlook sau Apple Calendar. Se actualizează automat.",widgetDesc:"Un widget compact care arată cine este absent săptămâna aceasta.",offToday:"Zi nelucrătoare astăzi",shareThis:"Distribuie acest instrument",teamsCreated:"Echipe",totalMembers:"Membri",live:"Live",addComment:"Adaugă un comentariu...",daysUntil:"zile până la concediu",tomorrow:"Mâine!",teamMap:"Țările echipei",fullTeam:"Toată echipa prezentă!",outToday:"Absent azi",trips:"Deplasări",trip:"deplasare",addTrip:"Adaugă",editTrip:"Editează",dest:"Destinație",startDate:"Început",endDate:"Sfârșit",project:"Proiect",noTrips:"Nicio deplasare",noTripsDesc:"Urmărește călătoriile de afaceri ale echipei.",cancel:"Anulează",save:"Salvează",M:["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"]},
hu:{brand:"Csapat Szabadságtervező",tag1:"Egyszerű szabadságtervezés a csapat számára.",tag2:"Lásd, ki van távol, és kerüld el az átfedéseket.",crt:"Csapat létrehozása",crSub:"Új szabadságnaptár létrehozása",jnt:"Csatlakozás csapathoz",jnSub:"Csapatkód megadása",tn:"Csapat neve",tnP:"pl. Marketing, Fejlesztés",vy:"Év",cr:"Létrehozás",jc:"Kód vagy link",jcP:"Kód beillesztése",jn:"Csatlakozás",nf:"Nem található.",mt:"Csapataim",mb:"tag",mbs:"tag",tm:"Tagok",am:"Hozzáadás",en2:"Név…",add:"Hozzáadás",can:"Mégse",mx:"Max 50",mr:"Eltávolítva",nd:"Nincs nap",dy:"nap",dys:"nap",ed:"Szerkesztés",tap:"Koppints vagy húzd",sel:"Válassz egy tagot a szabadságnapok szerkesztéséhez",et:"Csapat kész!",es2:"Add hozzá az első tagot, majd válassz napokat.",af:"Első tag",leg:"Jelmagyarázat",ol:"Átfedés",os:"Összefoglaló",ndy:"Még nincsenek szabadságnapok tervezve.",dol:"nap 2+ távol",sh:"Megosztás",sht:"Link megosztása",shs:"Bárki hozzáfér és szerkeszthet ezzel a linkkel",cl:"Másolás",cp:"Másolva!",lne:"Állandó link.",tc:"Kód",bf:"Legfeljebb 50 fős csapatoknak",ch:"Ünnepnapok",tv:"Csapat ünnepnapok",co:"Ország",hol:"ünnepnap",selC:"Válassz…",close:"Bezárás",
cal:"Naptár",heatmap:"Hőtérkép",timeline:"Idővonal",coverage:"Lefedettség",summary:"Összefoglaló",
lock:"Zárolás",unlock:"Feloldás",locked:"A táblát egy adminisztrátor zárolta",export:"ICS export",pdf:"PDF jelentés",embed:"Beágyazó kód",
wk:"Munkanap",we:"Hétvége",conflictWarn:"Figyelem: {n} távol {date}",threshold:"Riasztási küszöb",
mo:"Hé",tu:"Ke",we2:"Sze",th:"Cs",fr:"Pé",sa:"Szo",su:"Va",
about:"Névjegy",contact:"Kapcsolat",contactTitle:"Kapcsolat és Visszajelzés",contactSub:"Szívesen hallanánk véleményét",sendFeedback:"Küldés",thankYou:"Köszönjük!",thankYouSub:"Az email kliens megnyílik az üzenettel.",yourEmail:"Az email címe",subjectLabel:"Tárgy",messageLabel:"Üzenet",selectTopic:"Válasszon témát…",emailPlaceholder:"az@emailcime.hu",msgPlaceholder:"Mit szeretne mondani? (min. 10 karakter)",chars:"karakter",emailNote:"Megnyitja az email klienst. Az email csak válaszadásra használt.",gotIt:"Értem",back:"Vissza",subFeedback:"Általános visszajelzés",subBug:"Hibajelentés",subSuggestion:"Javaslat",subQuestion:"Kérdés",subPartner:"Partnerség / Integráció",subData:"Adatjavítás (Ünnepnapok)",subOther:"Egyéb",noActivity:"Nincs aktivitás.",activityLog:"Tevékenységnapló",bestDays:"Legjobb napok:",copyEmbed:"Kód másolása",holiday:"Ünnepnap",avgCov:"Átlag lefedettség",lowWeek:"Leggyengébb hét",weeksLow:"Hetek <70%",inOffice:"Irodában",onVac:"Szabadságon",outToday:"Ma távol",nextVac:"Következő",today:"Ma",printBtn:"Nyomtatás / Mentés PDF-ként",sheetsTitle:"Google Sheets feed",sheetsSub:"=IMPORTDATA(url) a Google Sheetsben",cookieMsg:"Ez az eszköz helyi tárolót használ. Személyes adatok nem kerülnek gyűjtésre.",
workDays:"Munkanapok",stdWeek:"Standard (H–P)",fullWeek:"7 napos munkarend",
natOnly:"Csak országos",region:"Régió",pto:"Napok",role:"Szerep",setApprover:"Jóváhagyó",approverLabel:"Jóváhagyó",teamApproval:"Csapat jóváhagyás",approveAll:"Mindet jóváhagy",workDaysLeft:"munkanap maradt",holCount:"ünnepnap",subscribe:"Feliratkozás",widget:"Widget",copySubURL:"Feliratkozási URL másolása",copyWidget:"Widget másolása",analytics:"Elemzés",totalVacDays:"Összes szabadságnap",overlapDays:"Átfedések",peakMonth:"Csúcshónap",avgDays:"Átlag nap/fő",monthlyDist:"Havi eloszlás",memberBreak:"Részletek tagonként",approvedPdf:"Jóváhagyott PDF",approvalCert:"Jóváhagyási tanúsítvány",alertLabel:"Riasztás",pending:"függőben",approved:"Jóváhagyva",addMembers:"Adj hozzá tagokat az elemzéshez",iCalTitle:"iCal feliratkozási URL",iCalDesc:"Add hozzá ezt az URL-t a Google Naptárhoz, Outlookhoz vagy Apple Naptárhoz.",widgetDesc:"Kompakt widget, amely megmutatja, ki van távol ezen a héten.",offToday:"Ma munkaszüneti nap",shareThis:"Oszd meg ezt az eszközt",teamsCreated:"Csapatok",totalMembers:"Tagok",live:"Élő",addComment:"Megjegyzés hozzáadása...",daysUntil:"nap a szabadságig",tomorrow:"Holnap!",teamMap:"Csapat országai",fullTeam:"Teljes csapat!",outToday:"Ma távol",trips:"Üzleti utak",trip:"út",addTrip:"Hozzáadás",editTrip:"Szerkesztés",dest:"Célállomás",startDate:"Kezdés",endDate:"Vége",project:"Projekt",noTrips:"Nincs üzleti út",noTripsDesc:"Kövesd a csapat utazásait.",cancel:"Mégse",save:"Mentés",M:["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"]},
sv:{brand:"Team Semesterplanerare",tag1:"Enkel semesterplanering för hela teamet.",tag2:"Se vem som är borta och undvik överlappningar.",crt:"Skapa ett team",crSub:"Skapa en ny semesterkalender",jnt:"Gå med i ett team",jnSub:"Ange teamkod",tn:"Teamnamn",tnP:"t.ex. Marknadsföring, Utveckling Q3",vy:"År",cr:"Skapa",jc:"Kod eller länk",jcP:"Klistra in kod",jn:"Gå med",nf:"Hittades inte.",mt:"Mina team",mb:"medlem",mbs:"medlemmar",tm:"Medlemmar",am:"Lägg till",en2:"Namn…",add:"Lägg till",can:"Avbryt",mx:"Max 50",mr:"Borttagen",nd:"Inga dagar",dy:"dag",dys:"dagar",ed:"Redigerar",tap:"Tryck eller dra",sel:"Välj en medlem för att redigera semesterdagar",et:"Teamet är klart!",es2:"Lägg till din första medlem och välj datum.",af:"Lägg till",leg:"Förklaring",ol:"Överlappning",os:"Sammanfattning",ndy:"Inga semesterdagar planerade ännu.",dol:"dag(ar) 2+ borta",sh:"Dela",sht:"Dela länk",shs:"Alla med denna länk kan se och redigera",cl:"Kopiera",cp:"Kopierat!",lne:"Permanent länk.",tc:"Kod",bf:"Byggt för team upp till 50 personer",ch:"Helgdagar",tv:"Teamets helgdagar",co:"Land",hol:"helgdagar",selC:"Välj land…",close:"Stäng",
cal:"Kalender",heatmap:"Värmekarta",timeline:"Tidslinje",coverage:"Täckning",summary:"Sammanfattning",
lock:"Lås",unlock:"Lås upp",locked:"Tavlan är låst av en administratör",export:"ICS-export",pdf:"PDF-rapport",embed:"Inbäddningskod",
wk:"Arbetsdag",we:"Helg",conflictWarn:"Varning: {n} borta {date}",threshold:"Varningströskel",
mo:"Må",tu:"Ti",we2:"On",th:"To",fr:"Fr",sa:"Lö",su:"Sö",
about:"Om",contact:"Kontakt",contactTitle:"Kontakt & Feedback",contactSub:"Vi vill gärna höra från dig",sendFeedback:"Skicka",thankYou:"Tack!",thankYouSub:"Din e-postklient öppnas med meddelandet.",yourEmail:"Din e-post",subjectLabel:"Ämne",messageLabel:"Meddelande",selectTopic:"Välj ett ämne…",emailPlaceholder:"din@epost.se",msgPlaceholder:"Vad vill du berätta? (minst 10 tecken)",chars:"tecken",emailNote:"Öppnar din e-postklient. Din e-post används bara för svar.",gotIt:"Förstått",back:"Tillbaka",subFeedback:"Allmän feedback",subBug:"Felrapport",subSuggestion:"Förslag",subQuestion:"Fråga",subPartner:"Partnerskap / Integration",subData:"Datakorrigering (Helgdagar)",subOther:"Övrigt",noActivity:"Ingen aktivitet.",activityLog:"Aktivitetslogg",bestDays:"Bästa dagar för",copyEmbed:"Kopiera kod",holiday:"Helgdag",avgCov:"Snitt täckning",lowWeek:"Lägsta vecka",weeksLow:"Veckor <70%",inOffice:"På kontoret",onVac:"På semester",outToday:"Borta idag",nextVac:"Nästa",today:"Idag",printBtn:"Skriv ut / Spara som PDF",sheetsTitle:"Google Sheets-flöde",sheetsSub:"Använd =IMPORTDATA(url) i Google Sheets",cookieMsg:"Detta verktyg använder lokal lagring. Inga personuppgifter samlas in.",
workDays:"Arbetsdagar",stdWeek:"Standard (Man–Fre)",fullWeek:"7-dagars drift",
natOnly:"Enbart nationell",region:"Region",pto:"Dagar",role:"Roll",setApprover:"Ange godkännare",approverLabel:"Godkännare",teamApproval:"Teamgodkännande",approveAll:"Godkänn alla",workDaysLeft:"arbetsdagar kvar",holCount:"helgdagar",subscribe:"Prenumerera",widget:"Widget",copySubURL:"Kopiera prenumerations-URL",copyWidget:"Kopiera widget",analytics:"Analys",totalVacDays:"Totala semesterdagar",overlapDays:"Överlappningar",peakMonth:"Toppmånad",avgDays:"Snitt dagar/person",monthlyDist:"Månadsfördelning",memberBreak:"Per medlem",approvedPdf:"Godkänd PDF",approvalCert:"Godkännandeintyg",alertLabel:"Varning",pending:"väntande",approved:"Godkänd",addMembers:"Lägg till medlemmar för analys",iCalTitle:"iCal prenumerations-URL",iCalDesc:"Lägg till denna URL i Google Kalender, Outlook eller Apple Kalender.",widgetDesc:"Kompakt widget som visar vem som är borta denna vecka.",offToday:"Ledig dag idag",shareThis:"Dela detta verktyg",teamsCreated:"Team",totalMembers:"Medlemmar",live:"Live",addComment:"Lägg till kommentar...",daysUntil:"dagar till semester",tomorrow:"Imorgon!",teamMap:"Teamets länder",fullTeam:"Hela teamet här!",outToday:"Borta idag",trips:"Tjänsteresor",trip:"resa",addTrip:"Lägg till",editTrip:"Redigera",dest:"Destination",startDate:"Start",endDate:"Slut",project:"Projekt",noTrips:"Inga resor",noTripsDesc:"Spåra teamets tjänsteresor.",cancel:"Avbryt",save:"Spara",M:["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]},
it:{brand:"Pianificatore Ferie di Squadra",tag1:"Pianificazione semplice delle ferie del team.",tag2:"Vedi chi è assente ed evita le sovrapposizioni.",crt:"Crea un team",crSub:"Crea un nuovo calendario ferie",jnt:"Unisciti a un team",jnSub:"Inserisci il codice del team",tn:"Nome del team",tnP:"es. Marketing, Ingegneria Q3",vy:"Anno",cr:"Crea",jc:"Codice o link",jcP:"Incolla codice",jn:"Unisciti",nf:"Non trovato.",mt:"I miei team",mb:"membro",mbs:"membri",tm:"Membri",am:"Aggiungi",en2:"Nome…",add:"Aggiungi",can:"Annulla",mx:"Max 50",mr:"Rimosso",nd:"Nessun giorno",dy:"giorno",dys:"giorni",ed:"Modifica",tap:"Tocca o trascina",sel:"Seleziona un membro per modificare i giorni di ferie",et:"Il team è pronto!",es2:"Aggiungi il primo membro e seleziona le date.",af:"Aggiungi",leg:"Legenda",ol:"Sovrapposizione",os:"Riepilogo",ndy:"Nessun giorno di ferie pianificato.",dol:"giorno/i 2+ assenti",sh:"Condividi",sht:"Condividi link",shs:"Chiunque abbia questo link può vedere e modificare",cl:"Copia",cp:"Copiato!",lne:"Link permanente.",tc:"Codice",bf:"Progettato per team fino a 50 persone",ch:"Festività",tv:"Festività del team",co:"Paese",hol:"festività",selC:"Scegli paese…",close:"Chiudi",
cal:"Calendario",heatmap:"Mappa termica",timeline:"Cronologia",coverage:"Copertura",summary:"Riepilogo",
lock:"Blocca",unlock:"Sblocca",locked:"La bacheca è bloccata da un amministratore",export:"Esporta ICS",pdf:"Report PDF",embed:"Codice embed",
wk:"Feriale",we:"Fine settimana",conflictWarn:"Attenzione: {n} assenti il {date}",threshold:"Soglia di allarme",
mo:"Lu",tu:"Ma",we2:"Me",th:"Gi",fr:"Ve",sa:"Sa",su:"Do",
about:"Info",contact:"Contatti",contactTitle:"Contatti e Feedback",contactSub:"Ci piacerebbe sentire la tua opinione",sendFeedback:"Invia",thankYou:"Grazie!",thankYouSub:"Il tuo client email si aprirà con il messaggio.",yourEmail:"La tua email",subjectLabel:"Oggetto",messageLabel:"Messaggio",selectTopic:"Scegli un argomento…",emailPlaceholder:"tua@email.it",msgPlaceholder:"Cosa vorresti dirci? (min. 10 caratteri)",chars:"caratteri",emailNote:"Apre il tuo client email. La tua email è usata solo per rispondere.",gotIt:"Capito",back:"Indietro",subFeedback:"Feedback generale",subBug:"Segnalazione errore",subSuggestion:"Suggerimento",subQuestion:"Domanda",subPartner:"Partnership / Integrazione",subData:"Correzione dati (Festività)",subOther:"Altro",noActivity:"Nessuna attività.",activityLog:"Registro attività",bestDays:"Giorni migliori per",copyEmbed:"Copia codice",holiday:"Festivo",avgCov:"Copertura media",lowWeek:"Settimana min.",weeksLow:"Settimane <70%",inOffice:"In ufficio",onVac:"In ferie",outToday:"Assenti oggi",nextVac:"Prossimo",today:"Oggi",printBtn:"Stampa / Salva come PDF",sheetsTitle:"Feed Google Sheets",sheetsSub:"Usa =IMPORTDATA(url) in Google Sheets",cookieMsg:"Questo strumento usa l'archiviazione locale. Nessun dato personale viene raccolto.",
workDays:"Giorni lavorativi",stdWeek:"Standard (Lun–Ven)",fullWeek:"Operativita 7 giorni",
natOnly:"Solo nazionale",region:"Regione",pto:"Giorni",role:"Ruolo",setApprover:"Imposta approvatore",approverLabel:"Approvatore",teamApproval:"Approvazione team",approveAll:"Approva tutti",workDaysLeft:"giorni lavorativi rimasti",holCount:"festività",subscribe:"Iscriviti",widget:"Widget",copySubURL:"Copia URL iscrizione",copyWidget:"Copia widget",analytics:"Analisi",totalVacDays:"Totale giorni ferie",overlapDays:"Sovrapposizioni",peakMonth:"Mese di punta",avgDays:"Media giorni/persona",monthlyDist:"Distribuzione mensile",memberBreak:"Dettaglio per membro",approvedPdf:"PDF approvato",approvalCert:"Certificazione approvazione",alertLabel:"Avviso",pending:"in attesa",approved:"Approvato",addMembers:"Aggiungi membri per vedere l'analisi",iCalTitle:"URL iscrizione iCal",iCalDesc:"Aggiungi questo URL a Google Calendar, Outlook o Apple Calendar.",widgetDesc:"Widget compatto che mostra chi è assente questa settimana.",offToday:"Giorno non lavorativo oggi",shareThis:"Condividi questo strumento",teamsCreated:"Team",totalMembers:"Membri",live:"In diretta",addComment:"Aggiungi commento...",daysUntil:"giorni alle ferie",tomorrow:"Domani!",teamMap:"Paesi del team",fullTeam:"Team al completo!",outToday:"Assenti",trips:"Viaggi di lavoro",trip:"viaggio",addTrip:"Aggiungi",editTrip:"Modifica",dest:"Destinazione",startDate:"Inizio",endDate:"Fine",project:"Progetto",noTrips:"Nessun viaggio",noTripsDesc:"Monitora i viaggi del team.",cancel:"Annulla",save:"Salva",M:["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"]},
bg:{brand:"Планер за отпуски на екипа",tag1:"Лесно планиране на отпуските в екипа.",tag2:"Вижте кой отсъства и избегнете припокривания.",crt:"Създаване на екип",crSub:"Нов календар за отпуски",jnt:"Присъединяване към екип",jnSub:"Въведете код или линк на екипа",tn:"Име на екипа",tnP:"напр. Маркетинг, Разработка",vy:"Година",cr:"Създайте",jc:"Код или линк",jcP:"Поставете код",jn:"Присъединяване",nf:"Не е намерен.",mt:"Моите екипи",mb:"член",mbs:"членове",tm:"Членове на екипа",am:"Добавяне на член",en2:"Име на колега…",add:"Добавете",can:"Отказ",mx:"Макс 50",mr:"Премахнат",nd:"Няма отпуск",dy:"ден",dys:"дни",ed:"Редактиране",tap:"Натиснете или плъзнете за избор на дати",sel:"Изберете колега за редактиране",et:"Екипът е създаден!",es2:"Добавете първия колега и изберете дати.",af:"Добавете първия",leg:"Легенда",ol:"Припокриване",os:"Резюме",ndy:"Все още няма планирани отпуски.",dol:"дни с 2+ отсъстващи",sh:"Споделете",sht:"Споделяне на линк",shs:"Всеки с този линк може да вижда и редактира",cl:"Копирайте",cp:"Копирано!",lne:"Линкът е постоянен.",tc:"Код",bf:"За екипи до 50 души",ch:"Официални празници",tv:"Официални празници на екипа",co:"Държава",hol:"официални празници",selC:"Изберете…",close:"Затворете",
cal:"Календар",heatmap:"Карта на натовареност",timeline:"Времева линия",coverage:"Наличност",summary:"Обобщение",
lock:"Заключване на таблото",unlock:"Отключване на таблото",locked:"Таблото е заключено от администратор",export:"Експорт в ICS",pdf:"PDF справка",embed:"Код за вграждане",
wk:"Работен ден",we:"Почивен ден",conflictWarn:"Внимание: {n} колеги отсъстват на {date}",threshold:"Праг за предупреждение",
mo:"По",tu:"Вт",we2:"Ср",th:"Чт",fr:"Пт",sa:"Сб",su:"Нд",
about:"За приложението",contact:"Обратна връзка",contactTitle:"Свържете се с нас",contactSub:"Ще се радваме на вашата обратна връзка",sendFeedback:"Изпращане",thankYou:"Благодарим ви!",thankYouSub:"Вашият имейл клиент ще се отвори с готово съобщение.",yourEmail:"Вашият имейл адрес",subjectLabel:"Тема",messageLabel:"Съобщение",selectTopic:"Изберете тема…",emailPlaceholder:"vashiat@email.bg",msgPlaceholder:"Какво искате да ни кажете? (мин. 10 символа)",chars:"символа",emailNote:"Отваря вашия имейл клиент. Имейлът ви се използва единствено за отговор.",gotIt:"Разбрах",back:"Назад",subFeedback:"Обратна връзка",subBug:"Съобщаване за грешка",subSuggestion:"Предложение за подобрение",subQuestion:"Въпрос / Как да...",subPartner:"Партньорство / Интеграция",subData:"Корекция на данни (Празници)",subOther:"Друго",noActivity:"Все още няма активност.",activityLog:"Дневник на промените",bestDays:"Най-добри дни за мостово ползване за",copyEmbed:"Копиране на кода",holiday:"Официален празник",avgCov:"Средна наличност",lowWeek:"Най-слаба седмица",weeksLow:"Седмици под 70%",inOffice:"В офиса",onVac:"В отпуск",outToday:"Отсъстващи днес",nextVac:"Следващ",today:"Днес",printBtn:"Печат / Запазване като PDF",sheetsTitle:"Поток за Google Sheets",sheetsSub:"Използвайте =IMPORTDATA(url) в Google Sheets",cookieMsg:"Това приложение използва локално хранилище за запазване на настройките. Не се събират лични данни.",
workDays:"Работни дни",stdWeek:"Стандарт (Пон–Пет)",fullWeek:"7-дневен режим",
natOnly:"Само национални",region:"Регион",pto:"Дни",role:"Роля",setApprover:"Задай одобряващ",approverLabel:"Одобряващ",teamApproval:"Одобрение на екипа",approveAll:"Одобри всички",workDaysLeft:"работни дни остават",holCount:"празници",subscribe:"Абониране",widget:"Уиджет",copySubURL:"Копирай URL за абонамент",copyWidget:"Копирай уиджет",analytics:"Анализ",totalVacDays:"Общо дни отпуск",overlapDays:"Припокривания",peakMonth:"Пиков месец",avgDays:"Средно дни/човек",monthlyDist:"Месечно разпределение",memberBreak:"По членове",approvedPdf:"Одобрен PDF",approvalCert:"Сертификат за одобрение",alertLabel:"Предупреждение",pending:"в изчакване",approved:"Одобрен",addMembers:"Добавете членове за анализ",iCalTitle:"iCal URL за абонамент",iCalDesc:"Добавете този URL в Google Calendar, Outlook или Apple Calendar.",widgetDesc:"Компактен уиджет показващ кой отсъства тази седмица.",offToday:"Неработен ден днес",shareThis:"Споделете този инструмент",teamsCreated:"Екипи",totalMembers:"Членове",live:"На живо",addComment:"Добави коментар...",daysUntil:"дни до отпуска",tomorrow:"Утре!",teamMap:"Страни на екипа",fullTeam:"Целият екип е тук!",outToday:"Отсъстващи",trips:"Командировки",trip:"командировка",addTrip:"Добави",editTrip:"Редактирай",dest:"Дестинация",startDate:"Начало",endDate:"Край",project:"Проект",noTrips:"Няма командировки",noTripsDesc:"Проследявайте пътуванията на екипа.",cancel:"Отказ",save:"Запази",M:["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"]},
ar:{brand:"مخطط إجازات الفريق",tag1:"تخطيط إجازات فريقك بسهولة.",tag2:"اعرف من في إجازة وتجنب التعارضات.",crt:"إنشاء فريق",crSub:"لوحة إجازات جديدة",jnt:"انضم لفريق",jnSub:"أدخل رمز الفريق",tn:"الاسم",tnP:"مثال: الهندسة",vy:"السنة",cr:"إنشاء",jc:"رمز أو رابط",jcP:"الصق الرمز",jn:"انضم",nf:"غير موجود.",mt:"فرقي",mb:"عضو",mbs:"أعضاء",tm:"الأعضاء",am:"إضافة عضو",en2:"الاسم…",add:"إضافة",can:"إلغاء",mx:"الحد الأقصى 50",mr:"تمت الإزالة",nd:"لا أيام",dy:"يوم",dys:"أيام",ed:"تعديل",tap:"انقر أو اسحب",sel:"اختر عضوا",et:"الفريق جاهز!",es2:"أضف عضوا.",af:"أضف أول عضو",leg:"المفتاح",ol:"تداخل",os:"ملخص",ndy:"لا أيام إجازة.",dol:"يوم/أيام 2+ غائبين",sh:"مشاركة",sht:"مشاركة الرابط",shs:"الوصول بالرابط",cl:"نسخ",cp:"تم النسخ!",lne:"رابط دائم.",tc:"الرمز",bf:"حتى 50 عضو",ch:"العطل الرسمية",tv:"عطل الفريق",co:"الدولة",hol:"عطلة",selC:"اختر دولة…",close:"إغلاق",
cal:"التقويم",heatmap:"خريطة حرارية",timeline:"الجدول الزمني",coverage:"التغطية",summary:"ملخص",
lock:"قفل",unlock:"فتح القفل",locked:"اللوحة مقفلة",export:"تصدير ICS",pdf:"تقرير PDF",embed:"كود التضمين",
wk:"يوم عمل",we:"عطلة نهاية الأسبوع",conflictWarn:"تنبيه: {n} غائبين في {date}",threshold:"حد التنبيه",
mo:"اث",tu:"ثل",we2:"أر",th:"خم",fr:"جم",sa:"سب",su:"أح",
natOnly:"وطني فقط",region:"المنطقة",pto:"أيام",role:"الدور",setApprover:"تعيين كموافق",approverLabel:"الموافق",teamApproval:"موافقة الفريق",approveAll:"الموافقة على الكل",workDaysLeft:"أيام عمل متبقية",holCount:"عطل",subscribe:"اشتراك",widget:"ويدجت",copySubURL:"نسخ رابط الاشتراك",copyWidget:"نسخ الويدجت",analytics:"تحليلات",totalVacDays:"إجمالي أيام الإجازة",overlapDays:"أيام التداخل",peakMonth:"شهر الذروة",avgDays:"متوسط أيام/شخص",monthlyDist:"التوزيع الشهري",memberBreak:"تفصيل لكل عضو",approvedPdf:"PDF معتمد",approvalCert:"شهادة الموافقة",alertLabel:"تنبيه",pending:"قيد الانتظار",approved:"معتمد",addMembers:"أضف أعضاء لعرض التحليلات",iCalTitle:"رابط اشتراك iCal",iCalDesc:"أضف هذا الرابط إلى تقويم Google أو Outlook أو Apple.",widgetDesc:"ويدجت مدمج يوضح من في إجازة هذا الأسبوع.",
about:"حول",contact:"اتصل بنا",contactTitle:"تواصل معنا",contactSub:"يسعدنا سماع رأيك",sendFeedback:"إرسال",thankYou:"شكرا لك!",thankYouSub:"سيفتح برنامج البريد الإلكتروني.",yourEmail:"بريدك الإلكتروني",subjectLabel:"الموضوع",messageLabel:"الرسالة",selectTopic:"اختر موضوعا…",emailPlaceholder:"email@example.com",msgPlaceholder:"ما الذي تود إخبارنا به؟ (10 أحرف كحد أدنى)",chars:"أحرف",emailNote:"يفتح برنامج البريد الإلكتروني. يستخدم بريدك للرد فقط.",gotIt:"فهمت",back:"رجوع",subFeedback:"ملاحظات عامة",subBug:"الإبلاغ عن خطأ",subSuggestion:"اقتراح",subQuestion:"سؤال",subPartner:"شراكة / تكامل",subData:"تصحيح بيانات (عطل)",subOther:"أخرى",noActivity:"لا يوجد نشاط.",activityLog:"سجل النشاط",bestDays:"أفضل الأيام لـ",copyEmbed:"نسخ كود التضمين",holiday:"عطلة رسمية",avgCov:"متوسط التغطية",lowWeek:"أدنى أسبوع",weeksLow:"أسابيع أقل من 70%",inOffice:"في المكتب",onVac:"في إجازة",outToday:"غائبون اليوم",nextVac:"التالي",today:"اليوم",printBtn:"طباعة / حفظ كـ PDF",sheetsTitle:"خلاصة Google Sheets",sheetsSub:"استخدم =IMPORTDATA(url) في Google Sheets",cookieMsg:"يستخدم هذا التطبيق التخزين المحلي لحفظ إعداداتك. لا يتم جمع بيانات شخصية.",
offToday:"يوم عطلة اليوم",shareThis:"شارك هذه الأداة",teamsCreated:"فرق",totalMembers:"أعضاء",live:"مباشر",addComment:"أضف تعليقاً...",daysUntil:"يوم حتى الإجازة",tomorrow:"غداً!",teamMap:"دول الفريق",fullTeam:"الفريق كامل!",outToday:"غائبون اليوم",trips:"رحلات عمل",trip:"رحلة",addTrip:"إضافة",editTrip:"تعديل",dest:"الوجهة",startDate:"البداية",endDate:"النهاية",project:"المشروع",noTrips:"لا توجد رحلات",noTripsDesc:"تتبع رحلات الفريق.",cancel:"إلغاء",save:"حفظ",M:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]},
};

// ─── Themes (frosted glass) ────────────────────────────────────────

export const G={blur:"blur(16px) saturate(1.4)",r:24,rSm:18,rXs:14,hi:"0 1px 8px rgba(99,102,241,0.06)",hiStrong:"0 2px 16px rgba(99,102,241,0.1)"};
const TH={
light:{bg:"linear-gradient(145deg, #FEF7FF 0%, #F0F4FF 50%, #F0FFF4 100%)",sf:"rgba(255,255,255,0.85)",sh:"rgba(237,233,254,0.5)",sa:"rgba(243,232,255,0.5)",bd:"rgba(147,51,234,0.08)",bl:"rgba(147,51,234,0.05)",tx:"#4C1D95",t2:"#6D28D9",t3:"#6D5BA8",ti:"#FFF",ac:"#7C3AED",ah:"#6D28D9",al:"rgba(124,58,237,0.08)",am:"#C4B5FD",wm:"#F59E0B",wl:"rgba(245,158,11,0.06)",sd:G.hi,sm:G.hiStrong,sl:"0 12px 40px rgba(99,102,241,0.12)",gd:"linear-gradient(135deg,#818CF8,#6366F1)",hc:"rgba(239,68,68,0.08)",ht:"#E11D48",gbg:"rgba(255,255,255,0.7)",gbd:"rgba(147,51,234,0.1)"},
dark:{bg:"linear-gradient(145deg, #13111C 0%, #1A1625 50%, #110F1A 100%)",sf:"rgba(30,25,50,0.85)",sh:"rgba(55,48,88,0.5)",sa:"rgba(76,29,149,0.2)",bd:"rgba(139,92,246,0.15)",bl:"rgba(139,92,246,0.08)",tx:"#EDE9FE",t2:"#C4B5FD",t3:"#A78BFA",ti:"#13111C",ac:"#A78BFA",ah:"#8B5CF6",al:"rgba(167,139,250,0.12)",am:"#3B2370",wm:"#FBBF24",wl:"rgba(251,191,36,0.08)",sd:"0 2px 12px rgba(0,0,0,0.3)",sm:"0 4px 20px rgba(0,0,0,0.4)",sl:"0 16px 48px rgba(0,0,0,0.5)",gd:"linear-gradient(135deg,#8B5CF6,#6366F1)",hc:"rgba(239,68,68,0.15)",ht:"#FB7185",gbg:"rgba(30,25,50,0.75)",gbd:"rgba(139,92,246,0.12)"},
pink:{bg:"linear-gradient(145deg, #FFF0F6 0%, #FCE7F3 50%, #FDF2F8 100%)",sf:"rgba(255,255,255,0.8)",sh:"rgba(252,231,243,0.6)",sa:"rgba(251,207,232,0.4)",bd:"rgba(236,72,153,0.1)",bl:"rgba(236,72,153,0.06)",tx:"#831843",t2:"#9D174D",t3:"#A3245F",ti:"#FFF",ac:"#BE185D",ah:"#DB2777",al:"rgba(236,72,153,0.08)",am:"#F9A8D4",wm:"#F59E0B",wl:"rgba(245,158,11,0.06)",sd:"0 1px 8px rgba(236,72,153,0.06)",sm:"0 2px 16px rgba(236,72,153,0.1)",sl:"0 12px 40px rgba(236,72,153,0.15)",gd:"linear-gradient(135deg,#EC4899,#A855F7)",hc:"rgba(239,68,68,0.08)",ht:"#E11D48",gbg:"rgba(255,255,255,0.65)",gbd:"rgba(236,72,153,0.1)"},
};

function computeRegionalHolidays(cc, regionId, year) {
  if (!regionId || !REGIONS[cc]) return [];
  const region = REGIONS[cc].find(function(r){ return r.id === regionId; });
  if (!region) return [];
  var all = [];
  var fixed = region.add || [];
  for (var i = 0; i < fixed.length; i++) { all.push(year + "-" + fixed[i]); }
  // Easter-based regional holidays
  var we = westernEaster(year);
  if (region.maundy) { var mt = addDays(year, we.m, we.d, -3); all.push(dFmt(year, mt.m, mt.d)); }
  if (region.eMon) { var em = addDays(year, we.m, we.d, 1); all.push(dFmt(year, em.m, em.d)); }
  if (region.gFri) { var gf = addDays(year, we.m, we.d, -2); all.push(dFmt(year, gf.m, gf.d)); }
  if (region.cc) { var cc2 = addDays(year, we.m, we.d, 60); all.push(dFmt(year, cc2.m, cc2.d)); }
  if (region.ascen) { var asc = addDays(year, we.m, we.d, 39); all.push(dFmt(year, asc.m, asc.d)); }
  if (region.whitMon) { var wm = addDays(year, we.m, we.d, 50); all.push(dFmt(year, wm.m, wm.d)); }
  if (region.assumption) all.push(year + "-08-15");
  if (region.allSaints) all.push(year + "-11-01");
  // AU & CA dynamic regional holidays
  if (cc === "AU") {
    if (regionId === "NSW") all.push(dFmt(year, 8, nthWeekday(year, 8, 1, 1)));
    if (regionId === "VIC") { all.push(dFmt(year, 3, nthWeekday(year, 3, 1, 2))); all.push(dFmt(year, 11, nthWeekday(year, 11, 2, 1))); }
    if (regionId === "QLD") { all.push(dFmt(year, 5, nthWeekday(year, 5, 1, 1))); }
    if (regionId === "WA_AU") { all.push(dFmt(year, 6, nthWeekday(year, 6, 1, 1))); all.push(dFmt(year, 9, lastWeekday(year, 9, 1))); }
    if (regionId === "SA_AU") { all.push(dFmt(year, 3, nthWeekday(year, 3, 1, 2))); all.push(dFmt(year, 10, nthWeekday(year, 10, 1, 1))); }
    if (regionId === "TAS") { all.push(dFmt(year, 2, nthWeekday(year, 2, 1, 2))); }
  }
  if (cc === "CA") {
    if (regionId === "ON" || regionId === "BC" || regionId === "AB") {
      all.push(dFmt(year, 2, nthWeekday(year, 2, 1, 3))); // Family Day
      all.push(dFmt(year, 8, nthWeekday(year, 8, 1, 1))); // Civic/Heritage
    }
  }
  return all;
}

export function getAllHolidays(member, year) {
  var base = computeHolidays(member.country, year);
  var regional = computeRegionalHolidays(member.country, member.region, year);
  var combined = {};
  for (var i = 0; i < base.length; i++) combined[base[i]] = 1;
  for (var i = 0; i < regional.length; i++) combined[regional[i]] = 1;
  return Object.keys(combined);
}

export const F="'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif";
export const FM="'SF Mono','Fira Code',monospace";
export const MC=[{b:"#DBEAFE",t:"#1E40AF",d:"#3B82F6"},{b:"#FCE7F3",t:"#9D174D",d:"#EC4899"},{b:"#D1FAE5",t:"#065F46",d:"#10B981"},{b:"#FEF3C7",t:"#92400E",d:"#F59E0B"},{b:"#E0E7FF",t:"#3730A3",d:"#6366F1"},{b:"#FFE4E6",t:"#9F1239",d:"#F43F5E"},{b:"#CCFBF1",t:"#134E4A",d:"#14B8A6"},{b:"#FED7AA",t:"#9A3412",d:"#F97316"},{b:"#E9D5FF",t:"#6B21A8",d:"#A855F7"},{b:"#CFFAFE",t:"#155E75",d:"#06B6D4"},{b:"#FEE2E2",t:"#991B1B",d:"#EF4444"},{b:"#D9F99D",t:"#3F6212",d:"#84CC16"},{b:"#FBCFE8",t:"#831843",d:"#F472B6"},{b:"#BAE6FD",t:"#0C4A6E",d:"#0EA5E9"},{b:"#FDE68A",t:"#78350F",d:"#FBBF24"},{b:"#C7D2FE",t:"#3730A3",d:"#818CF8"},{b:"#A7F3D0",t:"#064E3B",d:"#34D399"},{b:"#FECACA",t:"#7F1D1D",d:"#F87171"},{b:"#DDD6FE",t:"#5B21B6",d:"#8B5CF6"},{b:"#99F6E4",t:"#115E59",d:"#2DD4BF"},{b:"#FDE047",t:"#713F12",d:"#EAB308"},{b:"#F0ABFC",t:"#701A75",d:"#D946EF"},{b:"#67E8F9",t:"#164E63",d:"#22D3EE"},{b:"#FDA4AF",t:"#881337",d:"#FB7185"},{b:"#86EFAC",t:"#14532D",d:"#4ADE80"},{b:"#FED7AA",t:"#7C2D12",d:"#EA580C"},{b:"#A5F3FC",t:"#155E75",d:"#0891B2"},{b:"#DDD6FE",t:"#5B21B6",d:"#7C3AED"},{b:"#FBCFE8",t:"#9D174D",d:"#DB2777"},{b:"#BBF7D0",t:"#166534",d:"#16A34A"},{b:"#FECACA",t:"#991B1B",d:"#DC2626"},{b:"#FEF08A",t:"#854D0E",d:"#CA8A04"},{b:"#BFDBFE",t:"#1E3A8A",d:"#2563EB"},{b:"#F5D0FE",t:"#86198F",d:"#C026D3"},{b:"#A7F3D0",t:"#065F46",d:"#059669"},{b:"#FDA4AF",t:"#9F1239",d:"#E11D48"},{b:"#BAE6FD",t:"#075985",d:"#0284C7"},{b:"#FDE68A",t:"#92400E",d:"#D97706"},{b:"#C7D2FE",t:"#312E81",d:"#4F46E5"},{b:"#FBCFE8",t:"#831843",d:"#BE185D"},{b:"#99F6E4",t:"#134E4A",d:"#0D9488"},{b:"#E9D5FF",t:"#581C87",d:"#9333EA"},{b:"#FEF3C7",t:"#78350F",d:"#B45309"},{b:"#A7F3D0",t:"#14532D",d:"#15803D"},{b:"#FECDD3",t:"#881337",d:"#BE123C"},{b:"#DDD6FE",t:"#4C1D95",d:"#6D28D9"},{b:"#67E8F9",t:"#0E7490",d:"#0E7490"},{b:"#D9F99D",t:"#365314",d:"#65A30D"},{b:"#FED7AA",t:"#9A3412",d:"#C2410C"},{b:"#FCE7F3",t:"#831843",d:"#A21CAF"}];

// ─── Utilities ───────────────────────────────────────────────────
export const gid=()=>{var a=new Uint8Array(16);crypto.getRandomValues(a);return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join("");};
export const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

export const dim=(y,m)=>new Date(y,m+1,0).getDate();
export const fdm=(y,m)=>{const d=new Date(y,m,1).getDay();return d===0?6:d-1;};
export const dk=(y,m,d)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
export const pk=k=>{const[y,m,d]=k.split("-").map(Number);return{y,m:m-1,d};};
export const isWe=(y,m,d)=>{const w=new Date(y,m,d).getDay();return w===0||w===6;};
export const N=new Date(),CY=N.getFullYear(),CM=N.getMonth(),CD=N.getDate();
// Reports and exports only ever see well-formed values (stops HTML hidden in a year, date or number field)
const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
export const safeYear=t=>{const y=Number(t&&t.year);return Number.isInteger(y)&&y>=2000&&y<=2100?y:CY;};
export function reportSafe(team){
  const isObj=v=>!!v&&typeof v==="object";
  return {...team,year:safeYear(team),name:String(team&&team.name||""),
    members:(Array.isArray(team&&team.members)?team.members:[]).filter(isObj).map(m=>({...m,name:String(m.name||""),
      country:typeof m.country==="string"&&/^[A-Z]{2}$/.test(m.country)?m.country:null,
      days:(Array.isArray(m.days)?m.days:[]).filter(d=>typeof d==="string"&&ISO_DATE.test(d)),
      half:(Array.isArray(m.half)?m.half:[]).filter(d=>typeof d==="string"&&ISO_DATE.test(d)),
      pto:Number.isFinite(Number(m.pto))&&m.pto!==null&&m.pto!==""?Number(m.pto):null})),
    trips:(Array.isArray(team&&team.trips)?team.trips:[]).filter(t=>isObj(t)&&ISO_DATE.test(String(t.start))&&ISO_DATE.test(String(t.end)))};
}

// Team links arrive as #team=ID (app) or ?team=ID (widget/embed); read both
const linkParams=()=>{try{return (window.location.hash||"")+"&"+(window.location.search||"").replace(/^\?/,"");}catch(e){return "";}};

// ─── Year switching ──────────────────────────────────────────────
// A team is stored once, with every year's days in the same record (days are full dates).
// The workspace always works on a one-year "view" of it; mergeYearView folds an edited
// view back into the stored record without touching the other years.
export const YEAR_MIN=2026,YEAR_MAX=2035;
const clampYear=y=>Math.min(YEAR_MAX,Math.max(YEAR_MIN,y));
const baseYearOf=team=>(team&&team.year)||CY;
// Year a team opens on: the current year once the team's own year has passed, else its own year.
const defaultViewYear=team=>{const b=baseYearOf(team);return clampYear(CY>b?CY:b);};
// Used days: a half day counts 0.5 (half = subset of days)
export const usedOf=m=>{const h=new Set((m&&m.half)||[]);let n=0;((m&&m.days)||[]).forEach(x=>{n+=h.has(x)?0.5:1;});return n;};
// Allowance for a year: the base year uses m.pto (as always); other years m.ptoY[y], falling back to m.pto
const allowanceOf=(m,y,base)=>y===base?m.pto:(m.ptoY&&m.ptoY[y]!=null?m.ptoY[y]:m.pto);
const tripInYear=(tr,yr)=>!tr||!tr.start||!tr.end||(String(tr.start).slice(0,4)<=String(yr)&&String(tr.end).slice(0,4)>=String(yr));
export function teamForYear(raw,yr){
  if(!raw)return raw;
  const p=yr+"-",base=baseYearOf(raw);
  const v={...raw,year:yr,_vy:yr};
  const cmax=Math.max(0,Math.min(60,Number(raw.carryMax)||0));
  v.members=(Array.isArray(raw.members)?raw.members:[]).filter(m=>m&&typeof m==="object").map(m=>{
    const nm={...m};
    if(Array.isArray(m.days))nm.days=m.days.filter(d=>typeof d!=="string"||d.indexOf(p)===0);
    if(Array.isArray(m.half))nm.half=m.half.filter(d=>typeof d!=="string"||d.indexOf(p)===0);
    if(yr!==base){nm.approved=!!(m.apY&&m.apY[yr]);const a=allowanceOf(m,yr,base);if(a!=null)nm.pto=a;else delete nm.pto;}
    nm._pto0=nm.pto;
    // Carry-over: unused days of the previous year, up to the team's limit
    if(cmax>0&&yr-1>=base){const pa=allowanceOf(m,yr-1,base);if(pa){const pp=(yr-1)+"-";const used=usedOf({days:(m.days||[]).filter(d=>typeof d==="string"&&d.indexOf(pp)===0),half:m.half});const left=Math.max(0,pa-used);if(left>0)nm.carry=Math.min(cmax,left);}}
    return nm;
  });
  if(Array.isArray(raw.trips))v.trips=raw.trips.filter(tr=>tripInYear(tr,yr));
  if(yr!==base)v.locked=!!(raw.lockY&&raw.lockY[yr]);
  return v;
}
function mergeYearView(view,raw){
  if(!view||view._vy==null)return view;
  const yr=view._vy,p=yr+"-";
  const out={...view};delete out._vy;
  if(!raw||raw.id!==view.id)return out;
  const base=baseYearOf(raw);
  if("year" in raw)out.year=raw.year;else delete out.year;
  const rawM={};(raw.members||[]).forEach(m=>{rawM[m.id]=m;});
  out.members=(view.members||[]).map(m=>{
    const r=rawM[m.id];const nm={...m};
    const p0=nm._pto0;delete nm._pto0;delete nm.carry;
    const keep=r&&Array.isArray(r.days)?r.days.filter(d=>typeof d==="string"&&d.indexOf(p)!==0):[];
    if(keep.length){const seen={};nm.days=keep.concat(m.days||[]).filter(d=>seen[d]?false:(seen[d]=true));}
    const keepH=r&&Array.isArray(r.half)?r.half.filter(d=>typeof d==="string"&&d.indexOf(p)!==0):[];
    if(keepH.length||Array.isArray(m.half)){const seen={};const hh=keepH.concat(m.half||[]).filter(d=>seen[d]?false:(seen[d]=true));if(hh.length||(r&&Array.isArray(r.half)))nm.half=hh;else delete nm.half;}
    if(yr!==base&&r){
      // An allowance edited while viewing this year belongs to this year only
      const ptoY={...(r.ptoY||{})};
      if(nm.pto!==p0){if(nm.pto==null)delete ptoY[yr];else ptoY[yr]=nm.pto;}
      if(Object.keys(ptoY).length)nm.ptoY=ptoY;else delete nm.ptoY;
      if("pto" in r)nm.pto=r.pto;else delete nm.pto;
    }
    if(yr!==base){
      const apY={...((r&&r.apY)||{})};if(m.approved===true)apY[yr]=true;else delete apY[yr];
      if(Object.keys(apY).length)nm.apY=apY;else delete nm.apY;
      if(r&&"approved" in r)nm.approved=r.approved;else delete nm.approved;
    }
    return nm;
  });
  const otherTrips=Array.isArray(raw.trips)?raw.trips.filter(tr=>!tripInYear(tr,yr)):[];
  if(otherTrips.length)out.trips=otherTrips.concat(view.trips||[]);
  if(yr!==base){
    const lockY={...(raw.lockY||{})};if(view.locked)lockY[yr]=true;else delete lockY[yr];
    if(Object.keys(lockY).length)out.lockY=lockY;else delete out.lockY;
    if("locked" in raw)out.locked=raw.locked;else delete out.locked;
  }
  return out;
}

// ─── Storage (hybrid: API for teams, localStorage for prefs, window.storage for artifact sandbox) ───
const API_BASE = "/api/team";
// ─── Team sync: one save at a time per team, versioned, merged on conflict ───
// VER = server version (X-Updated-At) this browser last saw; BASE = that version's JSON (for 3-way merges).
const SYNC={VER:{},BASE:{},PENDING:{},INFLIGHT:{},listeners:new Set()};
const syncIdle=id=>!SYNC.INFLIGHT[id]&&!SYNC.PENDING[id];
// PIN tokens (per tab) and owner keys (per browser): proofs the server checks before changing protected members
export const authKey=id=>"tvp-tok-"+id;
export const getTokens=id=>{try{return JSON.parse(sessionStorage.getItem(authKey(id))||"{}")||{};}catch(e){return {};}};
export const getOwner=id=>{try{return localStorage.getItem("tvp-owner-"+id)||"";}catch(e){return "";}};
const setOwner=(id,key)=>{try{if(key)localStorage.setItem("tvp-owner-"+id,key);}catch(e){}};
export const waitIdle=async id=>{for(let i=0;i<100&&!syncIdle(id);i++)await new Promise(r=>setTimeout(r,100));};
function syncNotify(id,doc){SYNC.listeners.forEach(fn=>{try{fn(id,doc);}catch(e){}});}
// Reload a team from the server and show it (after the server refused part of a save, or after a PIN change).
// Never while an edit is still waiting to be saved: that edit would disappear from the screen.
export async function syncReload(id,reverted){
  try{
    if(reverted)window.dispatchEvent(new CustomEvent("tvp-reverted"));
    if(!syncIdle(id))return;
    const r=await fetch(API_BASE+"?id="+id,{cache:"no-store"});if(!r.ok)return;const d=await r.json();if(!d||!syncIdle(id))return;
    const v=r.headers.get("X-Updated-At");if(v){SYNC.VER[id]=v;SYNC.BASE[id]=JSON.stringify(d);}syncNotify(id,d);
  }catch(e){}
}
const putTeam=(id,data)=>fetch(API_BASE+"?id="+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,data,base:SYNC.VER[id]||null,tokens:getTokens(id),owner:getOwner(id)||undefined})});
// After a successful save: remember the version, keep the owner key of a brand-new team, react to reverts
async function syncAccepted(id,res,doc){
  const j=await res.json().catch(()=>({}));
  if(j&&j.owner)setOwner(id,j.owner);
  if(j&&j.v){SYNC.VER[id]=j.v;SYNC.BASE[id]=JSON.stringify(doc);}
  if(j&&j.reverted&&j.reverted.length)syncReload(id,true);
}
async function syncFlush(id){
  if(SYNC.INFLIGHT[id])return;
  while(SYNC.PENDING[id]){
    const doc=SYNC.PENDING[id];delete SYNC.PENDING[id];
    SYNC.INFLIGHT[id]=true;
    let retry=false;
    try{
      let res=await putTeam(id,doc);
      if(res.status===409){
        // Someone else saved in between: 3-way merge their version with ours and save again
        const cur=await res.json();
        const base=SYNC.BASE[id]?JSON.parse(SYNC.BASE[id]):null;
        const mine=SYNC.PENDING[id]||doc;delete SYNC.PENDING[id];
        const merged=mergeTeam(base,mine,cur.data);
        SYNC.VER[id]=cur.v;SYNC.BASE[id]=JSON.stringify(cur.data);
        res=await putTeam(id,merged);
        if(res.ok){
          await syncAccepted(id,res,merged);
          // Edits made while the retry was in flight are rebased onto the merged result, never over it
          if(SYNC.PENDING[id]){SYNC.PENDING[id]=mergeTeam(mine,SYNC.PENDING[id],merged);syncNotify(id,SYNC.PENDING[id]);}
          else syncNotify(id,merged);
        }else{
          SYNC.PENDING[id]=SYNC.PENDING[id]?mergeTeam(mine,SYNC.PENDING[id],merged):merged;
          syncNotify(id,SYNC.PENDING[id]);
          if(res.status!==409)retry=true;
        }
      }else if(res.ok){
        await syncAccepted(id,res,doc);
      }else if(res.status===429||res.status>=500){
        // Busy or rate-limited: keep the newest edit and try again
        if(!SYNC.PENDING[id])SYNC.PENDING[id]=doc;retry=true;
      }else{
        const j=await res.json().catch(()=>({}));
        window.dispatchEvent(new CustomEvent("tvp-save-error",{detail:j&&j.error||"Not saved"}));
      }
    }catch(e){
      // Offline: keep the newest edit queued
      if(!SYNC.PENDING[id])SYNC.PENDING[id]=doc;retry=true;
    }
    SYNC.INFLIGHT[id]=false;
    if(retry){setTimeout(()=>syncFlush(id),5000);return;}
  }
}
const db={
  async sv(k,d,s=false){
    try {
      // Team data → API (production) or window.storage (artifact sandbox)
      if(k.startsWith("team:")&&s){
        var teamId=k.replace("team:","");
        SYNC.PENDING[teamId]=d;syncFlush(teamId);
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
        try{var res=await fetch(API_BASE+"?id="+teamId,{cache:"no-store"});if(res.ok){var data=await res.json();if(data){var v=res.headers.get("X-Updated-At");if(v&&syncIdle(teamId)){SYNC.VER[teamId]=v;SYNC.BASE[teamId]=JSON.stringify(data);}return data;}}}catch(e){}
      }
      // Try window.storage (artifact sandbox)
      if(window.storage){try{var r=await window.storage.get(k,s);if(r)return JSON.parse(r.value);}catch(e){}}
      // Try localStorage
      try{var ls=localStorage.getItem(k);if(ls)return JSON.parse(ls);}catch(e){}
      return null;
    }catch(e){return null;}
  },
  async del(k,s=false){
    try{
      if(k.startsWith("team:")&&s){
        var teamId=k.replace("team:","");
        try{await fetch(API_BASE+"?id="+teamId,{method:"DELETE"});}catch(e){}
      }
      if(window.storage){try{await window.storage.delete(k,s);}catch(e){}}
      if(!s){try{localStorage.removeItem(k);}catch(e){}}
    }catch(e){}
  }
};

// Safe file name from a team name: no path or reserved characters, max 60 chars
export function fileBase(name){var b=String(name||"team").replace(/<[^>]*>/g,"").replace(/[\\/:*?"<>|#%&{}$!'`@+=]+/g,"").replace(/\s+/g,"_").replace(/_+/g,"_").replace(/^[_.]+|[_.]+$/g,"").slice(0,60);return b||"team";}

// Shows a progress cursor while an export runs
export function withBusy(p){try{document.body.style.cursor="progress";}catch(e){}return Promise.resolve(p).finally(function(){try{document.body.style.cursor="";}catch(e){}});}

export function _fd(d,mo){var p=d.split("-");return parseInt(p[2])+" "+mo[parseInt(p[1])-1];}
export function _fd2(dt,mo){return dt.getDate()+" "+mo[dt.getMonth()];}


// ─── Print View Component ────────────────────────────────────────
function PrintView({ team, th, t }) {
  const yr = safeYear(team);
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
      <button onClick={() => R("printReport")(team, t)} style={{
        padding: "12px 32px", borderRadius: 10, border: "none", background: "#7C3AED", color: "#fff",
        fontSize: 15, fontWeight: 700, fontFamily: F, cursor: "pointer",
      }}>{t.printBtn}</button>
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
  // Next vacation = the first future day that starts a run (the day before is not a vacation day)
  const prevDay = (d) => { const p = pk(d); const x = new Date(p.y, p.m, p.d - 1); return dk(x.getFullYear(), x.getMonth(), x.getDate()); };
  team.members.forEach(m => {
    const set = new Set(m.days || []);
    set.forEach(d => {
      if (typeof d === "string" && d > today && !set.has(prevDay(d))) future.push({ name: m.name, date: d });
    });
  });
  // Office screens keep the widget open all day: reload every 30 minutes
  useEffect(() => { const id = setTimeout(() => { try { window.location.reload(); } catch (e) {} }, 30 * 60 * 1000); return () => clearTimeout(id); }, []);
  future.sort((a, b) => a.date.localeCompare(b.date));
  if (future.length) nextVac = future[0];

  return <div style={{ padding: 20, fontFamily: F, maxWidth: 400, margin: "0 auto" }}>
    <div style={{ background: th.sf, borderRadius: 16, border: `1px solid ${th.bd}`, overflow: "hidden", boxShadow: th.sm }}>
      <div style={{ padding: "16px 20px", background: th.al, borderBottom: `1px solid ${th.bd}` }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: th.ac }}>{team.name}</div>
        <div style={{ fontSize: 12, color: th.t2, marginTop: 2 }}>{X("today")} · {new Date().toLocaleDateString(dateLocale(), { weekday: "long", month: "short", day: "numeric" })}</div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#10B981" }}>{inToday.length}</div>
            <div style={{ fontSize: 11, color: th.t3, fontWeight: 600 }}>{X("inOffice")}</div>
          </div>
          <div style={{ width: 1, background: th.bd }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#DC2626" }}>{outToday.length}</div>
            <div style={{ fontSize: 11, color: th.t3, fontWeight: 600 }}>{X("onVac")}</div>
          </div>
        </div>
        {outToday.length > 0 && <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: th.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{X("outToday")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {outToday.map(m => {
              const i = team.members.indexOf(m);
              const c = MC[i % MC.length];
              return <span key={m.id} style={{ padding: "3px 10px", background: c.b, color: c.t, borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{m.name}</span>;
            })}
          </div>
        </div>}
        {nextVac && <div style={{ padding: "10px 12px", background: th.bg, borderRadius: 8, fontSize: 12, color: th.t2 }}>
          {X("next")}: <strong style={{ color: th.tx }}>{nextVac.name}</strong> {X("starts")} {(()=>{const p2=pk(nextVac.date);try{return new Date(p2.y,p2.m,p2.d,12).toLocaleDateString(dateLocale(),{weekday:"short",day:"numeric",month:"short"});}catch(e){return nextVac.date;}})()}
        </div>}
      </div>
    </div>
  </div>;
}

// ─── Visit Counter by Country ────────────────────────────────────
export function AnimNum({val}){var ref=useRef(null);var started=useRef(false);var[d,setD]=useState(0);useEffect(function(){if(!ref.current||started.current)return;var obs=new IntersectionObserver(function(en){if(en[0].isIntersecting&&!started.current){started.current=true;var s=performance.now();var tick=function(now){var p=Math.min((now-s)/1200,1);setD(Math.round((1-Math.pow(1-p,3))*val));if(p<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);obs.disconnect();}},{threshold:0.5});obs.observe(ref.current);return function(){obs.disconnect();};},[val]);return <span ref={ref}>{d.toLocaleString()}</span>;}
// Counts this visit once per browser session (same logic as before) and returns the totals
export function useVisits() {
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

  return visits;
}
function TeamStats({ th, t }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetch("/api/stats",{cache:"no-store"}).then(function(r){return r.json();}).then(function(data){
      if(data && typeof data.teams==="number") setStats(data);
    }).catch(function(){});
  }, []);

  if (!stats) return null;

  return <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
    <div style={{
      display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
      background: th.gbg, borderRadius: 14, border: "1px solid " + th.gbd,
      backdropFilter: G.blur, WebkitBackdropFilter: G.blur,
    }}>
      <Ic n="grid" s={13} c={th.t3}/>
      <span style={{ fontSize: 11, color: th.t3, fontWeight: 500 }}>{t.teamsCreated || "Teams"}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: th.ac, fontFamily: FM }}><AnimNum val={stats.teams}/></span>
    </div>
    <div style={{
      display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
      background: th.gbg, borderRadius: 14, border: "1px solid " + th.gbd,
      backdropFilter: G.blur, WebkitBackdropFilter: G.blur,
    }}>
      <Ic n="users" s={13} c={th.t3}/>
      <span style={{ fontSize: 11, color: th.t3, fontWeight: 500 }}>{t.totalMembers || "Members"}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: th.ac, fontFamily: FM }}><AnimNum val={stats.members}/></span>
    </div>
  </div>;
}

// ─── TSV Export for Google Sheets IMPORTDATA ─────────────────────
export function generateTSV(team, t) {
  team = reportSafe(team);
  const yr = safeYear(team);
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
export const Ic=({n,s=18,c="currentColor"})=>{const p={plus:<path d="M12 5v14M5 12h14" strokeWidth="1.8" strokeLinecap="round"/>,users:<Fragment><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeWidth="1.8"/><circle cx="9" cy="7" r="4" strokeWidth="1.8"/></Fragment>,link:<Fragment><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeWidth="1.8"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeWidth="1.8"/></Fragment>,copy:<Fragment><rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="1.8"/></Fragment>,check:<path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,chevL:<path d="M15 18l-6-6 6-6" strokeWidth="1.8" strokeLinecap="round"/>,chevR:<path d="M9 18l6-6-6-6" strokeWidth="1.8" strokeLinecap="round"/>,trash:<Fragment><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="1.8"/></Fragment>,edit:<Fragment><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="1.8"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="1.8"/></Fragment>,sun:<Fragment><circle cx="12" cy="12" r="5" strokeWidth="1.8"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="1.8"/></Fragment>,moon:<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeWidth="1.8"/>,heart:<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeWidth="1.8"/>,arrow:<path d="M5 12h14M12 5l7 7-7 7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>,x:<path d="M18 6L6 18M6 6l12 12" strokeWidth="1.8" strokeLinecap="round"/>,home:<Fragment><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="1.8"/><path d="M9 22V12h6v10" strokeWidth="1.8"/></Fragment>,share:<Fragment><circle cx="18" cy="5" r="3" strokeWidth="1.8"/><circle cx="6" cy="12" r="3" strokeWidth="1.8"/><circle cx="18" cy="19" r="3" strokeWidth="1.8"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" strokeWidth="1.8"/></Fragment>,globe:<Fragment><circle cx="12" cy="12" r="10" strokeWidth="1.8"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" strokeWidth="1.8"/></Fragment>,lock:<Fragment><rect x="3" y="11" width="18" height="11" rx="2" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="1.8"/></Fragment>,unlock:<Fragment><rect x="3" y="11" width="18" height="11" rx="2" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 019.9-1" strokeWidth="1.8"/></Fragment>,download:<Fragment><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeWidth="1.8"/><path d="M7 10l5 5 5-5M12 15V3" strokeWidth="1.8"/></Fragment>,code:<Fragment><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></Fragment>,flag:<Fragment><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeWidth="1.8"/><line x1="4" y1="22" x2="4" y2="15" strokeWidth="1.8"/></Fragment>,grid:<Fragment><rect x="3" y="3" width="7" height="7" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" strokeWidth="1.8"/></Fragment>,bar:<Fragment><line x1="18" y1="20" x2="18" y2="10" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" strokeWidth="2" strokeLinecap="round"/></Fragment>,mail:<Fragment><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="1.8"/><path d="M22 6l-10 7L2 6" strokeWidth="1.8"/></Fragment>,send:<Fragment><line x1="22" y1="2" x2="11" y2="13" strokeWidth="1.8"/><polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="1.8"/></Fragment>};return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} xmlns="http://www.w3.org/2000/svg">{p[n]}</svg>;};

export function Btn({children,v="primary",sz="md",icon,onClick,disabled,style={},th}){
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

const LangPk=({lang,set,th})=><div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center"}}>{Object.entries(LANGS).map(([k,v])=><button key={k} onClick={()=>set(k)} style={{padding:"3px 5px",borderRadius:6,fontSize:10,fontWeight:600,fontFamily:F,cursor:"pointer",border:k===lang?`1.5px solid ${th.ac}`:`1px solid ${th.bd}`,background:k===lang?th.al:"transparent",color:k===lang?th.ac:th.t2}}>{v.f}{v.l}</button>)}</div>;

export const LangDrop=({lang,set,th})=>{
  const cur=LANGS[lang]||LANGS.en;
  return <div style={{position:"relative",display:"inline-block"}}>
    <select aria-label="Language" value={lang} onChange={function(e){set(e.target.value);}} style={{
      appearance:"none",WebkitAppearance:"none",MozAppearance:"none",
      padding:"4px 24px 4px 8px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:F,
      cursor:"pointer",border:"1px solid "+th.gbd,background:th.gbg,color:th.tx,
      backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",
      backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239ca3af'/%3E%3C/svg%3E\")",
      backgroundRepeat:"no-repeat",backgroundPosition:"right 8px center",backgroundSize:"10px 6px",
      transition:"border-color .2s"
    }} onMouseEnter={function(e){e.currentTarget.style.borderColor=th.ac;}} onMouseLeave={function(e){e.currentTarget.style.borderColor=th.gbd;}}>
      {Object.entries(LANGS).map(function([k,v]){return <option key={k} value={k}>{v.f+" "+v.l}</option>;})}
    </select>
  </div>;
};
export const ThPk=({theme:t,set,th})=>{var ts=[{k:"light",bg:"#F2F1EE",ac:"#6366F1"},{k:"dark",bg:"#0B0F1A",ac:"#818CF8"},{k:"pink",bg:"#FFF0F5",ac:"#EC4899"}];return <div style={{display:"flex",gap:3}}>{ts.map(function(tm){return <button key={tm.k} onClick={function(){set(tm.k);}} title={tm.k} aria-label={"Theme: "+tm.k} aria-pressed={t===tm.k} style={{width:28,height:24,borderRadius:4,border:t===tm.k?"1.5px solid "+th.ac:"1px solid "+th.bd,background:tm.bg,cursor:"pointer",position:"relative",overflow:"hidden",padding:0}}><div style={{position:"absolute",bottom:0,left:0,right:0,height:4,background:tm.ac}}/></button>;})}</div>;};

// ─── Calendar with Drag Selection ────────────────────────────────
// ─── Holiday names card (tap or hover a holiday) ─────────────────
// Names come from public/hn/<cc>.json (python-holidays via NonWorkingDays, local + English). They only label
// days; which days are holidays is still decided by computeHolidays, so day counts never change.
const HN_CACHE={};const HN_PENDING={};
export function useHolidayNames(ccs){
  const key=[...new Set(ccs.filter(Boolean))].sort().join(",");
  const[,setTick]=useState(0);
  useEffect(()=>{
    let alive=true;
    key.split(",").filter(Boolean).forEach(cc=>{
      if(HN_CACHE[cc])return;
      if(!HN_PENDING[cc])HN_PENDING[cc]=fetch("/hn/"+cc.toLowerCase()+".json").then(r=>r.ok?r.json():null).catch(()=>null).then(d=>{HN_CACHE[cc]=d||{h:{}};});
      HN_PENDING[cc].then(()=>{if(alive)setTick(x=>x+1);});
    });
    return()=>{alive=false;};
  },[key]);
  return HN_CACHE;
}
// ─── Member Row ──────────────────────────────────────────────────
function SmoothNum({val,style:s}){var[d,setD]=useState(val);var p=useRef(val);useEffect(function(){if(val===p.current)return;var f=p.current;p.current=val;var t0=performance.now();var go=function(now){var r=Math.min((now-t0)/300,1);setD(Math.round(f+(val-f)*r));if(r<1)requestAnimationFrame(go);};requestAnimationFrame(go);},[val]);return <span style={s}>{d}</span>;}
// ─── Holiday Browser ─────────────────────────────────────────────
export function HolBrowser({onClose,th,t,year}){
  const[sel,setSel]=useState(null);
  const[q,setQ]=useState("");
  const[sort,setSort]=useState("az");
  const co=sel?EU_C.find(c=>c.c===sel):null;
  const hols=sel?computeHolidays(sel,year).map(h=>({date:h,name:holName(h)})).sort((a,b)=>a.date.localeCompare(b.date)):[];
  const maxHol=17;

  var filtered=EU_C.filter(function(c2){return !q||c2.n.toLowerCase().indexOf(q.toLowerCase())>=0;});
  if(sort==="most") filtered=filtered.slice().sort(function(a,b){return computeHolidays(b.c,year).length-computeHolidays(a.c,year).length;});

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,maxWidth:540,width:"100%",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:th.sl,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid "+th.bd,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {sel&&<button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}><Ic n="chevL" s={18} c={th.t2}/></button>}
          <h3 style={{margin:0,fontSize:17,fontWeight:700,color:th.tx,fontFamily:F}}>{sel?co.f+" "+co.n:t.ch} {year}</h3>
        </div>
        <button onClick={onClose} style={{background:th.sh,border:"none",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Ic n="x" s={15} c={th.t2}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
        {!sel?<Fragment>
          <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center"}}>
            <input value={q} onChange={function(e){setQ(e.target.value);}} placeholder={t.search||"Search countries..."} style={{flex:1,padding:"7px 12px",borderRadius:8,border:"1px solid "+th.gbd,background:th.sf,color:th.tx,fontSize:12,fontFamily:F,outline:"none"}}/>
            <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:"1px solid "+th.gbd}}>
              <button onClick={function(){setSort("az");}} style={{padding:"5px 10px",fontSize:10,fontWeight:700,background:sort==="az"?th.ac:"transparent",color:sort==="az"?"#fff":th.t3,border:"none",cursor:"pointer",fontFamily:F}}>A-Z</button>
              <button onClick={function(){setSort("most");}} style={{padding:"5px 10px",fontSize:10,fontWeight:700,background:sort==="most"?th.ac:"transparent",color:sort==="most"?"#fff":th.t3,border:"none",cursor:"pointer",fontFamily:F,borderLeft:"1px solid "+th.gbd}}>↓ {t.hol}</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            {filtered.map(function(c2){var cnt=computeHolidays(c2.c,year).length;var pct=Math.round(cnt/maxHol*100);return <button key={c2.c} onClick={function(){setSel(c2.c);setQ("");}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,background:th.sf,border:"1px solid "+th.gbd,cursor:"pointer",fontFamily:F,transition:"all .15s",textAlign:"left",width:"100%"}} onMouseEnter={function(e){e.currentTarget.style.borderColor=th.ac;e.currentTarget.style.background=th.al;}} onMouseLeave={function(e){e.currentTarget.style.borderColor=th.gbd;e.currentTarget.style.background=th.sf;}}>
              <span style={{fontSize:18,flexShrink:0}}>{c2.f}</span>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:th.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c2.n}</span>
              <div style={{width:50,height:4,borderRadius:2,background:th.sh,flexShrink:0,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",borderRadius:2,background:th.ac,transition:"width .3s"}}/></div>
              <span style={{fontSize:11,fontWeight:700,color:th.ac,fontFamily:FM,minWidth:20,textAlign:"right"}}>{cnt}</span>
            </button>;})}
          </div>
          {filtered.length===0&&<div style={{textAlign:"center",padding:20,color:th.t3,fontSize:13}}>{t.nf||"No results"}</div>}
        </Fragment>:<div style={{display:"flex",flexDirection:"column",gap:3}}>
          {(()=>{const wk=hols.filter(h=>{const p=pk(h.date);return new Date(p.y,p.m,p.d).getDay()!==0&&new Date(p.y,p.m,p.d).getDay()!==6;}).length;return <div style={{padding:"8px 12px",background:th.al,borderRadius:8,marginBottom:6,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:600,color:th.ac}}>{hols.length} {t.hol}</span>
            <span style={{fontSize:12,color:"#065F46",fontWeight:600,background:"#D1FAE5",padding:"2px 6px",borderRadius:8}}>{wk} {t.wk}</span>
            <span style={{fontSize:12,color:"#92400E",fontWeight:600,background:"#FEF3C7",padding:"2px 6px",borderRadius:8}}>{hols.length-wk} {t.we}</span>
          </div>;})()}
          {hols.map(h=>{const p=pk(h.date);const dt=new Date(p.y,p.m,p.d);const dow=dt.toLocaleDateString(dateLocale(),{weekday:"long"});const isWknd=dt.getDay()===0||dt.getDay()===6;
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

function AboutPage({th,t,onBack,lang,setLang,theme,setTheme}) {
  const[abx,setAbx]=useState(null);
  useEffect(()=>{let on=true;import("@/lib/aboutText").then(m=>{if(on)setAbx(m.ABOUT_TX);}).catch(()=>{});return()=>{on=false;};},[]);
  const a = abx ? (abx[lang] || abx.en) : null;
  if(!a) return <div style={{minHeight:"100vh",background:th.bg}} aria-busy="true"/>;
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

  return <div style={{minHeight:"100vh",background:th.bg,fontFamily:F,padding:"0 20px 60px",backgroundImage:"radial-gradient(ellipse at 30% 0%,"+th.ac+"06 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(236,72,153,.03) 0%,transparent 50%)"}}>
    <div style={{maxWidth:640,margin:"0 auto",paddingTop:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:th.gbg,border:`1px solid ${th.gbd}`,borderRadius:G.rXs,padding:"8px 14px",cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:600,color:th.t2,backdropFilter:G.blur,WebkitBackdropFilter:G.blur,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=th.ac} onMouseLeave={e=>e.currentTarget.style.borderColor=th.gbd}><Ic n="chevL" s={16} c={th.t2}/>{t.back}</button>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><ThPk theme={theme} set={setTheme} th={th}/><LangDrop lang={lang} set={setLang} th={th}/></div>
      </div>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{position:"relative",width:120,height:80,margin:"0 auto 20px",transform:"none"}}><div style={{position:"absolute",left:10,top:8,width:36,height:44,borderRadius:8,background:th.al,border:"1px solid "+th.gbd,animation:"floatA 4s ease-in-out infinite",boxShadow:"0 4px 16px rgba(139,92,246,.1)"}}><div style={{margin:"6px 4px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2}}>{[1,0,1,0,1,0,1,1,0].map(function(v,i){return <div key={i} style={{width:6,height:4,borderRadius:1,background:v?"#8B5CF6":"transparent"}}/>;})}</div></div><div style={{position:"absolute",left:42,top:0,width:40,height:48,borderRadius:10,background:th.gd,animation:"floatB 5s ease-in-out infinite",boxShadow:"0 6px 24px "+th.ac+"40",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="sun" s={20} c="#fff"/></div><div style={{position:"absolute",right:10,top:12,width:34,height:40,borderRadius:8,background:th.al,border:"1px solid "+th.gbd,animation:"floatC 3.5s ease-in-out infinite",boxShadow:"0 4px 16px rgba(139,92,246,.08)"}}><div style={{margin:"6px 4px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2}}>{[0,1,0,1,0,1,0,0,1].map(function(v,i){return <div key={i} style={{width:6,height:4,borderRadius:1,background:v?"#10B981":"transparent"}}/>;})}</div></div></div>
        <h1 style={{margin:"0 0 8px",fontSize:28,fontWeight:800,color:th.tx,letterSpacing:-.6}}>{t.brand}</h1>
        <p style={{margin:0,fontSize:15,color:th.t2,lineHeight:1.6}}>{a.hero}</p>
              </div>
      <Section icon="arrow" title={a.howTitle}>
        <div style={{marginBottom:8}}><strong style={{color:th.tx}}>1. {a.s1}</strong> — {a.s1d}</div>
        <div style={{marginBottom:8}}><strong style={{color:th.tx}}>2. {t.am}</strong> — {a.s2d}</div>
        <div style={{marginBottom:8}}><strong style={{color:th.tx}}>3. {a.s3}</strong> — {a.s3d}</div>
        <div style={{marginBottom:8}}><strong style={{color:th.tx}}>4. {a.s4}</strong> — {a.s4d}</div>
        <div><strong style={{color:th.tx}}>5. {a.s5}</strong> — {a.s5d}</div>
      </Section>
      <Section icon="grid" title={a.calTitle}>
        <Feature emoji="📅" title={a.f1} desc={a.f1d}/><Feature emoji="👆" title={a.f2} desc={a.f2d}/><Feature emoji="🔄" title={a.f3} desc={a.f3d}/><Feature emoji="🗓️" title={a.f4} desc={a.f4d}/><Feature emoji="🏛️" title={a.f5} desc={a.f5d}/><Feature emoji="🟡" title={a.f6} desc={a.f6d}/><Feature emoji="☀️" title={a.f7} desc={a.f7d}/>
      </Section>
      <Section icon="bar" title={a.viewTitle}>
        <Feature emoji="🔥" title={a.f8} desc={a.f8d}/><Feature emoji="📊" title={a.f9} desc={a.f9d}/><Feature emoji="📈" title={a.f10} desc={a.f10d}/><Feature emoji="🏳️" title={a.f11} desc={a.f11d}/><Feature emoji="📝" title={a.f12} desc={a.f12d}/>
      </Section>
      <Section icon="share" title={a.shareTitle}>
        <Feature emoji="🔗" title={a.f13} desc={a.f13d}/><Feature emoji="📱" title={a.f14} desc={a.f14d}/><Feature emoji="🖼️" title={a.f15} desc={a.f15d}/><Feature emoji="🔒" title={a.f16} desc={a.f16d}/><Feature emoji="↩️" title={a.f17} desc={a.f17d}/>
      </Section>
      <Section icon="users" title={a.teamTitle}>
        <Feature emoji="📊" title={a.f18} desc={a.f18d}/><Feature emoji="📅" title={a.f19} desc={a.f19d}/><Feature emoji="✅" title={a.f20} desc={a.f20d}/><Feature emoji="🗺️" title={a.f21} desc={a.f21d}/>
      </Section>
      <Section icon="download" title={a.expTitle}>
        <Feature emoji="📥" title={a.f22} desc={a.f22d}/><Feature emoji="📄" title={a.f23} desc={a.f23d}/><Feature emoji="📊" title={a.f24} desc={a.f24d}/><Feature emoji="📗" title={a.f25} desc={a.f25d}/><Feature emoji="📋" title={a.f26} desc={a.f26d}/><Feature emoji="🖥️" title={a.f27} desc={a.f27d}/><Feature emoji="🔄" title={a.f28} desc={a.f28d}/><Feature emoji="📺" title={a.f29} desc={a.f29d}/>
      </Section>
      <Section icon="globe" title={a.designTitle}>
        <Feature emoji="🌐" title={a.f30} desc={a.f30d}/><Feature emoji="🎨" title={a.f31} desc={a.f31d}/><Feature emoji="🌙" title={a.f32} desc={a.f32d}/><Feature emoji="🖨️" title={a.f33} desc={a.f33d}/><Feature emoji="📺" title={a.f34} desc={a.f34d}/><Feature emoji="📊" title={a.f35} desc={a.f35d}/>
      </Section>
      <Section icon="flag" title={a.dataTitle}>
        <Feature emoji="🔐" title={a.f36} desc={a.f36d}/><Feature emoji="⏰" title={a.f37} desc={a.f37d}/><Feature emoji="💾" title={a.f38} desc={a.f38d}/>
      </Section>
      <div style={{textAlign:"center",marginTop:40,paddingTop:24,borderTop:`1px solid ${th.gbd}`}}>
        <p style={{fontSize:12,color:th.t3,margin:0}}>{a.footer}</p>
        <button onClick={onBack} style={{marginTop:16,padding:"10px 28px",borderRadius:G.rXs,border:"none",background:th.ac,color:th.ti,fontSize:14,fontWeight:700,fontFamily:F,cursor:"pointer",boxShadow:`0 4px 20px ${th.ac}35`}}>← {t.back}</button>
      </div>
      <BottomDuo th={th} lang={lang}/>
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
    <div onClick={e=>e.stopPropagation()} style={{background:th.gbg,borderRadius:G.r,padding:28,maxWidth:480,animation:"popIn .25s ease-out",width:"100%",boxShadow:th.sl,backdropFilter:G.blur,WebkitBackdropFilter:G.blur}}>
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




function TodayHolidays({th,t}) {
  const today = new Date();
  const yr = today.getFullYear();
  const mo = today.getMonth();
  const dy = today.getDate();
  const todayKey = dk(yr, mo, dy);
  const todayMmDd = todayKey.slice(5);

  const holidays = [];
  EU_C.forEach(function(co) {
    var hols = computeHolidays(co.c, yr);
    if (hols.indexOf(todayKey) >= 0) {
      var name = HNAMES[todayMmDd] || "Public Holiday";
      holidays.push({ flag: co.f, country: co.n, name: name });
    }
  });

  if (holidays.length === 0) return null;

  return <div style={{marginTop:16,textAlign:"left"}}>
    <div style={{fontSize:11,fontWeight:600,color:th.t3,textTransform:"uppercase",letterSpacing:.8,marginBottom:8,textAlign:"center"}}>
      {t.offToday || "Non-working day today"} <span style={{fontWeight:700,color:th.ac}}>· {holidays.length}</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:6}}>
      {holidays.map(function(h,i) {
        return <div key={i} style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"10px 12px",borderRadius:14,
          background:th.gbg,
          border:"1px solid " + th.gbd,
          backdropFilter:G.blur,WebkitBackdropFilter:G.blur,
          transition:"all .2s",
        }}
        onMouseEnter={function(e){e.currentTarget.style.borderColor=th.ac;e.currentTarget.style.transform="translateY(-1px)";}}
        onMouseLeave={function(e){e.currentTarget.style.borderColor=th.gbd;e.currentTarget.style.transform="translateY(0)";}}>
          <span style={{fontSize:22,flexShrink:0}}>{h.flag}</span>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:th.tx,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.country}</div>
            <div style={{fontSize:11,color:th.t3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.name}</div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function fireConfetti(){var cv=document.createElement("canvas");cv.style.cssText="position:fixed;inset:0;z-index:9999;pointer-events:none";document.body.appendChild(cv);var ctx=cv.getContext("2d");cv.width=window.innerWidth;cv.height=window.innerHeight;var P=[];var cols=["#8B5CF6","#6366F1","#EC4899","#F59E0B","#10B981","#3B82F6"];for(var i=0;i<80;i++)P.push({x:cv.width/2,y:cv.height/2,vx:(Math.random()-.5)*12,vy:Math.random()*-14-4,s:Math.random()*6+3,c:cols[i%6],l:1,d:Math.random()*.015+.008,r:Math.random()*360});(function draw(){ctx.clearRect(0,0,cv.width,cv.height);var alive=false;P.forEach(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=.35;p.l-=p.d;p.r+=p.vx;if(p.l>0){alive=true;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r*Math.PI/180);ctx.globalAlpha=p.l;ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);ctx.restore();}});if(alive)requestAnimationFrame(draw);else cv.remove();})();}
// ─── Front page (concept B "Command Bar", styles in app/frontpage.css) ─────────
const FP_TX={
  en:{create:"Create",join:"Join",teamName:"Team name",teamCode:"Team code or link",year:"Year",w5:"Mon–Fri week",w7:"7-day operations",joinHint:"Ask your team for the code, or paste the board link.",recent:"Jump back in",remove:"Remove",cancel:"Cancel",removeQ:"Remove {n} from this list?",today:"Today",nonWorking:"non-working in {n} countries",noneToday:"No public holiday today in the 55 countries",holTitle:"Public holidays",holSub:"55 countries, regions included, 2026–2035.",country:"Country",next:"Next public holidays",all:"All public holidays",numbers:"Planned here so far",teams:"Teams",members:"Members",visits:"Visits",about:"About",contact:"Contact",language:"Language",theme:"Change theme",free:"Free · no login"},
  fr:{create:"Créer",join:"Rejoindre",teamName:"Nom de l'équipe",teamCode:"Code ou lien de l'équipe",year:"Année",w5:"Semaine lun–ven",w7:"Activité 7 j/7",joinHint:"Demandez le code à votre équipe ou collez le lien du tableau.",recent:"Reprendre",remove:"Retirer",cancel:"Annuler",removeQ:"Retirer {n} de cette liste ?",today:"Aujourd'hui",nonWorking:"jour chômé dans {n} pays",noneToday:"Aucun jour férié aujourd'hui dans les 55 pays",holTitle:"Jours fériés",holSub:"55 pays, régions comprises, 2026–2035.",country:"Pays",next:"Prochains jours fériés",all:"Tous les jours fériés",numbers:"Planifié ici jusqu'à présent",teams:"Équipes",members:"Membres",visits:"Visites",about:"À propos",contact:"Contact",language:"Langue",theme:"Changer de thème",free:"Gratuit · sans inscription"},
  de:{create:"Erstellen",join:"Beitreten",teamName:"Teamname",teamCode:"Teamcode oder Link",year:"Jahr",w5:"Mo–Fr-Woche",w7:"7-Tage-Betrieb",joinHint:"Fragen Sie Ihr Team nach dem Code oder fügen Sie den Link ein.",recent:"Weitermachen",remove:"Entfernen",cancel:"Abbrechen",removeQ:"{n} aus dieser Liste entfernen?",today:"Heute",nonWorking:"arbeitsfrei in {n} Ländern",noneToday:"Heute kein Feiertag in den 55 Ländern",holTitle:"Feiertage",holSub:"55 Länder, inklusive Regionen, 2026–2035.",country:"Land",next:"Nächste Feiertage",all:"Alle Feiertage",numbers:"Bisher hier geplant",teams:"Teams",members:"Mitglieder",visits:"Besuche",about:"Info",contact:"Kontakt",language:"Sprache",theme:"Design wechseln",free:"Kostenlos · ohne Anmeldung"},
  es:{create:"Crear",join:"Unirse",teamName:"Nombre del equipo",teamCode:"Código o enlace del equipo",year:"Año",w5:"Semana lun–vie",w7:"Operación 7 días",joinHint:"Pide el código a tu equipo o pega el enlace del tablero.",recent:"Seguir donde lo dejaste",remove:"Quitar",cancel:"Cancelar",removeQ:"¿Quitar {n} de esta lista?",today:"Hoy",nonWorking:"festivo en {n} países",noneToday:"Hoy no hay festivos en los 55 países",holTitle:"Días festivos",holSub:"55 países, con regiones, 2026–2035.",country:"País",next:"Próximos festivos",all:"Todos los festivos",numbers:"Planificado aquí hasta ahora",teams:"Equipos",members:"Miembros",visits:"Visitas",about:"Acerca de",contact:"Contacto",language:"Idioma",theme:"Cambiar tema",free:"Gratis · sin registro"},
  pt:{create:"Criar",join:"Entrar",teamName:"Nome da equipa",teamCode:"Código ou link da equipa",year:"Ano",w5:"Semana seg–sex",w7:"Operação 7 dias",joinHint:"Peça o código à sua equipa ou cole o link do quadro.",recent:"Retomar",remove:"Remover",cancel:"Cancelar",removeQ:"Remover {n} desta lista?",today:"Hoje",nonWorking:"feriado em {n} países",noneToday:"Hoje não há feriados nos 55 países",holTitle:"Feriados",holSub:"55 países, incluindo regiões, 2026–2035.",country:"País",next:"Próximos feriados",all:"Todos os feriados",numbers:"Planeado aqui até agora",teams:"Equipas",members:"Membros",visits:"Visitas",about:"Sobre",contact:"Contacto",language:"Idioma",theme:"Mudar tema",free:"Grátis · sem registo"},
  ro:{create:"Creează",join:"Alătură-te",teamName:"Numele echipei",teamCode:"Codul sau linkul echipei",year:"An",w5:"Săptămână L–V",w7:"Program 7 zile",joinHint:"Cere codul echipei sau lipește linkul tabloului.",recent:"Continuă",remove:"Elimină",cancel:"Anulează",removeQ:"Elimini {n} din listă?",today:"Azi",nonWorking:"zi nelucrătoare în {n} țări",noneToday:"Azi nu e sărbătoare legală în cele 55 de țări",holTitle:"Sărbători legale",holSub:"55 de țări, inclusiv regiuni, 2026–2035.",country:"Țara",next:"Următoarele sărbători legale",all:"Toate sărbătorile legale",numbers:"Planificat aici până acum",teams:"Echipe",members:"Membri",visits:"Vizite",about:"Despre",contact:"Contact",language:"Limba",theme:"Schimbă tema",free:"Gratuit · fără cont"},
  hu:{create:"Létrehozás",join:"Csatlakozás",teamName:"Csapat neve",teamCode:"Csapatkód vagy link",year:"Év",w5:"H–P hét",w7:"7 napos működés",joinHint:"Kérd el a kódot a csapatodtól, vagy illeszd be a linket.",recent:"Folytatás",remove:"Eltávolítás",cancel:"Mégse",removeQ:"Eltávolítod: {n}?",today:"Ma",nonWorking:"munkaszüneti nap {n} országban",noneToday:"Ma nincs ünnepnap az 55 országban",holTitle:"Ünnepnapok",holSub:"55 ország, régiókkal, 2026–2035.",country:"Ország",next:"Következő ünnepnapok",all:"Összes ünnepnap",numbers:"Eddig itt tervezve",teams:"Csapatok",members:"Tagok",visits:"Látogatás",about:"Rólunk",contact:"Kapcsolat",language:"Nyelv",theme:"Téma váltása",free:"Ingyenes · regisztráció nélkül"},
  sv:{create:"Skapa",join:"Gå med",teamName:"Teamnamn",teamCode:"Teamkod eller länk",year:"År",w5:"Mån–fre-vecka",w7:"Drift 7 dagar",joinHint:"Be ditt team om koden eller klistra in länken.",recent:"Fortsätt",remove:"Ta bort",cancel:"Avbryt",removeQ:"Ta bort {n} från listan?",today:"Idag",nonWorking:"helgdag i {n} länder",noneToday:"Ingen helgdag idag i de 55 länderna",holTitle:"Helgdagar",holSub:"55 länder, regioner inräknade, 2026–2035.",country:"Land",next:"Kommande helgdagar",all:"Alla helgdagar",numbers:"Planerat här hittills",teams:"Team",members:"Medlemmar",visits:"Besök",about:"Om",contact:"Kontakt",language:"Språk",theme:"Byt tema",free:"Gratis · ingen inloggning"},
  it:{create:"Crea",join:"Unisciti",teamName:"Nome del team",teamCode:"Codice o link del team",year:"Anno",w5:"Settimana lun–ven",w7:"Operatività 7 giorni",joinHint:"Chiedi il codice al tuo team o incolla il link.",recent:"Riprendi",remove:"Rimuovi",cancel:"Annulla",removeQ:"Rimuovere {n} da questo elenco?",today:"Oggi",nonWorking:"festivo in {n} paesi",noneToday:"Oggi nessuna festività nei 55 paesi",holTitle:"Festività",holSub:"55 paesi, regioni incluse, 2026–2035.",country:"Paese",next:"Prossime festività",all:"Tutte le festività",numbers:"Pianificato qui finora",teams:"Team",members:"Membri",visits:"Visite",about:"Informazioni",contact:"Contatti",language:"Lingua",theme:"Cambia tema",free:"Gratis · senza registrazione"},
  bg:{create:"Създайте",join:"Присъединете се",teamName:"Име на екипа",teamCode:"Код или линк на екипа",year:"Година",w5:"Седмица пон–пет",w7:"Работа 7 дни",joinHint:"Поискайте кода от екипа си или постави линка.",recent:"Продължете",remove:"Премахнете",cancel:"Отказ",removeQ:"Да премахна ли {n} от списъка?",today:"Днес",nonWorking:"почивен ден в {n} държави",noneToday:"Днес няма празник в 55-те държави",holTitle:"Официални празници",holSub:"55 държави, включително региони, 2026–2035.",country:"Държава",next:"Следващи празници",all:"Всички празници",numbers:"Планирано тук досега",teams:"Екипи",members:"Членове",visits:"Посещения",about:"За нас",contact:"Контакт",language:"Език",theme:"Сменете темата",free:"Безплатно · без регистрация"},
  ar:{create:"إنشاء",join:"انضمام",teamName:"اسم الفريق",teamCode:"رمز الفريق أو الرابط",year:"السنة",w5:"أسبوع من الاثنين إلى الجمعة",w7:"عمل 7 أيام",joinHint:"اطلب الرمز من فريقك أو الصق رابط اللوحة.",recent:"تابع",remove:"إزالة",cancel:"إلغاء",removeQ:"إزالة {n} من القائمة؟",today:"اليوم",nonWorking:"عطلة في {n} دولة",noneToday:"لا عطلة رسمية اليوم في الدول الـ 55",holTitle:"العطل الرسمية",holSub:"55 دولة مع المناطق، 2026–2035.",country:"الدولة",next:"العطل القادمة",all:"كل العطل الرسمية",numbers:"ما تم تخطيطه هنا",teams:"الفرق",members:"الأعضاء",visits:"الزيارات",about:"حول",contact:"اتصال",language:"اللغة",theme:"تغيير المظهر",free:"مجاني · دون تسجيل"},
};
const LANG_NAMES={en:"English",fr:"Français",de:"Deutsch",es:"Español",pt:"Português",ro:"Română",hu:"Magyar",sv:"Svenska",it:"Italiano",bg:"Български",ar:"العربية"};
const LANG_HOME={ro:"RO",de:"DE",fr:"FR",es:"ES",pt:"PT",hu:"HU",sv:"SE",it:"IT",bg:"BG",ar:"AE"};
const fpFmt=(n)=>{try{return Number(n||0).toLocaleString();}catch(e){return String(n||0);}};
function guessCountry(lang){
  try{const loc=(navigator.languages&&navigator.languages[0])||navigator.language||"";const m=loc.match(/-([A-Z]{2})$/i);if(m&&EU_C.some(c=>c.c===m[1].toUpperCase()))return m[1].toUpperCase();}catch(e){}
  return LANG_HOME[lang]||"GB";
}
const FpIcon=({n,cls="i"})=>{const P={
  sun:<Fragment><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Fragment>,
  moon:<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>,heart:<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>,
  globe:<Fragment><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></Fragment>,
  arrow:<path d="M5 12h14M13 6l6 6-6 6"/>,x:<path d="M18 6L6 18M6 6l12 12"/>,plus:<path d="M12 5v14M5 12h14"/>,
  link:<Fragment><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></Fragment>,
  flag:<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>};
  return <svg className={cls} viewBox="0 0 24 24" aria-hidden="true">{P[n]}</svg>;};

function FrontPage({t,lang,setLang,theme,setTheme,myTeams,onOpenTeam,onDeleteTeam,onCreateTeam,onJoinTeam,yr,setYr,YRS,ww,setWw,name,setName,code,setCode,err,setErr,confirmDel,setConfirmDel,onAbout,onContact,onHolidays,th,children}){
  const L=FP_TX[lang]||FP_TX.en;
  const[mode,setMode]=useState("create");
  const[stats,setStats]=useState(null);
  const[todayIdx,setTodayIdx]=useState(null);
  const[cc,setCc]=useState("GB");
  const visits=useVisits();
  const langRef=useRef(null);
  useEffect(()=>{
    let alive=true;
    const g=setTimeout(()=>{if(alive)setCc(guessCountry(lang));},0);
    fetch("/api/stats",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(alive&&d&&typeof d.teams==="number")setStats(d);}).catch(()=>{});
    fetch("/hn/y"+CY+".json").then(r=>r.ok?r.json():null).then(d=>{if(alive)setTodayIdx(d||{});}).catch(()=>{if(alive)setTodayIdx({});});
    return()=>{alive=false;clearTimeout(g);};
  },[lang]);
  const names=useHolidayNames([cc]);
  const todayKey=dk(CY,CM,CD);
  // Today's non-working countries: the planner's own engine decides, the name index labels them
  const today=EU_C.filter(co=>computeHolidays(co.c,CY).indexOf(todayKey)>=0).map(co=>{
    const row=todayIdx&&todayIdx[todayKey]?todayIdx[todayKey].find(r=>r[0]===co.c):null;
    return{cc:co.c,country:co.n,name:row?(row[2]||row[1]):holName(todayKey),local:row&&row[2]&&row[1]!==row[2]?row[1]:""};
  });
  // Next three public holidays in the chosen country
  const upcoming=[...computeHolidays(cc,CY),...computeHolidays(cc,CY+1)].filter(d=>d>=todayKey).slice(0,3).map(d=>{
    const rows=names[cc]&&names[cc].h&&names[cc].h[d];const r=rows&&(rows.find(x=>!x[3])||rows[0]);
    const p=pk(d);const dt=new Date(p.y,p.m,p.d,12);
    let day="",wd="";try{day=dt.toLocaleDateString(lang==="en"?"en-GB":lang,{day:"numeric",month:"short"});wd=dt.toLocaleDateString(lang==="en"?"en-GB":lang,{weekday:"short"});}catch(e){day=d.slice(5);}
    return{d,day,wd:d===todayKey?L.today:wd,name:r?r[0]:holName(d)};
  });
  const countryName=(EU_C.find(c=>c.c===cc)||{}).n||cc;
  const vSorted=visits?Object.entries(visits.countries||{}).sort((a,b)=>b[1]-a[1]).slice(0,4):[];
  const vMax=vSorted.length?vSorted[0][1]:1;
  const submit=(e)=>{
    e.preventDefault();
    if(mode==="create"){if(name.trim())onCreateTeam(name.trim(),yr,ww);}
    else if(code.trim()){setErr(null);onJoinTeam(code.trim(),e2=>setErr(e2));}
  };
  const cycleTheme=()=>{const order=["light","dark","pink"];setTheme(order[(order.indexOf(theme)+1)%3]);};
  const pickLang=(k)=>{setLang(k);if(langRef.current)langRef.current.open=false;};
  const todayLabel=(()=>{try{return new Date(CY,CM,CD,12).toLocaleDateString(lang==="en"?"en-GB":lang,{day:"numeric",month:"short"});}catch(e){return todayKey;}})();

  return <div className="fp" data-theme={theme} dir={lang==="ar"?"rtl":"ltr"} lang={lang}>
    <div className="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <header className="top"><div className="wrap">
      <span className="brand"><span className="logo"><FpIcon n="sun"/></span><span className="long">{t.brand}</span></span>
      <button className="ghost hide-s" onClick={onAbout}>{L.about}</button>
      <button className="ghost hide-s" onClick={onContact}>{L.contact}</button>
      <details className="lang" ref={langRef} onKeyDown={e=>{if(e.key==="Escape"&&langRef.current&&langRef.current.open){langRef.current.open=false;const sm=langRef.current.querySelector("summary");if(sm)sm.focus();}}}>
        <summary className="ghost" aria-label={L.language+": "+(LANG_NAMES[lang]||lang)}><FpIcon n="globe"/>{(lang||"en").toUpperCase()}</summary>
        <ul>{Object.keys(LANG_NAMES).filter(k=>TX[k]).map(k=><li key={k}><button aria-current={k===lang?"true":undefined} onClick={()=>pickLang(k)}><b>{k.toUpperCase()}</b>{LANG_NAMES[k]}</button></li>)}</ul>
      </details>
      <button className="ghost" onClick={cycleTheme} aria-label={L.theme}><FpIcon n={theme==="dark"?"moon":theme==="pink"?"heart":"sun"}/></button>
      <CoffeeButton lang={lang}/>
    </div></header>

    <main>
      <section className="wrap hero">
        <span className="pill"><i></i>{L.free} · {t.bf}</span>
        <h1 className="h"><span>{t.brand}</span></h1>
        <p className="lede">{t.tag1} {t.tag2}</p>
        <form className="cmd" onSubmit={submit}>
          <div className="cmd-bar">
            <div className="seg" role="group" aria-label={L.create+" / "+L.join}>
              <button type="button" aria-pressed={mode==="create"} onClick={()=>{setMode("create");setErr(null);}}><FpIcon n="plus"/>{L.create}</button>
              <button type="button" className="j" aria-pressed={mode==="join"} onClick={()=>{setMode("join");setErr(null);}}><FpIcon n="link"/>{L.join}</button>
            </div>
            {mode==="create"
              ?<Fragment><label className="sr" htmlFor="fp-name">{L.teamName}</label><input id="fp-name" className="cmd-in" value={name} maxLength={40} onChange={e=>setName(e.target.value)} placeholder={t.tnP} autoComplete="off"/></Fragment>
              :<Fragment><label className="sr" htmlFor="fp-code">{L.teamCode}</label><input id="fp-code" className="cmd-in code" value={code} onChange={e=>{setCode(e.target.value);setErr(null);}} placeholder={t.jcP} autoComplete="off" autoCapitalize="off" spellCheck={false}/></Fragment>}
            {mode==="create"
              ?<button type="submit" className="go" disabled={!name.trim()}>{t.cr}<FpIcon n="arrow" cls="i flip"/></button>
              :<button type="submit" className="go j" disabled={!code.trim()}>{t.jn}<FpIcon n="arrow" cls="i flip"/></button>}
          </div>
          {mode==="create"
            ?<div className="cmd-opts">
              <select aria-label={L.year} value={yr} onChange={e=>setYr(Number(e.target.value))}>{YRS.map(y=><option key={y} value={y}>{y}</option>)}</select>
              <select aria-label={L.w5+" / "+L.w7} value={ww} onChange={e=>setWw(e.target.value)}><option value="5">{L.w5}</option><option value="7">{L.w7}</option></select>
            </div>
            :<div className="cmd-opts"><span>{L.joinHint}</span></div>}
          {err&&<div className="cmd-err" role="alert">{err}</div>}
        </form>
        {myTeams.length>0&&<div className="recent">
          <h2>{L.recent}</h2>
          {myTeams.map(tm=><div key={tm.id} data-rt={tm.id} className={"rt"+(confirmDel===tm.id?" confirm":"")}>
            {confirmDel===tm.id?<Fragment>
              <span className="ask" role="status">{L.removeQ.replace("{n}",tm.name||"")}</span>
              <button className="yes" onClick={()=>{onDeleteTeam(tm.id);setConfirmDel(null);}}>{L.remove}</button>
              <button className="no" autoFocus onClick={()=>{setConfirmDel(null);requestAnimationFrame(()=>{const x=document.querySelector('[data-rt="'+tm.id+'"] .x');if(x)x.focus();});}}>{L.cancel}</button>
            </Fragment>:<Fragment>
              <button className="open" onClick={()=>onOpenTeam(tm.id)}>
                <span className="stack"><b style={{background:MC[(tm.name||"?").charCodeAt(0)%MC.length].b,color:MC[(tm.name||"?").charCodeAt(0)%MC.length].t}}>{safeLogo(tm.logo)?<img src={safeLogo(tm.logo)} alt=""/>:(tm.name||"?").trim().charAt(0).toUpperCase()}</b></span>
                <span><span className="t">{tm.name}</span><br/><span className="m">{tm.year||"—"} · {tm.mc||0} {(tm.mc||0)!==1?t.mbs:t.mb}</span></span>
              </button>
              <button className="x" aria-label={L.remove+": "+(tm.name||"")} onClick={()=>setConfirmDel(tm.id)}><FpIcon n="x"/></button>
            </Fragment>}
          </div>)}
        </div>}
      </section>

      <section className="band" aria-label={t.offToday||L.today}><div className="wrap">
        <div className="when"><b>{L.today}, {todayLabel}</b><span>{today.length?L.nonWorking.replace("{n}",String(today.length)):L.noneToday}</span></div>
        {today.length>0&&<ul className="ticks" tabIndex={0} aria-label={L.nonWorking.replace("{n}",String(today.length))}>{today.map(h=><li key={h.cc}><span className="code">{h.cc}</span><span><span className="n">{h.country}</span> <span className="hn" title={h.local||undefined}>· {h.name}</span></span></li>)}</ul>}
      </div></section>

      <section className="wrap lower">
        <div className="card hb">
          <div className="hb-head"><span className="hb-ic"><FpIcon n="flag"/></span><div><h2>{L.holTitle}</h2><p className="sub">{L.holSub}</p></div></div>
          <div className="hb-ctl"><select aria-label={L.country} value={cc} onChange={e=>setCc(e.target.value)}>{EU_C.map(c=><option key={c.c} value={c.c}>{c.c} · {c.n}</option>)}</select></div>
          <div style={{fontSize:13,fontWeight:700,color:"var(--muted)",margin:"0 0 8px"}}>{L.next} · {countryName}</div>
          <ul className="hl">{upcoming.map(u=><li key={u.d}><span className="dt">{u.day}</span><span>{u.name}</span><span className="wd">{u.wd}</span></li>)}</ul>
          <button className="more" onClick={onHolidays}>{L.all}<FpIcon n="arrow" cls="i flip"/></button>
        </div>
        <div className="card">
          <h2>{L.numbers}</h2>
          <div className="nums"><div><b>{stats?fpFmt(stats.teams):"–"}</b><span>{L.teams}</span></div><div><b>{stats?fpFmt(stats.members):"–"}</b><span>{L.members}</span></div><div><b>{visits?fpFmt(visits.total):"–"}</b><span>{L.visits}</span></div></div>
          {vSorted.length>0&&<ul className="cty" aria-label={L.visits}>{vSorted.map(([k,v])=><li key={k}><span className="cc">{k}</span><span className="tr"><i style={{width:Math.max(4,Math.round(v/vMax*100))+"%"}}></i></span><span className="v">{fpFmt(v)}</span></li>)}</ul>}
        </div>
      </section>
      <div className="wrap"><BottomDuo th={th} lang={lang}/></div>
    </main>
    <footer className="foot"><div className="wrap"><span className="sp">© {CY} {t.brand} · {L.free}</span><button onClick={onAbout}>{L.about}</button><button onClick={onContact}>{L.contact}</button><a href="/privacy" style={{color:"var(--ink-2)",fontWeight:600,textDecoration:"none",minHeight:44,display:"inline-flex",alignItems:"center"}}>{X("privacy")}</a></div></footer>
    {children}
  </div>;
}

export function Landing({onCreateTeam,onJoinTeam,myTeams,onOpenTeam,onDeleteTeam,th,t,lang,setLang,theme,setTheme}){
  const[name,setName]=useState("");const[yr,setYr]=useState(CY>=2026?CY:2026);const[code,setCode]=useState("");const[mode,setMode]=useState(null);const[err,setErr]=useState(null);const[holBr,setHolBr]=useState(false);const[about,setAbout]=useState(false);const[contact,setContact]=useState(false);const[ww,setWw]=useState("5");const[confirmDel,setConfirmDel]=useState(null);
  const YRS=Array.from({length:10},(_,i)=>2026+i);

  if(about) return <AboutPage th={th} t={t} onBack={()=>setAbout(false)} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}/>;

  return <FrontPage {...{t,lang,setLang,theme,setTheme,myTeams,onOpenTeam,onDeleteTeam,onCreateTeam,onJoinTeam,yr,setYr,YRS,ww,setWw,name,setName,code,setCode,err,setErr,confirmDel,setConfirmDel}}
    onAbout={()=>setAbout(true)} onContact={()=>setContact(true)} onHolidays={()=>setHolBr(true)} th={th}>
    {holBr&&<HolBrowser onClose={()=>setHolBr(false)} th={th} t={t} year={yr}/>}
    {contact&&<ContactModal onClose={()=>setContact(false)} th={th} t={t}/>}
  </FrontPage>;
}

// ─── Workspace ───────────────────────────────────────────────────

function Skeleton({th,w,h,r,mb}) {
  return <div className="tvp-skel" style={{width:w||"100%",height:h||16,borderRadius:r||6,background:th.sh,marginBottom:mb||0}}/>;
}
function CalendarSkeleton({th}) {
  return <div className="tvp-fade" style={{padding:20}}>
    <Skeleton th={th} w={200} h={24} mb={16}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
      {[0,1,2,3,4,5].map(function(i){return <div key={i} style={{background:th.gbg,borderRadius:G.rSm,border:"1px solid "+th.gbd,padding:14}}>
        <Skeleton th={th} w={120} h={18} mb={10}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {Array.from({length:35}).map(function(_,j){return <Skeleton key={j} th={th} h={28} r={4}/>;})}
        </div>
      </div>;})}
    </div>
  </div>;
}



// ─── Team logo: any image, centre-cropped to a 128px square in the browser, shown as a circle ───
const LOGO_RX=/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
export const safeLogo=v=>typeof v==="string"&&v.length<60000&&LOGO_RX.test(v)?v:null;
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
      <h1 style={{fontSize:22,fontWeight:700,color:"#1A1A1A",margin:"0 0 8px"}}>{X("errT")}</h1>
      <p style={{fontSize:14,color:"#6B6B6B",margin:"0 0 24px",lineHeight:1.6}}>{X("errD")}</p>
      <button onClick={()=>{window.location.hash="";window.location.reload();}} style={{padding:"12px 28px",borderRadius:10,border:"none",background:"#2563EB",color:"#fff",fontSize:14,fontWeight:700,fontFamily:F,cursor:"pointer"}}>{X("home")}</button>
    </div>;
  }
  return children;
}

// ─── Cookie / Privacy Notice ─────────────────────────────────────
function CookieNotice({th, t}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let need = false;
    try { need = !localStorage.getItem("tvp-cookie-ok"); } catch(e) { need = true; }
    const id = setTimeout(() => setShow(need), 0);
    return () => clearTimeout(id);
  }, []);
  // While the notice is shown, keep page content (and focused controls) clear of it (WCAG 2.4.11)
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "120px";
    return () => { document.body.style.paddingBottom = prev; };
  }, [show]);
  const accept = () => {
    setShow(false);
    try { localStorage.setItem("tvp-cookie-ok", "1"); } catch(e) {}
  };
  if (!show) return null;
  return <div role="region" aria-label={X("privacy")} style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9999,padding:"12px 20px",background:"linear-gradient(135deg,rgba(76,29,149,0.97),rgba(79,70,229,0.97))",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
    <span style={{fontSize:12,color:"#F5F3FF",fontFamily:F,lineHeight:1.5,maxWidth:760}}>{X("cookie")} <a href="/privacy" style={{color:"#fff",fontWeight:700,textDecoration:"underline"}}>{X("privacy")}</a></span>
    <button onClick={accept} style={{minHeight:32,padding:"6px 18px",borderRadius:20,border:"1px solid rgba(255,255,255,0.35)",background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:12,fontWeight:700,fontFamily:F,cursor:"pointer",whiteSpace:"nowrap"}}>{X("gotIt")}</button>
  </div>;
}

// ─── App ─────────────────────────────────────────────────────────
export default function App(){

  const[screen,setScreen]=useState("home");const[team,setTeamRaw]=useState(null);const[viewYear,setViewYear]=useState(null);
  // Opening a team picks its year: "year=YYYY" in the link if present, else the default
  const setTeam=tm=>{let y=null;try{const lp=linkParams();const ym=lp.match(/[#&?]year=(\d{4})/);if(tm&&ym&&lp.indexOf("team="+tm.id)>=0)y=clampYear(parseInt(ym[1]));}catch(e){}setViewYear(y);setTeamRaw(tm);};const[myTeams,setMyTeams]=useState([]);const[lang,setLang]=useState("en");const[theme,setTheme]=useState("light");
  const th=TH[theme];const t=TX[lang];
  setTextLang(lang);
  useEffect(()=>{try{document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";}catch(e){}},[lang]);

  useEffect(()=>{(async()=>{
    const sl=await db.ld("drift-lang");const st=await db.ld("drift-theme");
    // ?lang=xx in the address (the sitemap's language links) wins and is remembered
    const ql=(()=>{try{const m=(window.location.search+"&"+window.location.hash).match(/[?&#]lang=([a-z]{2})\b/i);return m&&TX[m[1].toLowerCase()]?m[1].toLowerCase():null;}catch(e){return null;}})();
    if(ql){setLang(ql);db.sv("drift-lang",ql);}else if(sl&&TX[sl]){setLang(sl);}else{
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
    // Theme: stored preference; on a first visit follow the device (dark mode → dark theme)
    if(st&&TH[st]){setTheme(st);}else{try{if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)setTheme("dark");}catch(e){}}

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

    // Owner link (#team=ID&owner=KEY): keep the key in this browser and remove it from the address bar
    try{const ok=linkParams().match(/team=([a-z0-9]+)/i),ow=linkParams().match(/[#&?]owner=([A-Za-z0-9_-]{20,64})/);if(ok&&ow){setOwner(ok[1],ow[1]);window.history.replaceState(null,"","#team="+ok[1]);}}catch(e){}
    // Link-only access: check URL hash
    const hash=linkParams();const match=hash.match(/team=([a-z0-9]+)/i);
    if(match){const ld=await db.ld(`team:${match[1]}`,true);if(ld){
      // Check TTL
      if(ld.createdAt){const age=now-new Date(ld.createdAt).getTime();if(age>=TTL){setScreen("home");return;}}
      setTeam(ld);setScreen("ws");
      // Silently track in my-teams for cleanup purposes (not displayed)
      if(!valid.find(x=>x.id===match[1])){const u=[...valid,{id:match[1],name:ld.name,year:ld.year,mc:ld.members.length}];setMyTeams(u);db.sv("my-teams",u);}
    }}
  })();},[]);

  const cL=l=>{setLang(l);db.sv("drift-lang",l);};const cT=t=>{setTheme(t);db.sv("drift-theme",t);};

  const create=(name,year,ww)=>{const nt={id:gid(),name,year,members:[],createdAt:new Date().toISOString(),locked:false,w7:ww==="7"};setTeam(nt);setScreen("ws");window.location.hash=`team=${nt.id}`;const u=[...myTeams,{id:nt.id,name,year,mc:0}];setMyTeams(u);db.sv(`team:${nt.id}`,nt,true);db.sv("my-teams",u);
    // The creator becomes the team owner: the server returns the owner key with the first save (syncAccepted)
    (async()=>{await waitIdle(nt.id);syncReload(nt.id,false);})();};

  const join=async(code,onErr)=>{let id=code;const m=code.match(/team=([a-z0-9]+)/i);if(m)id=m[1];id=id.replace(/[^a-z0-9]/gi,"");const ld=await db.ld(`team:${id}`,true);if(ld){setTeam(ld);setScreen("ws");window.location.hash=`team=${id}`;if(!myTeams.find(x=>x.id===id)){const u=[...myTeams,{id,name:ld.name,year:ld.year,mc:ld.members.length}];setMyTeams(u);db.sv("my-teams",u);}}else onErr(t.nf);};

  const open=async id=>{const ld=await db.ld(`team:${id}`,true);if(ld){withTransition(()=>flushSync(()=>{setTeam(ld);setScreen("ws");}),"open");window.location.hash=`team=${id}`;}else{const u=myTeams.filter(x=>x.id!==id);setMyTeams(u);db.sv("my-teams",u);}};

  const vy=team?(viewYear||defaultViewYear(team)):CY;
  const changeYear=y=>{if(!team)return;const ny=clampYear(y);const cur=viewYear||defaultViewYear(team);withTransition(()=>flushSync(()=>setViewYear(ny)),ny>cur?"next":ny<cur?"prev":"");try{window.history.replaceState(null,"","#team="+team.id+(ny===defaultViewYear(team)?"":"&year="+ny));}catch(e){}};

  const update=u0=>{const u=mergeYearView(u0,team);setTeamRaw(u);db.sv(`team:${u.id}`,u,true);const ut=myTeams.map(x=>{if(x.id!==u.id)return x;const nx={...x,name:u.name,year:u.year,mc:u.members.length};const lg=safeLogo(u.logo);if(lg)nx.logo=lg;else delete nx.logo;return nx;});setMyTeams(ut);db.sv("my-teams",ut);};

  const goHome=()=>{withTransition(()=>flushSync(()=>{setTeam(null);setScreen("home");}),"home");window.location.hash="";};

  // Saves that had to be merged with someone else's edits come back here
  useEffect(()=>{const fn=(id,doc)=>{setTeamRaw(cur=>cur&&cur.id===id?doc:cur);};SYNC.listeners.add(fn);return()=>{SYNC.listeners.delete(fn);};},[]);
  // Fresh data: reload the open team when the tab becomes visible again, and every 90 s while visible
  const openId=team&&team.id;
  useEffect(()=>{
    if(!openId)return;
    if(/view=(badge|json|print|tsv)/i.test(linkParams()))return; // widgets reload themselves every 30 min
    let busy=false;
    const refresh=async()=>{
      if(busy||document.visibilityState!=="visible"||!syncIdle(openId))return;
      busy=true;
      try{const fresh=await db.ld(`team:${openId}`,true);if(fresh&&syncIdle(openId))setTeamRaw(cur=>cur&&cur.id===openId&&JSON.stringify(cur)!==JSON.stringify(fresh)?fresh:cur);}finally{busy=false;}
    };
    // Background refresh only while someone is actually using the page (10 min idle → stop), so a
    // forgotten tab or wall screen doesn't keep the database awake; focus/visibility still refresh
    let lastInput=Date.now();const touch=()=>{lastInput=Date.now();};
    ["pointerdown","keydown","wheel","touchstart"].forEach(ev=>window.addEventListener(ev,touch,{passive:true}));
    const iv=setInterval(()=>{if(Date.now()-lastInput<10*60*1000)refresh();},90000);
    document.addEventListener("visibilitychange",refresh);window.addEventListener("focus",refresh);
    return()=>{clearInterval(iv);["pointerdown","keydown","wheel","touchstart"].forEach(ev=>window.removeEventListener(ev,touch));document.removeEventListener("visibilitychange",refresh);window.removeEventListener("focus",refresh);};
  },[openId]);

  const delTeam=id=>{const u=myTeams.filter(x=>x.id!==id);setMyTeams(u);db.sv("my-teams",u);try{localStorage.removeItem("team:"+id);}catch(e){}};
  // Delete for everyone: only from inside the team, after typing its name; the server keeps a restorable copy
  const deleteForever=async id=>{
    const r=await fetch(API_BASE+"?id="+id,{method:"DELETE",headers:{"X-Owner-Key":getOwner(id)}}).catch(()=>null);
    if(r&&r.status===403){alert(X("ownerOnlyDelete"));return;}
    try{if(window.storage)await window.storage.delete("team:"+id,true);}catch(e){}
    delTeam(id);goHome();
  };

  if(screen==="ws"&&team) {
    const tv=teamForYear(team,vy);
    // Check for special view modes via hash params
    const hash = linkParams();
    const viewMatch = hash.match(/view=(badge|json|print|tsv)/i);
    if (viewMatch) {
      const vw = viewMatch[1].toLowerCase();
      if (vw === "badge") return <ErrorBoundary><div style={{minHeight:"100vh",background:th.bg}}><BadgeView team={team} th={th} t={t}/></div></ErrorBoundary>;
      if (vw === "print") return <ErrorBoundary><PrintView team={tv} th={th} t={t}/></ErrorBoundary>;
      if (vw === "tsv") {
        const tsv = generateTSV(tv,t);
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
          name: tv.name, year: tv.year, members: tv.members.map(m => ({
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
    const ACC_AA={"#6366F1":"#4F46E5","#3B82F6":"#1D4ED8","#16A34A":"#15803D","#D97706":"#B45309","#EC4899":"#BE185D","#64748B":"#475569"};
    const acc0=/^#[0-9A-Fa-f]{6}$/.test(String(tv.accentColor||""))?String(tv.accentColor).toUpperCase():null;const acc=acc0?(ACC_AA[acc0]||acc0):null;
    const thv=acc?{...th,ac:acc,ah:acc,al:acc+"14",am:acc+"55"}:th;
    return <ErrorBoundary><WS team={tv} rawTeam={team} onYear={changeYear} onUpdate={update} onGoHome={goHome} onDeleteForever={deleteForever} th={thv} t={t} lang={lang} setLang={cL} theme={theme} setTheme={cT}/><CookieNotice th={th} t={t}/></ErrorBoundary>;
  }
  // "Remove" on the front page only takes the team off this browser's list; the team stays for everyone else
  return <ErrorBoundary><Link href="/admin" prefetch={false} rel="nofollow" tabIndex={-1} aria-label="Admin sign-in" style={{position:"fixed",right:6,bottom:4,zIndex:5,fontSize:10,fontFamily:F,color:th.t3,opacity:.28,textDecoration:"none",padding:"2px 4px"}}>admin</Link><Landing onCreateTeam={create} onJoinTeam={join} myTeams={myTeams} onOpenTeam={open} onDeleteTeam={delTeam} th={th} t={t} lang={lang} setLang={cL} theme={theme} setTheme={cT}/><CookieNotice th={th} t={t}/></ErrorBoundary>;
}
