# Calendar report acceptance · 2026-10-18

## Implemented and verified

Backoffice source `300b1e2cd0cadda58ff6388812439bb047ab1fb5`, PR78.
[Quality run39088266808](https://github.com/gonzalomartinperez/portfolio-backoffice/actions/runs/39088266808)
passed static checks, the exact production image/browser job and required aggregate gate.
The suite reports104 unit tests and66 browser cases (60 available-source,6 unavailable-source)
across Chromium, Firefox and WebKit. No browser retry/flaky result was reported.
Strict TypeScript7.0.2 includes generated Next.js route types. Formatting, lint,
contracts, public-file, documentation and four-skill validation pass; lint retains
one pre-existing warning and one informational diagnostic.

The report supports UTC day/ISO week/calendar month, current/two previous windows,
whole-report event-language filters and separately scoped regional grid controls.
Tests cover valid/invalid selections, dependent region reset, suppressed cells,
empty data, manual filter submission, unavailable service, keyboard focus,
EN/ES, dark/light, narrow layout, reduced motion, axe and200% text.
Legacy seven-day reporting remains an explicit view, not an automatic fallback.

## Visual inspection and corrections

An initial CI run39085869894 failed on ambiguous select labeling and a WebKit
full-page bitmap exceeding32767 pixels at enlarged text. Explicit labels fixed
the control lookup; viewport captures preserve the full interaction assertions.
Inspection then found a real readability defect despite passing axe/overflow
checks: fixed-layout five-column tables split words into individual letters.
Named semantic overflow regions now preserve words and keyboard scrolling.
The scoped Biome exception is justified in [design-system.md](../design-system.md).
A regression presses ArrowRight and checks the action cell's line count, rather
than treating a screenshot or lack of page overflow as proof of usability.

These are original screenshots, without image editing or compositing. Baseline
uses the earlier c49 production-image files under host Node; its original image
was built with documented fixture-only dirty work. Final images come from the
exact300b1e2 production-container CI run above. Values are labeled synthetic.

| Frame | Source / dimensions |
| --- | --- |
| [Before](../assets/calendar/before-desktop.png) | Local baseline,1440×1100 |
| [Calendar desktop](../assets/calendar/after-desktop.png) | CI Chromium EN dark,1440×3074 |
| [Calendar mobile](../assets/calendar/after-mobile.png) | CI Chromium ES light,390×6647 |
| [Keyboard at200%](../assets/calendar/keyboard-200-webkit.png) | CI WebKit,390 CSS px at2×capture density |

## Production image and measurements

CI image configuration ID:
`sha256:79bd37c9cdc4cb54a07595deab1cd618fb525bebbee21f9a7c663350a2926c7c`.
This is a locally tested CI image ID, not a published registry manifest digest.
The full runtime scan passed its HIGH/CRITICAL gate; this does not clear the
paired API's separate Neo4j vendor-image blocker.

Ubuntu24.04 GitHub-hosted runner, readonly non-root image,512MiB memory,0.75CPU,
128PIDs, no capabilities, no-new-privileges, bounded tmpfs and local log rotation:

- Local-store footprint212MB; Docker inspect reports212,243,688 bytes.
-64 anonymous health/sign-in requests, concurrency8:856ms elapsed,
  p50 98ms/p95 402ms; idle55.59MiB and post-workload78.79MiB.
- Idle SIGTERM175ms, exit143, no forced termination reported.

This is a synthetic anonymous workload, not authenticated-report throughput,
VPS capacity, provider latency, field performance or physical-device acceptance.
The earlier WSL comparison measured emitted JavaScript across all routes:
1,382,362→1,398,269 bytes raw;426,028→431,128 individually gzipped bytes.
That comparison is baseline→e71 feature build, not a final300b1e2 route payload
or a measured browser-speed improvement. No compiler-speed gain is claimed.

## Native ingestion and authenticated rendering checkpoint

Real local HTTP/TLS and PostgreSQL, no provider credentials or SDK calls:
portfolio `193e1e6d4fd4caf7263926130ce877684ebb174b` delivered14 new events;
17 separately labeled seed events plus one duplicate produced31 dedupe IDs from
32 accepted POSTs. Administrative fixture queries and restricted API HTTP reads
are separate evidence; neither is mislabeled as the other's database role.

API source `596c5f3af873817b6215e6c2332f8b3511ea2e36` and backoffice e71 image files
under host Node24.22.0 rendered5 page views,7 public clicks and6 exposures for a
real signed viewer session. An HTTP SSR check verified those exact count cards
and absence of runtime service token, IAM connection string and auth secret.
This is server-render evidence, not final-image browser acceptance.

The initial real read was unavailable because Node's CLI --env-file did not
establish NODE_EXTRA_CA_CERTS trust early enough. Providing the public fixture
certificate path before process startup restored authenticated API200 responses.
TLS validation was never disabled. The API [demo procedure](https://github.com/gonzalomartinperez/portfolio-assistant-api/blob/b97a1b9be91b5939b78ca4a6c89feeeab64a2090/docs/local-analytics-demo.md)
records the corrected startup and bounded, owned cleanup.

Final corrected-image browser acceptance passed at02:08UTC before fixture expiry.
The [safe receipt](calendar-integration-2026-10-18.json) records exact source revisions,
local image index and build ID. The browser checked that the running page contained
that build ID before attributing results to the corrected source. Local execution
used files extracted from the production image under host Node24.22.0; the separate
CI run above tested the hardened container itself, including real IAM and fixture HTTP.
These distinct execution environments are not presented as one tested artifact.

- Real viewer:5/7/6 received views/clicks/exposures; country unknown.
- Published grid cell column3/row4/count3, with one withheld click.
- Spanish mobile day/work selection:2/1/2; no published low-count grid cells.
- Previous month: no received events, without claiming zero site traffic.
- Invalid page/region selection rejected; anonymous page redirected and private API401.
- Coverage disclosure exposed three UTC timestamps and93-day retention semantics.
- Runtime token, IAM URL and auth secret absent from rendered HTML.

[Real native/API/PostgreSQL desktop](../assets/calendar/real-native-api-pg-backoffice-desktop-en.png)
and [Spanish mobile](../assets/calendar/real-native-api-pg-backoffice-mobile-es.png)
are original browser captures of that fixture data, not production traffic. No new
POSTs, seeding or model requests were made during readback. The browser and local
web process were closed, and the shared build/browser lease released immediately.

No live OAuth, production traffic, trusted Cloudflare country attribution, physical
phone or assistive-technology acceptance is claimed. Full assistant readiness was
not under test because this analytics-only fixture intentionally has no Neo4j.
Main/final-release promotion, image publication, deployment and public activation
remain separate gates.
