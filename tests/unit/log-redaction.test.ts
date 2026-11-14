import assert from "node:assert/strict";
import { Pool } from "pg";
import { test, vi } from "vitest";
import { authEnv } from "../security/auth-harness.ts";
import { read, sourceFiles } from "../security/source-tree.ts";

// Skeleton: no structured logger exists yet, so the only log sink is console.* in src/. The rule
// is strict on purpose: a call may pass only string literals, so no variable (email, token, IP,
// SQL text, error object) can reach a log line. EXTENSION POINT: when the structured logger
// arrives (master plan testing.md section 2, Observability), replace `sinks` with its allowlist
// of fields and add the request-id propagation check next to the behavior test below.
// Known limits: aliases of other sinks (a `log = process.stderr` binding), template literals built
// from literals and dynamic `import()` of a logger are not detected; reviewers own those.
const sinkPattern = /\b(?:console\.\w+|process\.std(?:out|err)\.write)\s*\(/g;
const loggerImport = /from\s+["'][^"']*(?:logger|pino|winston|bunyan|debug)["']/;
const sensitiveText =
  /@|token|bearer|secret|password|cookie|\b(?:select|insert|update|delete)\b.*\b(?:from|into|set)\b|\b\d{1,3}(?:\.\d{1,3}){3}\b/i;

function callArguments(source: string, open: number): string {
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "(") depth++;
    if (source[index] === ")" && --depth === 0) return source.slice(open + 1, index);
  }
  throw new Error("unbalanced call");
}

function sinks() {
  return sourceFiles().flatMap((file) => {
    const source = read(file);
    assert.doesNotMatch(source, loggerImport, `${file}: new logger needs the extension point`);
    return [...source.matchAll(sinkPattern)].map((match) => ({
      file,
      call: match[0],
      args: callArguments(source, (match.index ?? 0) + match[0].length - 1).trim(),
    }));
  });
}

test("log calls in src/ pass only static literals free of emails, tokens, IPs and SQL", () => {
  const found = sinks();
  assert.deepEqual(
    found.map(({ file, call }) => `${file} ${call}`),
    ["src/server/auth/runtime.ts console.error("],
    "a new log call needs review: add it here only with literal-only arguments",
  );
  for (const { file, args } of found) {
    assert.match(args, /^"[^"$\\]*"$/, `${file}: log arguments must be one plain string literal`);
    assert.doesNotMatch(args, sensitiveText, `${file}: sensitive text in log literal`);
  }
});

test("no console reference in src/ hides from the direct-call scan", () => {
  // Counts every `console` token, so `console["error"]`, `const { error } = console` and
  // `console.error.bind(...)`-style aliases exceed the number of matched `console.x(` calls.
  const all = sourceFiles().map(read);
  const tokens = all.reduce((sum, source) => sum + (source.match(/\bconsole\b/g)?.length ?? 0), 0);
  const direct = all.reduce(
    (sum, source) => sum + (source.match(/\bconsole\.\w+\s*\(/g)?.length ?? 0),
    0,
  );
  assert.equal(tokens, direct);
});

test("a database error emitted on the pool is logged without its message or the connection URL", async () => {
  vi.stubEnv("NODE_ENV", "test");
  const { createAuthRuntime } = await import("../../src/server/auth/runtime.ts");
  const { readAuthConfiguration } = await import("../../src/server/auth/config.ts");
  const pool = new Pool({ connectionString: authEnv.BACKOFFICE_DATABASE_URL });
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  // A real Pool that never connects: only its "error" listener matters here.
  createAuthRuntime(readAuthConfiguration(authEnv), pool);
  pool.emit(
    "error",
    new Error(
      "password authentication failed for user owner@example.test at 203.0.113.9 SELECT * FROM session WHERE token='sentinel'",
    ),
  );
  assert.deepEqual(logged.mock.calls, [["Backoffice database connection interrupted."]]);
  await pool.end();
});
