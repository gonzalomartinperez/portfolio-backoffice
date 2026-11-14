// Shared seam for the security unit tests: a scripted Better Auth runtime that replaces
// `createAuthRuntime`, so the real `session.ts`, Server Actions and route handlers run with no
// database. Tests mount it with `vi.mock("../../src/server/auth/runtime.ts", ...)`.
import type { Access, AccessUser } from "../../src/features/auth/domain/access.ts";

export const ORIGIN = "https://backoffice.example.test";
export const principals = [
  "anonymous",
  "unverified",
  "revoked",
  "viewer",
  "owner",
  "unavailable",
] as const;
export type Principal = (typeof principals)[number];

export const authEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  BACKOFFICE_ORIGIN: ORIGIN,
  BACKOFFICE_DATABASE_URL: "postgres://fixture@127.0.0.1:1/fixture_test",
  BETTER_AUTH_SECRET: "public-fixture-only-at-least-32-characters",
  BACKOFFICE_OWNER_EMAIL: "owner@example.test",
  GOOGLE_CLIENT_ID: "fixture",
  GOOGLE_CLIENT_SECRET: "fixture",
  GITHUB_CLIENT_ID: "fixture",
  GITHUB_CLIENT_SECRET: "fixture",
};

export const authState = {
  principal: "anonymous" as Principal,
  sessionArgs: [] as unknown[],
  invites: [] as unknown[][],
  revokes: [] as unknown[][],
  poolError: undefined as Error | undefined,
};

export function resetAuthState(principal: Principal) {
  authState.principal = principal;
  authState.sessionArgs = [];
  authState.invites = [];
  authState.revokes = [];
  authState.poolError = undefined;
}

export function fakeAuthRuntime() {
  const user = {
    id: "user-1",
    name: "Fixture",
    email: "fixture@example.test",
    emailVerified: true,
  };
  return {
    auth: {
      api: {
        // Absent and tampered sessions resolve to null in Better Auth; an unverified email is a
        // live session whose user must still be refused by session.ts.
        async getSession(args: unknown) {
          authState.sessionArgs.push(args);
          if (authState.principal === "unavailable") throw new Error("database unavailable");
          if (authState.principal === "anonymous") return null;
          return { user: { ...user, emailVerified: authState.principal !== "unverified" } };
        },
      },
      async handler() {
        return new Response("{}", { status: 200 });
      },
      $context: Promise.resolve({ checkSchema: async () => {} }),
    },
    store: {
      // A revoked member has no live membership row. The unverified principal has an owner row,
      // so only the emailVerified guard in session.ts can refuse it.
      async access(who: AccessUser): Promise<Access | null> {
        const role = authState.principal === "unverified" ? "owner" : authState.principal;
        return role === "owner" || role === "viewer" ? { user: who, role } : null;
      },
      async invite(...args: unknown[]) {
        authState.invites.push(args);
        return "f".repeat(64);
      },
      async revoke(...args: unknown[]) {
        authState.revokes.push(args);
      },
    },
    options: { baseURL: ORIGIN },
    pool: {
      query: async () => {
        if (authState.poolError) throw authState.poolError;
        return { rowCount: 0 };
      },
    },
  };
}
