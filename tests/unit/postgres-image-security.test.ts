import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assessPostgresImage } from "../../scripts/postgres-image-security.ts";

const image = `sha256:${"a".repeat(64)}`;
const report = (vulnerabilities: unknown[] = []) => ({
	SchemaVersion: 2,
	ArtifactType: "container_image",
	ArtifactName: "portfolio-backoffice-postgres:rc",
	Metadata: { ImageID: image },
	Results: [
		{
			Class: "os-pkgs",
			Type: "debian",
			Target: "portfolio-backoffice-postgres:rc (debian 13.3)",
			Packages: [{ Name: "postgresql-18", Version: "18.6" }],
			Vulnerabilities: vulnerabilities,
		},
	],
});
const finding = (Severity: string, FixedVersion = "") => ({
	VulnerabilityID: "CVE-synthetic",
	Severity,
	FixedVersion,
});

test("database policy rejects all critical and fixable high while exposing unfixed high", () => {
	for (const vulnerability of [
		finding("CRITICAL"),
		finding("CRITICAL", "fixed"),
		finding("HIGH", "fixed"),
	])
		assert.equal(
			assessPostgresImage(report([vulnerability]), image).blocked,
			true,
		);
	assert.deepEqual(
		assessPostgresImage(
			report([finding("HIGH"), finding("LOW"), finding("MEDIUM")]),
			image,
		),
		{
			critical: 0,
			fixable_high: 0,
			unfixed_high: 1,
			total: 3,
			blocked: false,
			production_assessment_required: true,
		},
	);
	assert.equal(assessPostgresImage(report(), image).blocked, false);
	assert.equal(
		assessPostgresImage(
			report([{ VulnerabilityID: "CVE-synthetic", Severity: "HIGH" }]),
			image,
		).unfixed_high,
		1,
	);
});

test("database inventory fails closed for missing OS results, malformed findings and wrong image", () => {
	for (const value of [
		undefined,
		{},
		{ ...report(), Results: [] },
		{ ...report(), Results: [{ Class: "lang-pkgs", Packages: [{}] }] },
		{ ...report(), Results: [{ Class: "os-pkgs", Packages: [] }] },
		{ ...report(), ArtifactName: "portfolio-backoffice:rc" },
		{ ...report(), Metadata: { ImageID: `sha256:${"b".repeat(64)}` } },
		{ ...report(), SchemaVersion: 1 },
		{ ...report(), Results: [{ ...report().Results[0], Type: "alpine" }] },
		{
			...report(),
			Results: [
				{ ...report().Results[0], Target: "other-image (debian 13.3)" },
			],
		},
		{ ...report(), Results: [{ ...report().Results[0], Packages: [{}] }] },
		{
			...report(),
			Results: [{ ...report().Results[0], Vulnerabilities: null }],
		},
		report([finding("made-up")]),
		report([{ Severity: "HIGH" }]),
		report([{ ...finding("HIGH"), FixedVersion: false }]),
		report([{ ...finding("HIGH"), FixedVersion: null }]),
		report([{ ...finding("HIGH"), FixedVersion: " " }]),
	])
		assert.throws(() => assessPostgresImage(value, image));
	assert.throws(() => assessPostgresImage(report(), "not-an-image-id"));
});

test("database CLI fails closed and prints only aggregate counts without raw package metadata", () => {
	const directory = mkdtempSync(join(tmpdir(), "backoffice-pg-security-"));
	const path = join(directory, "inventory.json");
	const execute = () =>
		spawnSync(
			process.execPath,
			["scripts/postgres-image-security.ts", path, image],
			{ encoding: "utf8" },
		);
	try {
		assert.equal(execute().status, 1);
		writeFileSync(path, "{private-sentinel");
		const malformed = execute();
		assert.equal(malformed.status, 1);
		assert.equal(
			(malformed.stdout + malformed.stderr).includes("private-sentinel"),
			false,
		);
		for (const [severity, status] of [
			["HIGH", 0],
			["CRITICAL", 1],
		] as const) {
			writeFileSync(
				path,
				JSON.stringify(
					report([{ VulnerabilityID: "private-sentinel", Severity: severity }]),
				),
			);
			const result = execute();
			assert.equal(result.status, status);
			assert.equal(
				(result.stdout + result.stderr).includes("private-sentinel"),
				false,
			);
			assert.ok(result.stdout.length + result.stderr.length < 1000);
			if (severity === "HIGH")
				assert.match(result.stdout, /explicit production assessment/);
		}
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
