import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { record, text } from "./json.ts";

const snapshot = new URL("../contracts/assistant-api/", import.meta.url);

function readArtifact(file: string): Buffer {
  return readFileSync(new URL(encodeURIComponent(file), snapshot));
}

function readJson(file: string): unknown {
  return JSON.parse(readArtifact(file).toString("utf8"));
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const manifest = record(readJson("manifest.json"));
if (manifest.contract_version !== "1") throw new Error("Unsupported contract manifest version");
const files = new Set(
  readdirSync(snapshot, { withFileTypes: true })
    .filter((entry) => entry.name !== "manifest.json")
    .map((entry) => {
      if (!entry.isFile()) throw new Error(`Unexpected contract directory entry: ${entry.name}`);
      return entry.name;
    }),
);
for (const [file, value] of Object.entries(record(manifest.artifacts))) {
  if (!files.delete(file)) throw new Error(`Manifest lists a missing snapshot file: ${file}`);
  const { revision, sha256: expectedHash } = record(value);
  if (sha256(readArtifact(file)) !== expectedHash)
    throw new Error(`Snapshot SHA-256 mismatch: ${file}`);
  const family = file.slice(0, file.indexOf("."));
  const source = record(readJson(`${family}.source.json`));
  if (!/^[a-f0-9]{40}$/.test(text(revision)) || revision !== source.api_commit)
    throw new Error(`Snapshot API commit mismatch: ${file}`);
}
if (files.size > 0)
  throw new Error(`Snapshot files missing from manifest: ${[...files].join(", ")}`);

const operations = record(readJson("operations.source.json"));
for (const file of ["operations.schema.json", "operations.example.json"]) {
  const expected = text(operations[`${file.replaceAll(".", "_")}_sha256`]);
  const actual = sha256(readArtifact(file));
  if (actual !== expected)
    throw new Error(`${file} differs from operations API ${text(operations.api_commit)}`);
}
console.log(`Private operations contract matches API ${text(operations.api_commit)}`);

const product = record(readJson("product-analytics.source.json"));
const productHash = sha256(readArtifact("product-analytics.schema.json"));
if (productHash !== text(product.schema_sha256))
  throw new Error("Product schema differs from pinned API");
const copied = record(readJson("product-analytics.schema.json"));
const { $defs, ...root } = copied;
const expectedWrapper = JSON.parse(
  JSON.stringify({
    openapi: "3.1.0",
    info: { title: "Private product analytics", version: "1" },
    paths: {},
    components: { schemas: { ...record($defs), ProductSnapshot: root } },
  }).replaceAll("#/$defs/", "#/components/schemas/"),
);
if (JSON.stringify(readJson("product-analytics.openapi.json")) !== JSON.stringify(expectedWrapper))
  throw new Error("Product OpenAPI wrapper drift");
console.log(`Product contract matches API ${text(product.api_commit)}`);

const detailedProduct = record(readJson("product-analytics-v2.source.json"));
const detailedBytes = readArtifact("product-analytics-v2.schema.json");
if (
  !/^([a-f0-9]{40})$/.test(text(detailedProduct.api_commit)) ||
  detailedProduct.endpoint !== "/internal/ops/v2/product-analytics" ||
  sha256(detailedBytes) !== text(detailedProduct.schema_sha256)
)
  throw new Error("Detailed product schema differs from pinned API");
const { $defs: detailedDefinitions, ...detailedRoot } = record(
  JSON.parse(detailedBytes.toString()),
);
const detailedWrapper = JSON.parse(
  JSON.stringify({
    openapi: "3.1.0",
    info: { title: "Private aggregate analytics", version: "2" },
    paths: {},
    components: {
      schemas: {
        ...record(detailedDefinitions),
        ProductReportSnapshot: detailedRoot,
      },
    },
  }).replaceAll("#/$defs/", "#/components/schemas/"),
);
if (
  JSON.stringify(readJson("product-analytics-v2.openapi.json")) !== JSON.stringify(detailedWrapper)
)
  throw new Error("Detailed product OpenAPI wrapper drift");
console.log(`Detailed product contract matches API ${text(detailedProduct.api_commit)}`);

const feedback = record(readJson("feedback.source.json"));
const feedbackBytes = readArtifact("feedback.schema.json");
if (sha256(feedbackBytes) !== text(feedback.schema_sha256))
  throw new Error("Feedback schema differs from pinned API");
const feedbackWrapper = {
  openapi: "3.1.0",
  info: { title: "Private feedback summary", version: "1" },
  paths: {},
  components: {
    schemas: { FeedbackView: JSON.parse(feedbackBytes.toString()) },
  },
};
if (JSON.stringify(readJson("feedback.openapi.json")) !== JSON.stringify(feedbackWrapper))
  throw new Error("Feedback OpenAPI wrapper drift");
console.log(`Feedback contract matches API ${text(feedback.api_commit)}`);
