import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fixtureSession } from "../../scripts/auth-fixture-session.ts";

test("destructive integration owns its database and never reads a URL from the environment", () => {
  const source = readFileSync("tests/integration/auth.test.ts", "utf8");
  assert.match(source, /await startIamFixture\(\)/);
  assert.doesNotMatch(source, /process\.env\.[A-Z_]*DATABASE_URL/);
  assert.doesNotMatch(source, /process\.env\.PROJECT_FIXTURE/);
});

test("fixture session provisioning refuses a remote database", async () => {
  await assert.rejects(
    fixtureSession("owner", {
      origin: "http://localhost:3107",
      databaseUrl: "postgres://fixture:fixture@shared.invalid/backoffice_test",
      secret: "fixture-only-secret-at-least-32-characters",
      ownerEmail: "owner@example.test",
      google: { clientId: "fixture", clientSecret: "fixture" },
      github: { clientId: "fixture", clientSecret: "fixture" },
    }),
    /loopback origin\/database/,
  );
});
