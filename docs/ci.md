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
| database | Database tests | static | Owned PostgreSQL artifact and full image inventory/gate, real IAM/OAuth, scoped project roles, migration/isolation and backup/restoration against both applications |
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

The application recipe has a colocated `Dockerfile.dockerignore` allowlist; root
`.dockerignore` denies everything as a fallback. PostgreSQL is built from the pinned
API checkout and its own deny-default context, admitting only reviewed bootstrap/HBA
resources. No secrets, fixture sessions or database dumps enter either image context.

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
content-addressed layers. Only the container job writes the application BuildKit cache;
database and browser jobs restore it without racing writers. Only the database job
writes the separate canonical PostgreSQL cache. Browser binaries are not cached; the job installs all reviewed
engines and OS dependencies. Shared local Playwright caches must never be cleaned; set
`PLAYWRIGHT_SKIP_BROWSER_GC=1` or use an owned browser cache.

## Fixture privacy and retained evidence

All three runtime jobs build the canonical database recipe from immutable API source
`f77c8d878401cc2a5bcea63716396b4bbcc1fc18`, using that checkout's repository-root context.
The database job reuses its exact compiled image for IAM verification, the complete
security inventory and the real dual-application scoped-role/recovery check; its
second local tag is an alias, not another build. Container and browser fixtures use
their own independently built images from the same source. Do not claim byte-identical
independent builds. No mutable sibling working tree or private image transfer is used.

The selected PostgreSQL18.6/pgvector0.8.7 Alpine artifact runs UID70 with fresh data.
Managed fixtures bind their reviewed source and actual image ID, use TCP readiness,
and clean up only matching owned identities even on failure. GitHub service containers
cannot consume an image built later in their job; no legacy Debian service fixture is
silently substituted. See [source and acceptance evidence](verification/shared-postgres-adoption-2026-10-18.md).

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
reviewed checksum. The application-image gate still rejects all HIGH/CRITICAL findings,
including unfixed ones.

The database job inventories the canonical artifact through local alias
`portfolio-backoffice-postgres:rc` with all package types/severities and `--list-all-pkgs`.
It reuses the exact checksum-verified scanner installer and binds the report to the actual
local image ID. Missing, malformed or mismatched inventories fail closed. Every CRITICAL
and fixable HIGH blocks database acceptance; unfixed HIGH remains explicitly counted in
the aggregate log summary and requires production assessment, never a blanket waiver.
No ignore file or severity filter is applied to inventory collection. Full JSON/package
inventory and scanner diagnostics stay on the ephemeral runner and are never uploaded.
Only bounded aggregate counts/policy status and synthetic source/image identity enter
logs; no raw public artifact is added. Scanner DB freshness is not certified by those counts.
Negative tests protect the actual commands, image/report binding and artifact privacy.
This adds no job or dependency and preserves IAM/recovery tests. Local checks do not
establish a clean image: the hosted scan can still block on current findings.

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

## Finite dependency review · 2026-10-18

The manually reviewed cohort preserves Dependabot87/88/89 commits. PostgreSQL's
new OCI index74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336
contains the exact previously pinned Linux/amd64 manifest885953109528ad3dfc90362b1a6f50a78620b5315be19f187753d267e484dc5b,
config and13layers. This changes pin representation, not supported-platform bytes;
it establishes neither a security upgrade nor multiarchitecture acceptance.

The @types/node24.19.2 patch only widens util.styleText hexadecimal array formats,
plus documentation/metadata; the runtime and undici-types dependency remain unchanged.
The setup-uv10.3 action uses the same reviewed1c37ad07a6a961277cf70c0d37d6f313000f5884
as the API; actual uv remains0.13.1 and cache/permissions remain unchanged. Primary
review sources are [DefinitelyTyped75656](https://github.com/DefinitelyTyped/DefinitelyTyped/pull/75656)
and [setup-uv10.3](https://github.com/astral-sh/setup-uv/releases/tag/v10.3.0).
Official Docker Registry index/platform/config bytes were compared without starting
containers. All three PRs authenticated as Dependabot49699333 with their complete
expected file scopes; passing separate older runs does not accept the combined cohort.

The actual combined frozen install, primary TypeScript7/generated routes, real IAM/
restore/restart, PostgreSQL inventory policy, application image and66browser cases
must pass on the final source head. Local tests before merging the declaration patch
used the existing installed types; hosted frozen installation is the acceptance of
the changed lockfile. No local install/build/browser, paid model or production action
is inferred from this review. Unknown future dependency changes need a new review.

Dependabot87's metadata change remains preserved in Git history but its legacy IAM-only
recipe is superseded by the explicitly coordinated common-engine replacement. Its
retirement does not suppress a security alert or make the original image acceptable.
The Docker ecosystem entry now follows only this repository's application recipe;
the API owner maintains dependency discovery for the canonical database artifact.
