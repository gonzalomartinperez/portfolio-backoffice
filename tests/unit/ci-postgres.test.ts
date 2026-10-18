import assert from "node:assert/strict";
import test from "node:test";
import {
	fixtureAuthority,
	postgresSource,
	validateImage,
	validateOwned,
	validateSource,
} from "../../scripts/ci-postgres.ts";
import { waitForPostgres } from "../../scripts/postgres-readiness.ts";

const identity = `sha256:${"a".repeat(64)}`;
const image = () => ({
	Id: identity,
	Os: "linux",
	Architecture: "amd64",
	Config: {
		User: "70:70",
		Labels: {
			"org.opencontainers.image.source":
				"https://github.com/gonzalomartinperez/portfolio-assistant-api",
		},
		Env: [
			"PG_MAJOR=18",
			"PG_VERSION=18.6",
			"PGDATA=/var/lib/postgresql/18/docker",
		],
	},
});
test("managed fixture requires explicit Actions run/attempt/runtime job authority", () => {
	const env = {
		GITHUB_ACTIONS: "true",
		GITHUB_RUN_ID: "123",
		GITHUB_RUN_ATTEMPT: "1",
		CI_JOB_ID: "browser",
	};
	assert.equal(fixtureAuthority(env), "123-1-browser");
	for (const change of [
		{ GITHUB_ACTIONS: "false" },
		{ GITHUB_RUN_ID: "../../foreign" },
		{ GITHUB_RUN_ATTEMPT: "" },
		{ CI_JOB_ID: "production" },
	])
		assert.throws(() => fixtureAuthority({ ...env, ...change }));
});
test("canonical source rejects branches, other revisions and dirty checkout", () => {
	validateSource(postgresSource, "");
	for (const [head, dirty] of [
		["develop", ""],
		["a".repeat(40), ""],
		[postgresSource, " M infra/docker/postgres/Dockerfile"],
	])
		assert.throws(() => validateSource(head ?? "", dirty ?? ""));
});
test("runtime image is bound to immutable identity, API ownership and reviewed UID/platform/profile", () => {
	assert.equal(validateImage(image()), identity);
	for (const change of [
		{ Id: "tag:latest" },
		{ Os: "windows" },
		{ Architecture: "arm64" },
		{ Config: { ...image().Config, User: "999:999" } },
		{ Config: { ...image().Config, Labels: {} } },
		{ Config: { ...image().Config, Env: ["PG_MAJOR=18", "PG_VERSION=18.5"] } },
	])
		assert.throws(() => validateImage({ ...image(), ...change }));
});
test("cleanup rejects unlabelled, foreign and replaced fixture images", () => {
	const owned = {
		Image: identity,
		Config: { Labels: { "io.portfolio.backoffice.ci-postgres": "owned" } },
	};
	validateOwned(owned, "owned", identity);
	validateOwned(
		{ Labels: { "io.portfolio.backoffice.ci-postgres": "owned" } },
		"owned",
	);
	assert.throws(() => validateOwned(owned, "foreign", identity));
	assert.throws(() => validateOwned({}, "owned"));
	assert.throws(() =>
		validateOwned(owned, "owned", `sha256:${"b".repeat(64)}`),
	);
});
test("pending, absent and failed TCP SQL probes cannot become a successful readiness receipt", async () => {
	let probes = 0;
	await assert.rejects(
		waitForPostgres(
			() => {
				probes++;
				return "";
			},
			async () => {},
			2,
		),
	);
	assert.equal(probes, 2);
	await assert.rejects(
		waitForPostgres(
			() => {
				throw new Error("not ready");
			},
			async () => {},
			2,
		),
	);
	let attempts = 0;
	await waitForPostgres(
		() => (++attempts === 2 ? "1" : ""),
		async () => {},
		2,
	);
	assert.equal(attempts, 2);
});
