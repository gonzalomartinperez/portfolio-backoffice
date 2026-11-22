# IAM PostgreSQL security gate · 2026-10-18

**Original failure:** the initial PR90 candidate and dependency cohort could not be accepted. The newly added full
IAM image inventory exposed a critical finding; the required aggregate correctly
failed. Passing functional checks or the previously green source release does not
override this result. No image was published or deployed. The original image remains
rejected; the later [common-engine replacement](shared-postgres-adoption-2026-10-18.md)
has separate source, ownership and exact-image acceptance requirements.

## Actual hosted result

[Quality39096722293](https://github.com/gonzalomartinperez/portfolio-backoffice/actions/runs/39096722293)
tested source `dcdb8961eee30711e33e0e12776e1870118b7122`. Workflow validation,
secret scanning, frozen-install static checks, application-container verification
and browser tests passed. Database tests failed at the new inventory policy gate;
the dependent Required checks job failed closed.

The complete database scan reported1CRITICAL,0fixableHIGH,59unfixedHIGH and303total
findings. These are vulnerability findings, not distinct vulnerable packages.
Full reports and diagnostics were not uploaded. The run took346seconds from
creation to final update; this is an observation, not a performance improvement.

The reviewed PostgreSQL index update in Dependabot87 refers to the exact previous
amd64 image manifest, config and layers. It does not remediate this finding.
Dependabot88/89 and their combined PR90 were held at this revision; individual older green runs
are not acceptance of the combined source. Main/develop were not changed by PR90.

## Isolated local diagnosis

The unchanged recipe was built locally during the explicitly coordinated
04:29:36–04:32:20UTC diagnostic lease. The BuildKit attempt stopped after slow
upstream layer downloads. A resource-bounded legacy-builder fallback built the
same Dockerfile from a minimal context containing only that recipe, with CPU0 and
2GiB limits. This is diagnostic evidence, not a replacement CI build procedure.

The resulting local image ID was
`sha256:0acceed374b5327230ce8b09db3fc932c70357d06922f323d0b6cc728af5ee9f`.
Checksum-verified Trivy0.75.0 scanned it offline, with one scanning worker and
CPU0. The local database was dated2026-10-13; therefore this scan is deliberately
not presented as a fresh security assessment or as identical to hosted CI.
It reported1CRITICAL and61HIGH findings, with this critical entry:

| Field | Value |
| --- | --- |
| Vulnerability | CVE-2026-6653 |
| Package | libxml2 |
| Installed version | 2.12.7+dfsg+really2.9.14-2.1+deb13u3 |
| Fixed version | None reported |
| Status / severity source | affected / NVD |

The private inventory remains in an ignored0600 local artifact. No application
services, shared databases, browsers or paid models ran. The builder was stopped
and the lease released at04:32:20UTC. Local image IDs are not registry digests.

## Vendor status and remediation boundary

The [Debian security tracker](https://security-tracker.debian.org/tracker/CVE-2026-6653)
marks both current Trixie and Bookworm libxml2 packages vulnerable. Trixie's
leading2.12 version is misleading: its package reverted to2.9.14 code. Debian
classifies the issue as minor/no-dsa or postponed; that classification does not
make it fixed or satisfy this repository's all-CRITICAL gate.

Do not suppress the CVE, mix unstable packages into stable Debian, strip XML
support, force-remove dependencies or patch vendor binaries merely to pass CI.
A supported vendor fix requires a rebuilt exact image, a fresh complete scan and
the existing migration, authorization, restore/restart and browser checks.

The [official PostgreSQL image catalog](https://github.com/docker-library/official-images/blob/master/library/postgres)
also provides maintained Alpine variants. These are evaluation options only,
not accepted replacements based on this diagnostic alone: libc, locales/collations, UID/GID70 rather than999,
volume ownership, startup and logical restoration require deliberate review and
complete compatibility verification. Never reuse a Debian PGDATA directory on
that assumption. This diagnostic did not adopt an alternative base or production allocation.

The existing API Neo4j vendor blocker remains separate. Neither this report nor
source promotion authorizes publication, deployment, live OAuth or assistant
activation; production selection and execution belong to private vps-ops.
