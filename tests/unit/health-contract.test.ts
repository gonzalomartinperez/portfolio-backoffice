import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test, vi } from "vitest";
import { GET as health } from "../../src/app/api/health/route.ts";
import { GET as ready } from "../../src/app/api/ready/route.ts";
import { readiness } from "../../src/server/auth/session.ts";
import { SCHEMA_VERSION } from "../../src/server/build-info.ts";

vi.mock("server-only", () => ({}));
vi.mock("../../src/server/auth/session.ts", () => ({ readiness: vi.fn() }));

test("schema version matches the latest migration ID", () => {
  const latestMigration = readdirSync(new URL("../../migrations/", import.meta.url), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".sql") && name !== "runtime-grants.sql")
    .sort()
    .at(-1);

  assert.equal(SCHEMA_VERSION, latestMigration?.slice(0, -".sql".length));
});

test.each([
  { label: "set", version: "1.2.3", revision: "abc123", expected: true },
  { label: "unset", version: undefined, revision: undefined, expected: false },
  { label: "empty", version: "", revision: "", expected: false },
])(
  "health returns build metadata when the variables are $label",
  async ({ version, revision, expected }) => {
    vi.stubEnv("APP_VERSION", version);
    vi.stubEnv("APP_REVISION", revision);

    const response = health();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), {
      status: "alive",
      application: "portfolio-assistant-backoffice",
      version: expected ? version : "unknown",
      revision: expected ? revision : "unknown",
    });
  },
);

test.each([
  { isReady: true, code: 200, status: "ready" },
  { isReady: false, code: 503, status: "unavailable" },
])(
  "readiness returns build and schema metadata on HTTP $code",
  async ({ isReady, code, status }) => {
    vi.stubEnv("APP_VERSION", "1.2.3");
    vi.stubEnv("APP_REVISION", "abc123");
    vi.mocked(readiness).mockResolvedValueOnce(isReady);

    const response = await ready();

    assert.equal(response.status, code);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), {
      status,
      version: "1.2.3",
      revision: "abc123",
      schema_version: SCHEMA_VERSION,
    });
  },
);
