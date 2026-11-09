# Dependencies

Current and proposed dependencies. Policy (ecosystem section 7): any new runtime dependency passes an ADR with need versus platform, health (OpenSSF Scorecard and deps.dev), licence allow-list (MIT, Apache-2.0, BSD, ISC, 0BSD, BlueOak), bundle cost over 10 kB gz justified, maintainer count, exit cost. Exact versions, `npm ci --ignore-scripts`, one weekly Dependabot PR. Versions listed for current packages are read from `package.json` at `e356b13`. "2026 health" is **not asserted here**: the ADR author fills it from Scorecard and deps.dev at adoption time, because this plan did not fetch those pages; the column states what is already known from the repository's own use.

## 1. Current

| Package | Version | Purpose | Cost | Licence | Decision |
|---|---|---|---|---|---|
| `next` | 16.4.2 | Framework (App Router, standalone) | framework baseline about 148 KiB gz on sign-in | MIT | Keep; subscribe to monthly security releases (out-of-band releases 2026-09-22 and 2026-10-14, research 01); pin the supported line |
| `react`, `react-dom`, `react-is` | 19.3.1 | UI | in baseline | MIT | Keep; `react-is` only because Recharts needs it: remove if Recharts is removed |
| `better-auth` | 1.7.10 | Google and GitHub sign-in, sessions, admission hooks | server plus small client | MIT | Keep; at least 1.6.11 required (two 2026 advisories), regression test per advisory |
| `pg` | 8.23.1 | Postgres driver | server only | MIT | Keep |
| `recharts` | 3.10.1 | Line and column charts | 374 KB raw, about 108 KiB gz transferred | MIT | Keep only behind `ChartFrame`, lazy, on `/usage` and `/analytics`; revisit at M6 (PBO-D11) |
| `server-only` | 0.0.1 | Build-time server marker | negligible | MIT | Keep |
| `@biomejs/biome` | 2.5.15 | Format and lint | dev | MIT or Apache-2.0 | Keep, new preset |
| `@playwright/test` | 1.64.1 | E2E, visual, a11y | dev | Apache-2.0 | Keep |
| `@axe-core/playwright` | ^4.13.0 | axe in Playwright | dev | MPL-2.0 | Keep; **pin exactly** (everything else is pinned) |
| `typescript` | 7.0.2 | `tsc` gate | dev | Apache-2.0 | Keep |
| `@typescript/typescript6` | 6.0.2 | Compiler API for the AST guard | dev | Apache-2.0 | Keep until 7.1 API; drop when the guard moves to a TS 7 API or Biome rules |
| `@types/node` | 24.19.2 | Types | dev | MIT | Moves to 26 with the Node flip |
| `@types/react`, `@types/react-dom`, `@types/pg` | 19.3.0 / 19.3.0 / 8.23.1 | Types | dev | MIT | Keep |
| `@vercel/nft` | 1.11.0 | Trace migration runtime files into standalone output | dev, used by `prepare-runtime.ts` | MIT | Keep (commercial interest: Vercel; no runtime impact) |
| `js-yaml` | 5.4.3 | Parse workflows and skills in scripts | dev | MIT | Keep or replace by `node:util` YAML when available; dropped if scripts that use it are deleted |
| `openapi-typescript` and `typescript` 5.9.3 (in `tooling/api-contract`) | 7.13.0 / 5.9.3 | Generate contract types | isolated dev | MIT / Apache-2.0 | Keep isolated; documented peer limit on TS 5 |

## 2. Proposed

| Package | Purpose | Alternatives considered | Cost | Licence | Decision |
|---|---|---|---|---|---|
| `tailwindcss`, `@tailwindcss/postcss`, `postcss` | Utility styling with `@theme inline` tokens (PBO-D1) | CSS Modules plus kit; vanilla-extract; UnoCSS | build-time; CSS of used utilities only | MIT | Adopt (owner O4). Install pattern verified in the Tailwind docs on 2026-11-09 (postcss plugin plus `@import "tailwindcss"`); JSON PostCSS config under Next 16 webpack is spike S1 |
| `class-variance-authority`, `clsx`, `tailwind-merge` | CVA variants and class merge | hand-rolled variants; `tv` from tailwind-variants | about 3-4 kB gz together | Apache-2.0 / MIT / MIT | Adopt; same set as the sibling backoffice |
| `lucide-react` | Icons (1.5 px stroke, per-icon imports) | own SVG sprite; Heroicons; Phosphor | tree-shaken per icon, about 0.5 kB each | ISC | Adopt; sibling already uses it; custom domain glyphs drawn on the same grid |
| `ajv` (+ `ajv-formats`) | Runtime-compiled validators from the JSON Schemas (PBO-D4) | Ajv standalone (emits JS), Zod 4, Valibot | server only; compile at start-up (measure cold start, budget under 50 ms) | MIT | Adopt; removes about 630 lines |
| `style-dictionary` v5 (dev) | DTCG tokens to `theme.css` (PBO-D6) | Terrazzo, hand script | dev | Apache-2.0 | Adopt after spike S3 (docs: DTCG 2025.10 support still in progress, OKLCH not mentioned); Terrazzo fallback |
| `vitest` 4, `@vitest/browser-playwright`, `vitest-browser-react`, `@vitest/coverage-v8` (dev) | Unit, component in a real browser, coverage (PBO-D8) | keep `node --test`; Jest; Playwright CT (experimental) | dev | MIT | Adopt; spike E7 |
| `@stryker-mutator/core`, `@stryker-mutator/vitest-runner` (dev) | Mutation on risk modules | `tap-runner` on `node:test` | dev | Apache-2.0 | Adopt after E7; TS checker with TS 7 needs the TS 6 alias |
| `fast-check` (dev) | Property tests | hand-written fuzz loops | dev | MIT | Adopt |
| `@testcontainers/postgresql` and `testcontainers` (dev) | Real Postgres in tests, replaces `ci-postgres.ts` (PBO-D7) | GitHub `services:`; compose | dev; needs Docker socket | MIT | Adopt |
| `@lhci/cli` (dev) | Lighthouse CI, 5 runs median | `lighthouse` CLI scripted | dev | Apache-2.0 | Adopt |
| `knip` (dev) | Dead code and unused dependencies | `ts-prune`, manual | dev | ISC | Adopt |
| `@vercel/otel`, `@opentelemetry/api` | Tracing (PBO-D13) | `@opentelemetry/sdk-node` direct | server only; exporter off by default | Apache-2.0 | Adopt; commercial-interest flag (Vercel), no lock-in because OTLP is the output |
| `@next/bundle-analyzer` (dev) | Inspect chunks | own manifest reader | dev | MIT | Optional; budgets are enforced by `scripts/ci/check-bundle.ts` reading the build manifest, which needs no dependency |

CI tools (not npm): zizmor, actionlint, gitleaks, osv-scanner, CodeQL, Syft, Grype, hadolint, dockle, container-structure-test, OWASP ZAP baseline, OpenSSF Scorecard, release-please, lychee, markdownlint-cli2, Vale; all pinned by SHA or by checksum-verified binary, versions chosen at PBO-M1.

## 3. Explicitly not adopted

| Item | Why |
|---|---|
| Base UI, Radix, shadcn/ui as dependencies | O4 and PBO-D5: owned primitives on native elements; exit rule in the ADR |
| `pino` | Own 50-line logger avoids bundling issues in Next standalone (unverified, would be a spike) and keeps an allowlist by construction; fallback if the owner prefers |
| Zod | Ajv already validates the committed schemas; a second schema source would drift |
| State management libraries, DI containers | No cross-component state beyond URL and cookies; a composition root is enough |
| A second chart library, `d3` packages | Custom SVG for six forms; Recharts only for line and column |
| `cmdk` | The palette is a native `dialog` plus listbox (research 12 allows `cmdk` only if the owned one proves insufficient) |
| Framer Motion, GSAP | No animated data; motion tokens are CSS-only |

## 4. Weekly review

The weekly Dependabot PR carries every ecosystem together. Each weekly PR is read for: new transitive licence outside the allow-list, install scripts (the `--ignore-scripts` allow-list), bundle delta (`bundle.json` ratchet), Next.js security releases, better-auth advisories. A failing check marks the PR `needs-fix` and the harness repairs it on the same branch; the owner merges manually.
