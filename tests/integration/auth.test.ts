import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import pg from "pg";
import { afterAll, test } from "vitest";
import { actorHash } from "../../src/features/auth/adapters/audit.ts";
import {
  inviteViewer,
  revokeViewerAccess,
} from "../../src/features/auth/application/manage-access.ts";
import { startIamFixture } from "./postgres-fixture.ts";

// The suite owns a throwaway, digest-pinned PostgreSQL container (Testcontainers). It never
// reads a database URL from the environment, so it cannot reach a shared or production database.
const fixture = await startIamFixture();
afterAll(() => fixture.stop());
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const databaseUrl = fixture.runtimeUrl;
const migrationDatabaseUrl = fixture.migratorUrl;
const [{ betterAuth }, { genericOAuth }, { createAuthRuntime }] = await Promise.all([
  import("better-auth"),
  import("better-auth/plugins"),
  import("../../src/server/auth/runtime.ts"),
]);
const configuration = {
  origin: "http://localhost:3971",
  databaseUrl,
  secret: "fixture-only-secret-at-least-32-characters",
  ownerEmail: "owner@example.com",
  google: { clientId: "fixture", clientSecret: "fixture" },
  github: { clientId: "fixture", clientSecret: "fixture" },
};

function runMigrationCli(): void {
  try {
    execFileSync(process.execPath, ["scripts/auth-migrate.ts", "--project-grants"], {
      stdio: "pipe",
      timeout: 60000,
      env: {
        NODE_ENV: "test",
        NEXT_TELEMETRY_DISABLED: "1",
        BACKOFFICE_DATABASE_URL: migrationDatabaseUrl,
        BACKOFFICE_ORIGIN: configuration.origin,
        BETTER_AUTH_SECRET: configuration.secret,
        BACKOFFICE_OWNER_EMAIL: configuration.ownerEmail,
        GOOGLE_CLIENT_ID: configuration.google.clientId,
        GOOGLE_CLIENT_SECRET: configuration.google.clientSecret,
        GITHUB_CLIENT_ID: configuration.github.clientId,
        GITHUB_CLIENT_SECRET: configuration.github.clientSecret,
      },
    });
  } catch {
    throw new Error("Isolated IAM migration command failed");
  }
}

const resetStatement =
  'TRUNCATE backoffice_access_audit,backoffice_invitation,backoffice_member,session,account,"user",verification,"rateLimit" CASCADE';

async function prepareDatabase(): Promise<void> {
  const migration = createAuthRuntime({
    ...configuration,
    databaseUrl: migrationDatabaseUrl,
  });
  try {
    runMigrationCli();
    await migration.pool.query(resetStatement);
  } finally {
    await migration.pool.end();
  }
}

test("real PostgreSQL and Better Auth enforce invitation, role and revocation boundaries", async () => {
  const { pool, store, options } = createAuthRuntime(configuration);
  try {
    await prepareDatabase();
    const auth = betterAuth({
      ...options,
      plugins: [
        genericOAuth({
          config: [
            {
              providerId: "fixture",
              clientId: "fixture",
              clientSecret: "fixture",
              authorizationUrl: "http://localhost:3972/authorize",
              tokenUrl: "http://localhost:3972/token",
              getUserInfo: async () => ({
                id: "owner",
                name: "Owner",
                email: "owner@example.com",
                emailVerified: true,
              }),
            },
          ],
        }),
      ],
    });
    const context = await auth.$context;
    const provider = createServer((request, response) => {
      if (request.url === "/token") {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            access_token: "fixture-token",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        );
      } else {
        response.statusCode = 404;
        response.end();
      }
    });
    await new Promise<void>((resolve) => provider.listen(3972, "127.0.0.1", resolve));
    let ownerCookie = "";
    try {
      const start = await auth.handler(
        new Request("http://localhost:3971/api/auth/sign-in/social", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: configuration.origin,
          },
          body: JSON.stringify({ provider: "fixture", callbackURL: "/" }),
        }),
      );
      assert.equal(start.status, 200);
      const payload: unknown = await start.json();
      assert.ok(
        payload &&
          typeof payload === "object" &&
          "url" in payload &&
          typeof payload.url === "string",
      );
      const state = new URL(payload.url).searchParams.get("state");
      assert.ok(state);
      const cookie = start.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      const callback = await auth.handler(
        new Request(
          `http://localhost:3971/api/auth/callback/fixture?code=test&state=${encodeURIComponent(state)}`,
          { headers: { cookie } },
        ),
      );
      assert.equal(callback.status, 302);
      const sessionCookie = callback.headers
        .getSetCookie()
        .find((value) => value.startsWith("backoffice.session_token="));
      assert.ok(sessionCookie);
      ownerCookie = sessionCookie.split(";")[0] ?? "";
      assert.ok(/;\s*HttpOnly(?:;|$)/i.test(sessionCookie), "HttpOnly required");
      assert.ok(/;\s*SameSite=Lax(?:;|$)/i.test(sessionCookie), "SameSite=Lax required");
      assert.ok(/;\s*Path=\/(?:;|$)/i.test(sessionCookie), "Root Path required");
      assert.ok(!/;\s*Domain=/i.test(sessionCookie), "Host-scoped cookie required");
      const replay = await auth.handler(
        new Request(`http://localhost:3971/api/auth/callback/fixture?code=test&state=invalid`, {
          headers: { cookie },
        }),
      );
      assert.ok(replay.headers.get("location")?.includes("error"));
    } finally {
      await new Promise<void>((resolve, reject) =>
        provider.close((error) => (error ? reject(error) : resolve())),
      );
    }

    const ownerFromProvider = await context.internalAdapter.findUserByEmail(
      configuration.ownerEmail,
    );
    assert.ok(ownerFromProvider);
    const owner = ownerFromProvider.user;

    assert.ok(owner);
    const ownerSession = await context.internalAdapter.createSession(owner.id);
    assert.ok(ownerSession);
    assert.equal((await store.access(owner))?.role, "owner");
    await assert.rejects(() =>
      context.internalAdapter.createUser(
        {
          name: "Stranger",
          email: "stranger@example.com",
          emailVerified: true,
        },
        { method: "oauth", oauth: { providerId: "google" } },
      ),
    );
    await assert.rejects(() =>
      context.internalAdapter.createUser(
        {
          name: "False owner",
          email: "owner@example.com",
          emailVerified: false,
        },
        { method: "oauth", oauth: { providerId: "google" } },
      ),
    );
    const actor = await store.access(owner);
    assert.ok(actor);
    const invitation = await inviteViewer(actor, " Viewer@Example.com ", store);
    assert.equal(invitation.status, "created");
    if (invitation.status !== "created") throw new Error("Expected invitation");
    const token = invitation.token;
    assert.equal(await store.mayRegister("viewer@example.com", true, token), true);
    assert.equal(await store.mayRegister("other@example.com", true, token), false);
    assert.equal(await store.mayRegister("viewer@example.com", false, token), false);
    // User insertion here represents provider-verified identity; session admission is tested independently below.
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,now(),now())',
      ["viewer", "Viewer", "viewer@example.com"],
    );
    assert.equal(await store.admit("viewer", token), true);
    assert.equal(
      (
        await store.access({
          id: "viewer",
          name: "Viewer",
          email: "viewer@example.com",
        })
      )?.role,
      "viewer",
    );
    assert.equal(await store.mayRegister("viewer@example.com", true, token), false);
    await assert.rejects(() => store.invite("viewer", "another@example.com"));
    assert.deepEqual(
      await inviteViewer(
        {
          user: { id: "viewer", name: "Viewer", email: "viewer@example.com" },
          role: "owner",
        },
        "another@example.com",
        store,
      ),
      { status: "rejected", reason: "unavailable" },
    );
    await context.internalAdapter.createSession("viewer");
    assert.deepEqual(await revokeViewerAccess(actor, "viewer", "member", store), {
      status: "revoked",
    });
    assert.equal(
      await store.access({
        id: "viewer",
        name: "Viewer",
        email: "viewer@example.com",
      }),
      null,
    );
    assert.equal(await store.admit("viewer", token), false);
    assert.equal(
      (await pool.query('SELECT id FROM session WHERE "userId"=$1', ["viewer"])).rowCount,
      0,
    );
    const replacement = await store.invite(owner.id, "viewer@example.com");
    assert.equal(await store.admit("viewer", replacement), true);
    await assert.rejects(() => store.revoke(owner.id, owner.id, "member"));
    const expired = await store.invite(owner.id, "expired@example.com");
    await pool.query(
      "UPDATE backoffice_invitation SET expires_at=now()-interval '1 minute' WHERE email='expired@example.com'",
    );
    assert.equal(await store.mayRegister("expired@example.com", true, expired), false);
    assert.ok((await pool.query("SELECT id FROM backoffice_access_audit")).rowCount);

    // Explicit link: the owner already holds the fixture account, so a second one is a link.
    await context.internalAdapter.linkAccount({
      userId: owner.id,
      providerId: "github",
      accountId: "github-owner-1",
    });
    const signOut = await auth.handler(
      new Request("http://localhost:3971/api/auth/sign-out", {
        method: "POST",
        headers: {
          origin: configuration.origin,
          cookie: ownerCookie,
          "content-type": "application/json",
          "x-request-id": "req-audit-signout-1",
        },
        body: "{}",
      }),
    );
    assert.equal(signOut.status, 200);
    // Owner actions: an unknown invitation id stays silent and is not audited.
    const lapsed = await pool.query<{ id: string }>(
      "SELECT id FROM backoffice_invitation WHERE email='expired@example.com'",
    );
    await store.revoke(owner.id, "not-an-invitation", "invitation");
    await store.revoke(owner.id, lapsed.rows[0]?.id ?? "missing", "invitation");
    const audit = await pool.query<{
      action: string;
      actor_id: string | null;
      subject_id: string;
      request_id: string | null;
      actor_hash: string | null;
    }>(
      "SELECT action,actor_id,subject_id,request_id,actor_hash FROM backoffice_access_audit ORDER BY id",
    );
    const byAction = (action: string) => audit.rows.filter((row) => row.action === action);
    for (const action of [
      "invite",
      "revoke-invitation",
      "revoke-member",
      "sign-in",
      "admission",
      "denial",
      "link",
      "sign-out",
    ]) {
      assert.ok(byAction(action).length > 0, `${action} must be audited`);
    }
    for (const row of audit.rows) {
      assert.match(row.request_id ?? "", uuid, row.action);
      assert.match(row.actor_hash ?? "", /^[a-f0-9]{64}$/, row.action);
    }
    const revokedInvitations = byAction("revoke-invitation");
    assert.equal(revokedInvitations.length, 1);
    assert.equal(revokedInvitations[0]?.subject_id, lapsed.rows[0]?.id);
    assert.equal(
      revokedInvitations[0]?.actor_hash,
      actorHash(configuration.secret, { email: configuration.ownerEmail }),
    );
    // A denial for an address that never became a user carries only the keyed hash.
    const unknown = byAction("denial").find((row) => row.actor_id === null);
    assert.ok(unknown);
    assert.equal(
      unknown.actor_hash,
      actorHash(configuration.secret, { email: "stranger@example.com" }),
    );
    const signedOut = byAction("sign-out");
    assert.equal(signedOut.length, 1);
    // A client-supplied x-request-id is never trusted; the server issues its own UUID.
    assert.match(signedOut[0]?.request_id ?? "", uuid);
    assert.notEqual(signedOut[0]?.request_id, "req-audit-signout-1");
    assert.equal(signedOut[0]?.actor_id, owner.id);
    assert.equal(
      signedOut[0]?.actor_hash,
      actorHash(configuration.secret, { email: configuration.ownerEmail }),
    );
    assert.equal(byAction("link")[0]?.subject_id, "github");
    // Revocation deletes sessions through SQL, so only the sign-out endpoint writes this action.
    assert.ok(!JSON.stringify(audit.rows).includes("@"), "no email in audit rows");
    const unauthenticated = await auth.handler(
      new Request("http://localhost:3971/api/auth/get-session"),
    );
    assert.equal(await unauthenticated.json(), null);
    const csrf = await auth.handler(
      new Request("http://localhost:3971/api/auth/sign-out", {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          cookie: "backoffice.session_token=fixture-invalid",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    assert.equal(csrf.status, 403);
  } finally {
    await pool.end();
  }
});

test("invitation landing cookie admits a verified OAuth viewer once and cannot restore revoked access", async () => {
  const { pool, store, options } = createAuthRuntime(configuration);
  const provider = createServer((request, response) => {
    if (request.url === "/token") {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          access_token: "invited-fixture-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      );
    } else {
      response.statusCode = 404;
      response.end();
    }
  });
  let listening = false;
  try {
    await prepareDatabase();
    const auth = betterAuth({
      ...options,
      plugins: [
        genericOAuth({
          config: [
            {
              providerId: "fixture",
              clientId: "fixture",
              clientSecret: "fixture",
              authorizationUrl: "http://localhost:3972/authorize",
              tokenUrl: "http://localhost:3972/token",
              getUserInfo: async () => ({
                id: "invited-viewer",
                name: "Invited Viewer",
                email: "invited@example.com",
                emailVerified: true,
              }),
            },
          ],
        }),
      ],
    });
    const context = await auth.$context;
    const owner = await context.internalAdapter.createUser(
      { name: "Owner", email: configuration.ownerEmail, emailVerified: true },
      { method: "oauth", oauth: { providerId: "google" } },
    );
    await context.internalAdapter.createSession(owner.id);
    const token = await store.invite(owner.id, "invited@example.com");
    const { registerHooks } = await import("node:module");
    // Next's extensionless public subpath is resolved by its bundler, not Node's ESM loader.
    const hooks = registerHooks({
      resolve(specifier, context, nextResolve) {
        return nextResolve(specifier === "next/server" ? "next/server.js" : specifier, context);
      },
    });
    let landing: Response;
    try {
      const { GET } = await import("../../src/app/access/invitation/route.ts");
      const env = {
        BACKOFFICE_ORIGIN: configuration.origin,
        BACKOFFICE_DATABASE_URL: configuration.databaseUrl,
        BETTER_AUTH_SECRET: configuration.secret,
        BACKOFFICE_OWNER_EMAIL: configuration.ownerEmail,
        GOOGLE_CLIENT_ID: "fixture",
        GOOGLE_CLIENT_SECRET: "fixture",
        GITHUB_CLIENT_ID: "fixture",
        GITHUB_CLIENT_SECRET: "fixture",
      };
      const previous = new Map(Object.keys(env).map((key) => [key, process.env[key]]));
      try {
        Object.assign(process.env, env);
        landing = GET(
          new Request(`${configuration.origin}/access/invitation?token=${token}&locale=es`),
        );
      } finally {
        for (const [key, value] of previous) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    } finally {
      hooks.deregister();
    }
    assert.equal(landing.status, 307);
    assert.equal(landing.headers.get("location"), `${configuration.origin}/sign-in?locale=es`);
    assert.equal(landing.headers.get("referrer-policy"), "no-referrer");
    assert.equal(landing.headers.get("cache-control"), "no-store");
    const invitationSetCookie = landing.headers
      .getSetCookie()
      .find((value) => value.startsWith("backoffice-invitation="));
    assert.ok(invitationSetCookie);
    assert.ok(invitationSetCookie.includes("HttpOnly"));
    assert.ok(/SameSite=lax/i.test(invitationSetCookie));
    const invitationCookie = invitationSetCookie.split(";")[0] ?? "";
    assert.ok(invitationCookie);
    await new Promise<void>((resolve) => provider.listen(3972, "127.0.0.1", resolve));
    listening = true;
    async function oauthCallback() {
      const start = await auth.handler(
        new Request(`${configuration.origin}/api/auth/sign-in/social`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: configuration.origin,
            cookie: invitationCookie,
          },
          body: JSON.stringify({
            provider: "fixture",
            callbackURL: "/?locale=es",
            errorCallbackURL: "/sign-in?locale=es&error=access",
          }),
        }),
      );
      assert.equal(start.status, 200);
      const payload: unknown = await start.json();
      assert.ok(
        payload &&
          typeof payload === "object" &&
          "url" in payload &&
          typeof payload.url === "string",
      );
      const state = new URL(payload.url).searchParams.get("state");
      assert.ok(state);
      const cookies = [
        invitationCookie,
        ...start.headers.getSetCookie().map((value) => value.split(";")[0]),
      ].join("; ");
      return auth.handler(
        new Request(
          `${configuration.origin}/api/auth/callback/fixture?code=invited&state=${encodeURIComponent(state)}`,
          { headers: { cookie: cookies } },
        ),
      );
    }
    const callback = await oauthCallback();
    assert.equal(callback.status, 302);
    assert.equal(
      new URL(callback.headers.get("location") ?? "", configuration.origin).href,
      `${configuration.origin}/?locale=es`,
    );
    const sessionCookie = callback.headers
      .getSetCookie()
      .find((value) => value.startsWith("backoffice.session_token="))
      ?.split(";")[0];
    assert.ok(sessionCookie);
    const sessionResponse = await auth.handler(
      new Request(`${configuration.origin}/api/auth/get-session`, {
        headers: { cookie: sessionCookie },
      }),
    );
    const session: unknown = await sessionResponse.json();
    assert.ok(
      session &&
        typeof session === "object" &&
        "user" in session &&
        session.user &&
        typeof session.user === "object" &&
        "email" in session.user,
    );
    assert.equal(session.user.email, "invited@example.com");
    const viewer = await context.internalAdapter.findUserByEmail("invited@example.com");
    assert.ok(viewer);
    assert.equal((await store.access(viewer.user))?.role, "viewer");
    assert.equal(await store.mayRegister("invited@example.com", true, token), false);
    const consumed = await pool.query<{ consumed_at: Date | null }>(
      "SELECT consumed_at FROM backoffice_invitation WHERE email=$1",
      ["invited@example.com"],
    );
    assert.ok(consumed.rows[0]?.consumed_at);
    await store.revoke(owner.id, viewer.user.id, "member");
    const revokedSession = await auth.handler(
      new Request(`${configuration.origin}/api/auth/get-session`, {
        headers: { cookie: sessionCookie },
      }),
    );
    assert.equal(await revokedSession.json(), null);
    const retry = await oauthCallback();
    assert.equal(retry.status, 403);
    assert.equal(
      retry.headers
        .getSetCookie()
        .some(
          (value) => value.startsWith("backoffice.session_token=") && !value.includes("Max-Age=0"),
        ),
      false,
    );
    assert.equal(
      (await pool.query('SELECT id FROM session WHERE "userId"=$1', [viewer.user.id])).rowCount,
      0,
    );
    assert.equal(await store.access(viewer.user), null);
  } finally {
    if (listening)
      await new Promise<void>((resolve, reject) =>
        provider.close((error) => (error ? reject(error) : resolve())),
      );
    await pool.end();
  }
});

const code = (error: unknown, expected: string) =>
  typeof error === "object" && error !== null && "code" in error && error.code === expected;
test("project IAM runtime cannot inherit owners or run DDL and its actual pool is bounded", async () => {
  const { pool } = createAuthRuntime(configuration);
  try {
    const attributes = await pool.query<{
      rolsuper: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolinherit: boolean;
      rolreplication: boolean;
      rolbypassrls: boolean;
    }>(
      "SELECT rolsuper,rolcreatedb,rolcreaterole,rolinherit,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    );
    assert.deepEqual(attributes.rows, [
      {
        rolsuper: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolinherit: false,
        rolreplication: false,
        rolbypassrls: false,
      },
    ]);
    for (const query of [
      "CREATE TABLE public.forbidden(id integer)",
      "CREATE TEMP TABLE forbidden(id integer)",
      'ALTER TABLE "user" ADD COLUMN forbidden integer',
      'DROP TABLE "user"',
      "SET ROLE portfolio_iam_migrator",
      "SET ROLE portfolio_api_runtime",
    ]) {
      await assert.rejects(
        () => pool.query(query),
        (error) => code(error, "42501"),
      );
    }
    const clients = await Promise.all(Array.from({ length: 5 }, () => pool.connect()));
    try {
      await assert.rejects(() => pool.connect(), /timeout exceeded when trying to connect/);
    } finally {
      for (const client of clients) client.release();
    }
    assert.ok(pool.totalCount <= 5);
    assert.equal(pool.waitingCount, 0);
    assert.equal((await pool.query<{ value: number }>("SELECT 1 AS value")).rows[0]?.value, 1);
  } finally {
    await pool.end();
  }
});

test("the runtime role can append and read the audit trail but never rewrite it", async () => {
  await prepareDatabase();
  const runtime = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const migrator = new pg.Pool({ connectionString: migrationDatabaseUrl, max: 1 });
  const denied = (statement: string, code: string, pool: pg.Pool) =>
    assert.rejects(
      () => pool.query(statement),
      (error: unknown) =>
        typeof error === "object" && error !== null && "code" in error && error.code === code,
    );
  try {
    await runtime.query(
      "INSERT INTO backoffice_access_audit(action,subject_id,request_id,actor_hash) VALUES('denial','registration','req-grants-0001',$1)",
      ["a".repeat(64)],
    );
    assert.equal(
      (
        await runtime.query(
          "SELECT id FROM backoffice_access_audit WHERE subject_id='registration'",
        )
      ).rowCount,
      1,
    );
    await denied("UPDATE backoffice_access_audit SET subject_id='x'", "42501", runtime);
    await denied("DELETE FROM backoffice_access_audit", "42501", runtime);
    await denied("TRUNCATE backoffice_access_audit", "42501", runtime);
    // Rows must identify someone and keep hashes and request ids in their documented shape.
    await denied(
      "INSERT INTO backoffice_access_audit(action,subject_id) VALUES('denial','registration')",
      "23514",
      runtime,
    );
    await denied(
      "INSERT INTO backoffice_access_audit(action,subject_id,actor_hash) VALUES('denial','x','owner@example.com')",
      "23514",
      runtime,
    );
    // Even the table owner cannot rewrite rows; the trigger fires before any row changes.
    await denied("UPDATE backoffice_access_audit SET subject_id='x'", "42501", migrator);
    await denied("DELETE FROM backoffice_access_audit", "42501", migrator);
    assert.equal(
      (
        await migrator.query(
          "SELECT id FROM backoffice_access_audit WHERE subject_id='registration'",
        )
      ).rowCount,
      1,
    );
    await migrator.query("TRUNCATE backoffice_access_audit");
  } finally {
    await Promise.all([runtime.end(), migrator.end()]);
  }
});

test("re-running the migration keeps legacy audit rows and narrows the runtime grants", async () => {
  const migrator = new pg.Pool({ connectionString: migrationDatabaseUrl, max: 1 });
  const runtime = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  try {
    runMigrationCli();
    await migrator.query(resetStatement);
    // Rebuild the pre-002 audit table exactly as 001-access.sql defines it, with its old grant.
    const legacy = (await readFile("migrations/001-access.sql", "utf8")).match(
      /CREATE TABLE IF NOT EXISTS backoffice_access_audit \([^;]*\);/,
    )?.[0];
    assert.ok(legacy);
    await migrator.query("DROP TABLE backoffice_access_audit");
    await migrator.query(legacy);
    await migrator.query(
      "GRANT SELECT,INSERT,UPDATE,DELETE ON backoffice_access_audit TO portfolio_iam_runtime",
    );
    await migrator.query(
      "GRANT USAGE ON SEQUENCE backoffice_access_audit_id_seq TO portfolio_iam_runtime",
    );
    await migrator.query(
      `INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES('legacy-owner','Legacy','legacy@example.com',true,now(),now())`,
    );
    await migrator.query(
      "INSERT INTO backoffice_access_audit(actor_id,action,subject_id) VALUES('legacy-owner','invite','legacy-invitation')",
    );
    const before = await migrator.query("SELECT * FROM backoffice_access_audit");
    assert.equal(before.rowCount, 1);
    await runtime.query("UPDATE backoffice_access_audit SET subject_id=subject_id");

    runMigrationCli();
    runMigrationCli();

    const after = await migrator.query("SELECT * FROM backoffice_access_audit");
    assert.equal(after.rowCount, 1);
    assert.deepEqual(
      { ...after.rows[0], request_id: undefined, actor_hash: undefined },
      { ...before.rows[0], request_id: undefined, actor_hash: undefined },
    );
    assert.equal(after.rows[0].request_id, null);
    assert.equal(after.rows[0].actor_hash, null);
    await assert.rejects(
      () => runtime.query("UPDATE backoffice_access_audit SET subject_id='x'"),
      (error: unknown) => (error as { code?: string }).code === "42501",
    );
    await assert.rejects(
      () => runtime.query("DELETE FROM backoffice_access_audit"),
      (error: unknown) => (error as { code?: string }).code === "42501",
    );
    await runtime.query(
      "INSERT INTO backoffice_access_audit(action,subject_id,request_id,actor_hash) VALUES('sign-out','one-session','req-legacy-0001',$1)",
      ["b".repeat(64)],
    );
    // Racing sign-outs of one session collapse into a single row.
    await runtime.query(
      "INSERT INTO backoffice_access_audit(action,subject_id,request_id,actor_hash) VALUES('sign-out','one-session','req-legacy-0002',$1) ON CONFLICT DO NOTHING",
      ["b".repeat(64)],
    );
    assert.equal(
      (await runtime.query("SELECT id FROM backoffice_access_audit WHERE action='sign-out'"))
        .rowCount,
      1,
    );
    await migrator.query(resetStatement);
  } finally {
    await Promise.all([migrator.end(), runtime.end()]);
  }
});

test("a failed admission audit write rolls back membership and invitation and creates no session", async () => {
  await prepareDatabase();
  const migrator = new pg.Pool({ connectionString: migrationDatabaseUrl, max: 1 });
  const { pool, store, auth } = createAuthRuntime(configuration);
  const grant = "backoffice_access_audit TO portfolio_iam_runtime";
  try {
    await migrator.query(
      `INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES
       ('fc-owner','Owner','owner@example.com',true,now(),now()),
       ('fc-viewer','Viewer','failclosed@example.com',true,now(),now())`,
    );
    await migrator.query("INSERT INTO backoffice_member(user_id,role) VALUES('fc-owner','owner')");
    const token = await store.invite("fc-owner", "failclosed@example.com");
    await migrator.query(`REVOKE INSERT ON ${grant.replace(" TO ", " FROM ")}`);
    try {
      const context = await auth.$context;
      await assert.rejects(() => context.internalAdapter.createSession("fc-viewer"));
      await assert.rejects(() => store.admit("fc-viewer", token));
    } finally {
      await migrator.query(`GRANT INSERT ON ${grant}`);
    }
    assert.equal(
      (await pool.query("SELECT 1 FROM backoffice_member WHERE user_id='fc-viewer'")).rowCount,
      0,
    );
    assert.equal(
      (await pool.query("SELECT 1 FROM backoffice_invitation WHERE consumed_at IS NOT NULL"))
        .rowCount,
      0,
    );
    assert.equal(
      (await pool.query(`SELECT 1 FROM session WHERE "userId"='fc-viewer'`)).rowCount,
      0,
    );
    // The invitation was not consumed, so the same link still admits once auditing recovers.
    assert.equal(await store.admit("fc-viewer", token), true);
  } finally {
    await Promise.all([pool.end(), migrator.end()]);
  }
});
