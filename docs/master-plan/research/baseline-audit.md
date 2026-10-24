# Baseline audit · 2026-10-24

Audited source: `origin/develop` at `c86816c` (2026-10-18, identical to `main` after PR #99).
Mode: **read-only planning**. Nothing in the repository was modified during the audit; checks
ran in a temporary export (`git archive origin/develop | tar -x`) without secrets.

Evidence labels: **[measured]** = executed or counted; **[code]** = read in the code;
**[hypothesis]** = requires measurement before acting; **[n]** = entry in [sources](sources.md).

## Executive summary

- The backoffice is already **far more rigorous than the average portfolio project**: Better
  Auth with Google/GitHub, no password and no open signup; invitations with a hashed token,
  bound to an email, single-use and transactional; revocation that deletes sessions;
  CSRF/origin checks active; a runtime IAM role without DDL; bounded HTTP adapters (timeout,
  `redirect:"error"`, body ≤ 256 KB, strict key validation); the "unavailable, never zero"
  rule implemented end to end; an AST layer guard; fail-closed CI with SHA-pinned actions; a
  distroless non-root image tested with `--read-only` and `cap-drop ALL`; a README with a real
  gallery and provenance.
- The deficit lies on **four fronts** that a senior reviewer notices within minutes:
  1. **Dashboard design/UX**: correct but generic. Large cards with a lot of whitespace for a
     single state ("Ready", "Fresh"), a 3-bar chart that **duplicates the table below it**, no
     trends (there is no historical contract), no common app shell (each page repeats its own
     header), no `loading.tsx`/`error.tsx`, times in raw ISO ("2026-10-12 23:43:23 UTC")
     without "3 min ago".
  2. **Application architecture**: the layers exist but the *application* layer is anemic
     (`readOperations = port.read()`), composition reads `process.env` in 6 places, the
     `/access` page calls `getAuthRuntime().store.list()` (infrastructure) directly,
     `src/server` imports `presentation/selection.ts`, and ~630 lines of manual validators
     duplicate the JSON Schemas already in `contracts/`.
  3. **Experience testing**: 142 green unit tests, but 0 component tests, 0 visual regression,
     axe without `wcag22aa`, Playwright without mobile projects (iPhone/Pixel), no mutation
     testing; real `src` coverage depends on a single integration test with a database.
  4. **Delivery and operations**: image publication disabled (`if: ${{ false }}`), unversioned
     migrations, no published attestation/SBOM, no OpenTelemetry/structured logs/request ID,
     and the CI job builds the same image **three times**.
- **Weighted baseline scorecard: 76/100.** Target: ≥ 95 on every axis
  ([scorecard](../scorecard.md)).

## What was executed [measured]

Temporary export in the scratchpad, Node 24.22.0 (`.nvmrc`), without `.env`:

| Check | Result |
| --- | --- |
| `npm ci` | OK, 153 packages, 28 s |
| `npm run lint` (Biome 2.5.15) | OK, 144 files, 1 *info* (template literal in `scripts/verify-postgres.ts:247`) |
| `npm run format:check` | OK |
| `npm run typecheck` (TS 7.0.2 + `next typegen`) | OK |
| `npm test` (contract check + `node --test tests/unit/*.test.ts`) | **142/142 pass**, 7.0 s |
| `security:check`, `docs:check` | OK after a local `git init` (they require a git repository): 304 blobs, 228 links |
| `skills:check`, `license:check` | OK (4 skills, 0 findings) |
| `next build --webpack` | OK, 42 s; 10 dynamic routes + static `_not-found` |
| Unit coverage (`--experimental-test-coverage`) | 74.5 % lines / 88.6 % branches **global (includes `scripts/`)**; `auth/adapters/store.ts` 4.4 %, `server/auth/runtime.ts` 7.6 % (covered only by the database integration test); **0 % of `.tsx`** (no component tests) |
| Client JS | ~400 KiB gzip total according to `docs/verification/operations-workbench.md`; Recharts chunk ≈ 108 KiB gzip; CSS 2 files ≈ 6.8 KiB gzip. No per-route budget [hypothesis: Recharts loads on `/` and `/analytics`; confirm with a bundle analyzer] |
| CI (gh, last 15 Quality runs) | 12 success, 3 cancelled (concurrency), 0 failure; duration 3.5–6 min |

Not executed: auth integration (requires isolated PostgreSQL), Playwright (requires the image +
database), Lighthouse. They remain F0 measurements.

## Findings by area

### UI/UX and data visualization [code + `docs/assets/gallery/*.png` captures]

- Hierarchy: the 4 metric cards carry the same visual weight; "Ready"/"Fresh" at ~48 px occupy
  ~1/3 of the first screen for a binary value. What an operator looks for first (is it healthy?
  did anything change? how much budget is left?) is not summarized in a "status strip".
- Chart choice: `SnapshotChart` (`features/operations/presentation/charts.tsx`) shows 3–4 bars
  of a part-to-whole and, below it, the **same** table; the "tokens" mode is a 2-bar chart. For
  the composition of a total, a horizontal *100 % stacked bar* or *proportion bar* with direct
  labels communicates more with less ink; the tabular detail can go in a disclosure.
- Chart header: the "Metric" label floats in the center (toolbar grid) — a visible alignment
  defect in `02-availability.png`.
- Budget ring: decorative `conic-gradient` + sr-only `<meter>` (good), but 0.3 % looks like an
  empty ring; for small budgets a *bullet chart* with 50/80/100 % marks fits better.
- Trace explorer: good idea (relative phases), but no shared time scale (bars relative to the
  longest phase) and no real *waterfall*; 32-hex IDs without shortening/copy.
- 8×8 heatmap in `/analytics` (`report.tsx`): encodes with `fillOpacity` over `--accent`, with
  no visible scale legend and low contrast in light cells in light mode [hypothesis: measure
  3:1 non-text contrast, WCAG 1.4.11]. The alternative table exists (good).
- Times: `Timestamp` prints ISO UTC without local or relative time; "Checked" does not indicate
  staleness.
- Daily chart: `tickFormatter` does `slice(5)` → "10-04", not localized.
- i18n: mixes `es-AR` (dashboard, feedback, trace, overview, metrics) and `es-419` (report) for
  the same locale; owner rule = neutral Latin American Spanish → `es-419` everywhere. Strings
  hard-coded outside the dictionaries (`dashboard.tsx`: "Interacciones"/"Interactions").
- Navigation: there is no app shell; `/`, `/analytics` and `/access` repeat different headers
  (titles: "GMP · Portfolio backoffice", "Access — Assistant backoffice"). `/access` only has
  "back".
- Locale via query parameter (`?locale=`) on every link; fixed `<html lang="en">` and `lang`
  on `<main>`.

### States (empty/loading/error, "unavailable, not zero")

- Strong: `OperationalRead` = `available | unconfigured | unavailable(reason)`; `FeedbackRead`
  and product reads with `disabled`; `helpfulShare` returns `null` when total = 0;
  `budgetShare` is null when the budget is 0; browser tests "operational failure… without
  fabricated metrics".
- Gaps: there are no owned `src/app/**/loading.tsx`, `error.tsx` or `global-error.tsx` (the
  build uses the Next default); the whole dashboard waits for a `Promise.all` of 3 reads (no
  per-section streaming with `<Suspense>`); the `reason` (`transport|authorization|contract`)
  is not shown to the owner (useful for diagnosis); "—" and "Not available" are mixed for the
  same state.

### Responsive / cross-browser

- The layout collapses at 1100/900/560 px; tests at 390×844, 844×390 and 200 % text; desktop
  WebKit in CI.
- Missing: Playwright projects with `devices['iPhone 15']`/`devices['Pixel 7']` (touch, DPR,
  `isMobile`), safe-area on a sticky header (there is no sticky header), and a mobile header
  that currently stacks 3 buttons in 2 rows (`08-mobile-es.png`).

### Accessibility

- Strong: skip link, 3 px `:focus-visible`, tables with `caption`/`scope`, Recharts
  `accessibilityLayer`, `<meter>` for the budget, native dialogs with Escape and restored
  focus, scrollable regions with justified `tabIndex=0`, emulated `reducedMotion`, axe in ~10
  tests.
- Gaps: axe with `withTags(["wcag2a","wcag2aa","wcag21aa"])` → **no `wcag22aa`** (2.5.8 target
  size, 2.4.11 focus not obscured); no real screen-reader test (VoiceOver iOS / NVDA); series
  colors not validated against 3:1 non-text contrast in both themes (warning `#f0ce80` vs
  danger `#ffb4b4` in dark have similar luminance; distinguish by position/label, not color
  alone).

### Auth / security [code]

| Control | State |
| --- | --- |
| OAuth | Google + GitHub, `emailAndPassword:false`, `disableImplicitLinking:true`, `encryptOAuthTokens` |
| Admission | `user.create.before` hook (`mayRegister`) + `session.create.before` (`admit`) with `FOR UPDATE` and atomic invitation consumption |
| Session | 8 h, `updateAge` 1 h, `cookieCache` off (immediate revocation), `backoffice` prefix, secure on https |
| CSRF/origin | `disableOriginCheck:false`, `disableCSRFCheck:false`, `trustedOrigins=[origin]`; Server Actions with Next's native origin check |
| RBAC | `owner`/`viewer`; `requireAccess` / `requireOwner` on every page/action/API; owner re-checked inside the transaction |
| Rate limit | Better Auth, DB storage, 30/60 s (auth routes only) |
| Headers | `proxy.ts`: CSP **only** `frame-ancestors/object-src/base-uri`, XFO, nosniff, Referrer-Policy, Permissions-Policy, `no-store` |
| Audit | `backoffice_access_audit` table with `invite`, `revoke-invitation`, `revoke-member` |

Prioritized gaps:

1. **CSP without `script-src`/`style-src`** (there is an inline theme script): use a nonce via
   `proxy.ts` following the official Next CSP guide [7], or a SHA-256 hash of the fixed script
   (simpler: the script is constant). Add HSTS in the app or state explicitly that the Coolify
   proxy sets it.
2. **Incomplete and mutable audit**: it does not record sign-in, admission, account linking,
   sign-out, denials or role changes; the runtime role has `UPDATE, DELETE` on the audit table
   (`migrations/runtime-grants.sql`) → it must be append-only (`INSERT, SELECT`), with
   `request_id`, `ip_hash`/summarized UA and documented retention. There is no audit view for
   the owner.
3. **Invitation token in the query string** (`/access/invitation?token=…`): mitigated with
   `Referrer-Policy: no-referrer` and an HttpOnly cookie, but it remains in reverse-proxy logs.
   Option: token in the fragment (`#t=`) consumed by a same-origin POST, or accept it and filter
   the parameter in Traefik/Coolify logs (documented in an ADR).
4. Invitations without a per-owner/day limit, without deduplication of pending invitations by
   email, without visible resend/expiry; invitation `revoke` does not verify `rowCount`.
5. No "active sessions / sign out everywhere" for the owner; no re-authentication for sensitive
   actions (revoke) — optional, but it is what a security reviewer looks for (OWASP ASVS 5.0
   V7/V8 [3]).
6. Owner = env email verified by the IdP: correct, but document the risk of an email change on
   GitHub and also pin the owner's `providerAccountId` after the first sign-in.
7. Migrations: `001-access.sql` with `IF NOT EXISTS`, no version table; the next migration has
   no safe path.

### Code quality

- Strong: strict TS (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, `erasableSyntaxOnly`), 0 `.js/.mjs/.cjs` files, Biome with strict
  rules, no `any`, scripts in TS executed natively by Node 24.
- Gaps: `dashboard.tsx` (331 lines) and `report.tsx` (364 lines) mix formatting, derivation and
  markup; manual validators (`operations/adapters/validate.ts` 185,
  `analytics/adapters/validate-report.ts` 303, `validate.ts` 88, `feedback-validate.ts` 56)
  re-implement existing schemas; `Intl` formatters instantiated in each component; styles in
  three languages (global `operation-card`, CSS Modules and inline `style={{}}`); imports with
  and without the `.ts` extension mixed; product naming drift (`portfolio-backoffice` /
  `portfolio-assistant-web` / "Portfolio Assistant Backoffice" /
  `application: "portfolio-assistant-backoffice"` in `/api/health`).
- Non-TS JavaScript to flag: `node --input-type=module` heredocs in
  `.github/workflows/quality.yml` (L209, L322, L425) and `HEALTHCHECK node -e "…"` in
  `infra/docker/app/Dockerfile`. Move them to `scripts/*.ts` (the healthcheck can be
  `node scripts/healthcheck.ts` copied into the image).

### Architecture [code]

- `src/features/{auth,operations,analytics}/{domain,application,adapters,presentation}` +
  `entry.tsx`, `src/server` (server-only composition), `src/shared/{ui,http,accessibility}`,
  AST guard `scripts/check-boundaries.ts` (413 lines) with negative fixtures in
  `tests/unit/boundaries.test.ts`.
- Gaps: (a) anemic application layer without real use cases (the rules live in domain/insights
  and in presentation); (b) scattered composition (`server/operations.ts`,
  `server/analytics.ts`, `server/auth/session.ts`, pages reading
  `process.env.OPERATIONS_SOURCE_MODE`); (c) no single typed configuration module;
  (d) `app/access/page.tsx` → `store.list()` without a port or DTO (exposes `Date` and SQL rows
  to presentation); (e) cross-feature dependencies in presentation
  (`operations/presentation/dashboard.tsx` → `auth/entry`, `app/analytics/page.tsx` →
  `operations/presentation/preferences`); (f) `server/analytics.ts` imports
  `analytics/presentation/selection.ts` (query parsing = input adapter, not presentation).

### Tests, CI, docs and showcase

Tests: see [testing](testing.md#baseline). CI: see
[delivery and observability](delivery-and-observability.md#baseline-ci).

Docs/showcase: solid README (gallery, provenance, diagrams), 6 ADRs, `docs/` with 31 files in
`verification/` — valuable evidence but noise for a recruiter; a very defensive tone ("not a
certification", "not production") repeated in every paragraph; Mermaid in ```text blocks (not
rendered on GitHub); `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `.github/CODEOWNERS`, a feature
request template and `ISSUE_TEMPLATE/config.yml` are missing.

## Top 10 issues

Ordered by impact on senior perception (SD = senior developer, DS = senior designer,
RC = senior recruiter):

1. Dashboard without operational hierarchy or status strip; chart that duplicates a table (DS, RC).
2. No app shell/common navigation and no `loading/error.tsx` (DS, SD).
3. Visual regression, mobile WebKit/Chrome and axe 2.2 absent (SD).
4. CSP without `script-src` and mutable/incomplete audit (SD-security).
5. Anemic application layer + scattered composition + `/access` skipping layers (SD).
6. Manual validators that duplicate JSON Schema (SD).
7. Image publication disabled, no attestation/SBOM, unversioned migrations (SD-ops).
8. No observability (OTel, structured logs, request ID) (SD-ops).
9. Triple image build in CI and double push+PR runs (SD).
10. README/doc sprawl and product naming drift (RC).
