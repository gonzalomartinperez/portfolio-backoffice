# Engineering coordination · 2026-10-17

This handoff records application-local decisions. It does not authorize cross-repository
edits, main promotion, artifact publication, assistant activation or deployment.

| Active session | Exclusive current responsibility |
| --- | --- |
| Portfolio assistant | `portfolio-assistant-api` and this `portfolio-backoffice` |
| Portfolio website | Public `portfolio`; career-ops ownership is not inferred from its session title |
| Pequeverso | `pequeverso`, `pequeverso-assistant-api`, `pequeverso-assistant-backoffice`; directly confirmed |
| VPS operations | Private `vps-ops`, Coolify, shared proxy/release/operations composition |

All four sessions directly confirmed their scopes through Codex task messages or the
owner-relayed technical handoff. The Pequeverso confirmation arrived after the initial
application PRs; its store/API/backoffice ownership is now explicit. Coordinated changes use committed contracts/handoffs; nobody
edits another owner's worktree or shared workspace instructions. Production remains
disabled. Reference repository code is not imported across repository boundaries.

## Observed baseline and enforcement

Inspected develop baseline `20ed215`; exact versions are authoritative in `.nvmrc`,
`package-lock.json`, toolchain compatibility checks and reviewed container digests:
Node24.21.0, Next16.4.0, React19.3.0, TypeScript7.0.2, Biome2.5.15, Playwright1.64.0,
Better Auth1.7.7 and pg8.23.1. The official `@typescript/typescript6` package6.0.2 remains
build-only for the compiler API; the checker reports its compiler version separately.
OpenAPI's isolated generator retains its documented peer arrangement. This increment
changes no dependency versions or runtime topology. Stable/maintained is not an LTS claim.

The vps-ops owner identified baseline commit
`1dd118469367532501d48cbb6f7fd4b9b9d6ec6e`, inspected read-only. The portfolio session
uses a different compatible dev-only AST parser for its host runtime; a shared principle
does not force this backoffice to add that parser or abandon its tested compatibility API.

Observed main/develop protection requires `checks`, strict up-to-date status and admin
enforcement. Existing Quality/static runs formatting, strict types, contract, operations,
authorization and architecture tests; the aggregate gate also requires browser/container
verification. No path filter skips required checks, no extra full build is introduced,
and source PR jobs receive no production credentials. Negative tests prove the guard
rejects representative violations; behavior tests prove use cases work with a fake port
and real isolated PostgreSQL. These do not prove live Google/GitHub provider setup.

## Google and Microsoft adaptations

[Google TypeScript](https://google.github.io/styleguide/tsguide.html) and
[Google review guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html)
inform readability and meaningful review. Microsoft's
[architecture principles](https://learn.microsoft.com/en-us/dotnet/standard/modern-web-apps-azure-architecture/architectural-principles),
[Engineering Playbook reviews](https://microsoft.github.io/code-with-engineering-playbook/code-reviews/)
and the [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
inform inward dependencies, precise types, testable operations and evidence-based review.

Adopt the principles, not .NET class/project conventions or a competing formatter.
[CONTRIBUTING](../CONTRIBUTING.md) remains canonical for actual coding rules. Biome owns
formatting, Next owns Server Component/Action conventions, and TypeScript7 checks the
complete application. `unknown` is narrowed at external boundaries; application ports
use domain values. Review checks security, accessibility, behavior, complexity, tests and
documentation. No plugin, generic DI framework, shared package or new controller is needed.

The design follows [original Ports and Adapters](https://alistair.cockburn.us/hexagonal-architecture)
and [official Next data security](https://nextjs.org/docs/app/guides/data-security).
Installed Next16.4 server-action/server-client docs were read before changing actions.
Framework CSRF protections do not replace live per-operation authorization.

Pequeverso retains its own tested Oxc parser and store Biome2.5.14/Playwright1.63
exceptions; neither is imported into this application. Product-specific contract versions
and source snapshots require independent committed-artifact verification before adoption.
The portfolio review of commit `8974932c57a52f1dc6c7eef726d00b6bca465d38` found an
`.mts`/`.cts` source-enumeration gap. The owner received a reproduced negative case; the
analogous backoffice collector was corrected locally, without edits to the portfolio.

## Current canonical layout · 2026-10-18

PR79 merged developf08189eab68d0c0b585d2806710dad936ff17004 with full CI.
Actual folders are src/server, feature domain/application/adapters/presentation and
src/shared/ui. Auth config/runtime factories stay CLI-safe; request modules stay
server-only. Negative AST and exact trace-closure tests protect both requirements.
See [architecture](architecture.md) and [ADR007](adrs/007-canonical-server-composition.md).

Initial cross-project version observations above remain historical; each owner
maintains its current lock and [runtime baseline](runtime-baseline.md). No common
parser, provider/storage stack or patch version is imposed without compatibility
verification. Main protection readback on 2026-10-18 retains `Required checks`, strict target
freshness, admin enforcement and force-push denial. No protection was weakened.
