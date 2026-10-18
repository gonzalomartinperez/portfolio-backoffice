import { SignIn } from "../../features/auth/entry.tsx";
import { authCopy, authLocale } from "../../features/auth/presentation/copy.ts";
import { getAuthLocale, readiness } from "../../server/auth/session.ts";
import styles from "../../features/auth/presentation/auth.module.css";
export const metadata = {
	title: "Sign in — Portfolio backoffice",
	robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function SignInPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const params = await searchParams;
	const locale = params.locale
		? authLocale(params.locale)
		: await getAuthLocale();
	const available = await readiness();
	const copy = authCopy[locale];
	return (
		<main id="main" lang={locale} className={styles.main}>
			<SignIn locale={locale} unavailable={!available} />
			<p>
				<a href={`/privacy?locale=${locale}`}>
					{locale === "es" ? "Privacidad y datos" : "Privacy and data"}
				</a>
			</p>
			{!available ? (
				<p className={styles.notice} role="status">
					{copy.unavailable}
				</p>
			) : (
				params.error && (
					<p className={styles.error} role="alert">
						{copy.denied}
					</p>
				)
			)}
		</main>
	);
}
