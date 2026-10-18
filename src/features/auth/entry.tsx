"use client";
import type { ComponentProps } from "react";
import { browserSession } from "./adapters/client.ts";
import { SignIn as SignInView } from "./presentation/sign-in.tsx";
import { SignOut as SignOutView } from "./presentation/sign-out.tsx";
import { LinkAccount as LinkAccountView } from "./presentation/link-account.tsx";

export function SignIn(
	props: Omit<ComponentProps<typeof SignInView>, "session">,
) {
	return <SignInView {...props} session={browserSession} />;
}
export function SignOut(
	props: Omit<ComponentProps<typeof SignOutView>, "session">,
) {
	return <SignOutView {...props} session={browserSession} />;
}
export function LinkAccount(
	props: Omit<ComponentProps<typeof LinkAccountView>, "session">,
) {
	return <LinkAccountView {...props} session={browserSession} />;
}
