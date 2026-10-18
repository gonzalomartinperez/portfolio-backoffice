import type { AuthLocale } from "../domain/locale.ts";

export type IdentityProvider = "google" | "github";

export interface BrowserSessionPort {
	signIn(provider: IdentityProvider, locale: AuthLocale): Promise<boolean>;
	signOut(locale: AuthLocale): Promise<boolean>;
	link(provider: IdentityProvider, locale: AuthLocale): Promise<boolean>;
}
