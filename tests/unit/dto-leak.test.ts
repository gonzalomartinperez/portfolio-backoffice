import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { defaultReportSelection } from "../../src/features/analytics/domain/report.ts";
import { feedbackPayload } from "../fixtures/feedback.ts";
import { operationalPayload } from "../fixtures/operations.ts";
import { productPayload } from "../fixtures/product-analytics.ts";
import { productReportPayload } from "../fixtures/product-report.ts";
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
  // Route error boundaries (PBO-M3-5): only Next's retry callback crosses; the error is not rendered.
  "src/app/error.tsx": { RouteError: ["retry"] },
  "src/app/global-error.tsx": { GlobalError: ["retry"] },
  "src/features/analytics/presentation/metrics.tsx": { ProductMetrics: ["snapshot", "locale"] },
  "src/features/analytics/presentation/report-chart.tsx": { DailyViewsChart: ["days", "locale"] },
  "src/features/analytics/presentation/report-filters.tsx": {
    ReportFilters: ["selection", "locale"],
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
  // Calendar report model and the `/analytics` view wrapper.
  ...["report", "result", "selection", "period", "offset", "region", "viewport", "eventLocale"],
  ...["window", "start", "end", "partial", "generatedAt", "firstObservedAt", "lastObservedAt"],
  ...["countryCollection", "totals", "views", "clicks", "exposures", "days", "countries"],
  ...["country", "sections", "regions", "cells", "x", "y", "actions", "event"],
  ...["selectedRegionExposures", "suppressedClicks"],
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
      : path.includes("/v2/product-analytics")
        ? productReportPayload()
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
  const { loadAnalyticsView, loadProductAnalytics, loadProductReport } = await import(
    "../../src/server/analytics.ts"
  );
  const results = [
    await loadOperations(),
    await loadProductAnalytics(),
    await loadFeedback(),
    await loadProductReport(defaultReportSelection),
  ];
  for (const result of results) assert.equal(result.kind, "available");
  // The default `/analytics` path: the calendar view wraps the report.
  const view = await loadAnalyticsView({});
  assert.equal(view.kind === "calendar" && view.result.kind, "available");
  const everything: unknown[] = [...results, view];
  const serialized = JSON.stringify(everything);
  for (const secret of [...secrets, "session", "cookie"])
    assert.equal(serialized.includes(secret), false, secret);
  assert.deepEqual(
    [...new Set(keysOf(everything))].filter((key) => !allowedKeys.has(key)),
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

test("hostile report fields, top-level and nested in day objects, never reach the view", async () => {
  const sentinel = "prompt-and-answer-sentinel@example.test";
  const { loadAnalyticsView, loadProductReport } = await import("../../src/server/analytics.ts");
  const { daily, totals, actions } = productReportPayload();
  assert.ok(daily.length > 0 && actions.length > 0, "fixture must have nested objects");
  for (const extra of [
    { email: sentinel },
    { daily: daily.map((day) => ({ ...day, answer: sentinel })) },
    { totals: { ...totals, prompt: sentinel } },
    { actions: actions.map((action) => ({ ...action, email: sentinel })) },
  ]) {
    vi.stubGlobal("fetch", upstream(extra));
    const results = [await loadProductReport(defaultReportSelection), await loadAnalyticsView({})];
    assert.equal(results[0]?.kind, "unavailable");
    const serialized = JSON.stringify(results);
    for (const leak of [sentinel, ...secrets]) assert.equal(serialized.includes(leak), false);
  }
});
