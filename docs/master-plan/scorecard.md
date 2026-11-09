# Scorecard

Rubrics v2 ([rubrics.md](rubrics.md), frozen) applied to `portfolio-backoffice` at `e356b13` (2026-11-09). Target: **95 on every axis**, no compensation across axes. Floor **90** only for D7 (observability) until MV, because live logs, SLO dashboards and the collector need the VPS (not purchased). No other axis depends on an unauthorized input, so no other floor is claimed.

How the baseline was scored: each critical (C) criterion is checked against evidence in [audit.md](audit.md). Rubric rule: below 85 means a critical criterion is unmet; 85-94 means all critical criteria met; a failing required check caps a lens at 70 (none fails today; CI is green). **Baselines marked "prov." are planner estimates from criterion evidence**; the independent evaluator agent replaces them at PBO-M2 (judgement axes P and R) and the nightly `scorecard.json` replaces them for automatic axes. Baseline column values are calibrated to the unmet critical criteria listed; they are not precise to the point.

## Lens 1: senior developer

| Axis | Baseline | Evidence and unmet critical criteria | Target | Automatic measurement | Ratchet file |
|---|---|---|---|---|---|
| D1 Architecture | 72 prov. | Met: AST guard with negative fixtures (`tests/unit/boundaries.test.ts`, 267 lines), zero violations. Unmet C: no composition root (16 `process.env` reads in 6 files), `/access` page reads the store directly, no DAL, no use-server auth test | 96 | `scripts/guards/check-boundaries.ts` output (rules G1-G10), baseline file empty, negative fixtures run | `quality/ratchets/guards.json` (violations must stay 0) |
| D2 Code quality | 78 prov. | Met: TS strict, `erasableSyntaxOnly`, `exactOptionalPropertyTypes`, 0 lint errors, 0 type errors. Unmet C: no complexity measurement or ratchet, no dead-code check (knip), dead `publish` job | 95 | Biome and `tsc` counts, Biome complexity rule `noExcessiveCognitiveComplexity` (max 10, ratcheted), knip | `lint-types.json`, `complexity.json`, `knip.json` |
| D3 Tests | 66 prov. | Met: unit 142/142, branch coverage 88.3 (floor 80), real-DB auth test, contract check, 66 browser cases on 3 engines. Unmet C: no mutation, no diff coverage, no flake measurement, 1 skipped integration test, 0 component tests, `.tsx` unmeasured | 95 | Vitest coverage (branch floor 80, 90 on auth/permissions), diff coverage 90 on auth and 80 elsewhere, Stryker break 70 (permissions 85), flake detector nightly | `coverage.json`, `mutation.json`, `flaky.json` |
| D4 CI/CD | 68 prov. | Met: one aggregate required gate that fails closed (`Required checks`), SHA-pinned actions, p50 3.5-6 min [v1]. Unmet C: not dynamic, triple build, weekly single Dependabot PR rule (limits 3/2/2/2) | 95 | `ci-gate` result, `classify` output, duration report (p50 6 min, p95 12 min), Dependabot guard | `ci-duration.json` |
| D5 Security and supply chain | 62 prov. | Met: SHA pins, `permissions: contents: read`, credentials not persisted, redacted secret scans, runtime IAM role without DDL. Unmet C: zizmor, CodeQL, SBOM and provenance, vulnerability SLA policy, threat model (ASVS mapping), `pull_request_target` workflow, CSP without `script-src`, mutable audit | 95 | zizmor, CodeQL, gitleaks, osv-scanner, Grype on image, SBOM present, ASVS control-to-test map check, header snapshot test | `security.json` |
| D6 Performance | 55 prov. | Unmet C: no budgets enforced in CI; `/` mobile Lighthouse 60, TBT 3,890 ms; Recharts 374 KB raw on `/` | 95 (budgets) | Lighthouse CI (5 runs, median) per route, per-route first-load JS from `.next` manifest via `scripts/ci/check-bundle.ts`, TBT | `bundle.json`, `lighthouse.json` |
| D7 Observability | 38 | Met: liveness and readiness split. Unmet C: no structured logs, no request id, no SLOs, readiness without version | 95; **floor 90 until MV** | log redaction test, request-id propagation test, `/api/ready` contract test, SLO document check; live parts at MV | `observability.json` |
| D8 Docs and DX | 72 prov. | Met: strong README with real gallery, 6 ADRs, community basics (LICENSE, SECURITY, CONTRIBUTING). Unmet C: README template, CHANGELOG, `npm run check` one-command, CODEOWNERS and issue forms, skill activation evals, ADR path | 95 | README heading check, `docs:check`, skills check with evals, AGENTS.md command test, CHANGELOG presence by release-please | `docs.json` |

## Lens 2: senior product designer (web app; both themes and both locales scored, minimum counts)

| Axis | Baseline | Evidence and unmet critical criteria | Target | Automatic measurement | Ratchet file |
|---|---|---|---|---|---|
| P1 Visual design and system | 68 prov. | Met: semantic token vocabulary, self-hosted fonts. Unmet C: DTCG source, fluid type scale, lint for literals (styles are hand CSS with hex values), three styling vocabularies (global, Modules, inline) | 96 | `check-tokens.ts` (DTCG validity, contrast and CVD asserts, no literals), snapshot of generated `theme.css` | `tokens.json` |
| P2 Interaction and motion | 72 prov. | Met: reduced motion emulated in tests, 140/320 ms durations. Unmet C: loading/empty/error for every async view (no `loading.tsx`, `error.tsx`), tested motion rules | 95 | Playwright state matrix per view, reduced-motion test, motion token lint (transform and opacity only) | `states.json` |
| P3 Accessibility | 84 prov. | Met: axe 0 violations on 24 states, Lighthouse a11y 100, skip link, native dialog, table twins. Unmet C: WCAG 2.2 rules not asserted, ES and viewer role not in axe matrix, target-size and zoom reflow not asserted, no manual screen-reader record | 96 | axe with `wcag22aa` on every route x theme x locale x role, Lighthouse a11y 1.0, reflow test at 200% and 400%, manual checklist per release | `a11y.json` |
| P4 Responsive and cross-browser | 72 prov. | Met: Chromium, Firefox, WebKit desktop, no overflow at 390/768/1440. Unmet C: iPhone profile, 320 px and 1920 px, visual regression baseline | 95 | Playwright projects (Chromium, Firefox, WebKit iPhone, Pixel), `toHaveScreenshot`, overflow assertion | `visual.json` |
| P5 Theme parity | 74 prov. | Both themes exist and are tested; dark feels native, light is a port (research 12 critique); SEO n/a | 95 (within 2 points) | each lens axis computed per theme; the scorecard takes the minimum | in `a11y.json` and `visual.json` per theme |
| P6 Consistency and identity | 70 prov. | Met: owned Button, coherent honesty copy. Unmet C: shared primitives beyond Button, shared standard with the sibling backoffice, identity beyond generic cyan-on-graphite | 95 | kit lock hash check, component inventory test (every primitive has all states in `/__kit`), evaluator rubric | `kit.lock.json` |

## Lens 3: senior recruiter (public repository as a showcase)

| Axis | Baseline | Evidence | Target | Automatic measurement | Ratchet |
|---|---|---|---|---|---|
| R1 First-screen clarity | 80 prov. | README opens with a one-line value and a gallery; long "current state" disclaimer block first | 95 | README heading and length check (value line in the first 5 lines, no disclaimer block) | `docs.json` |
| R2 Proof (measured results) | 82 prov. | Real gallery, verification reports, 142 tests; no live demo possible (private app) | 95 | Quality section generated from `scorecard.json`; gallery images present in both themes | `docs.json` |
| R3 Writing quality | 78 prov. | Accurate but defensive and dense; em-dash cleanup already merged | 95 | Vale on English prose, markdownlint | `docs.json` |
| R4 Credibility | 88 prov. | Honest provenance labels (synthetic, real Postgres, unverified live OAuth); no volatile-fact hygiene | 96 | no-volatile-facts check, links, dated evidence | `docs.json` |
| R5 Calls to action | 70 prov. | No clear "run it in one command" or "read the architecture in 2 minutes" path | 95 | Quickstart command executed in CI (`docs-quickstart` job) | `docs.json` |
| R6 Polish | 75 prov. | Generic dashboard look, unfinished IAM page | 95 | Evaluator rubric on screenshots | n/a |
| R7 Differentiation | 70 prov. | Strong engineering rigor hidden behind a generic UI | 95 | Evaluator rubric (identity checklist in [design-playbook.md](design-playbook.md)) | n/a |

## Weighted view (informational only; targets are per axis)

v1 weighted 76 with its own axes. Under rubrics v2 the simple mean of the 21 provisional baselines is about 71; it is not used for any gate.

## Ratchets

Directory `quality/ratchets/` (committed JSON, one file per metric above). A ratchet only tightens: values move in the favourable direction in the same PR that improves them; loosening needs an ADR and the owner. Initial values are written at PBO-M2 from the first full nightly. Starting thresholds known today: branch coverage 88.28 (floor 80), unit tests 142, `/` mobile perf 60 (to be superseded by the gate in PBO-M3), guard violations 0, lint errors 0, type errors 0, axe violations 0 on 24 states.

## Scorecard tooling and cadence

| Item | Rule |
|---|---|
| Tool | `scripts/scorecard/run.ts` aggregates CI artifacts (coverage, Stryker report, Lighthouse, axe, bundle manifest, guard output, token check, security scans, docs checks) into `scorecard.json` with per-criterion pass/fail for rubrics v2 |
| Nightly | Full run on `develop`; fails on regression against the ratchet files; publishes the JSON as an artifact and updates the README Quality block through a PR only at release |
| Release | Same run on the `develop` to `main` PR (profile `release`) |
| Judgement axes (P, R) | Independent evaluator agent per release and at M2, M5, M6, with screenshots per theme x 3 viewports x states; fresh-agent or human re-audit quarterly |
| Evidence rule | Every score cites CI run URL, commit SHA and date; a criterion without evidence is unmet |
| Reach 95 | Expected by M6 on two consecutive nightly scorecards (ecosystem 3A) |

## Repo notes on the rubrics

`rubrics.md` is a byte-identical copy of the ecosystem rubrics and carries no repo text. Applicability notes for this repository:

- D6 Performance has no field (RUM) component: the app is private, authenticated and `noindex`. The lab budgets are the evidence; field timings arrive at MV from server-side metrics only. Lighthouse SEO is not budgeted; the test asserts `noindex` instead.
- D7 Observability: the criteria "request id propagation" and "health/readiness" are measurable before MV; "SLOs defined" is a document plus alert rules in `vps-ops`; live dashboards need the VPS, hence the stated floor of 90 until MV.
- P5 Theme parity: both themes and both locales are scored; the minimum counts.
- Lens 3 for this repo is the recruiter lens (public repository as showcase), seven axes R1-R7 from the rubric's list: first screen clarity, proof, writing quality, credibility, calls to action, polish, differentiation.
- Caps: a committed secret caps D5 at 40; a contract break without the major-version path caps D1 at 60 (the four consumed API snapshots are the contracts at risk).

## D6 budget to 95 mapping

D6 reaches 95 when all of these hold on two consecutive nightly scorecards: (1) budgets enforced in CI since PBO-M2-9 (critical criterion C), starting at the measured ratchet values; (2) `/` mobile Lighthouse median at least 85 and sign-in mobile at least 90 from PBO-M3-2 and PBO-M3-8 (acceptance of M3); (3) per-route first-load JS at most 170 KB gz excluding the lazy chart chunk (`check-bundle.ts`, M3, final at PBO-M5-11); (4) TBT at most 300 ms (warn) and CLS at most 0.05; (5) the Recharts decision recorded (PBO-M6-4). Any unmet item caps D6 below 95.
