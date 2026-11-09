# File moves, renames, merges, splits and deletions

Generated from [file-index.csv](file-index.csv) (all 320 tracked files at `origin/develop` e356b13) and then hand-reviewed. Actions: **move** and **rename** change the path; **split** and **merge** change the file boundaries; **replace** keeps the path or role but rewrites the content from scratch; **delete** removes the file (git history keeps it). `rewrite`, `keep` and `migrate` (node:test to Vitest, same path) are not listed here; see the CSV.

Counts: keep 45, rewrite 52, migrate 24, move 84, rename 3, split 6, merge 5, replace 18, delete 83.

Verification rule: after each move the link check (`docs:check`), the boundary guard and `ci-profile.json` coverage test must pass in the same PR; contract moves also update `scripts/contracts/check-contract.ts` and the Dockerfile `COPY` lines.

## Moves and renames (87)

| From | To | Action | Motive |
|---|---|---|---|
| `.agents/skills/web-change-backoffice` | `.claude/skills/web-change-backoffice` | move | Becomes the relative symlink to ../../.agents/skills/web-change-backoffice |
| `.agents/skills/web-refresh-contract` | `.claude/skills/web-refresh-contract` | move | Becomes the relative symlink to ../../.agents/skills/web-refresh-contract |
| `.agents/skills/web-review-delivery` | `.claude/skills/web-review-delivery` | move | Becomes the relative symlink to ../../.agents/skills/web-review-delivery |
| `.agents/skills/web-verify-backoffice` | `.claude/skills/web-verify-backoffice` | move | Becomes the relative symlink to ../../.agents/skills/web-verify-backoffice |
| `.claude/skills/web-change-backoffice/SKILL.md` | `.agents/skills/web-change-backoffice/SKILL.md` | move | Canonical location is .agents/skills (ecosystem 15.1); add evals/ and metadata |
| `.claude/skills/web-refresh-contract/SKILL.md` | `.agents/skills/web-refresh-contract/SKILL.md` | move | Canonical location is .agents/skills (ecosystem 15.1); add evals/ and metadata |
| `.claude/skills/web-review-delivery/SKILL.md` | `.agents/skills/web-review-delivery/SKILL.md` | move | Canonical location is .agents/skills (ecosystem 15.1); add evals/ and metadata |
| `.claude/skills/web-verify-backoffice/SKILL.md` | `.agents/skills/web-verify-backoffice/SKILL.md` | move | Canonical location is .agents/skills (ecosystem 15.1); add evals/ and metadata |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | `.github/ISSUE_TEMPLATE/bug.yml` | move | Ecosystem name bug.yml; add feature.yml and config.yml (blank issues off) |
| `contracts/feedback.openapi.json` | `contracts/assistant-api/feedback.openapi.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/feedback.schema.json` | `contracts/assistant-api/feedback.schema.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/feedback.source.json` | `contracts/assistant-api/feedback.source.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/feedback.types.d.ts` | `contracts/assistant-api/feedback.types.d.ts` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/operations.example.json` | `contracts/assistant-api/operations.example.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/operations.openapi.json` | `contracts/assistant-api/operations.openapi.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/operations.schema.json` | `contracts/assistant-api/operations.schema.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/operations.source.json` | `contracts/assistant-api/operations.source.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/operations.types.d.ts` | `contracts/assistant-api/operations.types.d.ts` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/product-analytics-v2.openapi.json` | `contracts/assistant-api/product-analytics-v2.openapi.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/product-analytics-v2.schema.json` | `contracts/assistant-api/product-analytics-v2.schema.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/product-analytics-v2.source.json` | `contracts/assistant-api/product-analytics-v2.source.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/product-analytics-v2.types.d.ts` | `contracts/assistant-api/product-analytics-v2.types.d.ts` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/product-analytics.openapi.json` | `contracts/assistant-api/product-analytics.openapi.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/product-analytics.schema.json` | `contracts/assistant-api/product-analytics.schema.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/product-analytics.source.json` | `contracts/assistant-api/product-analytics.source.json` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `contracts/product-analytics.types.d.ts` | `contracts/assistant-api/product-analytics.types.d.ts` | move | Ecosystem snapshot path contracts/assistant-api/ with revision and SHA-256 in manifest |
| `docs/adrs/002-shared-vps.md` | `docs/decisions/0002-shared-vps.md` | move | MADR path docs/decisions/NNNN (ecosystem 14.2); update inbound links, docs:check enforces |
| `docs/adrs/003-typescript7-compatibility.md` | `docs/decisions/0003-typescript7-compatibility.md` | move | MADR path docs/decisions/NNNN (ecosystem 14.2); update inbound links, docs:check enforces |
| `docs/adrs/004-native-chat-and-private-operations.md` | `docs/decisions/0004-native-chat-and-private-operations.md` | move | MADR path docs/decisions/NNNN (ecosystem 14.2); update inbound links, docs:check enforces |
| `docs/adrs/005-bounded-distroless-runtime.md` | `docs/decisions/0005-bounded-distroless-runtime.md` | move | MADR path docs/decisions/NNNN (ecosystem 14.2); update inbound links, docs:check enforces |
| `docs/adrs/006-project-backoffice.md` | `docs/decisions/0006-project-backoffice.md` | move | MADR path docs/decisions/NNNN (ecosystem 14.2); update inbound links, docs:check enforces |
| `docs/adrs/007-canonical-server-composition.md` | `docs/decisions/0007-canonical-server-composition.md` | move | MADR path docs/decisions/NNNN (ecosystem 14.2); update inbound links, docs:check enforces |
| `docs/agent-skills.md` | `docs/reference/agent-skills.md` | move | Diataxis reference |
| `docs/api-contract.md` | `docs/how-to/refresh-contract.md` | move | Diataxis how-to |
| `docs/authentication.md` | `docs/explanation/authentication.md` | move | Explanation; adds ASVS mapping link |
| `docs/deployment-contract.md` | `docs/reference/deployment-contract.md` | move | Reference; health/ready/env schema contract (ecosystem 8.5) |
| `docs/deployment.md` | `docs/how-to/deploy.md` | move | Diataxis how-to; gated on VPS |
| `docs/feedback-and-improvement.md` | `docs/explanation/feedback-and-improvement.md` | move | Explanation |
| `docs/privacy-review.md` | `docs/explanation/privacy-review.md` | move | Explanation |
| `docs/product-analytics.md` | `docs/explanation/product-analytics.md` | move | Explanation |
| `docs/research/operations-dashboard.md` | `docs/explanation/design-research.md` | move | Owner-supplied references and dashboard research kept as explanation |
| `docs/runtime-baseline.md` | `docs/reference/runtime-baseline.md` | move | Reference; versions generated, not hand-written |
| `docs/verification/backoffice.md` | `docs/verification/archive/backoffice.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/calendar-integration-2026-10-18.json` | `docs/verification/archive/calendar-integration-2026-10-18.json` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/calendar-report-2026-10-18.md` | `docs/verification/archive/calendar-report-2026-10-18.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/clean-architecture-2026-10-17.md` | `docs/verification/archive/clean-architecture-2026-10-17.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/common-layout-preflight-2026-10-18.md` | `docs/verification/archive/common-layout-preflight-2026-10-18.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/common-layout-results-2026-10-18.md` | `docs/verification/archive/common-layout-results-2026-10-18.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/container-readiness.md` | `docs/verification/archive/container-readiness.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/final-bundle.json` | `docs/verification/archive/final-bundle.json` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/iam-postgres-security-2026-10-18.md` | `docs/verification/archive/iam-postgres-security-2026-10-18.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/operations-workbench.md` | `docs/verification/archive/operations-workbench.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/paired-ci-profile-2026-10-18.md` | `docs/verification/archive/paired-ci-profile-2026-10-18.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/product-feedback-2026-10-17.md` | `docs/verification/archive/product-feedback-2026-10-17.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/product-report-adapter-2026-10-18.md` | `docs/verification/archive/product-report-adapter-2026-10-18.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/quality-chat.md` | `docs/verification/archive/quality-chat.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/readme-gallery.md` | `docs/verification/archive/readme-gallery.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/runtime-compatibility-2026-10-17.md` | `docs/verification/archive/runtime-compatibility-2026-10-17.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/shared-postgres-adoption-2026-10-18.md` | `docs/verification/archive/shared-postgres-adoption-2026-10-18.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/skill-discovery-2026-10-18.json` | `docs/verification/archive/skill-discovery-2026-10-18.json` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `docs/verification/toolchain-security-2026-10-17.md` | `docs/verification/archive/toolchain-security-2026-10-17.md` | move | Dated evidence report kept under archive with an INDEX.md (no longer cited as current) |
| `migrations/001-access.sql` | `migrations/0001_access.sql` | move | Versioned names with schema_migrations runner (ADR 0016) |
| `scripts/auth-fixture-session.ts` | `scripts/e2e/auth-fixture-session.ts` | move | Test tooling grouped under scripts/e2e |
| `scripts/check-boundaries.ts` | `scripts/guards/check-boundaries.ts` | move | Guard rules G1-G10 added; negative fixtures kept; moves under scripts/guards |
| `scripts/check-project-fixture.ts` | `scripts/e2e/check-project-fixture.ts` | move | Fixture safety check |
| `scripts/json.ts` | `scripts/lib/json.ts` | move | Script-only helper; grouped under scripts/lib |
| `scripts/operations-fixture.ts` | `scripts/e2e/operations-fixture.ts` | move | Synthetic operations API for E2E |
| `scripts/test-proxy.ts` | `scripts/e2e/test-proxy.ts` | move | E2E helper |
| `scripts/test-server.ts` | `scripts/e2e/test-server.ts` | move | E2E helper |
| `src/features/analytics/adapters/calendar.ts` | `src/features/analytics/domain/calendar.ts` | move | Pure date logic belongs in domain |
| `src/features/analytics/adapters/read-json.ts` | `src/shared/http/read-json.ts` | move | Shared with operations and feedback adapters |
| `src/features/analytics/adapters/report-values.ts` | `src/features/analytics/adapters/report-mapper.ts` | rename | Wire-to-domain mapper |
| `src/features/analytics/application/read-report.ts` | `src/features/analytics/application/get-audience-report.ts` | rename | Use case with explicit port and unavailable states |
| `src/features/analytics/application/read.ts` | `src/features/analytics/application/get-audience-summary.ts` | rename | Use case for Overview tile |
| `src/features/analytics/presentation/copy.ts` | `src/shared/i18n/messages/analytics.ts` | move | Typed dictionaries live in shared/i18n (es-419 and en-US) |
| `src/features/analytics/presentation/report-copy.ts` | `src/shared/i18n/messages/audience-report.ts` | move | Typed dictionary |
| `src/features/analytics/presentation/selection.ts` | `src/features/analytics/adapters/input/report-query.ts` | move | Server code must not import presentation (guard G4) |
| `src/features/auth/domain/locale.ts` | `src/shared/i18n/locale.ts` | move | Locale negotiation is cross-feature |
| `src/features/auth/presentation/copy.ts` | `src/shared/i18n/messages/auth.ts` | move | Typed dictionary |
| `src/features/auth/presentation/sign-out.tsx` | `src/shared/shell/user-menu.tsx` | move | Lives in UserMenu |
| `src/features/operations/adapters/feedback-http.ts` | `src/features/feedback/adapters/http.ts` | move | Feedback becomes its own feature |
| `src/features/operations/application/read-feedback.ts` | `src/features/feedback/application/get-feedback-overview.ts` | move | Feedback feature |
| `src/features/operations/domain/feedback.ts` | `src/features/feedback/domain/feedback.ts` | move | Feedback feature |
| `src/features/operations/presentation/copy.ts` | `src/shared/i18n/messages/operations.ts` | move | Typed dictionary |
| `src/features/operations/presentation/feedback.tsx` | `src/features/feedback/presentation/feedback-view.tsx` | move | Own route /feedback |
| `src/server/auth/session.ts` | `src/server/dal/session.ts` | move | requireSession and authorize live in DAL |
| `src/shared/accessibility/skip-link.tsx` | `src/shared/shell/skip-link.tsx` | move | Part of shell |

## Splits and merges (11)

| From | To | Action | Motive |
|---|---|---|---|
| `docs/diagrams.md` | `docs/explanation/architecture.md` | merge | Diagrams merged into architecture explanation |
| `src/features/auth/adapters/store.ts` | `src/features/auth/adapters/pg/membership-store.ts` | split | 182 lines split into membership, invitation and session stores (ports only where unit fakes exist) |
| `src/features/auth/application/manage-access.ts` | `src/features/auth/application/{invite-viewer,revoke-access,list-access}.ts` | split | Real use cases with audit and rate limits |
| `src/features/operations/presentation/dashboard.tsx` | `src/features/operations/presentation/{overview-view,kpi-row,needs-attention}.tsx` | split | 331 lines split below 200; Overview template |
| `src/features/operations/presentation/preferences.tsx` | `src/shared/shell/user-menu.tsx` | merge | Preferences join UserMenu (theme, density, language) |
| `src/features/operations/presentation/trace-explorer.tsx` | `src/features/operations/presentation/{runs-table,run-waterfall}.tsx` | split | Runs list on DataTable; Waterfall with shared ms axis |
| `src/server/analytics.ts` | `src/server/container.ts` | merge | Composition root |
| `src/server/auth/config.ts` | `src/server/env.ts` | merge | Single typed env schema; fail at boot |
| `src/server/operations.ts` | `src/server/container.ts` | merge | Composition root |
| `tests/browser/backoffice.spec.ts` | `tests/e2e/{auth,overview,runs,usage,audience,access,privacy,a11y,responsive}.spec.ts` | split | 766 lines split per journey; adds per-role projects and iPhone/Pixel |
| `tests/integration/auth.test.ts` | `tests/integration/{admission,invitations,revocation,audit,iam-runtime}.test.ts` | split | 634 lines split; Testcontainers Postgres; third test no longer skipped |

## Replacements (18)

| From | To | Action | Motive |
|---|---|---|---|
| `.github/workflows/dependency-policy.yml` | `.github/workflows/deps-weekly-guard.yml` | replace | pull_request_target workflow replaced by the shared deps-weekly-guard (zizmor-clean, no PR-head checkout) |
| `.github/workflows/quality.yml` | `.github/workflows/ci.yml` | replace | Split into ci.yml (classify + shared reusable workflows + ci-gate), nightly.yml, security.yml; build once |
| `docs/assets/gallery/01-sign-in.png` | `docs/assets/gallery/01-sign-in.png` | replace | README gallery regenerated from the new UI at PBO-M5, light and dark pairs via <picture> |
| `docs/assets/gallery/02-availability.png` | `docs/assets/gallery/02-availability.png` | replace | README gallery regenerated from the new UI at PBO-M5, light and dark pairs via <picture> |
| `docs/assets/gallery/03-executions.png` | `docs/assets/gallery/03-executions.png` | replace | README gallery regenerated from the new UI at PBO-M5, light and dark pairs via <picture> |
| `docs/assets/gallery/04-tokens.png` | `docs/assets/gallery/04-tokens.png` | replace | README gallery regenerated from the new UI at PBO-M5, light and dark pairs via <picture> |
| `docs/assets/gallery/05-execution-stages.png` | `docs/assets/gallery/05-execution-stages.png` | replace | README gallery regenerated from the new UI at PBO-M5, light and dark pairs via <picture> |
| `docs/assets/gallery/06-access.png` | `docs/assets/gallery/06-access.png` | replace | README gallery regenerated from the new UI at PBO-M5, light and dark pairs via <picture> |
| `docs/assets/gallery/07-unavailable.png` | `docs/assets/gallery/07-unavailable.png` | replace | README gallery regenerated from the new UI at PBO-M5, light and dark pairs via <picture> |
| `docs/assets/gallery/08-mobile-es.png` | `docs/assets/gallery/08-mobile-es.png` | replace | README gallery regenerated from the new UI at PBO-M5, light and dark pairs via <picture> |
| `docs/assets/technology-stack.svg` | `docs/assets/technology-stack.svg` | replace | Regenerated with Tailwind and current versions at PBO-M5 (or removed for text table) |
| `docs/master-plan/README.md` | `docs/master-plan/README.md` | replace | v2 replaces v1 in place; see Changes from v1 in README |
| `docs/master-plan/roadmap.md` | `docs/master-plan/roadmap.md` | replace | v2 replaces v1 in place; see Changes from v1 in README |
| `docs/master-plan/scorecard.md` | `docs/master-plan/scorecard.md` | replace | v2 replaces v1 in place; see Changes from v1 in README |
| `scripts/check-workflows.ts` | `scripts/ci/check-workflows.ts` | replace | actionlint and zizmor come from shared workflow; keep only checksum-pinned local runner for pre-push |
| `scripts/container-policy.ts` | `scripts/container/container-policy.ts` | replace | Rules move to container-structure-test and hadolint; leftover runtime-flag policy kept |
| `src/app/style.css` | `src/app/globals.css` | replace | Tailwind entry plus generated theme.css; 358 lines of hand CSS replaced by tokens and utilities |
| `src/features/operations/presentation/charts.tsx` | `src/shared/dataviz/proportion-bar.tsx` | replace | Redundant 3-bar chart replaced by server-rendered ProportionBar (zero client JS) |

## Deletions (83)

Each deleted file is either dead code, superseded by a shared workflow or by this plan, evidence of the pre-redesign UI, or historical material for a feature that no longer belongs to this repo (the former public chat embed). Evidence is never deleted without its facts being absorbed: where a report held a still-true fact, that fact moves into a Diataxis file listed in the Motive column or in `docs/explanation/status-and-limits.md`.

| From | To | Action | Motive |
|---|---|---|---|
| `IMPLEMENTATION_STATUS.md` | `docs/master-plan/progress.md` | delete | Volatile status; superseded by progress.md and roadmap.md (no volatile facts rule) |
| `contracts/embed.v1.examples.json` | - | delete | Historical public-chat contract (former embed); no src import; backoffice never handles visitor chat (invariant 2); Dockerfile copies types.d.ts needlessly. manifest.json recreated for the four consumed contracts |
| `contracts/embed.v1.schema.json` | - | delete | Historical public-chat contract (former embed); no src import; backoffice never handles visitor chat (invariant 2); Dockerfile copies types.d.ts needlessly. manifest.json recreated for the four consumed contracts |
| `contracts/manifest.json` | - | delete | Recreated at contracts/assistant-api/manifest.json covering only consumed contracts with revision and SHA-256 |
| `contracts/openapi.json` | - | delete | Historical public-chat contract (former embed); no src import; backoffice never handles visitor chat (invariant 2); Dockerfile copies types.d.ts needlessly. manifest.json recreated for the four consumed contracts |
| `contracts/source.json` | - | delete | Historical public-chat contract (former embed); no src import; backoffice never handles visitor chat (invariant 2); Dockerfile copies types.d.ts needlessly. manifest.json recreated for the four consumed contracts |
| `contracts/sse.examples.json` | - | delete | Historical public-chat contract (former embed); no src import; backoffice never handles visitor chat (invariant 2); Dockerfile copies types.d.ts needlessly. manifest.json recreated for the four consumed contracts |
| `contracts/sse.schema.json` | - | delete | Historical public-chat contract (former embed); no src import; backoffice never handles visitor chat (invariant 2); Dockerfile copies types.d.ts needlessly. manifest.json recreated for the four consumed contracts |
| `contracts/types.d.ts` | - | delete | Historical public-chat contract (former embed); no src import; backoffice never handles visitor chat (invariant 2); Dockerfile copies types.d.ts needlessly. manifest.json recreated for the four consumed contracts |
| `docs/assets/architecture-overview.svg` | - | delete | Replaced by Mermaid C4 in README and architecture.md (light/dark safe) |
| `docs/assets/calendar/after-desktop.png` | - | delete | Evidence for the 2026-10-18 calendar report; archived report cites git history |
| `docs/assets/calendar/after-mobile.png` | - | delete | Evidence for the 2026-10-18 calendar report; archived report cites git history |
| `docs/assets/calendar/before-desktop.png` | - | delete | Evidence for the 2026-10-18 calendar report; archived report cites git history |
| `docs/assets/calendar/keyboard-200-webkit.png` | - | delete | Evidence for the 2026-10-18 calendar report; archived report cites git history |
| `docs/assets/calendar/real-native-api-pg-backoffice-desktop-en.png` | - | delete | Evidence for the 2026-10-18 calendar report; archived report cites git history |
| `docs/assets/calendar/real-native-api-pg-backoffice-mobile-es.png` | - | delete | Evidence for the 2026-10-18 calendar report; archived report cites git history |
| `docs/backend-operations-request.md` | - | delete | Handoff request fulfilled and snapshotted; history keeps it |
| `docs/embed-integration.md` | - | delete | Historical public-chat embed contract; ADR 0004 supersedes |
| `docs/engineering-coordination.md` | - | delete | Dated session handoff; superseded by ecosystem.md and RESUME.md |
| `docs/implementation-plan.md` | - | delete | Superseded by docs/master-plan/roadmap.md |
| `docs/master-plan/research/baseline-audit.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/research/delivery-and-observability.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/research/dependencies.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/research/design-and-dataviz.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/research/security.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/research/sources.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/research/standards-docs-skills.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/research/target-architecture.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/research/testing.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/rubrics/README.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/rubrics/senior-designer.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/rubrics/senior-developer.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/master-plan/rubrics/senior-recruiter.md` | - | delete | v1 plan content absorbed into v2 files (see file-moves.md v1 mapping); v1 stays in git history |
| `docs/verification/backoffice/desktop-dark-en.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/backoffice/mobile-light-es.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/backoffice/usage-dark-en.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/baseline-bundle.json` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/baseline-desktop.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/baseline-mobile.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/embed/compact-dark-en.png` | - | delete | Former public-chat embed evidence; ADR 0004 |
| `docs/verification/embed/compact-light-es.png` | - | delete | Former public-chat embed evidence; ADR 0004 |
| `docs/verification/embed/conversation-dark-en.png` | - | delete | Former public-chat embed evidence; ADR 0004 |
| `docs/verification/embed/expanded-dark-en.png` | - | delete | Former public-chat embed evidence; ADR 0004 |
| `docs/verification/embed/initial-desktop-light.png` | - | delete | Former public-chat embed evidence; ADR 0004 |
| `docs/verification/embed/landscape-light-es.png` | - | delete | Former public-chat embed evidence; ADR 0004 |
| `docs/verification/embed/mobile-light-es.png` | - | delete | Former public-chat embed evidence; ADR 0004 |
| `docs/verification/embed/panel-demo.webm` | - | delete | Former public-chat embed evidence; ADR 0004 |
| `docs/verification/final-desktop-dark.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/final-desktop-light.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/final-landscape.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/final-mobile-conversation.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/final-mobile-light.png` | - | delete | Old UI screenshot or bundle snapshot of the pre-redesign UI; CI artifacts and visual baselines replace it |
| `docs/verification/interaction-polish.md` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/after-conversation-desktop.png` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/after-conversation-mobile.png` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/after-desktop.png` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/after-mobile.png` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/before-conversation-desktop.png` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/before-conversation-mobile.png` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/before-desktop.png` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/before-mobile.png` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/live-context-desktop.png` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/verification/interaction-polish/signature-demo.webm` | - | delete | Evidence of 2026-10 interaction polish superseded by redesign; recording 985 KB removed |
| `docs/vps-ops-optimization-handoff.md` | - | delete | Dated handoff; superseded by vps-ops plan and deployment-contract |
| `docs/work-checklist.md` | - | delete | Superseded by roadmap.md and progress.md |
| `public/avatar.png` | `public/avatar.png` | delete | Unused by src after shell redesign (owner confirms); monogram is SVG in icon.tsx |
| `scripts/check-ci-results.ts` | - | delete | Replaced by shared ci-gate job in engineering-standards |
| `scripts/ci-build-provenance.ts` | - | delete | Replaced by attest-image.yml provenance and build-once artifact digest |
| `scripts/ci-postgres.ts` | - | delete | Sibling-API Postgres clone and custom lifecycle replaced by Testcontainers with a digest-pinned postgres:18 image (PBO-D6) |
| `scripts/dependency-automation.ts` | - | delete | Superseded by deps-weekly-guard |
| `scripts/dependency-policy.ts` | - | delete | Superseded by multi-ecosystem Dependabot group and shared guard |
| `scripts/postgres-image-security.ts` | - | delete | Grype gate in shared workflow replaces custom Trivy JSON gate |
| `scripts/postgres-readiness.ts` | - | delete | Testcontainers wait strategy replaces |
| `scripts/verify-postgres.ts` | - | delete | Verified the API-owned Postgres artifact; ownership of that image stays in the API repo |
| `src/features/analytics/presentation/metrics.module.css` | - | delete | CSS Modules removed; replaced by Tailwind utilities in components |
| `src/features/analytics/presentation/report.module.css` | - | delete | CSS Modules removed |
| `src/features/auth/presentation/auth.module.css` | - | delete | CSS Modules removed |
| `src/features/operations/presentation/workbench.module.css` | - | delete | CSS Modules removed (441 lines) |
| `src/shared/ui/button.module.css` | - | delete | CSS Modules removed |
| `tests/unit/ci-postgres.test.ts` | - | delete | Tests the deleted script (see scripts mapping) |
| `tests/unit/dependency-policy.test.ts` | - | delete | Tests the deleted script (see scripts mapping) |
| `tests/unit/postgres-image-security.test.ts` | - | delete | Tests the deleted script (see scripts mapping) |
| `tests/unit/postgres-readiness.test.ts` | - | delete | Tests the deleted script (see scripts mapping) |

## v1 plan content mapping

| v1 file | Where its content went in v2 |
|---|---|
| `docs/master-plan/README.md` | `README.md` (decisions table, owner requirements, limits; "Changes from v1") |
| `docs/master-plan/roadmap.md` | `roadmap.md` (F0-F4 become M2-M5; VPS phase becomes MV) |
| `docs/master-plan/scorecard.md` | `scorecard.md` (14 axes become rubrics v2 axes) |
| `rubrics/senior-developer.md`, `senior-designer.md`, `senior-recruiter.md`, `README.md` | `rubrics.md` (ecosystem rubrics v2, byte-identical) |
| `research/baseline-audit.md` | `audit.md` (re-measured on 2026-11-09; v1 numbers marked [v1]) |
| `research/target-architecture.md` | `target-state.md` (guards G1-G7 kept and extended to G10; ADR numbers 008-017 renumbered 0008-0021; file index moved to `file-index.csv`) |
| `research/design-and-dataviz.md` | `design-playbook.md` (blue identity, Tailwind, shell, data-viz table kept and extended) |
| `research/security.md` | `target-state.md` sections 4 and 8, `testing.md` security rows, ADRs 0014 and 0015 |
| `research/testing.md` | `testing.md` |
| `research/delivery-and-observability.md` | `ci-cd.md`, ADRs 0017, 0019, 0020 |
| `research/standards-docs-skills.md` | `standards.md`, `docs-and-community.md`, `skills.md` |
| `research/dependencies.md` | `dependencies.md` (the "do not add" row reversed for Tailwind by PBO-D1) |
| `research/sources.md` | `sources.md` |

## New files (not in the index because they do not exist yet)

| Path | Purpose | Milestone |
|---|---|---|
| `.github/workflows/ci.yml`, `nightly.yml`, `weekly.yml`, `security.yml` | Profiles, nightly and weekly jobs | PBO-M1 |
| `.github/ci-profile.json` (+ schema) | Path map; coverage-tested | PBO-M1 |
| `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/feature.yml`, `config.yml`, `SUPPORT.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `release-please-config.json`, `.release-please-manifest.json` | Community and release | PBO-M1 / M3 |
| `standards.lock`, `.hadolint.yaml`, `.gitleaks.toml`, `.git-blame-ignore-revs`, `.githooks/pre-commit` | Standards drift, scanners, hooks | PBO-M1 |
| `vitest.config.ts`, `stryker.config.json`, `lighthouserc.json`, `.postcssrc.json` | Test and style config | PBO-M2 / M4 |
| `quality/ratchets/*.json`, `scripts/scorecard/run.ts` | Perpetual-excellence tooling | PBO-M2 |
| `scripts/ci/check-bundle.ts`, `diff-coverage.ts`, `scripts/guards/check-tokens.ts`, `check-kit.ts` | Budgets and guards | PBO-M2 / M4 |
| `src/server/{env,container,log,request-context}.ts`, `src/server/dal/*`, `src/instrumentation.ts` | Composition and authorization | PBO-M4 |
| `src/design/tokens/*.tokens.json`, `src/design/theme.css`, `kit.lock.json`, `kit.exceptions.json` | Tokens and kit | PBO-M4 / M5 |
| `src/shared/{ui,dataviz,shell,format,i18n}/**`, `src/app/(shell)/**`, `src/features/{audit,feedback}/**` | New UI and features | PBO-M4 / M5 |
| `migrations/0003_*.sql`, `scripts/migrate.ts` | Versioned migrations | PBO-M3 / M4 |
| `tests/{component,e2e,integration}/**`, `tests/quarantine.json` | Test net | PBO-M2 |
| `.agents/skills/{add-backoffice-view,design-tokens-backoffice,review-backoffice-pr,plan-resume,security-matrix-backoffice}/**` and `evals/` for all | Harness | PBO-M1 |
| `docs/{tutorials,how-to,reference,explanation,decisions}/**` new files, `docs/verification/archive/INDEX.md` | Diataxis | PBO-M3 |
