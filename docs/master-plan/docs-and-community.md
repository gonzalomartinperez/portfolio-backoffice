# Documentation and community

Applies ecosystem section 14 and research 08. Today the README is rich but long and defensive (a 20-line "Current state" disclaimer block comes first), `docs/` has 109 tracked files (93 outside the v1 plan) including dated handoffs and 3.9 MB of pre-redesign screenshots, ADRs live under `docs/adrs/` with three-digit numbers, and community files are partial. Language: English for README, AGENTS.md, CLAUDE.md, skills, ADRs, comments, commits, CHANGELOG, templates, SECURITY and CONTRIBUTING; UX copy is US English and neutral Latin American Spanish (es-419) inside typed dictionaries only.

## 1. README outline (ecosystem template, public variant)

Required headings are checked by `scripts/docs/check-docs.ts`. Target length: value and proof visible in the first screen, whole file under about 220 lines. No volatile facts (counts, versions, URLs are generated or linked).

1. **Title and one-line value**: "Portfolio Backoffice: private operations console for the portfolio website and its assistant." Badges (three at most): CI, release, license.
2. **Why**: three sentences: the operator questions it answers (is the assistant healthy, what did it cost, what do visitors do), the honesty doctrine, the invite-only access model.
3. **Demo / Proof**: the new gallery as `<picture>` pairs (dark and light) of Overview, Runs with waterfall, Usage, Access; a 30-second recording of the command palette and run detail (synthetic data, labelled); link to the Quality section. No live demo exists because the app is private; the README says so in one line.
4. **Architecture**: C4 level 1 and level 2 Mermaid (the two diagrams in `target-state.md`), trust boundaries in five bullets (browser, app, IAM database, private API, OAuth providers).
5. **Quickstart**: one command block: `nvm use && npm ci && npm run preview:fixture` (fixture API, isolated Postgres via Testcontainers, synthetic data) with the URL and fixture sign-in note. Executed by a CI job so it cannot rot (R5).
6. **Usage**: the six destinations in a table with the question each answers; keyboard shortcuts link.
7. **Tech stack**: a table generated from `package.json` (Next, React, TypeScript 7, Tailwind 4, Better Auth, pg, Biome, Vitest, Playwright, Stryker) with no hand-written versions.
8. **Quality**: scorecard summary generated from `scorecard.json` (axes, last nightly date) and links to CI evidence.
9. **Documentation**: Diataxis map (section 2).
10. **Roadmap**: link to `docs/master-plan/roadmap.md` and `progress.md`; one line on the refactor status.
11. **Contributing, Security, Support**: links.
12. **License**: MIT.

The "Current state" disclaimer moves to `docs/explanation/status-and-limits.md` (what is verified: synthetic, real Postgres, live OAuth unverified, VPS not provisioned) and the README keeps one honest sentence with a link. The README is the human story; agent instructions stay in AGENTS.md.

## 2. Diataxis map

| Quadrant | Files (target paths, see `file-index.csv`) |
|---|---|
| Tutorials | `docs/tutorials/first-run.md` (run the fixture stack, sign in, read an overview) |
| How-to | `docs/how-to/refresh-contract.md`, `deploy.md` (gated on the VPS), `release.md`, `add-a-view.md`, `add-a-token.md`, `rotate-secrets.md` |
| Reference | `docs/reference/ci.md`, `deployment-contract.md`, `env.schema.json` (generated), `design-system.md`, `agent-skills.md`, `runtime-baseline.md`, `dependency-updates.md`, `keyboard-shortcuts.md`, `security-controls.md` (ASVS 5.0 L2 control to test map) |
| Explanation | `docs/explanation/architecture.md` (C4 and trust boundaries), `authentication.md`, `privacy-review.md`, `product-analytics.md`, `feedback-and-improvement.md`, `design-research.md`, `status-and-limits.md` |
| Decisions | `docs/decisions/0002-...` to `0021-...` (MADR 4, Confirmation section, superseding ADRs link both ways, paths stable) |
| Evidence | `docs/verification/archive/` dated reports plus `INDEX.md`; live evidence is CI artifacts and `scorecard.json` |
| Plan | `docs/master-plan/` (this folder) |

## 3. Community files (public repo)

| File | Today | Target |
|---|---|---|
| `LICENSE` | MIT | keep |
| `README.md` | long | rewrite per section 1 |
| `CONTRIBUTING.md` | long (TypeScript adaptations) | short: run `npm run check`, branch flow, Conventional Commits, where tests go; links to standards |
| `SECURITY.md` | personal mailbox, no PVR | GitHub private vulnerability reporting enabled, acknowledge in 5 days, no bounty, scope and supported version (`develop` until first release, then latest minor); mailbox removed (PBO-D16) |
| `SUPPORT.md` | missing | add (issues for bugs, no private support) |
| `CODE_OF_CONDUCT.md` | missing | Contributor Covenant |
| `CODEOWNERS` | missing | add as a map: `* @gonzalomartinperez`, plus `/contracts/`, `/migrations/`, `/.github/` and `/src/server/` explicit |
| Issue forms | `bug_report.yml` | `bug.yml`, `feature.yml`, `config.yml` with `blank_issues_enabled: false` |
| PR template | short | summary, linked issue, evidence (CI run, report), docs and changelog touched, agent-docs touched, risk |
| `CHANGELOG.md` | missing | generated by release-please (Keep a Changelog sections) |
| `THIRD_PARTY_NOTICES.md` | fonts | add Tailwind, CVA, tailwind-merge, Lucide, others from the dependency ADRs |

A per-repo template overrides account defaults entirely, so these files live in the repo and are synced from `engineering-standards` with a drift check.

## 4. Docs CI

lychee (links; weekly cron too), markdownlint-cli2, Vale on English prose only (R3), README heading check, skills validator, ADR path check, AGENTS.md command test, no-volatile-facts check (flags hand-written version numbers outside generated blocks). Docs-only PRs run only these (profile `docs`, p50 at most 2 min).

## 5. C4 and code docs

Mermaid C4 L1 and L2 in README and `docs/explanation/architecture.md` (same source as `target-state.md`); L3 only for the shell and the DAL if a reviewer asks. TSDoc on exported symbols of `shared/ui`, `shared/dataviz`, `server/dal` and use cases; comments explain why, not what.

## 6. Existing documents: disposition

Moves and deletions with motives are in [file-moves.md](file-moves.md). Principle: facts that are still true and not volatile move into Diataxis files; dated handoffs and session coordination notes are deleted (git history keeps them); evidence reports go to `docs/verification/archive/`; screenshots of the pre-redesign UI are deleted because the visual baselines and the new gallery replace them.
