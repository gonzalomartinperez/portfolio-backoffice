import assert from "node:assert/strict";
import { test } from "vitest";
import {
  evaluateDiff,
  isCriticalPath,
  isGated,
  parseChangedLines,
  parseLcov,
} from "../../scripts/diff-coverage.ts";

const lcov = [
  "TN:",
  "SF:/repo/src/features/auth/domain/access.ts",
  "DA:1,1",
  "DA:2,0",
  "DA:3,4",
  "end_of_record",
  "SF:/repo/src/shared/format/number.ts",
  "DA:10,1",
  "DA:11,0",
  "end_of_record",
  "",
].join("\n");

const diff = [
  "diff --git a/src/features/auth/domain/access.ts b/src/features/auth/domain/access.ts",
  "--- a/src/features/auth/domain/access.ts",
  "+++ b/src/features/auth/domain/access.ts",
  "@@ -1,0 +1,3 @@",
  "+a",
  "+b",
  "+c",
  "diff --git a/src/shared/format/number.ts b/src/shared/format/number.ts",
  "--- a/src/shared/format/number.ts",
  "+++ b/src/shared/format/number.ts",
  "@@ -9 +10 @@",
  "+x",
  "@@ -20,2 +20,0 @@",
  "diff --git a/src/old.ts b/src/old.ts",
  "--- a/src/old.ts",
  "+++ /dev/null",
  "@@ -1,2 +0,0 @@",
  "",
].join("\n");

test("lcov paths become repository-relative and keep per-line hits", () => {
  const files = parseLcov(lcov, "/repo");
  assert.deepEqual(
    [...files.keys()],
    ["src/features/auth/domain/access.ts", "src/shared/format/number.ts"],
  );
  assert.equal(files.get("src/features/auth/domain/access.ts")?.get(2), 0);
  assert.equal(files.get("src/shared/format/number.ts")?.get(10), 1);
});

test("zero-context hunks yield added lines; deletions and removed files yield none", () => {
  const changed = parseChangedLines(diff);
  assert.deepEqual([...(changed.get("src/features/auth/domain/access.ts") ?? [])], [1, 2, 3]);
  assert.deepEqual([...(changed.get("src/shared/format/number.ts") ?? [])], [10]);
  assert.equal(changed.has("src/old.ts"), false);
  assert.throws(() => parseChangedLines("+++ b/src/a.ts\n@@ nonsense @@\n"), /Unreadable hunk/);
});

test("critical code needs 90 % and the rest 80 % of changed executable lines", () => {
  const result = evaluateDiff(parseLcov(lcov, "/repo"), parseChangedLines(diff));
  assert.deepEqual(
    result.results.map(({ group, covered, total }) => [group, covered, total]),
    [
      ["critical", 2, 3],
      ["rest", 1, 1],
    ],
  );
  assert.deepEqual(result.uncovered, ["src/features/auth/domain/access.ts:2"]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0] ?? "", /^critical diff coverage 66\.7 % \(2\/3\) is below 90 %$/);
});

test("a change without executable lines passes and a gated file missing from lcov fails", () => {
  assert.deepEqual(evaluateDiff(new Map(), new Map()).errors, []);
  const missing = evaluateDiff(new Map(), new Map([["src/server/env.ts", new Set([1])]]));
  assert.deepEqual(missing.errors, [
    "src/server/env.ts changed but is missing from the coverage report",
  ]);
});

test("routes and tsx presentation stay outside the gate until components are measured", () => {
  assert.equal(isGated("src/features/operations/adapters/http.ts"), true);
  assert.equal(isGated("src/app/api/ready/route.ts"), false);
  assert.equal(isGated("src/features/auth/presentation/sign-in.tsx"), false);
  assert.equal(isGated("scripts/check-docs.ts"), false);
  assert.equal(isCriticalPath("src/server/auth/session.ts"), true);
  assert.equal(isCriticalPath("src/server/dal/members.ts"), true);
  assert.equal(isCriticalPath("src/features/operations/adapters/http.ts"), false);
});
