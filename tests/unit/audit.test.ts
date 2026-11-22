import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "vitest";
import { actorHash, requestIdFrom } from "../../src/features/auth/adapters/audit.ts";

const secret = "unit-test-secret-at-least-32-characters";

test("actor hash is keyed, stable, case-insensitive and hides the identity", () => {
  const hash = actorHash(secret, { email: "Owner@Example.com" });
  assert.match(hash ?? "", /^[a-f0-9]{64}$/);
  assert.equal(hash, actorHash(secret, { email: " owner@example.com " }));
  assert.notEqual(hash, actorHash(`${secret}-rotated`, { email: "owner@example.com" }));
  assert.ok(!hash?.includes("owner"));
});

test("actor hash falls back to the provider account id and needs an identity", () => {
  const fallback = actorHash(secret, { accountId: "github-42" });
  assert.match(fallback ?? "", /^[a-f0-9]{64}$/);
  assert.notEqual(fallback, actorHash(secret, { email: "github-42" }));
  assert.equal(
    actorHash(secret, { email: "owner@example.com", accountId: "github-42" }),
    actorHash(secret, { email: "owner@example.com" }),
  );
  assert.equal(actorHash(secret, {}), null);
  assert.equal(actorHash(secret, { email: "  " }), null);
});

test("actor hash uses a domain-separated sub-key, not the raw secret", () => {
  const key = createHmac("sha256", secret).update("backoffice-audit-actor-v1").digest();
  const expected = createHmac("sha256", key).update("email:owner@example.com").digest("hex");
  assert.equal(actorHash(secret, { email: "owner@example.com" }), expected);
  const direct = createHmac("sha256", secret).update("email:owner@example.com").digest("hex");
  assert.notEqual(expected, direct);
});

test("request id is always server generated and stable per request", () => {
  for (const inbound of ["req-12345678", "a".repeat(64), "short"]) {
    const headers = new Headers({ "x-request-id": inbound });
    const id = requestIdFrom(headers);
    assert.notEqual(id, inbound);
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.equal(requestIdFrom(headers), id);
  }
  assert.notEqual(requestIdFrom(new Headers()), requestIdFrom(new Headers()));
  assert.match(requestIdFrom(undefined), /^[A-Za-z0-9-]{8,64}$/);
});
