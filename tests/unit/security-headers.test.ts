import assert from "node:assert/strict";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, test, vi } from "vitest";
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

// Set by src/proxy.ts on every matched request. The CSP carries a per-request nonce (checked
// separately below), so it is not in this fixed map. HSTS is sent only on https origins.
const proxyHeaders = {
  "cache-control": "private, no-store",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};
const entries = (headers: Headers, names: string[]) =>
  Object.fromEntries(names.map((name) => [name, headers.get(name)]));

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  for (const [name, value] of Object.entries(authEnv)) vi.stubEnv(name, value);
  vi.stubEnv("OPERATIONS_API_ORIGIN", "http://api-private:8000");
  vi.stubEnv("OPERATIONS_READ_TOKEN", "fixture-read-token");
  vi.stubGlobal("fetch", async () => Response.json(operationalPayload));
});

const withoutPolicy = (response: Response) =>
  Object.fromEntries(
    [...response.headers]
      .filter(([name]) => !name.startsWith("x-middleware") && name !== "content-security-policy")
      .sort(),
  );
const nonceOf = (policy: string | null) => /'nonce-([^']+)'/.exec(policy ?? "")?.[1];
const directive = (policy: string | null, name: string) =>
  policy?.split("; ").find((part) => part === name || part.startsWith(`${name} `));

test("unit (proxy layer, not the wire): proxy sets the same explicit security headers on every route class", () => {
  vi.stubEnv("BACKOFFICE_ORIGIN", "http://localhost:3107");
  const response = proxy(new NextRequest("http://localhost:3107/"));
  assert.deepEqual(withoutPolicy(response), proxyHeaders);
  assert.equal(response.headers.get("strict-transport-security"), null);
  // Gap versus docs/master-plan/testing.md section 4, pinned so a change is deliberate.
  assert.equal(response.headers.get("x-robots-tag"), null);
  assert.equal(nextConfig.poweredByHeader, false);
  assert.equal(nextConfig.headers, undefined);
});

test("unit (proxy layer): the CSP is strict, nonce-based and has no inline script allowance", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("BACKOFFICE_ORIGIN", "http://localhost:3107");
  const policy = proxy(new NextRequest("http://localhost:3107/sign-in")).headers.get(
    "content-security-policy",
  );
  const nonce = nonceOf(policy);
  assert.ok(nonce && nonce.length >= 16);
  assert.equal(
    policy,
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}'`,
      "style-src-attr 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  assert.doesNotMatch(directive(policy, "script-src") ?? "", /unsafe-inline|unsafe-eval/);
  assert.doesNotMatch(directive(policy, "style-src") ?? "", /unsafe-inline/);
  assert.equal(directive(policy, "upgrade-insecure-requests"), undefined);
});

test("unit (proxy layer): development adds unsafe-eval to script-src only", () => {
  vi.stubEnv("NODE_ENV", "development");
  const policy = proxy(new NextRequest("http://localhost:3107/")).headers.get(
    "content-security-policy",
  );
  assert.match(directive(policy, "script-src") ?? "", /'unsafe-eval'/);
  assert.doesNotMatch(policy?.replace(directive(policy, "script-src") ?? "", "") ?? "", /eval/);
});

test("unit (proxy layer): every request gets a fresh nonce and it reaches rendering", () => {
  const seen = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const response = proxy(
      new NextRequest("http://localhost:3107/", { headers: { "x-nonce": "forged" } }),
    );
    const nonce = nonceOf(response.headers.get("content-security-policy"));
    assert.ok(nonce);
    assert.notEqual(nonce, "forged");
    seen.add(nonce);
    // Request headers override: what Next hands the renderer (it parses the nonce from the CSP).
    assert.equal(response.headers.get("x-middleware-request-x-nonce"), nonce);
    assert.equal(
      response.headers.get("x-middleware-request-content-security-policy"),
      response.headers.get("content-security-policy"),
    );
  }
  assert.equal(seen.size, 20);
});

test("unit (proxy layer): HSTS and upgrade-insecure-requests follow the configured origin, not X-Forwarded-Proto", () => {
  const hsts = "max-age=63072000; includeSubDomains";
  const run = (origin: string, url: string, headers: Record<string, string> = {}) => {
    vi.stubEnv("BACKOFFICE_ORIGIN", origin);
    const response = proxy(new NextRequest(url, { headers }));
    return [
      response.headers.get("strict-transport-security"),
      directive(response.headers.get("content-security-policy"), "upgrade-insecure-requests"),
    ];
  };
  assert.deepEqual(run("https://backoffice.example", "http://internal:3000/"), [
    hsts,
    "upgrade-insecure-requests",
  ]);
  assert.deepEqual(
    run("http://localhost:3107", "http://internal:3000/", { "x-forwarded-proto": "https" }),
    [null, undefined],
  );
  assert.deepEqual(run("http://localhost:3107", "http://localhost:3107/"), [null, undefined]);
});

test("unit (proxy layer): development allows inline styles, production keeps nonce styles", () => {
  const style = (mode: string) => {
    vi.stubEnv("NODE_ENV", mode);
    return directive(
      proxy(new NextRequest("http://localhost:3107/")).headers.get("content-security-policy"),
      "style-src",
    );
  };
  assert.equal(style("development"), "style-src 'self' 'unsafe-inline'");
  assert.match(style("production") ?? "", /^style-src 'self' 'nonce-[^']+'$/);
});

test("unit (proxy layer): the invitation landing gets no-referrer from the proxy itself", () => {
  const referrer = (path: string) =>
    proxy(new NextRequest(`http://localhost:3107${path}`)).headers.get("referrer-policy");
  assert.equal(referrer(`/access/invitation?token=${"a".repeat(64)}`), "no-referrer");
  assert.equal(referrer("/access/invitation"), "no-referrer");
  assert.equal(referrer("/access"), "strict-origin-when-cross-origin");
  assert.equal(referrer("/sign-in"), "strict-origin-when-cross-origin");
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
