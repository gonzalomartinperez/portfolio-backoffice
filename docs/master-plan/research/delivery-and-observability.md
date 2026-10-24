# CI/CD, release, deploy readiness and observability

Planning only. Publication and deployment stay disabled until the owner authorizes them and the
VPS exists (see the [roadmap](../roadmap.md#vps-phase--activation-gated)). Bracketed numbers
refer to [sources](sources.md).

## Baseline CI

[code + gh] `quality.yml` (508 lines): `workflows`, `secrets`, `static`, `database`,
`container`, `browser`, `checks` (fail-closed gate via `scripts/check-ci-results.ts`).
SHA-pinned, `persist-credentials:false`, `permissions: contents: read`, concurrency with
cancel. 3.5–6 min. Problems:

1. `database`, `container` and `browser` **each** build the canonical PostgreSQL image and the
   app image (6 builds per run) — the GHA cache helps but neither removes the cost nor
   guarantees that all three test the same digest.
2. It runs on `push` to develop/main **and** on `pull_request` → the develop→main merge runs the
   same SHA 2–3 times.
3. `retries: 1` in CI hides flakes (there is no flaky report).
4. Inline JS heredocs (not TS, not tested).
5. No CodeQL, OpenSSF Scorecard, zizmor or OSV; Dependabot yes.
6. `release.yml` publishes nothing (`if: ${{ false }}`), no attestation/SBOM/signature.

## Target CI

```text
pr:      static (fmt, lint, types, unit, guard, contract, docs) ─┐
         build-image (1×, push to GHCR with tag sha-<sha>, BuildKit sbom+provenance) ─┬─ db-integration (uses digest)
                                                                                      ├─ container-policy (uses digest)
                                                                                      ├─ e2e [matrix: desktop-3, mobile-2] (uses digest, shard)
                                                                                      ├─ visual (fixed Playwright container)
                                                                                      └─ lighthouse
         component (Vitest browser, chromium+webkit) · mutation (incremental, changed files only)
         gate: required-checks (fail-closed, already exists)
nightly: full mutation · e2e --repeat-each=5 (flake report) · OSV/Scorecard · full visual
```

- Image built **once** and consumed by digest (`docker save` artifact or push to a private GHCR
  with `packages: write` only in that job). It keeps today's guarantee of "testing the exact
  bytes" with a single build.
- Triggers: `pull_request` + `merge_group`; `push` only to `main` for a release candidate.
- Playwright: `retries: 0` on PRs; flakes → quarantine with an issue and a 14-day expiry (same
  policy as the portfolio).
- Move heredocs to `scripts/ci-*.ts` with tests.
- Add `zizmor` (workflow lint), CodeQL (`security-extended`), Scorecard (README badge) [23].
- Target: PR feedback ≤ 6 min p50 including the mobile matrix (parallelism compensates).

## Release and promotion

- The existing flow is kept: task branch → PR to `develop` → authorized `develop→main`
  promotion.
- `release.yml` (when the owner authorizes it): on a `vX.Y.Z` tag on `main` → re-tag the already
  verified digest (no rebuild) → `actions/attest-build-provenance` + SBOM (BuildKit/`syft`) +
  keyless `cosign`; verification documented with `gh attestation verify oci://…` [16].
- Versioning: Conventional Commits already in use → `release-please` for CHANGELOG and version
  (today `package.json` is fixed at 1.0.0, with no CHANGELOG).
- Migrations: an explicit `migrate` job before the rollout (Coolify "pre-deployment command" or
  a manual vps-ops job) using the same image; forward-only, N-1 compatible (expand/contract).

## Deploy readiness (VPS with Coolify, pending)

- Coolify deploys images with a rolling update **only if** there is a healthcheck and no host
  port mapping or custom container name [15]. The image already has a `HEALTHCHECK` against
  `/api/ready` (verifies the DB schema) — correct; separating `liveness` (`/api/health`) from
  `readiness` is done well.
- Checklist for vps-ops (`docs/deployment-contract.md` already covers much of it): typed env
  (fails at boot if anything is missing — today it fails lazily on the first auth request),
  graceful `SIGTERM` (verify that the PG pool closes), `--read-only` + tmpfs `.next/cache`,
  512 MiB memory, JSON logs to stdout, https `BACKOFFICE_ORIGIN`, registered OAuth redirect
  URIs, backups of `portfolio_iam`.
- Rollback runbook: redeploy the previous digest; expand/contract migrations allow an app
  rollback without a schema rollback.

## Observability

- `src/instrumentation.ts` with `@vercel/otel` (works self-hosted with OTLP) [6] → the vps-ops
  collector (Grafana/Prometheus already mentioned in the README). Spans: request, use case,
  upstream HTTP (with `reason`), PG.
- Structured logger (JSON, levels, `requestId`, `route`, `outcome`; **without** emails, tokens or
  raw IPs): own ~40-line implementation or `pino` (see [dependencies](dependencies.md)).
- Metrics: `backoffice_upstream_read_total{feature,outcome,reason}`, upstream latency,
  `auth_admission_total{result}`, `audit_write_failures_total`.
- Request ID: generated in `proxy.ts` (`x-request-id`), propagated to the API in the read header
  for correlation with its traces.
- RUM: not needed (few internal users); lab Web Vitals in Lighthouse CI are enough. Error
  tracking: Next's `onRequestError` → logger/OTel (no vendor).
