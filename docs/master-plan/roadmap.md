# Roadmap

**Planning only.** No phase starts until the owner decides to execute it. Effort figures are
the audit's estimates for one engineer; they are not commitments. Each phase ends with a
[scorecard](scorecard.md) re-score using the fixed [rubrics](rubrics/README.md).

| Phase | Focus | Effort | Depends on |
| --- | --- | --- | --- |
| F0 | Guardrails and measurement | ≈ 1 week | — |
| F1 | Architecture and contracts | ≈ 2 weeks | F0 |
| F2 | Design system, app shell and data-viz | ≈ 2–3 weeks | F1 |
| F3 | Experience and security testing | ≈ 2 weeks | overlaps F2 (components) |
| F4 | Delivery, observability and showcase | ≈ 1–2 weeks | independent, except publication |
| VPS | Activation | not estimated | VPS purchase + owner authorization |

## F0 · Guardrails and measurement (≈ 1 week, no visible changes)

- E2E RBAC matrix and header snapshots; axe with `wcag22aa`; mobile Playwright projects
  (`iPhone 15`, `Pixel 7`); capture baseline (no gate); Lighthouse CI in report mode; bundle
  analyzer; `src` coverage reported separately from `scripts`.
- **Acceptance**: CI green with the new projects; baseline report committed in
  `docs/verification/baseline-2026-11.md` (LH, JS per route, axe 2.2, `src` coverage).

## F1 · Architecture and contracts (≈ 2 weeks)

- `server/config.ts` + `container.ts` + `request-context.ts`; use cases (`getOverview`,
  `listAccess`, `inviteViewer`, `revokeAccess`, `getInteractionsReport`); split repositories;
  generated validators (Ajv standalone); rules G1–G7; `Metric<T>`; `shared/format` + `es-419`;
  versioned migrations + `0002_audit_append_only`; `audit` feature.
- **Acceptance**: guard without exceptions; 0 `process.env` outside config; domain/application
  100 % lines and mutation ≥ 80 %; integration: the runtime role cannot `UPDATE/DELETE` audit;
  contract: examples accepted and mutated corpus rejected; no visual changes (visual diff = 0).

## F2 · Design system, app shell and data-viz (≈ 2–3 weeks)

- Shared DTCG tokens + scales; primitives; app shell with status strip;
  `loading/error/not-found`; per-section streaming; redesigned overview (KPI row, proportion
  bar, bullet budget, trace waterfall); interactions with filter chips, localized axis, heatmap
  with legend; access with tables + audit; icon/favicon; script-validated palette; functional
  motion.
- **Acceptance**: visual baseline approved in 2 themes × 2 locales × 2 viewports × 2 engines;
  axe 0 violations (2.2); series contrast ≥ 3:1 (script); 5-second test with 3 people
  ("is it healthy?", "how much is left?") ≥ 3/3 correct; no `.tsx` > 200 lines; Lighthouse
  a11y 100.

## F3 · Experience and security testing (≈ 2 weeks)

- Vitest browser for every state of every view; incremental Stryker on PRs + full nightly;
  visual regression as a gate; complete security suite
  ([security tests](research/testing.md#security-tests)); CSP with hash + HSTS; limited and
  deduplicated invitations; active sessions + "sign out everywhere"; owner binding.
- **Acceptance**: mutation ≥ 85 %; 0 flakes with `--repeat-each=5` × 5 projects; 0 CSP errors;
  `docs/security-controls.md` with every applicable ASVS L2 control mapped to a test.

## F4 · Delivery, observability and showcase (≈ 1–2 weeks)

- CI with a single build per digest, matrix and nightly; zizmor/CodeQL/Scorecard;
  `release.yml` with attestation + SBOM + cosign (gated by the owner); release-please +
  CHANGELOG; OTel + JSON logs + request ID; deploy/rollback runbook for vps-ops; README/doc
  curation, community files, unified naming; updated skills + 4 new ones with evals.
- **Acceptance**: PR p50 ≤ 6 min; Scorecard ≥ 8; `gh attestation verify` documented and tested
  in a dry-run; traces visible in a local collector (verification docker compose); README
  readable in < 60 s (test with 2 non-technical people); scorecard re-evaluated ≥ 95 on every
  axis.

Dependencies: F1 before F2 (the new views consume use cases/`Metric<T>`); F3 overlaps F2 in the
component part; F4 is independent except for publication (requires explicit owner
authorization, as today).

## VPS phase · Activation (gated)

The VPS has **not been purchased yet**. Until it exists and the owner authorizes activation,
everything deploy-related stays "ready" with local verification of the image, and publication
stays disabled (`release.yml` remains gated). Private vps-ops owns Coolify and shared production
resources; this repository only prepares the tested image and runtime contract.

- **Entry conditions**: VPS purchased and provisioned by vps-ops; separate explicit owner
  authorization for image publication and for production deployment.
- **Scope**: enable publication of the already verified digest (re-tag, no rebuild) with
  attestation/SBOM; vps-ops checklist from
  [deploy readiness](research/delivery-and-observability.md#deploy-readiness-vps-with-coolify-pending)
  (typed env, graceful `SIGTERM`, `--read-only` + tmpfs, 512 MiB, JSON logs, https origin,
  OAuth redirect URIs, `portfolio_iam` backups); explicit `migrate` job before rollout; OTel
  pointed at the vps-ops collector.
- **Acceptance** (no effort estimate in the audit): Coolify rolling update works with the image
  healthcheck; `gh attestation verify` passes on the published digest; rollback to the previous
  digest rehearsed; live OAuth, effective proxy headers (CSP/HSTS) and backup/restore recorded
  as production evidence, separate from synthetic and fixture evidence.

## Risks

| Risk | Mitigation |
| --- | --- |
| Refactor breaks auth guarantees | strangler per feature behind the guard; E2E RBAC matrix before moving anything (F0) |
| Visual regression flaky because of fonts/OS | fixed Playwright container, self-hosted fonts, frozen clock, animations off |
| Shared tokens create coupling between repositories | committed generated file + drift check against a pinned commit; no runtime dependency |
| Recharts limits accessibility or CSP | encapsulated in `shared/dataviz`; simple forms (proportion/bullet) in own SVG without Recharts |
| No historical data from the API → "poor" dashboard | design for an honest snapshot; request a historical contract from the API as a separate improvement (do not invent trends) |
| Coolify/VPS not provisioned yet | everything deploy-related stays "ready" with local verification of the image, without enabling publication without authorization |
