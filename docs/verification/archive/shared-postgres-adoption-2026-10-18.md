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

[PR90](https://github.com/gonzalomartinperez/portfolio-backoffice/pull/90) merged
normally into develop `2a6fdecee245706e8969a7252f0c43ab8cbba368` after independent
source review and [final Quality39102418984](https://github.com/gonzalomartinperez/portfolio-backoffice/actions/runs/39102418984)
passed all seven jobs. Head `1c14317ccd383f02ca92f13726da29a37053c4ff` passed140unit
and66browser cases across Chromium, Firefox and WebKit, restricted fake-provider
OAuth, role/TEMP/isolation checks, independent/fresh-cluster restoration,
source/image provenance and the complete scanner policy.

The earlier complete [Quality39102151155](https://github.com/gonzalomartinperez/portfolio-backoffice/actions/runs/39102151155)
reported0CRITICAL/0HIGH/2total PostgreSQL findings. Its tested merge
`9d2990b4219858b541ec7283a8fafa3d2fc8f209` and candidate head have identical tree
`88ba5e89459b63aed0910d3a12435f3ffe7dae04`. Database-job image ID
`sha256:4ed650d9ab6963876c255e0d2413bf82b59fb525e1c53935406289924291e016`
is local hosted-CI evidence, not a registry digest. End-to-end time was267seconds
including queue time; database207seconds, browser191seconds and container143seconds.
These are one hosted execution's observations, not speedup or VPS capacity claims.
The application image's full HIGH/CRITICAL policy, resources/readiness and bounded
idle shutdown checks also passed. No paid model calls or live OAuth were involved.
Dependabot87/88/89 were recognized as merged with original commits preserved.
The develop merge has its own [post-integration run](https://github.com/gonzalomartinperez/portfolio-backoffice/actions/runs/39102748572);
its result is separate from the candidate evidence above.

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
