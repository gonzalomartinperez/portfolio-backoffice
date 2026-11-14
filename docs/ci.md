# Backoffice CI

The entry point is `.github/workflows/ci.yml`, named **ci** (master plan PBO-M1-3, ecosystem
standard 6.0-6.2). `classify` maps each pull request's changed files, branch and labels to
profiles in [`.github/ci-profile.json`](../.github/ci-profile.json); each job runs only when
a selected profile names it, and `ci-gate` is the single fail-closed required check. Shared
jobs come from `gonzalomartinperez/engineering-standards`, pinned by commit SHA with the
release tag in a comment.

| Job ID | Source | Runs for | Responsibility |
| --- | --- | --- | --- |
| classify | shared `classify.yml` | always | Profiles and job list; fail closed (diff error, empty diff, unknown path or a changed profile map runs everything) |
| docs | shared `docs.yml` | every run (`base`) | markdownlint (`.markdownlint-cli2.jsonc`) and lychee offline link and fragment check |
| security | shared `security.yml` | every run (`base`) | zizmor, actionlint, gitleaks and dependency review with the licence allow-list |
| static | this repository | docs, harness, code, contract, workflow | Frozen installs, both `npm audit` runs, `npm run check` (format, lint, types, unit/contract/architecture tests, docs, licences, skills, public-file and history secret scan) and generated-contract drift |
| database | this repository | code, contract, workflow | `tests/integration/auth.test.ts` on a Testcontainers PostgreSQL 18 (digest pinned) |
| container | this repository | code, contract, workflow | Build the image, Trivy HIGH/CRITICAL gate, migrated readiness, bounded runtime and SIGTERM |
| browser | this repository | code, contract, workflow | Build the image and run the Playwright suite against it with the PostgreSQL service |
| ci-gate | shared `ci-gate` action | always | Fails unless every selected job succeeded; a skipped job passes only when classify did not select it |

Pushes to `develop` and `main`, merge groups, manual dispatch and calls from `release.yml`
always run everything. `deps-weekly` (Dependabot branches or the `deps-weekly` label),
`release` (`develop` into `main` or the `release` label) and `hotfix` profiles also run
everything. A docs-only change runs docs, security and static (about two minutes).
`tests/unit/ci-profile.test.ts` fails when a tracked file matches no profile, when the job
names in the map and the workflow disagree, or when `ci-gate` does not need every job.

## Local browser lease and redacted history checks

`npm run security:check` scans tracked files and every reachable commit, so it needs full
history (`fetch-depth: 0` in CI; a shallow local clone fails closed). The managed browser
lifecycle owns ports 3107, 3108 and 8117 and private signed test sessions under `.artifacts`;
stop any manual preview first. Shared local Playwright caches must never be cleaned: set
`PLAYWRIGHT_SKIP_BROWSER_GC=1` or use an owned browser cache.

## Trust and permissions

Every workflow starts with `permissions: {}` and grants per job; checkouts never persist
credentials; every action and reusable workflow is pinned to a full commit SHA; no workflow
uses `pull_request_target` or `workflow_run` or checks out another repository. Own jobs run
`step-security/harden-runner` in audit mode. No repository secret or paid provider reaches PR
jobs: provider and embedding fixture modes and `ALLOW_PAID_AI=false` are explicit.
`tests/unit/ci-profile.test.ts` asserts these rules for every workflow file.

## Fixtures and retained evidence

The database job's test owns a throwaway PostgreSQL container (`scripts/postgres-image.ts`),
provisions restricted IAM roles, applies the repository migrations and grants, and never reads
a database URL from the environment. The container and browser jobs use the same digest as a
job-scoped service container on a private network (the browser job also publishes a random
host port for the host-side fixture server) and connect as the fixture superuser; restricted
runtime-role coverage lives in the database job. Testcontainers' Ryuk reaper is disabled in CI.
Test PostgreSQL images are ephemeral fixture infrastructure, not production artifacts;
production PostgreSQL is provisioned by vps-ops.

The container job verifies read-only non-root operation, bounded memory, PIDs and logs,
readiness, anonymous workload and idle SIGTERM, and Trivy 0.75.0 (checksum verified) rejects
every HIGH or CRITICAL finding, fixed or not. The browser job runs every interaction and
accessibility case in both operational fixture modes. Public CI uploads only synthetic UI
screenshots, for seven days; images, logs, environment files, sessions, invitation links,
traces and database dumps are never uploaded.

Until PBO-M1-5 the container and browser jobs each build the image on their own runner
(cached with BuildKit `type=gha`; only the container job writes the cache).

## Scheduled jobs

`vuln-daily.yml` (shared, daily 07:00 ART) runs osv-scanner over every lockfile and a
compromised-action watch, updates one tracking issue silently and posts only the Monday
summary (OD-75). `scorecard.yml` runs OpenSSF Scorecard weekly. Scheduled workflows run from
the default branch, so they start when these files reach `main` (M7) unless the owner makes
`develop` the default branch. CodeQL uses GitHub's default setup (a repository setting).

## Required check and publication

Branch protection still requires the context **Required checks**. A tiny `required-checks`
alias job with that display name mirrors `ci-gate` (it passes only when `ci-gate` succeeded),
so both contexts exist on every run. The owner-supervised ruleset step (PBO-M1-11) can then
require `ci-gate` without a protection gap and delete the alias afterwards.

`release.yml` is dispatch-only and calls `ci.yml` for the complete validation. It has no
publication path; PBO-M1-8 adds build, attestation and a publish job gated on owner
authorization. No deployment controller or registry publication exists here; private vps-ops
selects releases and performs any separately authorized deployment.

Earlier CI designs and their evidence are recorded in
[paired-profile evidence](verification/paired-ci-profile-2026-10-18.md) and git history.
