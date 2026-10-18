import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "js-yaml";
import { field, list, record, text } from "./json.ts";
import { requiredJobs } from "./check-ci-results.ts";

export const names = {
	workflows: "Workflow validation",
	secrets: "Secret scan",
	static: "Static checks",
	database: "Database tests",
	container: "Container verification",
	browser: "Browser tests",
	checks: "Required checks",
};
export function validateCiProfile(value: unknown): void {
	const workflow = record(value);
	if (workflow.name !== "Quality")
		throw new Error("Wrong paired workflow name");
	const jobs = record(workflow.jobs);
	const events = record(workflow.on);
	if (
		Object.keys(events).sort().join() !==
		[
			"pull_request",
			"push",
			"merge_group",
			"workflow_dispatch",
			"workflow_call",
		]
			.sort()
			.join()
	)
		throw new Error("Unexpected core workflow events");
	if (/secrets\./.test(JSON.stringify(workflow)))
		throw new Error("PR quality may not receive repository secrets");
	if (Object.keys(jobs).sort().join() !== Object.keys(names).sort().join())
		throw new Error("Wrong paired job set");
	if (
		JSON.stringify(workflow.permissions) !==
		JSON.stringify({ contents: "read" })
	)
		throw new Error("Quality token must remain read-only");
	if (!list(field(workflow, "on", "pull_request", "types")).includes("edited"))
		throw new Error("Base changes must refresh PR validation");
	for (const event of ["pull_request", "push"]) {
		if (
			JSON.stringify(field(workflow, "on", event, "branches")) !==
			JSON.stringify(["develop", "main"])
		)
			throw new Error("Missing protected branch event");
		for (const filter of ["paths", "paths-ignore", "branches-ignore"])
			if (field(workflow, "on", event, filter) !== undefined)
				throw new Error("Validation may not be filtered");
	}
	for (const [id, name] of Object.entries(names)) {
		const job = record(jobs[id]);
		if (job.name !== name) throw new Error(`Wrong job name: ${id}`);
		const wanted =
			id === "checks"
				? requiredJobs
				: ["database", "container", "browser"].includes(id)
					? "static"
					: undefined;
		if (JSON.stringify(job.needs) !== JSON.stringify(wanted))
			throw new Error(`Wrong needs: ${id}`);
		if (
			job["continue-on-error"] !== undefined ||
			job.permissions !== undefined ||
			job["runs-on"] !== "ubuntu-24.04" ||
			typeof job["timeout-minutes"] !== "number" ||
			job["timeout-minutes"] <= 0 ||
			job["timeout-minutes"] > 25
		)
			throw new Error(`Unsafe job policy: ${id}`);
		if (id === "checks" ? job.if !== "always()" : job.if !== undefined)
			throw new Error(`Unsafe job condition: ${id}`);
		for (const entry of list(job.steps)) {
			const step = record(entry);
			if (
				String(step.uses).startsWith("actions/checkout@") &&
				field(step, "with", "persist-credentials") !== false
			)
				throw new Error("Checkout may not persist credentials");
			if (step["continue-on-error"] !== undefined)
				throw new Error("Required steps may not ignore errors");
			if (
				typeof step.uses === "string" &&
				!/^[\w./-]+@[a-f0-9]{40}$/.test(step.uses)
			)
				throw new Error("Actions require full reviewed SHA pins");
			if (/secrets\./.test(JSON.stringify(step)))
				throw new Error("PR quality may not receive repository secrets");
		}
	}
	const adapters: Record<string, RegExp[]> = {
		workflows: [
			/node scripts\/check-ci-profile\.ts/,
			/node scripts\/check-workflows\.ts/,
		],
		secrets: [/npm run security:check/],
		static: [
			/npm run format:check/,
			/npm run lint/,
			/npm run typecheck/,
			/npm test/,
			/npm run contract:generate/,
			/git diff --exit-code/,
		],
		database: [
			/node scripts\/verify-postgres\.ts/,
			/uv run python -m scripts\.verify_project_databases --authorize-fixture/,
			/--backoffice-image portfolio-backoffice:rc/,
			/node --test tests\/integration\/auth\.test\.ts/,
		],
		container: [
			/--severity HIGH,CRITICAL/,
			/node scripts\/verify-container\.ts measure/,
			/node scripts\/verify-container\.ts shutdown/,
		],
		browser: [
			/playwright install --with-deps --only-shell chromium firefox webkit/,
			/test:browser -- backoffice\.spec\.ts --grep-invert "operational failure"/,
			/test:browser -- backoffice\.spec\.ts --grep "operational failure"/,
		],
		checks: [/node scripts\/check-ci-results\.ts/],
	};
	for (const [id, commands] of Object.entries(adapters)) {
		const steps = list(field(jobs, id, "steps"));
		const runs = steps.map((step) => field(step, "run") ?? "").join("\n");
		for (const command of commands)
			if (!command.test(runs))
				throw new Error(`Missing actual job adapter: ${id}`);
		if (["database", "container", "browser"].includes(id)) {
			const build = steps.find((step) =>
				String(field(step, "uses")).startsWith("docker/build-push-action@"),
			);
			if (
				field(build, "with", "context") !== "." ||
				field(build, "with", "file") !== "infra/docker/app/Dockerfile" ||
				field(build, "with", "load") !== true ||
				field(build, "with", "push") === true ||
				field(build, "with", "platforms") !== "linux/amd64"
			)
				throw new Error(
					"Runtime jobs require the same private build configuration",
				);
			if (
				id === "container"
					? field(build, "with", "cache-to") === undefined
					: field(build, "with", "cache-to") !== undefined
			)
				throw new Error("Only container may write the shared build cache");
			if (!/ci-build-provenance\.ts record/.test(runs))
				throw new Error("Missing exact-source build provenance");
			if (
				JSON.stringify(field(jobs, id, "services")) !==
				JSON.stringify(field(jobs, "database", "services"))
			)
				throw new Error(
					"Runtime fixtures differ from the reviewed database configuration",
				);
		}
	}

	for (const [key, value] of [
		["AI_PROVIDER", "fixture"],
		["EMBEDDINGS_PROVIDER", "fixture"],
		["ALLOW_PAID_AI", "false"],
	])
		if (field(workflow, "env", text(key)) !== value)
			throw new Error("Paid providers must be disabled");
}
export function validateWorkflowTrust(value: unknown): void {
	const workflow = record(value);
	for (const job of Object.values(record(workflow.jobs))) {
		for (const entry of list(field(job, "steps") ?? [])) {
			const action = field(entry, "uses");
			if (typeof action === "string" && !/^[\w./-]+@[a-f0-9]{40}$/.test(action))
				throw new Error("Unpinned action");
		}
	}
	if (
		field(workflow, "on", "pull_request_target") !== undefined ||
		field(workflow, "on", "workflow_run") !== undefined
	) {
		for (const policy of [
			workflow.permissions,
			...Object.values(record(workflow.jobs)).map((job) =>
				field(job, "permissions"),
			),
		]) {
			if (
				policy !== undefined &&
				Object.values(record(policy)).some(
					(permission) => permission !== "read",
				)
			)
				throw new Error("Privileged policy must remain read-only");
		}
		for (const job of Object.values(record(workflow.jobs)))
			for (const entry of list(field(job, "steps") ?? [])) {
				if (
					/pull_request\.head|head\.sha|head\.ref/.test(JSON.stringify(entry))
				)
					throw new Error("Privileged workflow may not execute PR head");
				if (
					String(field(entry, "uses")).startsWith("actions/checkout@") &&
					field(entry, "with", "ref") !==
						"$" + "{{ github.event.repository.default_branch }}"
				)
					throw new Error(
						"Privileged checkout must use the trusted default branch",
					);
				if (
					/\b(npm (ci|install)|uv sync|pip install|npx|pnpm|yarn install)\b/.test(
						String(field(entry, "run")),
					)
				)
					throw new Error("Privileged policy may not install PR dependencies");
			}
	}
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	validateCiProfile(
		load(readFileSync(".github/workflows/quality.yml", "utf8")),
	);
	for (const file of readdirSync(".github/workflows").filter((name) =>
		/\.ya?ml$/.test(name),
	))
		validateWorkflowTrust(
			load(readFileSync(`.github/workflows/${file}`, "utf8")),
		);
	console.log("Paired backoffice profile and workflow trust checks passed.");
}
