# Paired backoffice CI and artifact privacy

The canonical workflow is `.github/workflows/quality.yml`, named **Quality**. It implements
the backoffice profile selected in private vps-ops commit
`8ab1878a318f5572b5d21993ad7a471655a14647`, `docs/architecture/ci-profiles.md`.
The public application keeps its own commands and tests; this selection is not deployment authority.

| Job ID | Exact check name | Needs | Actual responsibility |
| --- | --- | --- | --- |
| workflows | Workflow validation | none | Checksum-verified actionlint and paired DAG/events/trust policy |
| secrets | Secret scan | none | Redacted candidate and full reachable Git-history scan |
| static | Static checks | none | Frozen main/generator installs, both audits, formatting, lint, TypeScript 7/route types, architecture/unit/contracts, documentation, licensing, skills and generated drift |
| database | Database tests | static | Owned PostgreSQL artifact, real IAM/OAuth, scoped project roles, migration/isolation and backup/restoration against both applications |
| container | Container verification | static | Image build and complete vulnerability gate, migrated-database readiness, bounded runtime/anonymous workload and SIGTERM |
| browser | Browser tests | static | Real image and isolated PostgreSQL; all existing 66 Chromium/Firefox/WebKit cases across available/unavailable operational fixtures |
| checks | Required checks | all six jobs above | Always-evaluated, fail-closed aggregate |

Workflow, security and static checks run independently. Database, container and browser jobs
run independently after static; each owns its own disposable fixtures. A completed database
job does not leave a service running on another runner. No successful placeholder replaces
IAM, recovery, readiness, vulnerability or browser coverage.

## Exact source and the private-image rebuild exception

All three runtime jobs build `infra/docker/app/Dockerfile` using repository-root context,
explicit `linux/amd64`, the same candidate checkout, pinned base/dependencies and no build
arguments. They deliberately rebuild on their own ephemeral runner: public Actions image
archives would expose private runtime bytes, and no approved private transport exists.
This is the explicit privacy exception permitted by the paired profile, not an assertion
that different images or configurations are interchangeable. No registry credentials are
introduced. BuildKit's content-addressed cache can reduce repeated compilation; measure
actual job/build cost before claiming an efficiency gain.

`scripts/ci-build-provenance.ts` verifies checkout SHA against the workflow candidate and
records producer run/attempt/job, source/base/workflow revisions, build-input fingerprint,
platform, actual local image ID and build duration. Receipts stay private in ignored
`.artifacts/ci-provenance`; they are not publicly uploaded. A local image ID is not a registry
manifest digest. Base revision can be the all-zero GitHub marker for a newly created branch;
it must not be reported as an existing commit. PR merge-ref validation and a later branch
merge have different source identities and need their own successful runs.

Recipes have colocated `Dockerfile.dockerignore` policies. The app allowlists required build
inputs; PostgreSQL excludes all repository inputs. Root `.dockerignore` denies everything
as a fallback. No secrets, fixture sessions or database dumps enter image contexts.

## Events, gating and trust

PRs into **develop and main**, pushes to **develop and main**, merge groups, manual dispatch
and reusable verification run the complete profile. There are no workflow path filters.
Concurrency cancels obsolete revisions for the same workflow/ref; separate PRs remain
independent. Per-job timeouts bound failures. `scripts/check-ci-results.ts` requires every
expected prerequisite to be `success`: missing, failed, pending, cancelled, skipped and
unexpected result sets fail. Negative unit cases cover every prerequisite and unsafe DAG,
permissions, names, event filters, dummy adapters and source/artifact substitutions.

Default permissions are `contents: read`, checkout credentials are not persisted and every
action is pinned to a reviewed full commit SHA. No repository secret or paid provider is
available to PR jobs; provider/embedding fixture mode and `ALLOW_PAID_AI=false` are explicit.
Untrusted PR code runs only on GitHub-managed Ubuntu24.04. The separate dependency workflow
is read-only trusted-default-branch assessment; no approval or automatic merge writer is
activated. Its dormant context assessment follows the new exact human job names and gate.

Actionlint1.7.12 is fetched only from its official release and verified against SHA256
`8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8` before execution.
One intentional OFF-policy compatibility exception recognizes actionlint's exact `if-cond`
diagnostic only for `release.yml` / `jobs.publish.if: ${{ false }}`, bound to the parsed YAML
and its source line. Any additional diagnostic, file, rule, message or condition fails.
The false condition is preserved; this exception cannot enable publication.
The TypeScript profile checker additionally validates the concrete adapters and source-bound
build configuration. Syntax/policy validation is not an executed image or browser result.

Frozen installs remain mandatory. Setup-node caches npm downloads by lockfile/runner inputs;
static includes the isolated contract-generator lockfile. Node follows `.nvmrc`; runtime
images pin their own version and digest. BuildKit uses the Node24/amd64 scope and validated
content-addressed layers. Only the container job writes the shared BuildKit cache; database
and browser jobs restore it without racing writers. Browser binaries are not cached; the job installs all reviewed
engines and OS dependencies. Shared local Playwright caches must never be cleaned; set
`PLAYWRIGHT_SKIP_BROWSER_GC=1` or use an owned browser cache.

## Fixture privacy and retained evidence

The database job preserves the real scoped-role/recovery check against immutable API source
`defe16a855a13401292257d337ce5dd937b00d23`. That foreign checkout deliberately uses its own
legacy `Dockerfile.postgres`; do not rewrite its recipe path to this application's layout.
This exception changes only when a reviewed committed API handoff changes the pin.

Each runtime job uses an isolated synthetic PostgreSQL database and independently migrates
its actual image. The container job verifies read-only/nonroot operation, bounded memory,
PIDs, logs, readiness, workload and idle SIGTERM. The browser job retains every original
interaction/accessibility case and both fixture modes against its own exact image. It does
not claim Google/GitHub production-provider or real-phone acceptance.

The managed browser lifecycle owns ports3107/3108/8117 and private signed test sessions under
`.artifacts`. No application authentication bypass endpoint exists. Graceful shutdown removes
those files. Available/unavailable runs have separate report directories and immutable source
modes, avoiding cross-engine mutation races. Paid models are never called.

Ordinary public CI uploads only existing safe synthetic UI screenshots and the bounded
project-database recovery receipt, for seven days. Images, logs, environment files, session
files, invitation links, traces and database backups are not uploaded. Each runner cleans
up only its own application/fixture resources, even after failure. Trivy0.75.0 retains its
reviewed checksum and rejects HIGH/CRITICAL findings without suppression, including unfixed
findings. No scanner coverage or severity threshold is weakened by the split.

## Context transition and publication

The new final check is **Required checks**, not the former `checks`. Existing branch
protection remains unchanged until the owner obtains successful exact-head evidence and
performs the coordinated transition without a protection gap. A legacy required status may
therefore remain pending during preparation; do not bypass it or manufacture a dummy job.
Actual GitHub app/context identity must be inspected before changing requirements.

`release.yml` remains dispatch-only, with publication hard-disabled and no package-write
permission. Its reusable Quality call receives the same complete validation. No deployment,
SSH/webhook controller or registry publication is activated. Private vps-ops selects releases
and performs any separately authorized Coolify deployment.

Record actual run URLs, merge/base/workflow revisions, job timings, cache behavior and remaining
limitations in [paired-profile evidence](verification/paired-ci-profile-2026-10-18.md).
Success on an older PR or develop commit is not acceptance of a new main merge SHA.
