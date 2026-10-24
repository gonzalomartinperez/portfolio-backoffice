# Code standard, docs, community files and agent skills

Planning only. Bracketed numbers refer to [sources](sources.md).

## Google vs Microsoft TypeScript

The **Google TypeScript Style Guide stays as the readability reference** [20] (a decision
already made in [CONTRIBUTING.md](../../../CONTRIBUTING.md) and aligned with the portfolio).
Microsoft does not publish a style guide for user projects: its "Coding guidelines" are internal
to the TS compiler (and explicitly not prescriptive for third parties), so it is not a real
alternative. Documented deviations (current ones are kept and these are added):

- Biome formatter (tabs, double quotes) instead of Google's format.
- Default exports where Next requires them.
- `type` for props and unions; `interface` for ports (already).
- New: `readonly` in DTOs and domain props; no `enum` (already enforced by
  `erasableSyntaxOnly`); exported application/domain functions with an explicit return type
  (Google leaves it to judgment; here it helps the public API of the layers); `as` forbidden
  except in contract adapters with a comment; kebab-case file names (already).
- Imports: always with the `.ts/.tsx` extension (mixed today) — Biome rule
  `useImportExtensions`.

TypeScript everywhere (owner requirement): the repository has no `.js/.mjs/.cjs` source; the
embedded JS to migrate is listed in the [target architecture](target-architecture.md#master-file-index-current--target).

## Docs

- README: reduce to one screen of "what it is + hero capture + 3 engineering bullets + quick
  start", gallery in `docs/gallery.md`; Mermaid in ```mermaid blocks (GitHub renders them); real
  badges (CI, CodeQL, Scorecard, license, Node); an affirmative tone with a single "Scope and
  limits" section instead of disclaimers in every paragraph.
- `docs/architecture.md` with a C4 diagram (context/container) and the layer diagram; link ADRs
  008–017.
- `docs/security-controls.md`, `docs/testing.md`, `docs/observability.md`, `docs/runbook.md`.
- Unify the product name: "Portfolio Backoffice" (repository, `appName`, `/api/health`, titles);
  rename the local checkout to `portfolio-backoffice` (owner decision; the workspace uses
  `<owner>/<repo>`).

## Community files

Add `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SUPPORT.md`, `.github/CODEOWNERS`,
`.github/ISSUE_TEMPLATE/{feature_request.yml,config.yml}` (with a link to the security
advisory), `CHANGELOG.md`; enable private vulnerability reporting (SECURITY.md already exists);
repository `homepage` → the case-study page in the portfolio.

## Agent skills: audit and improvements

State: 4 skills (`web-change-backoffice` 84 lines, `web-refresh-contract` 26 lines,
`web-review-delivery` 98 lines, `web-verify-backoffice` 39 lines), validated by
`scripts/check-skills.ts`, `.agents/skills/` links for Codex. Good descriptions with "Not …"
(disambiguation). Improvements (in line with the portfolio skills plan):

- Descriptions: start with the trigger ("Use when…") and keep them < 200 characters.
- `web-change-backoffice`: update to the target architecture (use cases, container, G1–G7);
  link to `references/` instead of inline content.
- `web-verify-backoffice`: include the device matrix, visual regression and axe 2.2; output with
  an evidence template.
- New: `web-design-backoffice` (apply the design system + dataviz rules + state and theme
  checklist, with mandatory captures), `web-security-review` (RBAC/CSRF/CSP/audit matrix with
  ASVS), `web-add-metric` (end-to-end flow: API contract → generated validator → domain
  `Metric<T>` → view → fixtures → tests), `web-migrate-db` (expand/contract migration with an
  N-1 test).
- Evals: 3–5 prompts per skill with an expectation (correct activation / non-activation) run in
  `check-skills.ts` or in a manual job.
