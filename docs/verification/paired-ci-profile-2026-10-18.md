# Paired backoffice profile preparation · 2026-10-18

Selected contract: vps-ops `8ab1878a318f5572b5d21993ad7a471655a14647`,
`docs/architecture/ci-profiles.md`. Canonical workflow and required-check transition are
specified in [CI](../ci.md).

## Preserved coverage and deliberate exception

The former browser job contained image scanning, PostgreSQL artifact/role/recovery checks,
real OAuth/PostgreSQL integration, runtime/resource/shutdown probes and66 browser cases.
These are now explicit database, container and browser adapters; none is a dummy or removed.
Only the container job writes the shared BuildKit cache; the other runtime jobs restore it.
The database adapter retains the immutable foreign API recipe and actual application image
argument. Both browser operational modes, all three engines and the existing screenshot/
recovery receipt privacy policy remain.

Three isolated runtime jobs rebuild the same candidate/configuration because no approved
private cross-job image transport exists. Images and provenance receipts remain on their
runner. Actual cost is recorded by the private source-bound build manifest and Actions job
metadata; no speedup or final image equivalence is claimed before those runs execute.

## Acceptance state

- Local pre-commit static checks:129 unit tests passed; TypeScript7/route generation,
  formatting, targeted lint, documentation and four-skill validation passed.
- Official checksum-verified actionlint passed with the single intentional publication-OFF
  diagnostic exception; negative cases reject any second or changed diagnostic.
- Static Playwright discovery enumerated all66 cases and verified Chromium/Firefox/WebKit
  mappings without launching a browser or starting services.
- Local real database/image/browser acceptance: not run; a fresh operations lease is required.
- Actual Actions validation: pending PR creation and exact-head verification.
- Required-context/protection transition: owner-owned, pending new-context success.
- Final develop/main post-merge runs: pending; no merge or production authority is implied.

Earlier Docker-layout and server-composition receipts describe their own revisions. They
are not transferred as evidence that this new DAG, context names or final candidate passed.
