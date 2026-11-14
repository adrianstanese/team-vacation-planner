// Texts of the About page (/about, /ro/despre): what the planner is, where the public holiday dates come from, what
// was checked by hand and what the data does not cover. English and Romanian, the two languages the page is written
// in. Every figure is a placeholder filled from the planner's own data when the page is built (components/site/
// AboutPage.tsx), so the page cannot state a number the data does not have.
// (The planner's in-app "About" screen, a list of features, has its own texts in lib/aboutText.ts.)
type Dict = Record<string, string>;

export const ABOUT_PAGE_TX: Record<string, Dict> = {
  en: {
    metaTitle: "About Team Vacation Planner: where the public holiday data comes from",
    metaDesc: "What Team Vacation Planner is, where its public holiday dates for {n} countries come from, what was checked by hand and what the data does not cover.",
    pill: "Free · no sign-up",
    h1: "About Team Vacation Planner",
    lede: "A free planner for a team's leave. This page says what it is, where the public holiday dates come from, what we checked ourselves and what the data does not cover.",

    whatTitle: "What it is",
    what1: "One shared calendar per team, for up to 50 people. Everyone marks their own days and sees who else is away.",
    what2: "No account: a team is opened with its link, and each person protects their own days with a PIN.",
    what3: "Each person's public holidays are marked by country and, where they differ inside a country, by region.",
    what4: "It is free. Excel, PDF and calendar-feed exports are included.",
    what5: "It works in 17 languages.",

    srcTitle: "Where the public holidays come from",
    src1: "The dates and the holiday names come from {lib}, an open-source library kept by the {by} and its contributors and published under the {lic} licence. The planner uses version {v}, generated on {g}.",
    src2: "We use only the days the library marks as public holidays, the days off by law. Its other categories are left out: days off for banks only or for public authorities only, optional days, half days, unofficial days and days of single communities.",
    src3: "Covered: {n} countries, {a} to {b}.",
    src3of: "Covered: {n} of the planner's {t} countries, {a} to {b}.",
    src4: "Regions with their own holidays: {r}.",
    src5: "Where the national list is short and most people also get regional days, a person without a region gets the days of the largest region: {d}.",
    src6: "Kosovo is not in the library. Its dates are worked out from Law No. 03/L-064 on Official Holidays.",
    src7: "Ukraine shows no public holidays: under martial law they are not days off (Law No. 2136-IX, art. 6).",

    chkTitle: "What we checked ourselves",
    chkLead: "We compared the dates with an official source for the countries that have a template page:",
    chkLine: "{c}: the {y} dates were checked on {d} against {src}.",
    chkRest: "All other countries are shown as the library has them.",

    gapTitle: "What the data does not cover",
    gapMoved: "Working days that a government moves to build long weekends are not in the data, so some working days around public holidays may differ: {c}.",
    gapLater: "Days off that a government announces during the year are missing until they are announced. In Romania, extra days off for the public sector are set by Government decision by 15 January of each year.",
    gapMoon: "Holidays that follow the lunar calendar are forecasts and can move by a day. Countries with such days in the data: {c}.",
    gapStates: "{c}: only the nationwide holidays, not the holidays of each state.",
    gapPartial: "{c}: {x} of {t} states and territories have their own dates.",
    gapOwn: "Company closures, collective agreements and local customs are not in the data. Your employer's calendar decides.",

    errTitle: "Found a wrong date?",
    errText: "Write to {mail} with the country, the date and a link to the official source. We correct confirmed errors.",

    whoTitle: "Who runs it",
    whoBy: "Team Vacation Planner is published by {p}.",
    contactTitle: "Contact",
    contactText: "Questions, corrections and requests about your data: {mail}.",
    privacyText: "What is kept about a team, and for how long, is on the {privacy}.",
    privacyWord: "privacy page",

    fine: "Holiday data last rebuilt on {d}. This page was last reviewed on {r}.",
    ctaTitle: "Try it with your team",
    ctaText: "Create a team, add people and their countries, and share the link.",
    and: "and",
  },
  ro: {
    metaTitle: "Despre Planificator Concedii Echipă: de unde vin sărbătorile legale",
    metaDesc: "Ce este Planificator Concedii Echipă, de unde vin sărbătorile legale pentru {n} de țări, ce am verificat manual și ce nu acoperă datele.",
    pill: "Gratuit · fără cont",
    h1: "Despre Planificator Concedii Echipă",
    lede: "Un planificator gratuit pentru concediile unei echipe. Pagina aceasta spune ce este, de unde vin sărbătorile legale, ce am verificat noi și ce nu acoperă datele.",

    whatTitle: "Ce este",
    what1: "Un calendar comun pentru fiecare echipă, pentru cel mult 50 de persoane. Fiecare își marchează zilele și vede cine mai lipsește.",
    what2: "Fără cont: echipa se deschide cu linkul ei, iar fiecare persoană își protejează zilele cu un PIN.",
    what3: "Sărbătorile legale ale fiecărei persoane sunt marcate după țară și, acolo unde diferă în interiorul țării, după regiune.",
    what4: "Este gratuit. Exporturile în Excel, PDF și flux de calendar sunt incluse.",
    what5: "Funcționează în 17 limbi.",

    srcTitle: "De unde vin sărbătorile legale",
    src1: "Datele și denumirile sărbătorilor vin din {lib}, o bibliotecă open-source întreținută de {by} și de contribuitorii ei, publicată sub licența {lic}. Planificatorul folosește versiunea {v}, generată la {g}.",
    src2: "Folosim doar zilele pe care biblioteca le marchează drept sărbători legale, adică zilele libere prin lege. Celelalte categorii ale ei rămân pe dinafară: zilele libere doar pentru bănci sau doar pentru instituții publice, zilele opționale, jumătățile de zi, zilele neoficiale și zilele unor comunități.",
    src3: "Acoperire: {n} de țări, din {a} până în {b}.",
    src3of: "Acoperire: {n} din cele {t} de țări ale planificatorului, din {a} până în {b}.",
    src4: "Regiuni cu sărbători proprii: {r}.",
    src5: "Acolo unde lista națională e scurtă, iar majoritatea oamenilor au și zile regionale, o persoană fără regiune primește zilele celei mai mari regiuni: {d}.",
    src6: "Kosovo nu se află în bibliotecă. Datele lui sunt calculate după Legea nr. 03/L-064 privind sărbătorile oficiale.",
    src7: "Pentru Ucraina nu apare nicio sărbătoare legală: pe durata legii marțiale acestea nu sunt zile libere (Legea nr. 2136-IX, art. 6).",

    chkTitle: "Ce am verificat noi",
    chkLead: "Am comparat datele cu o sursă oficială pentru țările care au pagini cu modele:",
    chkLine: "{c}: datele din {y} au fost verificate la {d} cu {src}.",
    chkRest: "Toate celelalte țări sunt afișate așa cum le are biblioteca.",

    gapTitle: "Ce nu acoperă datele",
    gapMoved: "Zilele lucrătoare pe care un guvern le mută ca să creeze weekenduri prelungite nu sunt în date, deci unele zile lucrătoare din jurul sărbătorilor pot fi altele: {c}.",
    gapLater: "Zilele libere pe care un guvern le anunță în cursul anului lipsesc până când sunt anunțate. În România, zilele libere suplimentare pentru sectorul bugetar se stabilesc prin hotărâre a Guvernului până la 15 ianuarie a fiecărui an (art. 139 alin. (4) din Codul muncii).",
    gapMoon: "Sărbătorile care urmează calendarul lunar sunt estimări și se pot muta cu o zi. Țări cu astfel de zile în date: {c}.",
    gapStates: "{c}: doar sărbătorile de la nivel național, nu și cele ale fiecărui stat.",
    gapPartial: "{c}: {x} din {t} de state și teritorii au date proprii.",
    gapOwn: "Închiderile firmei, contractele colective și obiceiurile locale nu sunt în date. Contează calendarul angajatorului tău.",

    errTitle: "Ai găsit o dată greșită?",
    errText: "Scrie la {mail}, cu țara, data și un link către sursa oficială. Corectăm erorile confirmate.",

    whoTitle: "Cine îl administrează",
    whoBy: "Planificator Concedii Echipă este publicat de {p}.",
    contactTitle: "Contact",
    contactText: "Întrebări, corecturi și cereri legate de datele tale: {mail}.",
    privacyText: "Ce se păstrează despre o echipă și pentru cât timp scrie pe {privacy}.",
    privacyWord: "pagina de confidențialitate",

    fine: "Datele despre sărbători au fost reconstruite ultima dată la {d}. Pagina a fost revizuită ultima dată la {r}.",
    ctaTitle: "Încearcă-l cu echipa ta",
    ctaText: "Creează o echipă, adaugă oamenii și țările lor și trimite linkul.",
    and: "și",
  },
};
