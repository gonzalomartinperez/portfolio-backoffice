# One project PostgreSQL artifact · 2026-10-18

The API owns the canonical PostgreSQL/pgvector recipe and bootstrap/HBA resources.
The backoffice owns its IAM schema/migrations/grants, application image and tests.
Private vps-ops explicitly confirmed this replacement **source ownership** after
the API candidate's complete checks and independent review. This does not select
an image or authorize publication, deployment or assistant activation.

## Committed source and executed API evidence

The consumer pins API commit
`f77c8d878401cc2a5bcea63716396b4bbcc1fc18`, never a sibling working tree or moving
branch. The [canonical recipe](https://github.com/gonzalomartinperez/portfolio-assistant-api/blob/f77c8d878401cc2a5bcea63716396b4bbcc1fc18/infra/docker/postgres/Dockerfile)
uses PostgreSQL18.6, checksum-verified portable pgvector0.8.7 and an immutable
official Alpine3.24 base. Its build dependencies stay outside the runtime.

[API Quality39100882469](https://github.com/gonzalomartinperez/portfolio-assistant-api/actions/runs/39100882469)
passed all six jobs:754offline and41real-service tests, both applications'
migrations and restricted roles, independent/fresh-cluster restoration, Unicode/XML,
explicit deterministic ICU and actual vector operations. Its full PostgreSQL
inventory reported0CRITICAL/0HIGH/2total findings. The API application image's
49unfixedHIGH findings remain explicit production assessment; PostgreSQL's result
does not waive those findings or Neo4j's separate vendor blocker.

Observed defaults in both application databases were libc provider `c`,
`en_US.utf8` COLLATE/CTYPE and a null catalog collation version. The explicit ICU
probe selected `und`. Before/after recovery comparisons preserve the observations;
they do not claim compatibility with another distribution, ICU version or default
sort order. The [API's dated evidence](https://github.com/gonzalomartinperez/portfolio-assistant-api/blob/f77c8d878401cc2a5bcea63716396b4bbcc1fc18/docs/verification/postgres-supported-base-2026-10-18.md)
also distinguishes the initial head, tested merge and actual image IDs.

## Backoffice acceptance

All three runtime jobs build that committed source and use its actual compiled
image for their managed PostgreSQL fixture. GitHub service containers start before
job steps; no old Debian service is substituted for the new artifact. The database
job reuses its one build for standalone IAM migration/restore, full image inventory
and the actual two-application role/recovery harness. A second local tag is an alias,
not a second recipe or build. Independently rebuilt jobs must not be described as
byte-identical or as registry artifacts.

PR90 must pass all seven current-head jobs, including66browser cases against the
replacement, restricted fake-provider OAuth, role/TEMP/isolation checks, restoration,
source/image provenance and the complete scanner policy. Initial source-only units
or an older API/BO run cannot substitute for that acceptance. Current execution
and merge status are available on the [reviewed PR](https://github.com/gonzalomartinperez/portfolio-backoffice/pull/90).

Only the two obsolete IAM recipe files and their Docker dependency-discovery entry
are retired. Dependabot87's original bytes/commit and the
[rejected-image evidence](iam-postgres-security-2026-10-18.md) stay in Git history.
Application-image Docker discovery, security-update visibility and manual review
remain unchanged. No alert is suppressed or old image described as remediated.

## Runtime and remaining boundaries

UID/GID70 uses fresh data and the PG18 parent mount/PGDATA convention. Never reuse
or chown existing UID999 Debian data; existing-data migration requires a separate
logical export/restore, collation/index and recovery rehearsal. Test fixtures are
owned/disposable and never accept a production database URL or shared volume.

Alpine3.24 main support ends2028-06-01; community packages have a shorter cadence.
This is maintained stable support, not a universal LTS guarantee until PostgreSQL18
EOL. Future OS rebases require the same security, locale and recovery verification.
The application image remains distroless Node24; OAuth, API/SSE and wire contracts
are unchanged. All image-registry visibility, immutable digest selection, existing
secret/volume identities, Coolify allocation and production execution stay with
vps-ops. No second production engine or deployment controller is added.
