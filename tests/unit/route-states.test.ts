import assert from "node:assert/strict";
import { test } from "vitest";
import { routeStateCopy } from "../../src/shared/ui/route-states.tsx";

test("route-state copy has the same keys and no empty strings in both languages", () => {
  assert.deepEqual(Object.keys(routeStateCopy.es).sort(), Object.keys(routeStateCopy.en).sort());
  for (const copy of [routeStateCopy.en, routeStateCopy.es])
    for (const [key, value] of Object.entries(copy)) assert.ok(value.trim(), key);
});
