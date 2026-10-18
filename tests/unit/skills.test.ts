import test from "node:test";
import assert from "node:assert/strict";
import {
	mkdtempSync,
	cpSync,
	writeFileSync,
	rmSync,
	readFileSync,
	unlinkSync,
	symlinkSync,
	mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateSkills } from "../../scripts/check-skills.ts";

test("canonical catalog and relative client discovery resolve", () => {
	assert.deepEqual(validateSkills(process.cwd()).errors, []);
});
test("catalog rejects drift, escapes, malformed metadata and stale commands", () => {
	const root = mkdtempSync(path.join(tmpdir(), "web-skill-validator-"));
	try {
		for (const name of [
			".claude",
			".agents",
			"AGENTS.md",
			"CLAUDE.md",
			"package.json",
			"src",
			"docs",
			"scripts",
			"tests",
			"contracts",
			"README.md",
			"CONTRIBUTING.md",
			"LICENSE",
			"THIRD_PARTY_NOTICES.md",
			"infra",
		])
			cpSync(name, path.join(root, name), {
				recursive: true,
				verbatimSymlinks: true,
			});
		assert.deepEqual(validateSkills(root).errors, []);
		const entry = path.join(
			root,
			".claude/skills/web-change-backoffice/SKILL.md",
		);
		const original = readFileSync(entry, "utf8");
		for (const [change, expected] of [
			[
				original.replace("name: web-change-backoffice", "name: [broken]"),
				/Invalid namespaced/,
			],
			[
				original.replace(
					"name: web-change-backoffice",
					"name: web-change-backoffice\nname: duplicate",
				),
				/Invalid YAML metadata/,
			],
			[`${original}\n[missing](references/missing.md)`, /Missing or external/],
			[`${original}\n[outside](../../../../outside.md)`, /Missing or external/],
			[`${original}\nnpm run invented-command`, /Unknown npm/],
			[`${original}\nTODO`, /Unfinished/],
			[
				original.replace(
					"description:",
					"disable-model-invocation: true\ndescription:",
				),
				/Only portable/,
			],
			[
				original.replace(
					"description:",
					"broken: [private-sentinel\ndescription:",
				),
				/Invalid YAML metadata/,
			],
			[`${original}\n/home/example/private`, /Machine-specific/],
		] satisfies Array<[string, RegExp]>) {
			writeFileSync(entry, change);
			assert.match(validateSkills(root).errors.join("\n"), expected);
		}
		writeFileSync(entry, original);
		const clientFolder = path.join(
			root,
			".claude/skills/web-change-backoffice/agents",
		);
		mkdirSync(clientFolder);
		const client = path.join(clientFolder, "openai.yaml");
		for (const setting of ["false", '"true"', "null", "[]"]) {
			writeFileSync(
				client,
				`policy:\n  allow_implicit_invocation: ${setting}\n`,
			);
			assert.match(
				validateSkills(root).errors.join("\n"),
				/Automatic skill selection/,
			);
		}
		for (const source of [
			"policy:\n  allow_implicit_invocation: true\n",
			"interface:\n  display_name: Example\n",
		]) {
			writeFileSync(client, source);
			assert.deepEqual(validateSkills(root).errors, []);
		}
		writeFileSync(client, "interface: [private-sentinel");
		const redacted = validateSkills(root).errors.join("\n");
		assert.match(redacted, /Automatic skill selection/);
		assert.equal(redacted.includes("private-sentinel"), false);
		rmSync(clientFolder, { recursive: true });
		mkdirSync(
			path.join(root, ".claude/skills/web-change-backoffice/references"),
		);
		assert.match(validateSkills(root).errors.join("\n"), /Empty scaffold/);
		rmSync(path.join(root, ".claude/skills/web-change-backoffice/references"), {
			recursive: true,
		});
		const link = path.join(root, ".agents/skills/web-change-backoffice");
		unlinkSync(link);
		symlinkSync("../../.claude/skills/web-refresh-contract", link);
		assert.match(
			validateSkills(root).errors.join("\n"),
			/relative directory symlink/,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
