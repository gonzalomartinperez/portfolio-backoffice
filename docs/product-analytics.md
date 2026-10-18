# Private product-interaction reports

`/analytics` requires live owner/viewer membership before reading its source. The
calendar report uses `/internal/ops/v2/product-analytics`; `?view=legacy` explicitly
selects the retained seven-day v1 view. There is no automatic fallback or double
fetch. Each contract has its own committed source SHA and SHA256 in `contracts/`;
refresh from committed Git objects, never a sibling working tree.

`PRODUCT_ANALYTICS_ENABLED=false` is the server-runtime default. When enabled,
`OPERATIONS_API_ORIGIN` and `OPERATIONS_READ_TOKEN` remain private server settings.
This flag enables reads only, never public collection. Publication, privacy approval
and portfolio/API activation are separate gates. Never use NEXT_PUBLIC for tokens.

## Calendar and filter semantics

Select the current or two preceding UTC days, ISO Monday weeks or calendar months.
Windows are [start,end); the current calendar window is partial. The API retains
93 days of aggregates. Page views are accepted event UUIDs, not unique visitors or
people. Duplicate suppression lasts 24 hours; later replays can count again.
Counts do not prove completed downloads, contacts, purchases or model usage.

Period and event language filter the global totals, daily series, countries,
pages and semantic actions. Page, reviewed region and viewport filter only the
regional grid and exposure denominator. The two form groups explain that distinction;
selection changes do not fetch until the user submits the native GET form.
Regions reset to a valid value when the selected page changes.

The 8×8 grid publishes only cells meeting the minimum count of three. Empty cells
are withheld or absent, never invented zeroes; the adjacent table is the accessible
alternative. Suppressed click totals and selected-region exposures remain distinct.
Country defaults to unknown. Reliable country attribution requires the separately
approved API trusted-edge configuration; DNS delegation is not evidence of it.

First/last receipt timestamps describe global received events, not collector
enablement, uptime or selected-window coverage. Legacy backfill can have day-level
precision and predate retention. No enabled_at history exists. Empty results mean
no received events for that selection, not proof that the site had no traffic.

## Boundaries and presentation

The read adapter has a five-second deadline and a 256,000-byte actual response limit,
with no redirects, shared cache, cookies or retries. Strict UTF-8 and closed runtime
validation reject unknown fields, invalid dates/counts/countries and inconsistent
buckets. Only validated aggregates reach presentation. Service tokens, event UUIDs,
credentials, prompts and transcripts never enter browser props or JSON.

Server-rendered captioned tables remain available alongside the small Recharts
boundary; chart animation is disabled. Native form controls, visible focus and
semantic tokens support both languages/themes and narrow layouts. Disabled,
unavailable, invalid selection and empty data have different messages.

The browser suite uses isolated real IAM PostgreSQL and a separately authenticated
synthetic HTTP source. That is not live OAuth or production evidence. The separate
native-site → real API → PostgreSQL → authenticated backoffice proof must record
all source revisions, exact counts and synthetic provenance. Never upload signed
session files, environment files, raw request logs or private traces.

## Refresh and deployment

1. Review the identified API commit and compatibility notes.
2. Copy the owned schema using `git show`, update its source/hash and regenerate the
   local OpenAPI wrapper/types with the maintained contract commands.
3. Run contract, strict typing, unit and authenticated browser checks. Keep the
   historical public-chat snapshot independently pinned.
4. Coordinate private routing, privacy/retention/backup approval and resource limits
   with the API and vps-ops owners before activation.

API migrations 007–009 are forward history, not IAM migrations. A rollback reader
must retain every applied migration and checksum. Do not delete history, weaken
readiness checks or restore over newer writes. Image rollback does not undo schema
changes or erase analytics data. Production remains disabled; physical-device and
assistive-technology verification remain separate from automated axe checks.
