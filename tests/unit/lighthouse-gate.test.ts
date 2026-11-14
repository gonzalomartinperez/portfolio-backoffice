import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import {
  compare,
  LIGHTHOUSE_METRICS,
  type Metrics,
  median,
  medianMetrics,
  readSummary,
  summarize,
  tighten,
} from "../../scripts/lighthouse-gate.ts";

const metrics = (overrides: Partial<Metrics> = {}): Metrics => ({
  performance: 60,
  accessibility: 100,
  bestPractices: 96,
  tbt: 3000,
  lcp: 4000,
  cls: 0,
  scriptBytes: 260_000,
  ...overrides,
});

const lhr = (overrides: Record<string, unknown> = {}) => ({
  finalDisplayedUrl: "http://localhost:3107/",
  categories: {
    performance: { score: 0.6 },
    accessibility: { score: 1 },
    "best-practices": { score: 0.96 },
  },
  audits: {
    "total-blocking-time": { numericValue: 2999.6 },
    "largest-contentful-paint": { numericValue: 4000.2 },
    "cumulative-layout-shift": { numericValue: 0.01234 },
    "network-requests": {
      details: {
        items: [
          { resourceType: "Script", transferSize: 1000 },
          { resourceType: "Script", transferSize: 500 },
          { resourceType: "Stylesheet", transferSize: 9000 },
        ],
      },
    },
  },
  ...overrides,
});

test("median handles odd and even sample counts", () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.throws(() => median([]));
});

test("summarize reads scores, timings and script transfer bytes only", () => {
  assert.deepEqual(summarize(lhr()), {
    performance: 60,
    accessibility: 100,
    bestPractices: 96,
    tbt: 3000,
    lcp: 4000,
    cls: 0.012,
    scriptBytes: 1500,
  });
});

test("summarize fails closed on a runtime error, a missing score or no requests", () => {
  assert.throws(() => summarize(lhr({ runtimeError: { code: "NO_FCP" } })), /NO_FCP/);
  assert.throws(() => summarize(lhr({ categories: {} })), /performance/);
  const audits = lhr().audits;
  assert.throws(
    () => summarize(lhr({ audits: { ...audits, "network-requests": { details: { items: [] } } } })),
    /no network requests/,
  );
});

test("medianMetrics takes the median of each metric independently", () => {
  const result = medianMetrics([
    metrics({ performance: 50, tbt: 100 }),
    metrics({ performance: 70, tbt: 900 }),
    metrics({ performance: 60, tbt: 300 }),
  ]);
  assert.equal(result.performance, 60);
  assert.equal(result.tbt, 300);
});

test("compare allows noise, fails regressions and reports improvements", () => {
  const baseline = { "/": metrics() };
  const keys = [...LIGHTHOUSE_METRICS, "scriptBytes"] as const;
  assert.deepEqual(
    compare({ "/": metrics({ performance: 55, tbt: 4500 }) }, baseline, keys).failures,
    [],
  );
  const worse = compare(
    { "/": metrics({ performance: 54, accessibility: 99, tbt: 4600, scriptBytes: 263_200 }) },
    baseline,
    keys,
  ).failures;
  assert.equal(worse.length, 4);
  assert.match(worse.join("\n"), /performance: 54/);
  assert.match(worse.join("\n"), /scriptBytes: 263200/);
  const better = compare(
    { "/": metrics({ performance: 70, scriptBytes: 200_000 }) },
    baseline,
    keys,
  );
  assert.deepEqual(better.failures, []);
  assert.equal(better.improvements.length, 2);
});

test("a ratchet route that was not measured fails", () => {
  assert.deepEqual(compare({}, { "/sign-in": metrics() }, ["performance"]).failures, [
    "/sign-in: in the ratchet but not measured",
  ]);
});

test("tighten only moves values in the favourable direction and adds new routes", () => {
  const next = tighten(
    { "/": { performance: 60, tbt: 3000 } },
    { "/": metrics({ performance: 55, tbt: 2000 }), "/privacy": metrics() },
    ["performance", "tbt"],
  );
  assert.deepEqual(next["/"], { performance: 60, tbt: 2000 });
  assert.deepEqual(next["/privacy"], { performance: 60, tbt: 3000 });
});

test("readSummary rejects a non-numeric metric", () => {
  const directory = mkdtempSync(join(tmpdir(), "lighthouse-gate-"));
  const good = join(directory, "good.json");
  writeFileSync(good, JSON.stringify({ routes: { "/": metrics() } }));
  assert.deepEqual(readSummary(good), { "/": metrics() });
  const bad = join(directory, "bad.json");
  writeFileSync(bad, JSON.stringify({ routes: { "/": { ...metrics(), tbt: "slow" } } }));
  assert.throws(() => readSummary(bad), /tbt is not a number/);
});
