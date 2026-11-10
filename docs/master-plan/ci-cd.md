# CI/CD

Applies ecosystem sections 5 (Dependabot), 6 (CI), 7 (supply chain) and 8 (containers) to this repository. Decisions: PBO-D7, D9, D10, D15, D18 (ADR 0019, 0020, 0021). Everything here is a plan; workflow changes land through task PRs to `develop`. Reusable workflows come from `engineering-standards` (E1, created at M1); until it exists the same jobs live locally in this repo and are lifted unchanged.

## 1. Baseline and problems

`quality.yml` (508 lines, v1 and audit): seven jobs `workflows`, `secrets`, `static`, `database`, `container`, `browser`, `checks`. It is fail-closed, SHA-pinned, least-privilege, 3.5-6 min [v1]. Problems measured in the audit: (1) the three heavy jobs each clone `portfolio-assistant-api` at pinned SHA `e6b2e67`, build its Postgres image and build the app image: 6 image builds per run; (2) the image is not shared, so the three jobs do not prove they test the same bytes; (3) no `classify` job or path map, so a docs change runs everything; (4) runs on both `push` and `pull_request`; (5) heredoc JavaScript in YAML; (6) no zizmor, CodeQL, Scorecard, SBOM, osv, dependency-review; (7) `dependency-policy.yml` uses `pull_request_target`; (8) `release.yml` publish job is `if: ${{ false }}`; (9) Dependabot is four independent entries.

## 2. Target graph (ecosystem 6.1)

```
classify (<= 30 s) ─┬─> static: npm run check (format, lint, types, knip, guards, tokens, contract, docs, skills) ─┐
                    ├─> test shards: unit, component, integration (Testcontainers) ───────────────────────────────┼─> build ONCE ─> image artifact ─> container | e2e | scan+sbom+attest ─> ci-gate
                    └─> security: zizmor, actionlint, gitleaks, dependency-review, osv, CodeQL (own workflow)
```

| Rule | Implementation here |
|---|---|
| One required check | `ci-gate` (`if: always()`, `needs` all jobs, passes only on `success` or `skipped` when the profile says not applicable; `failure` or `cancelled` fails). The old `checks`/`Required checks` job and `scripts/check-ci-results.ts` are replaced; the ruleset (applied by the standards script) requires only `ci-gate` |
| Affected-only | `classify` runs the standards 15-line script on `git diff --name-only BASE HEAD` against `ci-profile.json`; outputs the profile and booleans; handles `merge_group`; on any error outputs `code` with everything on. Job-level `if:`, never workflow-level `paths:` |
| Fail-closed | A changed file outside every glob runs everything; `tests/unit/ci-profile.test.ts` fails if any tracked file is not matched by some profile |
| Build once | One `build` job: `docker/build-push-action` with `outputs: type=docker,dest=image.tar`, upload artifact (retention 1 day), `sha256` recorded; `container`, `e2e`, `scan`, `attest` download and `docker load` that exact tarball. Never rebuild at deploy. Open owner confirmation PBO-D9; fallback keeps three builds with `type=gha` cache |
| Caching | npm store keyed on `package-lock.json` (not `node_modules`); `.next/cache` keyed on lockfile plus source hash; Playwright browsers keyed on version; buildx `type=gha` (small repo; only `develop` writes broad caches) |
| Sharding | Only if a job exceeds budget: Playwright `--shard`, blob reports merged (`if: !cancelled()`); shards = ceil(minutes/4), max 4 |
| Concurrency | `ci-${{ github.workflow }}-${{ github.ref }}`, cancel in progress for PRs only; never for release or deploy |
| Timeouts | lint and unit 10-15, e2e 25, image 30, gate 2 minutes |
| Triggers | `pull_request`, `merge_group` (kept so a merge queue can be enabled), `workflow_dispatch`; `push` only to `develop` for the nightly baseline and to `main` for release evidence |
| Playwright fast path | `--only-changed` on PR; full run nightly and release |

## 3. Profiles and `ci-profile.json` (draft)

Profiles from ecosystem 6.0; `assistant-quality` is not applicable (no assistant code here). The `contract` profile adds the consumer compile job (`contract:generate` plus `git diff --exit-code`) and the SHA-256 manifest check.

```json
{
  "$schema": "./.github/ci-profile.schema.json",
  "version": 1,
  "default": "code",
  "profiles": {
    "docs": {
      "match": ["**/*.md", "docs/**", "!docs/master-plan/research/**/*.ts", "LICENSE", "docs/assets/**"],
      "runs": ["markdownlint", "lychee", "docs-check", "skills-check", "secret-scan"],
      "budget_p50_min": 2
    },
    "workflow": {
      "match": [".github/**"],
      "runs": ["actionlint", "zizmor", "pin-policy", "reusable-dry-run"],
      "budget_p50_min": 3
    },
    "contract": {
      "match": ["contracts/**", "scripts/contracts/**"],
      "runs": ["code", "contract-compile", "contract-manifest"],
      "budget_p50_min": 8
    },
    "deps-weekly": {
      "match_branch": ["dependabot/**"],
      "runs": ["code", "dependency-review", "licence-check", "sbom-diff", "lockfile-lint", "image-rebuild-scan"],
      "budget_p50_min": 9
    },
    "code": {
      "match": ["src/**", "tests/**", "scripts/**", "migrations/**", "infra/**", "public/**", "package.json", "package-lock.json", "tsconfig.json", "biome.json", "next.config.ts", "playwright.config.ts", "vitest.config.ts", "stryker.config.json", ".postcssrc.json", "quality/**", "tooling/**", ".nvmrc", ".dockerignore"],
      "runs": ["static", "unit", "component", "integration", "guards", "build", "e2e-affected", "visual-affected", "lighthouse-ui", "mutation-incremental"],
      "path_map": {
        "src/features/auth/**": ["integration", "e2e:auth", "mutation"],
        "src/server/**": ["integration", "e2e:auth", "e2e:overview", "mutation"],
        "src/shared/ui/**": ["component", "visual", "a11y"],
        "src/shared/dataviz/**": ["component", "visual", "a11y", "bundle"],
        "src/design/**": ["tokens", "visual", "a11y"],
        "migrations/**": ["integration", "migration"],
        "infra/docker/**": ["image", "container"],
        "src/app/**": ["e2e-affected", "visual-affected", "bundle", "lighthouse-ui"]
      },
      "budget_p50_min": 6,
      "budget_p95_min": 12
    },
    "release": {
      "match_pr": {"base": "main", "head": "develop"},
      "runs": ["everything", "mutation-full-or-nightly<=24h", "lighthouse-all", "visual-all", "image-build-sbom-provenance-verify", "changelog-check"],
      "budget_p50_min": 30
    },
    "hotfix": {
      "match_branch": ["hotfix/*"],
      "requires_label": "owner-authorized",
      "runs": ["code", "release-verification-touched", "auto-backmerge"],
      "budget_p50_min": 12
    }
  }
}
```

(The `docs` entry's negative glob is illustrative: any `.ts` file anywhere is always `code`.) Precedence when several match: `workflow` and `contract` add to `code` rather than replace it; a PR touching both docs and code is `code`.

## 4. Nightly and weekly

| Workflow | Cadence | Jobs |
|---|---|---|
| `nightly.yml` | 03:00 ART daily | full mutation (budget 90 min; scope reduced, not the score), flake detector (`--repeat-each=5`), full browser matrix (Chromium, Firefox, WebKit, iPhone, Pixel; advisory warn-only until MV), visual all routes, ZAP baseline (advisory warn-only until MV), osv-scanner (advisories, no PRs), compromised-action list check, `scorecard.json` re-score and ratchet check, paired job against the API's published Postgres digest (when available) |
| `weekly.yml` | Monday 10:30 ART plus others | `deps-weekly-guard`, full mutation if not nightly, OpenSSF Scorecard (fail if it drops more than 1 point), Grype on any recorded digest, link check of all docs, standards drift, CI duration report (p50, p95 of last 30 runs via `gh run list --json`) |
| `security.yml` | PR and weekly | CodeQL default setup (JS/TS, `actions`), dependency-review, gitleaks |

Duration budgets (ecosystem 6.2, backoffice): PR critical path p50 6 min, p95 12 min; nightly at most 45 min; release at most 30 min; alert when p95 drifts 25% above the 4-week baseline. Over budget: fix cache hits, split jobs, shard, last paid runners.

## 5. Workflow hardening

`permissions: {}` at workflow top, grants per job (`id-token`, `attestations`, `packages` write only on `attest`); every `uses:` pinned to a full SHA with a version comment (policy "require full SHA" on); `persist-credentials: false`; no `pull_request_target` or `workflow_run` that checks out PR head and no untrusted `${{ }}` in `run:` (pass through `env:`); zizmor (regular persona, online audits) and actionlint on `.github/**`; harden-runner audit then block with allow-list on the publish and attest jobs and on PR jobs of this public repo; `production` environment with the owner as required reviewer, branch restriction and the only place a deploy token would ever live (none exists today); banned: `tj-actions/*`, `aquasecurity/trivy-action` older than the safe release. The existing checksum-verified Trivy download in `quality.yml` goes away with the Grype default (E8); if Trivy is kept it is a SHA-pinned binary at or after v0.35.0 (the current v0.75.0 satisfies this).

## 6. Supply chain

| Control | Plan |
|---|---|
| SBOM | Syft CycloneDX JSON of the built image, attached as an attestation and as a release asset |
| Provenance | `attest-image.yml` (standards, isolated reusable workflow) using `actions/attest` with `subject-digest`; claim is Build L2 now and L3 through the isolated workflow; Source L1-L2; never more |
| Verify before deploy | `gh attestation verify oci://IMAGE@sha256:... --signer-workflow gonzalomartinperez/engineering-standards/.github/workflows/attest-image.yml` in the deploy job and in `vps-ops` before it records a digest |
| Signing | GitHub attestations only |
| Image scan | Grype on the built digest, fail on fixable High or Critical |
| Scorecard, CodeQL, dependency review | free on this public repo; Scorecard weekly with SARIF; accept the ceiling on Code-Review and Branch-Protection for a solo repo |
| Install-time code | `npm ci --ignore-scripts` with an allow-list for build scripts; lockfile diff reviewed in the weekly PR |
| Releases | Immutable releases switched on before the first release; tag ruleset for `v*` |
| New runtime dependency | ADR with need versus platform, Scorecard and deps.dev health, licence allow-list (MIT, Apache-2.0, BSD, ISC, 0BSD, BlueOak), bundle cost over 10 kB gz justified, maintainers, exit cost |

Honest limit until MV: before the owner authorizes a registry push (PBO-D10), attestations are produced for the image tarball digest, not a registry digest; `vps-ops` cannot verify them yet.

## 7. Containers (ecosystem 8)

LTS matrix applied: Node 26 LTS (Active since 2026-10-28) after a two-week CI matrix on 24 and 26 (E10, PBO-D15; currently `.nvmrc` 24.22.0, `engines >=24 <25`); Debian 13 trixie; distroless `nodejs26-debian13:nonroot` runtime; Postgres 18.x trixie for tests. Next.js 16.4 and `sharp`-free native deps on Node 26 are unverified until the matrix passes.

Canonical Dockerfile (`infra/docker/app/Dockerfile`; digests resolved at PBO-M1 with `docker buildx imagetools inspect`, shown here as placeholders):

```dockerfile
# syntax=docker/dockerfile:1@sha256:<frontend-digest>
ARG NODE_IMAGE=node:26.<x.y>-trixie-slim@sha256:<digest>
ARG RUNTIME_IMAGE=gcr.io/distroless/nodejs26-debian13:nonroot@sha256:<digest>

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --ignore-scripts --no-audit --no-fund
COPY next.config.ts next-env.d.ts tsconfig.json .postcssrc.json ./
COPY src ./src
COPY contracts/assistant-api ./contracts/assistant-api
COPY public ./public
COPY scripts/migrate.ts scripts/container/prepare-runtime.ts ./scripts/
COPY migrations ./migrations
ARG APP_VERSION=0.0.0
ARG APP_REVISION=unknown
ENV APP_VERSION=${APP_VERSION} APP_REVISION=${APP_REVISION}
RUN npm run build && mkdir -p .next/standalone/.next/cache

FROM ${RUNTIME_IMAGE} AS runtime
ARG APP_VERSION APP_REVISION BUILD_DATE
LABEL org.opencontainers.image.title="portfolio-backoffice" \
      org.opencontainers.image.description="Private operations console for the portfolio assistant" \
      org.opencontainers.image.documentation="https://github.com/gonzalomartinperez/portfolio-backoffice/tree/main/docs" \
      org.opencontainers.image.source="https://github.com/gonzalomartinperez/portfolio-backoffice" \
      org.opencontainers.image.version=${APP_VERSION} \
      org.opencontainers.image.revision=${APP_REVISION} \
      org.opencontainers.image.created=${BUILD_DATE} \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
COPY LICENSE ./LICENSE
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 APP_VERSION=${APP_VERSION} APP_REVISION=${APP_REVISION}
COPY --from=build --chown=65532:65532 /app/.next/standalone ./
COPY --from=build --chown=65532:65532 /app/.next/static ./.next/static
COPY --from=build --chown=65532:65532 /app/public ./public
USER 65532:65532
STOPSIGNAL SIGTERM
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:3000/api/ready',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node","server.js"]
```

Deviations from the canonical Next.js row, justified: (1) `HEALTHCHECK` probes `/api/ready` (readiness) instead of liveness because Coolify's rolling update gates traffic on health; liveness `/api/health` is monitored separately (existing `docs/reference/deployment-contract.md` rationale); (2) `ENTRYPOINT []` is dropped (distroless `nodejs` entrypoint is `node`; the migration job runs `node scripts/migrate.ts` via an explicit command override, verified by the container test); (3) version stamp comes from non-secret build args, never secrets (provenance `mode=max` embeds build args).

Gates in CI: hadolint (`.hadolint.yaml` from standards), dockle (CIS-DI), container-structure-test (user 65532, labels, no shell, no `.env`, files listing, read-only boot with tmpfs), Grype, then attest. Runtime hardening for Coolify or compose (ecosystem 8.3): `read_only`, `tmpfs /tmp` and `/app/.next/cache`, `cap_drop ALL`, `no-new-privileges`, `pids_limit 128`, `mem_limit 512m` with equal `memswap_limit`, `cpus 0.75`, `stop_grace_period 20s`, no published ports except the proxy (the CI `docker run` flags already use this set and move to the structure test). Image `ghcr.io/gonzalomartinperez/portfolio-backoffice`, tags `vX.Y.Z` and `sha-<short>`, deployed only `@sha256:<digest>`. Docker Hardened Images pilot (E9) is not scheduled here; the owner may choose this repo as the backoffice pilot.

## 8. Dependabot (weekly single PR rule, ecosystem 5)

`.github/dependabot.yml` (copied from `engineering-standards`, drift-checked):

```yaml
version: 2
multi-ecosystem-groups:
  weekly:
    schedule:
      interval: weekly
      day: monday
      time: "09:00"
      timezone: America/Argentina/Buenos_Aires
    target-branch: develop
updates:
  - package-ecosystem: npm
    directory: /
    multi-ecosystem-group: weekly
    patterns: ["*"]
    open-pull-requests-limit: 1
    cooldown: { default-days: 7, semver-major-days: 14, semver-patch-days: 3 }
  - package-ecosystem: npm
    directory: /tooling/api-contract
    multi-ecosystem-group: weekly
    patterns: ["*"]
    open-pull-requests-limit: 1
  - package-ecosystem: github-actions
    directory: /
    multi-ecosystem-group: weekly
    patterns: ["*"]
    open-pull-requests-limit: 1
  - package-ecosystem: docker
    directory: /infra/docker/app
    multi-ecosystem-group: weekly
    patterns: ["*"]
    open-pull-requests-limit: 1
```

The v1 ignores (major `typescript` and `@types/node`; major `node` image) stay as `ignore` entries because TS 7 and the Node line are governed by the LTS policy and the openapi generator's TS 5 peer, not by Dependabot. Security-update PRs are disabled in repository settings (alerts stay on); the daily osv job records findings silently in one tracking issue (`vuln` label) and the Monday summary notifies (OD-75); criticals ride the weekly PR unless in CISA KEV or reachable, then a normal task PR bumps the single dependency. `deps-weekly-guard` (Monday 10:30 ART and on Dependabot events) keeps at most one open Dependabot PR, rebases or recreates it, labels `needs-fix` when CI is red, and fails when a pinned base-image digest is older than 30 days. Unverified until proven on the sandbox repo (PBO-M1-2, E2): grouped-PR update semantics, schedule and time zone on groups, `github-actions` and `docker` in a multi-ecosystem group, cooldown inside groups.

## 9. Release automation (ecosystem 3.2)

- Conventional Commits; PR titles checked (`amannn/action-semantic-pull-request`, SHA-pinned); merge commit (no squash) into `develop`.
- release-please (manifest mode, GitHub App token stored in an environment-scoped secret) on `develop` keeps one release PR bumping `package.json` and `CHANGELOG.md` (sections Added, Changed, Fixed, Removed, Security). Open point E5: validate in a sandbox; fallback is release-please on `main` with a back-merge workflow.
- `develop` to `main` promotion happens only at M7 or on demand with the `release` profile; merge commit; after it a workflow on `main` creates tag `vX.Y.Z` and an immutable GitHub Release with SBOM and provenance assets; an automatic back-merge PR `main` to `develop` follows.
- `release.yml` becomes: `verify` (calls the full release profile) then `build-and-attest` then `publish`. `publish` runs only with input `publication_authorized: true`, in the `production` environment and with registry push permission, which stays unauthorized until the owner answers PBO-D10. The dead `if: ${{ false }}` job is deleted, not commented.
- First release after the redesign is `2.0.0` (new routes, PBO-D14).
- No hotfix before M7 (OD-11, DR-01); afterwards a hotfix to `main` only with explicit owner OK (`owner-authorized` label), then back-merge; never `--admin`.

## 10. Rulesets and merge discipline

Rulesets applied by `engineering-standards/scripts/apply-rulesets.sh`: PR required, `ci-gate` required and strict, no force-push or deletion, no bypass actors, tag ruleset for `v*`. The owner currently has main and develop protection with `checks`, strict status and admin enforcement (observed in `docs/engineering-coordination.md`); the new name `ci-gate` replaces `Required checks` in one coordinated change. Merge command always `gh pr checks --watch && gh pr merge`.
