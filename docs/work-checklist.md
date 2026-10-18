# Native assistant and backoffice delivery

One checklist; evidence describes actual behavior, not intentions. Source changes are
integrated into develop through backoffice PR28 (`51f638487cbcb3cedc0bff1678a25892f9099063`)
and portfolio PR94 (`83a4ecde0591da9c35c939a8c6b82dc9b010fdc6`). Main and production remain separate.

| Priority | Deliverable | Status / acceptance |
| --- | --- | --- |
| 1 | Preserve work and ownership | Completed: isolated worktrees and merged target-branch changes; no API/vps-ops edits |
| 1 | Native portfolio chat | Completed: persistent compact/maximized/mobile/page presentations; 31 unit/network, 68 targeted browser checks and final 388 full-matrix checks pass |
| 1 | API synchronization | Public API c6012067 verified without interception in three engines using fixture generation; private operations v1 is pinned; current browser/API deployment pairing remains unverified |
| 2 | OAuth and invited access | Implemented and PostgreSQL fixture integration verified: owner admission, invitation callback/consumption and revocation; live providers pending |
| 2 | Operational dashboard | Completed against labeled fixtures: bounded validation, honest unavailable states, interactive Recharts aggregates and semantic tables; committed schema/example mapping verified; production pairing pending |
| 3 | UX and accessibility | Verified EN/ES, dark/light, compact/maximized/mobile/page, continuity, sources, keyboard, reduced motion and 200% text; physical devices/assistive technology pending |
| 3 | CI and production image | Completed: current-head backoffice run37247552502 passes exact-image migration/auth/browser checks; native run37248316043 passes all required gates and Hostinger compatibility |
| 4 | Skills | Four canonical workflows; structural/negative tests and actual Codex/Claude discovery pass in working tree and clean Linux clone; model-driven routing/invocation unverified |
| 4 | Rename and dependencies | Public repo renamed in place to portfolio-backoffice (same repository ID/history); Dependabot26/27 merged with required checks; security-alert/fix proposals enabled; manual review is the selected policy; auto-merge remains disabled |
| 4 | Deployment handoff | Committed application image/runtime/Coolify contract and private monitoring request; vps-ops owns shared production execution |
| pending | Deployed operational telemetry | Private API v1 is implemented and pinned; configure authorized runtime pairing through vps-ops; no deployed metrics or trends are claimed |
| deferred | Production acceptance | Real OAuth registrations, OpenAI evaluation, image-publication approval, Coolify/DNS/effective headers, backups and device testing |

[Backoffice evidence](verification/backoffice.md) includes inspected fixture screenshots.
[Native evidence](https://github.com/gonzalomartinperez/portfolio/blob/develop/docs/verification/native-assistant.md)
records actual compact/mobile/page and API integration verification. Historical iframe
baseline is preserved in Git, not presented as the current implementation.

## Current project-wide increment — 2026-10-17

- Integrated: product counts and factual privacy notice (PR64); project identity and
  website/assistant separation (PR65). Canonical repository: `portfolio-backoffice`.
- Integrated in develop: count-only answer feedback, pinned to API72; independent default-off
  runtime flag, no raw conversation review or automatic learning. See
  [feedback scope](feedback-and-improvement.md) for exact semantics and
  [executed evidence](verification/product-feedback-2026-10-17.md).
- Blocked: production release acceptance, including the API's unresolved Neo4j image
  findings and fresh exact-digest assessment; ordinary code CI is not that acceptance.
- Deferred: publication, deployment/activation, live OAuth and physical-device testing.

## Calendar analytics closure — 2026-10-18

- API PR91 integrated into develop (`ed728479f4301984ebddec60cf77752604ceb3c7`):
  v2 aggregates, migration009, closed country semantics and offline shared fixtures.
- Backoffice PR78: calendar UI, separate filter scopes, thresholded grid and retained
  explicit legacy view verified at300b1e2:104 unit/66 browser cases and production image CI pass.
- Native site delivery persisted in the isolated real API/PostgreSQL fixture:
  14 native events plus17 seed events; authenticated corrected-build browser readback passes
  with5/7/6 totals and2/1/2 Spanish mobile selection. See the
  [dated acceptance](verification/calendar-report-2026-10-18.md) for precise execution environments.
- Tooling regressions cover SIGTERM cleanup and exclusive0600 session artifacts.
- Main/final tags, production activation, live OAuth and Neo4j vendor acceptance remain
  separate gates. Fixture acceptance never substitutes for those requirements.

## Current architecture and source-release closure · 2026-10-18

- **Completed:** PR79 private composition, auth application/session port, capability
  adapters, shared UI and fail-closed client/NFT boundaries. Tested head
  48fa0baf1eb034998b1a76454cb2b7b4901088b1 merged into develop
  f08189eab68d0c0b585d2806710dad936ff17004. CI39091216691passed120unit tests,
  real IAM/fake-provider/image checks and66browser scenarios across three engines.
  [Dated layout evidence](verification/common-layout-results-2026-10-18.md) separates
  local and hosted verification. Independent source review closed with no P1/P2.
- **Completed:** PR80 canonical Docker recipes/ignore files; CI39091565974 passed
  124unit tests, real IAM/image/scan checks and66browser cases before normal merge
  49d0c737414e3dc867f3fecca6b8f8a026b6fdb9. Pinned foreign sources keep their actual paths.
- **Completed:** PR81 seven-job paired CI profile and source/build provenance.
  CI39093381592 passed129unit and66browser cases, real IAM/recovery and image checks
  in296seconds observed end to end. This is one run, not a measured speedup. Normal
  develop merge7a779bd709af3c9d5d086c32e1d920c0c7a0e2cf has its own required run.
  The additive read-back protection bridge retained strict up-to-date checks, GitHub
  Actions app15368 and enforced administrators on both develop/main.
- **Completed:** source1.0 metadata and automatic skill discovery guards, normal
  PR82 merge518e223cc630f18d7d37efbf3a8199b946fedbcf after
  CI39093971935 passed129unit/66browser cases and all seven jobs. Actual client
  discovery used zero model turns. Schema versions, cookies and IAM names are
  unchanged; source promotion/tags remain separate from publication and the
  blocked production stack.
- **Blocked/deferred:** existing Neo4j security, live OAuth, deployment/activation,
  physical-device/screen-reader and VPS capacity gates remain unchanged. No new
  model calls, external exports, services or collector activation were added.

## Original security hold and replacement · 2026-10-18

- **Blocked:** PR90 adds the previously missing full IAM PostgreSQL image scan.
  Actual combined CI39096722293 failed with1CRITICAL and59unfixedHIGH findings;
  its Required checks aggregate correctly rejected acceptance. Other jobs passed.
- **Diagnosed:** the unchanged recipe's isolated local image confirms
  CVE-2026-6653 in libxml2. Debian has no supported fix indicated for the selected
  Trixie package. The older local scanner database and hosted counts are explicitly
  distinguished in [security evidence](verification/iam-postgres-security-2026-10-18.md).
- **Remediation implemented:** the API owns one canonical PG18.6/pgvector0.8.7
  maintained-base recipe. Its reviewed committed source passed754offline/41real
  checks and a full PostgreSQL scan with0CRITICAL/0HIGH/2total findings. The
  backoffice consumes that source with managed exact-image fixtures and retires
  its legacy IAM-only recipe after explicit source-ownership confirmation.
- **Acceptance gates:** PR90 still requires all seven checks and66browser cases
  against its own rebuilt canonical artifact, plus peer review. Dependabot87/88/89
  commits stay preserved; the old index update is not called a security fix.
  See [the shared handoff](verification/shared-postgres-adoption-2026-10-18.md).
- **Still separate:** source tag/promotion, unresolved API application/Neo4j
  production assessment, live OAuth, publication, deployment and physical-device
  testing. No finding suppression or existing-volume change is authorized.
