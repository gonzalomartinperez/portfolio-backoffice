# Progress log

Milestone log for the master refactor of `portfolio-backoffice`. The "In-flight tasks" section and the Current state are updated by the PR that merges each task; the Milestone log and the ecosystem table change only at milestones (safe points). A drift check compares the nine-row table below with the other repos. A milestone is reached only when `develop` is green on the full `release` CI profile, no refactor PR is left half-done, this file is updated, and the annotated tag `checkpoint/M<n>` is pushed on `develop`.

## Current state

| Field | Value |
|---|---|
| Milestone | **M0** Plans merged (this file starts the log) |
| Date | 2026-11-09 |
| `develop` SHA at baseline | `e356b13d81d509e640b3b318c0d37c7b4abcce1c` (update to the plan merge commit when M0 closes) |
| `main` SHA | `0df93abfdb9e63ebe74322533fd5cd148a41aa2a` (untouched until M7) |
| Next item | **PBO-M1-1** `standards.lock` and shared templates (see [roadmap.md](roadmap.md)); in parallel PBO-M1-2 (Dependabot sandbox proof) and PBO-M1-4 (Testcontainers) |
| Known issues | `/` mobile Lighthouse 60; Recharts 374 KB raw on `/`; no single `check` script; audit mutable; CSP without `script-src`; sibling-API clone in CI; dead `publish` job |
| Owner inputs | 1. PBO-D16: enable GitHub private vulnerability reporting. 2. MV: VPS purchase and activation authorization. Every other decision is resolved by delegation (README) |

## In-flight tasks

Updated on each task merge (the same PR that sets the roadmap row to `done (PR #, SHA)`). RESUME: `git log --oneline --grep 'PBO-M<n>-'`, `gh pr list --state all --search 'PBO-M<n>-'`, then the first `todo` row in [roadmap.md](roadmap.md).

| Task ID | Branch | PR | Status | Note |
|---|---|---|---|---|
| none | - | - | - | M0 not started; first task is PBO-M1-1 |

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
