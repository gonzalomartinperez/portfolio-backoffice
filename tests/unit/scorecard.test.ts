import assert from "node:assert/strict";
import * as childProcess from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, vi } from "vitest";
import { evaluate, main, parseArgs } from "../../scripts/scorecard/run.ts";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawnSync: vi.fn(),
}));

const date = "2026-11-14";
const artifact = (data: unknown) => ({ data, source: "fixture.json" });
const coverage = (pct: number) =>
  artifact({
    total: Object.fromEntries(
      ["lines", "branches", "functions", "statements"].map((key) => [key, { pct }]),
    ),
  });
const reading = (result: ReturnType<typeof evaluate>, id: string) => {
  const found = Object.values(result.scorecard.axes)
    .flatMap((axis) => axis.readings)
    .find((item) => item.id === id);
  assert.ok(found, id);
  return found;
};

test("missing inputs are gaps, with every rubric axis present", () => {
  const result = evaluate({}, {}, date);
  assert.equal(Object.keys(result.scorecard.axes).length, 21);
  assert.equal(result.exitCode, 0);
  assert.ok(result.scorecard.axes.D3?.gaps.some((gap) => gap.id === "coverage.lines"));
  assert.deepEqual(result.scorecard.axes.D3?.readings, []);
  assert.equal(result.scorecard.axes.R7?.gaps[0]?.reason, "evaluator run pending");
});

test("coverage below its floor regresses, equality passes", () => {
  const ratchets = { "coverage.json": { floors: { lines: 80 } } };
  const result = evaluate({ coverage: coverage(79) }, ratchets, date);
  assert.equal(result.exitCode, 1);
  assert.equal(reading(result, "coverage.lines").status, "regression");
  assert.equal(evaluate({ coverage: coverage(80) }, ratchets, date).exitCode, 0);
});

test("mutation includes timeout and no-coverage, excludes errors and ignored mutants", () => {
  const mutation = artifact({
    files: {
      "a.ts": {
        mutants: ["Killed", "Timeout", "Survived", "NoCoverage", "CompileError", "Ignored"].map(
          (status) => ({ status }),
        ),
      },
    },
  });
  const result = evaluate({ mutation }, {}, date);
  assert.equal(reading(result, "mutation").value, 50);
  assert.equal(reading(result, "mutation").ratchet, null);
  assert.equal(
    evaluate({ mutation }, { "mutation.json": { floors: { overall: 70 } } }, date).exitCode,
    1,
  );
  assert.ok(
    evaluate({ mutation: artifact({ files: {} }) }, {}, date).scorecard.axes.D3?.gaps.some(
      (gap) => gap.id === "mutation",
    ),
  );
});

test("flaky and axe counts regress above zero", () => {
  const result = evaluate(
    { flaky: artifact({ totals: { flaky: 1 } }), a11y: artifact({ violations: 1 }) },
    {},
    date,
  );
  assert.equal(result.exitCode, 1);
  assert.equal(result.scorecard.summary.regression, 2);
});

test("warn-age permits 14 days, fails at 15 and fails without warnSince", () => {
  for (const [warnSince, expected] of [
    ["2026-10-31", 0],
    ["2026-10-30", 1],
    [undefined, 1],
    ["invalid", 1],
    ["2026-11-15", 1],
  ] as const) {
    const result = evaluate({}, { "security.json": { mode: "warn", warnSince } }, date);
    assert.equal(result.exitCode, expected);
    assert.equal(reading(result, "security.json.warn-age").ratchet, 14);
  }
});

test("judgement preserves evaluator provenance and scores", () => {
  const judgement = {
    evaluatedAt: date,
    commit: "abc",
    method: "independent",
    scores: { P1: 90, R7: 95 },
  };
  const result = evaluate({}, { "scorecard.json": judgement }, date);
  assert.deepEqual(result.scorecard.judgement, judgement);
  assert.ok(!result.scorecard.axes.P1?.gaps.some((gap) => gap.id === "judgement"));
});

test("route budgets compare both directions and expose missing baseline metrics", () => {
  const result = evaluate(
    {
      bundle: artifact({ routes: { "/": { bytes: 101 } } }),
      lighthouse: artifact({ routes: { "/": { performance: 89 } } }),
    },
    {
      "bundle.json": { baseline: { routes: { "/": { bytes: 100 }, "/access": { bytes: 50 } } } },
      "lighthouse.json": { baseline: { routes: { "/": { performance: 90 } } } },
    },
    date,
  );
  assert.equal(result.scorecard.summary.regression, 3);
  assert.equal(reading(result, "bundle./access.bytes").status, "regression");
});

test("static baselines are labelled and current measurements can regress", () => {
  const ratchets = {
    "static.json": { knip: { total: 1 }, complexity: { count: 0, locations: [] } },
    "tokens.json": {},
  };
  const baseline = evaluate({}, ratchets, date);
  assert.equal(reading(baseline, "knip").source, "ratchet (not re-measured)");
  assert.equal(baseline.exitCode, 0);
  const measured = evaluate(
    { static: { knip: { exports: 2 }, complexity: [] }, contrast: 1 },
    ratchets,
    date,
  );
  assert.equal(measured.scorecard.summary.regression, 2);
  assert.equal(reading(measured, "token-contrast-regressions").value, 1);
});

test("malformed metrics and invalid dates fail closed", () => {
  assert.throws(() => evaluate({ coverage: coverage(Number.NaN) }, {}, date));
  assert.throws(() => evaluate({}, {}, "2026-02-30"));
});

test("bad CLI flags exit 2 with usage before reading inputs", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  for (const args of [["--unknown"], ["--out"], ["--date", "--out"], ["positional", "value"]]) {
    assert.throws(() => parseArgs(args), /Usage:/);
    assert.equal(await main(args), 2);
    assert.match(String(error.mock.lastCall?.[0]), /Usage:/);
  }
  assert.deepEqual(parseArgs(["--out", "custom.json", "--commit", "abc"]), {
    out: "custom.json",
    commit: "abc",
  });
});

test("Lighthouse timing and size metrics decrease while scores increase", () => {
  const metrics = {
    tbt: 101,
    cls: 1,
    lcp: 101,
    fcp: 101,
    si: 101,
    ttfb: 101,
    customMs: 101,
    transferBytes: 101,
    performance: 89,
  };
  const baseline = Object.fromEntries(
    Object.keys(metrics).map((key) => [
      key,
      key === "performance" ? 90 : key === "cls" ? 0.1 : 100,
    ]),
  );
  const result = evaluate(
    { lighthouse: artifact({ routes: { "/": metrics } }) },
    { "lighthouse.json": { baseline: { routes: { "/": baseline } } } },
    date,
  );
  assert.equal(result.scorecard.summary.regression, Object.keys(metrics).length);
  assert.equal(reading(result, "lighthouse./.tbt").better, "lower");
});

test("an omitted metric in a measured route regresses", () => {
  const result = evaluate(
    { bundle: artifact({ routes: { "/": {} } }) },
    { "bundle.json": { baseline: { routes: { "/": { bytes: 100 } } } } },
    date,
  );
  assert.equal(reading(result, "bundle./.bytes").status, "regression");
});

test("axe arrays count only serious and critical impacts", () => {
  const result = evaluate(
    {
      a11y: artifact(
        ["minor", "moderate", "serious", "critical", null].map((impact) => ({ impact })),
      ),
    },
    {},
    date,
  );
  assert.equal(reading(result, "axe-serious-critical").value, 2);
});

test("static comparison catches category shifts and rising complexity at equal totals", () => {
  const result = evaluate(
    { static: { knip: { types: 1 }, complexity: [{ file: "a.ts", line: 2, complexity: 12 }] } },
    {
      "static.json": {
        knip: { total: 1, counts: { exports: 1 } },
        complexity: { count: 1, locations: [{ file: "a.ts", line: 1, complexity: 11 }] },
      },
    },
    date,
  );
  assert.equal(reading(result, "knip").status, "regression");
  assert.equal(reading(result, "complexity").status, "regression");
});

function workspace() {
  const cwd = mkdtempSync(path.join(tmpdir(), "scorecard-test-"));
  mkdirSync(path.join(cwd, "quality/ratchets"), { recursive: true });
  mkdirSync(path.join(cwd, "src/app"), { recursive: true });
  writeFileSync(path.join(cwd, "src/app/style.css"), readFileSync("src/app/style.css"));
  return cwd;
}
function spawnResult(error?: NodeJS.ErrnoException, stderr = "") {
  return {
    pid: 0,
    output: [],
    stdout: "",
    stderr,
    status: error ? null : 1,
    signal: null,
    ...(error ? { error } : {}),
  } satisfies childProcess.SpawnSyncReturns<string>;
}

test("main writes the scorecard before returning 1 for a regression", async () => {
  const cwd = workspace();
  vi.stubEnv("CI", undefined);
  vi.mocked(childProcess.spawnSync).mockReturnValue(
    spawnResult(Object.assign(new Error("blocked"), { code: "EPERM" })),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    writeFileSync(
      path.join(cwd, "quality/ratchets/security.json"),
      JSON.stringify({ mode: "warn", warnSince: "2026-10-01" }),
    );
    assert.equal(await main(["--commit", "fixture", "--date", date], cwd), 1);
    const output = JSON.parse(readFileSync(path.join(cwd, "scorecard.json"), "utf8"));
    assert.ok(output.summary.regression > 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("main returns 2 for malformed JSON and missing explicit artifacts", async () => {
  const cwd = workspace();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    writeFileSync(path.join(cwd, "broken.json"), "{");
    assert.equal(await main(["--commit", "fixture", "--coverage", "broken.json"], cwd), 2);
    assert.equal(await main(["--commit", "fixture", "--coverage", "missing.json"], cwd), 2);
    assert.match(String(error.mock.lastCall?.[0]), /--coverage file does not exist/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("main never falls back in CI or based on stderr text", async () => {
  const cwd = workspace();
  vi.spyOn(console, "error").mockImplementation(() => {});
  const spawn = vi.mocked(childProcess.spawnSync);
  try {
    vi.stubEnv("CI", "true");
    for (const code of ["EPERM", "ENOENT"]) {
      spawn.mockReturnValue(spawnResult(Object.assign(new Error("blocked"), { code })));
      assert.equal(await main(["--commit", "fixture"], cwd), 2);
    }
    vi.stubEnv("CI", undefined);
    spawn.mockReturnValue(spawnResult(undefined, "EPERM ENOENT configuration failure"));
    assert.equal(await main(["--commit", "fixture"], cwd), 2);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
