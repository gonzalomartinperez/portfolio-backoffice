import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { load } from "js-yaml";
import { field, list, record } from "../../scripts/json.ts";

const config = () => record(load(readFileSync(".github/dependabot.yml", "utf8")));

test("one weekly grouped dependency PR targets develop on Monday 09:00 ART (OD-20, OD-21)", () => {
  const groups = record(config()["multi-ecosystem-groups"]);
  assert.deepEqual(Object.keys(groups), ["weekly"]);
  const weekly = record(groups.weekly);
  assert.deepEqual(weekly.schedule, {
    interval: "weekly",
    day: "monday",
    time: "09:00",
    timezone: "America/Argentina/Buenos_Aires",
  });
  assert.equal(weekly["target-branch"], "develop");
  assert.equal(weekly["open-pull-requests-limit"], 1);
  assert.equal(field(weekly, "commit-message", "prefix"), "chore(deps)");
});

test("every ecosystem joins the group with the verified entry shape", () => {
  const updates = list(config().updates).map(record);
  assert.deepEqual(
    updates.map((entry) => `${entry["package-ecosystem"]}:${entry.directory}`),
    ["npm:/", "npm:/tooling/api-contract", "github-actions:/", "docker:/infra/docker/app"],
  );
  for (const entry of updates) {
    assert.equal(entry["multi-ecosystem-group"], "weekly");
    assert.deepEqual(entry.patterns, ["*"]);
    // Rejected by Dependabot on group members (verified 2026-11-09).
    assert.equal(entry["open-pull-requests-limit"], undefined);
    assert.equal(entry["commit-message"], undefined);
    assert.equal(entry["target-branch"], undefined);
    const cooldown = record(entry.cooldown);
    assert.equal(cooldown["default-days"], 7);
    const semver = Object.keys(cooldown).filter((key) => key.startsWith("semver-"));
    if (entry["package-ecosystem"] === "npm")
      assert.deepEqual(semver.sort(), ["semver-major-days", "semver-patch-days"]);
    else assert.deepEqual(semver, [], "semver cooldown keys are npm/uv only");
  }
});
