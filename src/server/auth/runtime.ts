import { type BetterAuthOptions, betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { Pool } from "pg";
import { createAuditTrail } from "../../features/auth/adapters/audit.ts";
import { createAccessStore } from "../../features/auth/adapters/store.ts";
import { type AuthConfiguration, invitationToken } from "./config.ts";

export function createAuthRuntime(
  configuration: AuthConfiguration,
  pool = new Pool({
    connectionString: configuration.databaseUrl,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
  }),
) {
  pool.on("error", () => console.error("Backoffice database connection interrupted."));
  const audit = createAuditTrail(pool, configuration.secret);
  const store = createAccessStore(pool, configuration.ownerEmail, audit);
  const options = {
    appName: "Portfolio Assistant Backoffice",
    baseURL: configuration.origin,
    secret: configuration.secret,
    trustedOrigins: [configuration.origin],
    database: pool,
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: configuration.google,
      github: configuration.github,
    },
    account: {
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, disableImplicitLinking: true },
    },
    session: {
      expiresIn: 28800,
      updateAge: 3600,
      cookieCache: { enabled: false },
    },
    advanced: {
      // Keep protection enabled when the SDK detects a test environment.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      useSecureCookies: configuration.origin.startsWith("https:"),
      cookiePrefix: "backoffice",
      crossSubDomainCookies: { enabled: false },
    },
    telemetry: { enabled: false },
    logger: { disabled: true },
    rateLimit: {
      enabled: true,
      storage: "database" as const,
      window: 60,
      max: 30,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            if (
              !(await store.mayRegister(
                user.email,
                user.emailVerified,
                invitationToken(context?.headers),
                audit.requestId(context?.headers),
              ))
            )
              throw new APIError("FORBIDDEN", {
                message: "This account does not have an invitation.",
              });
          },
        },
      },
      session: {
        create: {
          before: async (session, context) => {
            if (
              !(await store.admit(
                session.userId,
                invitationToken(context?.headers),
                audit.requestId(context?.headers),
              ))
            )
              throw new APIError("FORBIDDEN", {
                message: "This account does not have access.",
              });
          },
          // Runs only after `before` admitted the user and the row was written.
          after: async (session, context) => {
            await audit.tryRecord({
              action: "sign-in",
              subjectId: session.id,
              actorId: session.userId,
              identity: { email: await audit.emailOf(session.userId) },
              requestId: audit.requestId(context?.headers),
            });
          },
        },
        delete: {
          // Scoped to the sign-out endpoint: revocation, expiry and refresh also delete sessions.
          after: async (session, context) => {
            if (context?.path !== "/sign-out") return;
            await audit.tryRecord({
              action: "sign-out",
              subjectId: session.id,
              actorId: session.userId,
              identity: { email: await audit.emailOf(session.userId) },
              requestId: audit.requestId(context.headers),
            });
          },
        },
      },
      account: {
        create: {
          // A user's first account is sign-up; any further account is an explicit link.
          after: async (account, context) => {
            if (!(await audit.hasFurtherAccount(account.userId))) return;
            await audit.tryRecord({
              action: "link",
              subjectId: account.providerId,
              actorId: account.userId,
              identity: { email: await audit.emailOf(account.userId) },
              requestId: audit.requestId(context?.headers),
            });
          },
        },
      },
    },
  } satisfies BetterAuthOptions;
  return { auth: betterAuth(options), pool, store, audit, options };
}
