# Backoffice architecture

The root page is a protected, dynamic Server Component. Server-only
`server/operations.ts` composes a bounded HTTP adapter and the application read.
Presentation receives allowlisted view data, never private URLs, tokens or diagnostics.

- `operations/domain`: pure operational models and available, unconfigured or unavailable results.
- `operations/application`: a small read port; no React, Next or concrete networking.
- `operations/adapters`: private HTTP policy, bounded UTF-8 JSON and explicit wire mapping.
- `operations/presentation`: server dashboard and intentional client preference controls.
- `auth/domain`, `auth/application`: pure locale/access policy and narrow access/browser-session ports.
- `auth/adapters`, `auth/presentation`: PostgreSQL/SDK mapping and account UI.
- `server`: private configuration, session guards and operations/analytics composition.
- `shared/ui`: owned semantic primitives.

Dependency tests inspect static, dynamic and type-only imports. Pure layers cannot depend
on frameworks/platform globals, and client components cannot import authentication
infrastructure. The native checker covers application, tooling, tests and generated routes.

Google/GitHub admission requires verified configured-owner or invited-viewer identity.
Every protected page, API and action checks live database membership; hiding a control
never authorizes an operation. IAM storage is separate from conversation data. Explicit
linking, atomic invitations and revocation are documented in [authentication](authentication.md).

Operational reads use no-store, bounded time/body, no redirects and safe failures. Missing
or rejected data stays unavailable. No model call, generation retry, transcript storage
or browser service token exists here. The [backend request](backend-operations-request.md) records the original requirements.
The API now publishes a committed private contract, linked from README; production
configuration and paired authenticated-browser verification remain separate acceptance tasks.

[ADR 004](adrs/004-native-chat-and-private-operations.md) defines ownership. The portfolio
owns one native conversation feature for compact, maximized, mobile and page presentations.
Its verified implementation is committed at `7753d39`; 31 assistant unit/network checks
and 68 browser scenarios passed before the old chat and iframe were retired here.

Former implementation source and detailed streaming architecture remain available at
[frontend baseline aed8ea7](https://github.com/gonzalomartinperez/portfolio-assistant-backoffice/tree/aed8ea710c8b847ddc9066aaef5ce48d3793b494).
Historical screenshots remain labeled. Retired chat coverage now belongs to the portfolio;
backoffice authentication, operations, dependency policy and boundary checks remain here.

## Access management without framework coupling

`auth/domain/access.ts` owns access values, revocation targets and email policy.
`auth/application/manage-access.ts` owns invitation/revocation operations and the narrow
`AccessManagementPort`. They import neither React/Next nor Better Auth, PostgreSQL,
FormData, environment variables or concrete adapters. Discriminated outcomes distinguish
success, invalid input, forbidden access and unavailable persistence.

`server/auth/actions.ts` is a Next transport boundary: obtain live membership, decode FormData,
call the injected operation, format the approved invitation destination and revalidate
only after success. `server/auth/session.ts` / `server/auth/runtime.ts` compose the session and PostgreSQL
adapters. `auth/adapters/store.ts` implements the port structurally and reauthorizes the owner inside
each write transaction. An actor snapshot or a use-case check never replaces that check.
OAuth admission, single-use invitations, audit writes and session deletion remain atomic.
The existing list/OAuth/schema adapters retain their cohesive locations; no generic
repository class, service locator or folder-only migration is introduced.

```mermaid
flowchart LR
    ACTION[Next Server Action] --> USECASE[Access application operations]
    USECASE --> DOMAIN[Pure access policy and values]
    STORE[PostgreSQL access adapter] --> PORT[Application-owned port]
    USECASE --> PORT
    ROOT[Server composition] --> ACTION
    ROOT --> STORE
```

## Architectural CI contract

`npm test` runs dependency tests in the existing required static job. The AST guards
cover every feature core, static/dynamic/type-only and import-equals dependencies in `.ts`, `.tsx`, `.mts` and
`.cts`,
relative paths, cycles and transitive client-to-server imports. Explicit `use server`
modules with async-only runtime exports are RPC boundaries; traversal stops there,
while invalid value exports remain private. Next independently validates exports.
The production build still enforces `server-only`. Pure application modules may not
perform direct browser/environment/network access; adapters may not import feature
presentation or entry composition. Negative fixtures exercise the actual checker.

Every collected source file must have an explicit placement, even when it has no
imports. Feature files belong to `domain`, `application`, `adapters`, `presentation`
or an exact `entry.ts`/`entry.tsx` composition module (including `.mts`/`.cts`).
The other owned locations are `app`, `server`, `shared/ui`, `shared/http`,
`shared/accessibility` and the exact `src/proxy.ts` framework entry. Unknown roots,
feature layers and shared groups fail both the per-file and graph checks. Adding
a location requires an intentional classifier update and positive/negative probes;
renaming an adapter directory cannot silently remove its dependency checks.

These checks are a regression guard, not a sandbox or a substitute for authorization
and behavioral review. Computed imports in pure/presentation layers are rejected;
module-graph resolution supports relative imports and the conventional @/ source
prefix, including negative fixtures. No path alias is needed by runtime source.
Adding aliases/reexports or a new composition mechanism requires corresponding guard
coverage. Client code must never receive secrets even when its import graph is valid.
See [engineering coordination](engineering-coordination.md) for standards and ownership.

Owned source still prefers `.ts`/`.tsx` per CONTRIBUTING; the guard and primary checker
cover `.mts`/`.cts` defensively so an alternate TypeScript module suffix cannot evade CI.

## Project-wide composition

[ADR006](adrs/006-project-backoffice.md) establishes the canonical project name and
website/assistant separation. `analytics` owns its domain, read port, validated
adapter and presentation; `operations` remains assistant execution/availability.
The server route composes both after live authorization and runs their reads in
parallel. No browser/service-token or domain/generated-schema boundary is relaxed.

## Browser session and migration composition

The small client entry in `features/auth/entry.tsx` wires three auth controls to a
`BrowserSessionPort`. The SDK adapter maps unknown results to success/failure and
owns reviewed callback paths; views retain pending/error rendering. No raw SDK
error reaches the UI and no generation or authentication retry is introduced.
Server routes pass serializable locale/label props only.

`src/server/auth/config.ts` and `runtime.ts` are private but CLI-safe: the migration
script must import them with plain Node, without `next/headers` or `server-only`.
Request-specific session composition retains its marker. AST checks enforce the
whole server directory even when its files have no marker. The runtime trace
allowlist admits only config/runtime, the access store/domain and existing SQL;
request modules, views and fixture-session tooling are excluded. No IAM SQL,
cookie namespace, database name or wire schema changes in this source move.
