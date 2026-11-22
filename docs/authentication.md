# Backoffice authentication

The source repository is public; operational data requires an invited account.
Better Auth 1.7.10 handles OAuth and PostgreSQL sessions. Google and GitHub are the
only production providers. Password login and public registration are disabled.
The application validates verified email and database membership on every protected
request. A cookie alone never grants access. All credentials remain server-only.

## Configuration and providers

Set the server-only variables in `.env.example`. `BACKOFFICE_ORIGIN` is an exact
origin without paths, credentials or query strings. Public origins require HTTPS;
HTTP is accepted only for exact loopback hosts for local image verification.
Register callback URLs `<origin>/api/auth/callback/google` and
`<origin>/api/auth/callback/github` in owner-managed OAuth applications.
Use separate development and production OAuth applications. Never include their
secrets in client variables, Docker arguments or artifacts.

`BACKOFFICE_OWNER_EMAIL` is the explicitly configured, verified owner identity;
the first arbitrary user does not become owner. Changing that configuration is an
access-policy change requiring review. Owner membership cannot be revoked through
the UI. Existing owners must be reviewed separately before rotating ownership.

OAuth tokens are encrypted using `BETTER_AUTH_SECRET`. Keep that secret stable and
back it up securely; rotation can invalidate sessions and stored provider tokens.
Cookies are HttpOnly, host scoped and Secure on HTTPS. Sessions expire in 8 hours,
with cookie caching disabled. Revocation deletes sessions and every subsequent
request rechecks membership. Implicit provider linking is disabled; linking must
be initiated from an authenticated account through Better Auth's supported flow.
Owners can initiate explicit linking from `/access`; viewer linking UI is deferred. Better Auth telemetry is disabled.

## Database and migrations

Provision a separate PostgreSQL database and least-privileged application role.
Do not reuse the anonymous conversation database or expose its port publicly.
Run `npm run auth:migrate` before starting the new application revision.
The script uses the official `better-auth/db/migration` API for the pinned library
and applies `migrations/001-access.sql` then `migrations/002-audit.sql` transactionally
with an advisory lock.
Better Auth's schema migration is separate from the access-table transaction;
backup and inspect the migration plan before production upgrades. Application
rollback does not undo schema changes. Never execute migrations automatically on
server startup. Restart after external schema changes.

The production image must include `scripts/auth-migrate.ts`, the auth configuration,
runtime and store modules, and `migrations/`. Their runtime dependencies are
`better-auth` and `pg`; migrations do not import Next.js or `server-only`.
The application uses a five-connection pool with bounded connection establishment.
The deployment owner must allow graceful connection draining during termination.

## Invitations and revocation

Owners use `/access` to invite viewers. The copied link is a sensitive bearer
invitation: deliver it privately. Only its SHA-256 digest is stored. The recipient
must authenticate with the exact invited, provider-verified email; the link does
not replace OAuth. It is consumed atomically at session admission and expires in
48 hours. Revoked and expired invitations fail closed. No SMTP service is needed.
Viewer accounts cannot invite or revoke anyone.

## Audit trail

`backoffice_access_audit` is append-only. It records `invite`, `revoke-invitation`,
`revoke-member`, `sign-in`, `admission`, `denial`, `link` and `sign-out`, each with
actor ID (null when no user exists, for example a refused registration), subject ID,
`request_id`, `actor_hash` and timestamp. Rows written before migration 002 keep null
`request_id` and `actor_hash`.

`actor_hash` is hex HMAC-SHA256 over the lower-cased email (provider account ID when no
email is known). Its key is itself derived as `HMAC-SHA256(BETTER_AUTH_SECRET,
"backoffice-audit-actor-v1")`, so the Better Auth secret never keys the hash directly. It
correlates sign-ins and denials without storing the address; rotating the secret starts a
new correlation series. `request_id` is always a server-generated UUID shared by every audit
row of one request. An inbound `x-request-id` is client controlled and is ignored. Rows never
hold emails, tokens, IP addresses, user agents, prompts or transcripts.

- Admission and owner actions (`invite`, `revoke-*`) are written in the same transaction as
  the change they describe; if the audit insert fails the change rolls back (fail closed).
  Revocation audits only the identifier returned by the database; an unknown invitation id
  changes nothing and leaves no row.
- Denial, sign-in, link and sign-out are written best effort: a failed audit write is logged
  without detail and never changes the access decision. Registration and session denials use
  the same HTTP refusal for the reasons the code checks (unverified email, missing or
  invalid invitation, revoked member); the audit row is written only after the decision.
- Sign-in uses Better Auth's `session` create-after database hook, link its `account`
  create-after hook (a user's second or later account), and sign-out its `session`
  delete-after hook restricted to the `/sign-out` endpoint. A partial unique index keeps one
  `sign-out` row per session id even when requests race. Revocation deletes sessions with
  SQL and is audited as `revoke-member`.
- The runtime role holds only `SELECT, INSERT` on the table (plus sequence `USAGE`).
  A trigger additionally rejects `UPDATE` and `DELETE` for every role, including the owner;
  `TRUNCATE` stays an owner-only maintenance action.
- Rows are retained. The table grows with every denial, bounded by Better Auth's rate
  limit. User deletion is not supported while audit rows reference the user (Better Auth
  `deleteUser` is disabled). Pruning is an owner-run maintenance procedure through the
  migrator identity, outside the runtime role, never an application feature.

Known gaps, scheduled for M4 (callback boundary): an `account_not_linked` OAuth refusal
returns before the user and session hooks and is not audited; a scope re-link that updates
an existing account is not recorded as `link`; Better Auth's `/revoke-session` and
`/revoke-sessions` endpoints are not audited as sign-out.

The invitation landing response clears the token from the visible URL, uses
`no-store` and `no-referrer`, and stores it in an HttpOnly cookie for the OAuth
round trip. Effective proxy access logs must redact invitation and OAuth callback query parameters;
no frontend analytics or session replay is included.

## Verification

- `npx vitest run --project unit tests/unit/auth-config.test.ts`: configuration and token boundaries.
- `npm run test:auth` (Vitest `integration` project, Docker required):
  actual PostgreSQL schema, supported OAuth plugin authorization/callback/token
  exchange with a loopback provider, state rejection, owner admission, verified
  email, one-use invitation, roles, expiry, revocation, CSRF protection and the restricted
  IAM runtime role (no inheritance, no DDL, bounded pool). The test starts and owns a
  throwaway digest-pinned PostgreSQL container (Testcontainers) and never reads a database URL
  from the environment, so it cannot touch a production or shared database.
- The same suite proves the runtime role can `INSERT` and `SELECT` but not `UPDATE`,
  `DELETE` or `TRUNCATE` audit rows, that the trigger stops the table owner, and that
  all eight actions carry `request_id` and `actor_hash` and no email, that re-running the
  migration preserves legacy rows and narrows old grants, and that a failed admission audit
  write rolls back membership and invitation consumption.
- `scripts/auth-fixture-session.ts` creates sessions through Better Auth's actual
  adapter for browser tests. It requires loopback origin and a database name
  containing `test` or `fixture`; there is no application authentication bypass.
  CLI writes private cookie artifacts to `BACKOFFICE_FIXTURE_SESSION_FILE` rather
  than printing tokens. Artifacts must remain ignored and excluded from CI uploads.

The deterministic provider does not prove Google/GitHub application configuration.
Before release, manually verify both real providers, invitation recipients,
provider linking, secure effective cookies, CSRF and session revocation over TLS.
Actual provider credentials and production deployment are not authorized here.

Official references: [Next.js integration](https://better-auth.com/docs/integrations/next),
[database and migrations](https://better-auth.com/docs/concepts/database),
[account linking](https://better-auth.com/docs/concepts/users-accounts),
[hooks](https://better-auth.com/docs/concepts/hooks).

## Presentation and availability

Authentication surfaces support typed US English and neutral Latin American
Spanish copy. Supported `?locale=en|es` parameters take priority over the
`backoffice-locale` cookie; English is the safe default. Callback, invitation and
back links retain that preference. Locale never changes authorization policy.
Protected routes redirect infrastructure failures to a safe unavailable sign-in
surface; provider controls are disabled until configuration and database schema
are ready. No raw database or OAuth errors are rendered.

Revocation requires a native modal confirmation, supports Escape, and restores
focus to its trigger. Invitation copy feedback is bound to the current link and
resets for a newly created invitation. Styles reuse semantic tokens and the owned
button component; no independent theme or reset is introduced.

## Restricted project IAM identity

The optional shared-engine allocation uses a dedicated IAM database and separate
migrator/runtime logins; see the [runtime handoff](deployment-contract.md#optional-project-scoped-postgresql-allocation).
`--project-grants` is an explicit migration option, never a server startup action.
Its exact grants include Better Auth's database rate limiter. The integration suite
uses the actual migration CLI and validates fake-OAuth behavior with the runtime
identity. Shared-mode tests require an owned Docker container and fixture UUID;
remote, elevated, ambiguous or mismatched URLs fail before test mutations.
Both `disableOriginCheck` and `disableCSRFCheck` are explicitly `false`, preserving
security checks when the SDK recognizes a test environment.
