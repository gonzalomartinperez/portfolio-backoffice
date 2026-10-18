"use client";
import { useState } from "react";
import { Button } from "../../../shared/ui/button.tsx";
import type { BrowserSessionPort } from "../application/browser-session.ts";
import { authCopy, type AuthLocale } from "./copy.ts";
export function SignOut({
	label,
	locale = "en",
	session,
}: {
	label?: string;
	locale?: AuthLocale;
	session: BrowserSessionPort;
}) {
	const copy = authCopy[locale];
	const [pending, setPending] = useState(false);
	const [error, setError] = useState(false);
	async function signOut() {
		if (pending) return;
		setPending(true);
		setError(false);
		try {
			const successful = await session.signOut(locale);
			if (!successful) {
				setPending(false);
				setError(true);
			}
		} catch {
			setPending(false);
			setError(true);
		}
	}
	return (
		<>
			<Button disabled={pending} onClick={() => void signOut()}>
				{label ?? copy.signOut}
			</Button>
			{error && <p role="alert">{copy.signOutError}</p>}
		</>
	);
}
