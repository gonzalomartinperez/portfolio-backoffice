/**
 * Digest-pinned PostgreSQL 18 (Debian 13 trixie) for integration tests (Testcontainers) and the
 * CI runtime jobs' service container. One constant so both always test the same bytes; bumped
 * deliberately, never floating.
 */
export const postgresImage =
	"postgres:18.7-trixie@sha256:9f4fd4aa918f52ae3d6f3b687f1de90d8f867cd4d520021545a9a50c120eae3b";
