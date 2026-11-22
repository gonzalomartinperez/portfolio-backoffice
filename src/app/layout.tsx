import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getDocumentLocale } from "../server/auth/session";
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
  const locale = await getDocumentLocale();
  return (
    <html lang={languageTag(locale)} className={fontClassName} suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: fixed pre-paint theme replay, no user HTML.
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("assistant-theme");document.documentElement.dataset.theme=t==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}',
          }}
        />
      </head>
      <body>
        <SkipLink locale={locale} />
        {children}
      </body>
    </html>
  );
}
