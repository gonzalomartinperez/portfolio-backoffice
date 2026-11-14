import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "vitest";
import { classify } from "../../scripts/flaky-report.ts";

type Status = "passed" | "failed" | "timedOut" | "skipped" | "interrupted";

function spec(title: string, statuses: Status[], projectName = "chromium", file = "a.spec.ts") {
  return {
    title,
    file,
    tests: [{ projectName, results: statuses.map((status, retry) => ({ status, retry })) }],
  };
}

function report(...specs: ReturnType<typeof spec>[]) {
  return { suites: [{ title: "a.spec.ts", file: "a.spec.ts", specs }] };
}

const at = "2026-01-01T00:00:00.000Z";

test("classifies stable, flaky and failing tests across reports and repeats", () => {
  const result = classify(
    [
      report(
        spec("stable", ["passed", "passed"]),
        spec("flaky", ["passed", "failed"]),
        spec("broken", ["failed", "timedOut"]),
      ),
      report(
        spec("stable", ["passed"]),
        spec("flaky", ["interrupted"]),
        spec("broken", ["failed"]),
      ),
    ],
    at,
  );
  assert.equal(result.schema, 1);
  assert.equal(result.generatedAt, at);
  assert.deepEqual(result.totals, {
    tests: 3,
    stable: 1,
    flaky: 1,
    failing: 1,
    quarantined: 0,
    skipped: 0,
  });
  assert.deepEqual(result.flaky, [{ id: "chromium › a.spec.ts › flaky", passed: 1, failed: 2 }]);
  assert.deepEqual(result.failing, [{ id: "chromium › a.spec.ts › broken", passed: 0, failed: 3 }]);
});

test("walks nested suites, builds ids per project and sorts entries", () => {
  const nested = {
    suites: [
      {
        title: "a.spec.ts",
        file: "a.spec.ts",
        suites: [
          {
            title: "group",
            suites: [{ title: "", specs: [spec("zeta", ["failed", "passed"], "webkit")] }],
          },
        ],
        specs: [spec("alpha", ["failed", "passed"], "firefox")],
      },
    ],
  };
  const result = classify([nested], at);
  assert.deepEqual(
    result.flaky.map((entry) => entry.id),
    ["firefox › a.spec.ts › alpha", "webkit › a.spec.ts › group › zeta"],
  );
});

test("ignores skipped results", () => {
  const result = classify(
    [report(spec("only skipped", ["skipped"]), spec("mixed", ["passed", "skipped"]))],
    at,
  );
  assert.deepEqual(result.totals, {
    tests: 2,
    stable: 1,
    flaky: 0,
    failing: 0,
    quarantined: 0,
    skipped: 1,
  });
});

test("rejects malformed reports", () => {
  assert.throws(() => classify([null], at));
  assert.throws(() => classify([{ suites: "no" }], at));
  assert.throws(() => classify([{ suites: [{ specs: [] }] }], at));
  assert.throws(() => classify([report(spec("x", ["exploded" as Status]))], at));
});

test("CLI writes the report and signals flaky or failing tests with exit code 1", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "flaky-report-"));
  try {
    const run = (...args: string[]) =>
      execFileSync(process.execPath, ["scripts/flaky-report.ts", ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    const stable = path.join(dir, "stable.json");
    const flaky = path.join(dir, "flaky.json");
    const out = path.join(dir, "out.json");
    writeFileSync(stable, JSON.stringify(report(spec("ok", ["passed"]))));
    writeFileSync(flaky, JSON.stringify(report(spec("bad", ["passed", "failed"]))));

    const clean = run(out, stable);
    assert.match(clean, /stable: 1/);
    const written = readFileSync(out, "utf8");
    assert.ok(written.endsWith("}\n"));
    assert.equal(JSON.parse(written).totals.flaky, 0);

    assert.throws(
      () => run(out, stable, flaky),
      (error: { status?: number; stdout?: string }) => {
        assert.equal(error.status, 1);
        assert.match(error.stdout ?? "", /- flaky: chromium › a\.spec\.ts › bad/);
        return true;
      },
    );
    assert.equal(JSON.parse(readFileSync(out, "utf8")).totals.flaky, 1);

    assert.throws(
      () => run(out, path.join(dir, "missing.json")),
      (error: { status?: number }) => error.status !== 0,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("repeat-each output (duplicate specs with one result each) is aggregated per test", () => {
  const repeated = report(
    spec("same", ["passed"]),
    spec("same", ["failed"]),
    spec("same", ["passed"]),
  );
  const result = classify([repeated], at);
  assert.deepEqual(result.flaky, [{ id: "chromium › a.spec.ts › same", passed: 2, failed: 1 }]);
});

test("a result without a status (crashed worker) counts as a failure", () => {
  const crashed = {
    suites: [
      {
        title: "a.spec.ts",
        file: "a.spec.ts",
        specs: [
          {
            title: "crash",
            file: "a.spec.ts",
            tests: [{ projectName: "chromium", results: [{ retry: 0 }] }],
          },
        ],
      },
    ],
  };
  assert.deepEqual(classify([crashed], at).failing, [
    { id: "chromium › a.spec.ts › crash", passed: 0, failed: 1 },
  ]);
});

test("quarantined titles are reported apart and never counted as flaky or failing", () => {
  const result = classify(
    [report(spec("known flaky title", ["passed", "failed"]), spec("other", ["failed"]))],
    at,
    ["known flaky"],
  );
  assert.deepEqual(result.quarantined, [
    { id: "chromium › a.spec.ts › known flaky title", passed: 1, failed: 1, kind: "flaky" },
  ]);
  assert.equal(result.flaky.length, 0);
  assert.equal(result.totals.quarantined, 1);
  assert.equal(result.failing.length, 1);
});

test("CLI fails when no test executed (everything skipped)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "flaky-report-"));
  try {
    const skipped = path.join(dir, "skipped.json");
    writeFileSync(skipped, JSON.stringify(report(spec("off", ["skipped"]))));
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          ["scripts/flaky-report.ts", path.join(dir, "o.json"), skipped],
          {
            stdio: ["ignore", "pipe", "pipe"],
          },
        ),
      (error: { status?: number }) => error.status === 2,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
