import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { field } from "./json.ts";

// Standard MIT permission/warranty text, whitespace-normalized; copyright stays separate.
const mitGrantSha256 =
	"fe2a9817987f862eaced948f0468c7f51d2fedfc48c5c505b246a49a3870e9a5";

export function licenseFindings(root: string): string[] {
	const findings: string[] = [];
	try {
		const source = readFileSync(path.join(root, "LICENSE"), "utf8");
		const start = source.indexOf(
			"Permission is hereby granted, free of charge,",
		);
		const grant = source.slice(start).replace(/\s+/g, " ").trim();
		if (
			!source.startsWith("MIT License\n") ||
			!/^Copyright \(c\) \d{4}(?:-\d{4})? \S.+$/m.test(source) ||
			/<[^>]+>/.test(source.slice(0, start)) ||
			start < 0 ||
			createHash("sha256").update(grant).digest("hex") !== mitGrantSha256
		)
			findings.push(
				"LICENSE must retain the standard MIT grant and copyright notice.",
			);
		const manifest: unknown = JSON.parse(
			readFileSync(path.join(root, "package.json"), "utf8"),
		);
		const lock: unknown = JSON.parse(
			readFileSync(path.join(root, "package-lock.json"), "utf8"),
		);
		if (
			field(manifest, "license") !== "MIT" ||
			field(lock, "packages", "", "license") !== "MIT"
		)
			findings.push("Manifest and lock root must identify MIT.");
		const readme = readFileSync(path.join(root, "README.md"), "utf8");
		if (
			!/^## Software license$/m.test(readme) ||
			!readme.includes("](LICENSE)") ||
			!readme.includes("](THIRD_PARTY_NOTICES.md)")
		)
			findings.push(
				"README must link the software license and separate notices.",
			);
		const notices = readFileSync(
			path.join(root, "THIRD_PARTY_NOTICES.md"),
			"utf8",
		);
		if (!/^## Scope$/m.test(notices) || !notices.includes("](LICENSE)"))
			findings.push("Separate notices must document scope and link LICENSE.");
	} catch {
		findings.push(
			"Required licensing files or metadata are missing or unreadable.",
		);
	}
	return findings;
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const findings = licenseFindings(process.cwd());
	for (const finding of findings) console.error(finding);
	console.log(
		`License consistency: ${findings.length} findings. Not a legal audit.`,
	);
	if (findings.length) process.exitCode = 1;
}
