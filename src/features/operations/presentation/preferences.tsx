"use client";
import { useId, useState } from "react";
import { type ThemePreference, themeCookieValue } from "../../../shared/ui/theme.ts";
import { type OperationsLocale, operationsCopy } from "./copy";
import styles from "./workbench.module.css";
export function Preferences({
  locale,
  theme,
}: {
  locale: OperationsLocale;
  theme: ThemePreference;
}) {
  const t = operationsCopy[locale];
  const preferenceId = useId();
  const [selected, setSelected] = useState<ThemePreference>(theme);
  return (
    <details
      className={styles.preferences}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>{t.preferences}</summary>
      <div className="settings-fields">
        <div className={styles.preferenceField}>
          <label htmlFor={`${preferenceId}-locale`}>{t.language}</label>
          <select
            id={`${preferenceId}-locale`}
            value={locale}
            onChange={(event) => {
              const target = new URL(window.location.href);
              const nextLocale = event.target.value === "es" ? "es" : "en";
              target.searchParams.set("locale", nextLocale);
              // biome-ignore lint/suspicious/noDocumentCookie: cross-browser locale preference only; session credentials remain HttpOnly.
              document.cookie = `backoffice-locale=${nextLocale}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
              window.location.assign(target);
            }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div className={styles.preferenceField}>
          <label htmlFor={`${preferenceId}-theme`}>{t.theme}</label>
          <select
            id={`${preferenceId}-theme`}
            value={selected}
            onChange={(event) => {
              const value =
                event.target.value === "light" || event.target.value === "system"
                  ? event.target.value
                  : "dark";
              setSelected(value);
              // `system` removes the attribute so style.css follows prefers-color-scheme.
              if (value === "system") delete document.documentElement.dataset.theme;
              else document.documentElement.dataset.theme = value;
              // biome-ignore lint/suspicious/noDocumentCookie: the server reads this cookie to render data-theme; session credentials remain HttpOnly.
              document.cookie = themeCookieValue(value, window.location.protocol === "https:");
            }}
          >
            <option value="dark">{t.dark}</option>
            <option value="light">{t.light}</option>
            <option value="system">{t.system}</option>
          </select>
        </div>
      </div>
    </details>
  );
}
