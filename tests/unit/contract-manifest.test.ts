import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "vitest";
import { record } from "../../scripts/json.ts";

const contracts = new URL("../../contracts/", import.meta.url);
const snapshot = new URL("assistant-api/", contracts);

test("contracts contains only the assistant API snapshot", () => {
  const entries = readdirSync(contracts, { withFileTypes: true });
  assert.deepEqual(
    entries.map((entry) => [entry.name, entry.isDirectory()]),
    [["assistant-api", true]],
  );
});

test("the manifest pins the exact bytes and API commit of every snapshot artifact", () => {
  const manifest = record(JSON.parse(readFileSync(new URL("manifest.json", snapshot), "utf8")));
  const artifacts = record(manifest.artifacts);
  const files = readdirSync(snapshot)
    .filter((file) => file !== "manifest.json")
    .sort();
  assert.equal(manifest.contract_version, "1");
  assert.deepEqual(Object.keys(artifacts), files);

  for (const file of files) {
    const bytes = readFileSync(new URL(encodeURIComponent(file), snapshot));
    const family = file.split(".")[0];
    const source = record(
      JSON.parse(readFileSync(new URL(`${family}.source.json`, snapshot), "utf8")),
    );
    assert.deepEqual(
      artifacts[file],
      { revision: source.api_commit, sha256: createHash("sha256").update(bytes).digest("hex") },
      file,
    );
  }
});
