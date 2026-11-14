import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { field, list, text } from "../../scripts/json.ts";
import { filterMutationFiles } from "../../scripts/mutation-changed.ts";
import { mutationGate, mutationScore, mutationScores } from "../../scripts/mutation-gate.ts";

const file = (...statuses: string[]) => ({ mutants: statuses.map((status) => ({ status })) });
const report = {
  files: {
    "src/features/auth/domain/access.ts": file("Killed", "Survived"),
    "src/features/auth/application/manage-access.ts": file("Killed", "Timeout"),
    "src/features/analytics/domain/models.ts": file("Killed", "Killed", "Killed", "Killed"),
  },
};

test("mutation score counts timeout and no coverage with Stryker's denominator", () => {
  assert.equal(
    mutationScore([
      "Killed",
      "Timeout",
      "Survived",
      "NoCoverage",
      "CompileError",
      "RuntimeError",
      "Ignored",
      "Pending",
    ]).score,
    50,
  );
  assert.equal(mutationScore([]).score, 100);
  assert.equal(mutationScore(["Ignored"]).score, 100);
});

test("permission gate combines auth domain and application independently of overall", () => {
  const scores = mutationScores(report);
  assert.equal(scores.overall.score, 87.5);
  assert.equal(scores.permission.score, 75);
  assert.deepEqual(mutationGate(report).failures, ["Permission score is below 85%"]);
  assert.equal(mutationGate({ files: { "src/other.ts": file("NoCoverage") } }).failures.length, 1);
  assert.throws(() => mutationScores({}), /object/);
  assert.throws(() => mutationScores({ files: {} }), /no files/);
  assert.throws(() => mutationScores({ files: { x: file("Unknown") } }), /status/);
});

test("ratchet applies only on full runs and never replaces fixed thresholds", () => {
  const options = { ratchet: { floors: { overall: 90 } } };
  assert.equal(mutationGate(report, options).failures.length, 1);
  assert.equal(mutationGate(report, { ...options, full: true }).failures.length, 2);
  assert.equal(
    mutationGate(report, { full: true, ratchet: { floors: { overall: 87.5 } } }).failures.length,
    1,
  );
  assert.throws(() => mutationGate(report, { full: true, ratchet: {} }), /floor/);
  assert.equal(
    mutationGate(
      { files: { x: file("Survived") } },
      { full: true, ratchet: { floors: { overall: 0 } } },
    ).failures.length,
    1,
  );
});

test("changed-file filter follows mutation includes and exclusions", () => {
  const globs = list(field(JSON.parse(readFileSync("stryker.config.json", "utf8")), "mutate")).map(
    text,
  );
  const included = [
    "src/features/auth/domain/access.ts",
    "src/features/auth/domain/nested/check.ts",
    "src/features/analytics/adapters/validate-report.ts",
    "src/features/operations/adapters/feedback-validate.ts",
    "src/shared/http/bounded-json.ts",
    "src/server/auth/config.ts",
  ];
  assert.deepEqual(
    filterMutationFiles(
      [
        ...included,
        "src/features/auth/domain/access.tsx",
        "src/app/page.ts",
        "src/features/auth/adapters/store.ts",
        "src/features/auth/presentation/copy.ts",
      ],
      globs,
    ),
    included,
  );
  assert.deepEqual(filterMutationFiles(["src/features/auth/domain/store.ts"], globs), []);
  assert.deepEqual(filterMutationFiles([], globs), []);
});
