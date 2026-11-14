import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import pg from "pg";
import { postgresImage } from "../../scripts/postgres-image.ts";

const bootstrapPassword = "public-fixture-bootstrap";
const migratorPassword = "public-fixture-migrator";
const runtimePassword = "public-fixture-runtime";

/**
 * Cluster provisioning owns roles in production (`migrations/runtime-grants.sql` refuses to
 * run without them). This mirrors that shape for a throwaway container: login roles without
 * inheritance or elevated attributes, a database owned by the migrator, and CONNECT for the
 * runtime only. Values are public fixtures.
 */
const clusterBootstrap = [
	`CREATE ROLE portfolio_iam_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${migratorPassword}'`,
	`CREATE ROLE portfolio_iam_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${runtimePassword}'`,
	"CREATE ROLE portfolio_api_runtime NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS",
	"CREATE DATABASE portfolio_iam OWNER portfolio_iam_migrator",
	"REVOKE ALL ON DATABASE portfolio_iam FROM PUBLIC",
	"GRANT CONNECT ON DATABASE portfolio_iam TO portfolio_iam_runtime",
];
const databaseBootstrap = [
	"REVOKE ALL ON SCHEMA public FROM PUBLIC",
	"GRANT USAGE,CREATE ON SCHEMA public TO portfolio_iam_migrator",
	"ALTER DEFAULT PRIVILEGES FOR ROLE portfolio_iam_migrator REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC",
];

export type IamFixture = {
	readonly migratorUrl: string;
	readonly runtimeUrl: string;
	stop(): Promise<void>;
};

async function run(
	connectionString: string,
	statements: readonly string[],
): Promise<void> {
	const client = new pg.Client({ connectionString });
	await client.connect();
	try {
		for (const statement of statements) await client.query(statement);
	} finally {
		await client.end();
	}
}

function url(
	container: StartedPostgreSqlContainer,
	user: string,
	password: string,
): string {
	const target = new URL("postgres://localhost/portfolio_iam");
	target.hostname = container.getHost();
	target.port = String(container.getPort());
	target.username = user;
	target.password = password;
	return target.toString();
}

/**
 * Starts a fresh PostgreSQL container owned by this test process and provisions the IAM
 * identities. Nothing outside the container is touched, so the suite cannot reach a shared
 * or production database.
 */
export async function startIamFixture(): Promise<IamFixture> {
	const container = await new PostgreSqlContainer(postgresImage)
		.withUsername("portfolio_bootstrap")
		.withPassword(bootstrapPassword)
		.withDatabase("postgres")
		.withLabels({ "io.portfolio.backoffice.fixture": "integration" })
		.start();
	try {
		await run(container.getConnectionUri(), clusterBootstrap);
		const bootstrapIam = new URL(container.getConnectionUri());
		bootstrapIam.pathname = "/portfolio_iam";
		await run(bootstrapIam.toString(), databaseBootstrap);
	} catch (error) {
		await container.stop();
		throw error;
	}
	return {
		migratorUrl: url(container, "portfolio_iam_migrator", migratorPassword),
		runtimeUrl: url(container, "portfolio_iam_runtime", runtimePassword),
		stop: async () => {
			await container.stop();
		},
	};
}
