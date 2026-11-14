---
name: web-refresh-contract
description: "Import a committed operational API handoff into the backoffice with provenance, runtime validation mapping and compatibility tests. Use when the request is to refresh, bump, re-pin or compare the API contract snapshot, regenerate types from a new API commit, or check contract drift, even if it is phrased as the backend added a field or the metrics response changed. Do not use for public chat or portfolio site UI (portfolio repo), implementing assistant API endpoints, retrieval or prompts (portfolio-assistant-api repo), deployment, Coolify or VPS operations (private vps-ops, owner-only), building backoffice features (web-change-backoffice), CI or image review (web-review-delivery) or UI and auth verification (web-verify-backoffice)."
metadata:
  owner: gonzalomartinperez
  last-reviewed: "2026-11-14"
  version: "1.1.0"
---

Read the [operating contract](../../../AGENTS.md),
[API procedure](../../../docs/api-contract.md) and
[operational request](../../../docs/backend-operations-request.md).
Require an immutable API commit, committed schema/examples and authorization notes.
A proposed endpoint or mutable sibling working tree is not a consumed contract.
Review-only requests compare and report without imports or external mutations.

Inspect existing provenance and [runtime adapter](../../../src/features/operations/adapters/http.ts).
Compare paths, authentication, schema/version, body limits, timeouts and privacy fields.
Reject arbitrary attributes, transcript content and secret-bearing data; do not expand
browser access to the private API. Types must be accompanied by runtime validation.

Import only committed artifacts, regenerate types with the maintained command and record
SHA plus hashes. Run `npm run contract:check`, `npm run typecheck` and `npm test`.
Never hand-edit generated types or refresh hashes to hide unexplained drift. Update fixtures
deliberately and report synthetic versus real compatibility verification separately.

If no handoff exists, retain the pin and continue independent fixtures. Publish a precise
request; never edit the API, start paid model calls or invent compatibility guarantees.
Public HTTP/SSE conversation integration now belongs to the portfolio. Old snapshots and
SSE evidence remain historical until migration verification permits their retirement.
