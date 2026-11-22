# API contract ownership and refresh

Private operations v1 is pinned to API commit
`d30d36857c9053693c7817d967a7b38b97d9f12a`. The original schema and example are
imported from committed Git objects, with SHA256 provenance in
`contracts/assistant-api/operations.source.json`. The owned minimal OpenAPI wrapper references
that schema; `operations.types.d.ts` is generated with the existing frozen toolchain.
The bounded adapter maps this wire schema to independent domain models and rejects
unknown fields, inconsistent totals, more than 100 traces or 16 phases per trace.

Local unit tests execute the committed API example through the actual runtime mapper.
Browser tests use deterministic fixtures and real PostgreSQL authentication. Earlier
[API-side adapter verification](https://github.com/gonzalomartinperez/portfolio-assistant-api/blob/30f2d565ce38d15f5a6e69c2323c0f3e358b3eed/docs/verification/private-observability-2026-10-12.md)
exercised real HTTP at API `5ff96d3dbd015ddf9f90f83231052f57b7d494c8` with
backoffice `618aa914ced48bf08ba8d613537ecd28ef797d5e`. It is historical adapter
evidence, not acceptance of the current dashboard over deployed OAuth/HTTPS.

The public HTTP/SSE contract and conversation mapping now belong to the portfolio's native
assistant, committed at `7753d39`. That implementation consumes the committed c6012067
handoff and runs real transport/SSE boundary tests. This repository no longer parses SSE
or exposes a public chat/embed route.

PBO-M3-10 removed the historical public-chat snapshot. The four consumed private
contracts live in `contracts/assistant-api/`. The [manifest](../contracts/assistant-api/manifest.json)
records `contract_version` and maps each snapshot filename under `artifacts` to its
exact-byte SHA-256 and the API commit pinned by its family's source file.
The separately locked generator uses the compiler API it supports, not the primary checker.
See [TypeScript compatibility](adrs/003-typescript7-compatibility.md).

## Consuming the private handoff

1. Obtain the API owner's committed SHA, schema, examples and compatibility notes. Do not
   copy a mutable checkout or promote the proposed endpoint to an implemented guarantee.
2. Import the operational artifacts with explicit provenance. Update the source file,
   hash checker and generator target for the imported schema as needed.
3. Regenerate types, review the diff and update the manifest with the hashes of the final
   bytes and the API commit for each affected artifact. Keep keys sorted and use two-space
   JSON indentation with a trailing newline. Update bounded runtime validation separately.
4. Verify authenticated reads, failures, unknown fields, sizes, timeout/cancellation and
   a real isolated backend. Keep fixture and integration evidence distinct.
5. Record consumed/tested revisions in the runtime contract and release metadata. Until
   that evidence exists, operational compatibility remains unverified and deployment disabled.

`npm run contract:install`, `npm run contract:generate` and `npm run contract:check`
install the frozen generator, regenerate the four private declaration files and check
the snapshot. The checker verifies manifest coverage and hashes, source pins and OpenAPI
wrappers.

## Aggregate report v2

`contracts/assistant-api/product-analytics-v2.source.json` pins the additive private report schema
from API `7f94f8cddfff8d1aae193f694042c03080632e31`. The v1 product snapshot remains
unchanged and its existing dashboard remains available. The new server-only composition
exposes `loadProductReport(selection)` for the detailed dashboard increment; importing
the contract does not by itself deliver its visual interface.

The v2 adapter calls `/internal/ops/v2/product-analytics` with closed calendar,
section, region, viewport and event-language filters. Interface `locale` and data
`eventLocale` are separate. It shares the existing five-second, bounded-response,
no-cache/no-redirect/no-retry transport policy. Service tokens stay server-side.
Runtime validation checks the echoed selection, UTC calendar boundaries, complete
section/region buckets, suppression thresholds and consistent totals before mapping
to independent application models. Counts describe received events, not people,
reading, attention or conversions. Disabled country collection can coexist with
historical country aggregates; it does not erase them or prove proxy trust.

Focused evidence is recorded in
[aggregate report adapter verification](verification/product-report-adapter-2026-10-18.md).

## Independent feedback contract

`contracts/assistant-api/feedback.source.json` pins the committed API schema and hash independently
of operational status and product counts. The minimal owned OpenAPI wrapper is checked
against that schema, then the frozen generator emits `feedback.types.d.ts`. No public
paths are invented by the wrapper. See [feedback semantics](feedback-and-improvement.md).
