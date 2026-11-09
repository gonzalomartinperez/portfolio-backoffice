# RESUME: continue the portfolio-backoffice master refactor from any account

This file is self-contained. A new Claude (or Codex) session with no access to any earlier chat can continue from here. Nothing is resumed from memory.

## 1. What this is

`portfolio-backoffice` is the private operations console of the portfolio site's RAG assistant: Next.js 16, React 19, TypeScript 7, Better Auth with a Postgres IAM schema, Google and GitHub sign-in, owner and viewer roles. It never handles visitor conversations. It is one of nine repos (`portfolio`, `portfolio-assistant-api`, `portfolio-backoffice`, `pequeverso`, `pequeverso-assistant-api`, `pequeverso-backoffice`, `vps-ops`, `pequeverso-marketing`, `dropshipping-ops`) being refactored under one ecosystem standard. This repo's refactor has three owner-driven themes: (1) the ecosystem quality net (one `npm run check`, dynamic CI, full test catalog, ratchets, nightly scorecard); (2) a clean architecture (composition root, DAL authorization, append-only audit, CSP); (3) a full redesign with a **blue identity ("Instrument blue")** on **Tailwind 4 with owned CVA primitives**, sharing structure with the Pequeverso backoffice. Plan dated 2026-11-09; planning only until the owner starts a milestone.

## 2. Where things are (read in this order)

1. `docs/master-plan/RESUME.md` (this file)
2. `docs/master-plan/progress.md`: current milestone, in-flight tasks, next item, known issues, owner inputs, nine-row ecosystem table
3. `docs/master-plan/roadmap.md`: the task tables with IDs and Status; the next task is the first `todo` row of the current milestone
4. `docs/master-plan/README.md`: purpose, decisions PBO-D1..D18 and why, decision resolutions and owner inputs
5. `docs/master-plan/ecosystem.md`: the ecosystem standard (binding); `rubrics.md`
6. Task-specific: `target-state.md` (architecture, guards), `design-playbook.md` (tokens, shell, components), `testing.md`, `ci-cd.md`, `file-index.csv` and `file-moves.md` (where each file goes), `standards.md`, `dependencies.md`, `skills.md`, `audit.md` (evidence)
7. The ecosystem tracker (`engineering-standards/progress/ecosystem.md`, or `vps-ops` until it exists) for the other repos' state
8. `AGENTS.md`, `CONTRIBUTING.md`, `docs/reference/` of the repo (its own rules win over this plan only where they are stricter)

## 3. First commands

```bash
cd ~/projects/github/gonzalomartinperez/portfolio-backoffice
git fetch -q && git switch develop && git pull --ff-only
git tag --list 'checkpoint/*' --sort=-creatordate | head -3      # last safe point
sed -n 1,40p docs/master-plan/progress.md                         # current milestone and next item
nvm use && npm ci                                                 # Node from .nvmrc
npm run check                                                     # once PBO-M1-6 exists; before that: npm run format:check && npm run lint && npm run typecheck && npm test
git log --oneline --grep 'PBO-M<n>-' | head                      # RESUME: finished tasks of the current milestone
gh pr list --state all --search 'PBO-M<n>-'                       # RESUME: open and merged PRs per task
git switch -c chore/<next-item-slug>                              # task branch, never work on develop or main
```

Checkout `develop` at or after the last `checkpoint/M<n>` tag and continue with the first `todo` row of the current milestone in `roadmap.md` (the RESUME commands above give the true next task mid-milestone: a task is done only when its row says `done (PR #, SHA)` and the merge commit is on `develop`). Docker is required for integration tests (Testcontainers) from PBO-M1-4; Playwright browsers via `npx playwright install --with-deps`.

## 4. Ready-to-paste prompt

> You are continuing the master refactor of the `portfolio-backoffice` repository (`~/projects/github/gonzalomartinperez/portfolio-backoffice`). You have no earlier chat. Read `docs/master-plan/RESUME.md`, then `progress.md`, then `roadmap.md`, then the files the next item needs (`target-state.md`, `design-playbook.md`, `testing.md`, `ci-cd.md`, `file-index.csv`). Check out `develop` at or after the last `checkpoint/M<n>` tag. Do the first `todo` task (roadmap Status column) of the current milestone on a short task branch, with tests and evidence, and open a PR to `develop` only; wait for `ci-gate` green (`gh pr checks --watch && gh pr merge`, never chained with `;`) before merging, and never use `--admin`. Run the review chain from `skills.md` (independent reviewer, Codex second opinion, architecture review for structural changes) and answer every finding in the PR. Set the roadmap Status to `done (PR #, SHA)` and update the "In-flight tasks" section of `progress.md` on each task merge; push `checkpoint/M<n>` only when the whole milestone is done. Do not do anything listed under "Owner-only decisions": stop and ask. No secrets in git, logs or prompts. GitHub identity is `gonzalomartinperez` only. Never `pkill -f`. Report in English with the PR URL and the evidence (CI run URL, SHA, date).

## 5. Owner inputs and owner-only actions (stop and ask)

Genuine owner inputs (identical in README, RESUME and progress):

1. PBO-D16: enable GitHub private vulnerability reporting on the repository (a setting only the owner can change).
2. MV: VPS purchase and activation authorization (OD-64; owner steps are purchase, DNS and secret entry only).

Every other decision, including PBO-D9, D10, D14 and D17, is resolved by delegation (README). Owner-only actions that remain outside any task: production activation and each spend (LLM runs, paid tooling, VPS); legal and commercial facts; the `develop` to `main` promotion and `v2.0.0` release at M7; hotfix authorization to `main`; manual merge of the weekly Dependabot PR; granting scopes (tokens, GitHub App for release-please, Coolify, rulesets, repository settings such as security updates off and immutable releases); accepting a vulnerability exception; changes to the ecosystem standard's decisions log; activating the GHCR push at MV (DR-13, PBO-D10).

## 6. Non-negotiable rules

- Branch flow: task branch, PR, `develop` with green `ci-gate` (strict, up to date); merge commit (no squash) with a Conventional Commit PR title. `main` only at M7 (no hotfix before M7, OD-11 and DR-01). Never `--admin`; no bypass actors.
- Merge only with green CI: `gh pr checks --watch && gh pr merge`; a merged PR and green CI do not prove deployment.
- No secrets anywhere (git, images, logs, prompts, build args). Fixtures use synthetic public values. No prompts, answers, credentials or private career material in operational payloads, logs or public artifacts.
- Invariants: no cross-repo imports (contracts are snapshots with revision and SHA-256); the backoffice never receives a visitor transcript; no provider key in a backoffice build; "unavailable, never zero".
- Dependabot: exactly one PR per week with all ecosystems (Monday 09:00 America/Argentina/Buenos_Aires, target `develop`); never two open; the harness never merges it.
- Never `pkill -f` (it kills your own shell and others' watchers); stop processes by verified PID. Guard hooks block destructive commands (`rm -rf` outside temp, force-push to main or develop, `reset --hard`, docker prune, `DROP DATABASE`): do not work around a block, ask.
- Preserve other sessions' work; do not reset or stash changes you did not make.
- English for all repo documentation; UX copy in US English and neutral Latin American Spanish (es-419) via typed dictionaries.
- No hotfixes before M7 (OD-11, DR-01): nothing reaches `main` before the M7 release, including the consent change, which ships with the refactor.
- Decisions registers: [owner-decisions.md](owner-decisions.md) and [owner-decisions-existing.md](owner-decisions-existing.md); read before acting and never contradict them.
- Quality: a criterion without evidence is unmet; a missing, partial or failed review report is never "no problems"; ratchets only tighten.

## 7. If something is missing

If `docs/master-plan/` does not exist on `develop`, the M0 plan PR was not merged: ask the owner. If the repo layout differs from `file-index.csv`, trust the code and the latest `progress.md`, and note the drift in the next progress update. If a decision here looks wrong against new evidence, write an ADR proposal in a PR; do not silently change the plan.
