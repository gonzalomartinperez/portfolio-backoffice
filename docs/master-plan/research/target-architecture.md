# Target architecture (Clean Architecture for Next.js 16)

Planning only. Bracketed numbers refer to [sources](sources.md). Where the portfolio plan has
already decided a criterion (DTCG tokens, Stryker, axe 2.2, Lighthouse CI, Google TS with
adaptations), it is reused so that both repositories read as **one system**.

## Principles

- **Dependency rule** (Martin [30]) applied per feature, with Ports & Adapters (Cockburn [31]):
  `domain ← application ← adapters/presentation`, and **a single server-only composition root**.
- **Data Access Layer** as the only gateway to data and authorization, as recommended by the
  Next.js data security guide [1][2] and the OWASP Next.js cheat sheet [4]: the proxy handles
  only headers and optimistic redirects; **authorization lives in the use case** (with a
  transactional re-check in the adapter).
- Server Components by default; `"use client"` only in islands (charts, trace filters,
  preferences, auth buttons). Nothing sensitive crosses the boundary: serializable,
  allowlisted DTOs.
- Framework-free DI: factories with explicit dependencies (`createX({ port, clock, logger })`),
  a per-request `container` when a session is needed, and `React.cache` for per-request
  memoization.
- No ceremony where there is no logic: `privacy` is presentation only.

## Target structure

```text
src/
  app/                              # thin routes: parse params → call use case → render view
    (auth)/sign-in/page.tsx
    (backoffice)/layout.tsx         # NEW app shell: nav, status strip, locale/theme, sign-out
    (backoffice)/page.tsx           # Overview
    (backoffice)/operations/…       # (optional) traces on their own route
    (backoffice)/interactions/page.tsx   # today /analytics (308 redirect from /analytics)
    (backoffice)/access/page.tsx
    (backoffice)/access/audit/page.tsx   # NEW: read-only audit
    (backoffice)/loading.tsx, error.tsx, not-found.tsx; global-error.tsx
    privacy/page.tsx
    api/{auth/[...all],health,ready,operations}/route.ts
  server/                           # server-only
    config.ts                       # NEW: typed env validated once (schema), fail-fast
    container.ts                    # NEW: composition root (factories + process singletons)
    request-context.ts              # NEW: session/locale/requestId per request (React.cache)
    auth/{runtime,session,actions}.ts
    telemetry.ts                    # NEW: structured logger + OTel
  features/
    auth/        domain/ application/{ports,use-cases}/ adapters/{better-auth,pg}/ presentation/ entry.tsx
    operations/  domain/ application/{ports,use-cases}/ adapters/{http,contract}/ presentation/
    interactions/ (rename of analytics) …
    audit/       NEW: domain (AuditEvent), application (record/list), adapters/pg, presentation
  shared/
    ui/           # primitives: Button, Card, Stat, Badge, Table, Disclosure, Dialog, Field, Skeleton
    dataviz/      # NEW: ChartFrame, ProportionBar, BulletBar, Sparkline, Heatmap, Legend, scales
    format/       # NEW: memoized Intl (number, currency, percent, duration, relative time) es-419/en-US
    i18n/         # NEW: locale negotiation + typed dictionaries
    http/bounded-json.ts
    tokens/       # NEW: generated tokens (CSS vars + TS) from DTCG shared with the portfolio
```

## Layers and concrete contracts

| Layer | Contains | Target example |
| --- | --- | --- |
| domain | types, invariants, pure calculations (no I/O, no `Date.now`) | `summarizeOperations`, `classifyHealth(snapshot, now)` → `healthy/degraded/down/unknown`, `BudgetStatus`, `Metric<T> = {state:"available",value} \| {state:"unavailable",reason}` |
| application | **use cases** with authorization and orchestration; ports | `getOverview(actor)`: verifies role, reads ops/feedback/interactions in parallel, composes `OverviewView` with per-section states; `inviteViewer`, `revokeAccess`, `listMembers` (today in the page), `listAudit` |
| adapters | HTTP/PG/Better Auth; generated contract validation; wire→domain mapping | `operations/adapters/http.ts` + `contract/operations.validator.ts` (generated) |
| presentation | pure props→UI components; no `process.env`, no fetch | `OverviewView`, `StatusStrip`, `ExecutionsCard` |
| server (composition) | config, container, request context, actions, telemetry | `container.operations.getOverview` |

New guard rules (`scripts/check-boundaries.ts`):

- G1 `process.env` only in `src/server/config.ts` (and `next.config.ts`).
- G2 `app/**` only imports `server/*`, `features/*/presentation|entry` and `shared/*`; never
  adapters.
- G3 a feature's presentation does not import another feature (composition happens in `app` or
  in the shell).
- G4 `server/*` does not import `presentation` (move `reportSelection` to `adapters/input`).
- G5 packages per layer: `recharts` only in `shared/dataviz`; `pg`/`better-auth` only in
  adapters/server.
- G6 `"use client"` only in an allowlist of islands; maximum `.tsx` file size 200 lines
  (ratchet).
- G7 `contracts/*.types.d.ts` contracts only in `adapters/contract`.

## Keep vs change

| Keep | Change |
| --- | --- |
| Better Auth + admission hooks, transactional store, revocation that deletes sessions | Store split into `MembershipRepository`, `InvitationRepository`, `AuditLog` (ports in application) |
| `readBoundedJson`, adapters with timeout/redirect error | Validation generated from JSON Schema (Ajv standalone compiled to TS) or generated Zod 4; delete ~630 manual lines |
| Read discriminated unions | Uniform `Metric<T>` for "unavailable ≠ 0" at the level of each metric, not only the snapshot |
| AST guard + negative fixtures | Rules G1–G7 with a ratchet baseline |
| Node `--test` for unit/policy | Vitest 4 Browser Mode **only** for components and dataviz (see [testing](testing.md)) |
| Biome, strict TS, `.ts` scripts | Move inline JS in workflows/Dockerfile to `.ts` |
| Distroless non-root, `--read-only` | + attestation, SBOM, healthcheck in TS |
| Locale via cookie + query | Central negotiation (`shared/i18n`), correct server-side `<html lang>` from the cookie |

## ADRs to write (`docs/adrs/`)

- 008 Application use cases and Data Access Layer (authorization in the use case +
  transactional re-check).
- 009 Composition root and typed configuration (G1).
- 010 Generated contract validation (Ajv standalone vs Zod 4; decision and benchmark).
- 011 Design tokens shared with the portfolio (DTCG + drift check against a pinned commit).
- 012 Data-visualization system (allowed forms, palettes, accessibility, encapsulated
  Recharts).
- 013 Append-only audit and retention.
- 014 CSP with hash/nonce and headers.
- 015 Versioned migrations (tool and forward-only policy).
- 016 Observability (OTel, logs, request ID, no PII).
- 017 Testing strategy (pyramid/trophy, Vitest browser vs Playwright, visual, mutation).

## Master file index (current → target)

| Current | Target | Action |
| --- | --- | --- |
| `src/app/page.tsx` | `src/app/(backoffice)/page.tsx` | slim down: `container.overview.get(ctx)` → `<OverviewView>`; sections with `<Suspense>` |
| — | `src/app/(backoffice)/layout.tsx` | NEW app shell (nav, status strip, prefs, sign-out) |
| — | `src/app/(backoffice)/{loading,error,not-found}.tsx`, `src/app/global-error.tsx` | NEW |
| `src/app/analytics/page.tsx` | `src/app/(backoffice)/interactions/page.tsx` | rename (308 redirect from `/analytics`) |
| `src/app/access/page.tsx` | `src/app/(backoffice)/access/page.tsx` | use the `listAccess` use case; serializable DTO |
| — | `src/app/(backoffice)/access/audit/page.tsx` | NEW |
| `src/app/sign-in/page.tsx` | `src/app/(auth)/sign-in/page.tsx` | own auth layout |
| `src/app/style.css` | `src/app/style.css` + `src/shared/tokens/tokens.css` (generated) | separate tokens from reset/base; remove global feature classes (`operation-card`, `operations-*`) |
| `src/app/fonts.ts` | same | — |
| — | `src/app/icon.tsx`, `apple-icon.tsx` | NEW (identity) |
| `src/proxy.ts` | same | full CSP, HSTS, `x-request-id` |
| `src/server/operations.ts`, `src/server/analytics.ts` | `src/server/container.ts` | merge composition |
| — | `src/server/config.ts`, `request-context.ts`, `telemetry.ts`, `src/instrumentation.ts` | NEW |
| `src/server/auth/{config,runtime,session,actions}.ts` | same (config → uses `server/config.ts`) | actions call use cases + audit |
| `src/features/auth/adapters/store.ts` (182 lines) | `adapters/pg/{membership,invitation}-repository.ts` + `features/audit/adapters/pg/audit-log.ts` | split by port |
| `src/features/auth/application/manage-access.ts` | `application/use-cases/{invite-viewer,revoke-access,list-access}.ts` + `application/ports.ts` | complete the ports |
| `src/features/operations/application/read*.ts` | `application/use-cases/get-overview.ts` | use case with authorization and per-section states |
| `src/features/operations/adapters/validate.ts`, `feedback-validate.ts`, `analytics/adapters/validate*.ts` | `features/*/adapters/contract/*.validator.ts` (generated) + `mappers.ts` | replace ~630 manual lines |
| `src/features/analytics/presentation/selection.ts` | `src/features/interactions/adapters/input/report-query.ts` | move (G4) |
| `src/features/operations/presentation/dashboard.tsx` (331 lines) | `presentation/{overview-view,status-strip,kpi-row,executions-panel,budget-panel}.tsx` | split ≤ 200 lines |
| `src/features/operations/presentation/charts.tsx` | `src/shared/dataviz/proportion-bar.tsx` (+ usage) | replace the redundant bar chart |
| `src/features/operations/presentation/trace-explorer.tsx` | `presentation/trace-waterfall.tsx` | shared axis |
| `src/features/operations/presentation/preferences.tsx` | `src/shared/shell/preferences.tsx` | move out of the feature (G3) |
| `src/features/analytics/presentation/report*.tsx` | `src/features/interactions/presentation/*` + `shared/dataviz/heatmap.tsx` | split; legend and scale |
| `src/features/*/presentation/copy.ts` | `src/shared/i18n/` + typed per-feature dictionaries | single `es-419` |
| `src/shared/ui/button*.{tsx,css}` | `src/shared/ui/*` (10 primitives) | extend |
| — | `src/shared/{dataviz,format,i18n,tokens,shell}/` | NEW |
| `scripts/check-boundaries.ts` | same + G1–G7 | extend |
| — | `scripts/{check-tokens,check-palette,healthcheck,ci-*}.ts` | NEW (heredocs → TS) |
| `migrations/001-access.sql`, `runtime-grants.sql` | `migrations/0001_access.sql`, `0002_audit_append_only.sql`, `0003_invitation_limits.sql` + runner | versioning |
| `tests/browser/backoffice.spec.ts` (766 lines) | `tests/e2e/{auth,overview,traces,interactions,access,privacy,security}.spec.ts` + `tests/e2e/visual.spec.ts` | split by journey |
| `tests/integration/auth.test.ts` (634 lines) | `tests/integration/{admission,invitations,revocation,audit,iam-runtime}.test.ts` | split |
| — | `tests/component/**/*.test.tsx` (Vitest browser) | NEW |
| `playwright.config.ts` | + mobile projects, `retries:0`, visual project | extend |
| — | `vitest.config.ts`, `stryker.config.json`, `lighthouserc.json` | NEW (TS config where possible: `vitest.config.ts`; Stryker accepts `stryker.config.mjs` → prefer `.json` to avoid adding JS) |
| `.github/workflows/quality.yml` | `quality.yml` (single build) + `nightly.yml` + `codeql.yml` + `scorecard.yml` | restructure |
| `.github/workflows/release.yml` | same with attestation/SBOM/cosign (gated) | complete |
| `infra/docker/app/Dockerfile` | same; `HEALTHCHECK` → `node scripts/healthcheck.ts` | — |
| `docs/verification/*` (31) | `docs/verification/` with an index + `docs/verification/archive/` | curate |
| `IMPLEMENTATION_STATUS.md`, `docs/implementation-plan.md`, `docs/work-checklist.md` | `docs/roadmap.md` | consolidate |
| — | `docs/security-controls.md` (ASVS), `docs/testing.md`, `CHANGELOG.md` | NEW |

JS/MJS/CJS files in the repository: **none** [measured]. Embedded JS to migrate: 3 heredocs in
`quality.yml`, the Dockerfile `HEALTHCHECK` and the pre-paint theme script in `layout.tsx` (the
latter stays inline because it must run before paint; it is covered by a CSP hash and a test).
