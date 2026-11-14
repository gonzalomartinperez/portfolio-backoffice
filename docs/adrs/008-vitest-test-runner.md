# ADR008: Vitest as the test runner (DR-09, E7)

Accepted with PBO-M2-1, 2026-11-14.

## Context

The unit suite ran on `node:test` with Node's type stripping. The master plan (testing.md
section 3, ecosystem E7) prefers Vitest for the Next.js repositories, because StrykerJS supports
it best and Browser Mode covers components. A spike was required first: Stryker on Vitest, and
its TypeScript checker under TypeScript 7. No cross-repo spike result existed when M2 started,
so this repository ran its own on 2026-11-14.

## Spike result (local, Node 24.22.2, TypeScript 7.0.2)

- Vitest 5.1.0, the current major (the plan predates 5.0), runs the 26 unit files unchanged
  apart from the import (`import { test } from "vitest"`). `node:assert` stays: 119/119 pass
  (129 in 27 files after the release-notes suite landed on `develop` the same day).
- StrykerJS 10.1.1 with `@stryker-mutator/vitest-runner` mutated
  `src/features/auth/domain/access.ts`: 18 mutants, score 77.78, 1 min 41 s, in sandbox mode.
- TypeScript 7 has no JavaScript compiler API. Stryker core's tsconfig preprocessor calls it
  (`ts.parseConfigFileTextToJson is not a function`), and the native checker preview
  (`typescriptChecker.experimentalNativePreview`) fails during initialization. Mutation
  therefore runs without the TypeScript checker: type-invalid mutants are not filtered out
  before running, so they count as killed or survived, never as compile errors. Stryker's
  `tsconfigFile` points at a file that does not exist, which skips the preprocessor.
- The sandbox copy must ignore the `.claude/skills` symlinks and the documentation. A whole-suite
  dry run timed out under load, so mutation uses a dedicated Vitest config that includes only the
  tests of the mutated modules.

## Decision

Vitest is the single runner for TypeScript tests here (`vitest.config.ts`): the `unit` project
for `npm test`, and the `integration` project for Testcontainers PostgreSQL (`npm run test:auth`).
A `component` project (Browser Mode) follows in PBO-M2-2. Coverage uses `@vitest/coverage-v8`
over every `src/**/*.{ts,tsx}` file, with floors in `quality/ratchets/coverage.json`. The
pre-port 88.28 % branch baseline counted only the files tests imported, plus `scripts/`, so the
floors restart from the honest all-files measurement.

## Consequences

- One more dev dependency family (Vitest, Vite, Rolldown). Under load the unit run takes about
  2 minutes locally, against about 80 s on `node:test`; transform and import dominate.
- Re-enable Stryker's TypeScript checker when Stryker supports TypeScript 7, or when the
  `@typescript/typescript6` alias can be given to Stryker alone. Fallback if Stryker breaks on a
  future Vitest: `node:test` with Stryker's tap-runner, for mutation only.
