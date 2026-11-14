import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";

// Role projects select tests by tag (playwright.config.ts), so an untagged test would match no
// project and silently never run. Every journey test must carry exactly one role tag.
const roleTag = /@(anonymous|owner|viewer)\b/g;
const directory = "tests/browser";

test("every browser journey test carries exactly one role tag", () => {
  const specs = readdirSync(directory).filter((file) => file.endsWith(".spec.ts"));
  assert.ok(specs.length > 0, "no browser specs found");
  let declarations = 0;
  for (const spec of specs) {
    const source = readFileSync(join(directory, spec), "utf8");
    // A declaration runs from `test(` to the start of its async body.
    for (const match of source.matchAll(/^\s*test\(([\s\S]*?)async\s*\(/gm)) {
      declarations += 1;
      const header = match[1] ?? "";
      const roles = [...header.matchAll(roleTag)].map((role) => role[1]);
      assert.equal(
        roles.length,
        1,
        `${spec}: ${header.split("\n")[0]?.trim()} has ${roles.length} role tags`,
      );
    }
  }
  assert.ok(declarations >= 19, `expected at least 19 journey tests, found ${declarations}`);
});
