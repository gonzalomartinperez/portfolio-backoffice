import assert from "node:assert/strict";
import { test, vi } from "vitest";

// getDocumentLocale decides <html lang>: the header the proxy forwards from `?locale=` wins,
// otherwise the backoffice-locale cookie, otherwise English.
const request = vi.hoisted(() => ({
  header: null as string | null,
  cookie: undefined as string | undefined,
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(request.header ? { "x-backoffice-locale": request.header } : {}),
  cookies: async () => ({
    get: () => (request.cookie === undefined ? undefined : { value: request.cookie }),
  }),
}));
const { getDocumentLocale } = await import("../../src/server/auth/session.ts");

test.each([
  { header: "es", cookie: "en", expected: "es" },
  { header: "en", cookie: "es", expected: "en" },
  { header: null, cookie: "es", expected: "es" },
  { header: "fr", cookie: "es", expected: "es" },
  { header: null, cookie: undefined, expected: "en" },
])("header $header and cookie $cookie give $expected", async ({ header, cookie, expected }) => {
  request.header = header;
  request.cookie = cookie;
  assert.equal(await getDocumentLocale(), expected);
});
