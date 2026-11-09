# Portfolio Backoffice master plan v2

Dated 2026-11-09. Baseline: `origin/develop` at `e356b13d81d509e640b3b318c0d37c7b4abcce1c` (default branch `main`, integration branch `develop`, public repository).

**Status: planning only.** Nothing in this folder authorizes code changes, publication, deployment, spend or production changes. The owner decides execution per milestone. Every pull request that executes this plan goes to `develop` through a short task branch and a green `ci-gate`; `main` stays untouched until the single coordinated release at M7.

This plan replaces the v1 plan (October 2026) in place. v1 remains in git history. It applies the [ecosystem standard](ecosystem.md) to this repository and documents only justified deviations.

## Purpose

The Portfolio Backoffice is the private, authenticated operations console for the portfolio website and its RAG assistant: assistant health, runs and traces, usage and estimated cost, site audience analytics, answer feedback, and invited access (Google or GitHub sign-in, owner and viewer roles, Better Auth with a Postgres IAM schema). It never handles visitor conversations. The master plan takes it from a rigorous but generic dashboard (weighted v1 baseline about 76) to a reference-quality instrument: a clear architecture, a complete test net, a one-command quality gate, a shared design standard with the Pequeverso backoffice, and a blue identity of its own.

## Owner requirements

### Ecosystem requirements (binding, from `ecosystem.md` section 2.1)

1. Master plans, one per repo (nine repos; the original requirement text listed fewer), polished to the maximum, grounded in deep 2025-2026 research.
2. "Perpetual excellence": quality does not degrade over time (ratchets, automatic scorecard, cadences).
3. Consistent READMEs across the nine repos.
4. Assistants: a golden set of RAG questions, 100% correct as release gate.
5. Complete testing: unit, integration, mutation, E2E, contract, visual, a11y, performance, security, load, property-based.
6. Agentic harness (skills, reviewers, evals) good enough that the owner does not need to review code.
7. Use the available skills and harness.
8. First-class, consistent containers: LTS versions, same base configuration, same practices.
9. CI at the maximum: dynamic (runs only what is affected), secure, fast.
10. Dependabot identical in all nine: exactly one PR per week per repo.
11. Maximum redesign of both backoffices (designer quality, unique UI/UX, shared view/IA standard, per-project identity).
12. Master UI/UX on both public sites (not applicable to this repo; its sibling site is `portfolio`).

Requirement 4 applies to the API, not to this repository; the backoffice only displays assistant quality data.

### Repository-specific decisions (owner, 2026-11-09)

- **Blue identity.** The portfolio family uses a blue identity ("Instrument blue": ultramarine hue about 262 to cyan about 210, deep navy dark ground, navy ink on cool off-white light). It replaces the graphite base proposed in research 12. The planner has full creative freedom inside the shared structure with the Pequeverso backoffice.
- **Tailwind 4 migration.** Migrate from CSS Modules to Tailwind 4 with a complete semantic token system and owned CVA primitives. This reverses the v1 decision "no Tailwind/CVA" (see PBO-D1).
- Planning only until the owner starts a milestone; `develop` first, one release to `main` at M7; merge only on green CI; never `--admin`.

## Method

1. Read the ecosystem standard, rubrics v2, owner requirements and all 13 research notes (the ten cited ones are copied into `research/`).
2. Measured the repository on 2026-11-09 from `origin/develop` in a temporary export: lint, typecheck, unit with coverage, real-Postgres auth tests, production build, axe on 24 page states, Lighthouse (n=1), Trivy config scan. Docker image build was not possible on the audit machine (BuildKit `buildx` missing), so image-level metrics are not measured. Evidence is in [audit.md](audit.md) and `audit/`.
3. Read every tracked file (320) and assigned each a target in [file-index.csv](file-index.csv).
4. Reused what v1 got right (honesty doctrine, auth model, layer guard with negative fixtures, fail-closed gate, distroless image) and fixed the gaps listed in `owner-decisions.md`: no perpetual-maintenance layer, partial ratchets, no shared standard, weak cross-repo contracts, targets blocked by unauthorized inputs without an offline alternative, drift, missing estimates.
5. Computed the palette contrast and colour-vision separation with a script (WCAG 2 relative luminance; OKLab distance under deuteranopia, protanopia and tritanopia) and recorded the results in [design-playbook.md](design-playbook.md); `scripts/guards/check-tokens.ts` re-asserts them in CI.

## Changes from v1

| Area | v1 (October 2026) | v2 (this plan) | Why |
|---|---|---|---|
| Styling | CSS Modules, "no Tailwind, CVA, Radix" | Tailwind 4, CVA, tailwind-merge, owned primitives, semantic tokens only | Owner decision O4; one stack with the sibling backoffice enables a shared kit; token-only lint is enforceable on utilities |
| Identity | Graphite base, cyan accent | "Instrument blue" family (navy, ultramarine, cyan), light and dark designed separately | Owner decision 2026-11-09 |
| Structure | Phases F0-F4 plus VPS | Ecosystem milestones M0-M8 and MV (MV-R inside M6), each a safe point with a `checkpoint/M<n>` tag | Ecosystem 3A; resumable from any account |
| Scorecard | 14 axes, weighted 76 | Rubrics v2: 8 developer + 6 designer + 7 recruiter axes, no compensation, ratchets and nightly `scorecard.json` | Perpetual excellence, gap 1 and 2 |
| Information architecture | Overview plus in-page anchors, "no sidebar" | Shell and six destinations shared with Pequeverso backoffice (research 12) | Owner requirement 11 |
| Validation | Ajv standalone generated JS | Ajv compiled at start-up from the same JSON Schemas | Zero JavaScript files in the repo (ecosystem 10.1) |
| Tests | `node --test` kept, Vitest only for components | Runner per the DR-09 spike (Vitest 4 preferred), Stryker on risk modules, Testcontainers | Ecosystem 11.2, E7 |
| CI | Single workflow, three builds of the image and three Postgres builds per run, sibling-API clone | Ecosystem profiles, build once, no sibling clone, nightly and weekly jobs | Ecosystem 6.0 |
| Release | Dead `publish` job (`if: false`) | release-please on `develop`, attested image, gated publication | Ecosystem 3.2 and 7 |
| Dependabot | 4 entries, limits 3/2/2/2, partial groups | One weekly multi-ecosystem PR | Owner rule |
| ADR numbers | 008-017 planned, never written | Renumbered 0008-0021 under `docs/decisions/` | Ecosystem 14.2 |
| New | - | Resume brief, progress log, measured palette, perf budget with the Recharts finding, file-by-file index | Brief |

What v1 got right and v2 keeps: the honesty doctrine ("unavailable, never zero"), invitation and revocation model, AST layer guard with negative fixtures, bounded HTTP adapters, runtime IAM role without DDL, fail-closed aggregate gate, SHA-pinned actions, distroless non-root image, bilingual EN/ES dictionaries.

## Decisions

Status: **Owner** = decided by the owner; **Planner** = decided here, owner may overrule; **Resolved (delegated)** = the owner delegated it and the planner resolved it on 2026-11-09; **Owner input** = only the owner can act (see "Decision resolutions and owner inputs").

| ID | Decision | Status | Why | Sources | Alternatives rejected |
|---|---|---|---|---|---|
| PBO-D1 | Migrate CSS Modules to Tailwind 4 with CVA, tailwind-merge and owned primitives; semantic tokens through `@theme inline`; migrate by replacement route by route behind the new shell, not by transliterating CSS | Owner | O4 plus: one stack with `pequeverso-backoffice` (which already runs Tailwind 4.3.3, CVA) lets both consume one kit; utilities make "no literals outside tokens" lintable; v1's "covers the scope with one convention" fails once density, themes, 30+ components and chart tokens arrive; the 1,195 lines of CSS (358 global plus five CSS Modules, 441 of them in `workbench.module.css`) are replaced anyway because every view is redesigned | ecosystem 13, O4; research 06, 12 sec 6.1; Tailwind docs on `@theme inline` (fetched 2026-11-09) | Keep CSS Modules plus a copied kit (no utility lint, divergence from sibling, rewrite cost is the same because views change); shadcn/Base UI as dependencies (O4 forbids a UI-kit dependency); vanilla-extract (new paradigm, no ecosystem fit) |
| PBO-D2 | "Instrument blue" identity: primitives OKLCH hue 262 (ultramarine) travelling to cyan 210, deep navy dark ground, navy ink on cool off-white light, cyan as signal under about 5% of pixels, five signature details | Owner (palette); Planner (values) | Owner preference and creative freedom; values computed and contrast-asserted | `owner-decisions.md`; research 13 sec 3.2, 12 sec 3-4; [design-playbook.md](design-playbook.md) | Graphite base (superseded by owner), warm accent (breaks family identity) |
| PBO-D3 | Keep feature-sliced Clean Architecture (`domain`, `application`, `adapters`, `presentation` per feature) and add the ecosystem backoffice elements: `server/env.ts`, `server/container.ts`, `server/dal/` (authorization enforced here), pure IAM rules in `features/auth/domain`, action pipeline, test that every `"use server"` export authorizes | Planner | The current guard with negative fixtures and 267-line test is the repo's best asset; moving to `server/{domain,adapters}` would be churn without risk reduction (O3). Ecosystem section 9 elements that reduce real risk (single env, DAL authz, composition root) are adopted | ecosystem 9; research 01 sec 1; Next.js data-security guide | Full move to `server/{...}` layout (ceremony); DI framework; repository interfaces for single adapters |
| PBO-D4 | Validate private API payloads with Ajv 8 (2020-12) compiled once at start-up from the committed JSON Schemas, plus generated TypeScript types; privacy invariant test with fast-check (forbidden keys never pass) | Planner | Removes about 630 manual lines (`validate*.ts` 303+185+88+56 lines); keeps the schemas as source of truth. Standalone generation (v1 ADR 010) emits JavaScript, which would break "zero .js files" | ecosystem 10.1, 11.0; v1 research dependencies; Ajv docs | Ajv standalone (JS output), Zod 4 (second schema source), keep hand validators |
| PBO-D5 | Owned primitives on native elements (`dialog`, `popover`, `details`, `meter`, `table`) with small owned hooks; no Base UI, Radix or shadcn dependency. Exit rule: if one owned primitive needs more than 150 lines of focus/keyboard logic and fails its a11y tests, an ADR may adopt one headless library for that primitive | Resolved (delegated) | O4 replaces the research suggestion of Base UI as a dependency; native elements give free semantics and the repo already uses native `dialog` and `details` | ecosystem O4; research 12 sec 2.1 (item 6, allowed set) | Base UI wrapped (research 12 allowed it; O4 narrows), Radix |
| PBO-D6 | Tokens in DTCG JSON (`structure` shared + `pack-instrument` own), built by Style Dictionary v5 into one `theme.css`; shared component kit distributed by copy-sync with `kit.lock.json` and a CI hash check; canonical home `engineering-standards/design-kit/` | Resolved (delegated) | No cross-repo runtime import (invariant 1); one repo (E1) already planned; research 12 sec 6.2 chose copy-sync with registry-compatible layout | ecosystem 13, E14; research 12 sec 6.2 | npm package (runtime coupling), shadcn private registry (hosting, no third consumer), monorepo (E14 revisit at 3+ shared packages) |
| PBO-D7 | Integration tests use Testcontainers with `postgres:18.x-trixie@sha256` (IAM needs no extension). The CI step that clones `portfolio-assistant-api` at a pinned SHA to build its Postgres image is removed. A nightly paired job consumes the API's published Postgres digest when it exists | Planner | The clone couples this repo to another repo's source (stale pin `e6b2e67`), runs three times per run and verifies an image the API owns; ecosystem invariant 1 and 8.2 prefer digest consumption | audit (quality.yml), ecosystem 8.1, 18.1 | Keep the clone (coupling, 6 builds per run); service container with a tag (no digest) |
| PBO-D8 | Test stack: runner chosen once for all four TypeScript repos by the cross-repo spike E7 (DR-09; Vitest 4 preferred if StrykerJS works with TS 7, otherwise `node:test` with the tap-runner; rows below assume the preferred outcome), StrykerJS on risk modules, Playwright E2E with per-role projects, visual regression in the pinned Playwright container, axe 2.2, fast-check, size and Lighthouse budgets | Planner (E7 spike confirms) | Ecosystem 11.2; Stryker's best-supported runner is Vitest; mutation stays on node tests | research 04; ecosystem 11 | Keep `node --test` with tap-runner (two runners per package), Playwright CT (experimental) |
| PBO-D9 | Build the image once per run and pass it as a one-day workflow artifact (`docker save`) to database, container and E2E jobs | Resolved (delegated) | Removes 6 builds per run and guarantees all jobs test the same bytes. v1 rebuilt "because public Actions archives would expose private runtime bytes"; the image contains only public MIT source and no secrets (to be proven by a file-listing test and gitleaks over the image filesystem) | ecosystem 6.1 build once; `docs/ci.md` rationale | Keep three rebuilds with `type=gha` cache; push to GHCR with `:buildcache` (registry write is a publication) |
| PBO-D10 | release-please on `develop`, immutable releases, SBOM (Syft CycloneDX) and provenance through the shared `attest-image.yml`; the dead `publish` job is deleted. Registry push stays disabled until MV (DR-13) behind an owner authorization input and the `production` environment | Resolved (delegated) | Ecosystem 3.2, 7; at M7 evidence is attested on the image tarball, registry-digest attestation follows when the owner authorizes GHCR push | ecosystem 3.2, 7, 18.2; research 05 | Keep `if: false` placeholder (dead code), cosign keyless (not needed while verifier is GitHub) |
| PBO-D11 | Data visualization: server-rendered custom SVG for ProportionBar, BulletBar, Sparkline, Heatmap, Waterfall, HBarList (zero client JS); Recharts 3 retained only for LineChart and ColumnChart behind `ChartFrame`, lazy-loaded on `/usage` and `/analytics`; revisit at M6 if an own-SVG spike is at most 8 KB gz and passes the same a11y tests | Planner | Measured: Recharts chunk is 374 KB raw (about 108 KiB gz) on `/`, dashboard mobile Lighthouse 60, TBT 3,890 ms | audit Lighthouse; research 12 sec 2.9, 6.4 risk 5 | Replace Recharts everywhere now (more upfront cost, no measured need); keep Recharts on `/` (fails budget) |
| PBO-D12 | Theme, density and locale live in server-readable cookies rendered into `<html data-theme data-density lang>`; the pre-paint inline script is deleted; CSP uses a per-request nonce | Planner | Removes the only inline script, enables strict CSP, fixes the fixed `lang="en"` | Next.js CSP guide; ecosystem 13 (cookie to avoid FOUC) | Inline script with SHA hash (works, keeps FOUC logic in JS) |
| PBO-D13 | Observability: own 50-line JSON logger with an allowlist of fields, `x-request-id` created in `proxy.ts`, OpenTelemetry through `@vercel/otel` with the exporter off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set | Planner | No PII by construction; no `pino` bundling problems in Next standalone (unverified, would be spiked); Phase V wires the collector | ecosystem 17; Next.js OTel guide | `pino` (fallback if the owner prefers), full NodeSDK |
| PBO-D14 | Information architecture of research 12 (shell plus six destinations: Overview `/`, Runs `/runs` and `/runs/[id]`, Usage `/usage`, Audience `/analytics`, Feedback `/feedback`, Access `/access` and `/access/audit`, account in user menu) shipped as release 2.0.0 | Resolved (delegated) | Owner requirement 11; routes are new, `/analytics` and `/access` keep their paths | research 12 sec 2.2 | Keep one scroll |
| PBO-D15 | Node 26 LTS after a two-week 24/26 matrix; stay on 24 if a dependency lags | Resolved (delegated) | Ecosystem 8.1 | ecosystem 8.1, E10; research 11 | Stay on 24 until 2028 |
| PBO-D16 | Enable GitHub private vulnerability reporting and make `SECURITY.md` point to it; remove the personal mailbox from the file | Owner input | Ecosystem 14.2; the policy currently states PVR is not enabled | ecosystem 14.2 | Keep mailbox only |
| PBO-D17 | Ask `portfolio-assistant-api` for a historical operations contract (daily series, run list beyond the sample) as a separate API improvement; until then the range control is a read-only window label and no trend is invented | Resolved (delegated) | Trends and deltas cannot be honest without history; v1 recommended the same | v1 roadmap risks; research 12 sec 2.6 | Synthesize trends (violates invariant 5) |
| PBO-D18 | One weekly Dependabot PR (multi-ecosystem group, `patterns: ["*"]`), shared `deps-weekly-guard`; delete `dependency-policy.yml` (it uses `pull_request_target`) and its 669-line scripts and 639-line test | Planner | Owner rule; fewer privileged triggers; zizmor-clean | `shared/dependabot-rule.md`, ecosystem 5, 6.4 | Keep custom policy |

## Decision resolutions and owner inputs

| ID | Question | Recommendation |
|---|---|---|
| PBO-D9 | Confirm that the CI image artifact (public MIT source, no secrets) may be uploaded as a one-day workflow artifact | Resolved (delegated, 2026-11-09): yes; the CI image artifact (public MIT source, no secrets) may be uploaded as a one-day workflow artifact; rebuild-with-cache is the fallback |
| PBO-D10 | Authorize pushing the image to `ghcr.io/gonzalomartinperez/portfolio-backoffice` (private package) at M7, without deploying | Resolved (delegated, 2026-11-09): no GHCR push at M7 (DR-13): the release-candidate image is built with SBOM and provenance and kept as a CI artifact (MV-R); registry publication and deploy are activated by the owner in one step at MV |
| PBO-D14 | Approve the new route structure and release `2.0.0` | Resolved (delegated, 2026-11-09): approve the new route structure and release `2.0.0` (the M7 promotion itself remains an owner touchpoint) |
| PBO-D16 | Enable private vulnerability reporting; confirm removing the personal address from `SECURITY.md` | **Owner input needed** (GitHub repository setting only the owner can change): enable private vulnerability reporting; the planner removes the personal address from `SECURITY.md` once enabled |
| PBO-D17 | Approve asking the API repo for a historical operations contract | Resolved (delegated, 2026-11-09): yes, as a separate API ticket after M3 |
| PBO-D6 | Agree with the Pequeverso backoffice plan that the kit lives in `engineering-standards/design-kit/` (needs E1) | Resolved (delegated, 2026-11-09): yes; the kit lives in `engineering-standards/design-kit/` (E1, DR-03) |
| PBO-D5 | Confirm that no headless UI library is adopted unless the exit rule triggers | Resolved (delegated, 2026-11-09): yes; no headless UI library unless the exit rule triggers |
| E10 / PBO-D15 | Node 26 flip after the matrix | Resolved (delegated, 2026-11-09): Node 26 LTS after two weeks of dual CI (DR-10) |

### Owner inputs still needed

1. PBO-D16: enable GitHub private vulnerability reporting on the repository.
2. MV: VPS purchase and activation authorization (OD-64; owner steps are purchase, DNS and secret entry only).

## Limits

- The ZAP baseline and five-browser nightly are advisory (warn-only, not gates) until MV; the PR-level gates stay enforcing.

- Scores marked provisional are planner estimates from criterion evidence; the first independent evaluator run (M2) replaces them. A criterion without evidence is unmet.
- Not measurable now: image size, image CVEs, container-structure behaviour (no BuildKit on the audit host), field Web Vitals, live OAuth, production API pairing, backups (all VPS or tooling gated). Observability keeps floor 90 until MV (see [scorecard.md](scorecard.md)).
- Lighthouse numbers are n=1 lab runs against a localhost fixture; CI uses 5 runs and the median.
- Effort is agent-hours with parallel agents, not calendar time. Library versions and health are checked at ADR time, not guaranteed here.
- Unverified until a spike proves them: Tailwind 4 with a JSON PostCSS config under Next 16 webpack, Style Dictionary v5 with DTCG 2025.10 and OKLCH values (the docs say 2025.10 support is still in progress), CSS anchor positioning in all three engines, Stryker with TS 7, Node 26 with Next 16.4 and `next/font/local`, `x-request-id` through Coolify's proxy.

## Index

| File | Contents |
|---|---|
| [scorecard.md](scorecard.md) | Baseline per axis and lens, targets, measurement, ratchets |
| [rubrics.md](rubrics.md) | Rubrics v2 (byte-identical copy) plus repo notes |
| [audit.md](audit.md), `audit/` | Measured baseline and findings P0-P2 |
| [target-state.md](target-state.md) | Target architecture, guards, TypeScript policy, ADRs, migration order |
| [design-playbook.md](design-playbook.md) | Instrument blue, shell, templates, components, data-viz, motion, gates |
| [testing.md](testing.md) | Full test catalog mapped to this repo |
| [ci-cd.md](ci-cd.md) | CI profiles, `ci-profile.json`, container, release, Dependabot |
| [file-index.csv](file-index.csv), [file-moves.md](file-moves.md) | Every tracked file and its target; moves with motive |
| [standards.md](standards.md) | Style and enforcement |
| [docs-and-community.md](docs-and-community.md) | README outline, Diataxis, community files |
| [skills.md](skills.md) | Skills audit, new skills, activation evals |
| [dependencies.md](dependencies.md) | Current and proposed dependencies |
| [roadmap.md](roadmap.md) | M0-M8 and MV checklists (MV-R inside M6) |
| [ecosystem.md](ecosystem.md) | Ecosystem standard (byte-identical copy) |
| [owner-decisions.md](owner-decisions.md), [owner-decisions-existing.md](owner-decisions-existing.md), [readme-template.md](readme-template.md) | Owner decisions register, decisions taken before 2026-11-09, README template (byte-identical copies) |
| [progress.md](progress.md), [RESUME.md](RESUME.md) | Milestone log and session-independent resume brief |
| `research/` | Cited research notes 01, 04, 05, 06, 08, 09, 10, 11, 12, 13 |
| [sources.md](sources.md) | External sources |
