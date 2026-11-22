type Locale = "en" | "es";

export function languageTag(locale: Locale): "en-US" | "es-419" {
  return locale === "es" ? "es-419" : "en-US";
}

export function numberFormat(locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(languageTag(locale), options);
}

export function dateTimeFormat(locale: Locale, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(languageTag(locale), { ...options, timeZone: "UTC" });
}

export function displayNames(locale: Locale, options: Intl.DisplayNamesOptions) {
  return new Intl.DisplayNames([languageTag(locale)], options);
}
