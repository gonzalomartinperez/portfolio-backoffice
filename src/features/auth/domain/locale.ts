export type AuthLocale = "en" | "es";

export function authLocale(value: unknown): AuthLocale {
	return value === "es" ? "es" : "en";
}
