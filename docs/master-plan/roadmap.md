# Roadmap

Ordered checklists per ecosystem milestone (M0-M8 and MV, MV-R inside M6, ecosystem section 3A). Planning only: nothing starts without the owner's decision per milestone. Every item is a task branch to `develop` with a green `ci-gate`; `main` changes only at M7 (no hotfix before M7; OD-11, DR-01). Item IDs are `PBO-M<n>-<k>`; the same IDs appear in [audit.md](audit.md) as the closer of each finding.

Effort: S under 4 agent-hours, M 4-16, L over 16, with an hour estimate of **agent work** (author plus reviewers, tests, CI waits). Agents work in parallel in worktrees (one task per branch; Codex for bounded mechanical items under the delegation policy, always reviewed). Calendar time is shorter than the sum.

| Milestone | Phase | Effort (agent hours) | Safe-point tag | Depends on |
|---|---|---|---|---|
| M0 Plans merged | - | S, 2 | `checkpoint/M0` | none |
| M1 Foundation | A (CI, harness) | L, 42 | `checkpoint/M1` | `engineering-standards` (E1) or local copies |
| M2 Quality net | A | L, 58 | `checkpoint/M2` | M1 |
| M3 Phase A polish | A | L, 29 | `checkpoint/M3` | M2 |
| M4 Architecture and TypeScript | B | L, 66 | `checkpoint/M4` | M3; API snapshot unchanged |
| M5 Master design | C | L, 90 | `checkpoint/M5` | M4; kit contract with `pequeverso-backoffice` |
| M6 Excellence verified | C | L, 33 | `checkpoint/M6` | M5 |
| M7 Release to main | - | M, 8 | tag `v2.0.0` | all nine repos at M6; owner OK |
| M8 GitHub profile showcase (ecosystem) | - | - | - | all repos at M7 |
| MV VPS activation | V | L, 24 (gated) | `checkpoint/MV` | VPS purchase and owner authorization |

Total 352 agent hours (328 without the gated MV), equal to the sum of the task rows below. **Critical path**: M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7 in strict order (each milestone depends on the previous safe point); with 3-4 parallel agents it is about 3-4 weeks of calendar time, dominated by M4 (66 h) and M5 (90 h; M5 views parallelize per route once the shell lands). The flake detector (PBO-M2-8) starts in the first week of M2 so that the 14-day observed window required by M6 has elapsed before M6 closes; the strict 30-day proof is the M7 entry gate.

**Task status and resume.** Every task row has a stable ID and a Status of `todo`, `in-progress` or `done (PR #, SHA)`; the PR that finishes a task sets its row and the "In-flight tasks" section of [progress.md](progress.md). Find the true next task mid-milestone with `git log --oneline --grep 'PBO-M<n>-'`, `gh pr list --state all --search 'PBO-M<n>-'` and then the first `todo` row of the current milestone.

## M0 Plans merged (S, 2 h)

| ID | Task | Effort | Status |
|---|---|---|---|
| PBO-M0-1 | Task branch `docs/master-plan-v2`: replace `docs/master-plan/` with this folder, delete the v1 files per `file-moves.md`. PR to `develop`. | S, 1 h | todo |
| PBO-M0-2 | Run `docs:check` (links) and `security:check`; fix links broken by moved v1 paths in `README.md` (the v1 plan table). | S, 0.5 h | todo |
| PBO-M0-3 | `progress.md` already initialized (2026-11-09, SHA `e356b13`); update the develop SHA to the merge commit and push tag `checkpoint/M0`. | S, 0.5 h | todo |

- **Acceptance**: plan on `develop`; `ci-gate` (still `Required checks` in the old workflow) green; delegated resolutions and owner inputs recorded (README "Decision resolutions and owner inputs").
- **Risks**: none beyond link breaks. **Cross-repo**: the ecosystem tracker records the M0 row.

## M1 Foundation (L, 42 h)

| ID | Task | Effort | Status |
|---|---|---|---|
| PBO-M1-1 | `standards.lock` (ecosystem version, SHA-256 of `ecosystem.md` and `rubrics.md`, workflow pins) and the drift check; copy shared templates (`SECURITY.md`, PR and issue templates, `.hadolint.yaml`, `.gitleaks.toml`) from `engineering-standards`. | S, 2 h | todo |
| PBO-M1-2 | Dependabot: replace the four entries by the multi-ecosystem weekly group (`ci-cd.md` section 8); sandbox proof of the four unverified behaviours (E2) on a throwaway repo before rollout; add `deps-weekly-guard`; disable security-update PRs in settings (script in PBO-M1-11; owner-only steps listed in RESUME section 5). | M, 5 h | todo |
| PBO-M1-3 | `ci.yml` with `classify`, `ci-profile.json` and its coverage test, `ci-gate`; delete `dependency-policy.yml`, `scripts/dependency-automation.ts`, `dependency-policy.ts` and their tests; add zizmor, actionlint, gitleaks, dependency-review, osv-scanner (daily), CodeQL default setup, Scorecard weekly; harden permissions and harden-runner. | M, 8 h | todo |
| PBO-M1-4 | Testcontainers Postgres 18 (digest pinned) for integration tests; delete the sibling-API clone, `ci-postgres.ts`, `postgres-readiness.ts`, `postgres-image-security.ts`, `verify-postgres.ts` and their tests; the third integration test no longer skips (runtime-role test runs against the container with `migrations/` roles). | M, 5 h | todo |
| PBO-M1-5 | Build once: `build` job produces the image tarball artifact; `container` and `e2e` jobs consume it; remove `ci-build-provenance.ts` (per PBO-D9, resolved by delegation; fallback: cached rebuilds). | M, 4 h | todo |
| PBO-M1-6 | `npm run check` (static job equals hook equals AGENTS.md command), `.githooks/pre-commit`, test that backticked commands in AGENTS.md exist in `package.json`. | S, 2 h | todo |
| PBO-M1-7 | Containers: canonical Dockerfile (`NODE_IMAGE` ARG, labels, version stamp), hadolint, dockle, container-structure-test, Grype, SBOM; two-week CI matrix on Node 24 and 26 (E10). | M, 5 h | todo |
| PBO-M1-8 | Release: delete the dead `publish` job; `release.yml` = verify, build, attest, gated publish; release-please manifest config on `develop` (sandbox validation E5), `CHANGELOG.md`, immutable releases and tag ruleset (settings applied by script in PBO-M1-11; the only owner click is in RESUME section 5). | M, 4 h | todo |
| PBO-M1-9 | Biome preset (2 spaces, 100 columns, domains, import rules, class sorting) with one mechanical reformat commit and `.git-blame-ignore-revs`. | S, 2 h | todo |
| PBO-M1-10 | Skills: flip to canonical `.agents/skills` with symlinks, metadata, `evals/` skeleton, shortened AGENTS.md. | S, 3 h | todo |
| PBO-M1-11 | Apply rulesets by script (owner approves tokens and scopes), enable private vulnerability reporting (PBO-D16), add community files and templates. | S, 2 h | todo |

- **Acceptance**: every PR runs the shared CI v1 green; one weekly Dependabot PR observed or simulated; image builds once with SBOM and provenance on the tarball; `ci-gate` is the only required check; PR p50 at most 6 min and p95 at most 12 min over 10 runs; zizmor 0 high findings; no `pull_request_target` in the repo; no checkout of another repo in any workflow; `checkpoint/M1` tag.
- **Risks**: reusable workflows depend on E1 (mitigation: write them locally, lift unchanged); Dependabot group behaviour (supersede flow fallback); the rulesets rename `Required checks` to `ci-gate` (change both in one owner-supervised step so merges are not blocked); Node 26 gaps (stay on 24).
- **Cross-repo**: `engineering-standards` workflows and templates; `portfolio-assistant-api` is informed that the Postgres clone is gone (the API may delete its `verify_project_databases` coupling later).

## M2 Quality net (L, 58 h)

| ID | Task | Effort | Status |
|---|---|---|---|
| PBO-M2-1 | After the cross-repo runner spike (DR-09), port the 28 unit files from `node:test` to the chosen runner (Vitest 4 preferred; mechanical, Codex-delegable, same paths); coverage thresholds from the baseline (branch 88.28 on `src/`, scripts reported apart); `quality/ratchets/coverage.json`. | M, 6 h | todo |
| PBO-M2-2 | Component project (Vitest Browser Mode, Chromium and WebKit) with `Button` as the first subject; `/__kit` route skeleton behind the dev and test guard. | M, 4 h | todo |
| PBO-M2-3 | Playwright: split `backoffice.spec.ts` by journey; per-role projects (anonymous, viewer, owner); iPhone 15 and Pixel 7 profiles; blob reports; `failOnFlakyTests` on `main`. | M, 6 h | todo |
| PBO-M2-4 | Visual regression of the **current** UI in the pinned Playwright container as the safety net for M3-M4 (key routes x 2 themes x 3 viewports, EN and ES); labelled pre-redesign, re-approved at M5. | M, 5 h | todo |
| PBO-M2-5 | axe `wcag22aa` on every route x theme x locale x role x key state (adds `/privacy`, `/access/invitation`, ES, viewer, error states missing from the audit); keyboard and reflow tests. | M, 5 h | todo |
| PBO-M2-6 | Security: authz matrix test enumerating mutating routes and Server Actions, header snapshots, DTO leak test, log-redaction test skeleton, better-auth advisory regression tests. | M, 6 h | todo |
| PBO-M2-7 | Stryker config (spike E7 first, 1-2 days of wall time, 3 h of agent work), incremental on PR, thresholds high 85, low 75, break 70, permissions 85. | M, 4 h | todo |
| PBO-M2-8 | Flake detector (`--repeat-each=5`) nightly, **started in the first week of M2, before the runner port in PBO-M2-1 completes**, flaky report, `tests/quarantine.json`. | S, 2 h | todo |
| PBO-M2-9 | Budget gates enforced from day one on the **ratchet baseline** (per-route first-load JS and Lighthouse median of 5 equal the measured values, tightening at M3 and M5), `check-bundle.ts`, Lighthouse CI. No gate runs in warn-only mode longer than 14 days. | M, 4 h | todo |
| PBO-M2-10 | knip, complexity ratchet, `check-tokens.ts` on the **current** tokens (records the baseline contrast), property tests (fast-check) for permission lattice, validators and pagination. | M, 5 h | todo |
| PBO-M2-11 | `scripts/scorecard/run.ts`, `quality/ratchets/*.json`, nightly workflow; **first independent evaluator run** on lens 2 and 3 (screenshots, rubric only) replacing the provisional baselines. | M, 6 h | todo |
| PBO-M2-12 | Nightly paired job against the API's published Postgres digest when it exists (stub until then) and the contract consumer compile job. | S, 2 h | todo |
| PBO-M2-13 | Lighthouse spike (one day of wall time): 5-run median on `/` and sign-in with the Recharts chunk lazy-loaded and the chart replaced by a server-rendered bar, on the CI runner profile; records whether the M3 target (`/` mobile 85, sign-in 90) is reachable and sets the M3 gate from the result. | S, 3 h | todo |

- **Acceptance**: `scorecard.json` produced nightly; every gate enforcing (no warn-only older than 14 days); visual baseline committed; unit still 142 passing tests (ported), integration and component projects green; flaky report shows 0 flaky for 7 days; PBO-M2-13 spike result recorded in `progress.md` (detector running since the first week of M2); golden-set item N/A (no assistant here); `checkpoint/M2`.
- **Risks**: Stryker with Vitest 4 and TS 7 (fallback tap-runner); visual flakiness from fonts and OS (pinned container, fonts local at M3, animations off); evaluator scores lower than provisional (the point of the run).
- **Cross-repo**: API Postgres digest publication; none blocking.

## M3 Phase A polish (L, 29 h)

All P0 and P1 findings that do not need the new architecture.

| ID | Task | Effort | Status |
|---|---|---|---|
| PBO-M3-1 | Fix the lint info and any new findings from the M2 tools; delete the dead exports and files that knip reports. | S, 1 h | todo |
| PBO-M3-2 | Performance: load Recharts through a lazy client wrapper (dynamic import, after intersection) so `/` ships no chart chunk; drop the redundant chart (the table already carries the data) in favour of a minimal server-rendered bar until M5. | M, 5 h | todo |
| PBO-M3-3 | Audit trail: migration `0002` (runtime role `INSERT, SELECT` only; `request_id`, `actor_hash`), record sign-in, admission, denial, link, sign-out; integration test that the runtime role cannot `UPDATE` or `DELETE`. | M, 4 h | todo |
| PBO-M3-4 | CSP with per-request nonce, HSTS, theme cookie rendered server-side, delete the inline theme script; header snapshot updated; invitation token transport decision recorded (ADR 0015). | M, 4 h | todo |
| PBO-M3-5 | `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`; per-section `<Suspense>`. | S, 2 h | todo |
| PBO-M3-6 | Readiness returns `version` and `schema_version`; liveness returns `version`; contract test. | S, 1 h | todo |
| PBO-M3-7 | `<html lang>` from cookie; one locale `es-419`; `Intl` with explicit `timeZone: "UTC"`; grep test forbids `es-AR`. | S, 2 h | todo |
| PBO-M3-8 | Self-hosted fonts through `next/font/local` (removes build-time network fetch); update licences. | S, 1 h | todo |
| PBO-M3-9 | Docs: README per template, Diataxis moves, ADR move to `docs/decisions/`, archive `docs/verification/`, delete dated handoffs, CHANGELOG, SUPPORT, CODE_OF_CONDUCT, CODEOWNERS. | M, 4 h | todo |
| PBO-M3-10 | Delete the historical public-chat contract artifacts and the `COPY contracts/types.d.ts` line; contracts move to `contracts/assistant-api/` with SHA-256 manifest. | S, 2 h | todo |
| PBO-M3-11 | Open the API ticket for a historical operations contract (PBO-D17). | S, 1 h | todo |
| PBO-M3-12 | Re-score (first scorecard since M2) and tighten ratchets. | S, 2 h | todo |

- **Acceptance**: P0-1..P0-5 and P1-1..P1-11 closed with evidence; `/` mobile Lighthouse median at least 85 and first-load JS at most 170 KB gz excluding the lazy chunk; sign-in mobile at least 90; strict CSP with no console violations; audit append-only proven by integration test; ratchets updated downward; no regression versus M2 (`scorecard.json` diff); PBO-M3-9: `docs:check` green, README generated from the template with 0 `readme-template` check findings, 0 dated handoff files, ADRs under `docs/decisions/`; PBO-M3-11: the API ticket URL is recorded in `progress.md` and linked from README PBO-D17; Lighthouse gates (`/` mobile median at least 0.85, sign-in mobile at least 0.90) enforce from M3; `checkpoint/M3`.
- **Risks**: nonce CSP with Next requires dynamic rendering (all authenticated pages already are); Recharts lazy loading shifts layout (reserve height, CLS at most 0.05); migration `0002` needs a coordinated grant on the shared Postgres (vps-ops, MV only; locally in tests).
- **Cross-repo**: API ticket (PBO-D17).

## M4 Architecture and TypeScript (L, 66 h)

| ID | Task | Effort | Status |
|---|---|---|---|
| PBO-M4-1 | `server/env.ts` (typed, fail at boot) and `server/container.ts`; G1 and G2 on; `process.env` reads drop from 16 to 1 file. | M, 6 h | todo |
| PBO-M4-2 | DAL (`session.ts`, `authorize.ts`, per-view loaders) and action pipeline; G9 test. | M, 8 h | todo |
| PBO-M4-3 | Use cases per feature, in this order: auth (`inviteViewer`, `revokeAccess`, `listAccess`), operations (`getOverview`, `listRuns`, `getRun`, `getUsage`), analytics, feedback (split out of operations); `Metric<T>` in domain. Worktree per feature; Codex may take mechanical moves. | M, 14 h | todo |
| PBO-M4-4 | Ajv validators replace the four hand validators one contract at a time against the example corpus; privacy invariant property test; cold-start budget under 50 ms. | M, 8 h | todo |
| PBO-M4-5 | Store split (membership, invitation, session, audit), audit feature, `scripts/migrate.ts` with `schema_migrations` and advisory lock, migrations 0001-0003 renamed and tested from empty and from N-1. | M, 8 h | todo |
| PBO-M4-6 | Guards G3-G10 with negative fixtures (G10 token lint starts in report mode only for code not yet migrated, ratcheted to zero by M5); subpath imports; tsconfig extends the standards base with `noImplicitOverride`. | M, 5 h | todo |
| PBO-M4-7 | Tailwind 4 install (spike S1 for `.postcssrc.json`), Style Dictionary pipeline (spike S3), `structure` and `pack-instrument` tokens at **parity values** first so the visual baseline stays unchanged, `cn()`, CVA `Button`, `Field`, `Dialog`; migrate sign-in, privacy and the access forms; `css-modules.json` ratchet starts at 5 files. | M, 10 h | todo |
| PBO-M4-8 | Node 26 flip if the two-week matrix is green (E10, PBO-D15); `.nvmrc`, `engines`, Dockerfile ARG, `@types/node`. | S, 2 h | todo |
| PBO-M4-9 | TSDoc on use cases, DAL and shared primitives; ADRs 0008-0012, 0014-0017 written. | M, 5 h | todo |

- **Acceptance**: guards G1-G10 enforce with an empty baseline and negative fixtures green; 0 type errors; domain and application 100% lines and mutation at least 80% (permissions 85); integration runtime role cannot touch audit; contracts validated by Ajv with the invalid corpus rejected; `process.env` only in `env.ts`; visual diff versus the M2 baseline is 0 outside migrated forms; PBO-M4-9: `docs:check` green, ADR files 0008-0012 and 0014-0017 exist and are linked from README, TSDoc present on every exported use case, DAL function and shared primitive (checked by a lint rule); `checkpoint/M4`.
- **Risks**: refactor breaks auth guarantees (strangler per feature behind the RBAC matrix and E2E from M2); Ajv `new Function` under strict server CSP is not an issue (Node server side) but is verified; Tailwind preflight shifts native element styling (visual baseline catches it); TS 7 and Stryker alias.
- **Cross-repo**: API snapshots unchanged; agreement with `pequeverso-backoffice` on the kit contract (token names, component API) before M5.

## M5 Master design (L, 90 h)

Order inside M5 follows research 12: shell first, then the worst-looking page.

| ID | Task | Effort | Status |
|---|---|---|---|
| PBO-M5-1 | Kit sync from `engineering-standards/design-kit` (`kit.lock.json`, `check-kit`) and finalize `pack-instrument` with the computed palette; `check-tokens` asserts contrast, CVD distance and no literals; `design-playbook.md` values become the snapshot. | M, 6 h | todo |
| PBO-M5-2 | AppShell: StatusStrip, Sidebar (rail, `[`), Topbar, breadcrumbs, RangePicker as window label, CommandPalette, UserMenu (theme, density, language), cookies for preferences, skip link, drawer on tablet and phone. | M, 14 h | todo |
| PBO-M5-3 | Primitives and composites of the inventory with all states in `/__kit`; component and visual tests. | M, 16 h | todo |
| PBO-M5-4 | Data-viz forms (ProportionBar, BulletBar, Sparkline, Heatmap, Waterfall, HBarList as server SVG; ChartFrame; lazy Recharts line and column). | M, 12 h | todo |
| PBO-M5-5 | Access and Audit views, sessions, linked accounts, invitation rows (first, worst-looking). | M, 7 h | todo |
| PBO-M5-6 | Overview with Suspense per section and Needs attention. | M, 6 h | todo |
| PBO-M5-7 | Runs and Run detail (DataTable, peek sheet, waterfall, trace rail). | M, 9 h | todo |
| PBO-M5-8 | Usage, Audience, Feedback, Account. | M, 8 h | todo |
| PBO-M5-9 | Identity: monogram and `icon.tsx`, constellation SVGs, registration ticks, unit chips, ticker hairline, empty and error copy in EN and es-419. | M, 5 h | todo |
| PBO-M5-10 | Delete the last CSS Modules and old presentation files; `css-modules.json` reaches 0; regenerate README gallery (light and dark `<picture>` pairs). | S, 2 h | todo |
| PBO-M5-11 | Re-approve visual baselines (2 themes x 3 viewports x states x EN/ES), final budgets (first-load JS at most 170 KB gz, mobile perf stays at least 0.85, already enforced since M3), evaluator run. | M, 5 h | todo |

- **Acceptance**: visual baselines approved in both themes; axe 0 on every route x theme x locale x role; every view passes its acceptance in `design-playbook.md`; designer and recruiter evaluator at least 95 per axis or a documented gap list; Lighthouse and bundle budgets green; no zero shown for unavailable data (lint test); reduced-motion test green; `checkpoint/M5`.
- **Risks**: rebuild scope (route by route, domain untouched, M2 tests as safety net); over-unifying with the sibling (logo-removed review); native `popover` and anchor positioning gaps (spike S5, owned positioner fallback); evaluator subjectivity (fixed rubric, screenshots only).
- **Cross-repo**: `pequeverso-backoffice` consumes the same kit; `portfolio` site shares the blue primitives through `engineering-standards` (hash check) so both products stay one family.

## M6 Excellence verified (L, 33 h)

| ID | Task | Effort | Status |
|---|---|---|---|
| PBO-M6-1 | Close remaining gaps from the M5 gap list; mutation scores at target (permissions 85, rest 75); diff coverage gates on. | M, 8 h | todo |
| PBO-M6-2 | Manual passes: VoiceOver Safari and NVDA Firefox per template, 400% zoom, forced colors, real iPhone Safari smoke; record in `docs/verification/`. | M, 4 h | todo |
| PBO-M6-3 | Skills final (evals pass, precision and recall recorded), `docs/reference/security-controls.md` (ASVS 5.0 L2 map to tests), threat model for auth surfaces, README Quality block generated. | M, 6 h | todo |
| PBO-M6-4 | Recharts revisit spike (own SVG at most 8 KB gz?) and decide (ADR addendum). | S, 3 h | todo |
| PBO-M6-5 | Independent three-lens re-score; two consecutive nightly scorecards at target. | S, 3 h | todo |
| PBO-M6-6 | MV-R (OD-64): release-candidate image built by the `release` profile with SBOM and provenance and a verified digest kept as a CI artifact (no registry push, DR-13); `vps-ops` registry entry, Coolify config as code, secrets inventory (names only), health and readiness and migration-gate contract verified; participates in the full-stack rehearsal on a disposable Ubuntu 26.04 VM (health, proxy, migrations, restore drill, rollback). | M, 6 h | todo |
| PBO-M6-7 | OD-09 copy refresh: README, repo description and topics, UX copy EN and es-419 and in-app text refreshed to the final state with verified facts only. | S, 3 h | todo |

- **Acceptance**: MV-R rehearsal green for this repo (OD-64); every axis at least 95 (D7 at least 90, explicit floor until MV; D7 reaches 95 only at MV) on two consecutive nightly scorecards; 0 flaky over the observed window of at least 14 days (detector running since the first week of M2; the strict 30-day proof is the M7 entry gate); ratchets at final values; `checkpoint/M6`.
- **Risks**: the strict 30-day flake window may not elapse before M6; M6 therefore requires an observed window of at least 14 days (recorded with its dates), and the 30-day proof moves to the M7 entry gate.

## M7 Release to main (M, 8 h)

**Entry gate**: 0 flaky over 30 days on required checks (strict rubric D3 proof, flake report since PBO-M2-8); if the window has not elapsed, M7 waits and D3 stays below 95 until it does.

**Calendar floor**: the two-week Node 24/26 matrix plus the 30-day flake proof mean M7 cannot start before about 30 days after M1 starts, whatever the agent-hours.

| ID | Task | Effort | Status |
|---|---|---|---|
| PBO-M7-1 | Release PR from release-please (`2.0.0`) merged by the owner; `develop` to `main` promotion PR with the `release` profile (merge commit); contract-safe order across repos: APIs, backoffices, sites, vps-ops pins. | M, 4 h | todo |
| PBO-M7-2 | Tag, immutable GitHub Release with SBOM and provenance assets; automatic back-merge PR `main` to `develop`. | S, 2 h | todo |
| PBO-M7-3 | Registry push stays disabled until MV (DR-13): attest the release-candidate image kept as a CI artifact and open the `releases/production.lock` PR in `vps-ops` (digest, version, attestation URL); the owner activates the push in one step at MV. | S, 2 h | todo |

- **Acceptance**: `main` equals the released `develop`; CHANGELOG and tag `v2.0.0` published; post-release checks (build-info and health) not applicable until MV; owner approval recorded.
- **Risks**: route changes break bookmarks (keep `/analytics` and `/access`; none public); ordering with the API contract (the API releases first).
- **Cross-repo**: all nine repos at M6; `vps-ops` lock PR.

## M8 (ecosystem): GitHub profile showcase

Not a repository milestone here; after every repo is at M7 this repo contributes its README, gallery captures, topics and description (PBO-M6-7) as a showcase reference for the redesigned GitHub profile (OD-08), using only verified facts.

## MV VPS activation (L, 24 h, gated)

Entry: VPS purchased and provisioned by `vps-ops`; separate owner authorization for deployment and for each spend.

| ID | Task | Effort | Status |
|---|---|---|---|
| PBO-MV-1 | Deploy by digest through `vps-ops` (attestation verified, migration job gated by a fresh backup marker, health and readiness, `stop_grace_period`). | M, 6 h | todo |
| PBO-MV-2 | Live OAuth with Google and GitHub, effective proxy headers (CSP, HSTS), `x-request-id` through Coolify's proxy, `portfolio_iam` backups and a restore drill with the restore smoke query. | M, 6 h | todo |
| PBO-MV-3 | OTel exporter to the `vps-ops` collector, structured logs shipped, SLOs and alerts (availability 99.5% monthly, readiness freshness), Uptime Kuma probes, scheduled Playwright smoke. | M, 6 h | todo |
| PBO-MV-4 | Pairing with the production API image and Postgres image (the paired job runs for real); evidence recorded as production evidence, separate from synthetic and fixture evidence. | M, 6 h | todo |

- **Acceptance**: rollback to the previous digest rehearsed; restore drill passed; SLO dashboards live; D7 at least 95; `checkpoint/MV`.
- **Risks**: Coolify advisories (compensating controls in ecosystem 2.3); shared Postgres grants (`0002` applied by cluster provisioning, not at startup).
