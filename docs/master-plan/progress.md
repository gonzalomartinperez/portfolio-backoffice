# Progress log

Milestone log for the master refactor of `portfolio-backoffice`. The "In-flight tasks" section and the Current state are updated by the PR that merges each task; the Milestone log and the ecosystem table change only at milestones (safe points). A drift check compares the nine-row table below with the other repos. A milestone is reached only when `develop` is green on the full `release` CI profile, no refactor PR is left half-done, this file is updated, and the annotated tag `checkpoint/M<n>` is pushed on `develop`.

## Current state

| Field | Value |
|---|---|
| Milestone | **M2** Quality net: every task merged on `develop` (PBO-M2-1 to PBO-M2-13); exit verification and the `checkpoint/M2` tag belong to the orchestrator |
| Date | 2026-11-14 |
| `develop` SHA | `dd5135d` (before this docs PR) |
| `main` SHA | `0df93abfdb9e63ebe74322533fd5cd148a41aa2a` (untouched until M7) |
| Next item | **M3** Phase A polish, first `todo` row in [roadmap.md](roadmap.md) (PBO-M3-1: remove the 7-8 knip findings). M3 Lighthouse gate from the PBO-M2-13 spike: keep `/` at least 90 and sign-in at least 95 (the M3 targets of 85 and 90 are already met on the runner), and server-render the overview chart to bring `/` script bytes under 170 KB. Node 26 flip after two green weeks of `node-next` (about 2026-11-28) |
| Known issues | Coverage floors (`quality/ratchets/coverage.json`, unit only: lines 45, branches 48) sit far under the 80 % target until the M3/M4 component and integration work. Mutation overall 74.73 % on the runner is under the 75 "low" mark (floor 72). Lighthouse TBT on the runner varies about 2x between runs on unchanged routes, so the gate uses a x1.5 + 50 ms margin. The skip link target `main#main` has no `tabindex="-1"` (M3). Full visual baselines are labelled pre-redesign and must be re-approved at M5. The full-run mutation, nightly flake detector and scorecard follow pushes to `develop` because scheduled workflows read the default branch `main` until M7 (or until `develop` becomes the default). Audit is still mutable and the CSP has no `script-src` nonce (M4). harden-runner's StepSecurity API occasionally times out (the gate fails closed; re-run failed jobs). `file-index.csv` predates the M1 moves |
| Owner inputs | 1. PBO-D16: enable GitHub private vulnerability reporting. 2. Apply the standard rulesets and switch the required check to `ci-gate` (then delete the `required-checks` alias). 3. CodeQL default setup. 4. Immutable releases and a protected `production` environment before the first release. 5. Default branch: keep `main` or switch to `develop` (decides when the scheduled nightly, weekly and mutation runs start). 6. MV: VPS purchase and activation authorization. Resolved since M1: release automation without a GitHub App (OD-78, #133); LGPL for the `@img/sharp-*` binaries (OD-80, #132). Commands: [`docs/reference/repository-settings.md`](../reference/repository-settings.md) |

## In-flight tasks

Updated on each task merge (the same PR that sets the roadmap row to `done (PR #, SHA)`). RESUME: `git log --oneline --grep 'PBO-M<n>-'`, `gh pr list --state all --search 'PBO-M<n>-'`, then the first `todo` row in [roadmap.md](roadmap.md).

| Task ID | Branch | PR | Status | Note |
|---|---|---|---|---|
| PBO-M1-1 | `chore/m1-standards-lock` | #129 | merged | engineering-standards v1.0.0 lock, shared templates, drift workflow |
| PBO-M1-2 | `chore/m1-dependabot-weekly` | #128 | merged | proven weekly group, deps-weekly-guard (PR-author check, not `github.actor`) |
| PBO-M1-3 | `ci/m1-ci-gate-classify` | #122 | merged | classify, `ci-profile.json`, `ci-gate` plus `Required checks` alias, shared security and docs jobs, vuln-daily, Scorecard |
| PBO-M1-4 | `chore/m1-testcontainers-postgres` | #118 | merged | Testcontainers PostgreSQL 18; no sibling-repo clone |
| PBO-M1-5 | `ci/m1-build-once` | #123 | merged | image tarball built once and shared |
| PBO-M1-6 | `chore/m1-check-command` | #119 | merged | `npm run check`, pre-commit hook, AGENTS commands test |
| PBO-M1-7 | `ci/m1-container-dockerfile`, `ci/m1-image-gates`, `ci/m1-node26-matrix` | #124, #125, #127 | merged | canonical Dockerfile and hadolint; structure test, dockle, Grype, SBOM; informational Node 26 job |
| PBO-M1-8 | `ci/m1-release` | #126 | merged | verify, attest, gated publish; release-please config |
| PBO-M1-9 | `chore/m1-biome-preset` | #121 (and #117) | merged | Biome 2.6.7 preset and one mechanical reformat |
| PBO-M1-10 | `chore/m1-skills-canonical` | #120 | merged | canonical `.agents/skills`, metadata, evals, short AGENTS.md |
| PBO-M1-11 | `docs/m1-repository-settings` | #130 | merged, owner steps parked | runbook and CODEOWNERS |
| PBO-M2-1 | `test/m2-vitest-port`, `test/m2-diff-coverage` | #134, #135 | merged | Vitest 5 (unit, integration), coverage floors in `quality/ratchets/coverage.json`, diff coverage gate |
| PBO-M2-2 | `test/m2-component-project` | #140 | merged | Browser Mode component project (Chromium, WebKit), `/__kit` (404 in the image) |
| PBO-M2-3 | `test/m2-playwright-journeys` | #141 | merged | eight journey files, per-role and device projects, blob reports kept on the runner, untagged tests fail |
| PBO-M2-4 | `test/m2-visual-baseline` | #147 | merged | 54 pre-redesign baselines in the pinned Playwright image, run first in the browser job |
| PBO-M2-5 | `test/m2-axe-matrix` | #148 | merged | axe WCAG 2.2 AA on every state x theme x locale (0 violations), keyboard and reflow |
| PBO-M2-6 | `test/m2-security-matrix` | #142 | merged | authz matrix (fails both ways), headers, DTO leak, log redaction, better-auth advisories |
| PBO-M2-7 | `test/m2-mutation` | #146 | merged | Stryker incremental on PRs, full scoped run (runner: 74.73 / permission 98.94 in about 3 min) |
| PBO-M2-8 | `test/m2-flake-detector` | #136 | merged | nightly `--repeat-each=5`, flaky report, `tests/quarantine.json` |
| PBO-M2-9 | `test/m2-budgets` | #143 | merged | Lighthouse 13 median of 5 and script bytes, enforced on the runner baseline |
| PBO-M2-10 | `test/m2-static-quality` | #138 | merged | knip, complexity and token ratchets, fast-check properties |
| PBO-M2-11 | `test/m2-scorecard`, `docs/m2-progress` | #144, this PR | merged | `scripts/scorecard/run.ts`, nightly job; first evaluator run ([record](evaluator-run-2026-11-14.md)) |
| PBO-M2-12 | `test/m2-contract-consumer` | #137 | merged | nightly contract consumer check, paired-API stub until the digest exists |
| PBO-M2-13 | `spike/m2-lighthouse` | #145 (closed, spike) | done | result in the scorecard notes below |
| PBO-M3-1 | `chore/m3-knip-findings` | #150 | merged | knip findings and lint info removed |
| PBO-M3-6 | `feat/m3-ready-version` | this PR | merged | health and readiness report `version` (`APP_VERSION`) and `revision` (`APP_REVISION`); readiness adds `schema_version`, pinned to the latest migration by a unit test |

## Scorecard snapshot (rubrics v2; P and R from the first independent evaluator run, D still planner estimates until the nightly scorecard covers them)

| Axis | Score | | Axis | Score | | Axis | Score |
|---|---|---|---|---|---|---|---|
| D1 Architecture | 72 prov. | | P1 Visual design | 72 | | R1 First screen | 78 |
| D2 Code quality | 78 prov. | | P2 Interaction | 70 | | R2 Proof | 62 |
| D3 Tests | 66 prov. | | P3 Accessibility | 88 | | R3 Writing | 74 |
| D4 CI/CD | 68 prov. | | P4 Responsive | 72 | | R4 Credibility | 88 |
| D5 Security | 62 prov. | | P5 Theme parity | 86 | | R5 Calls to action | 50 |
| D6 Performance | 55 prov. | | P6 Consistency | 62 | | R6 Polish | 82 |
| D7 Observability | 38 | | | | | R7 Differentiation | 72 |
| D8 Docs and DX | 72 prov. | | | | | | |

The evaluator scores are in `quality/ratchets/scorecard.json`, with the method, evidence and named gaps in [evaluator-run-2026-11-14.md](evaluator-run-2026-11-14.md). The nightly `scorecard` job reports them with the automatic readings.

Measured at M2 (2026-11-14):
- **Unit tests:** 239 in 44 files (from 142). Unit coverage: lines 56.6, branches 52.1, functions 51.8. Floors are recorded per source file, loaded or not; the pre-port 88.3 is not comparable.
- **Mutation:** 1,591 mutants, overall 74.73 %, permission module 98.94 % (runner, about 3 min).
- **Accessibility:** axe WCAG 2.2 AA reports 0 violations on every route state x theme x locale in Chromium and WebKit.
- **Lighthouse on the CI runner** (median of 5, mobile):

  | Route | Performance | TBT | Script bytes |
  |---|---|---|---|
  | `/` | 90 | 304 ms | 266,569 |
  | `/analytics` | 90 | | |
  | `/access` | 96 | | |
  | `/sign-in` | 98 | | 150,923 |
  | `/privacy` | 96 | | |

  Accessibility and best practices are 100 on every route. The audit's `/` mobile 60 came from a loaded workstation.
- **Visual:** 54 baselines.
- **Browser job:** about 6 min including the visual step and the accessibility matrix. Budgets job about 4 min.

**PBO-M2-13 spike** (#145, CI runner, median of 5): server-rendering the overview chart instead of the Recharts island moved `/` from performance 90 to 97, TBT from 304 to 69 ms and script bytes from 266,569 to 155,154 (-111 KB). The M3 targets (`/` 85, sign-in 90) are reachable, and are already met with Recharts on the runner profile. Server-rendering the overview chart also meets the 170 KB script budget on `/`. The M3 gate is set from this (Next item).

## Ecosystem status (nine repos, copied from the tracker; update only at milestones)

| Repo | Milestone reached | Date | `develop` SHA (`main` SHA for main-only repos) | Resume pointer |
|---|---|---|---|---|
| portfolio | planning (M0 pending) | 2026-11-09 | `0a1ff56` (`origin/develop`) | `docs/master-plan/RESUME.md` |
| portfolio-assistant-api | planning (M0 pending) | 2026-11-09 | `e749ca7` (`origin/develop`) | `docs/master-plan/RESUME.md` |
| portfolio-backoffice | planning (M0 pending) | 2026-11-09 | `e356b13` (`origin/develop`) | `docs/master-plan/RESUME.md` |
| pequeverso | planning (M0 pending) | 2026-11-09 | `cbf519c` (`origin/develop`) | `docs/master-plan/RESUME.md` |
| pequeverso-assistant-api | planning (M0 pending) | 2026-11-09 | `6912579` (`origin/develop`) | `docs/master-plan/RESUME.md` |
| pequeverso-backoffice | planning (M0 pending) | 2026-11-09 | `4d4fb96` (`origin/develop`) | `docs/master-plan/RESUME.md` |
| vps-ops | planning (M0 pending) | 2026-11-09 | `f52c3e6` (`origin/main`) | `docs/master-plan/RESUME.md` |
| pequeverso-marketing | planning (M0 pending) | 2026-11-09 | `7d26bf4` (`origin/main`) | `docs/master-plan/RESUME.md` |
| dropshipping-ops | planning (M0 pending) | 2026-11-09 | `8ff0283` (`origin/main`) | `docs/master-plan/RESUME.md` |

The ecosystem tracker (`engineering-standards/progress/ecosystem.md`, or `vps-ops` until that repo exists) is the source; SHAs are `git rev-parse origin/<branch>` after `git fetch -q` on 2026-11-09 (`main` for the main-only repos `vps-ops`, `pequeverso-marketing`, `dropshipping-ops`, OD-12).

## Milestone log

| Milestone | Date | `develop` SHA | Scorecard snapshot | What changed | Next item | Known issues | Pending decisions |
|---|---|---|---|---|---|---|---|
| M0 | 2026-11-09 (baseline recorded; closes on merge of the plan PR) | `e356b13` | baseline above | Audit measured; plan v2 written; v1 replaced in place | PBO-M1-1 | see Current state | see Current state |
