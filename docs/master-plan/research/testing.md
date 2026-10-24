# Testing strategy

Planning only. Bracketed numbers refer to [sources](sources.md).

## Baseline

| Level | Today |
| --- | --- |
| Unit (`node --test`) | 31 files; 142 tests; ~45 % of test lines cover tooling/CI/policy, not product |
| Auth integration (real PG) | `tests/integration/auth.test.ts` 634 lines, 3 large tests (invitation/role/revocation, invitation cookie, runtime IAM) |
| Contracts | `scripts/check-contract.ts` + drift of generated types vs the API snapshot |
| E2E | 1 spec of 766 lines, ~20 tests × desktop chromium/firefox/webkit, against the real image + PG |
| A11y | axe in ~10 tests, tags up to 2.1 |
| Visual | captures as artifacts, **no comparison** |
| Dedicated mutation / perf / security | none |

## Target per level

| Level | Tool | Scope | Target |
| --- | --- | --- | --- |
| Domain/application unit | `node --test` (kept) | rules, use cases with port fakes | 100 % lines in domain/application; ≥ 95 % branches |
| Mutation | StrykerJS 9 with the **tap-runner** over `node --test` (TAP compatible) [8][9] | domain, application, adapters/contract, `bounded-json` | mutation score ≥ 85 % (break 80 %), incremental on PRs, full nightly |
| Components and dataviz | **Vitest 4 Browser Mode** + `vitest-browser-react` + Playwright provider [10] | `shared/ui`, `shared/dataviz`, views with fixture props (available/unavailable/empty/partial) | every state of every view; axe per component |
| Auth integration (real PG) | `node --test` + ephemeral PG (already) | split into tests per rule; add append-only audit, rate limit, sessions, owner binding | 100 % of `store`/`runtime` through integration |
| Contract tests | API JSON Schema + examples | (a) the generated validator accepts all `examples`; (b) rejects mutations (extra properties, types, ranges); (c) *consumer-driven*: the backoffice publishes which fields it uses → the API runs that check in its CI (or Pact if a showcase is wanted; see [dependencies](dependencies.md)) | 0 drift; negative examples per field |
| E2E | Playwright 1.64 | projects: `chromium`, `firefox`, `webkit`, `mobile-safari` (`iPhone 15`), `mobile-chrome` (`Pixel 7`); specs split by journey (auth, overview, traces, interactions, access, privacy) | 0 flakes in 20 runs; `retries: 0` on PRs + a nightly flake-detection job with `--repeat-each=5` |
| Visual regression | Playwright `toHaveScreenshot` [11] in a fixed container (image `mcr.microsoft.com/playwright:v1.64.1-noble`), deterministic fixtures, frozen clock (`page.clock`) | 6 views × 2 themes × 2 locales × {390, 1280} in chromium + webkit | 0 unapproved diffs; `maxDiffPixelRatio` 0.001 |
| Accessibility | axe `wcag2a, wcag2aa, wcag21aa, wcag22aa` + own checks (target size, focus not obscured, series contrast) + a manual VoiceOver iOS/NVDA script per release [19] | all routes and states | 0 violations; signed screen-reader checklist in `docs/verification/` |
| Security | integration + E2E | see [security tests](#security-tests) | all cases green |
| Performance | Lighthouse CI (desktop + mobile) on the image with fixtures; `size-limit` or a per-route chunk budget | `/sign-in`, `/`, `/interactions`, `/access` | see [performance budgets](#performance-budgets) |

## Pyramid/trophy

Most tests in domain/application (fast) + components in a real browser (Vitest) + a few E2E per
journey. Formatting and derivation logic moves out of the `.tsx` files into `shared/format` and
`domain`, which makes it testable and mutable by Stryker.

## Fixtures

A single typed *fixture builder* (`tests/fixtures/operations.ts` →
`buildSnapshot({ overrides })`) generated/validated against the schema; named scenarios:
`healthy`, `degraded`, `unavailable:transport`, `unavailable:authorization`, `contract-drift`,
`empty-month`, `zero-budget`, `overspend`, `partial-week`. Reused by unit, Vitest, Playwright and
README captures.

## Contract tests (detail)

- `contracts/manifest.json` already pins the API commit; add `contracts/consumer-fields.json`
  (fields the backoffice reads) and a check that fails if the API schema makes them optional or
  changes their type. Coordinate with the API (skill `api-change-stream`) to run it in its CI.
- Generate the validator from `*.schema.json` (Ajv 8 standalone → TS module in
  `adapters/contract`) [22], with a test that ensures it accepts every `*.examples.json` and
  rejects a corpus of mutated payloads (property-based with `fast-check`).

## Security tests

- OAuth: callback with invalid/missing `state` → 303 to `/sign-in?error=access` (partially
  exists in `auth-callback.test.ts`), unverified email → denied, GitHub account with an email
  different from the invited one → denied, expired/revoked/consumed invitation → denied,
  implicit linking → denied.
- CSRF: POST to `/api/auth/*` and Server Actions with a foreign `Origin` → 403; no `Origin` +
  `Sec-Fetch-Site: cross-site` → 403.
- RBAC: role × route/action matrix (owner/viewer/revoked/anon) generated as a table and executed
  in E2E (`/`, `/interactions`, `/access`, `/access/audit`, `/api/operations`, `inviteUser`,
  `revokeAccess`).
- Session: revocation invalidates the next request (no cache), 8 h expiry with `page.clock`,
  `HttpOnly; Secure; SameSite=Lax; Path=/` cookies with prefix.
- Headers/CSP: per-route header snapshot; no CSP errors in the console.
- Data: no client DTO contains `token`, internal `origin` or non-allowlisted fields (a test that
  walks each page's RSC payload looking for forbidden patterns).

## Performance budgets

| Metric | Target |
| --- | --- |
| Initial JS per route (gzip) | `/sign-in` ≤ 110 KiB; `/` ≤ 200 KiB (Recharts lazy below the fold or `next/dynamic` with a skeleton); `/access` ≤ 120 KiB |
| Total CSS | ≤ 12 KiB gzip |
| Lighthouse (mobile, fixtures, production image) | Performance ≥ 95, Accessibility 100, Best Practices 100 |
| LCP / INP / CLS (lab, throttled mobile) | ≤ 2.0 s / ≤ 150 ms / ≤ 0.05 (aligned with the portfolio) |
| TTFB `/` with API fixture | ≤ 300 ms p95 locally; the 5 s upstream timeout already exists → the section degrades to "unavailable" instead of blocking the whole page (streaming) |
