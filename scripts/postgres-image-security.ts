import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { field, list, record, text } from "./json.ts";

export function assessPostgresImage(value: unknown, imageId: string) {
	const report = record(value);
	if (
		!/^sha256:[a-f0-9]{64}$/.test(imageId) ||
		report.SchemaVersion !== 2 ||
		report.ArtifactType !== "container_image" ||
		report.ArtifactName !== "portfolio-backoffice-postgres:rc" ||
		field(report, "Metadata", "ImageID") !== imageId
	)
		throw new Error("PostgreSQL inventory does not match the tested image");
	const results = list(report.Results);
	if (!results.some((result) => field(result, "Class") === "os-pkgs"))
		throw new Error("PostgreSQL inventory omits operating-system packages");
	const counts = { critical: 0, fixable_high: 0, unfixed_high: 0, total: 0 };
	for (const result of results) {
		const category = field(result, "Class");
		if (
			!["os-pkgs", "lang-pkgs"].includes(text(category)) ||
			!text(field(result, "Target")).trim() ||
			!text(field(result, "Type")).trim()
		)
			throw new Error("Invalid PostgreSQL result metadata");
		if (category === "os-pkgs") {
			if (
				field(result, "Type") !== "debian" ||
				!/^portfolio-backoffice-postgres:rc \(debian [0-9]+(?:\.[0-9]+)*\)$/.test(
					text(field(result, "Target")),
				)
			)
				throw new Error("Unexpected PostgreSQL operating-system inventory");
			const packages = list(field(result, "Packages"));
			if (
				!packages.length ||
				packages.some(
					(entry) =>
						!text(field(entry, "Name")).trim() ||
						!text(field(entry, "Version")).trim(),
				)
			)
				throw new Error("Invalid PostgreSQL package inventory");
		}
		const vulnerabilities = field(result, "Vulnerabilities");
		for (const entry of vulnerabilities === undefined
			? []
			: list(vulnerabilities)) {
			const vulnerability = record(entry);
			if (
				!text(vulnerability.VulnerabilityID).trim() ||
				!["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(
					text(vulnerability.Severity),
				)
			)
				throw new Error("Invalid PostgreSQL vulnerability inventory");
			const fixed =
				vulnerability.FixedVersion === undefined
					? ""
					: text(vulnerability.FixedVersion);
			if (fixed !== fixed.trim())
				throw new Error("Invalid PostgreSQL fix metadata");
			counts.total++;
			if (vulnerability.Severity === "CRITICAL") counts.critical++;
			if (vulnerability.Severity === "HIGH") {
				if (fixed) counts.fixable_high++;
				else counts.unfixed_high++;
			}
		}
	}
	return {
		...counts,
		blocked: counts.critical > 0 || counts.fixable_high > 0,
		production_assessment_required: counts.unfixed_high > 0,
	};
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	try {
		if (process.argv.length !== 4)
			throw new Error("Missing PostgreSQL inventory arguments");
		const summary = assessPostgresImage(
			JSON.parse(readFileSync(text(process.argv[2]), "utf8")),
			text(process.argv[3]),
		);
		console.log(JSON.stringify(summary));
		if (summary.production_assessment_required)
			console.log(
				"Unfixed HIGH PostgreSQL findings require explicit production assessment; this is not a waiver.",
			);
		if (summary.blocked) {
			console.error(
				"PostgreSQL image contains critical or fixable high findings.",
			);
			process.exitCode = 1;
		}
	} catch {
		console.error("PostgreSQL inventory is missing, invalid or mismatched.");
		process.exitCode = 1;
	}
}
