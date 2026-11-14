import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { field, record } from "../../scripts/json.ts";

const path = "quality/ratchets/coverage.json";
const metrics = ["lines", "branches", "functions", "statements"] as const;

function floors(source: string): Record<(typeof metrics)[number], number> {
  const floor = record(field(JSON.parse(source), "floors"));
  return Object.fromEntries(
    metrics.map((metric) => {
      const value = floor[metric];
      assert.equal(typeof value, "number", `${metric} floor must be a number`);
      return [metric, Number(value)];
    }),
  ) as Record<(typeof metrics)[number], number>;
}

test("coverage floors never exceed the measured values they were derived from", () => {
  const ratchet = record(JSON.parse(readFileSync(path, "utf8")));
  const measured = record(ratchet.measured);
  for (const [metric, floor] of Object.entries(floors(readFileSync(path, "utf8")))) {
    assert.ok(floor >= 0 && floor <= 100, `${metric} floor out of range`);
    assert.ok(floor <= Number(measured[metric]), `${metric} floor above its measurement`);
  }
});

test("coverage floors only rise against the integration branch (ratchet)", () => {
  let previous: string;
  try {
    previous = execFileSync("git", ["show", `origin/develop:${path}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return; // The file does not exist on develop yet (the PR that introduces it).
  }
  const before = floors(previous);
  for (const [metric, floor] of Object.entries(floors(readFileSync(path, "utf8"))))
    assert.ok(
      floor >= before[metric as (typeof metrics)[number]],
      `${metric} floor lowered; loosening a ratchet needs an ADR and the owner`,
    );
});
