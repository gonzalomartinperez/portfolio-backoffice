import assert from "node:assert/strict";
import { test } from "vitest";
import {
  compareComplexity,
  compareKnip,
  complexityLocations,
} from "../../scripts/check-static-ratchets.ts";

const rule = "lint/complexity/noExcessiveCognitiveComplexity";
const diagnostic = (path: string, line: number, score: number, category = rule) => ({
  category,
  message: `Excessive complexity of ${score} detected (max: 10).`,
  location: { path, start: { line, column: 1 } },
});
const baseline = {
  knip: { counts: { exports: 3, types: 4 } },
  complexity: {
    locations: [
      { file: "src/a.ts", line: 10, complexity: 20 },
      { file: "src/a.ts", line: 40, complexity: 12 },
    ],
  },
};

test("knip counts may only fall", () => {
  assert.deepEqual(compareKnip({ exports: 3, types: 4 }, baseline).failures, []);
  assert.equal(compareKnip({ exports: 4, types: 4 }, baseline).failures.length, 1);
  assert.equal(compareKnip({ exports: 3, types: 4, files: 1 }, baseline).failures.length, 1);
  assert.equal(compareKnip({ exports: 2, types: 4 }, baseline).hints.length, 1);
});

test("complexity fails on a new file, an extra function or a higher score", () => {
  const same = [
    { file: "src/a.ts", line: 11, complexity: 20 },
    { file: "src/a.ts", line: 41, complexity: 12 },
  ];
  assert.deepEqual(compareComplexity(same, baseline).failures, []);
  assert.ok(
    compareComplexity([...same, { file: "src/b.ts", line: 1, complexity: 11 }], baseline).failures
      .length > 0,
  );
  assert.ok(
    compareComplexity([...same, { file: "src/a.ts", line: 90, complexity: 11 }], baseline).failures
      .length > 0,
  );
  assert.ok(
    compareComplexity(
      [
        { file: "src/a.ts", line: 10, complexity: 21 },
        { file: "src/a.ts", line: 40, complexity: 12 },
      ],
      baseline,
    ).failures.length > 0,
  );
});

test("the Biome report is read fail-closed", () => {
  const ok = { summary: {}, diagnostics: [diagnostic("src/a.ts", 10, 20)] };
  assert.deepEqual(complexityLocations(ok), [{ file: "src/a.ts", line: 10, complexity: 20 }]);
  assert.throws(() => complexityLocations({ diagnostics: [] }), /no summary/);
  assert.throws(
    () =>
      complexityLocations({ summary: {}, diagnostics: [diagnostic("src/a.ts", 1, 1, "parse")] }),
    /Unexpected Biome diagnostic/,
  );
  assert.deepEqual(
    complexityLocations({
      summary: {},
      diagnostics: [diagnostic("src/a.ts", 1, 1, "suppressions/unused")],
    }),
    [],
  );
});
