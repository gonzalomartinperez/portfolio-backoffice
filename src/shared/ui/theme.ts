// The theme preference lives in a server-readable cookie so the root layout can render
// `<html data-theme>` without a pre-paint script (PBO-D12, ADR 0015).
export const themeCookie = "backoffice-theme";
export type ThemePreference = "dark" | "light" | "system";

export function themePreference(value: string | undefined): ThemePreference {
  return value === "light" || value === "system" ? value : "dark";
}

// `system` renders no attribute: style.css then follows prefers-color-scheme.
export function documentTheme(preference: ThemePreference): "dark" | "light" | undefined {
  return preference === "system" ? undefined : preference;
}

export function themeCookieValue(value: ThemePreference, secure: boolean) {
  return `${themeCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}
