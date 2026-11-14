// Budget gate (PBO-M2-9): Lighthouse 13 (mobile, simulated throttling) median of N runs per route
// against the fixture stack, compared with the committed ratchets. Next 16 no longer reports
// "First Load JS" (its upgrade guide points to downloaded resource sizes), so the bundle budget is
// the script transfer size from Lighthouse's network records: quality/ratchets/bundle.json.
//
//   node scripts/lighthouse-gate.ts [--routes /,/sign-in] [--runs 5] [--out reports/budgets/summary.json]
//     [--write]   record the measured medians where they are better than (or absent from) the ratchet
//
// Starts scripts/test-server.ts itself (WEB_UPSTREAM selects a running image; otherwise the local
// standalone build), signs in through the private fixture session cookies sent as a request
// header, and stops that child by its own PID. Only numbers are written; no report, screenshot,
// cookie or URL with a token leaves the run.
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { errorMessage, field, isRecord, list, record, text } from "./json.ts";

export const ORIGIN = "http://localhost:3107";
export const ROUTES = {
  "/": "viewer",
  "/analytics": "viewer",
  "/access": "owner",
  "/sign-in": "anonymous",
  "/privacy": "anonymous",
} as const;
type Route = keyof typeof ROUTES;
type Role = (typeof ROUTES)[Route];

export const LIGHTHOUSE_METRICS = [
  "performance",
  "accessibility",
  "bestPractices",
  "tbt",
  "lcp",
  "cls",
] as const;
export type Metrics = Record<(typeof LIGHTHOUSE_METRICS)[number] | "scriptBytes", number>;
type Baseline = Record<string, Partial<Metrics>>;

/** Allowed noise before a median counts as a regression (simulated throttling still varies). */
export const NOISE = {
  performance: { drop: 5 },
  accessibility: { drop: 0 },
  bestPractices: { drop: 0 },
  tbt: { ratio: 1.5, slack: 50 },
  lcp: { ratio: 1.25, slack: 100 },
  cls: { rise: 0.02 },
  scriptBytes: { ratio: 1.01, slack: 512 },
} as const;
const lowerIsBetter = new Set(["tbt", "lcp", "cls", "scriptBytes"]);

export function median(values: number[]): number {
  if (values.length === 0) throw new Error("median of no values");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function score(lhr: unknown, category: string): number {
  const value = field(lhr, "categories", category, "score");
  if (typeof value !== "number") throw new Error(`Lighthouse category ${category} has no score`);
  return Math.round(value * 100);
}

function numeric(lhr: unknown, audit: string): number {
  const value = field(lhr, "audits", audit, "numericValue");
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Lighthouse audit ${audit} has no numeric value`);
  return value;
}

/** Reduces one Lighthouse result to the budgeted metrics; any missing value throws (fail closed). */
export function summarize(lhr: unknown): Metrics {
  const runtimeError = field(lhr, "runtimeError");
  if (isRecord(runtimeError))
    throw new Error(`Lighthouse runtime error: ${text(runtimeError.code)}`);
  const requests = list(field(lhr, "audits", "network-requests", "details", "items"));
  if (requests.length === 0) throw new Error("Lighthouse recorded no network requests");
  const scriptBytes = requests
    .filter((item) => field(item, "resourceType") === "Script")
    .reduce<number>((sum, item) => {
      const size = field(item, "transferSize");
      return sum + (typeof size === "number" ? size : 0);
    }, 0);
  return {
    performance: score(lhr, "performance"),
    accessibility: score(lhr, "accessibility"),
    bestPractices: score(lhr, "best-practices"),
    tbt: Math.round(numeric(lhr, "total-blocking-time")),
    lcp: Math.round(numeric(lhr, "largest-contentful-paint")),
    cls: Math.round(numeric(lhr, "cumulative-layout-shift") * 1000) / 1000,
    scriptBytes,
  };
}

export function medianMetrics(runs: Metrics[]): Metrics {
  const pick = (key: keyof Metrics) => median(runs.map((run) => run[key]));
  return {
    performance: pick("performance"),
    accessibility: pick("accessibility"),
    bestPractices: pick("bestPractices"),
    tbt: pick("tbt"),
    lcp: pick("lcp"),
    cls: pick("cls"),
    scriptBytes: pick("scriptBytes"),
  };
}

function limit(metric: keyof Metrics, baseline: number): number {
  const noise: Record<string, number> = NOISE[metric];
  if ("drop" in noise) return baseline - (noise.drop ?? 0);
  if ("rise" in noise) return baseline + (noise.rise ?? 0);
  return baseline * (noise.ratio ?? 1) + (noise.slack ?? 0);
}

/** Compares measured medians with a ratchet baseline; a baseline route or metric not measured fails. */
export function compare(
  measured: Record<string, Metrics>,
  baseline: Baseline,
  keys: readonly (keyof Metrics)[],
) {
  const failures: string[] = [];
  const improvements: string[] = [];
  for (const [route, expected] of Object.entries(baseline)) {
    const actual = measured[route];
    if (!actual) {
      failures.push(`${route}: in the ratchet but not measured`);
      continue;
    }
    for (const key of keys) {
      const base = expected[key];
      if (base === undefined) continue;
      const value = actual[key];
      const bound = limit(key, base);
      const worse = lowerIsBetter.has(key) ? value > bound : value < bound;
      const better = lowerIsBetter.has(key) ? value < base : value > base;
      if (worse) failures.push(`${route} ${key}: ${value} vs ratchet ${base} (limit ${bound})`);
      else if (better) improvements.push(`${route} ${key}: ${value} (ratchet ${base})`);
    }
  }
  return { failures, improvements };
}

/** Ratchet update for --write: a value moves only in the favourable direction or is added. */
export function tighten(
  baseline: Baseline,
  measured: Record<string, Metrics>,
  keys: readonly (keyof Metrics)[],
) {
  const next: Baseline = structuredClone(baseline);
  for (const [route, values] of Object.entries(measured)) {
    const entry: Partial<Metrics> = next[route] ?? {};
    next[route] = entry;
    for (const key of keys) {
      const current = entry[key];
      const value = values[key];
      if (current === undefined || (lowerIsBetter.has(key) ? value < current : value > current))
        entry[key] = value;
    }
  }
  return next;
}

const ratchetFiles = {
  lighthouse: { path: "quality/ratchets/lighthouse.json", keys: LIGHTHOUSE_METRICS },
  bundle: { path: "quality/ratchets/bundle.json", keys: ["scriptBytes"] as const },
};

function readBaseline(path: string): { file: Record<string, unknown>; routes: Baseline } {
  let file: Record<string, unknown>;
  try {
    file = record(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    if (/ENOENT/.test(errorMessage(error))) return { file: {}, routes: {} };
    throw error;
  }
  const routes: Baseline = {};
  for (const [route, values] of Object.entries(record(field(file, "baseline", "routes")))) {
    const entry: Partial<Metrics> = {};
    for (const [key, value] of Object.entries(record(values))) {
      if (typeof value !== "number") throw new Error(`${path}: ${route} ${key} is not a number`);
      entry[key as keyof Metrics] = value;
    }
    routes[route] = entry;
  }
  return { file, routes };
}

/** Reads a summary written by this script; every metric must be a finite number. */
export function readSummary(path: string): Record<string, Metrics> {
  const routes: Record<string, Metrics> = {};
  for (const [route, values] of Object.entries(
    record(field(JSON.parse(readFileSync(path, "utf8")), "routes")),
  )) {
    const metric = (key: keyof Metrics) => {
      const value = field(values, key);
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`${path}: ${route} ${key} is not a number`);
      return value;
    };
    routes[route] = {
      performance: metric("performance"),
      accessibility: metric("accessibility"),
      bestPractices: metric("bestPractices"),
      tbt: metric("tbt"),
      lcp: metric("lcp"),
      cls: metric("cls"),
      scriptBytes: metric("scriptBytes"),
    };
  }
  return routes;
}

function sessionCookies(): Record<Role, string | undefined> {
  const sessions = record(JSON.parse(readFileSync(".artifacts/fixture-sessions.json", "utf8")));
  const cookie = (role: "owner" | "viewer") => {
    const value = record(field(sessions, role, "cookie"));
    return `${text(value.name)}=${text(value.value)}`;
  };
  return { anonymous: undefined, owner: cookie("owner"), viewer: cookie("viewer") };
}

async function waitForServer(server: ChildProcess) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error("Fixture server exited before it was ready");
    try {
      const response = await fetch(`${ORIGIN}/api/ready`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await delay(1000);
  }
  throw new Error("Fixture server did not become ready");
}

async function measure(routes: Route[], runs: number) {
  const { default: lighthouse } = await import("lighthouse");
  const { chromium } = await import("@playwright/test");
  const server = spawn(process.execPath, ["scripts/test-server.ts"], { stdio: "inherit" });
  const port = 9300 + Math.floor(Math.random() * 500);
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await waitForServer(server);
    browser = await chromium.launch({
      channel: "chromium",
      args: [`--remote-debugging-port=${port}`],
    });
    const cookies = sessionCookies();
    const measured: Record<string, Metrics> = {};
    for (const route of routes) {
      const cookie = cookies[ROUTES[route]];
      const samples: Metrics[] = [];
      for (let run = 0; run < runs; run++) {
        const result = await lighthouse(
          `${ORIGIN}${route}`,
          { port, output: "json", logLevel: "error" },
          {
            extends: "lighthouse:default",
            settings: {
              onlyCategories: ["performance", "accessibility", "best-practices"],
              disableFullPageScreenshot: true,
              skipAudits: ["screenshot-thumbnails", "final-screenshot"],
              ...(cookie ? { extraHeaders: { Cookie: cookie } } : {}),
            },
          },
        );
        if (!result) throw new Error(`Lighthouse returned no result for ${route}`);
        const lhr = result.lhr;
        if (new URL(lhr.finalDisplayedUrl).pathname !== route)
          throw new Error(
            `${route} ended on ${new URL(lhr.finalDisplayedUrl).pathname} (authentication?)`,
          );
        samples.push(summarize(lhr));
      }
      measured[route] = medianMetrics(samples);
      console.log(`${route}: ${JSON.stringify(measured[route])}`);
    }
    return measured;
  } finally {
    await browser?.close().catch(() => undefined);
    if (server.pid !== undefined && server.exitCode === null) server.kill("SIGTERM");
  }
}

function parse(argv: string[]) {
  const options = {
    routes: Object.keys(ROUTES) as Route[],
    subset: false,
    runs: 5,
    out: "reports/budgets/summary.json",
    write: false,
    from: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--write") options.write = true;
    else if (flag === "--routes" && value) {
      const routes = value.split(",");
      for (const route of routes) if (!(route in ROUTES)) throw new Error(`Unknown route ${route}`);
      options.routes = routes as Route[];
      options.subset = true;
      i++;
    } else if (flag === "--runs" && value && /^[1-9]\d*$/.test(value)) {
      options.runs = Number(value);
      i++;
    } else if (flag === "--out" && value) {
      options.out = value;
      i++;
    } else if (flag === "--from" && value) {
      options.from = value;
      i++;
    } else
      throw new Error(
        "Usage: lighthouse-gate.ts [--routes /,/sign-in] [--runs 5] [--out PATH] [--from SUMMARY] [--write]",
      );
  }
  return options;
}

async function main() {
  const options = parse(process.argv.slice(2));
  // --from re-checks (or records with --write) a summary measured elsewhere, e.g. the CI artifact.
  const measured = options.from
    ? readSummary(options.from)
    : await measure(options.routes, options.runs);
  if (!options.from) {
    mkdirSync(dirname(resolve(options.out)), { recursive: true });
    writeFileSync(
      options.out,
      `${JSON.stringify({ runs: options.runs, routes: measured }, null, 2)}\n`,
    );
  }
  let failed = false;
  for (const { path, keys } of Object.values(ratchetFiles)) {
    const { file, routes } = readBaseline(path);
    // Enforcement needs a recorded baseline; only --write (recording) may start from none.
    if (Object.keys(routes).length === 0 && !options.write) {
      console.error(`regression ${path}: no baseline recorded (record one with --write)`);
      failed = true;
      continue;
    }
    // A full run compares every ratchet route; only an explicit --routes subset narrows it.
    const scoped = options.subset
      ? Object.fromEntries(Object.entries(routes).filter(([route]) => route in measured))
      : routes;
    const { failures, improvements } = compare(measured, scoped, keys);
    for (const line of improvements) console.log(`improved ${path}: ${line}`);
    for (const line of failures) console.error(`regression ${path}: ${line}`);
    failed ||= failures.length > 0;
    if (options.write && failures.length === 0) {
      const next = {
        ...file,
        baseline: { ...record(file.baseline ?? {}), routes: tighten(routes, measured, keys) },
      };
      writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
    }
  }
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exitCode = 2;
  });
}
