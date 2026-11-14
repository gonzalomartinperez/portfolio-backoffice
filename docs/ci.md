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
| static | this repository | docs, harness, code, contract, workflow | Frozen installs, both `npm audit` runs, `npm run check` (format, lint, types, Vitest unit/contract/architecture tests with the coverage floors of `quality/ratchets/coverage.json`, docs, licences, skills, public-file and history secret scan) and generated-contract drift |
| database | this repository | code, contract, workflow | Unit and `integration` Vitest projects with coverage (`npm run test:coverage`, Testcontainers PostgreSQL 18, digest pinned); on pull requests the diff coverage gate (`scripts/diff-coverage.ts`): changed executable lines of TypeScript modules under `src/` outside `src/app/` need 90 % on auth and DAL code and 80 % elsewhere (`.tsx` joins with the component project) |
| build | this repository | code, contract, workflow | Build the image once as a tarball artifact with its SHA-256; file-listing and secret checks before upload |
| scan | this repository | code, contract, workflow | Load that tarball; container-structure-test, dockle, Grype (fixable HIGH/CRITICAL fail) and a Syft CycloneDX SBOM artifact |
| container | this repository | code, contract, workflow | Load that tarball; migrated readiness, bounded runtime, anonymous workload and SIGTERM |
| browser | this repository | code, contract, workflow | Load that tarball and run the Playwright suite against it with the PostgreSQL service |
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
readiness, anonymous workload and idle SIGTERM. The scan job runs container-structure-test
(`infra/docker/app/structure-test.yaml`: user 65532, explicit command, labels, no shell, no
`.env` or `.artifacts`, migration runtime present), dockle (warnings fail), Grype (fixable HIGH
or CRITICAL fail, the ecosystem default, DR-12) and Syft (CycloneDX SBOM kept seven days), all
checksum-verified binaries. The browser job runs every interaction and
accessibility case in both operational fixture modes. Public CI uploads only synthetic UI
screenshots, for seven days; images, logs, environment files, sessions, invitation links,
traces and database dumps are never uploaded.

The image is built once per run (PBO-M1-5, PBO-D9). The `build` job writes it as a Docker
tarball, records its SHA-256, rejects private or credential-like files in the exported
filesystem and runs a Trivy secret scan (application files; third-party `node_modules` are
covered by dependency review and osv-scanner), then uploads it as the one-day
`backoffice-image` artifact. The container and browser jobs download that artifact, verify
the SHA-256 and `docker load` it, so every runtime check tests the same bytes. The image holds
only public MIT source and synthetic values. BuildKit reads the `type=gha` cache on every
run; only pushes to `develop` write it.

## Image recipe

`infra/docker/app/Dockerfile` follows the ecosystem's canonical Next.js row: `NODE_IMAGE` and
`RUNTIME_IMAGE` build arguments pinned by digest (Node 24 until the E10 flip), `npm ci
--ignore-scripts`, a distroless non-root runtime (UID 65532) and OCI labels (title,
description, documentation, source, version, revision, created, licences). The build job
passes `APP_VERSION` (package.json), `APP_REVISION` (commit SHA) and `BUILD_DATE` (commit
time), all non-secret. hadolint 2.15.1 (checksum verified, `.hadolint.yaml`) lints the recipe
before the build. Deviations, justified: the healthcheck probes readiness (`/api/ready`) because
Coolify gates traffic on health, and the entrypoint stays empty so the vps-ops migration command
`node scripts/auth-migrate.ts` and `node server.js` remain explicit.

## Node 26 window

`node-next` runs type-check, unit and contract tests and the production build on Node 26
(26.13.1) whenever `static` runs. It is informational, not in `ci-gate.needs`: the backoffices
move to Node 26 after two weeks of green dual-version CI (E10, OD-77), then `.nvmrc`, `engines`
and the Dockerfile base arguments flip in one PR and this job is removed.

## Scheduled jobs

`vuln-daily.yml` (shared, daily 07:00 ART) runs osv-scanner over every lockfile and a
compromised-action watch, updates one tracking issue silently and posts only the Monday
summary (OD-75). `scorecard.yml` runs OpenSSF Scorecard weekly. Scheduled workflows run from
the default branch, so they start when these files reach `main` (M7) unless the owner makes
`develop` the default branch. CodeQL uses GitHub's default setup (a repository setting).

## Nightly flake detector

`nightly.yml` runs every browser test five times without retries (`--repeat-each=5
--retries=0`) on chromium, firefox and webkit, because `retries: 1` on CI hides flakes.
`scripts/flaky-report.ts` classifies each test as stable, flaky or failing and uploads
`flaky-report.json` (30 days). A flaky test gets an issue and is quarantined the same day in
`tests/quarantine.json` (title, issue URL, `quarantinedOn`, `fixBy`). PR runs skip quarantined
titles; the nightly sets `PLAYWRIGHT_INCLUDE_QUARANTINE=1`, still runs them and reports them
apart without failing. The run fails on any other flaky or failing test, on a crash, and when
no test executed. An expired `fixBy` fails the unit suite. Fix or delete
within 7 days; the cap is min(2 % of tests, 5) entries. Like other scheduled workflows it
reads the default branch, so it also runs on every push to `develop` until `main` carries it,
and on pull requests that change the detector itself.

## Static quality ratchets

`npm run quality:static` runs after `npm run check` in the `static` job and measures three things
that may only improve. Baselines are committed; a count that rises, or a new location, fails.

- **knip** (`knip.json`, `npm run knip`): unused files, exports, types and dependencies. The
  counts per category are in `quality/ratchets/static.json`. Removing what knip reports is
  PBO-M3-1; this task only records the baseline.
- **Cognitive complexity**: Biome `noExcessiveCognitiveComplexity` at threshold 10 over `src/` and
  `scripts/`, run separately through `quality/biome-complexity.json` so it is not a failing lint
  rule. `static.json` lists the offending functions; the check compares the count, the new files
  and the per-file scores (line numbers are informational).
- **Design tokens** (`scripts/check-tokens.ts`): WCAG 2.2 contrast of the text and non-text
  pairs in `src/app/style.css` for both themes. Baseline ratios are in
  `quality/ratchets/tokens.json`; a pair already below the WCAG minimum is recorded with
  `"belowWcag": true` until the M5 redesign.

Ratchets only tighten: when a check prints a hint that a number fell, lower it in the JSON file
in the same PR (`node scripts/check-static-ratchets.ts --write` rewrites `static.json` and
refuses to raise a count). Property tests (`tests/unit/properties.test.ts`) run 100 cases per
property; set `FC_NUM_RUNS=1000` for the nightly run.

## Nightly contract consumer check

`nightly.yml` compares four pinned schema SHA-256 hashes with the API's `develop` contracts
and replays available published examples through the backoffice runtime validators.
Schema drift means a snapshot refresh is due through the `web-refresh-contract` skill;
a rejected example fails the run. The JSON consumer report is retained for 14 days.
The paired-API PostgreSQL job remains a stub until the repository variable
`ASSISTANT_API_POSTGRES_DIGEST` is published. A set digest must be valid and fails closed
until the publishing task implements the paired run.

## Required check

Branch protection still requires the context **Required checks**. A tiny `required-checks`
alias job with that display name mirrors `ci-gate` (it passes only when `ci-gate` succeeded),
so both contexts exist on every run. The owner-supervised ruleset step (PBO-M1-11) can then
require `ci-gate` without a protection gap and delete the alias afterwards.

## Release

`release.yml` (dispatch-only, from `develop` or `main`) runs three jobs. `verify` calls `ci.yml`,
which runs everything and builds the image tarball once. `attest` downloads that tarball and its
SBOM, checks the SHA-256 against `verify`'s output, and creates GitHub build-provenance and
CycloneDX SBOM attestations for the tarball (Build L2; verify with
`gh attestation verify backoffice-image.tar -R gonzalomartinperez/portfolio-backoffice`). The
subject is the tarball digest, not a registry digest, until a registry push exists (honest limit,
ci-cd.md section 6). `publish` runs only from `main` with `publication_authorized: true`, in the
`production` environment, and only when `vars.REGISTRY_PUBLICATION_ENABLED` is `true` (otherwise
it is skipped). It has no package permission and fails closed even when reached: registry publication and deployment stay off until MV (DR-13, PBO-D10), when
the owner activates them in one reviewed PR. No deployment controller exists here; private
vps-ops selects releases.

Release automation follows engineering-standards ADR 0003 (OD-78). A normal release PR on
`develop` bumps `package.json` and moves curated CHANGELOG `Unreleased` entries under
`## [X.Y.Z] - YYYY-MM-DD`. When that commit reaches `main`, `release-tag.yml` creates `vX.Y.Z`
on the pushed commit and a GitHub Release with that section as its notes, using `github.token`;
an existing release is a no-op. No GitHub App or PAT is needed. The first release after the
refactor is 2.0.0 (PBO-D14). The `production` environment does not exist yet: the owner creates
it with themselves as required reviewer and a `main`-only branch policy before MV (GitHub would
otherwise auto-create it unprotected). Immutable releases remain an owner repository setting;
the `v*` tag ruleset is applied with the standards rulesets script (PBO-M1-11).

Earlier CI designs and their evidence are recorded in
[paired-profile evidence](verification/paired-ci-profile-2026-10-18.md) and git history.
