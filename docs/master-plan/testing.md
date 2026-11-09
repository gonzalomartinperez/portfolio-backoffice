# Testing

Maps every row of ecosystem section 11.0 to this repository (tool, scope, threshold, cadence) or states "not applicable" with the reason. Numeric thresholds are the backoffice column of section 11.1. Baseline numbers come from [audit.md](audit.md). Decisions: PBO-D7, PBO-D8 (ADR 0018). Pragmatism rule: a type is kept only if it guards a real risk of this repo.

## 1. Layers and numeric targets

| Layer | Target | Baseline | Gate |
|---|---|---|---|
| Static | 0 lint errors, 0 warnings, 0 type errors, knip clean, complexity at most 10 (ratchet) | 0 / 1 info / 0; knip and complexity unmeasured | `npm run check` and `ci-gate` |
| Test counts by layer | at least 142 unit (ported, only grows), at least 40 integration (runtime role, audit, store, DAL, migrations), 15-25 E2E tests, 0 skipped | 142 unit, 3 integration, 66 browser cases | reported per layer in `scorecard.json`, floors in `quality/ratchets/`; integration grows to the floor by PBO-M2 and M4 |
| Branch coverage floor (whole `src/`, `scripts/` excluded or reported apart) | 80%; 90% on auth, permissions, DAL | 88.3% (includes `scripts/`; `store.ts` 4.4% and `runtime.ts` 7.6% line) | Vitest coverage thresholds in `quality/ratchets/coverage.json` |
| Diff coverage on PR | 90% on auth/permission/DAL code, 80% elsewhere | none | `scripts/ci/diff-coverage.ts` (lcov plus `git diff`, about 80 lines, no Python dependency) |
| Mutation (Stryker, scoped, never on UI glue) | PR incremental break 70; permission module at least 85; rest at least 75; weekly full | none | Stryker `thresholds {high 85, low 75, break 70}` |
| Property-based | permission lattice, filter and pagination invariants, contract validators, privacy invariant; 100 runs on PR, 1000 nightly | none | fast-check |
| Contract | consume generated types from the four committed snapshots; invalid corpus rejected | `contract:check` matches 5 snapshots | `check-contract.ts` plus Ajv corpus test |
| E2E | 15-25 tests; per-role projects; PR = Chromium plus iPhone WebKit tagged journeys; nightly and release = Chromium, Firefox, WebKit, iPhone, Pixel | 66 cases on desktop Chromium, Firefox, WebKit | Playwright |
| Visual | design-system components in `/__kit` plus key routes x themes x viewports | none | `toHaveScreenshot` |
| Accessibility | axe `wcag22aa` per route, theme, locale, role and key state: 0 serious or critical; keyboard journeys; manual pass quarterly | axe 0 on 24 states (default rules, EN) | Playwright |
| Lighthouse (5 runs, median) | perf at least 0.85 from M3 on `/` (sign-in at least 0.90; ecosystem floor 0.80 warn), a11y 1.0, best practices at least 0.95, TBT at most 300 ms (warn) | `/` mobile 60, sign-in mobile 79 | Lighthouse CI |
| Integration data | real Postgres 18 in a container; suite under 90 s; random order | PG 18.6 container via API-built image | Testcontainers |

## 2. Catalog mapping (ecosystem 11.0, every row)

| Family | Test types | This repo: tool, scope, threshold, cadence |
|---|---|---|
| Correctness | Unit | Vitest 4 (node project) on `domain`, `application`, `adapters` (mappers, validators), `shared/format`, `shared/i18n`, `server/dal` with fakes; branch floor 80, 90 on auth; PR |
| | Integration with real DBs in containers | Testcontainers `postgres:18.x-trixie@sha256` for admission, invitations, revocation, audit append-only, IAM runtime role, migrations; PR (about 90 s budget). No Neo4j or pgvector here: **not applicable** |
| | Component (all states) | Vitest 4 Browser Mode with Playwright provider (Chromium and WebKit) for every primitive and composite, all states of `Metric`, `DataTable`, `ChartFrame`; PR on affected paths |
| | Architecture and boundary tests | `scripts/guards/check-boundaries.ts` rules G1-G10 with negative fixtures; token and kit guards; ci-profile coverage test; PR |
| Test quality | Mutation | StrykerJS 9 with the Vitest runner on `src/features/auth/{domain,application}`, `src/server/dal`, `src/server/env.ts`, adapters' mappers and validators, `src/shared/format`; incremental on PR (30 min budget), full weekly (90 min budget); Browser Mode excluded by design |
| | Branch and diff coverage | As section 1; PR |
| | Flake detection | Playwright `--repeat-each=5` nightly on all projects; `retries: 1` on CI only; a pass on retry is recorded as flaky, `failOnFlakyTests` on `main` and release; quarantine cap min(2%, 5); 0 flaky for required checks: at least 14 observed days at M6, 30 days as the M7 entry gate |
| Input space | Property-based | fast-check: permission lattice monotonicity (owner at least viewer, no escalation by invitation), URL-state parse/serialise round-trip, pagination cursors, `Metric` never coerces unavailable to a number, validators reject every mutation of the example corpus (forbidden keys such as prompt, answer, token never pass); 100 runs PR, 1000 nightly |
| | API fuzzing from OpenAPI | **Not applicable**: the app exposes no public REST contract of its own beyond health, ready and Better Auth; Schemathesis runs in the API repo against its operations endpoints. A nightly cross-check replays the API's published example payloads through the validators (see Contracts) |
| | Parser and validator fuzzing | Covered by the property tests on Ajv validators and `bounded-json` (size and depth bounds); nightly 1000 runs |
| Contracts | Producer to consumer schema tests, breaking-change detection | `contracts/assistant-api/manifest.json` with revision and SHA-256 for the four snapshots; `contract:generate` plus `git diff --exit-code`; Ajv corpus test (examples accepted, mutated corpus rejected); `contract` profile adds the consumer compile job; PR on `contracts/**` |
| | SSE conformance | **Not applicable**: the backoffice has no SSE endpoints and no chat |
| | Event schemas | The product-interaction schema is consumed read-only (`product-analytics-v2.schema.json`); schema diff runs when the snapshot changes. Emission is the site's job |
| End to end | User journeys | Playwright: sign-in states, owner and viewer journeys, Overview, Runs filter and detail, Usage, Audience filters, invite and revoke, preferences, privacy; 15-25 tests; PR Chromium plus iPhone WebKit |
| | Checkout hand-off to Hotmart | **Not applicable** (no commerce) |
| | Auth journeys | Real Postgres, fake OAuth provider fixtures (public fixture client ids); invite once, revoked access cannot be restored, last owner protected; PR |
| | Cross-browser and device profiles | Chromium, Firefox, WebKit desktop, WebKit iPhone 15, Chromium Pixel 7; PR subset, nightly all (the five-browser nightly is advisory, warn-only, until MV; PR gates stay enforcing); monthly real-device check **not applicable** for the PR gate (private authenticated app), manual iPhone Safari check before each release |
| Visual | Screenshot regression | Playwright in the pinned container: `/__kit` states in 2 themes; Overview, Runs, Run, Usage, Audience, Feedback, Access, Sign-in x 2 themes x 3 viewports x EN/ES where copy length matters; `maxDiffPixelRatio` 0.002, animations disabled, frozen clock `2026-10-12T23:43Z`; baseline approved by the evaluator; PR on affected routes, nightly all |
| | Per-figure hero snapshots | **Not applicable** (no hero particle system here) |
| Accessibility | axe WCAG 2.2 AA | Every route x theme x locale x role x key state (menus, dialogs, errors); 0 serious or critical; PR for affected routes, nightly all |
| | Keyboard, focus, reduced motion, zoom | Per template: palette, peek sheet, focus restore, dialog trap, skip link, chart keyboard; `prefers-reduced-motion` emulation; 200% and 400% reflow; forced-colors; PR |
| | Screen reader checklist | VoiceOver Safari and NVDA Firefox per release; quarterly full pass |
| Performance | Lighthouse and bundle budgets | Per-route first-load JS at most 170 KB gz excluding the lazy chart chunk (baseline `/`: 261 KiB with the 108 KiB Recharts chunk); Lighthouse CI on `/`, `/runs`, `/usage`, `/sign-in`; PR on UI paths, release all |
| | RUM field CWV | **Not applicable** now (private app, no consent flow, no VPS); revisit at MV with server-side timings only |
| | Animation fluidity | Frame-time and INP check on the command palette, sidebar collapse and sheet; Playwright trace `Long Animation Frames`; nightly (warn) |
| | API latency p95, TTFT | **Not applicable** here (API repo); this app asserts upstream timeout and error mapping only |
| Load and resilience | Load, stress, soak (SSE) | **Not applicable** (no SSE, single-operator traffic); a short `autocannon`-class smoke on `/api/ready` is out of scope |
| | Dependency-failure tests | API down, slow (timeout), malformed, unauthorized, contract-violating; Postgres down (readiness 503, pages show safe state); each yields the Unavailable state with a reason, never zero; PR |
| Security | SAST | CodeQL default setup (JS/TS and `actions`), public repo; PR and weekly |
| | Secrets | gitleaks in CI, GitHub push protection, existing redacted history scan; PR |
| | Dependency and licence review | `dependency-review-action` on PRs, osv-scanner daily, licence allow-list (existing `check-license.ts`); PR and daily |
| | Container scan | Grype on the built image, fail on fixable High or Critical; PR (build) and weekly on digest |
| | DAST baseline | OWASP ZAP baseline against the container with fixture auth; nightly, advisory (warn-only, not a gate) until MV |
| | Authz matrix | Role (anonymous, viewer, owner, revoked, second tenant not applicable) x resource x action, enumerating every registered mutating route and Server Action, failing if one is unlisted; checks: 401, 403, wrong-owner, object-id swap, mass assignment of role fields, session tamper, logout invalidation, CSRF and Origin on every mutation; PR |
| | CSRF/Origin, session expiry and revocation | Included in the matrix; revocation deletes sessions and takes effect on the next request (cookie cache off); better-auth pinned at least 1.6.11 (current 1.7.10) with one regression test per 2026 advisory |
| | Security headers and CSP snapshots | Header snapshot per route class (nonce CSP, HSTS, `no-store`, frame and referrer policies); no CSP violation in console in E2E; PR |
| | RSC/DTO leak checks | Test that props crossing to client islands contain only allowlisted fields; fixture secrets (`OPERATIONS_READ_TOKEN`) never appear in HTML or flight payload; PR |
| | Prompt injection and red team | **Not applicable** (no model calls); the privacy invariant (no prompts or answers in payloads) is tested by property tests |
| AI quality | Golden set, graders, retrieval metrics, judge validation, prompt regression | **Not applicable** (assistant quality lives in the API repo). This app displays quality data and its honesty rules are tested |
| Data | Migration tests | Apply from empty and from N-1; forward-only; idempotent re-run; runtime role privileges asserted (no DDL, audit insert and select only); PR |
| | Seed and fixture safety | Existing `fixture-safety` and `project-fixture` tests keep refusing non-test databases; PR |
| | Backup restore drill | Owned by `vps-ops` (monthly); this repo supplies the schema, the `portfolio_iam` database name and a restore smoke query in `docs/how-to/deploy.md`; MV |
| Build and runtime | Container structure tests | container-structure-test: user 65532, entrypoint, labels, no shell, files listing (no secrets, no `.env`), read-only rootfs boot with `tmpfs`; PR |
| | Image smoke with health and readiness | Existing `verify-container.ts` (bounded resources, readiness, SIGTERM drain within `stop_grace_period`) against the artifact image; PR |
| | Hosting contract, post-deploy verification | Hostinger **not applicable** (VPS). Post-deploy `/api/health` version equals release SHA at MV, run by `vps-ops` |
| Infrastructure | Host baseline, Ansible, compose and Coolify config, drift | **Not applicable** (owned by `vps-ops`); this repo provides `docs/reference/deployment-contract.md` and the env schema that `vps-ops` validates |
| Content and SEO | Copy invariants, locale checks | Typed dictionaries for en-US and es-419: parity test (same keys), no hard-coded strings in presentation (lint), `es-AR` banned (grep test), "estimated, not an invoice" and unavailable copy present; PR |
| | Structured data, sitemap, canonical | **Not applicable**: the app is `noindex`; test asserts `noindex` meta and header on every route; Lighthouse SEO is not budgeted |
| | Link check | lychee on docs, weekly plus docs profile |
| Time and concurrency | Frozen time, time zones | `page.clock` and injected clocks; UTC rendering and relative-time pairing tested; invitation expiry boundaries; `America/Argentina/Buenos_Aires` is not used in the UI (UTC only), so only the Dependabot schedule uses it |
| | Race and concurrency | Concurrent invitation consumption (single use), concurrent revoke and sign-in, last-owner removal race, rate-limit counters; Testcontainers with parallel promises; PR |
| Observability | Log redaction, request id, metrics contract | Logger allowlist test (no emails, tokens, raw IPs, SQL), `x-request-id` created in proxy and propagated to the API call and logs, `/api/ready` and `/api/health` body contracts; PR |
| Harness | Skill activation evals, docs checks, drift, CI profile coverage | `skills:check` with `evals/triggers.json` per skill, AGENTS.md command test, README heading check, `standards.lock` drift, `ci-profile.json` coverage test (no tracked file outside every profile); PR on affected paths, weekly drift |
| Production synthetics | Uptime and journey probes | **Phase V**: Uptime Kuma on `/api/health` (read-only) and a scheduled Playwright smoke through the tunnel; MV |

## 3. Runner and tooling decisions

- **Vitest 4 is the preferred runner (DR-09: one spike E7 decides for all four TypeScript repos; fallback `node:test` with the Stryker tap-runner)** and replaces `node --test` if chosen (28 unit files ported mechanically, `node:assert` stays valid; one runner per package). Projects: `unit` (node), `component` (Browser Mode, Playwright provider), `integration` (node, Testcontainers). Spike E7 (1-2 days) compares StrykerJS via `tap-runner` on `node:test` with the Vitest runner and confirms the TypeScript checker with TS 7 (needs the TS 6 alias until 7.1); if Stryker fails with Vitest 4 the fallback is the `tap-runner` on the existing suite for mutation only.
- **Playwright** 1.64: `getByRole`, web-first assertions, trace `on-first-retry`, `retries: 1` CI only, blob reports merged, shards only when a job exceeds budget (shards = ceil(minutes/4), at most 6), `--only-changed` as a PR accelerator.
- **Test server**: the existing `scripts/test-server.ts` fixture stack stays (real Postgres, synthetic operations API, fake OAuth) and the fixture `.env` is written by TypeScript, not heredocs.
- **Test authority**: every PR runs only synthetic data; no production secret exists in PR jobs; paid providers disabled (`ALLOW_PAID_AI=false`).

## 4. Security matrix (initial rows, enumerated from the code)

| Surface | Anonymous | Viewer | Owner | Notes |
|---|---|---|---|---|
| `GET /`, `/runs`, `/usage`, `/analytics`, `/feedback`, `/account` | redirect to sign-in | allowed | allowed | typed Forbidden for routes the role may not see |
| `GET /access`, `/access/audit` | redirect | Forbidden state | allowed | |
| `GET /api/operations` | 401 | allowed | allowed | no-store |
| Server Action `inviteViewer` | 401 | 403 | allowed | CSRF and Origin; rate limit; dedupe pending email |
| Server Action `revokeInvitation`, `revokeMember` | 401 | 403 | allowed | owner re-check in transaction; last owner protected |
| Server Action `signOutEverywhere`, preferences | 401 | allowed (self) | allowed (self) | |
| `GET /access/invitation` | public | public | public | token to cookie once, single use, bound to email |
| `/api/auth/*` | provider flow | provider flow | provider flow | rate limit 30 per 60 s; implicit linking disabled |
| `GET /api/health`, `/api/ready` | allowed | allowed | allowed | no secrets or SQL errors |

The test enumerates registered mutating routes and `"use server"` exports and fails on any not listed here.

## 5. Cadence

| Job | PR | Nightly | Weekly | Release |
|---|---|---|---|---|
| Static, unit, integration, diff coverage | yes | yes | | yes |
| Component, architecture guards, token and kit checks | affected | yes | | yes |
| Playwright Chromium plus iPhone WebKit (tagged journeys) | yes | | | |
| Full browser and device matrix, visual all routes, `--repeat-each=5` | | yes | | yes |
| Mutation | incremental, changed files | | full scoped | full scoped (or last nightly within 24 h) |
| Lighthouse and bundle budgets | UI paths | | | all routes |
| CodeQL, osv, Grype on digest, ZAP baseline | CodeQL, dependency review, gitleaks | osv, ZAP | Scorecard, Grype digest | yes |
| Manual a11y and iPhone Safari | | | | yes |
| Scorecard and ratchet check | | yes | | yes |

## 6. Flake policy

As ecosystem 6.3: no blanket retries on unit tests; Playwright `retries: 1` on CI only and recorded as flaky; `failOnFlakyTests` on `main` and release, warning on PRs for the first month; a flaky test gets an issue labelled `flaky` and is quarantined the same day (tagged, non-blocking job, listed in `tests/quarantine.json`), fixed or deleted within 7 days; cap min(2% of tests, 5); first-attempt failure rate on `develop` above 2% over 20 runs stops feature work; required checks show 0 flaky over at least 14 observed days at M6 and 30 days at the M7 entry gate (rubric D3). The detector runs from the first week of M2. v1 `retries: 1` already hides flakes with no report: the report is PBO-M2-8.
