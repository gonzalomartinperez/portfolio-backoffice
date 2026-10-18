"use client";
import { useState } from "react";
import { Button } from "../../../shared/ui/button.tsx";
import type { BrowserSessionPort } from "../application/browser-session.ts";
import { authCopy, type AuthLocale } from "./copy.ts";
import styles from "./auth.module.css";
export function LinkAccount({
	locale = "en",
	session,
}: {
	locale?: AuthLocale;
	session: BrowserSessionPort;
}) {
	const copy = authCopy[locale];
	const [pending, setPending] = useState(false);
	const [error, setError] = useState(false);
	async function link(provider: "google" | "github") {
		if (pending) return;
		setPending(true);
		setError(false);
		try {
			const successful = await session.link(provider, locale);
			if (!successful) {
				setError(true);
				setPending(false);
			}
		} catch {
			setError(true);
			setPending(false);
		}
	}
	return (
		<section className={styles.stack} aria-labelledby="link-title">
			<h2 id="link-title">{copy.linkTitle}</h2>
			<p>{copy.linkIntro}</p>
			<div className={styles.actions}>
				<Button disabled={pending} onClick={() => void link("google")}>
					{copy.linkGoogle}
				</Button>
				<Button disabled={pending} onClick={() => void link("github")}>
					{copy.linkGithub}
				</Button>
			</div>
			{error && <p role="alert">{copy.linkError}</p>}
		</section>
	);
}
