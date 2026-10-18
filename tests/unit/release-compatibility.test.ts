import assert from "node:assert/strict";
import test from "node:test";
import { requireCiSuccess } from "../../scripts/check-ci-results.ts";
import { releaseCompatibility } from "../../scripts/release-compatibility.ts";

const commit = "a".repeat(40);
const source = { api_commit: "b".repeat(40), openapi_sha256: "c".repeat(64) };
const operations = {
	api_commit: "e".repeat(40),
	operations_schema_json_sha256: "f".repeat(64),
};
const image = `ghcr.io/owner/portfolio-backoffice@sha256:${"d".repeat(64)}`;

test("records immutable image and both contract pins without claiming deployed compatibility", () => {
	const release = releaseCompatibility(commit, image, source, operations);
	assert.equal(release.backoffice_commit, commit);
	assert.equal(release.historical_public_api_commit, source.api_commit);
	assert.equal(release.operational_api_commit, operations.api_commit);
	assert.equal(
		release.operational_api_contract_sha256,
		operations.operations_schema_json_sha256,
	);
	assert.equal(release.schema_version, 2);
	assert.equal(release.backoffice_image, image);
	assert.equal(release.production_deployment, "disabled");
});

test("rejects mutable tags and unverifiable revisions or provenance", () => {
	for (const invalid of [
		image.replace("@sha256:", ":"),
		"ghcr.io/owner/web:latest",
		"",
	])
		assert.throws(() =>
			releaseCompatibility(commit, invalid, source, operations),
		);
	assert.throws(() =>
		releaseCompatibility("develop", image, source, operations),
	);
	for (const invalid of [
		null,
		{},
		{ ...source, api_commit: "main" },
		{ ...source, openapi_sha256: "missing" },
	])
		assert.throws(() =>
			releaseCompatibility(commit, image, invalid, operations),
		);
	assert.throws(() => releaseCompatibility(commit, image, source, {}));
	assert.throws(() =>
		releaseCompatibility(commit, image, source, {
			...operations,
			api_commit: "develop",
		}),
	);
});

test("release verification remains explicit, pinned and publication disabled", async () => {
	const { readFileSync } = await import("node:fs");
	const { load } = await import("js-yaml");
	const { field, list, record, text } = await import("../../scripts/json.ts");
	const quality = record(
		load(readFileSync(".github/workflows/quality.yml", "utf8")),
	);

	const release = record(
		load(readFileSync(".github/workflows/release.yml", "utf8")),
	);
	assert.deepEqual(Object.keys(record(release.on)), ["workflow_dispatch"]);
	assert.equal(
		field(
			release,
			"on",
			"workflow_dispatch",
			"inputs",
			"publication_authorized",
			"default",
		),
		false,
	);
	assert.equal(
		field(release, "jobs", "publish", "environment"),
		"container-release",
	);
	assert.match(
		text(field(release, "jobs", "verify", "if")),
		/refs\/heads\/develop/,
	);
	assert.match(
		text(field(release, "jobs", "publish", "if")),
		/^\$\{\{\s*false\s*\}\}$/,
	);
	assert.equal(
		field(release, "jobs", "publish", "permissions", "packages"),
		undefined,
	);
	for (const workflow of [quality, release]) {
		for (const job of Object.values(record(workflow.jobs))) {
			if (field(job, "runs-on") !== undefined)
				assert.equal(field(job, "runs-on"), "ubuntu-24.04");
			const steps = field(job, "steps");
			if (steps === undefined) continue;
			for (const step of list(steps)) {
				const action = field(step, "uses");
				if (typeof action === "string") assert.match(action, /@[a-f0-9]{40}$/);
			}
		}
	}
});

test("required gate fails closed for every missing, failed, pending or skipped prerequisite", () => {
	const jobs = [
		"workflows",
		"secrets",
		"static",
		"database",
		"container",
		"browser",
	];
	const success = Object.fromEntries(
		jobs.map((name) => [name, { result: "success" }]),
	);
	assert.doesNotThrow(() => requireCiSuccess(success));
	for (const name of jobs) {
		for (const result of [
			"failure",
			"cancelled",
			"skipped",
			"pending",
			"in_progress",
			undefined,
		])
			assert.throws(() => requireCiSuccess({ ...success, [name]: { result } }));
		const missing = { ...success };
		delete missing[name];
		assert.throws(() => requireCiSuccess(missing));
	}
	assert.throws(() =>
		requireCiSuccess({ ...success, unexpected: { result: "success" } }),
	);
	for (const invalid of [null, [], "success", {}])
		assert.throws(() => requireCiSuccess(invalid));
});
