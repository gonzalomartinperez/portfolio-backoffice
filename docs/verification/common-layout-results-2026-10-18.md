# Backoffice common layout: verification

Baseline develop8d82bcea0d93815e54df7c839dd163119aaa6909 and the RED preflight
are preserved. This increment physically relocates private composition to
src/server, owned primitives to src/shared/ui, and auth responsibilities into
feature domain/application/adapters/presentation packages.

The browser-session port has three operations. SDK responses become booleans and
reviewed callback paths remain in the adapter; views render pending/errors. The
client entry injects the adapter without passing function props across a server
boundary. There is no new OAuth provider, retry, store or dependency framework.

The guard classifies every src/server module as private, including CLI-safe pure
config. Direct, dynamic, type-only, barrel and @/ source-prefix cases are tested.
Only explicit Server Actions with async-only runtime exports terminate traversal;
a filename or directive combined with an exported secret does not suffice.
The migration trace admits only the actual config/runtime/access closure and SQL.
It rejects request/session/actions, views and fixture-session tools. CLI-safe
factories remain free of Next request APIs and server-only poisoning.

## Local evidence

- `npm test`:120passed,0failed,28.20s. Includes new session-result, callback,
  single-attempt/network, private-closure and packaging negatives. No OAuth request
  or paid model call is made by these unit tests.
- `npm run typecheck`: TypeScript7.0.2, generated Next routes and complete configured
  source/test/tooling scope pass. Compiler API compatibility resolves6.0.3.
- `npm run lint`, `npm run format:check`, contract, skills and documentation checks
  pass. Two pre-existing informational/warning diagnostics remain in unrelated
  release/receipt tests; no rule was suppressed or weakened for this migration.
- Trace fixture preserves plain Node TypeScript, both SQL resources and idempotent
  copying; unknown required dependencies still fail packaging.

Real IAM/fake-provider integration, production build, hardened image and all browser
engines remain mandatory on the implementation PR. Existing screenshots keep their
actual original SHAs; moving source is not new visual/device evidence. Contracts,
IAM SQL, cookie names, environment values, routes, runtime versions and style bytes
are unchanged. Version1.0 metadata remains a separate pending release increment.
Production activation/publication/deployment and live OAuth verification are not
claimed by local unit/static results.
