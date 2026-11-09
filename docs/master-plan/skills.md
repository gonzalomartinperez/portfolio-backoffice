# Skills and harness

Applies ecosystem section 15 and research 08. Goal: the owner does not need to review code; the harness gives every PR an author agent, green gates, an independent reviewer, a second-model review and an architecture review where structural.

## 1. Audit of existing skills

Four skills, all valid (`skills:check`: 4 canonical entries, 0 errors). Canonical files live in `.claude/skills/<name>/SKILL.md` and `.agents/skills/<name>` are relative symlinks (the inverse of the standard).

| Skill | Lines | Job | Findings |
|---|---|---|---|
| `web-change-backoffice` | 84 | Implement or review authenticated operations, invited access and bilingual UI inside feature boundaries | Good scope statement; names old structure (CSS Modules, no sidebar); no output evals; mixes implementation and review guidance |
| `web-refresh-contract` | 26 | Import an operational API handoff with provenance and compatibility tests | Short and right; add the SHA-256 manifest and the four-snapshot layout |
| `web-review-delivery` | 98 | Review or prepare CI, image and Coolify handoff | Long; refers to "paired profile" of vps-ops that this plan replaces by ecosystem profiles |
| `web-verify-backoffice` | 39 | Verify authorization, states, keyboard, layouts, themes with real Postgres and synthetic data | Needs the new matrix (roles, locales, themes, visual) and `npm run check` |

Common gaps: descriptions are one sentence without "Use when... even if... Do not use for..." triggers; no `metadata {owner, last-reviewed, version}`; no `evals/triggers.json` or `evals/evals.json`; fragile procedures are prose rather than scripts.

## 2. Target layout and rules

- Canonical `.agents/skills/<name>/SKILL.md`; per skill a relative symlink `.claude/skills/<name>` to `../../.agents/skills/<name>` (Codex, Gemini and Copilot also read `.agents/skills`). Moves are recorded in `file-index.csv`.
- `name` equals the directory (at most 64 chars, lowercase and hyphens); description at most 1024 chars in the form "Does X. Use when ... even if ... Do not use for ...", key trigger first; body under 150 lines (hard cap 500); one job per skill; fragile steps in `scripts/`; no secrets or network calls in skills.
- AGENTS.md stays short: commands (equal to `package.json`, tested), non-obvious layout, deviations, boundaries, skills list, docs map. The long "Backoffice implementation conventions" contract moves into `docs/reference/` and the skills that need it; hard rules go to hooks or `permissions.deny` rather than prose. CLAUDE.md remains `@AGENTS.md`.

## 3. Improvements and new skills

| Skill | Action | Job (trigger) |
|---|---|---|
| `web-change-backoffice` | rewrite, split | Implement a feature or fix inside layer boundaries; follows the action pipeline; points to `add-backoffice-view` for UI |
| `web-refresh-contract` | update | Refresh one of the four contract snapshots with revision and SHA-256 |
| `web-review-delivery` | update | Read-only CI, image, release review against ecosystem profiles |
| `web-verify-backoffice` | update | Run the verification matrix and read the evidence |
| `add-backoffice-view` | new | Add a route on the shell with template, `Metric` states, ChartFrame, i18n keys, visual and a11y tests (a task agents repeat) |
| `design-tokens-backoffice` | new | Change a token or the pack: DTCG edit, `check-tokens`, contrast and CVD asserts, snapshot, kit lock |
| `review-backoffice-pr` | new | Independent reviewer procedure: rubric lenses, security matrix, honesty rules, evidence checklist |
| `plan-resume` | new | Resume the master plan from `RESUME.md` and `progress.md` (read order, first command, checkpoint tags) |
| `security-matrix-backoffice` | new | Extend the authz matrix when a route or action is added |

Skills touching authority (merge, publish, deploy) never grant it: they state that a skill is not authorization, as the current ones do.

## 4. Activation evals

Each skill carries `evals/triggers.json` (about 20 queries: 8-10 positive, 8-10 near-miss negatives, fixed 60/40 train/validation split) and `evals/evals.json` (2-3 output evals with assertions, run with and without the skill). Protocol: 3 runs per query on a clean context; pass if positives at least 0.5 and negatives below 0.5; report precision and recall on validation only. Gate: a skill change is not merged if validation trigger accuracy drops by more than 10 points or the output delta turns negative. Near-miss pairs for this repo, for example: positive "add a Usage chart that shows token spend per day", negative "add a chart to the portfolio hero" (other repo), "change the assistant's retrieval prompt" (API repo), "deploy the backoffice to the VPS" (vps-ops, owner-only).

## 5. Rot control and review chain

Monthly `last-reviewed` staleness check (180 days opens an issue); lines that never change agent behaviour are deleted; an agent failing twice at the same thing gets a script, lint rule or hook first, prose last. Required review chain per PR (ecosystem 15.2): author agent with evidence; green `ci-gate`; independent reviewer (read-only, rubric, diff only); Codex second opinion (advisory, reproduce each finding; fallback Claude reviewer on another tier, recorded in the PR); architecture review for structural PRs; strongest agents for auth, migrations, data loss and production; unanswered findings never reach the owner; missing or partial reports are not "no problems". Definition of done as in ecosystem 15.3. Owner-only decisions as in 15.4 and in [RESUME.md](RESUME.md).
