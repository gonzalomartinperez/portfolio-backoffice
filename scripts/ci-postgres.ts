import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
	appendFileSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	type Stats,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { field, list, record, text } from "./json.ts";
import { waitForPostgres } from "./postgres-readiness.ts";

export const postgresSource = "f77c8d878401cc2a5bcea63716396b4bbcc1fc18";
export const postgresImage = "portfolio-backoffice-postgres:rc";
const sourcePath = ".artifacts/api-compatibility";
const label = "io.portfolio.backoffice.ci-postgres";
const sourceLabel =
	"https://github.com/gonzalomartinperez/portfolio-assistant-api";

type FixtureEnvironment = {
	readonly GITHUB_ACTIONS?: string | undefined;
	readonly GITHUB_RUN_ID?: string | undefined;
	readonly GITHUB_RUN_ATTEMPT?: string | undefined;
	readonly CI_JOB_ID?: string | undefined;
};

export function fixtureAuthority(env: FixtureEnvironment) {
	if (
		env.GITHUB_ACTIONS !== "true" ||
		!/^\d+$/.test(env.GITHUB_RUN_ID ?? "") ||
		!/^\d+$/.test(env.GITHUB_RUN_ATTEMPT ?? "") ||
		!["database", "container", "browser"].includes(env.CI_JOB_ID ?? "")
	)
		throw new Error("Managed PostgreSQL requires an isolated Actions job");
	return `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}-${env.CI_JOB_ID}`;
}
export function validateSource(head: string, dirty: string) {
	if (head.trim() !== postgresSource || dirty.trim())
		throw new Error(
			"Canonical PostgreSQL source is not the reviewed clean revision",
		);
}
export function validateImage(value: unknown): string {
	const image = record(value);
	const identity = text(image.Id);
	if (
		!/^sha256:[a-f0-9]{64}$/.test(identity) ||
		field(image, "Config", "User") !== "70:70" ||
		field(image, "Config", "Labels", "org.opencontainers.image.source") !==
			sourceLabel ||
		image.Os !== "linux" ||
		image.Architecture !== "amd64"
	)
		throw new Error("Unreviewed canonical PostgreSQL image");
	const env = list(field(image, "Config", "Env"));
	for (const expected of [
		"PG_MAJOR=18",
		"PG_VERSION=18.6",
		"PGDATA=/var/lib/postgresql/18/docker",
	])
		if (!env.includes(expected))
			throw new Error("Canonical PostgreSQL runtime changed");
	return identity;
}
export function validateOwned(
	value: unknown,
	ownership: string,
	image?: string,
) {
	if (
		field(value, "Labels", label) !== ownership &&
		field(value, "Config", "Labels", label) !== ownership
	)
		throw new Error("Refusing foreign fixture cleanup");
	if (image !== undefined && field(value, "Image") !== image)
		throw new Error("Fixture image identity changed");
}
function docker(...args: string[]) {
	return execFileSync("docker", args, {
		timeout: 120_000,
		stdio: ["pipe", "pipe", "pipe"],
	})
		.toString()
		.trim();
}
function inspect(kind: string, name: string) {
	return record(list(JSON.parse(docker(kind, "inspect", name)))[0]);
}
function source() {
	validateSource(
		execFileSync("git", ["-C", sourcePath, "rev-parse", "HEAD"], {
			encoding: "utf8",
		}),
		execFileSync("git", ["-C", sourcePath, "status", "--porcelain"], {
			encoding: "utf8",
		}),
	);
}
async function run(command: string) {
	const authority = fixtureAuthority({
		GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
		GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
		GITHUB_RUN_ATTEMPT: process.env.GITHUB_RUN_ATTEMPT,
		CI_JOB_ID: process.env.CI_JOB_ID,
	});
	const path = `.artifacts/ci-postgres-${process.env.CI_JOB_ID}.json`;
	if (command === "source") {
		source();
		return;
	}
	if (command === "start") {
		source();
		const image = validateImage(inspect("image", postgresImage));
		const ownership = `${authority}-${randomUUID()}`;
		const name = `backoffice-pg-${ownership.slice(-36)}`;
		const state: {
			authority: string;
			ownership: string;
			name: string;
			image: string;
			source: string;
			containerId?: string;
		} = { authority, ownership, name, image, source: postgresSource };
		mkdirSync(".artifacts", { recursive: true, mode: 0o700 });
		writeFileSync(path, JSON.stringify(state), { mode: 0o600, flag: "wx" });
		docker(
			"network",
			"create",
			"--label",
			`${label}=${ownership}`,
			`${name}-network`,
		);
		docker(
			"volume",
			"create",
			"--label",
			`${label}=${ownership}`,
			`${name}-data`,
		);
		docker(
			"run",
			"--rm",
			"--name",
			`${name}-ownership`,
			"--label",
			`${label}=${ownership}`,
			"--read-only",
			"--memory",
			"64m",
			"--cpus",
			"0.25",
			"--pids-limit",
			"32",
			"--security-opt",
			"no-new-privileges",
			"--network",
			"none",
			"--user",
			"0:0",
			"--cap-drop",
			"ALL",
			"--cap-add",
			"CHOWN",
			"--mount",
			`type=volume,src=${name}-data,dst=/var/lib/postgresql`,
			"--entrypoint",
			"sh",
			image,
			"-c",
			"chown 70:70 /var/lib/postgresql",
		);
		docker(
			"run",
			"-d",
			"--name",
			name,
			"--label",
			`${label}=${ownership}`,
			"--network",
			`${name}-network`,
			"--user",
			"70:70",
			"--read-only",
			"--cap-drop",
			"ALL",
			"--security-opt",
			"no-new-privileges",
			"--tmpfs",
			"/tmp:uid=70,gid=70,mode=0700,size=16m",
			"--tmpfs",
			"/var/run/postgresql:uid=70,gid=70,mode=3775,size=8m",
			"--mount",
			`type=volume,src=${name}-data,dst=/var/lib/postgresql`,
			"--publish",
			"127.0.0.1::5432",
			"--memory",
			"512m",
			"--memory-swap",
			"512m",
			"--cpus",
			"0.75",
			"--pids-limit",
			"128",
			"--stop-timeout",
			"30",
			"--log-driver",
			"local",
			"--log-opt",
			"max-size=10m",
			"--log-opt",
			"max-file=3",
			"-e",
			"POSTGRES_USER=backoffice_fixture",
			"-e",
			"POSTGRES_PASSWORD=public-fixture-only",
			"-e",
			"POSTGRES_DB=backoffice_test",
			image,
			"postgres",
			"-c",
			"shared_buffers=128MB",
			"-c",
			"work_mem=4MB",
			"-c",
			"max_connections=50",
		);
		const container = inspect("container", name);
		validateOwned(container, ownership, image);
		state.containerId = text(container.Id);
		writeFileSync(path, JSON.stringify(state), { mode: 0o600 });
		const binding = record(
			list(field(container, "NetworkSettings", "Ports", "5432/tcp"))[0],
		);
		assert.equal(binding.HostIp, "127.0.0.1");
		const port = text(binding.HostPort);
		assert.match(port, /^\d{1,5}$/);
		await waitForPostgres(() =>
			docker(
				"exec",
				"-e",
				"PGPASSWORD=public-fixture-only",
				"-e",
				"PGCONNECT_TIMEOUT=2",
				name,
				"psql",
				"--host",
				"127.0.0.1",
				"-U",
				"backoffice_fixture",
				"-d",
				"backoffice_test",
				"-Atc",
				"SELECT 1",
			),
		);
		appendFileSync(
			text(process.env.GITHUB_ENV),
			`BACKOFFICE_DATABASE_URL=postgres://backoffice_fixture:public-fixture-only@127.0.0.1:${port}/backoffice_test\nCI_POSTGRES_HOST=${name}\nCI_POSTGRES_NETWORK=${name}-network\n`,
		);
		console.log(
			JSON.stringify({ source: postgresSource, image_id: image, ready: true }),
		);
		return;
	}
	if (command !== "cleanup")
		throw new Error("Unknown managed PostgreSQL command");
	let metadata: Stats;
	try {
		metadata = lstatSync(path);
	} catch (error) {
		if (field(error, "code") === "ENOENT") return;
		throw error;
	}
	if (
		!metadata.isFile() ||
		(metadata.mode & 0o777) !== 0o600 ||
		metadata.uid !== process.getuid?.()
	)
		throw new Error("Unsafe fixture state");
	const state = record(JSON.parse(readFileSync(path, "utf8")));
	assert.equal(state.authority, authority);
	assert.equal(state.source, postgresSource);
	const ownership = text(state.ownership);
	assert.match(ownership, new RegExp(`^${authority}-[a-f0-9-]{36}$`));
	const name = `backoffice-pg-${ownership.slice(-36)}`;
	assert.equal(state.name, name);
	const failures = [];
	for (const [kind, resource] of [
		["container", `${name}-ownership`],
		["container", name],
		["volume", `${name}-data`],
		["network", `${name}-network`],
	]) {
		try {
			// Explicit listing distinguishes absent resources from failed ownership inspection.
			const identities = docker(
				kind === "container" ? "ps" : text(kind),
				...(kind === "container" ? ["-a"] : ["ls"]),
				"--format",
				kind === "container" ? "{{.Names}}" : "{{.Name}}",
			)
				.split("\n")
				.filter(Boolean);
			if (!identities.includes(text(resource))) continue;
			const current = inspect(text(kind), text(resource));
			if (resource === name && state.containerId !== undefined)
				assert.equal(current.Id, state.containerId);
			validateOwned(
				current,
				ownership,
				kind === "container" ? text(state.image) : undefined,
			);
			docker(
				text(kind),
				"rm",
				...(kind === "container" ? ["-f"] : []),
				text(resource),
			);
		} catch {
			failures.push(kind);
		}
	}
	if (failures.length)
		throw new Error("Owned fixture cleanup could not be verified");
	unlinkSync(path);
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	try {
		await run(text(process.argv[2]));
	} catch {
		console.error(
			"Managed canonical PostgreSQL failed; private diagnostics were not published.",
		);
		process.exitCode = 1;
	}
}
