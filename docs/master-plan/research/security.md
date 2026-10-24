# Security hardening plan

Planning only. Baseline controls and prioritized gaps are in the
[baseline audit](baseline-audit.md#auth--security-code). Bracketed numbers refer to
[sources](sources.md).

| Item | Action | Verification |
| --- | --- | --- |
| CSP | `script-src 'self' 'sha256-<theme>'` (constant script) or a nonce in `proxy.ts` [7]; `style-src 'self' 'unsafe-inline'` only if Recharts requires it (measure); `connect-src 'self'`; `img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com` if avatars are shown; `report-to` | header test + browser test with no CSP violations in the console |
| HSTS | `max-age=63072000; includeSubDomains` in the app (idempotent with Traefik) | header test |
| Audit | `audit` feature; events: sign-in, admit, deny, link, sign-out, invite, revoke-*, role-change; `INSERT, SELECT` only; 365-day retention (documented job) | integration test: the runtime role cannot `UPDATE/DELETE` audit |
| Invitations | limit of 10/day/owner, dedupe pending by email (partial unique), revoke with a `rowCount` check, visible TTL, resend = revoke + create | integration tests |
| Sessions | "active sessions" view + "sign out everywhere" (owner and self) | integration + E2E |
| Owner binding | record the owner's `providerAccountId` on the first admission; alert if it changes | integration |
| Rate limiting | invitation/revocation Server Actions with a limiter (DB table or Better Auth's) | unit + integration |
| Migrations | versioned (see [dependencies](dependencies.md): `node-pg-migrate` or an own ~60-line runner with a `schema_migrations` table + the existing advisory lock) | CI: migrate up from empty and from version N-1 |
| Supply chain | `npm audit` (already), + OSV-Scanner, `zizmor` for workflows, CodeQL JS/TS, OpenSSF Scorecard [23] | CI |
| Security tests | see [testing](testing.md#security-tests) | CI |

Map each control to ASVS 5.0 L2 (V6 authentication, V7 session, V8 authorization, V16
logging) in `docs/security-controls.md` — that document is exactly what a senior reviewer
opens [3].

Other references: Next.js data security [1][2], OWASP Next.js cheat sheet [4], Better Auth
security reference [5].
