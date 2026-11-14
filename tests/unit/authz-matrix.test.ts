import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { beforeEach, test, vi } from "vitest";
import nextConfig from "../../next.config.ts";
import { operationalPayload } from "../fixtures/operations.ts";
import {
  authEnv,
  authState,
  type Principal,
  principals,
  resetAuthState,
} from "../security/auth-harness.ts";
import { authzMatrix, type Guard, type Outcome } from "../security/authz-matrix.ts";
import { exportedFunctions, hasDirective, read, sourceFiles } from "../security/source-tree.ts";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("../../src/server/auth/runtime.ts", async () => {
  const harness = await import("../security/auth-harness.ts");
  return { createAuthRuntime: () => harness.fakeAuthRuntime() };
});

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

// Enumerates the real surface: pages, route handlers (per HTTP method) and "use server" exports.
function enumerate() {
  // The Pages Router would add routes this enumeration cannot see.
  for (const dir of ["src/pages", "pages"]) assert.equal(existsSync(dir), false, `${dir} exists`);
  const surface = new Map<string, string>();
  for (const file of sourceFiles()) {
    const source = read(file);
    const segments = file.replace(/^src\/app\/?/, "").split("/");
    const name = segments.pop() ?? "";
    const path = `/${segments.filter((part) => !/^\(.*\)$/.test(part)).join("/")}`;
    if (file.startsWith("src/app/") && /^page\.(tsx?|jsx?)$/.test(name))
      surface.set(`page ${path}`, file);
    if (file.startsWith("src/app/") && /^route\.(tsx?|jsx?)$/.test(name)) {
      assert.doesNotMatch(source, /export\s*\{|export\s+\*/, `${file}: re-exports hide methods`);
      const found = [...source.matchAll(/^export\s+(?:async\s+)?(?:function|const)\s+(\w+)/gm)]
        .map((match) => match[1] ?? "")
        .filter((exported) => METHODS.includes(exported));
      assert.ok(found.length > 0, `${file}: no HTTP method handler`);
      for (const method of found) surface.set(`route ${method} ${path}`, file);
    }
    if (hasDirective(source, "use server")) {
      assert.doesNotMatch(source, /export\s*\{|export\s+\*|export\s+default/, `${file}: opaque`);
      for (const action of exportedFunctions(source)) surface.set(`action ${action}`, file);
    } else if (/["']use server["']/.test(source)) {
      assert.fail(`${file}: inline "use server" is not enumerable; use a top-level directive`);
    }
  }
  return surface;
}

test("the matrix lists exactly the pages, route handlers and Server Actions in src/", () => {
  const actual = [...enumerate().keys()].sort();
  const listed = authzMatrix.map((row) => row.surface).sort();
  assert.deepEqual(
    actual.filter((key) => !listed.includes(key)),
    [],
    "enumerated surface missing from tests/security/authz-matrix.ts",
  );
  assert.deepEqual(
    listed.filter((key) => !actual.includes(key)),
    [],
    "matrix rows for surface that no longer exists",
  );
  assert.equal(new Set(listed).size, listed.length, "duplicate matrix rows");
});

test("each surface calls its declared guard first (and public surfaces call none)", () => {
  const files = enumerate();
  const guards: Guard[] = ["getAccess", "requireAccess", "requireOwner"];
  for (const row of authzMatrix) {
    const source = read(files.get(row.surface) ?? "");
    for (const guard of guards)
      assert.equal(
        new RegExp(`\\b${guard}\\(`).test(source),
        // requireOwner/requireAccess are built on getAccess inside session.ts only.
        guard === row.guard,
        `${row.surface}: expected ${row.guard}, ${guard} presence differs`,
      );
    if (row.guard === "none") continue;
    // Pragmatic order check: the first await of the handler body must be the guard. Awaiting the
    // request params or the locale cookie first is allowed; neither reads protected data.
    const [kind, name] = row.surface.split(" ");
    const marker = kind === "page" ? "export default" : `function ${name}(`;
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, `${row.surface}: handler not found`);
    const body = source.slice(start + marker.length).split("\nexport ")[0] ?? "";
    const firstAwait = [...body.matchAll(/\bawait\s+(\w+)/g)]
      .map((match) => match[1])
      .find((name) => name !== "searchParams" && name !== "getAuthLocale");
    assert.equal(firstAwait, row.guard, `${row.surface}: guard must be the first await`);
  }
});

const redirectOutcome = (error: unknown): Outcome => {
  const digest = String((error as { digest?: unknown }).digest ?? "");
  const [, , location] = digest.split(";");
  if (location === "/") return "redirect-home";
  if (location?.startsWith("/sign-in")) return "redirect-sign-in";
  throw error;
};
const run = async (call: () => Promise<unknown>): Promise<Outcome> => {
  try {
    await call();
    return "allowed";
  } catch (error) {
    return redirectOutcome(error);
  }
};
const expected = (principal: Principal, row: (typeof authzMatrix)[number]): Outcome =>
  principal === "viewer" ? row.viewer : principal === "owner" ? row.owner : row.anonymous;

beforeEach(() => {
  for (const [name, value] of Object.entries(authEnv)) vi.stubEnv(name, value);
});

test("page guards and Server Actions follow the matrix for every principal, including unverified email", async () => {
  const session = await import("../../src/server/auth/session.ts");
  const actions = await import("../../src/server/auth/actions.ts");
  const guardCalls: Record<string, () => Promise<unknown>> = {
    requireAccess: session.requireAccess,
    requireOwner: session.requireOwner,
  };
  const form = new FormData();
  form.set("email", "New.Viewer@example.test");
  form.set("id", "member-1");
  form.set("kind", "member");
  form.set("role", "owner"); // mass assignment attempt
  form.set("actorId", "someone-else");
  const actionCalls: Record<string, () => Promise<unknown>> = {
    "action inviteUser": () => actions.inviteUser({ link: null, error: null }, form),
    "action revokeAccess": () => actions.revokeAccess(form),
  };
  // Pages are covered through the guard they must call first (checked above); routes by their
  // own test below. A new guarded surface fails here until its behavior is covered.
  const covered = new Set([
    "page /",
    "page /analytics",
    "page /access",
    "route GET /api/operations",
  ]);
  for (const row of authzMatrix) {
    if (row.surface.startsWith("action "))
      assert.ok(actionCalls[row.surface], `${row.surface}: no behavioral probe in actionCalls`);
    else if (row.guard !== "none")
      assert.ok(
        covered.has(row.surface),
        `${row.surface}: guarded surface lacks behavior coverage`,
      );
  }
  for (const row of authzMatrix) {
    const call = actionCalls[row.surface] ?? guardCalls[row.guard];
    if (!call) continue;
    for (const principal of principals) {
      resetAuthState(principal);
      assert.equal(await run(call), expected(principal, row), `${row.surface} as ${principal}`);
      // Live membership check on every request, bypassing any session cookie cache.
      assert.deepEqual(authState.sessionArgs[0], {
        headers: new Headers(),
        query: { disableCookieCache: true },
      });
      const mutated = authState.invites.length + authState.revokes.length;
      assert.equal(mutated > 0, row.surface.startsWith("action ") && principal === "owner");
    }
  }
  // Role and actor fields in the form never reach the store: the actor is the live session user.
  resetAuthState("owner");
  await actionCalls["action inviteUser"]?.();
  await actionCalls["action revokeAccess"]?.();
  assert.deepEqual(authState.invites, [["user-1", "new.viewer@example.test"]]);
  assert.deepEqual(authState.revokes, [["user-1", "member-1", "member"]]);
});

test("GET /api/operations answers 401 without membership and never caches", async () => {
  vi.stubEnv("OPERATIONS_API_ORIGIN", "http://api-private:8000");
  vi.stubEnv("OPERATIONS_READ_TOKEN", "fixture-read-token");
  vi.stubGlobal("fetch", async () => Response.json(operationalPayload));
  const { GET } = await import("../../src/app/api/operations/route.ts");
  const row = authzMatrix.find((entry) => entry.surface === "route GET /api/operations");
  assert.ok(row);
  const status: Record<Principal, number> = {
    anonymous: 401,
    unverified: 401,
    revoked: 401,
    viewer: 200,
    owner: 200,
    unavailable: 503,
  };
  for (const principal of Object.keys(status) as Principal[]) {
    resetAuthState(principal);
    const response = await GET();
    assert.equal(response.status, status[principal], principal);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const outcome: Outcome = response.status === 401 ? "unauthorized" : "allowed";
    if (principal !== "unavailable") assert.equal(outcome, expected(principal, row), principal);
  }
});

test("Server Actions keep Next's same-origin check: no allowedOrigins escape hatch", () => {
  // Next compares Origin with Host for every Server Action unless this option widens it.
  assert.equal("serverActions" in (nextConfig.experimental ?? {}), false);
  assert.equal(nextConfig.allowedDevOrigins, undefined);
});
