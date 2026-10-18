import type {
	BrowserSessionPort,
	IdentityProvider,
} from "../application/browser-session.ts";

interface AuthRequests {
	signIn: {
		social(input: {
			provider: IdentityProvider;
			callbackURL: string;
			errorCallbackURL: string;
		}): Promise<unknown>;
	};
	signOut(): Promise<unknown>;
	linkSocial(input: {
		provider: IdentityProvider;
		callbackURL: string;
	}): Promise<unknown>;
}

function successful(result: unknown): boolean {
	return (
		typeof result === "object" &&
		result !== null &&
		"error" in result &&
		result.error === null
	);
}

export function createBrowserSession(
	requests: AuthRequests,
	navigate: (path: string) => void,
): BrowserSessionPort {
	return {
		async signIn(provider, locale) {
			return successful(
				await requests.signIn.social({
					provider,
					callbackURL: `/?locale=${locale}`,
					errorCallbackURL: `/sign-in?locale=${locale}&error=access`,
				}),
			);
		},
		async signOut(locale) {
			if (!successful(await requests.signOut())) return false;
			navigate(`/sign-in?locale=${locale}`);
			return true;
		},
		async link(provider, locale) {
			return successful(
				await requests.linkSocial({
					provider,
					callbackURL: `/access?locale=${locale}`,
				}),
			);
		},
	};
}
