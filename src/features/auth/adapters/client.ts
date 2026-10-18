"use client";
import { createAuthClient } from "better-auth/react";
import { createBrowserSession } from "./browser-session.ts";

export const browserSession = createBrowserSession(createAuthClient(), (path) =>
	window.location.assign(path),
);
