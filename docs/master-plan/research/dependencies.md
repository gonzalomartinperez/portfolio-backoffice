# Dependency plan (vetted)

Planning only. Owner rule: any library is allowed when it is justified; each row below states
the justification and the rejected alternative. Bracketed numbers refer to [sources](sources.md).

| Package | Use | Justification | Rejected alternative |
| --- | --- | --- | --- |
| `ajv` 8 + `ajv-formats` (dev: standalone generation) | contract validators generated from the existing JSON Schemas | the schemas are already the API's source of truth; standalone = no compilation runtime; removes ~630 lines [22] | Zod 4 (`z.compile` is fast [18], but forces maintaining parallel Zod schemas or an extra generator); Valibot (smaller bundle, irrelevant server-side) |
| `vitest` 4 + `@vitest/browser-playwright` + `vitest-browser-react` (dev) | component/dataviz tests in a real browser | Browser Mode is stable in Vitest 4 [10]; Playwright CT is still experimental | jsdom/RTL (does not test real layout/SVG) |
| `@stryker-mutator/core` 9 + `@stryker-mutator/tap-runner` (dev) | mutation testing over `node --test` | reuses the existing suite without migrating it [8] | migrating unit tests to Vitest only for Stryker |
| `fast-check` (dev) | property-based tests for validators/format | cheap, high value for parsers | — |
| `@lhci/cli` (dev) | Lighthouse CI | same criterion as the portfolio | — |
| `@next/bundle-analyzer` (dev) | per-route budgets | official | `size-limit` (useful but redundant) |
| `@vercel/otel` + `@opentelemetry/api` | traces | official self-hosted support [6] | manual NodeSDK (more code) |
| `pino` (optional) | JSON logs | fast, standard; alternative: own ~40-line logger — decide in ADR 016 | winston |
| `node-pg-migrate` (optional) | versioned migrations | mature, plain SQL, uses the existing `pg` | own runner (valid if < 80 lines and tested); Prisma/Drizzle (not justified: Better Auth manages its schema) |
| `style-dictionary` 4 (dev, in the portfolio) | DTCG tokens → CSS/TS | DTCG standard [21] | Tokens Studio |
| `@axe-core/playwright` | already present | pin exactly (today `^4.13.0`; everything else is pinned) | — |
| `zizmor`, CodeQL, OSV-Scanner, Scorecard | CI (actions, not npm) | supply chain [23] | — |
| **Do not add** | Tailwind, shadcn, Radix, another chart library, state managers, DI containers | CSS Modules + owned primitives cover the scope; Recharts is encapsulated in `shared/dataviz` | — |

The "do not add" row is a recommendation for the current scope, not a ban: the owner allows any
justified library, so adding one requires an ADR showing the need these rows do not cover.

Policy: exact versions (as today), grouped Dependabot, and the existing `dependency-policy.ts`
extended with a per-layer allowlist (G5).
