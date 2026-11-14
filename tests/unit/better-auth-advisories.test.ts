import assert from "node:assert/strict";
import { Pool } from "pg";
import { test } from "vitest";
import { authEnv } from "../security/auth-harness.ts";
import { read } from "../security/source-tree.ts";

// Advisory ids and fixed versions are quoted from docs/master-plan/research/04-testing.md (S45);
// node_modules/better-auth ships no changelog, so nothing else can be verified locally. The
// OAuth callback/state behavior itself is exercised against real PostgreSQL in
// tests/integration/auth.test.ts (state rejection, CSRF); these tests pin what is visible here.
const FLOOR = [1, 6, 11] as const;
const semver = (version: string) =>
  (version.match(/^(\d+)\.(\d+)\.(\d+)/) ?? []).slice(1).map(Number);
const atLeast = (version: string, floor: readonly number[]) => {
  const parts = semver(version);
  const diff = floor.map((part, index) => (parts[index] ?? 0) - part).find((delta) => delta !== 0);
  return parts.length === 3 && (diff ?? 0) >= 0;
};

async function runtime(origin: string) {
  const { createAuthRuntime } = await import("../../src/server/auth/runtime.ts");
  const { readAuthConfiguration } = await import("../../src/server/auth/config.ts");
  const pool = new Pool({ connectionString: authEnv.BACKOFFICE_DATABASE_URL });
  const built = createAuthRuntime(
    readAuthConfiguration({ ...authEnv, BACKOFFICE_ORIGIN: origin }),
    pool,
  );
  return { ...built, close: () => pool.end() };
}

test("installed Better Auth is exact-pinned and at least the patched floor 1.6.11", () => {
  const declared = JSON.parse(read("package.json")).dependencies["better-auth"] as string;
  const installed = JSON.parse(read("node_modules/better-auth/package.json")).version as string;
  assert.match(declared, /^\d+\.\d+\.\d+$/, "pin an exact version, not a range");
  assert.equal(installed, declared);
  assert.ok(atLeast(installed, FLOOR), `better-auth ${installed} is below ${FLOOR.join(".")}`);
  assert.equal(atLeast("1.6.10", FLOOR), false);
  assert.equal(atLeast("1.7.0", FLOOR), true);
  const lock = JSON.parse(read("package-lock.json")).packages["node_modules/better-auth"];
  assert.equal(lock.version, declared);
});

test("GHSA-wxw3-q3m9-c3jr (callback state mismatch, fixed 1.6.2): state lives in the database", async () => {
  const { auth, options, close } = await runtime("https://backoffice.example.test");
  const context = await auth.$context;
  // The advisory needs cookie-backed state without PKCE. A database session store defaults to
  // database state; an override or secondary storage would change that.
  assert.equal("storeStateStrategy" in options.account, false);
  assert.equal("secondaryStorage" in options, false);
  assert.equal(context.oauthConfig.storeStateStrategy, "database");
  await close();
});

test("GHSA-9h47-pqcx-hjr4 (oidcProvider/MCP defaults, fixed 1.6.11): no such plugin is enabled", async () => {
  const { auth, options, close } = await runtime("https://backoffice.example.test");
  assert.equal("plugins" in options, false);
  const effective = new Map(Object.entries((await auth.$context).options));
  assert.deepEqual(effective.get("plugins") ?? [], []);
  assert.doesNotMatch(read("src/server/auth/runtime.ts"), /better-auth\/plugins|oidcProvider|mcp/);
  await close();
});

test("mitigating configuration stays in place for HTTPS and loopback origins", async () => {
  for (const origin of ["https://backoffice.example.test", "http://localhost:3001"]) {
    const { options, close } = await runtime(origin);
    assert.deepEqual(options.trustedOrigins, [new URL(origin).origin]);
    assert.deepEqual(options.account, {
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, disableImplicitLinking: true },
    });
    assert.deepEqual(options.session, {
      expiresIn: 28800,
      updateAge: 3600,
      cookieCache: { enabled: false },
    });
    assert.deepEqual(options.rateLimit, {
      enabled: true,
      storage: "database",
      window: 60,
      max: 30,
    });
    assert.equal(options.emailAndPassword.enabled, false);
    assert.equal(options.telemetry.enabled, false);
    assert.equal(options.logger.disabled, true);
    assert.deepEqual(options.advanced, {
      disableOriginCheck: false,
      disableCSRFCheck: false,
      useSecureCookies: origin.startsWith("https:"),
      cookiePrefix: "backoffice",
      crossSubDomainCookies: { enabled: false },
    });
    assert.deepEqual(Object.keys(options.socialProviders).sort(), ["github", "google"]);
    await close();
  }
});
