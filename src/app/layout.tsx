import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getDocumentLocale, getDocumentTheme } from "../server/auth/session";
import { SkipLink } from "../shared/accessibility/skip-link";
import { languageTag } from "../shared/ui/intl.ts";
import { fontClassName } from "./fonts";
import "./style.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
export const metadata: Metadata = {
  title: "GMP · Portfolio backoffice",
  description:
    "Authenticated website interactions, assistant health and access for Gonzalo’s portfolio.",
  robots: { index: false, follow: false },
};
export default async function Layout({ children }: { children: ReactNode }) {
  const [locale, theme] = await Promise.all([getDocumentLocale(), getDocumentTheme()]);
  return (
    <html lang={languageTag(locale)} data-theme={theme} className={fontClassName}>
      <body>
        <SkipLink locale={locale} />
        {children}
      </body>
    </html>
  );
}
