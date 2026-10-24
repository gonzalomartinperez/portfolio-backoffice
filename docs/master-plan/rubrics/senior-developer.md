# Senior developer rubric

Lens: a senior engineer reviewing correctness, security, architecture, tests and operability.
Criteria marked **C** are critical (see [scoring](README.md#how-to-score)). Details live in the
[research](../research/) documents.

## 3 · States

- **C** Every metric is a `Metric<T>`; unavailable renders `—` + "Not available" + reason;
  never zero or a zero-height bar.
- Owned `loading.tsx`, `error.tsx`, `not-found.tsx` and `global-error.tsx`; per-section
  streaming with `<Suspense>` so one failing upstream does not block the page.
- Named fixture scenarios (`healthy` … `partial-week`) covered by component tests.

## 4 · Responsive and cross-browser/mobile

- **C** Playwright projects `chromium`, `firefox`, `webkit`, `mobile-safari` (`iPhone 15`) and
  `mobile-chrome` (`Pixel 7`) green with `retries: 0`.
- 0 flakes with `--repeat-each=5` across the five projects.

## 5 · Accessibility

- **C** axe with `wcag2a, wcag2aa, wcag21aa, wcag22aa`: 0 violations on all routes and states.
- Own checks for target size, focus not obscured and series contrast (script).
- Signed VoiceOver iOS / NVDA checklist per release in `docs/verification/`.

## 6 · Auth/security

- **C** Full CSP (hash or nonce for the theme script) and HSTS, verified by header snapshots
  and a browser test with no CSP console errors.
- **C** Append-only audit (`INSERT, SELECT` only), proven by an integration test; complete
  event set.
- **C** RBAC matrix (owner/viewer/revoked/anon × route/action) executed in E2E; CSRF/origin,
  OAuth and session cases of the [security tests](../research/testing.md#security-tests) green.
- Invitation limits/dedupe, active sessions + sign out everywhere, owner binding.
- `docs/security-controls.md` maps every applicable ASVS 5.0 L2 control to a test.

## 7 · Code quality

- **C** Strict TypeScript everywhere; no new JavaScript source; inline workflow/Dockerfile JS
  moved to `scripts/*.ts`.
- No `.tsx` file over 200 lines; formatting/derivation moved to `shared/format` and `domain`.
- Generated contract validators replace the manual ones; single `es-419` locale; unified
  product name.

## 8 · Architecture

- **C** Guard rules G1–G7 pass without exceptions; 0 `process.env` outside `server/config.ts`.
- Use cases own authorization; single composition root; ADRs 008–017 written.

## 9 · Tests

- **C** Domain/application 100 % lines, ≥ 95 % branches; mutation score ≥ 85 %.
- **C** Visual regression is a gate: 0 unapproved diffs.
- Component tests (Vitest browser) for every state of every view; contract tests accept all
  examples and reject the mutated corpus.

## 10 · CI reliability and efficiency

- **C** Required gate stays fail-closed; actions SHA-pinned; least privilege.
- Image built once and consumed by digest; PR p50 ≤ 6 min; zizmor, CodeQL, Scorecard (≥ 8).

## 11 · Release/deploy readiness

- **C** Versioned forward-only migrations tested from empty and from N-1.
- Release workflow with attestation + SBOM + cosign, `gh attestation verify` proven in a
  dry-run; publication stays gated by the owner.
- Deploy/rollback runbook for vps-ops; typed env fails at boot.

## 12 · Observability

- **C** Structured JSON logs with `requestId` and no emails, tokens or raw IPs.
- OTel traces visible in a local collector; `x-request-id` propagated to the API; metrics
  listed in the [observability plan](../research/delivery-and-observability.md#observability).

## 13 · Docs (technical)

- Architecture with C4 and layer diagrams; `docs/testing.md`, `docs/observability.md`,
  `docs/runbook.md`; curated `docs/verification/` index.

## 14 · Agent skills

- Skills updated to the target architecture; four new skills; 3–5 activation evals per skill
  run by `check-skills.ts` or a manual job.
