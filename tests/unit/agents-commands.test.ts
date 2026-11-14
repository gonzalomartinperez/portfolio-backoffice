import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import { load } from "js-yaml";
import { field, list, record } from "../../scripts/json.ts";

const scripts = record(record(JSON.parse(readFileSync("package.json", "utf8"))).scripts);

test("every npm command named in AGENTS.md exists in package.json", () => {
  const agents = readFileSync("AGENTS.md", "utf8");
  const named = [...agents.matchAll(/`npm run ([a-z][a-z0-9:-]*)[^`]*`/g)].map((match) => match[1]);
  assert.ok(named.includes("check"), "AGENTS.md must name npm run check");
  for (const name of named)
    assert.ok(name && name in scripts, `AGENTS.md names unknown npm run ${name}`);
});

test("npm run check covers the static gates in order", () => {
  const steps = String(scripts.check).split(" && ");
  assert.deepEqual(steps, [
    "npm run format:check",
    "npm run lint",
    "npm run typecheck",
    "npm test",
    "npm run docs:check",
    "npm run license:check",
    "npm run skills:check",
    "npm run security:check",
  ]);
});

test("npm run check:fast keeps the editor loop on real guards", () => {
  assert.deepEqual(String(scripts["check:fast"]).split(" && "), [
    "npm run format:check",
    "npm run lint",
    "npm run typecheck",
    "node --test tests/unit/boundaries.test.ts tests/unit/layout.test.ts",
  ]);
});

test("the pre-commit hook and the CI static job run the same command", () => {
  const hook = readFileSync(".githooks/pre-commit", "utf8");
  assert.match(hook, /^exec npm run --silent check$/m);
  assert.ok(statSync(".githooks/pre-commit").mode & 0o111, "hook must be executable");
  assert.match(String(scripts.prepare), /git config core\.hooksPath \.githooks/);
  const workflow = load(readFileSync(".github/workflows/ci.yml", "utf8"));
  const runs = list(field(workflow, "jobs", "static", "steps")).map((step) =>
    String(field(step, "run") ?? ""),
  );
  assert.ok(runs.includes("npm run check"), "static job must run npm run check");
});
