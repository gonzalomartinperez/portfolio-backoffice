# Scorecard

Baseline measured on 2026-10-24 against `origin/develop` at `c86816c`. Criterion: senior
developer (SD), senior designer (DS) and senior recruiter (RC). **95 = defensible in a
demanding technical review and in a visual product review, with automated evidence.**

Owner requirement: **95 or more on every axis**, under each applicable lens, scored with the
fixed [rubrics](rubrics/README.md). A weighted total of 95 does not compensate for an axis
below 95.

| # | Axis | Weight | Baseline | Key evidence | Target | Primary lenses |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Visual design and design system | 10 | **72** | own tokens without type/spacing scales; 3 styling languages; inconsistent header | 95 | DS, RC |
| 2 | Dashboard UX and data-viz | 12 | **66** | redundant chart, no status strip, no trends, raw ISO, no app shell | 95 | DS, RC |
| 3 | States (empty/loading/error, unavailable ≠ 0) | 6 | **82** | rule done well; `loading/error.tsx`, streaming and a visible reason missing | 97 | DS, SD |
| 4 | Responsive and cross-browser/mobile | 6 | **76** | no device projects; stacked mobile header | 95 | DS, SD |
| 5 | Accessibility (WCAG 2.2 AA) | 8 | **80** | axe without 2.2, no real screen reader, series contrast not validated | 97 | DS, SD |
| 6 | Auth/security | 12 | **84** | exemplary invitations/revocation; partial CSP, mutable/incomplete audit | 96 | SD |
| 7 | Code quality | 8 | **80** | strict TS; long components, manual validators, drift | 95 | SD |
| 8 | Architecture | 10 | **78** | layers + guard; anemic application layer, scattered composition | 96 | SD |
| 9 | Tests | 10 | **70** | 142 unit; 0 component/visual/mutation/mobile | 95 | SD |
| 10 | CI reliability and efficiency | 6 | **82** | fail-closed, pinned; triple build, retries mask flakes | 96 | SD |
| 11 | Release/deploy readiness | 5 | **58** | publish off, no attestation/SBOM, unversioned migrations | 95 | SD |
| 12 | Observability | 3 | **38** | generic `console.error`, no OTel/request ID/RUM | 92 | SD |
| 13 | Docs and showcase | 6 | **80** | strong README; docs sprawl, defensive tone, community files | 96 | RC, SD |
| 14 | Agent skills | 3 | **78** | 4 valid skills; no evals/design workflow | 95 | SD |
| | **Weighted** | 100 | **≈ 76** | | **≥ 95** | |

The "Primary lenses" column is derived from the lens tags of the
[top 10 issues](research/baseline-audit.md#top-10-issues) and from each rubric's scope; the
baseline scores are single consolidated values, not per-lens scores.

## Reconciling targets with the owner requirement

The audit set axis 12 (observability) to a target of 92. The owner requirement is 95+ on every
axis, so this plan treats **95 as the floor for every axis**, including observability; the
audit's higher targets (96–97) remain as stretch targets. Reaching 95 on observability is
expected to require the [F4](roadmap.md#f4--delivery-observability-and-showcase--12-weeks)
items plus evidence from a running collector (see the
[VPS phase](roadmap.md#vps-phase--activation-gated)).

## Re-scoring procedure

1. Score at the end of each phase, against the same commit-pinned source, with the fixed
   rubrics; record the commit, date, reviewer lens and evidence links.
2. Attach automated evidence for every claim (CI run, report artifact, screenshot set); a claim
   without evidence scores as not met.
3. Keep this table's baseline unchanged; append a new column per re-score.
