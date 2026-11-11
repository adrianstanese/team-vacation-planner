// "Buy me a coffee" pill for the top-right of every screen. A plain outbound link: no widget script,
// no tracking, no cookies. No hooks, so it works in server and client components alike.
export const SUPPORT_URL = "https://buymeacoffee.com/stanese";

const TX: Record<string, { cta: string; tab: string }> = {
  en: { cta: "Buy me a coffee", tab: "opens buymeacoffee.com in a new tab" },
  fr: { cta: "Offrez-moi un café", tab: "ouvre buymeacoffee.com dans un nouvel onglet" },
  de: { cta: "Kaffee spendieren", tab: "öffnet buymeacoffee.com in einem neuen Tab" },
  es: { cta: "Invítame a un café", tab: "abre buymeacoffee.com en una pestaña nueva" },
  pt: { cta: "Ofereça-me um café", tab: "abre buymeacoffee.com num novo separador" },
  ro: { cta: "Cumpără-mi o cafea", tab: "se deschide buymeacoffee.com într-o filă nouă" },
  hu: { cta: "Hívj meg egy kávéra", tab: "új lapon megnyitja a buymeacoffee.com oldalt" },
  sv: { cta: "Bjud på en kaffe", tab: "öppnar buymeacoffee.com i en ny flik" },
  it: { cta: "Offrimi un caffè", tab: "apre buymeacoffee.com in una nuova scheda" },
  bg: { cta: "Почерпете ме с кафе", tab: "отваря buymeacoffee.com в нов раздел" },
  ar: { cta: "اشترِ لي قهوة", tab: "يفتح buymeacoffee.com في علامة تبويب جديدة" },
};

export default function CoffeeButton({ lang = "en", iconOnly = false }: { lang?: string; iconOnly?: boolean }) {
  const l = TX[lang] || TX.en;
  return <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={iconOnly ? "tvp-cof-top tvp-cof-icon" : "tvp-cof-top"} aria-label={`${l.cta} (${l.tab})`} title={l.cta}>
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" /><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3" /></svg>
    {!iconOnly && <span className="tvp-cof-l">{l.cta}</span>}
  </a>;
}
