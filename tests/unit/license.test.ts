import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { licenseFindings } from "../../scripts/check-license.ts";

const license = readFileSync(new URL("../../LICENSE", import.meta.url), "utf8");

function fixture(): string {
	const root = mkdtempSync(path.join(tmpdir(), "backoffice-license-"));
	writeFileSync(path.join(root, "LICENSE"), license);
	writeFileSync(
		path.join(root, "package.json"),
		JSON.stringify({ license: "MIT" }),
	);
	writeFileSync(
		path.join(root, "package-lock.json"),
		JSON.stringify({ packages: { "": { license: "MIT" } } }),
	);
	writeFileSync(
		path.join(root, "README.md"),
		"## Software license\n\n[MIT](LICENSE) · [Notices](THIRD_PARTY_NOTICES.md)\n",
	);
	writeFileSync(
		path.join(root, "THIRD_PARTY_NOTICES.md"),
		"## Scope\n\n[MIT](LICENSE) covers software; separate content retains its terms.\n",
	);
	return root;
}

test("current source has consistent software licensing", () => {
	assert.deepEqual(licenseFindings(process.cwd()), []);
});

test("an isolated complete licensing fixture passes", () => {
	const root = fixture();
	try {
		assert.deepEqual(licenseFindings(root), []);
	} finally {
		rmSync(root, { recursive: true });
	}
});

const invalidCases: ReadonlyArray<{
	name: string;
	mutate: (root: string) => void;
}> = [
	{
		name: "a commercial restriction appended to MIT",
		mutate: (root) =>
			writeFileSync(
				path.join(root, "LICENSE"),
				`${license}\nNo commercial use.\n`,
			),
	},
	{
		name: "a placeholder copyright",
		mutate: (root) =>
			writeFileSync(
				path.join(root, "LICENSE"),
				license.replace(
					/Copyright \(c\) \d{4}(?:-\d{4})?/,
					"Copyright (c) <YEAR>",
				),
			),
	},
	{
		name: "a placeholder copyright holder",
		mutate: (root) =>
			writeFileSync(
				path.join(root, "LICENSE"),
				license.replace(
					/Copyright \(c\) [^\n]+/,
					"Copyright (c) 2026 <COPYRIGHT HOLDER>",
				),
			),
	},
	{
		name: "mismatched manifest metadata",
		mutate: (root) =>
			writeFileSync(
				path.join(root, "package.json"),
				JSON.stringify({ license: "ISC" }),
			),
	},
	{
		name: "missing lock metadata",
		mutate: (root) => writeFileSync(path.join(root, "package-lock.json"), "{}"),
	},
	{
		name: "a missing grant",
		mutate: (root) => rmSync(path.join(root, "LICENSE")),
	},
	{
		name: "missing content-scope notices",
		mutate: (root) => rmSync(path.join(root, "THIRD_PARTY_NOTICES.md")),
	},
	{
		name: "README without a license link",
		mutate: (root) =>
			writeFileSync(path.join(root, "README.md"), "## Software license\n"),
	},
];

for (const scenario of invalidCases) {
	test(`license consistency rejects ${scenario.name}`, () => {
		const root = fixture();
		try {
			scenario.mutate(root);
			assert.notDeepEqual(licenseFindings(root), []);
		} finally {
			rmSync(root, { recursive: true });
		}
	});
}
