import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { releaseNotes } from "../../scripts/release-notes.ts";

for (const ending of ["## [1.9.0]\n\nOld notes.\n", "[2.0.0]: https://example.com\n", ""]) {
  test(`extracts the version section before ${ending || "end of file"}`, () => {
    assert.deepEqual(
      releaseNotes(`## [2.0.0] - 2026-11-14\n\n### Added\n\n- A feature.\n\n${ending}`, "2.0.0"),
      { version: "2.0.0", notes: "### Added\n\n- A feature." },
    );
  });
}

test("missing version section returns null", () => {
  assert.deepEqual(releaseNotes("# Changelog\n", "2.0.0"), { version: "2.0.0", notes: null });
});

test("empty version sections throw", () => {
  for (const ending of ["", "## [1.0.0]\nOld notes.\n", "[x]: https://example.com\n"])
    assert.throws(() => releaseNotes(`## [2.0.0]\n \t\n${ending}`, "2.0.0"), /empty/);
});

test("invalid versions throw", () => {
  for (const version of ["", "v2.0.0", "2.0", "2.0.0-beta.1", "2x0x0", "2.0.0\n", "2.*.0"])
    assert.throws(() => releaseNotes("", version), /Version/);
});

test("version dots are escaped as literal regex metacharacters", () => {
  assert.equal(releaseNotes("## [2x0x0]\nWrong section.\n", "2.0.0").notes, null);
  assert.equal(
    releaseNotes("## [2x0x0]\nWrong.\n## [2.0.0]\nCorrect.\n", "2.0.0").notes,
    "Correct.",
  );
});

test("Unreleased does not match a real version", () => {
  assert.equal(releaseNotes("## [Unreleased]\nPending changes.\n", "2.0.0").notes, null);
});

test("the current package version has release notes unless it is the pre-refactor 1.0.0", () => {
  const manifest: unknown = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  assert.ok(typeof manifest === "object" && manifest !== null && "version" in manifest);
  assert.equal(typeof manifest.version, "string");
  if (typeof manifest.version !== "string") throw new Error("Expected a string package version.");
  const changelog = readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8");
  const result = releaseNotes(changelog, manifest.version);
  assert.ok(result.notes !== null || result.version === "1.0.0");
});

test("the CLI prints only key=value lines and writes notes only for a released version", () => {
  const script = resolve("scripts/release-notes.ts");
  for (const [changelog, hasSection] of [
    ["# Changelog\n\n## [2.0.0] - 2026-11-14\n\n- Notes.\n", "true"],
    ["# Changelog\n\n## [Unreleased]\n", "false"],
  ] as const) {
    const cwd = mkdtempSync(join(tmpdir(), "release-notes-"));
    try {
      writeFileSync(join(cwd, "package.json"), JSON.stringify({ version: "2.0.0" }));
      writeFileSync(join(cwd, "CHANGELOG.md"), changelog);
      const notes = join(cwd, "notes.md");
      const stdout = execFileSync(process.execPath, [script, notes], { cwd, encoding: "utf8" });
      assert.equal(stdout, `version=2.0.0\nhas_section=${hasSection}\n`);
      assert.equal(existsSync(notes), hasSection === "true");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }
});
