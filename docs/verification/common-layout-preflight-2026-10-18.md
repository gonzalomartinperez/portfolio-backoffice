# Backoffice layout preflight · 2026-10-18

Baseline8d82bcea0d93815e54df7c839dd163119aaa6909 includes accepted calendar UI
and its independently attributed native/API/PostgreSQL proof. This increment moves
source responsibilities without changing routes, SQL, wire contracts, cookie names,
provider choices, deployment authority or activation flags.

| Consumer | Preservation / regression |
| --- | --- |
| Protected routes and callbacks | Live membership and one lazy request-facing auth runtime |
| Owner Server Actions | Explicit async RPC exports, requireOwner and transactional store checks |
| auth-migrate and fixture-session | Plain Node imports of CLI-safe configuration/runtime, pool cleanup |
| Standalone NFT packaging | Exact relocated configuration/runtime/store/domain closure; both SQL files |
| Auth client controls | Three small SDK operations through an owned browser-session port and client entry composition |
| Shared button primitives | One owned shared/ui implementation; existing tokens/variants |
| Operations/analytics composition | Private server composition, explicit injected read ports, unchanged validators |

The new layout tests run before movement. `node --test tests/unit/layout.test.ts`
reports2 failures and1 pass on the old tree: new private server/config paths are
not classified and relocated migration files are not permitted. The positive
explicit Server Action/shared-UI scenario remains valid. These RED results are
not release acceptance; they must become green before the PR is ready.

The independent source review identified plain-Node poisoning and an overly broad
migration trace as concrete risks. Do not add server-only or next/headers to the
CLI-safe config/factory closure. Mark private server paths in graph validation
without relying on those imports. Narrow the NFT allowlist; do not allow all src/server.
Add positive Server Action references and negative ordinary/private barrels.

Auth presentation currently imports its SDK adapter directly from the feature root.
Moving it into presentation requires a real boundary: a narrow application-owned
browser-session port and a small client composition entry. This is three operations,
not a store/DI framework or a new auth policy. Existing callbacks and errors must
remain equivalent and be verified through auth/browser checks.

No sibling repository changes or new runtime dependencies are required. Source move
acceptance includes strict TypeScript7/generated routes, boundary negatives, trace
fixtures, real IAM tests, production image/scan and available browser engines.
Prior screenshots retain their original source SHAs; later moves never relabel them.
