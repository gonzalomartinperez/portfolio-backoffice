---
status: accepted
date: 2026-11-22
decision-makers: owner (PBO-D12), planner
---

# ADR 0015: Nonce CSP, HSTS, server-rendered theme cookie and invitation token transport

Accepted with PBO-M3-4.

## Context and problem statement

`src/proxy.ts` sent only `frame-ancestors`, `object-src` and `base-uri`, so nothing restricted
script or style execution, while `src/app/layout.tsx` injected an inline pre-paint theme script
that read `localStorage` (audit P0-5). That script made a strict `script-src` impossible.
HSTS was left to the TLS-terminating reverse proxy, which the application cannot verify. The
invitation link also carries a bearer token in the query string, and the roadmap asks for that
transport to be a recorded decision.

## Decision drivers

- No `'unsafe-inline'` in `script-src`; a stolen markup injection must not run script.
- First paint must show the right theme without a script (no flash).
- Next.js 16 applies nonces during server-side rendering from the request CSP header
  (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`).
- The OAuth sign-in must keep working; no new dependency.
- The invitation token must not leak through logs, history or `Referer`.

## Considered options

Script policy:

1. Per-request nonce with `'strict-dynamic'`, generated in the proxy (chosen).
2. Hash-based CSP for the inline theme script (static, but keeps an inline script and breaks on
   every edit).
3. Keep the inline script and `'unsafe-inline'` (rejected: no protection).

Theme: server-readable cookie rendered into `<html data-theme>` (chosen), or `localStorage`
plus a script (rejected).

Invitation token: (a) keep the one-time query token moved into an HttpOnly cookie and stripped
by redirect (chosen); (b) URL fragment read by a script and posted back (rejected: needs script
and a new endpoint); (c) a POST form on a landing page (rejected: needs a rendered page and the
owner pastes a link, so a GET link is the product requirement).

## Decision outcome

### CSP

The proxy generates `btoa(crypto.randomUUID())` per request, sets `x-nonce` and the CSP as
request headers (Next reads the nonce from them) and sets the CSP on the response:

```text
default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; style-src 'self' 'nonce-<n>';
style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

- Development adds `'unsafe-eval'` to `script-src` (React uses it for debugging stacks) and uses
  `style-src 'self' 'unsafe-inline'` instead of the nonce, because the Next dev overlay injects
  nonce-less `<style>` elements (a nonce would also disable `'unsafe-inline'`). Production keeps
  nonce styles.
- `upgrade-insecure-requests` is added only on https origins, so plain-http local runs still work.
- Style: element styles (`<style>`, next/font and CSS Modules output) are strict (`'self'` plus
  the nonce). React `style={{...}}` attributes (chart bars, metric bars, `global-error.tsx`)
  cannot carry a nonce, so `style-src-attr 'unsafe-inline'` allows inline style attributes
  only. A style attribute cannot run script or load a resource that `img-src`/`font-src`
  do not already permit, so the residual risk is CSS-based UI redress or data exfiltration
  through selectors, which `connect-src`/`img-src 'self'` and the absence of attacker-controlled
  markup already bound. Removing the attribute channel means replacing each dynamic inline
  style with a CSS custom property set through a nonce-less class, which is a later
  design-system task.
- `form-action 'self'`: social sign-in uses the Better Auth client, which sends a same-origin
  `fetch` to `/api/auth/sign-in/social`, then navigates with `window.location.assign` to the
  provider URL it returns (`src/features/auth/adapters/browser-session.ts`, `client.ts`).
  Navigation is not governed by `form-action` or `connect-src`, so Google and GitHub origins
  are not listed. The provider callback returns to `/api/auth/callback/*` by a top-level
  GET redirect. If a future flow submits a form to a provider, add only that origin.
- Every page is dynamic because the root layout reads cookies; Next cannot prerender a nonce.
  The proxy matcher still covers all pages and route handlers except `_next/static`,
  `_next/image` and `favicon.ico`, so `/api/*` responses carry the same headers.

### HSTS

`Strict-Transport-Security: max-age=63072000; includeSubDomains` (no `preload`) is sent when
`BACKOFFICE_ORIGIN` starts with `https:` or the request URL is https. A caller-supplied
`X-Forwarded-Proto` is deliberately not trusted: a client could otherwise force HSTS on an http
origin. The configured public origin is the single source of truth. Plain-http local and CI runs never receive it, so a developer browser
does not pin `localhost`. Preload is excluded because it is effectively irreversible and
covers the parent domain, which the owner has not authorized.

### Theme cookie

`backoffice-theme` is `dark`, `light` or `system`, `Path=/`, `SameSite=Lax`, one year,
`Secure` on https, not HttpOnly (the preferences control writes it). The control offers Dark,
Light and System, is initialised from the server-rendered preference, and choosing System
writes `system` and removes `data-theme`. The root layout renders
`data-theme="dark|light"`; a missing or invalid value renders `dark`, the existing default, and
`system` renders no attribute so `style.css` follows `prefers-color-scheme` with dark as the
fallback. The inline script is deleted. Existing `assistant-theme` localStorage values are
not migrated: the theme resets to dark once, which avoids a script. Density is not part of this
decision because it does not exist yet.

### Referrer-Policy on the invitation landing

Next keeps a `Referrer-Policy` that is already present on the response, so the proxy default
(`strict-origin-when-cross-origin`) would have won over the handler's `no-referrer` on the
307. The proxy therefore sets `no-referrer` for `/access/invitation` itself; the handler keeps
its own header.

### Invitation token transport

Evidence: `src/app/access/invitation/route.ts` validates `^[a-f0-9]{64}$`, stores it in the
`backoffice-invitation` cookie (HttpOnly, SameSite=Lax, Secure on https, 48 hours) and answers
with a redirect to `/sign-in?locale=...` that drops the query, with `Cache-Control: no-store`
and `Referrer-Policy: no-referrer`. `invitationToken()` in `src/server/auth/config.ts` accepts
only the same 64-hex shape from the cookie. Only the SHA-256 digest is stored and the token is
consumed atomically (docs/authentication.md). The exposure window is the single landing request
(server access logs, which docs/authentication.md requires to redact the query) and the
recipient's browser history entry for the link, which the redirect replaces. The code shows no
weakness that a different transport would fix, so option (a) stays. A SameSite=Lax cookie is
sent on the top-level OAuth callback navigation, which is why it survives the provider round
trip.

## Known limitation

Next's built-in static 500 page (`builtin/app-error`) emits a nonce-less `<style>`, which the
production CSP blocks, so that page renders unstyled. It is accepted: the application's
`error.tsx` and `global-error.tsx` cover normal failures and the unstyled page keeps its text.

## Consequences

- Good: injected markup cannot execute script; no inline script remains; no theme flash.
- Good: HSTS no longer depends on an unverified outer layer.
- Bad: no static prerendering or CDN caching of HTML (already true: `no-store`).
- Bad: `style-src-attr 'unsafe-inline'` remains until dynamic styles move to classes.
- Bad: a one-time theme reset for users who had chosen light in `localStorage`.
- Any new third-party script or origin needs an explicit CSP change reviewed with the code.

## Confirmation

- `tests/unit/security-headers.test.ts`: exact CSP, fresh nonce per request, nonce forwarded to
  rendering, development-only `'unsafe-eval'`, HSTS and `upgrade-insecure-requests` only on https origins (not on a forged `X-Forwarded-Proto`),
  development-only inline styles, and `no-referrer` on the invitation path.
- `tests/unit/theme.test.ts`: cookie parsing and attribute rendering rules.
- `tests/browser/csp.spec.ts`: zero CSP violations on `/sign-in`, `/privacy` and the owner
  overview, inline scripts carry the response nonce, and the theme cookie renders
  `data-theme` in the server HTML.
- `tests/browser/preferences.spec.ts`: the control writes the cookie and the theme survives
  the language reload.
