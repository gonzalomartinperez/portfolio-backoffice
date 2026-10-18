# ADR007: private composition and feature-owned auth ports

Accepted as implementation candidate,2026-10-18. Required PR CI remains authoritative.

Source folders now express actual boundaries: thin app routes, private server
composition/config/lifecycle, feature domain/application/adapters/presentation and
shared owned UI. Operations/analytics server entry modules move to src/server;
auth config and runtime factories remain plain Node-safe for migrations.

A client entry wires the three browser auth controls through BrowserSessionPort.
The port exposes success/failure and supported provider/locale values, not SDK
payloads. This avoids presentation→adapter imports without a context/store or DI
framework. Server routes pass serializable props. Server Actions stay explicit
async RPCs and retain live membership plus transactional owner checks.

Static privacy checks classify server paths without relying on server-only imports.
CLI configuration/factories must not import next/headers; request session composition
retains its marker. Runtime packaging uses an exact reviewed trace closure instead
of permitting the entire auth/server tree. Negative fixtures reject false actions,
private barrels and fixture tooling. No generic shared-utils package is introduced.

See [architecture](../architecture.md) and
[verification](../verification/common-layout-results-2026-10-18.md). No wire, SQL,
cookie, OAuth policy or deployment authority changes follow from this source move.
