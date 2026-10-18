import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "js-yaml";
import { field, list, record } from "./json.ts";

export function intentionalPublicationOff(
	value: unknown,
	source: string,
): boolean {
	const diagnostic = record(value);
	if (
		diagnostic.filepath !== ".github/workflows/release.yml" ||
		diagnostic.kind !== "if-cond" ||
		diagnostic.message !==
			'constant expression "false" in condition. remove the if: section' ||
		typeof diagnostic.line !== "number"
	)
		return false;
	if (field(load(source), "jobs", "publish", "if") !== "$" + "{{ false }}")
		return false;
	const lines = source.split("\n");
	const start = lines.indexOf("  publish:");
	if (start < 0 || diagnostic.line <= start + 1) return false;
	const boundary = lines.findIndex(
		(line, index) => index > start && /^ {2}[\w-]+:/.test(line),
	);
	if (boundary >= 0 && diagnostic.line > boundary) return false;
	return /^\s+if: \$\{\{ false \}\}$/.test(lines[diagnostic.line - 1] ?? "");
}

export function validateActionlintDiagnostics(
	value: unknown,
	source: string,
): number {
	const diagnostics = list(value);
	if (
		diagnostics.length > 1 ||
		diagnostics.some(
			(diagnostic) => !intentionalPublicationOff(diagnostic, source),
		)
	)
		throw new Error("Unrecognized workflow diagnostic");
	return diagnostics.length;
}

async function check() {
	const directory = mkdtempSync(join(tmpdir(), "backoffice-actionlint-"));
	try {
		const archive = join(directory, "actionlint.tar.gz");
		const response = await fetch(
			"https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz",
			{ signal: AbortSignal.timeout(60_000) },
		);
		if (!response.ok) throw new Error("Official actionlint download failed");
		writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
		if (
			createHash("sha256").update(readFileSync(archive)).digest("hex") !==
			"8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8"
		)
			throw new Error("Actionlint checksum mismatch");
		execFileSync("tar", ["-xzf", archive, "-C", directory, "actionlint"]);
		const files = readdirSync(".github/workflows")
			.filter((name) => /\.ya?ml$/.test(name))
			.map((name) => `.github/workflows/${name}`);
		const result = spawnSync(
			join(directory, "actionlint"),
			["-format", "{{json .}}", ...files],
			{ encoding: "utf8" },
		);
		if (
			result.error ||
			result.signal ||
			(result.status !== 0 && result.status !== 1)
		)
			throw new Error("Actionlint failed to execute");
		const diagnostics = list(JSON.parse(result.stdout.trim() || "[]"));
		validateActionlintDiagnostics(
			diagnostics,
			readFileSync(".github/workflows/release.yml", "utf8"),
		);
		if (
			(result.status !== 0 && diagnostics.length === 0) ||
			result.stderr.trim()
		)
			throw new Error("Workflow validation failed");
		console.log(
			`Official actionlint passed; ${diagnostics.length} intentional publication-OFF diagnostic recognized, no other exceptions.`,
		);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
	await check();
