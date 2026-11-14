import assert from "node:assert/strict";
import test from "node:test";
import { releaseCompatibility } from "../../scripts/release-compatibility.ts";

const commit = "a".repeat(40);
const source = { api_commit: "b".repeat(40), openapi_sha256: "c".repeat(64) };
const operations = {
  api_commit: "e".repeat(40),
  operations_schema_json_sha256: "f".repeat(64),
};
const image = `ghcr.io/owner/portfolio-backoffice@sha256:${"d".repeat(64)}`;

test("records immutable image and both contract pins without claiming deployed compatibility", () => {
  const release = releaseCompatibility(commit, image, source, operations);
  assert.equal(release.backoffice_commit, commit);
  assert.equal(release.historical_public_api_commit, source.api_commit);
  assert.equal(release.operational_api_commit, operations.api_commit);
  assert.equal(release.operational_api_contract_sha256, operations.operations_schema_json_sha256);
  assert.equal(release.schema_version, 2);
  assert.equal(release.backoffice_image, image);
  assert.equal(release.production_deployment, "disabled");
});

test("rejects mutable tags and unverifiable revisions or provenance", () => {
  for (const invalid of [image.replace("@sha256:", ":"), "ghcr.io/owner/web:latest", ""])
    assert.throws(() => releaseCompatibility(commit, invalid, source, operations));
  assert.throws(() => releaseCompatibility("develop", image, source, operations));
  for (const invalid of [
    null,
    {},
    { ...source, api_commit: "main" },
    { ...source, openapi_sha256: "missing" },
  ])
    assert.throws(() => releaseCompatibility(commit, image, invalid, operations));
  assert.throws(() => releaseCompatibility(commit, image, source, {}));
  assert.throws(() =>
    releaseCompatibility(commit, image, source, {
      ...operations,
      api_commit: "develop",
    }),
  );
});

test("release verifies through ci.yml, attests the tested tarball and gates publication", async () => {
  const { readFileSync } = await import("node:fs");
  const { load } = await import("js-yaml");
  const { field, list, record, text } = await import("../../scripts/json.ts");
  const release = record(load(readFileSync(".github/workflows/release.yml", "utf8")));
  assert.deepEqual(Object.keys(record(release.on)), ["workflow_dispatch"]);
  assert.equal(
    field(release, "on", "workflow_dispatch", "inputs", "publication_authorized", "default"),
    false,
  );
  assert.deepEqual(release.permissions, {});
  assert.deepEqual(Object.keys(record(release.jobs)), ["verify", "attest", "publish"]);
  assert.equal(field(release, "jobs", "verify", "uses"), "./.github/workflows/ci.yml");
  const attest = record(field(release, "jobs", "attest"));
  assert.equal(attest.needs, "verify");
  assert.deepEqual(attest.permissions, {
    contents: "read",
    "id-token": "write",
    attestations: "write",
  });
  const steps = list(attest.steps).map(record);
  const check = steps.findIndex((step) => text(step.run ?? "").includes("sha256sum --check"));
  const provenance = steps.findIndex((step) =>
    text(step.uses ?? "").startsWith("actions/attest-build-provenance@"),
  );
  const sbom = steps.findIndex((step) => text(step.uses ?? "").startsWith("actions/attest-sbom@"));
  assert.ok(check >= 0 && provenance > check && sbom > check, "verify the digest before attesting");
  assert.equal(
    field(steps[check], "env", "IMAGE_SHA256"),
    `$${"{{"} needs.verify.outputs.image-sha256 }}`,
  );
  for (const index of [provenance, sbom])
    assert.match(text(field(steps[index], "with", "subject-path")), /backoffice-image\.tar$/);
  const publish = record(field(release, "jobs", "publish"));
  assert.match(text(publish.if), /inputs\.publication_authorized/);
  assert.match(text(publish.if), /refs\/heads\/main/);
  assert.equal(publish.environment, "production");
  // No registry permission until MV (DR-13): activation adds packages: write in a reviewed PR.
  assert.deepEqual(publish.permissions, { contents: "read" });
  assert.match(text(publish.if), /vars\.REGISTRY_PUBLICATION_ENABLED == 'true'/);
  assert.match(JSON.stringify(publish.steps), /exit 1/);
  assert.match(text(field(steps[sbom], "with", "sbom-path")), /backoffice-sbom\.cdx\.json$/);
});
