import { languageTag } from "../ui/intl.ts";

// Server-rendered with the document locale, so Spanish pages never flash an English skip link.
export function SkipLink({ locale }: { locale: "en" | "es" }) {
  return (
    <a className="skip-link" href="#main" lang={languageTag(locale)}>
      {locale === "es" ? "Ir al contenido" : "Skip to content"}
    </a>
  );
}
