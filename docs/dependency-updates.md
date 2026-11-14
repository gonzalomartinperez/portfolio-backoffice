# Dependency maintenance

The owner merges dependency updates manually (OD-20, OD-21). Native auto-merge is off; no
workflow approves, pushes, arms or merges a dependency PR.

## One weekly PR

Version updates form one grouped PR per week (Monday 09:00
America/Argentina/Buenos_Aires, target `develop`) covering npm (root and the isolated
contract generator), GitHub Actions and Docker, with at most one open dependency PR. The
seven-day cooldown (14 days for npm majors, 3 for patches) applies to version updates only.
The contract-generator workspace keeps a compiler-major ignore: it needs the TypeScript 5
programmatic API while the application uses TypeScript 7. Never hide a security alert to
enforce that exception.

The dependency PR runs the `deps-weekly` CI profile, which runs every job. It is reviewed
for new licences outside the allow-list, install scripts, bundle impact, Next.js security
releases and Better Auth advisories (master plan `dependencies.md` section 4). A red PR is
repaired on the same branch; the owner merges it.

`deps-weekly-guard.yml` (shared workflow, Monday 10:30 ART and on Dependabot PR events)
keeps at most one open dependency PR (it closes an older one with a pointer to the newer),
labels a PR whose `ci-gate` is red `needs-fix` so the agent harness repairs it on the same
branch, and records its state silently in the tracking issue (OD-75). The group shape (one
`weekly` group, group-level limit, labels and commit message, semver cooldowns only for npm)
is the one proven in the engineering-standards Dependabot sandbox (ADR 0002) and is checked by
`tests/unit/dependabot.test.ts` and the standards drift check.

Dependabot reads its configuration from the default branch (`main`), so a change merged to
`develop` takes effect when it reaches `main` at the M7 promotion, unless the owner makes
`develop` the default branch.

## Security findings

Security-update PRs are disabled in repository settings (OD-22, an owner setting) and alerts
stay on. The daily vulnerability job (`vuln-daily.yml`) records findings silently in one
tracking issue and only the Monday summary notifies (OD-75). Critical fixes ride the weekly
PR unless they are in CISA KEV or reachable, in which case a normal task PR bumps the single
dependency.

## Recovering

Pause proposals through a normal PR to the Dependabot configuration. Recover a problematic
merged update with a reviewed revert or fix PR that passes the same checks. Application
rollback does not reverse migrations or authorize a deployment rollback.

References: [Dependabot options](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference),
[managing dependency PRs](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/managing-pull-requests-for-dependency-updates),
[secure workflow guidance](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).
