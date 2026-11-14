# Progress log

Milestone log for the master refactor of `portfolio-backoffice`. The "In-flight tasks" section and the Current state are updated by the PR that merges each task; the Milestone log and the ecosystem table change only at milestones (safe points). A drift check compares the nine-row table below with the other repos. A milestone is reached only when `develop` is green on the full `release` CI profile, no refactor PR is left half-done, this file is updated, and the annotated tag `checkpoint/M<n>` is pushed on `develop`.

## Current state

| Field | Value |
|---|---|
| Milestone | **M1** Foundation: every task merged on `develop` (PBO-M1-11 partly: owner settings parked); exit verification and the `checkpoint/M1` tag belong to the orchestrator |
| Date | 2026-11-14 |
| `develop` SHA | `f39d2f2` (before this docs PR) |
| `main` SHA | `0df93abfdb9e63ebe74322533fd5cd148a41aa2a` (untouched until M7) |
| Next item | Owner settings in [`docs/reference/repository-settings.md`](../reference/repository-settings.md) (PVR, `ci-gate` required check and rulesets, CodeQL default setup); then **PBO-M2-1** (see [roadmap.md](roadmap.md)); Node 26 flip after two green weeks of `node-next` (about 2026-11-28) |
| Known issues | `/` mobile Lighthouse 60; Recharts 374 KB raw on `/`; audit mutable; CSP without `script-src`; PR wall-clock p50 8.9 min and p95 18.8 min over 6 runs during heavy shared-runner contention (compute critical path about 4.4 min; re-measure 10 uncontended runs against the 6/12 min budget); harden-runner's StepSecurity API occasionally times out and skips a job (gate fails closed; re-run failed jobs); scheduled workflows (vuln-daily, Scorecard, drift, guard schedule) and Dependabot read the default branch `main`, so they start at M7 unless `develop` becomes the default; dependency review will fail a PR that bumps the LGPL `@img/sharp-*` binaries until the owner decides; `file-index.csv` predates the M1 moves (skills canonical in `.agents/skills`, CI scripts deleted) |
| Owner inputs | 1. PBO-D16: enable GitHub private vulnerability reporting. 2. Apply the standard rulesets and switch the required check to `ci-gate` (then delete the `required-checks` alias). 3. CodeQL default setup. 4. Immutable releases and a protected `production` environment before the first release. 5. release-please GitHub App. 6. Default branch: keep `main` or switch to `develop`. 7. LGPL-3.0 allow-list decision for `@img/sharp-*`. 8. MV: VPS purchase and activation authorization. Commands: [`docs/reference/repository-settings.md`](../reference/repository-settings.md) |

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

## Scorecard snapshot (baseline, rubrics v2; prov. = planner estimate until the M2 evaluator run)

| Axis | Score | | Axis | Score | | Axis | Score |
|---|---|---|---|---|---|---|---|
| D1 Architecture | 72 prov. | | P1 Visual design | 68 prov. | | R1 First screen | 80 prov. |
| D2 Code quality | 78 prov. | | P2 Interaction | 72 prov. | | R2 Proof | 82 prov. |
| D3 Tests | 66 prov. | | P3 Accessibility | 84 prov. | | R3 Writing | 78 prov. |
| D4 CI/CD | 68 prov. | | P4 Responsive | 72 prov. | | R4 Credibility | 88 prov. |
| D5 Security | 62 prov. | | P5 Theme parity | 74 prov. | | R5 Calls to action | 70 prov. |
| D6 Performance | 55 prov. | | P6 Consistency | 70 prov. | | R6 Polish | 75 prov. |
| D7 Observability | 38 | | | | | R7 Differentiation | 70 prov. |
| D8 Docs and DX | 72 prov. | | | | | | |

Measured: unit 142/142; coverage lines 82.7, branches 88.3, functions 90.1; axe 0 violations on 24 page states; Lighthouse (n=1) `/` mobile 60, `/sign-in` mobile 79, a11y 100; `npm ci` 196 s; build 161 s. Evidence: [audit.md](audit.md).

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
