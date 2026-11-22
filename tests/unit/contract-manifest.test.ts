import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

// The check runs at import time, so each mutation runs it on a temporary copy of the repository
// layout it reads (scripts/ and contracts/).
test("the contract check fails closed on changed, unlisted or missing snapshot files", () => {
  const mutations: Record<string, (directory: string) => void> = {
    changed: (directory) => appendFileSync(join(directory, "feedback.types.d.ts"), " "),
    unlisted: (directory) => writeFileSync(join(directory, "extra.json"), "{}"),
    missing: (directory) => rmSync(join(directory, "feedback.types.d.ts")),
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    const root = mkdtempSync(join(tmpdir(), "contract-check-"));
    try {
      for (const file of ["check-contract.ts", "json.ts"])
        cpSync(new URL(`../../scripts/${file}`, import.meta.url), join(root, "scripts", file));
      cpSync(contracts, join(root, "contracts"), { recursive: true });
      mutate(join(root, "contracts", "assistant-api"));
      assert.throws(
        () =>
          execFileSync(process.execPath, [join(root, "scripts", "check-contract.ts")], {
            stdio: "pipe",
          }),
        name,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
