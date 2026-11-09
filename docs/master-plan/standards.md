# Standards

Style choices and enforcement for this repository. The ecosystem standard (section 10.1, [ecosystem.md](ecosystem.md)) is the base; this file lists only the repo-specific application and the deviations. Rule changes need an ADR and bump the ecosystem version through the standards process.

## 1. TypeScript and React

| Topic | Choice | Enforcement |
|---|---|---|
| Style | Google TypeScript Style Guide for semantics, Biome for layout: 2 spaces, 100 columns, double quotes, semicolons. **Change from today**: `biome.json` uses tabs and 80 columns; a single mechanical reformat commit (listed in `.git-blame-ignore-revs`) lands at PBO-M1-9 | `biome format` in `npm run check` |
| Compiler | TypeScript 7 `tsc` as its own CI job; `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly` (all already on) plus `noImplicitOverride` (new) | `npm run typecheck` |
| Lint | Biome 2.x pinned exactly; domains `next`, `react`, `test`, `project`; `noRestrictedImports`, `noPrivateImports`, `noImportCycles`, `noUndeclaredDependencies`; `noExcessiveCognitiveComplexity` max 10 (ratcheted); `useSortedClasses` for Tailwind; no typescript-eslint | `npm run lint` |
| Dead code | knip (files, exports, dependencies) | `npm run check` |
| Deviations from Google | no `enum`, `namespace`, parameter properties, decorators or `import =` (erasable syntax); default exports only for framework entry files (`page.tsx`, `layout.tsx`, `route.ts` named exports, `*.config.ts`); `undefined` internally, `null` only at I/O boundaries; `type` for unions and mapped types, `interface` for extendable object shapes; `#private` allowed; camelCase for `as const` objects, CONSTANT_CASE for primitive module constants | Biome rules plus review chain |
| File naming | kebab-case for files and folders; PascalCase only for exported components, types, classes; framework names as is; tests `*.test.ts(x)` next to the unit for unit and component tests, `tests/` for integration and E2E; no barrel files | guard G-naming in `check-boundaries.ts` |
| Imports | Node subpath `imports` (`#server/*`, `#shared/*`, `#features/*`), no `../../../` chains beyond one level; type imports with `import type` | Biome plus guard |
| Scripts and configs | `.ts` run by Node type stripping; JSON or YAML for tool configs; `.js/.mjs/.cjs` only where a tool cannot load TS, each with an entry in `target-state.md` (currently zero) | guard fails on any tracked `.js/.mjs/.cjs` outside the exception list |
| Docs | TSDoc on exported symbols of `shared/ui`, `shared/dataviz`, `server/dal`, use cases; comments explain why | review chain; `docs:check` flags exported symbols without TSDoc in those folders |

## 2. Repo conventions

| Topic | Rule | Enforcement |
|---|---|---|
| Components | Server Component by default; `"use client"` only for the allowlisted islands (`target-state.md` section 7); presentation files at most 200 lines; props down, no `process.env`, no fetch | guard G6 |
| Authorization | Only through `server/dal`; every Server Action follows the pipeline validate, `requireSession`, `authorize`, use case, audit, revalidate | guard G9 and test |
| Honesty | Missing metric is `Metric<T>` unavailable, never zero or a fixture presented as real; no `?? 0` on a metric in presentation; synthetic data labelled | lint test, `Metric` types |
| Privacy | No prompts, answers, credentials or private career material in operational payloads, logs or public artifacts | validators (forbidden keys), logger allowlist, secret scanners |
| Styling | Tailwind utilities reading semantic tokens only; no colour or length literals outside tokens; `cn()` = `clsx` + `tailwind-merge` with registered custom sizes; no CSS Modules (ratchet to zero) | guard G10, Biome class sorting |
| i18n | Typed dictionaries `en-US` and `es-419` in `shared/i18n/messages`; no hard-coded text in presentation; `Intl` for every number and date with explicit locale and `timeZone: "UTC"`; `es-AR` forbidden; sentence case; no all-caps copy | parity test, grep test, lint |
| Time | Clock passed in to pure functions; UTC in the UI and says so; relative time paired with absolute in `title` | tests with frozen time |
| Errors | Typed results at I/O boundaries (`ok`, `unavailable(reason)` with `reason` in `transport`, `authorization`, `contract`); no raw upstream error text to the browser; `error.tsx` per route group | contract and E2E tests |
| Logging | JSON, allowlisted fields, `request_id`, `route`, `outcome`; no emails, tokens, raw IPs, SQL | redaction test |
| Dependencies | ADR per new runtime dependency (need versus platform, health, licence allow-list, bundle cost over 10 kB gz, maintainers, exit cost); exact versions; `npm ci --ignore-scripts` | dependency-review, licence check, ADR link check |
| Git | Branches `feat/`, `fix/`, `chore/`, `docs/`, `deps/` of at most 5 working days; Conventional Commit PR titles; merge commit to `develop`; English commits; identity `gonzalomartinperez` only | semantic-PR action, ruleset |
| Skills and agent docs | `AGENTS.md` is the source; `CLAUDE.md` is `@AGENTS.md`; skills under `.agents/skills/<name>/SKILL.md` with `.claude/skills/<name>` relative symlinks; commands in AGENTS.md equal `package.json` scripts (tested) | `skills:check`, docs check |

## 3. One command

`npm run check` equals the CI `static` job and the pre-commit hook (via a `lefthook`-free `.githooks/pre-commit` calling it; hooks path set by `npm run prepare`): format check, lint, knip, typecheck, architecture guards, token check, contract check, unit tests, docs and skills checks, public-file secret scan. `npm run check:fast` (format, lint, typecheck, guards) is the editor loop. AGENTS.md lists exactly these commands and a unit test greps every backticked command against `package.json`.

## 4. Ratchets

`quality/ratchets/*.json` record current violation counts: lint and type errors (0), complexity offenders, knip findings, CSS Modules files (5 today), coverage floors, bundle sizes, Lighthouse scores, guard violations (0). Counts may only go down; loosening needs an ADR and the owner.
