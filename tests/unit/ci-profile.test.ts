import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { load } from "js-yaml";
import {
	validateCiProfile,
	validateWorkflowTrust,
} from "../../scripts/check-ci-profile.ts";
import {
	buildFingerprint,
	validateBuildIdentity,
} from "../../scripts/ci-build-provenance.ts";
import { field, list, record } from "../../scripts/json.ts";
const profile = () =>
	record(load(readFileSync(".github/workflows/quality.yml", "utf8")));
test("committed paired workflow has exact names, DAG, events and real job adapters", () => {
	validateCiProfile(profile());
	validateWorkflowTrust(profile());
});
test("paired profile rejects cosmetic parity, bypasses and missing prerequisite edges", () => {
	const changes: Array<(workflow: Record<string, unknown>) => void> = [
		(w) => {
			record(w.jobs).dummy = { name: "Dummy" };
		},
		(w) => {
			delete record(w.jobs).database;
		},
		(w) => {
			record(field(w, "jobs", "checks")).name = "checks";
		},
		(w) => {
			record(field(w, "jobs", "container")).needs = "database";
		},
		(w) => {
			record(field(w, "jobs", "browser")).needs = [];
		},
		(w) => {
			record(field(w, "jobs", "checks")).if = "success()";
		},
		(w) => {
			record(field(w, "jobs", "checks")).needs = [];
		},
		(w) => {
			record(field(w, "on", "push")).branches = ["develop"];
		},
		(w) => {
			record(field(w, "on", "pull_request")).paths = ["src/**"];
		},
		(w) => {
			w.permissions = { contents: "write" };
		},
		(w) => {
			record(field(w, "jobs", "browser")).permissions = { packages: "write" };
		},
		(w) => {
			record(field(w, "jobs", "database"))["continue-on-error"] = true;
		},
		(w) => {
			record(field(w, "jobs", "container")).steps = [{ run: "true" }];
		},
		(w) => {
			record(field(w, "jobs", "browser")).env = {
				PRIVATE_KEY: "$" + "{{ secrets.PRIVATE_KEY }}",
			};
		},
		(w) => {
			record(field(w, "jobs", "secrets")).steps = [
				{ uses: "actions/checkout@main" },
			];
		},
		(w) => {
			record(w.env).ALLOW_PAID_AI = "true";
		},
	];
	for (const change of changes) {
		const w = profile();
		change(w);
		assert.throws(() => validateCiProfile(w));
	}
});
test("privileged dependency assessment cannot check out an untrusted head", () => {
	const workflow = {
		on: { pull_request_target: {} },
		jobs: {
			policy: {
				steps: [
					{
						uses: `actions/checkout@${"a".repeat(40)}`,
						with: { ref: "$" + "{{ github.event.pull_request.head.sha }}" },
					},
				],
			},
		},
	};
	assert.throws(() => validateWorkflowTrust(workflow));
	assert.throws(() =>
		validateWorkflowTrust({
			on: { pull_request_target: {} },
			permissions: { contents: "write" },
			jobs: { policy: { steps: [] } },
		}),
	);
	assert.throws(() =>
		validateWorkflowTrust({
			on: { pull_request_target: {} },
			jobs: { policy: { steps: [{ run: "npm ci" }] } },
		}),
	);
});
test("private rebuild provenance rejects source/run/image/config substitutions", () => {
	const wanted = {
		source: "a".repeat(40),
		run: "123",
		attempt: "1",
		job: "browser",
		fingerprint: buildFingerprint([["Dockerfile", "reviewed"]]),
		image: `sha256:${"b".repeat(64)}`,
	};
	assert.doesNotThrow(() => validateBuildIdentity(wanted, wanted));
	for (const key of Object.keys(wanted))
		assert.throws(() =>
			validateBuildIdentity({ ...wanted, [key]: "substitution" }, wanted),
		);
	assert.notEqual(
		wanted.fingerprint,
		buildFingerprint([["Dockerfile", "changed"]]),
	);
	const workflow = profile();
	for (const job of ["database", "container", "browser"]) {
		const steps = list(field(workflow, "jobs", job, "steps"));
		assert.ok(
			steps.some(
				(step) =>
					field(step, "run") === "node scripts/ci-build-provenance.ts record",
			),
		);
	}
});

test("only the exact hard-disabled publication diagnostic is recognized", async () => {
	const { intentionalPublicationOff, validateActionlintDiagnostics } =
		await import("../../scripts/check-workflows.ts");
	const source = readFileSync(".github/workflows/release.yml", "utf8");
	const line =
		source
			.split("\n")
			.findIndex((value) => value.trim() === "if: $" + "{{ false }}") + 1;
	const diagnostic = {
		filepath: ".github/workflows/release.yml",
		kind: "if-cond",
		line,
		message: 'constant expression "false" in condition. remove the if: section',
	};
	assert.equal(intentionalPublicationOff(diagnostic, source), true);
	assert.equal(
		intentionalPublicationOff(
			{ ...diagnostic, filepath: ".github/workflows/quality.yml" },
			source,
		),
		false,
	);
	assert.equal(
		intentionalPublicationOff({ ...diagnostic, line: line + 1 }, source),
		false,
	);
	assert.equal(
		intentionalPublicationOff({ ...diagnostic, kind: "expression" }, source),
		false,
	);
	assert.equal(
		intentionalPublicationOff(
			diagnostic,
			source.replace("if: $" + "{{ false }}", "if: success()"),
		),
		false,
	);
	assert.equal(validateActionlintDiagnostics([diagnostic], source), 1);
	assert.throws(() =>
		validateActionlintDiagnostics(
			[diagnostic, { ...diagnostic, kind: "expression" }],
			source,
		),
	);
	assert.throws(() =>
		validateActionlintDiagnostics([diagnostic, diagnostic], source),
	);
	assert.throws(() =>
		validateActionlintDiagnostics(
			[diagnostic],
			source.replace("if: $" + "{{ false }}", "if: true"),
		),
	);
});

test("static Playwright discovery preserves all 66 reviewed cases and three real engines", async () => {
	const { execFileSync } = await import("node:child_process");
	const inventory = record(
		JSON.parse(
			execFileSync(
				process.execPath,
				[
					"node_modules/@playwright/test/cli.js",
					"test",
					"--list",
					"--reporter=json",
				],
				{
					encoding: "utf8",
					timeout: 30_000,
					env: { ...process.env, FORCE_COLOR: "0" },
				},
			),
		),
	);
	const projects = list(field(inventory, "config", "projects"));
	const configured = (await import("../../playwright.config.ts")).default;
	assert.deepEqual(
		configured.projects
			?.map((project) => field(project, "use", "defaultBrowserType"))
			.sort(),
		["chromium", "firefox", "webkit"],
	);
	assert.deepEqual(projects.map((project) => field(project, "name")).sort(), [
		"chromium",
		"firefox",
		"webkit",
	]);
	const discovered: unknown[] = [];
	const collect = (suite: unknown) => {
		for (const spec of list(field(suite, "specs") ?? []))
			discovered.push(...list(field(spec, "tests")));
		for (const child of list(field(suite, "suites") ?? [])) collect(child);
	};
	for (const suite of list(inventory.suites)) collect(suite);
	for (const project of ["chromium", "firefox", "webkit"])
		assert.ok(
			discovered.filter((entry) => field(entry, "projectName") === project)
				.length >= 22,
		);
});
