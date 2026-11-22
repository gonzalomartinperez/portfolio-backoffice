import assert from "node:assert/strict";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { beforeEach, test, vi } from "vitest";
import nextConfig from "../../next.config.ts";
import { proxy, config as proxyConfig } from "../../src/proxy.ts";
import { operationalPayload } from "../fixtures/operations.ts";
import { authEnv, authState, ORIGIN, resetAuthState } from "../security/auth-harness.ts";
import { enumerateSurface } from "../security/source-tree.ts";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("../../src/server/auth/runtime.ts", async () => {
  const harness = await import("../security/auth-harness.ts");
  return { createAuthRuntime: () => harness.fakeAuthRuntime() };
});

// Set by src/proxy.ts on every matched request. There is no nonce CSP and no HSTS in the app:
// the CSP is static (no script-src) and HSTS belongs to the TLS-terminating reverse proxy.
const proxyHeaders = {
  "cache-control": "private, no-store",
  "content-security-policy": "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};
const entries = (headers: Headers, names: string[]) =>
  Object.fromEntries(names.map((name) => [name, headers.get(name)]));

beforeEach(() => {
  for (const [name, value] of Object.entries(authEnv)) vi.stubEnv(name, value);
  vi.stubEnv("OPERATIONS_API_ORIGIN", "http://api-private:8000");
  vi.stubEnv("OPERATIONS_READ_TOKEN", "fixture-read-token");
  vi.stubGlobal("fetch", async () => Response.json(operationalPayload));
});

test("unit (proxy layer, not the wire): proxy sets the same explicit security headers on every route class", () => {
  const response = proxy();
  const actual = Object.fromEntries(
    [...response.headers].filter(([name]) => !name.startsWith("x-middleware")).sort(),
  );
  assert.deepEqual(actual, proxyHeaders);
  // Gaps versus docs/master-plan/testing.md section 4, pinned so a change is deliberate.
  assert.equal(response.headers.get("strict-transport-security"), null);
  assert.equal(response.headers.get("x-robots-tag"), null);
  assert.doesNotMatch(response.headers.get("content-security-policy") ?? "", /nonce|script-src/);
  assert.equal(nextConfig.poweredByHeader, false);
  assert.equal(nextConfig.headers, undefined);
});

// Routes the proxy may legitimately skip, with the reason. Everything else must be matched.
const proxyExclusions: Record<string, string> = {};
const sample = (path: string) =>
  path.replace(/\[\[?\.\.\.\w+\]?\]/g, "x/y").replace(/\[\w+\]/g, "x");

test("unit (proxy layer): the proxy matcher covers every enumerated page and route", () => {
  const matches = (url: string) => unstable_doesMiddlewareMatch({ config: proxyConfig, url });
  const paths = new Set(
    [...enumerateSurface().keys()]
      .filter((key) => key.startsWith("page ") || key.startsWith("route "))
      .map((key) => sample(key.split(" ").at(-1) ?? "")),
  );
  for (const path of paths) assert.equal(matches(path), !(path in proxyExclusions), path);
  for (const path of ["/_next/static/app.js", "/_next/image", "/favicon.ico"])
    assert.equal(matches(path), false, path);
});

test("unit (handler layer, not the wire): handlers add their own cache policy per route class", async () => {
  const names = ["cache-control", "vary", "referrer-policy"];
  resetAuthState("owner");
  const request = (path: string, init?: RequestInit) => new Request(`${ORIGIN}${path}`, init);
  const classes: Array<[string, Response, Record<string, string | null>]> = [
    [
      "api",
      await (await import("../../src/app/api/operations/route.ts")).GET(),
      { "cache-control": "private, no-store", vary: "Cookie", "referrer-policy": null },
    ],
    [
      "auth api",
      await (await import("../../src/app/api/auth/[...all]/route.ts")).POST(
        request("/api/auth/sign-out", { method: "POST" }),
      ),
      { "cache-control": "private, no-store", vary: null, "referrer-policy": null },
    ],
    [
      "health",
      (await import("../../src/app/api/health/route.ts")).GET(),
      { "cache-control": "no-store", vary: null, "referrer-policy": null },
    ],
    [
      "ready",
      await (await import("../../src/app/api/ready/route.ts")).GET(),
      { "cache-control": "no-store", vary: null, "referrer-policy": null },
    ],
    [
      "invitation landing",
      (await import("../../src/app/access/invitation/route.ts")).GET(
        request(`/access/invitation?token=${"a".repeat(64)}`),
      ),
      { "cache-control": "no-store", vary: null, "referrer-policy": "no-referrer" },
    ],
  ];
  for (const [name, response, expected] of classes)
    assert.deepEqual(entries(response.headers, names), expected, name);
});

test("unit (handler layer): health and readiness bodies carry no secrets, SQL or database errors", async () => {
  resetAuthState("owner");
  vi.stubEnv("APP_VERSION", "1.2.3");
  vi.stubEnv("APP_REVISION", "abc123");
  const build = { version: "1.2.3", revision: "abc123" };
  const { SCHEMA_VERSION } = await import("../../src/server/build-info.ts");
  const health = (await import("../../src/app/api/health/route.ts")).GET();
  assert.deepEqual(await health.json(), {
    status: "alive",
    application: "portfolio-assistant-backoffice",
    ...build,
  });
  const ready = await (await import("../../src/app/api/ready/route.ts")).GET();
  assert.deepEqual(await ready.json(), {
    status: "ready",
    ...build,
    schema_version: SCHEMA_VERSION,
  });
  resetAuthState("owner");
  authState.poolError = new Error(
    'relation "session" does not exist: SELECT id,token FROM session at postgres://app:pw@db:5432/iam',
  );
  const down = await (await import("../../src/app/api/ready/route.ts")).GET();
  assert.equal(down.status, 503);
  const body = await down.text();
  assert.doesNotMatch(body, /postgres|session|SELECT|token|pw@/);
  assert.deepEqual(JSON.parse(body), {
    status: "unavailable",
    ...build,
    schema_version: SCHEMA_VERSION,
  });
});
