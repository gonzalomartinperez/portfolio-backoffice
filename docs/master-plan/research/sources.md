# Sources

Bracketed numbers such as [7] in the master-plan documents refer to this list.
External sources were consulted on 2026-10-24. Reference [30] and [31] reuse the
architecture references of the portfolio plan.

## Repository files audited

Audited source: `origin/develop` at `c86816c` (2026-10-18, identical to `main` after PR #99).

`package.json`, `tsconfig.json`, `biome.json`, `next.config.ts`, `playwright.config.ts`,
`src/proxy.ts`, `src/app/{layout,page}.tsx`, `src/app/{access,analytics}/page.tsx`,
`src/app/access/invitation/route.ts`, `src/app/api/**/route.ts`,
`src/server/{operations,analytics}.ts`, `src/server/auth/{config,runtime,session,actions}.ts`,
`src/features/auth/**`, `src/features/operations/**`,
`src/features/analytics/presentation/{report,report-chart}.tsx`, `src/app/style.css`,
`src/app/fonts.ts`, `migrations/*.sql`, `scripts/{auth-migrate,check-boundaries}.ts`,
`tests/browser/backoffice.spec.ts`, `tests/integration/auth.test.ts`,
`.github/workflows/{quality,release}.yml`, `infra/docker/app/Dockerfile`,
`docs/{design-system,adrs/007-canonical-server-composition}.md`,
`docs/verification/{final-bundle.json,operations-workbench.md}`,
`docs/assets/gallery/{02-availability,08-mobile-es}.png`, `CONTRIBUTING.md`, `AGENTS.md`,
`.claude/skills/*/SKILL.md`.

Sibling planning reports (private workspace, not published here): `engineering-target-state.md`,
`research.md` and `skills-plan.md` of the portfolio plan.

## External sources

1. [Next.js — Data Security guide (v16)](https://nextjs.org/docs/app/guides/data-security)
2. [Next.js blog — How to think about security in Server Components and Actions](https://nextjs.org/blog/security-nextjs-server-components-actions)
3. [OWASP ASVS 5.0 (project)](https://owasp.org/www-project-application-security-verification-standard/) · [explanation of the May 2025 release](https://www.appknox.com/cyber-security-jargons/owasp-asvs)
4. [OWASP Next.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nextjs_Security_Cheat_Sheet.html)
5. [Better Auth — Security reference](https://better-auth.com/docs/1.6/reference/security)
6. [Next.js — OpenTelemetry guide (`@vercel/otel` self-hosted)](https://nextjs.org/docs/app/guides/open-telemetry) · [SigNoz: OTel with Next.js](https://signoz.io/docs/instrumentation/javascript/opentelemetry-nextjs/)
7. [Next.js — Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy)
8. [StrykerJS — tap-runner](https://stryker-mutator.io/docs/stryker-js/tap-runner/) · [StrykerJS — Node.js guide](https://stryker-mutator.io/docs/stryker-js/guides/nodejs/)
9. [OneUptime — Mutation testing with Stryker (2026)](https://oneuptime.com/blog/post/2026-01-25-mutation-testing-with-stryker/view)
10. [InfoQ — Vitest 4 stabilizes Browser Mode (Dec 2025)](https://www.infoq.com/news/2025/12/vitest-4-browser-mode) · [Epic Web — Vitest Browser Mode vs Playwright](https://epicweb.dev/vitest-browser-mode-vs-playwright)
11. [Playwright — Visual comparisons](https://playwright.dev/docs/test-snapshots) · [Playwright — Emulation/devices](https://playwright.dev/docs/emulation)
12. [Recharts — accessibility and keyboard navigation discussion](https://github.com/recharts/recharts/discussions/4484)
13. [American Express Design — Data visualization accessibility (3:1 objects, light/dark tokens)](https://designinternet-qaeusw1green.americanexpress.com/guidelines/data-visualization/accessibility) · [Visa — Heatmap accessibility](https://design.visa.com/data-visualization/charts/heatmap/accessibility/)
14. [Cloudscape — Data visualization colors](https://cloudscape.design/foundation/visual-foundation/data-vis-colors/) · [Okabe-Ito and accessible palettes](https://www.getgalaxy.io/learn/glossary/color-palettes-for-accessible-data-visualization)
15. [Coolify — Rolling updates](https://coolify.io/docs/applications/deployments/rolling-updates) · [Coolify — Health checks](https://coolify.io/docs/applications/configuration/health-checks)
16. [GitHub — Artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations) · [Foundry/cosign + GHCR example](https://upd.dev/foundry-rs/foundry/src/branch/master/SECURITY.md)
17. [Setproduct — Dashboard design principles](https://www.setproduct.com/blog/effective-dashboard-design-principles) · [UXPin — Dashboard design principles 2025](https://www.uxpin.com/studio/?p=54839)
18. [InfoQ — Zod schema compilation (Oct 2026)](https://infoq.com/news/2026/10/zod-schema-compliation) · [OpenReplay — ArkType vs Zod](https://blog.openreplay.com/arktype-vs-zod/)
19. [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/) (1.4.11 Non-text Contrast, 2.4.11 Focus Not Obscured, 2.5.8 Target Size)
20. [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
21. [Design Tokens Community Group (DTCG)](https://www.designtokens.org/) · [Style Dictionary](https://github.com/style-dictionary/style-dictionary)
22. [Ajv — Standalone validation code](https://ajv.js.org/standalone.html)
23. [OpenSSF Scorecard](https://github.com/ossf/scorecard) · [zizmor](https://github.com/zizmorcore/zizmor)

## Architecture references reused from the portfolio plan

- [30] R. C. Martin, *The Clean Architecture*.
- [31] A. Cockburn, *Hexagonal Architecture*.
- K. Stemmler, *Client-Side Architecture* · L. Nikolov, *nextjs-clean-architecture* ·
  K. C. Dodds, *Testing Trophy*.
