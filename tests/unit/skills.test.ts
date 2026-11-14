import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
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
    const entry = path.join(root, ".agents/skills/web-change-backoffice/SKILL.md");
    const original = readFileSync(entry, "utf8");
    for (const [change, expected] of [
      [original.replace("name: web-change-backoffice", "name: [broken]"), /Invalid namespaced/],
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
        original.replace("description:", "disable-model-invocation: true\ndescription:"),
        /Only portable/,
      ],
      [original.replace(/\nmetadata:\n(?: {2}.*\n)+/, "\n"), /Missing metadata/],
      [original.replace(/last-reviewed: .*/, 'last-reviewed: "soon"'), /Invalid metadata/],
      [original.replace(/Do not use for/, "Avoid"), /Invalid description/],
      [original.replace(/Use when/, "Pick it"), /Invalid description/],
      [original.replace(/even if/, "or"), /Invalid description/],
      [original.replace(/last-reviewed: .*/, 'last-reviewed: "2026-13-40"'), /Invalid metadata/],
      [original.replace(/version: .*/, 'version: "next"'), /Invalid metadata/],
      [original.replace(/version: .*/, 'version: "1.0.0"\n  extra: "x"'), /Invalid metadata/],
      [
        original.replace("description:", "broken: [private-sentinel\ndescription:"),
        /Invalid YAML metadata/,
      ],
      [`${original}\n/home/example/private`, /Machine-specific/],
    ] satisfies Array<[string, RegExp]>) {
      writeFileSync(entry, change);
      assert.match(validateSkills(root).errors.join("\n"), expected);
    }
    writeFileSync(entry, original);
    const clientFolder = path.join(root, ".agents/skills/web-change-backoffice/agents");
    mkdirSync(clientFolder);
    const client = path.join(clientFolder, "openai.yaml");
    for (const setting of ["false", '"true"', "null", "[]"]) {
      writeFileSync(client, `policy:\n  allow_implicit_invocation: ${setting}\n`);
      assert.match(validateSkills(root).errors.join("\n"), /Automatic skill selection/);
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
    mkdirSync(path.join(root, ".agents/skills/web-change-backoffice/references"));
    assert.match(validateSkills(root).errors.join("\n"), /Empty scaffold/);
    rmSync(path.join(root, ".agents/skills/web-change-backoffice/references"), {
      recursive: true,
    });
    const link = path.join(root, ".claude/skills/web-change-backoffice");
    unlinkSync(link);
    symlinkSync("../../.agents/skills/web-refresh-contract", link);
    assert.match(validateSkills(root).errors.join("\n"), /relative directory symlink/);
    unlinkSync(link);
    symlinkSync("../../.agents/skills/web-change-backoffice", link);
    const triggers = path.join(root, ".agents/skills/web-change-backoffice/evals/triggers.json");
    const queries = readFileSync(triggers, "utf8");
    writeFileSync(
      triggers,
      JSON.stringify(
        (JSON.parse(queries) as Array<{ should_trigger: boolean }>).filter(
          (query) => query.should_trigger,
        ),
      ),
    );
    assert.match(validateSkills(root).errors.join("\n"), /near-miss negatives/);
    const duplicated = JSON.parse(queries) as Array<{ query: string }>;
    const [first] = duplicated;
    if (first && duplicated[1]) duplicated[1].query = first.query;
    writeFileSync(triggers, JSON.stringify(duplicated));
    assert.match(validateSkills(root).errors.join("\n"), /20 distinct/);
    unlinkSync(triggers);
    assert.match(
      validateSkills(root).errors.join("\n"),
      /Missing or invalid evals\/triggers\.json/,
    );
    writeFileSync(triggers, queries);
    const outputs = path.join(root, ".agents/skills/web-change-backoffice/evals/evals.json");
    const evals = JSON.parse(readFileSync(outputs, "utf8")) as {
      skill_name: string;
      evals: Array<{ assertions: unknown[] }>;
    };
    writeFileSync(outputs, JSON.stringify({ ...evals, skill_name: "other" }));
    assert.match(validateSkills(root).errors.join("\n"), /evals\.json needs/);
    const [firstCase] = evals.evals;
    if (firstCase) firstCase.assertions = [""];
    writeFileSync(outputs, JSON.stringify(evals));
    assert.match(validateSkills(root).errors.join("\n"), /evals\.json needs/);
    symlinkSync(
      "../../.agents/skills/web-change-backoffice",
      path.join(root, ".claude/skills/extra"),
    );
    assert.match(validateSkills(root).errors.join("\n"), /discovery catalogs differ/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
