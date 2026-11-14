import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "vitest";
import { field, list, record, text } from "../../scripts/json.ts";

const root = path.resolve(import.meta.dirname, "../..");
const quarantine = record(
  JSON.parse(readFileSync(path.join(root, "tests/quarantine.json"), "utf8")) as unknown,
);
const entries = list(quarantine.tests);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const issuePattern =
  /^https:\/\/github\.com\/gonzalomartinperez\/portfolio-backoffice\/issues\/[1-9]\d*$/;

function day(value: string): number {
  assert.match(value, datePattern);
  const time = Date.parse(`${value}T00:00:00Z`);
  assert.ok(Number.isFinite(time), `Invalid date ${value}`);
  assert.equal(new Date(time).toISOString().slice(0, 10), value);
  return time;
}

function browserTestTitles(): string[] {
  const dir = path.join(root, "tests/browser");
  const source = readdirSync(dir)
    .filter((name) => name.endsWith(".spec.ts"))
    .map((name) => readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
  return [...source.matchAll(/\btest\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g)].map(
    (match) => match[2] ?? "",
  );
}

test("quarantine stays within min(2 % of browser tests, 5)", () => {
  assert.equal(quarantine.cap, 5);
  // At least one slot, so a flaky test can always be quarantined the same day (testing.md 6).
  const twoPercent = Math.max(1, Math.floor(browserTestTitles().length * 0.02));
  assert.ok(entries.length <= Math.min(twoPercent, 5), "quarantine cap exceeded");
});

test("every quarantine entry is well formed", () => {
  for (const entry of entries) {
    assert.deepEqual(Object.keys(record(entry)).sort(), [
      "fixBy",
      "issue",
      "quarantinedOn",
      "title",
    ]);
    assert.ok(text(field(entry, "title")).length > 0);
    assert.match(text(field(entry, "issue")), issuePattern);
    const start = day(text(field(entry, "quarantinedOn")));
    const end = day(text(field(entry, "fixBy")));
    assert.ok(end >= start && end - start <= 7 * 24 * 60 * 60 * 1000);
    // An expired entry fails the suite: fix or delete the test instead of skipping it forever.
    assert.ok(end >= day(new Date().toISOString().slice(0, 10)), "quarantine fixBy has passed");
  }
});

test("quarantined titles are unique and exist in browser specs", () => {
  const titles = entries.map((entry) => text(field(entry, "title")));
  assert.equal(new Set(titles).size, titles.length);
  const testTitles = browserTestTitles();
  for (const title of titles)
    assert.ok(
      testTitles.filter((candidate) => candidate.includes(title)).length === 1,
      `Quarantine title "${title}" must match exactly one browser test title`,
    );
});
