import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { checkConsumer } from "../../scripts/contract-consumer.ts";
import { defaultReportSelection } from "../../src/features/analytics/domain/report.ts";
import { productReportPayload } from "../fixtures/product-report.ts";

function snapshots(): Map<string, string> {
  const files = [
    "operations.schema.json",
    "feedback.schema.json",
    "product-analytics.schema.json",
    "product-analytics-v2.schema.json",
    "operations.example.json",
  ];
  return new Map([
    ...files.map((file): [string, string] => [
      file,
      readFileSync(`contracts/assistant-api/${file}`, "utf8"),
    ]),
    ["product-analytics-v2.example.json", JSON.stringify(productReportPayload())],
  ]);
}

test("identical snapshots have matching hashes and accepted examples", () => {
  const local = snapshots();
  const report = checkConsumer(new Map(local), local);
  assert.equal(report.apiRef, "develop");
  assert.equal(report.breaking, false);
  assert.equal(report.schemas.length, 4);
  for (const row of report.schemas) {
    assert.equal(row.drift, false);
    assert.equal(row.localSha256, row.upstreamSha256);
    assert.match(row.localSha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(report.examples.length, 2);
  assert.ok(report.examples.every((row) => row.accepted));
});

test("schema text drift requests a refresh without breaking the consumer", () => {
  const local = snapshots();
  const upstream = new Map(local);
  const changed = `${local.get("operations.schema.json")}\n`;
  upstream.set("operations.schema.json", changed);
  const report = checkConsumer(upstream, local);
  assert.equal(report.breaking, false);
  assert.equal(report.schemas.filter((row) => row.drift).length, 1);
  assert.equal(
    report.schemas[0]?.upstreamSha256,
    createHash("sha256").update(changed).digest("hex"),
  );
});

test("missing upstream schema has a null hash and drift without breaking", () => {
  const local = snapshots();
  const upstream = new Map(local);
  upstream.delete("feedback.schema.json");
  const report = checkConsumer(upstream, local);
  assert.deepEqual(
    report.schemas.find((row) => row.file === "feedback.schema.json"),
    {
      file: "feedback.schema.json",
      localSha256: createHash("sha256")
        .update(readFileSync("contracts/assistant-api/feedback.schema.json", "utf8"))
        .digest("hex"),
      upstreamSha256: null,
      drift: true,
    },
  );
  assert.equal(report.breaking, false);
});

test("each available example fails the consumer when it violates its validator", () => {
  for (const file of ["operations.example.json", "product-analytics-v2.example.json"]) {
    const local = snapshots();
    const upstream = new Map(local);
    const value: unknown = JSON.parse(upstream.get(file) ?? "null");
    assert.ok(value && typeof value === "object" && !Array.isArray(value));
    upstream.set(file, JSON.stringify({ ...value, prompt: "synthetic" }));
    const report = checkConsumer(upstream, local);
    assert.equal(report.breaking, true);
    assert.equal(report.examples.find((row) => row.file === file)?.accepted, false);
    assert.ok(report.examples.find((row) => row.file === file)?.error);
  }
});

test("report selection comes from the payload's own echoed filters", () => {
  const local = snapshots();
  const upstream = new Map(local);
  upstream.set(
    "product-analytics-v2.example.json",
    JSON.stringify(
      productReportPayload({
        ...defaultReportSelection,
        period: "week",
        offset: 1,
        section: "about",
        region: "about-story",
        viewport: "mobile",
        eventLocale: "es",
      }),
    ),
  );
  assert.equal(checkConsumer(upstream, local).breaking, false);
});

test("absent examples are omitted and malformed JSON is rejected without echoing payloads", () => {
  const local = snapshots();
  const upstream = new Map(local);
  upstream.delete("product-analytics-v2.example.json");
  assert.equal(checkConsumer(upstream, local).examples.length, 1);
  upstream.set("operations.example.json", "private malformed content");
  assert.deepEqual(checkConsumer(upstream, local).examples, [
    {
      file: "operations.example.json",
      accepted: false,
      error: "Invalid example JSON",
    },
  ]);
});
