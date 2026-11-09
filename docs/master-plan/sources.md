# Sources

Dated 2026-11-09. Commercial-interest flag: **vendor** = the source is published by a company that sells or benefits from the product discussed; **community** = independent open-source or standards body; **mixed** = open source with a commercial steward. Research notes (copied into `research/`) hold the fuller source lists and their own flags; this file names the sources that this plan relies on directly.

## A. Fetched or measured for this plan on 2026-11-09

| Source | URL or path | Used for | Flag |
|---|---|---|---|
| Tailwind CSS: Next.js installation | https://tailwindcss.com/docs/installation/framework-guides/nextjs | `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `@import "tailwindcss"` pattern (PBO-D1); notes that the documented config file is `postcss.config.mjs`, hence spike S1 for a JSON config | vendor (Tailwind Labs) |
| Tailwind CSS: theme variables | https://tailwindcss.com/docs/theme | `@theme inline` for variables that change at runtime (theme switching) (design-playbook section 3) | vendor |
| Style Dictionary: DTCG | https://styledictionary.com/info/dtcg/ | First-class DTCG support since v4; format 2025.10 not fully supported yet; no OKLCH mention (hence spike S3 and the Terrazzo fallback) | community (open source, Amazon origin) |
| Repository at `origin/develop` e356b13 | local, read-only | Every repo fact in `audit.md`, `file-index.csv` | n/a |
| Audit artifacts | `audit/` (this folder) | Measured numbers | n/a |
| Palette computation | script described in `design-playbook.md` (WCAG 2 luminance, OKLab, Machado 2009 CVD matrices) | Contrast and colour-vision distances | method sources: W3C WCAG 2 definitions, Machado et al. 2009 (community) |

## B. Standards and primary references (via research notes; not re-fetched today)

| Topic | Source | Note | Flag |
|---|---|---|---|
| WCAG 2.2 (1.4.11, 2.4.11, 2.5.8, 3.2.6, 3.3.7, 3.3.8) | https://www.w3.org/TR/WCAG22/ | Targets and tests | community |
| Design tokens (DTCG) | https://www.designtokens.org/ , https://www.w3.org/community/design-tokens/ | Token source format | community |
| Next.js data security, CSP, OpenTelemetry, `output: standalone` | https://nextjs.org/docs/app/guides/data-security , https://nextjs.org/docs/app/guides/content-security-policy , https://nextjs.org/docs/app/guides/open-telemetry , https://nextjs.org/docs/app/api-reference/config/next-config-js/output | DAL authorization, nonce CSP, `@vercel/otel`, container output (research 01) | vendor (Vercel) |
| OWASP ASVS 5.0, Next.js cheat sheet | https://owasp.org/www-project-application-security-verification-standard/ , https://cheatsheetseries.owasp.org/cheatsheets/Nextjs_Security_Cheat_Sheet.html | Security controls map (research 04, v1 sources 3-4) | community |
| Better Auth security reference | https://better-auth.com/docs/1.6/reference/security | Advisories pin at least 1.6.11 (research 04 section 12) | vendor |
| StrykerJS incremental and runners | https://stryker-mutator.io/docs/stryker-js/incremental/ | Mutation plan (research 04) | community |
| Playwright CLI, visual comparisons | https://playwright.dev/docs/test-cli , https://playwright.dev/docs/test-snapshots | E2E, visual, flake policy (research 04) | vendor (Microsoft) |
| Vitest 4 Browser Mode | https://www.infoq.com/news/2025/12/vitest-4-browser-mode | Component tests (v1 source 10) | community press |
| GitHub Actions security, Dependabot options, release-please, artifact attestations, zizmor, Scorecard, SLSA | https://docs.github.com/en/actions/reference/security/secure-use , https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference , https://github.com/googleapis/release-please-action , https://docs.github.com/en/actions/concepts/security/artifact-attestations , https://docs.zizmor.sh , https://securityscorecards.dev , https://slsa.dev/spec/v1.2 | CI and supply-chain standard (research 05) | vendor (GitHub) for docs; community for zizmor, Scorecard, SLSA |
| Node release schedule, endoflife.date, distroless, Docker attestations | https://raw.githubusercontent.com/nodejs/Release/main/schedule.json , https://endoflife.date , https://github.com/GoogleContainerTools/distroless , https://docs.docker.com/build/ci/github-actions/attestations/ | LTS matrix and canonical Dockerfile (research 11) | community; Docker docs are vendor |
| Coolify rolling updates and health checks | https://coolify.io/docs/applications/deployments/rolling-updates , https://coolify.io/docs/applications/configuration/health-checks | HEALTHCHECK and graceful shutdown rationale (research 09, v1 source 15) | vendor |
| Google TypeScript Style Guide, Biome, TypeScript 7 | https://google.github.io/styleguide/tsguide.html , https://biomejs.dev , https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ | Code standards (research 10) | mixed |
| ADR, Diataxis, Keep a Changelog, agent skills spec | https://adr.github.io/madr/ , https://diataxis.fr , https://keepachangelog.com , https://agentskills.io/specification | Docs and harness (research 08) | community |
| Ajv | https://ajv.js.org/ | Runtime compilation versus standalone (v1 source 22) | community |
| Recharts accessibility discussion; data-viz colour guidance | https://github.com/recharts/recharts/discussions/4484 , https://cloudscape.design/foundation/visual-foundation/data-vis-colors/ | Chart a11y limits and palette practice (v1 sources 12-14) | community; Cloudscape is vendor (AWS) |

## C. Research notes in `research/` (copied unchanged)

| Note | Used for |
|---|---|
| [01](research/01-nextjs-architecture.md) | DAL, guards, tokens, monorepo versus polyrepo |
| [04](research/04-testing.md) | Test layers, mutation, security matrix |
| [05](research/05-cicd-supply-chain.md) | CI, supply chain, release, SLA |
| [06](research/06-ui-ux-design.md) | Tokens, motion, a11y, dashboards |
| [08](research/08-docs-readme-skills.md) | README, docs, AGENTS.md, skills |
| [09](research/09-vps-ops.md) | Coolify risk, deploy contract, SLOs |
| [10](research/10-standards-dependencies.md) | Code standards, dependency policy |
| [11](research/11-containers-dynamic-ci.md) | LTS matrix, Dockerfile, dynamic CI |
| [12](research/12-backoffice-redesign.md) | Shell, templates, components, data-viz, identity of the backoffices (its method note states product-pattern claims come from working knowledge, not fresh fetches) |
| [13](research/13-sites-master-uiux.md) | Section 3.2 Instrument blue primitives and rules |

## D. Honesty notes

- Library health (Scorecard, deps.dev), npm download trends and current patch versions were **not** re-fetched for this plan; `dependencies.md` defers them to each adoption ADR.
- Unverified until a spike or CI proof: Tailwind with a JSON PostCSS config under Next 16 webpack (S1), Stryker with Vitest 4 and TS 7 (E7), Style Dictionary v5 with DTCG 2025.10 and OKLCH (S3), CSS anchor positioning across engines (S5), Node 26 with Next 16.4 (E10), Dependabot multi-ecosystem behaviour (E2), release-please on `develop` (E5), `pino` bundling in Next standalone (not needed unless the owner prefers it), Ajv cold-start cost.
- The v1 plan's sources (23 external links, consulted 2026-10-24) remain valid references for the topics above; they are in git history under `docs/master-plan/research/sources.md`.
