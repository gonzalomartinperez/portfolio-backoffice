// Page bodies are never executed here: a page's guard is checked statically (declared guard
// called as the first await of the default export) and the guard functions are run directly.
// A branch-dependent guard (for example one behind a query parameter) is therefore covered only
// by that first-await rule and the browser journeys, not by these unit tests.
import assert from "node:assert/strict";
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
import { enumerateSurface, read } from "../security/source-tree.ts";

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

const requestId = "00000000-0000-4000-8000-000000000000";

test("the matrix lists exactly the pages, route handlers and Server Actions in src/", () => {
  const actual = [...enumerateSurface().keys()].sort();
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
  const files = enumerateSurface();
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
    const id = name?.split("#")[1] ?? name;
    const marker =
      kind === "page" ? /export default/ : new RegExp(`\\b(?:function|const)\\s+${id}\\b`);
    const found = marker.exec(source);
    assert.ok(found, `${row.surface}: handler not found`);
    const body = source.slice(found.index + found[0].length).split("\nexport ")[0] ?? "";
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
    "action src/server/auth/actions.ts#inviteUser": () =>
      actions.inviteUser({ link: null, error: null }, form),
    "action src/server/auth/actions.ts#revokeAccess": () => actions.revokeAccess(form),
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
  await actionCalls["action src/server/auth/actions.ts#inviteUser"]?.();
  await actionCalls["action src/server/auth/actions.ts#revokeAccess"]?.();
  assert.deepEqual(authState.invites, [["user-1", "new.viewer@example.test", requestId]]);
  assert.deepEqual(authState.revokes, [["user-1", "member-1", "member", requestId]]);
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

test("the component kit page is closed outside development and fixtures", async () => {
  const { kitEnabled } = await import("../../src/server/kit.ts");
  assert.equal(kitEnabled({ NODE_ENV: "production" }), false);
  assert.match(read("src/app/%5F_kit/page.tsx"), /if \(!kitEnabled\(\)\) notFound\(\);/);
});

test("Server Actions keep Next's same-origin check: no allowedOrigins escape hatch", () => {
  // Next compares Origin with Host for every Server Action unless this option widens it.
  assert.equal("serverActions" in (nextConfig.experimental ?? {}), false);
  assert.equal(nextConfig.allowedDevOrigins, undefined);
});
