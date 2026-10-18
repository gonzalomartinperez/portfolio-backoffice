# Aggregate report adapter verification · 2026-10-18

This increment prepares the private report boundary. It is not acceptance of the
new visual dashboard, native portfolio collection, Cloudflare headers or VPS deployment.

Schema source: API `7f94f8cddfff8d1aae193f694042c03080632e31`;
SHA256 `856afd5790079fbf14b1d61731bbb27ee72ff838871672144c7b21b73a290f2c`.
API implementation inspected at `defe16a855a13401292257d337ce5dd937b00d23`;
[Actions run 39082787942](https://github.com/gonzalomartinperez/portfolio-assistant-api/actions/runs/39082787942)
passed static, real-service/container and aggregate checks. That run is API evidence,
not a claim that the backoffice has exercised the full new dashboard against it.

Local WSL Linux, Node24.22.0, TypeScript7.0.2 primary checker:

- `npm test`: 100 tests passed, including architecture and negative fixtures.
- `npm run typecheck`: generated Next.js route types and strict primary checker passed.
- `npm run lint`: passed.
- Focused report/legacy adapter tests cover calendar/leap-year/ISO-week boundaries,
  UTC offsets, wire-to-model mapping, country/cell suppression, mismatched filters,
  invalid totals, unknown sensitive fields, bounded HTTP responses and no retries.

The first full test run found the architecture guard treating an interface's
`window` property name as the browser global. The guard now distinguishes property
names from global references. Negative tests retain rejection of `window.location`,
`globalThis.window`, destructuring from `window` and `typeof window` in types.
No permission or dependency boundary was relaxed.

The new report has not yet been connected to the route UI or verified visually.
Production image packaging and cross-service/browser verification remain required
for this candidate. Existing public assistant activation remains unchanged.
