# Repository settings (owner runbook)

Repository settings are owner-only actions (master plan RESUME section 5): agents prepare the
change and the evidence, and the owner runs the command. This page lists every setting the M1
foundation needs, its current state (observed 2026-11-14 with `gh api`) and the exact command.
Run each command from a shell authenticated as `gonzalomartinperez`.

| Setting | State on 2026-11-14 | Owner action |
| --- | --- | --- |
| Dependabot security-update PRs (OD-22) | disabled | none |
| Dependabot alerts (OD-22) | enabled (`vulnerability-alerts` returns 204) | none |
| Private vulnerability reporting (PBO-D16) | disabled | enable (step 1) |
| Required status check | classic protection requires `Required checks` on `develop` and `main` | switch to `ci-gate` (step 2) |
| Standard rulesets | none (dry run: `standard-develop`, `standard-main`, `standard-release-tags` would be created) | apply `develop` and tags now, `main` at M7 (step 2) |
| CodeQL default setup | not configured | enable (step 3) |
| Immutable releases | off | enable before the first release (step 4) |
| `production` environment | does not exist | create with a required reviewer (step 5) |
| release-please GitHub App | none | create when release automation starts (step 6) |
| Default branch | `main` (scheduled workflows and Dependabot read it) | decide (step 7) |
| dependency-review licence allow-list | ecosystem default (no LGPL) | decide (step 8) |

## 1. Private vulnerability reporting (PBO-D16)

```bash
gh api -X PUT repos/gonzalomartinperez/portfolio-backoffice/private-vulnerability-reporting
```

Then a task PR replaces `SECURITY.md` with the shared policy (it routes reports to private
vulnerability reporting), adds it to `standards.lock` and removes the personal mailbox.

## 2. Required check and rulesets

Every CI run reports both `ci-gate` and the transitional `Required checks` alias, so the switch has
no protection gap. In this order:

1. Apply the standard rulesets for `develop` and tags (the `main` ruleset waits for M7, because
   `ci-gate` reaches `main` only with the M7 promotion and the ruleset would block that PR's base):

   ```bash
   ES=$(mktemp -d)
   git clone --depth 1 --branch v1.0.0 https://github.com/gonzalomartinperez/engineering-standards.git "$ES"
   "$ES/scripts/apply-rulesets.sh" --repo gonzalomartinperez/portfolio-backoffice --flow release
   ```

   The script applies all three rulesets of the release flow; until M7, apply with `--apply`
   and then delete `standard-main`, or keep the classic `main` protection only and run the script
   at M7.
2. Remove `Required checks` from the classic `develop` protection (keep the rest), confirm a
   new PR is mergeable on `ci-gate` alone, then a task PR deletes the `required-checks` alias job
   from `.github/workflows/ci.yml`.
3. At M7, after the promotion PR merges, apply `standard-main` and drop the classic `main`
   protection's `Required checks`.

## 3. CodeQL default setup

```bash
gh api -X PATCH repos/gonzalomartinperez/portfolio-backoffice/code-scanning/default-setup \
  -f state=configured -f query_suite=default
gh api repos/gonzalomartinperez/portfolio-backoffice/code-scanning/default-setup
```

## 4. Immutable releases

Settings > General > Releases > "Enable release immutability" before the first release tag
(2.0.0 at M7). The `standard-release-tags` ruleset protects `v*` tags from update and deletion.

## 5. `production` environment

Settings > Environments > New environment `production`: required reviewer `gonzalomartinperez`,
deployment branches limited to `main`. `release.yml` `publish` targets it; without it GitHub would
auto-create an unprotected environment on the first run.

## 6. release-please

Create a GitHub App with `contents: write` and `pull-requests: write` on this repository, store its
ID and private key as secrets of a `release` environment, and approve the task PR that adds the
release-please workflow (config and manifest are already committed). The ecosystem sandbox
validation of release-please on `develop` (E5) runs first.

## 7. Default branch

Scheduled workflows (`vuln-daily`, `scorecard`, `drift` on Mondays, the `deps-weekly-guard`
schedule) and the Dependabot configuration run from the default branch. With `main` as default they
start at M7. Making `develop` the default branch activates them now; it also changes the branch
GitHub shows and uses for new PRs. Either choice is consistent with OD-10 and OD-11.

## 8. Licence allow-list for dependency review

The shared `security` workflow fails a PR that adds a dependency outside the ecosystem allow-list.
`next` depends on `@img/sharp-*` binaries licensed `LGPL-3.0-or-later` (optional native image
processing). A weekly dependency PR that bumps them will fail until the owner either accepts
`LGPL-3.0-or-later` for these packages (a task PR passes `allow-licenses` to the `security` job) or
excludes them.
