import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { record, text } from "./json.ts";

export function releaseCompatibility(commit: string, image: string, operations: unknown) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Invalid source revision");
  if (!/^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(image))
    throw new Error("A published immutable GHCR image digest is required");
  const operationalSource = record(operations);
  const operationalCommit = text(operationalSource.api_commit);
  const operationalHash = text(operationalSource.operations_schema_json_sha256);
  if (!/^[a-f0-9]{40}$/.test(operationalCommit) || !/^[a-f0-9]{64}$/.test(operationalHash))
    throw new Error("Invalid operational contract provenance");
  return {
    schema_version: 3,
    backoffice_commit: commit,
    operational_api_commit: operationalCommit,
    operational_api_contract_sha256: operationalHash,
    backoffice_image: image,
    production_deployment: "disabled",
    operational_api_compatibility:
      "pinned schema/example mapping verified; deployed OAuth/API pairing unverified",
    verification_mode: "isolated database and operational fixtures",
    portfolio_compatibility: "Requires portfolio release evidence from its owner",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [digestPath, outputPath, commit] = process.argv.slice(2);
  if (!digestPath || !outputPath || !commit)
    throw new Error("Usage: node scripts/release-compatibility.ts DIGEST OUTPUT SHA");
  const release = releaseCompatibility(
    commit,
    readFileSync(digestPath, "utf8").trim(),
    JSON.parse(
      readFileSync(
        new URL("../contracts/assistant-api/operations.source.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  writeFileSync(outputPath, `${JSON.stringify(release, null, 2)}\n`);
}
