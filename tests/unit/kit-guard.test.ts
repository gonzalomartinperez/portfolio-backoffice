import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import { kitEnabled } from "../../src/server/kit.ts";

test("the kit is off unless the fixture flag or next dev enables it", () => {
  assert.equal(kitEnabled({}), false);
  assert.equal(kitEnabled({ NODE_ENV: "production" }), false);
  assert.equal(kitEnabled({ BACKOFFICE_KIT: "true", NODE_ENV: "production" }), false);
  assert.equal(kitEnabled({ BACKOFFICE_KIT: "enabled", NODE_ENV: "production" }), true);
  assert.equal(kitEnabled({ NODE_ENV: "development" }), true);
});

test("the page decides at request time and answers not found when disabled", () => {
  const page = readFileSync("src/app/%5F_kit/page.tsx", "utf8");
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /if \(!kitEnabled\(\)\) notFound\(\)/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});

test("the runtime image and the deployment contract never set the kit flag", () => {
  const files = execFileSync("git", ["ls-files", "-z", "infra", "docs/deployment-contract.md"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  assert.ok(files.some((file) => file.startsWith("infra/docker/")));
  for (const file of files) assert.doesNotMatch(readFileSync(file, "utf8"), /BACKOFFICE_KIT/, file);
  assert.match(readFileSync("scripts/test-server.ts", "utf8"), /BACKOFFICE_KIT: "enabled"/);
});
