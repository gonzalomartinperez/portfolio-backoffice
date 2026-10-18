import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
	appendFileSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { record, text } from "./json.ts";

export function buildFingerprint(
	inputs: ReadonlyArray<readonly [string, string]>,
): string {
	const hash = createHash("sha256");
	for (const [name, content] of inputs) hash.update(`${name}\0${content}\0`);
	return hash.digest("hex");
}
export function validateBuildIdentity(
	value: unknown,
	expected: {
		source: string;
		run: string;
		attempt: string;
		job: string;
		fingerprint: string;
		image: string;
	},
): void {
	const proof = record(value);
	for (const [key, wanted] of Object.entries(expected)) {
		if (proof[key] !== wanted)
			throw new Error(`Build provenance mismatch: ${key}`);
	}
	if (
		!/^[a-f0-9]{40}$/.test(expected.source) ||
		!/^sha256:[a-f0-9]{64}$/.test(expected.image)
	)
		throw new Error(
			"Build identity must use immutable source and image revisions",
		);
}
const inputs = [
	"infra/docker/app/Dockerfile",
	"infra/docker/app/Dockerfile.dockerignore",
	".nvmrc",
	"package.json",
	"package-lock.json",
	"next.config.ts",
	"next-env.d.ts",
	"tsconfig.json",
];
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const dirty = execFileSync(
		"git",
		["status", "--porcelain", "--untracked-files=normal"],
		{ encoding: "utf8" },
	).trim();
	if (dirty)
		throw new Error(
			"Build provenance requires an unchanged candidate checkout",
		);
	if (process.argv[2] === "start") {
		const destination = process.env.GITHUB_ENV;
		if (!destination) throw new Error("GitHub environment file is required");
		appendFileSync(destination, `CI_BUILD_STARTED_AT=${Date.now()}\n`);
	} else if (process.argv[2] === "record") {
		const source = execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim();
		if (source !== process.env.GITHUB_SHA)
			throw new Error("Checkout is not the expected candidate");
		const run = text(process.env.GITHUB_RUN_ID);
		const attempt = text(process.env.GITHUB_RUN_ATTEMPT);
		const job = text(process.env.CI_JOB_ID);
		if (
			!/^\d+$/.test(run) ||
			!/^\d+$/.test(attempt) ||
			!["database", "container", "browser"].includes(job)
		)
			throw new Error("Invalid build producer identity");
		const workflow = text(process.env.CI_WORKFLOW_SHA);
		const base = text(process.env.CI_BASE_SHA);
		if (!/^[a-f0-9]{40}$/.test(workflow) || !/^[a-f0-9]{40}$/.test(base))
			throw new Error("Missing workflow/base revision");
		const fingerprint = buildFingerprint(
			inputs.map((name) => [name, readFileSync(name, "utf8")]),
		);
		const image = execFileSync(
			"docker",
			["image", "inspect", "portfolio-backoffice:rc", "--format", "{{.Id}}"],
			{ encoding: "utf8" },
		).trim();
		const platform = execFileSync(
			"docker",
			[
				"image",
				"inspect",
				"portfolio-backoffice:rc",
				"--format",
				"{{.Os}}/{{.Architecture}}",
			],
			{ encoding: "utf8" },
		).trim();
		if (platform !== "linux/amd64")
			throw new Error("Unreviewed build platform");
		const proof = {
			schema_version: 1,
			source,
			run,
			attempt,
			job,
			fingerprint,
			image,
			platform,
			workflow,
			base,
			build_arguments: {},
			rebuild_reason: "Private image bytes stay on their isolated runner",
			build_duration_ms: Date.now() - Number(process.env.CI_BUILD_STARTED_AT),
		};
		validateBuildIdentity(proof, {
			source,
			run,
			attempt,
			job,
			fingerprint,
			image,
		});
		if (
			!Number.isFinite(proof.build_duration_ms) ||
			proof.build_duration_ms < 0
		)
			throw new Error("Missing build timing");
		mkdirSync(".artifacts/ci-provenance", { recursive: true, mode: 0o700 });
		writeFileSync(
			`.artifacts/ci-provenance/${job}.json`,
			`${JSON.stringify(proof, null, 2)}\n`,
			{ mode: 0o600 },
		);
		console.log(
			`Bound ${job} image to ${source}; build duration ${proof.build_duration_ms} ms. Private image not uploaded.`,
		);
	} else throw new Error("Expected start or record mode");
}
