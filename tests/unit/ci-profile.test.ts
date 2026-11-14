import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { load } from "js-yaml";
import { field, list, record, text } from "../../scripts/json.ts";
import { postgresImage } from "../../scripts/postgres-image.ts";

const profileMap = () => record(JSON.parse(readFileSync(".github/ci-profile.json", "utf8")));
const workflow = () => record(load(readFileSync(".github/workflows/ci.yml", "utf8")));
const ownJobs = ["static", "database", "build", "container", "browser"];
const sharedJobs = ["docs", "security"];

// Same glob semantics as the shared classify workflow (engineering-standards classify.yml).
function globToRegex(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; ) {
    if (pattern.startsWith("**/", i)) {
      out += "(?:.*/)?";
      i += 3;
    } else if (pattern.startsWith("**", i)) {
      out += ".*";
      i += 2;
    } else if (pattern[i] === "*") {
      out += "[^/]*";
      i += 1;
    } else if (pattern[i] === "?") {
      out += "[^/]";
      i += 1;
    } else {
      out += (pattern[i] ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${out}$`);
}

function profilesFor(path: string): string[] {
  const profiles = record(profileMap().profiles);
  return Object.entries(profiles)
    .filter(([, spec]) =>
      list(field(spec, "paths") ?? []).some((glob) => globToRegex(text(glob)).test(path)),
    )
    .map(([name]) => name);
}

function jobsFor(selected: string[]): string[] {
  const map = profileMap();
  const jobs = list(map.base).map(text);
  for (const name of selected)
    for (const job of list(field(map, "profiles", name, "adds") ?? []))
      if (job !== "all-profiles") jobs.push(text(job));
  return [...new Set(jobs)];
}

test("every tracked file belongs to a CI profile (fail closed otherwise)", () => {
  const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  assert.ok(tracked.length > 100);
  const orphans = tracked.filter((path) => profilesFor(path).length === 0);
  assert.deepEqual(orphans, [], "add these paths to .github/ci-profile.json");
});

test("profiles select the expected jobs", () => {
  assert.deepEqual(jobsFor(profilesFor("README.md")), ["docs", "security", "static"]);
  assert.deepEqual(jobsFor(profilesFor("src/app/page.tsx")), [
    "docs",
    "security",
    "static",
    "database",
    "build",
    "container",
    "browser",
  ]);
  for (const path of [".github/workflows/ci.yml", "contracts/openapi.json", "migrations/x.sql"])
    assert.ok(jobsFor(profilesFor(path)).includes("browser"), path);
  assert.deepEqual(profilesFor(".agents/skills/x/evals/evals.json"), ["harness"]);
  for (const name of ["deps-weekly", "release", "hotfix"])
    assert.deepEqual(list(field(profileMap(), "profiles", name, "adds")), ["all-profiles"]);
  assert.equal(profileMap().required, "ci-gate");
});

test("job names in the profile map and ci.yml agree and ci-gate needs every job", () => {
  const jobs = record(workflow().jobs);
  const map = profileMap();
  const named = new Set(jobsFor(Object.keys(record(map.profiles))));
  assert.deepEqual([...named].sort(), [...ownJobs, ...sharedJobs].sort());
  assert.deepEqual(
    Object.keys(jobs).sort(),
    ["classify", "ci-gate", "required-checks", ...ownJobs, ...sharedJobs].sort(),
  );
  for (const id of [...ownJobs, ...sharedJobs]) {
    assert.equal(
      field(jobs, id, "if"),
      `contains(fromJSON(needs.classify.outputs.jobs), '${id}')`,
      id,
    );
    assert.ok([field(jobs, id, "needs")].flat().includes("classify"), id);
  }
  const gate = record(jobs["ci-gate"]);
  assert.equal(gate.name, "ci-gate");
  assert.equal(gate.if, "always()");
  // Transitional alias for the branch-protection context "Required checks" (PBO-M1-11).
  const alias = record(jobs["required-checks"]);
  assert.equal(alias.name, "Required checks");
  assert.equal(alias.if, "always()");
  assert.deepEqual(alias.needs, ["ci-gate"]);
  assert.match(text(field(list(alias.steps)[0], "run")), /^test "\$GATE_RESULT" = success$/);
  assert.deepEqual(
    list(gate.needs).map(text).sort(),
    Object.keys(jobs)
      .filter((id) => id !== "ci-gate" && id !== "required-checks")
      .sort(),
  );
  assert.deepEqual(gate.permissions, {});
  const steps = list(gate.steps);
  const action = steps.find((step) =>
    text(field(step, "uses") ?? "").includes("/actions/ci-gate@"),
  );
  assert.equal(field(action, "with", "needs"), `$${"{{"} toJSON(needs) }}`);
  assert.equal(field(action, "with", "expected"), `$${"{{"} needs.classify.outputs.jobs }}`);
});

test("workflows are least-privilege, SHA-pinned and never run untrusted code with privileges", () => {
  for (const file of readdirSync(".github/workflows").filter((name) => /\.ya?ml$/.test(name))) {
    const source = readFileSync(`.github/workflows/${file}`, "utf8");
    const parsed = record(load(source));
    assert.doesNotMatch(source, /pull_request_target|workflow_run/, file);
    assert.deepEqual(parsed.permissions, {}, `${file}: top-level permissions must be {}`);
    for (const [id, job] of Object.entries(record(parsed.jobs))) {
      assert.notEqual(
        field(job, "permissions"),
        undefined,
        `${file}:${id} needs explicit permissions`,
      );
      const uses = field(job, "uses");
      if (typeof uses === "string" && !uses.startsWith("./"))
        assert.match(
          source,
          new RegExp(`uses: ${uses.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} # v\\d`),
          `${file}:${id} must pin a reusable workflow by SHA with a version comment`,
        );
      for (const step of list(field(job, "steps") ?? [])) {
        const action = field(step, "uses");
        if (typeof action === "string")
          assert.match(action, /^[\w./-]+@[a-f0-9]{40}$/, `${file}:${id} ${action}`);
        if (text(action ?? "").startsWith("actions/checkout@")) {
          assert.equal(field(step, "with", "persist-credentials"), false, `${file}:${id}`);
          assert.equal(field(step, "with", "repository"), undefined, `${file}:${id}`);
        }
        assert.doesNotMatch(JSON.stringify(step), /secrets\./, `${file}:${id}`);
        assert.equal(field(step, "continue-on-error"), undefined, `${file}:${id}`);
      }
    }
  }
  for (const [key, value] of [
    ["AI_PROVIDER", "fixture"],
    ["EMBEDDINGS_PROVIDER", "fixture"],
    ["ALLOW_PAID_AI", "false"],
  ])
    assert.equal(field(workflow(), "env", text(key)), value);
});

test("runtime jobs use the digest-pinned PostgreSQL service and no sibling build", () => {
  for (const id of ["container", "browser"]) {
    const job = record(field(workflow(), "jobs", id));
    const services = record(job.services);
    const postgres = record(services.postgres);
    assert.deepEqual(Object.keys(services), ["postgres"]);
    assert.equal(postgres.image, postgresImage);
    assert.deepEqual(postgres.env, {
      POSTGRES_USER: "backoffice_fixture",
      POSTGRES_PASSWORD: "public-fixture-only",
      POSTGRES_DB: "backoffice_test",
    });
    assert.match(
      text(postgres.options),
      /--health-cmd "pg_isready -U backoffice_fixture -d backoffice_test"/,
    );
    assert.deepEqual(postgres.ports, id === "browser" ? ["5432"] : undefined);
    assert.equal(field(job, "env", "CI_POSTGRES_HOST"), "postgres");
    const steps = list(job.steps).map(record);
    const expose = steps.findIndex(
      (step) => step.name === "Expose this job's PostgreSQL service network",
    );
    const migrate = steps.findIndex(
      (step) => step.name === "Migrate the isolated authentication database",
    );
    assert.ok(expose >= 0 && migrate > expose, id);
    assert.equal(
      field(steps[expose], "env", "SERVICE_NETWORK"),
      `$${"{{"} job.services.postgres.network }}`,
    );
    const runs = steps.map((step) => String(step.run ?? "")).join("\n");
    assert.doesNotMatch(runs, /api-compatibility|ci-postgres/);
    assert.match(runs, /--network "\$CI_POSTGRES_NETWORK"/);
  }
  assert.equal(field(workflow(), "jobs", "database", "services"), undefined);
});

test("the container job keeps the checksum-pinned scanner and the HIGH/CRITICAL gate", () => {
  const steps = list(field(workflow(), "jobs", "container", "steps"));
  const installer = text(
    field(
      steps.find((step) => field(step, "name") === "Verify pinned image scanner"),
      "run",
    ),
  );
  assert.match(installer, /trivy_0\.75\.0_Linux-64bit\.tar\.gz/);
  assert.match(
    installer,
    /c6e65abddb348e25f10549df887045629cf28cc72453cd1c63acb717316b3f3f {2}\/tmp\/image-scanner\/trivy\.tar\.gz' \| sha256sum --check/,
  );
  const runs = steps.map((step) => text(field(step, "run") ?? "")).join("\n");
  assert.match(runs, /--severity HIGH,CRITICAL/);
  assert.match(runs, /node scripts\/verify-container\.ts measure/);
  for (const env of [field(workflow(), "env"), field(workflow(), "jobs", "container", "env")])
    assert.ok(!Object.keys(record(env ?? {})).some((key) => key.startsWith("TRIVY_")));
});

test("the image is built once and the runtime jobs load that exact tarball", () => {
  const jobs = record(workflow().jobs);
  const build = list(field(jobs, "build", "steps")).map(record);
  const builder = build.find((step) =>
    text(step.uses ?? "").startsWith("docker/build-push-action@"),
  );
  assert.match(text(field(builder, "with", "outputs")), /^type=docker,dest=/);
  assert.equal(field(builder, "with", "push"), false);
  const upload = build.find((step) => text(step.uses ?? "").startsWith("actions/upload-artifact@"));
  assert.equal(field(upload, "with", "name"), "backoffice-image");
  assert.equal(field(upload, "with", "retention-days"), 1);
  assert.equal(field(upload, "with", "overwrite"), true);
  assert.equal(
    field(workflow(), "on", "workflow_call", "outputs", "image-sha256", "value"),
    `$${"{{"} jobs.build.outputs.image-sha256 }}`,
  );
  const runs = build.map((step) => text(step.run ?? "")).join("\n");
  assert.match(runs, /sha256sum/);
  assert.match(runs, /--scanners secret/);
  assert.match(runs, /docker export/);
  assert.ok(
    build.findIndex((step) => step === upload) >
      build.findIndex((step) => text(step.run ?? "").includes("--scanners secret")),
    "scan before upload",
  );
  for (const id of ["container", "browser"]) {
    assert.deepEqual(field(jobs, id, "needs"), ["classify", "build"]);
    const steps = list(field(jobs, id, "steps")).map(record);
    assert.ok(
      !steps.some((step) => text(step.uses ?? "").startsWith("docker/build-push-action@")),
      id,
    );
    const download = steps.find((step) =>
      text(step.uses ?? "").startsWith("actions/download-artifact@"),
    );
    assert.equal(field(download, "with", "name"), "backoffice-image", id);
    const load = steps.find((step) => text(step.run ?? "").includes("docker load"));
    assert.match(text(field(load, "run")), /sha256sum --check/);
    assert.equal(
      field(load, "env", "IMAGE_SHA256"),
      `$${"{{"} needs.build.outputs.image-sha256 }}`,
    );
    assert.equal(field(load, "env", "IMAGE_ID"), `$${"{{"} needs.build.outputs.image-id }}`);
    assert.match(text(field(load, "run")), /docker image inspect portfolio-backoffice:rc --format/);
  }
});
