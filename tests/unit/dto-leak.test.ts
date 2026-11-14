import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { feedbackPayload } from "../fixtures/feedback.ts";
import { operationalPayload } from "../fixtures/operations.ts";
import { productPayload } from "../fixtures/product-analytics.ts";
import { hasDirective, read, sourceFiles } from "../security/source-tree.ts";

vi.mock("server-only", () => ({}));

// Approach: React serializes whatever a Server Component passes to a "use client" island. Two
// layers keep that data closed. (1) Static: every "use client" file and the props of its exported
// components are enumerated and compared with an allowlist. (2) Behavioral: the server loaders
// that build those props are run against fixture upstreams carrying a secret token, and every
// key and value of what they return is checked against an allowlist and the secret sentinels.
// Limit: this is name-based. A Server Component could still pass a secret under an allowlisted prop
// name (for example `subject` or `target`) or compose data outside these loaders; value flow
// through page-level composition is not tracked, and rendered HTML or flight output is not read.
const clientIslands: Record<string, Record<string, string[] | null>> = {
  "src/shared/accessibility/skip-link.tsx": { SkipLink: [] },
  "src/features/analytics/presentation/metrics.tsx": { ProductMetrics: ["snapshot", "locale"] },
  "src/features/analytics/presentation/report-chart.tsx": { DailyViewsChart: ["days", "locale"] },
  "src/features/analytics/presentation/report-filters.tsx": {
    ReportFilters: ["selection", "locale"],
  },
  "src/features/operations/presentation/charts.tsx": {
    SnapshotChart: ["executions", "usage", "locale"],
  },
  "src/features/operations/presentation/trace-explorer.tsx": {
    TraceExplorer: ["traces", "locale"],
  },
  "src/features/operations/presentation/preferences.tsx": { Preferences: ["locale"] },
  "src/features/auth/presentation/invite-form.tsx": { InviteForm: ["locale"] },
  // `subject` is the member email, rendered only on /access, which requireOwner guards.
  "src/features/auth/presentation/revoke-control.tsx": {
    RevokeControl: ["id", "kind", "subject", "locale"],
  },
  // `session` is the browser-side Better Auth port, injected by features/auth/entry.tsx.
  "src/features/auth/presentation/sign-in.tsx": { SignIn: ["locale", "unavailable", "session"] },
  "src/features/auth/presentation/sign-out.tsx": { SignOut: ["label", "locale", "session"] },
  "src/features/auth/presentation/link-account.tsx": { LinkAccount: ["locale", "session"] },
  "src/features/auth/entry.tsx": { SignIn: ["props"], SignOut: ["props"], LinkAccount: ["props"] },
  "src/features/auth/adapters/client.ts": { browserSession: null },
};
const forbiddenProp = /token|secret|password|cookie|credential|authorization|api.?key|email/i;

// Every runtime export of a client file (function, arrow const, default, value) with its props,
// or null for a non-function value. Type-only exports are erased and never cross the boundary.
function exportsOf(source: string): Record<string, string[] | null> {
  assert.doesNotMatch(source, /^export\s*(?:\{|\*)/m, "re-exports hide client exports");
  const result: Record<string, string[] | null> = {};
  for (const match of source.matchAll(
    /^export\s+(default\s+)?(?:async\s+)?(function|const|let|class)\s*(\w*)/gm,
  )) {
    const rest = source.slice((match.index ?? 0) + match[0].length);
    const call =
      match[2] === "function"
        ? /^\s*\(([^)]*)\)/
        : /^\s*(?::[^=]+)?=\s*(?:async\s*)?\(([^)]*)\)\s*(?::[^=]+)?=>/;
    const params = call.exec(rest)?.[1];
    const destructured = /^\s*\{([^}]*)\}/.exec(params ?? "")?.[1];
    result[match[3] || "default"] =
      params === undefined
        ? null
        : (destructured ?? params.split(":")[0] ?? "")
            .split(",")
            .map((name) => name.split("=")[0]?.trim() ?? "")
            .filter(Boolean);
  }
  return result;
}

test("every client island, every export of it and its props are allowlisted", () => {
  const found = sourceFiles().filter((file) => hasDirective(read(file), "use client"));
  assert.deepEqual(found, Object.keys(clientIslands).sort());
  for (const file of found) {
    assert.deepEqual(exportsOf(read(file)), clientIslands[file], file);
    for (const prop of Object.values(clientIslands[file] ?? {}).flatMap((props) => props ?? []))
      if (prop !== "subject") assert.doesNotMatch(prop, forbiddenProp, `${file}: ${prop}`);
  }
});

const secrets = ["fixture-read-token-9f2c", "backend-private.internal", "session-token-sentinel"];
const allowedKeys = new Set([
  ...["kind", "reason", "snapshot", "checkedAt", "observedAt", "apiCommit", "availability"],
  ...["knowledge", "state", "sourceCommit", "corpusVersion", "indexedAt", "executions", "total"],
  ...["completed", "cancelled", "failed", "firstTokenP50Ms", "firstTokenP95Ms", "usage"],
  ...["inputTokens", "outputTokens", "settledUsd", "reservedUsd", "budgetUsd", "pricingRevision"],
  ...["traces", "id", "startedAt", "outcome", "durationMs", "stages", "name"],
  ...["counts", "day", "eventName", "section", "locale", "target", "count", "up", "down"],
]);
const keysOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap(keysOf)
    : value && typeof value === "object"
      ? Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)])
      : [];

function upstream(extra: Record<string, unknown> = {}) {
  return async (target: URL | RequestInfo, init?: RequestInit) => {
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${secrets[0]}`);
    const path = String(target);
    const body = path.includes("/feedback")
      ? feedbackPayload
      : path.includes("product-analytics")
        ? productPayload
        : operationalPayload;
    return Response.json({ ...body, ...extra });
  };
}

beforeEach(() => {
  vi.stubEnv("OPERATIONS_API_ORIGIN", `http://${secrets[1]}:8000`);
  vi.stubEnv("OPERATIONS_READ_TOKEN", secrets[0] ?? "");
  vi.stubEnv("FEEDBACK_OVERVIEW_ENABLED", "true");
  vi.stubEnv("PRODUCT_ANALYTICS_ENABLED", "true");
});

test("data handed to client islands holds only allowlisted keys and no secret", async () => {
  vi.stubGlobal("fetch", upstream());
  const { loadFeedback, loadOperations } = await import("../../src/server/operations.ts");
  const { loadProductAnalytics } = await import("../../src/server/analytics.ts");
  const results = [await loadOperations(), await loadProductAnalytics(), await loadFeedback()];
  for (const result of results) assert.equal(result.kind, "available");
  const serialized = JSON.stringify(results);
  for (const secret of [...secrets, "session", "cookie"])
    assert.equal(serialized.includes(secret), false, secret);
  assert.deepEqual(
    [...new Set(keysOf(results))].filter((key) => !allowedKeys.has(key)),
    [],
  );
});

test("hostile upstream fields are rejected and failures never echo secrets", async () => {
  const sentinel = "prompt-and-answer-sentinel@example.test";
  const { loadOperations } = await import("../../src/server/operations.ts");
  const { usage, knowledge, traces } = operationalPayload;
  for (const extra of [
    { prompt: sentinel },
    { answer: sentinel },
    { email: sentinel },
    // One level deep.
    { usage: { ...usage, prompt: sentinel } },
    { knowledge: { ...knowledge, email: sentinel } },
    { traces: [{ ...traces[0], answer: sentinel }] },
  ]) {
    vi.stubGlobal("fetch", upstream(extra));
    const result = await loadOperations();
    assert.equal(result.kind, "unavailable");
    const serialized = JSON.stringify(result);
    for (const leak of [sentinel, ...secrets]) assert.equal(serialized.includes(leak), false);
  }
  vi.stubGlobal("fetch", async () => {
    throw new Error(`connect failed with Bearer ${secrets[0]} to ${secrets[1]}`);
  });
  const failed = JSON.stringify(await loadOperations());
  for (const leak of secrets) assert.equal(failed.includes(leak), false, leak);
});
