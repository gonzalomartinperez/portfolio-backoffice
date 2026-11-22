import assert from "node:assert/strict";
import { test, vi } from "vitest";

// The root layout renders data-theme from the backoffice-theme cookie (ADR 0015).
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
  }),
}));
const { getDocumentTheme, getThemePreference } = await import("../../src/server/auth/session.ts");

test.each([
  { cookie: undefined, preference: "dark", rendered: "dark" },
  { cookie: "light", preference: "light", rendered: "light" },
  { cookie: "system", preference: "system", rendered: undefined },
  { cookie: '"><script>', preference: "dark", rendered: "dark" },
])("cookie $cookie renders $rendered", async ({ cookie, preference, rendered }) => {
  jar.clear();
  if (cookie !== undefined) jar.set("backoffice-theme", cookie);
  assert.equal(await getThemePreference(), preference);
  assert.equal(await getDocumentTheme(), rendered);
});
