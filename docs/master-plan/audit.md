# Audit: measured baseline (2026-11-09)

Source: `origin/develop` at `e356b13d81d509e640b3b318c0d37c7b4abcce1c`, exported with `git archive` into a temporary directory without secrets, Node 24.22.0 (`.nvmrc`), 2026-11-09. Raw logs are in [audit/](audit/) (small text logs and `axe-results.json`; the Lighthouse JSON and 24 screenshots stay in the planning workspace and are summarised in [audit/lighthouse-summary.md](audit/lighthouse-summary.md)). Evidence labels: **[measured]** executed today, **[code]** read in the code, **[v1]** measured by the October v1 audit and not re-measured, **[inference]** reasoned, to be confirmed.

Product context: a private Next.js 16.4.2 / React 19.3.1 / TypeScript 7.0.2 app with Better Auth 1.7.10 (Google and GitHub only, owner and viewer roles), a Postgres IAM schema, Recharts 3.10.1, Biome 2.5.15, Playwright 1.64.1. Routes: `/`, `/analytics`, `/access`, `/access/invitation`, `/sign-in`, `/privacy`, `/api/{auth,health,operations,ready}`. 320 tracked files: 5,238 lines of TypeScript in `src/` (4,225 under `features/`), 1,195 lines of CSS (358 global plus five CSS Modules), 30 scripts, 28 unit test files, one 634-line integration test, one 766-line Playwright spec, zero `.js/.mjs/.cjs` files.

## 1. Numbers

| Metric | Value | Evidence |
|---|---|---|
| `npm ci` (cold cache) | 196 s, 153 packages | `audit/npm-ci.log`, `audit/timings.txt` |
| Lint (Biome) | 0 errors, 1 info (`scripts/verify-postgres.ts:247` template literal) in 0.9 s | `audit/lint.log` |
| Format check | 153 files clean | `audit/format-check.log` |
| Typecheck (TS 7.0.2 plus `next typegen`) | 0 errors, 4.5 s (5.0 s timed) | `audit/typecheck.log` |
| Unit tests | **142/142 pass**, 9.2 s | `audit/SUMMARY.md` |
| Unit coverage (`node --test --experimental-test-coverage`, includes `scripts/`) | **lines 82.74, branches 88.28, functions 90.08** | `audit/unit-coverage.log` |
| Lowest-covered source files | `src/features/auth/adapters/store.ts` 4.4% lines; `src/server/auth/runtime.ts` 7.6%; `src/**/*.tsx` not measured (0 component tests) | `audit/unit-coverage.log` |
| Auth integration (`test:auth`, real Postgres 18.6 container) | 2 pass, 1 skip ("project IAM runtime ... bounded pool" needs the paired API environment) | `audit/test-auth.log` |
| Contract check | 5 snapshots match recorded API commits | `audit/contract-check.log` |
| Production build (`next build --webpack` plus `prepare-runtime`) | 161 s per SUMMARY (178 s in `build-time.txt` including runtime preparation); compile 77 s after retries | `audit/build.log`, `audit/build-time.txt` |
| Build routes | 10 dynamic (`ƒ`), 1 static (`_not-found`), `Proxy (Middleware)` | `audit/build.log` |
| axe (default rule set, 4 routes x 3 widths x 2 colour schemes = 24 page states, EN) | **0 violations**, no horizontal overflow at 390, 768, 1440 | `audit/axe-results.json` |
| Lighthouse, `/sign-in` desktop / mobile (n=1) | perf 97 / **79**, a11y 100, best practices 96, SEO 60 | `audit/lighthouse-summary.md` |
| Lighthouse, `/` desktop / mobile (n=1) | perf 84 / **60**, a11y 100, best practices 96, SEO 60 | same |
| `/` mobile detail | FCP 1.0 s, LCP 3.6 s, **TBT 3,890 ms**, TTI 7.0 s, CLS 0, 261 KiB JS transferred, 409 KiB total | same |
| Largest client chunk (`/`) | `696-6b91…js`: **374 KB (365 KiB) raw, 108 KiB transferred** = Recharts (imported only in `charts.tsx` and `report-chart.tsx`) | `audit/lighthouse-summary.md`; `grep recharts src` [code] |
| `/sign-in` JS | 148 KiB transferred (React, Next runtime, Better Auth client) | same |
| Trivy config scan, `app/Dockerfile` | 0 misconfigurations | `audit/trivy-config.txt` |
| Secret and docs checks | 320 reachable blobs and 273 text files scanned, 0 findings; 290 local links, 0 missing (timings.txt shows rc=1 on a first run without `.git` in the export, re-run clean) | `audit/security-check.log`, `audit/docs-check.log` |
| Skills / license / toolchain checks | 4 skills 0 errors; 0 license findings; TS 7.0.2 with compiler API 6.0.3 | `audit/skills-check.log`, `license-check.log`, `toolchain-check.log` |
| `process.env` reads in `src/` | 16 occurrences in 6 files (`server/operations.ts`, `server/analytics.ts`, `server/auth/session.ts`, `app/page.tsx`, `app/analytics/page.tsx`, `app/access/invitation/route.ts`) | `grep` [code] |
| Hand-written validators | 632 lines (`validate-report.ts` 303, `operations/adapters/validate.ts` 185, `analytics/adapters/validate.ts` 88, `feedback-validate.ts` 56) | `wc -l` [code] |
| CSS | `style.css` 358 lines plus 5 CSS Modules (workbench 441, report 199, auth 85, button 61, metrics 51) = 1,195 lines | `find src -name '*.css'` [code] |
| CI workflow | `quality.yml` 508 lines, 7 jobs (`workflows`, `secrets`, `static`, `database`, `container`, `browser`, `checks`) | [code] |
| CI duration, last 15 runs | 3.5-6 min, 12 success, 3 cancelled, 0 failure | [v1] (2026-10-24) |
| Image build, image scan, hadolint, dockle, image size | **not measured** (`buildx` missing on the audit host) | `audit/docker-build.log` |

## 2. Findings

Priority: **P0** blocks a gate or carries real risk; **P1** is a required capability that is missing; **P2** is polish or debt. Each finding names the roadmap item that closes it.

### P0

| ID | Finding | Evidence | Closed by |
|---|---|---|---|
| P0-1 | **Dashboard mobile performance is 60** (budget for backoffice: warn at 80; this plan gates at 85). Recharts ships 374 KB raw to `/` for a three-bar chart that duplicates the table under it; TBT 3,890 ms, LCP 3.6 s, TTI 7.0 s. Sign-in is 79 on mobile with 148 KiB of framework JS | Lighthouse summary; `charts.tsx` imports Recharts; [v1] baseline-audit "Chart choice" | PBO-M3-2 (lazy chunk), PBO-M5 (server SVG forms), budget gate PBO-M2-9 |
| P0-2 | **No single `check` command.** `package.json` has 17 scripts and the CI `static` job chains seven of them in YAML; AGENTS.md lists commands that no test ties to scripts (ecosystem 10.3) | `package.json`, `quality.yml` job `static` | PBO-M1-6 |
| P0-3 | **The integration jobs clone the sibling API repo at a pinned SHA (`e6b2e67`) and build its Postgres image**, in each of the `database`, `container` and `browser` jobs, plus the app image three times: 6 image builds per run, cross-repo source coupling, stale pin, custom lifecycle script (`ci-postgres.ts` 344 lines) | `quality.yml` lines for `Read the canonical PostgreSQL source`; `scripts/ci-postgres.ts` | PBO-M1-4, PBO-M1-5 |
| P0-4 | **Release publication is dead code.** `release.yml` job `publish` has `if: ${{ false }}` and exits 1; no SBOM, provenance or attestation; `package.json` is fixed at 1.0.0 and there is no CHANGELOG | `release.yml` | PBO-M1-8, PBO-M7 |
| P0-5 | **The audit trail is mutable and the CSP has no `script-src`.** The runtime role has `SELECT,INSERT,UPDATE,DELETE` on `backoffice_access_audit`; `proxy.ts` sends only `frame-ancestors 'none'; object-src 'none'; base-uri 'self'`, while `layout.tsx` injects an inline theme script. Only owner invitations, revocations and member removal are audited (no sign-in, denial, link, sign-out) | `migrations/runtime-grants.sql`, `src/proxy.ts`, `src/app/layout.tsx` [code]; [v1] | PBO-M3-3, PBO-M3-4 |

### P1

| ID | Finding | Evidence | Closed by |
|---|---|---|---|
| P1-1 | Dependabot is four independent entries (limits 3, 2, 2, 2) with partial groups, not the one weekly PR | `.github/dependabot.yml` | PBO-M1-2 |
| P1-2 | `dependency-policy.yml` runs on `pull_request_target` (default-branch sparse checkout only, so no PR-head execution, but it is a high-severity zizmor pattern and carries 669 lines of scripts and a 639-line test) | workflow, `scripts/dependency-*.ts` | PBO-M1-3 |
| P1-3 | CI is not dynamic: no `classify` job, no path map, same profile for docs and code; no zizmor, CodeQL, Scorecard, SBOM, osv, dependency-review | `quality.yml`, [v1] | PBO-M1-3 |
| P1-4 | No composition root: 16 `process.env` reads in 6 files; the `/access` page calls `getAuthRuntime().store.list()` (infrastructure) directly; application layer is thin (`readOperations` forwards a port call) | `grep`, `src/app/access/page.tsx` [code] | PBO-M4 |
| P1-5 | Readiness returns only `{status}`; the ecosystem contract requires `version` and `schema_version`; `<html lang="en">` is fixed; Spanish formatting mixes `es-AR` (dashboard, feedback, trace explorer, charts) and `es-419` (report) | `src/app/api/ready/route.ts`, `layout.tsx`, `grep es-AR` [code] | PBO-M3-6, PBO-M3-7 |
| P1-6 | No `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`; the whole page waits for a three-way `Promise.all` | `find src/app` [code] | PBO-M3-5, PBO-M5 |
| P1-7 | Test gaps: no component tests, no visual regression, no mutation, no iPhone or Pixel profiles, no per-role projects, `retries: 1` hides flakes with no flaky report, no diff coverage, a skipped integration test, `store.ts` and `runtime.ts` covered only by the database test | `playwright.config.ts`, `audit/unit-coverage.log`, `audit/test-auth.log` | PBO-M2 |
| P1-8 | Build depends on the network for fonts (`next/font/google`; the build log shows `Retrying 1/3`, `2/3` before compile [inference: font fetch]) | `src/app/fonts.ts`, `audit/build.log` | PBO-M3-8 |
| P1-9 | Tooling deviates from the ecosystem preset: Biome with tabs and 80 columns, no domain or import rules, no knip, no complexity ratchet, `typescript` and `@typescript/typescript6` alias kept (fine, matches the standard until TS 7.1) | `biome.json` | PBO-M1-9, PBO-M4 |
| P1-10 | Harness gaps: skills canonical under `.claude/skills` with `.agents/skills` symlinks (inverse of the standard), no `evals/`, no `metadata`, AGENTS.md carries a long prose contract | `.agents`, `.claude`, `AGENTS.md` | PBO-M1-10 |
| P1-11 | Docs and community: no CHANGELOG, CODEOWNERS, SUPPORT, CODE_OF_CONDUCT, feature issue form; ADRs under `docs/adrs/` with 3-digit numbers; `docs/` holds dated handoffs and 3.9 MB of old screenshots and recordings; README is long and defensive | tree [code] | PBO-M3-9 |
| P1-12 | UX: no application shell, inverted hierarchy (two near-empty hero cards above the data), chart plus table twin shown at once, no time axis in traces, IAM page unfinished (no avatar, provider, last access, sessions, audit view) | research 12 sec 1.1 (gallery images `02-availability.png`, `06-access.png`) | PBO-M5 |

### P2

| ID | Finding | Evidence | Closed by |
|---|---|---|---|
| P2-1 | Historical public-chat contract artifacts (`openapi.json`, `types.d.ts`, `sse.*`, `embed.v1.*`, `source.json`, `manifest.json`, 4,000+ lines) are not imported by any `src` file; the Dockerfile copies `types.d.ts` anyway | `grep contracts/ src`, Dockerfile [code] | PBO-M3-10 |
| P2-2 | The axe run covers 4 routes, EN only; `/privacy`, `/access/invitation`, ES, viewer role and error states are not in the measured run (the repo's own Playwright specs cover about 10 axe checks) | `audit/axe-results.json` | PBO-M2-5 |
| P2-3 | No dead-code or complexity measurement exists (knip, complexity) so D2 cannot be evidenced | - | PBO-M2-10 |
| P2-4 | `.env.example` and `docs/runtime-baseline.md` carry hand-written versions (volatile facts) | [code] | PBO-M4 |
| P2-5 | Lint info at `scripts/verify-postgres.ts:247` | `audit/lint.log` | deleted with the script |

## 3. Inventory

### Routes and flows

| Route | Purpose | Auth | Notes |
|---|---|---|---|
| `/` | Operations workbench plus embedded audience overview and feedback | member | `force-dynamic`, three parallel reads |
| `/analytics` | Product interaction report (calendar, filters, heatmap) | member | disabled by default (`PRODUCT_ANALYTICS_ENABLED=false`) |
| `/access` | Members, invitations, revoke | owner for mutations | Server Actions with CSRF and origin checks |
| `/access/invitation` | Invitation landing (token to cookie) | public | token in query string, see ADR 0015 |
| `/sign-in`, `/privacy` | Entry, policy | public | privacy bilingual |
| `/api/health`, `/api/ready` | Liveness, readiness | public | readiness lacks version |
| `/api/operations` | Authorised JSON read | member | |
| `/api/auth/[...all]` | Better Auth handler | public | rate limit 30 per 60 s |

### Components and modules

Presentation: `Dashboard` (331 lines), `trace-explorer`, `charts`, `report` (364 lines), `report-filters`, `report-chart`, `metrics`, `overview`, `feedback`, `preferences`, auth forms (`invite-form`, `link-account`, `revoke-control`, `sign-in`, `sign-out`), `Button`, `ButtonLink`, `SkipLink`. Domain/application: access rules, operations insights, feedback and report logic. Adapters: bounded HTTP readers, validators, Better Auth store (182 lines), browser session. Server: composition spread across `server/operations.ts`, `server/analytics.ts`, `server/auth/*`.

## 4. Could not be measured

| Item | Why | When |
|---|---|---|
| Image size, image CVEs (Grype), hadolint, dockle, structure test, read-only rootfs behaviour | `buildx` missing on the audit host | PBO-M1-7 on CI |
| Field Web Vitals, real device Safari | no production, no device | MV and monthly check |
| Live OAuth with Google and GitHub, effective proxy headers, backups of `portfolio_iam` | VPS not purchased | MV |
| Paired verification with the real API image and the production Postgres image | API repo owns it | nightly paired job (PBO-M2-12) |
| Mutation score, flaky rate, diff coverage, complexity, dead code | tools absent | PBO-M2 |
| WCAG 2.2 rules (target size, focus not obscured) | not asserted in the existing specs | PBO-M2-5 |
| Independent designer and recruiter evaluator scores | evaluator not yet run | PBO-M2 |
