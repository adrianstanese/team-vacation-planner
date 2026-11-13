"use client";
// "Recommend this tool" section, shown at the bottom of every screen (pattern from codulmunciiromania.app's
// ShareSection). It always shares the planner's home page, NEVER the open team: a team link gives edit access
// to that board. Copy link, the native share sheet where available, WhatsApp / Viber (phones) / Telegram /
// LinkedIn / Facebook / X / e-mail, and a QR code. Letter marks instead of brand logos.
import { useEffect, useId, useState } from "react";
import qrcode from "qrcode-generator";
import { isRtl } from "@/lib/extraText";
import { langPath } from "@/lib/langs";

export const SITE_URL = "https://www.vacationplanner.team/";
// "Buy me a coffee": a plain outbound link (no widget script, no tracking, no cookies), as in GadgetFit/InterviewPrep.
export const SUPPORT_URL = "https://buymeacoffee.com/stanese";

type Th = { ti?: string; tx: string; t2: string; t3: string; ac: string; al: string; gbg?: string; gbd?: string; sf: string; bd: string };
type L = { cof: string; cofCta: string; cofTab: string; title: string; sub: string; copy: string; copied: string; more: string; email: string; qr: string; qrHint: string; msg: string; failed: string };

const LABELS: Record<string, L> = {
  en: { cof: "Free, no ads, made by one person. If it saves your team time, you can buy me a coffee.", cofCta: "Buy me a coffee", cofTab: "opens buymeacoffee.com in a new tab", title: "Recommend this tool", sub: "Know a team that plans vacations? Send them the planner.", copy: "Copy link", copied: "Copied", more: "More…", email: "Email", qr: "QR code", qrHint: "Scan to open the planner", msg: "Team Vacation Planner – free team leave calendar with public holidays for 61 countries, no login", failed: "Copy failed – select the link and copy it" },
  fr: { cof: "Gratuit, sans publicité, conçu par une seule personne. S'il fait gagner du temps à votre équipe, vous pouvez m'offrir un café.", cofCta: "Offrez-moi un café", cofTab: "ouvre buymeacoffee.com dans un nouvel onglet", title: "Recommander cet outil", sub: "Vous connaissez une équipe qui planifie ses congés ? Envoyez-lui le planificateur.", copy: "Copier le lien", copied: "Copié", more: "Plus…", email: "E-mail", qr: "Code QR", qrHint: "Scannez pour ouvrir le planificateur", msg: "Planificateur de congés d'équipe – calendrier gratuit avec les jours fériés de 61 pays, sans inscription", failed: "Échec de la copie – sélectionnez le lien" },
  de: { cof: "Kostenlos, ohne Werbung, von einer Person gemacht. Wenn er Ihrem Team Zeit spart, können Sie mir einen Kaffee spendieren.", cofCta: "Spendieren Sie mir einen Kaffee", cofTab: "öffnet buymeacoffee.com in einem neuen Tab", title: "Dieses Tool empfehlen", sub: "Kennen Sie ein Team, das Urlaub plant? Schicken Sie ihm den Planer.", copy: "Link kopieren", copied: "Kopiert", more: "Mehr…", email: "E-Mail", qr: "QR-Code", qrHint: "Scannen, um den Planer zu öffnen", msg: "Team-Urlaubsplaner – kostenloser Urlaubskalender mit Feiertagen für 61 Länder, ohne Anmeldung", failed: "Kopieren fehlgeschlagen – Link markieren und kopieren" },
  es: { cof: "Gratis, sin anuncios y hecho por una sola persona. Si le ahorra tiempo a tu equipo, puedes invitarme a un café.", cofCta: "Invítame a un café", cofTab: "abre buymeacoffee.com en una pestaña nueva", title: "Recomienda esta herramienta", sub: "¿Conoces un equipo que planifica vacaciones? Envíale el planificador.", copy: "Copiar enlace", copied: "Copiado", more: "Más…", email: "Correo", qr: "Código QR", qrHint: "Escanea para abrir el planificador", msg: "Planificador de vacaciones de equipo – calendario gratuito con festivos de 61 países, sin registro", failed: "No se pudo copiar – selecciona el enlace" },
  pt: { cof: "Gratuito, sem anúncios, feito por uma só pessoa. Se poupa tempo à sua equipa, pode oferecer-me um café.", cofCta: "Ofereça-me um café", cofTab: "abre buymeacoffee.com num novo separador", title: "Recomendar esta ferramenta", sub: "Conhece uma equipa que planeia férias? Envie-lhe o planeador.", copy: "Copiar link", copied: "Copiado", more: "Mais…", email: "E-mail", qr: "Código QR", qrHint: "Leia o código para abrir o planeador", msg: "Planeador de férias de equipa – calendário gratuito com feriados de 61 países, sem registo", failed: "Falha ao copiar – selecione o link" },
  ro: { cof: "Gratuit, fără reclame, făcut de o singură persoană. Dacă îi economisește timp echipei tale, poți să-mi cumperi o cafea.", cofCta: "Cumpără-mi o cafea", cofTab: "se deschide buymeacoffee.com într-o filă nouă", title: "Recomandă instrumentul", sub: "Știi o echipă care își planifică concediile? Trimite-le planificatorul.", copy: "Copiază linkul", copied: "Copiat", more: "Mai mult…", email: "E-mail", qr: "Cod QR", qrHint: "Scanează pentru a deschide planificatorul", msg: "Planificator concedii echipă – calendar gratuit cu sărbătorile legale din 61 de țări, fără cont", failed: "Copierea a eșuat – selectează linkul" },
  hu: { cof: "Ingyenes, reklám nélkül, egyetlen ember készíti. Ha időt spórol a csapatodnak, meghívhatsz egy kávéra.", cofCta: "Hívj meg egy kávéra", cofTab: "új lapon megnyitja a buymeacoffee.com oldalt", title: "Ajánld ezt az eszközt", sub: "Ismersz egy csapatot, amely szabadságot tervez? Küldd el nekik a tervezőt.", copy: "Link másolása", copied: "Másolva", more: "Továbbiak…", email: "E-mail", qr: "QR-kód", qrHint: "Szkenneld be a tervező megnyitásához", msg: "Csapat szabadságtervező – ingyenes szabadságnaptár 61 ország ünnepnapjaival, regisztráció nélkül", failed: "A másolás nem sikerült – jelöld ki a linket" },
  sv: { cof: "Gratis, utan reklam, gjort av en person. Om det sparar tid åt ditt team kan du bjuda mig på en kaffe.", cofCta: "Bjud mig på en kaffe", cofTab: "öppnar buymeacoffee.com i en ny flik", title: "Rekommendera verktyget", sub: "Känner du ett team som planerar semester? Skicka planeraren till dem.", copy: "Kopiera länk", copied: "Kopierad", more: "Mer…", email: "E-post", qr: "QR-kod", qrHint: "Skanna för att öppna planeraren", msg: "Semesterplanerare för team – gratis ledighetskalender med helgdagar för 61 länder, ingen inloggning", failed: "Kopieringen misslyckades – markera länken" },
  it: { cof: "Gratuito, senza pubblicità, fatto da una sola persona. Se fa risparmiare tempo al tuo team, puoi offrirmi un caffè.", cofCta: "Offrimi un caffè", cofTab: "apre buymeacoffee.com in una nuova scheda", title: "Consiglia questo strumento", sub: "Conosci un team che pianifica le ferie? Inviagli il pianificatore.", copy: "Copia link", copied: "Copiato", more: "Altro…", email: "Email", qr: "Codice QR", qrHint: "Scansiona per aprire il pianificatore", msg: "Pianificatore ferie di team – calendario gratuito con le festività di 61 paesi, senza registrazione", failed: "Copia non riuscita – seleziona il link" },
  bg: { cof: "Безплатно, без реклами, създадено от един човек. Ако спестява време на екипа Ви, можете да ме почерпите с кафе.", cofCta: "Почерпете ме с кафе", cofTab: "отваря buymeacoffee.com в нов раздел", title: "Препоръчайте инструмента", sub: "Познавате екип, който планира отпуски? Изпратете им планера.", copy: "Копирайте линка", copied: "Копирано", more: "Още…", email: "Имейл", qr: "QR код", qrHint: "Сканирайте, за да отворите планера", msg: "Планер за отпуски на екипа – безплатен календар с официалните празници на 61 държави, без регистрация", failed: "Копирането не успя – маркирайте линка" },
  ar: { cof: "مجاني، بلا إعلانات، ويصنعه شخص واحد. إن وفّر وقت فريقك، يمكنك أن تشتري لي قهوة.", cofCta: "اشترِ لي قهوة", cofTab: "يفتح buymeacoffee.com في علامة تبويب جديدة", title: "أوصِ بهذه الأداة", sub: "هل تعرف فريقاً يخطط لإجازاته؟ أرسل له المخطِّط.", copy: "نسخ الرابط", copied: "تم النسخ", more: "المزيد…", email: "البريد الإلكتروني", qr: "رمز QR", qrHint: "امسح الرمز لفتح المخطِّط", msg: "مخطط إجازات الفريق – تقويم إجازات مجاني مع العطل الرسمية لـ 61 دولة، دون تسجيل", failed: "تعذّر النسخ – حدّد الرابط وانسخه" },
/*i18n:bn*/bn:{"cof":"বিনামূল্যে, বিজ্ঞাপন ছাড়া, একজন মানুষের তৈরি। এটি আপনার টিমের সময় বাঁচালে আমাকে এক কাপ কফি খাওয়াতে পারেন।","cofCta":"আমাকে এক কাপ কফি খাওয়ান","cofTab":"নতুন ট্যাবে buymeacoffee.com খুলবে","title":"এই টুলটি অন্যদের জানান","sub":"ছুটির পরিকল্পনা করে এমন কোনো টিম চেনেন? তাদের এই প্ল্যানারটি পাঠান।","copy":"লিংক কপি করুন","copied":"কপি হয়েছে","more":"আরও…","email":"ইমেইল","qr":"QR কোড","qrHint":"প্ল্যানার খুলতে স্ক্যান করুন","msg":"Team Vacation Planner – টিমের জন্য বিনামূল্যের ছুটির ক্যালেন্ডার, 61টি দেশের সরকারি ছুটিসহ, লগইন ছাড়াই","failed":"কপি করা যায়নি – লিংকটি সিলেক্ট করে কপি করুন"},/*/i18n:bn*/
/*i18n:hi*/hi:{"cof":"मुफ़्त, बिना विज्ञापन, एक अकेले व्यक्ति का बनाया हुआ। अगर इससे आपकी टीम का समय बचता है, तो आप मुझे एक कॉफ़ी पिला सकते हैं।","cofCta":"मुझे एक कॉफ़ी पिलाएँ","cofTab":"buymeacoffee.com नए टैब में खुलता है","title":"यह टूल दूसरों को सुझाएँ","sub":"किसी ऐसी टीम को जानते हैं जो छुट्टियाँ प्लान करती है? उन्हें यह प्लानर भेजें।","copy":"लिंक कॉपी करें","copied":"कॉपी हो गया","more":"और…","email":"ईमेल","qr":"QR कोड","qrHint":"प्लानर खोलने के लिए स्कैन करें","msg":"Team Vacation Planner – टीम की छुट्टियों का मुफ़्त कैलेंडर, 61 देशों के सार्वजनिक अवकाशों के साथ, बिना लॉगिन","failed":"कॉपी नहीं हो सका – लिंक चुनकर ख़ुद कॉपी करें"},/*/i18n:hi*/
/*i18n:ja*/ja:{"cof":"無料・広告なし、1人で開発しています。チームの時間の節約に役立ったら、コーヒーを1杯おごっていただけると嬉しいです。","cofCta":"コーヒーをおごる","cofTab":"新しいタブでbuymeacoffee.comを開きます","title":"このツールをすすめる","sub":"休暇を計画しているチームをご存じですか?このプランナーを教えてあげてください。","copy":"リンクをコピー","copied":"コピーしました","more":"その他…","email":"メール","qr":"QRコード","qrHint":"スキャンしてプランナーを開く","msg":"Team Vacation Planner – 61か国の祝日に対応した、無料・ログイン不要のチーム休暇カレンダー","failed":"コピーできませんでした – リンクを選択してコピーしてください"},/*/i18n:ja*/
/*i18n:ru*/ru:{"cof":"Бесплатно, без рекламы, сделано одним человеком. Если сервис экономит время вашей команде, можете угостить меня кофе.","cofCta":"Угостить меня кофе","cofTab":"откроется buymeacoffee.com в новой вкладке","title":"Порекомендуйте этот сервис","sub":"Знаете команду, которая планирует отпуска? Отправьте им планировщик.","copy":"Копировать ссылку","copied":"Скопировано","more":"Ещё…","email":"E-mail","qr":"QR-код","qrHint":"Сканируйте, чтобы открыть планировщик","msg":"Team Vacation Planner – бесплатный календарь отпусков для команды с праздничными днями 61 страны, без регистрации","failed":"Не удалось скопировать – выделите ссылку и скопируйте её вручную"},/*/i18n:ru*/
/*i18n:ur*/ur:{"cof":"مفت، بغیر اشتہارات، ایک ہی فرد کا بنایا ہوا۔ اگر یہ آپ کی ٹیم کا وقت بچاتا ہے تو آپ مجھے کافی پلا سکتے ہیں۔","cofCta":"مجھے کافی پلائیں","cofTab":"buymeacoffee.com نئے ٹیب میں کھلتا ہے","title":"یہ ٹول دوسروں کو بتائیں","sub":"کسی ایسی ٹیم کو جانتے ہیں جو چھٹیوں کی منصوبہ بندی کرتی ہے؟ انہیں یہ پلانر بھیجیں۔","copy":"لنک کاپی کریں","copied":"کاپی ہو گیا","more":"مزید…","email":"ای میل","qr":"QR کوڈ","qrHint":"پلانر کھولنے کے لیے اسکین کریں","msg":"Team Vacation Planner – ٹیم کی چھٹیوں کا مفت کیلنڈر، 61 ممالک کی سرکاری تعطیلات کے ساتھ، لاگ اِن کے بغیر","failed":"کاپی نہیں ہو سکا – لنک منتخب کر کے خود کاپی کریں"},/*/i18n:ur*/
/*i18n:zh*/zh:{"cof":"免费、无广告，由一个人独立制作。如果它为您的团队节省了时间，欢迎请我喝杯咖啡。","cofCta":"请我喝杯咖啡","cofTab":"在新标签页中打开 buymeacoffee.com","title":"推荐此工具","sub":"认识需要规划休假的团队吗？把这个工具发给他们吧。","copy":"复制链接","copied":"已复制","more":"更多…","email":"邮件","qr":"QR码","qrHint":"扫码打开本工具","msg":"Team Vacation Planner – 免费的团队休假日历，含61个国家的法定节假日，无需登录","failed":"复制失败，请选中链接后手动复制"},/*/i18n:zh*/
};

type Ch = { id: string; name: string; mark: string; color: string; href: string; external: boolean };

export function shareChannels(url: string, msg: string, emailLabel: string, mobile: boolean): Ch[] {
  const e = encodeURIComponent;
  const all: Ch[] = [
    { id: "whatsapp", name: "WhatsApp", mark: "W", color: "#25D366", href: `https://api.whatsapp.com/send?text=${e(`${msg} ${url}`)}`, external: true },
    { id: "viber", name: "Viber", mark: "V", color: "#7360F2", href: `viber://forward?text=${e(`${msg} ${url}`)}`, external: false },
    { id: "telegram", name: "Telegram", mark: "T", color: "#229ED9", href: `https://t.me/share/url?url=${e(url)}&text=${e(msg)}`, external: true },
    { id: "linkedin", name: "LinkedIn", mark: "in", color: "#0A66C2", href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`, external: true },
    { id: "facebook", name: "Facebook", mark: "f", color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`, external: true },
    { id: "x", name: "X", mark: "X", color: "#111111", href: `https://x.com/intent/post?url=${e(url)}&text=${e(msg)}`, external: true },
    { id: "email", name: emailLabel, mark: "@", color: "#6B7280", href: `mailto:?subject=${e(msg)}&body=${e(`${msg}\n${url}`)}`, external: false },
  ];
  return mobile ? all : all.filter(c => c.id !== "viber");
}

function qrPath(text: string): { d: string; n: number } {
  const q = qrcode(0, "M"); q.addData(text, "Byte"); q.make();
  const n = q.getModuleCount(); let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { d, n };
}

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
  try {
    const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch { return false; }
}

export default function ShareSection({ th, lang = "en", compact = false }: { th: Th; lang?: string; compact?: boolean }) {
  const l = LABELS[lang] || LABELS.en;
  // The planner's front page in the language on screen: whoever opens the link starts in that language
  const url = SITE_URL.replace(/\/$/, "") + langPath(lang);
  const [mobile, setMobile] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const qrId = useId();
  useEffect(() => {
    const t = setTimeout(() => {
      setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
      setMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || !!window.matchMedia?.("(pointer: coarse)").matches);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const onCopy = async () => {
    const ok = await copyText(url);
    setStatus(ok ? l.copied : l.failed);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    setTimeout(() => setStatus(""), 2600);
  };
  const onNative = async () => { try { await navigator.share({ title: l.msg, text: l.msg, url }); } catch { /* dismissed */ } };
  const qr = qrOpen ? qrPath(url) : null;
  const dot = (bg: string, fg = "#fff") => ({ width: 30, height: 30, borderRadius: "50%", background: bg, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 } as const);
  const chip = { display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", minHeight: 44, borderRadius: 999, border: `1px solid ${th.gbd || th.bd}`, background: th.gbg || th.sf, color: th.tx, fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer", fontFamily: "inherit", boxSizing: "border-box" } as const;

  return <section aria-labelledby={`${qrId}-h`} dir={isRtl(lang) ? "rtl" : "ltr"} style={{ width: "100%", maxWidth: 760, margin: compact ? "28px auto 8px" : "40px auto 12px", padding: compact ? "16px" : "20px 22px", boxSizing: "border-box", background: th.gbg || th.sf, border: `1px solid ${th.gbd || th.bd}`, borderRadius: 22, textAlign: "start" }}>
    <h2 id={`${qrId}-h`} style={{ margin: 0, fontSize: 16, fontWeight: 750, color: th.tx }}>{l.title}</h2>
    <p style={{ margin: "4px 0 14px", fontSize: 13, color: th.t2 }}>{l.sub}</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      <input type="url" dir="ltr" readOnly value={url} aria-label={l.copy} onFocus={e => e.currentTarget.select()} style={{ flex: "1 1 220px", minWidth: 0, minHeight: 44, padding: "0 14px", borderRadius: 14, border: `1px solid ${th.gbd || th.bd}`, background: th.sf, color: th.tx, fontSize: 13, fontFamily: "inherit" }} />
      <button type="button" onClick={onCopy} style={{ minHeight: 44, padding: "0 18px", borderRadius: 14, border: "none", background: th.ac, color: th.ti || "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{copied ? `✓ ${l.copied}` : l.copy}</button>
    </div>
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {canShare && <li><button type="button" onClick={onNative} style={chip}><span aria-hidden="true" style={dot(th.ac)}>↗</span>{l.more}</button></li>}
      {shareChannels(url, l.msg, l.email, mobile).map(c => <li key={c.id}>
        <a href={c.href} {...(c.external ? { target: "_blank", rel: "nofollow noopener noreferrer" } : {})} style={chip}><span aria-hidden="true" style={dot(c.color)}>{c.mark}</span>{c.name}</a>
      </li>)}
      <li><button type="button" aria-expanded={qrOpen} aria-controls={qrId} onClick={() => setQrOpen(o => !o)} style={chip}><span aria-hidden="true" style={dot(th.al, th.ac)}>▦</span>{l.qr}</button></li>
    </ul>
    <div id={qrId} hidden={!qrOpen} style={{ marginTop: 14, textAlign: "center" }}>
      {qr && <svg viewBox={`0 0 ${qr.n + 8} ${qr.n + 8}`} width="168" height="168" role="img" aria-label={l.qrHint} shapeRendering="crispEdges" style={{ borderRadius: 12, display: "inline-block" }}>
        <rect width={qr.n + 8} height={qr.n + 8} fill="#fff" /><path d={qr.d} fill="#1E1B4B" transform="translate(4 4)" />
      </svg>}
      <div style={{ fontSize: 12, color: th.t3, marginTop: 6 }}>{l.qrHint}</div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${th.gbd || th.bd}` }}>
      <p style={{ flex: "1 1 240px", margin: 0, fontSize: 13, color: th.t2 }}>{l.cof}</p>
      <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" aria-label={`${l.cofCta} (${l.cofTab})`} title={l.cofCta} className="tvp-coffee">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" /><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3" /></svg>
        {l.cofCta}
      </a>
    </div>
    <p role="status" aria-live="polite" style={{ margin: status ? "10px 0 0" : 0, fontSize: 12, color: th.t2, minHeight: 0 }}>{status}</p>
  </section>;
}
