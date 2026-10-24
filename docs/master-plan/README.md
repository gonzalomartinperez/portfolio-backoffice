# Master plan · October 2026

**Status: planning only.** This plan documents an audit and a target state for the Portfolio
Backoffice. Nothing here is scheduled or authorized for execution; the owner decides if and
when each phase starts. It does not authorize code changes, image publication or deployment.

Ecosystem context (portfolio, assistant API and backoffice as one system) is maintained in the
portfolio repository:
[docs/master-plan/ecosystem.md](https://github.com/gonzalomartinperez/portfolio/blob/develop/docs/master-plan/ecosystem.md).

| Document | Contents |
| --- | --- |
| [roadmap.md](roadmap.md) | Phases F0–F4 and the gated VPS phase, acceptance criteria, effort, risks |
| [scorecard.md](scorecard.md) | Baseline per axis (≈ 76/100 weighted) and targets |
| [rubrics/](rubrics/README.md) | Fixed senior developer, senior designer and senior recruiter rubrics |
| [research/baseline-audit.md](research/baseline-audit.md) | What was measured and findings by area |
| [research/target-architecture.md](research/target-architecture.md) | Clean Architecture target, guard rules G1–G7, ADRs 008–017, file index |
| [research/design-and-dataviz.md](research/design-and-dataviz.md) | Dashboard hierarchy, data-viz rules, color, shared design system, motion, mobile |
| [research/security.md](research/security.md) | Security hardening plan |
| [research/testing.md](research/testing.md) | Testing strategy, including Vitest Browser Mode and Stryker |
| [research/delivery-and-observability.md](research/delivery-and-observability.md) | CI/CD, release, deploy readiness, observability |
| [research/standards-docs-skills.md](research/standards-docs-skills.md) | Code standard, docs, community files, agent skills |
| [research/dependencies.md](research/dependencies.md) | Vetted dependency plan |
| [research/sources.md](research/sources.md) | Audited files and external sources |

## Rationale

The backoffice is already far more rigorous than the average portfolio project (invited
Google/GitHub access, atomic single-use invitations, revocation, CSRF/origin checks, runtime
IAM role without DDL, "unavailable, never zero", AST layer guard, fail-closed CI, distroless
non-root image). Its weighted baseline is **≈ 76/100** because of four fronts a senior reviewer
notices within minutes: generic dashboard design/UX, an anemic application layer with scattered
composition, missing experience testing (components, visual, mobile, mutation) and incomplete
delivery/operations (publication off, unversioned migrations, no observability). See the
[baseline audit](research/baseline-audit.md).

## Owner requirements

- **Planning only** until the owner decides to execute.
- **95 or more on every axis** of the [scorecard](scorecard.md), judged through senior
  developer, senior designer and senior recruiter lenses with **fixed rubrics**
  ([rubrics](rubrics/README.md)).
- **TypeScript everywhere**: no new JavaScript source; embedded JS in workflows and the
  Dockerfile moves to `scripts/*.ts` (the pre-paint theme script stays inline, covered by a CSP
  hash and a test).
- **Design tokens shared with the portfolio**, and **light mode at dark-mode quality**.
- **Cross-browser and mobile quality, including iPhone Safari** (WebKit `iPhone 15` profile and
  real-device checks).
- **Any justified library is allowed**; each addition states its justification and rejected
  alternative ([dependencies](research/dependencies.md)).
- **VPS-gated activation**: the VPS has not been purchased; publication and deployment stay
  disabled until it exists and the owner authorizes them
  ([VPS phase](roadmap.md#vps-phase--activation-gated)).

## Method

- Read-only audit of `origin/develop` at `c86816c` (2026-10-18, identical to `main` after
  PR #99) on 2026-10-24. Checks ran in a temporary export without secrets (lint, format,
  typecheck, 142 unit tests, security/docs/skills/license checks, production build, coverage,
  last 15 CI runs).
- Not executed: auth integration (isolated PostgreSQL), Playwright (image + database),
  Lighthouse; they are F0 measurements.
- Evidence labels: **[measured]**, **[code]**, **[hypothesis]** (requires measurement before
  acting) and numbered [sources](research/sources.md).
- Where the portfolio plan already decided a criterion (DTCG tokens, Stryker, axe 2.2,
  Lighthouse CI, Google TS with adaptations), it is reused so both repositories read as one
  system.

## Decisions and reasons

| Decision | Reason | Sources |
| --- | --- | --- |
| Per-feature Clean Architecture with Ports & Adapters and a single server-only composition root | Fixes the anemic application layer and scattered `process.env` reads; enforced by guard rules G1–G7 | [30][31], [target architecture](research/target-architecture.md) |
| Authorization in use cases (Data Access Layer) with transactional re-check; proxy only for headers and optimistic redirects | Next.js and OWASP guidance for Server Components and Actions | [1][2][4] |
| Generated contract validators from the existing JSON Schemas (Ajv standalone) | The schemas are already the API's source of truth; removes ~630 manual lines | [22], [18] for the Zod alternative |
| Keep `node --test` for unit/policy; add Vitest 4 Browser Mode only for components and dataviz | Browser Mode is stable in Vitest 4; jsdom does not test real layout/SVG | [10] |
| StrykerJS with the tap-runner over `node --test` | Mutation testing without migrating the existing suite | [8][9] |
| Playwright device projects (`iPhone 15`, `Pixel 7`) and `toHaveScreenshot` in a fixed container | Cross-browser/mobile requirement; deterministic visual regression | [11] |
| axe with `wcag22aa` plus own checks and a manual screen-reader script | WCAG 2.2 target size, focus not obscured and non-text contrast | [19] |
| Data-viz forms chosen by question; proportion bar, bullet budget, shared-axis waterfall; no invented trends | Current chart duplicates its table; "unavailable ≠ 0" | [12][13][14][17] |
| DTCG tokens owned by the portfolio, generated and committed here with a drift check | Shared identity without a cross-repository runtime dependency | [21] |
| CSS Modules + owned primitives; no Tailwind/shadcn/Radix/second chart library for now | Covers the scope with one styling convention; any addition needs an ADR | [dependencies](research/dependencies.md) |
| CSP with a hash (or nonce) for the theme script, HSTS, append-only audit, ASVS 5.0 L2 mapping | Closes the top security gaps found in the audit | [3][4][7] |
| Build the image once, consume it by digest; zizmor, CodeQL, Scorecard; attested and signed releases (gated) | Removes the triple build and adds supply-chain evidence | [16][23] |
| `@vercel/otel`, structured logs without PII, request ID propagated to the API | Self-hosted observability with official support | [6] |
| Google TypeScript Style Guide as the readability reference | Microsoft publishes no style guide for user projects | [20] |
| Coolify rolling updates rely on the existing healthcheck and the liveness/readiness split | Coolify requires a healthcheck and no host port mapping or custom container name | [15] |

## Open owner decisions

| Decision | Options | Recommendation |
| --- | --- | --- |
| When to execute | start F0 now · wait | Planning only until the owner decides; F0 is the low-risk entry (no visible changes) |
| Contract validation (ADR 010) | Ajv standalone · Zod 4 | Ajv standalone: the JSON Schemas are already the source of truth |
| Logger (ADR 016) | own ~40-line logger · `pino` | Decide in ADR 016; both meet the no-PII JSON requirement |
| Migrations (ADR 015) | `node-pg-migrate` · own runner (< 80 lines, tested) | Either; Prisma/Drizzle are not justified because Better Auth manages its schema |
| Invitation token transport | fragment (`#t=`) consumed by a same-origin POST · keep the query and filter it in Traefik/Coolify logs | Document the choice in an ADR; the fragment avoids proxy logs |
| HSTS location | in the app · declared as set by the Coolify proxy | In the app (idempotent with Traefik) |
| Re-authentication for sensitive actions (revoke) | add · skip | Optional; it is what an ASVS V7/V8 reviewer looks for [3] |
| Consumer-driven contract | `consumer-fields.json` check run by the API · Pact | `consumer-fields.json`; Pact only if a showcase is wanted |
| Shell navigation | collapsible side nav (≥ 1100) · top nav | Either; no sidebar without real destinations, per the existing [design research](../research/operations-dashboard.md) |
| Product name and local checkout | "Portfolio Backoffice" + rename checkout to `portfolio-backoffice` · keep | Unify on "Portfolio Backoffice" and rename the checkout |
| Historical metrics | request a historical contract from the API · snapshot only | Request it as a separate API improvement; until then show "No trend data" |
| Release versioning | `release-please` + CHANGELOG · manual | `release-please`; Conventional Commits are already in use |
| Image publication and deployment | enable · keep gated | Keep gated until the VPS exists and the owner authorizes it |

## Limits

- Scores are an audit baseline against fixed criteria; they are not a certification.
- Auth integration, Playwright and Lighthouse were not run for the baseline; the client JS
  per-route split is a [hypothesis] until F0 measures it.
- Effort estimates are approximate and assume one engineer.
- Trends and deltas depend on a historical API contract that does not exist yet.
- Deployment items cannot be verified until the VPS exists; vps-ops owns Coolify and shared
  production resources.
- External sources were consulted on 2026-10-24 and may change.
