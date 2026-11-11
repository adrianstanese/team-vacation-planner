"use client";
// "Recommend this tool" section, shown at the bottom of every screen (pattern from codulmunciiromania.app's
// ShareSection). It always shares the planner's home page, NEVER the open team: a team link gives edit access
// to that board. Copy link, the native share sheet where available, WhatsApp / Viber (phones) / Telegram /
// LinkedIn / Facebook / X / e-mail, and a QR code. Letter marks instead of brand logos.
import { useEffect, useId, useState } from "react";
import qrcode from "qrcode-generator";

export const SITE_URL = "https://www.vacationplanner.team/";

type Th = { ti?: string; tx: string; t2: string; t3: string; ac: string; al: string; gbg?: string; gbd?: string; sf: string; bd: string };
type L = { title: string; sub: string; copy: string; copied: string; more: string; email: string; qr: string; qrHint: string; msg: string; failed: string };

const LABELS: Record<string, L> = {
  en: { title: "Recommend this tool", sub: "Know a team that plans vacations? Send them the planner.", copy: "Copy link", copied: "Copied", more: "More…", email: "Email", qr: "QR code", qrHint: "Scan to open the planner", msg: "Team Vacation Planner – free team leave calendar with public holidays for 55 countries, no login", failed: "Copy failed – select the link and copy it" },
  fr: { title: "Recommander cet outil", sub: "Vous connaissez une équipe qui planifie ses congés ? Envoyez-lui le planificateur.", copy: "Copier le lien", copied: "Copié", more: "Plus…", email: "E-mail", qr: "Code QR", qrHint: "Scannez pour ouvrir le planificateur", msg: "Planificateur de congés d'équipe – calendrier gratuit avec les jours fériés de 55 pays, sans inscription", failed: "Échec de la copie – sélectionnez le lien" },
  de: { title: "Dieses Tool empfehlen", sub: "Kennen Sie ein Team, das Urlaub plant? Schicken Sie ihm den Planer.", copy: "Link kopieren", copied: "Kopiert", more: "Mehr…", email: "E-Mail", qr: "QR-Code", qrHint: "Scannen, um den Planer zu öffnen", msg: "Team-Urlaubsplaner – kostenloser Urlaubskalender mit Feiertagen für 55 Länder, ohne Anmeldung", failed: "Kopieren fehlgeschlagen – Link markieren und kopieren" },
  es: { title: "Recomienda esta herramienta", sub: "¿Conoces un equipo que planifica vacaciones? Envíale el planificador.", copy: "Copiar enlace", copied: "Copiado", more: "Más…", email: "Correo", qr: "Código QR", qrHint: "Escanea para abrir el planificador", msg: "Planificador de vacaciones de equipo – calendario gratuito con festivos de 55 países, sin registro", failed: "No se pudo copiar – selecciona el enlace" },
  pt: { title: "Recomendar esta ferramenta", sub: "Conhece uma equipa que planeia férias? Envie-lhe o planeador.", copy: "Copiar link", copied: "Copiado", more: "Mais…", email: "E-mail", qr: "Código QR", qrHint: "Leia o código para abrir o planeador", msg: "Planeador de férias de equipa – calendário gratuito com feriados de 55 países, sem registo", failed: "Falha ao copiar – selecione o link" },
  ro: { title: "Recomandă instrumentul", sub: "Știi o echipă care își planifică concediile? Trimite-le planificatorul.", copy: "Copiază linkul", copied: "Copiat", more: "Mai mult…", email: "E-mail", qr: "Cod QR", qrHint: "Scanează pentru a deschide planificatorul", msg: "Planificator concedii echipă – calendar gratuit cu sărbătorile legale din 55 de țări, fără cont", failed: "Copierea a eșuat – selectează linkul" },
  hu: { title: "Ajánld ezt az eszközt", sub: "Ismersz egy csapatot, amely szabadságot tervez? Küldd el nekik a tervezőt.", copy: "Link másolása", copied: "Másolva", more: "Továbbiak…", email: "E-mail", qr: "QR-kód", qrHint: "Szkenneld be a tervező megnyitásához", msg: "Csapat szabadságtervező – ingyenes szabadságnaptár 55 ország ünnepnapjaival, regisztráció nélkül", failed: "A másolás nem sikerült – jelöld ki a linket" },
  sv: { title: "Rekommendera verktyget", sub: "Känner du ett team som planerar semester? Skicka planeraren till dem.", copy: "Kopiera länk", copied: "Kopierad", more: "Mer…", email: "E-post", qr: "QR-kod", qrHint: "Skanna för att öppna planeraren", msg: "Semesterplanerare för team – gratis ledighetskalender med helgdagar för 55 länder, ingen inloggning", failed: "Kopieringen misslyckades – markera länken" },
  it: { title: "Consiglia questo strumento", sub: "Conosci un team che pianifica le ferie? Inviagli il pianificatore.", copy: "Copia link", copied: "Copiato", more: "Altro…", email: "Email", qr: "Codice QR", qrHint: "Scansiona per aprire il pianificatore", msg: "Pianificatore ferie di team – calendario gratuito con le festività di 55 paesi, senza registrazione", failed: "Copia non riuscita – seleziona il link" },
  bg: { title: "Препоръчайте инструмента", sub: "Познавате екип, който планира отпуски? Изпратете им планера.", copy: "Копирайте линка", copied: "Копирано", more: "Още…", email: "Имейл", qr: "QR код", qrHint: "Сканирайте, за да отвориш планера", msg: "Планер за отпуски на екипа – безплатен календар с официалните празници на 55 държави, без регистрация", failed: "Копирането не успя – маркирайте линка" },
  ar: { title: "أوصِ بهذه الأداة", sub: "هل تعرف فريقاً يخطط لإجازاته؟ أرسل له المخطِّط.", copy: "نسخ الرابط", copied: "تم النسخ", more: "المزيد…", email: "البريد الإلكتروني", qr: "رمز QR", qrHint: "امسح الرمز لفتح المخطِّط", msg: "مخطط إجازات الفريق – تقويم إجازات مجاني مع العطل الرسمية لـ 55 دولة، دون تسجيل", failed: "تعذّر النسخ – حدّد الرابط وانسخه" },
};

type Ch = { id: string; name: string; mark: string; color: string; href: string; external: boolean };

export function shareChannels(url: string, msg: string, emailLabel: string, mobile: boolean): Ch[] {
  const e = encodeURIComponent;
  const all: Ch[] = [
    { id: "whatsapp", name: "WhatsApp", mark: "W", color: "#25D366", href: `https://wa.me/?text=${e(`${msg} ${url}`)}`, external: true },
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
  const url = SITE_URL;
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

  return <section aria-labelledby={`${qrId}-h`} dir={lang === "ar" ? "rtl" : "ltr"} style={{ width: "100%", maxWidth: 760, margin: compact ? "28px auto 8px" : "40px auto 12px", padding: compact ? "16px" : "20px 22px", boxSizing: "border-box", background: th.gbg || th.sf, border: `1px solid ${th.gbd || th.bd}`, borderRadius: 22, textAlign: "start" }}>
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
    <p role="status" aria-live="polite" style={{ margin: status ? "10px 0 0" : 0, fontSize: 12, color: th.t2, minHeight: 0 }}>{status}</p>
  </section>;
}
