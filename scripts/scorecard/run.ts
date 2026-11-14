import { execFile, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  compareComplexity,
  compareKnip,
  complexityLocations,
  countKnip,
  type Measured,
} from "../check-static-ratchets.ts";
import { compareToBaseline, measureTheme } from "../check-tokens.ts";
import { errorMessage, field, list, record, text } from "../json.ts";

const names = {
  D1: "Architecture",
  D2: "Code quality",
  D3: "Tests",
  D4: "CI/CD",
  D5: "Security and supply chain",
  D6: "Performance",
  D7: "Observability",
  D8: "Docs and DX",
  P1: "Visual design and system",
  P2: "Interaction and motion",
  P3: "Accessibility",
  P4: "Responsive and cross-browser",
  P5: "Theme parity",
  P6: "Consistency and identity",
  R1: "First-screen clarity",
  R2: "Proof (measured results)",
  R3: "Writing quality",
  R4: "Credibility",
  R5: "Calls to action",
  R6: "Polish",
  R7: "Differentiation",
};
type Axis = keyof typeof names;
type Artifact = { data: unknown; source: string };
type Inputs = Partial<
  Record<"coverage" | "mutation" | "flaky" | "bundle" | "lighthouse" | "a11y", Artifact>
> & {
  static?: Measured;
  contrast?: number;
  commit?: string;
  runUrl?: string;
};
type Ratchets = Record<string, unknown>;
type Reading = {
  id: string;
  value: number | null;
  ratchet: number | null;
  better: "higher" | "lower";
  status: "pass" | "regression";
  source: string;
};
type AxisResult = { name: string; readings: Reading[]; gaps: { id: string; reason: string }[] };
// Missing developer measurements stay explicit until the roadmap supplies their evidence.
const roadmapGaps: Partial<Record<Axis, string>> = {
  D1: "Guard output integration arrives with G1-G10 in M4",
  D2: "Lint/type counts arrive with the full scorecard in PBO-M2-11 part 2",
  D3: "Diff coverage and integration evidence arrive in PBO-M2-11 part 2",
  D4: "CI duration evidence arrives in PBO-M2-11 part 2",
  D5: "Security scan aggregation arrives in PBO-M2-11 part 2",
  D7: "Structured logs arrive in M4; live SLO evidence arrives at MV",
  D8: "Documentation checks arrive in PBO-M3-9",
};

function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new Error("Expected a finite nonnegative metric");
  return value;
}
function optionalNumber(value: unknown): number | null {
  return value === undefined ? null : number(value);
}
function dateValue(value: string): number {
  const time = Date.parse(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  )
    throw new Error(`Invalid date: ${value}`);
  return time;
}
function mutationScore(data: unknown): number | null {
  const statuses = Object.values(record(field(data, "files"))).flatMap((file) =>
    list(field(file, "mutants")).map((mutant) => text(field(mutant, "status"))),
  );
  const detected = statuses.filter((status) => status === "Killed" || status === "Timeout").length;
  const total =
    detected + statuses.filter((status) => status === "Survived" || status === "NoCoverage").length;
  return total === 0 ? null : (detected / total) * 100;
}

function collector() {
  const axes: Record<string, AxisResult> = {};
  for (const [id, name] of Object.entries(names)) axes[id] = { name, readings: [], gaps: [] };
  const axis = (id: Axis) => {
    const result = axes[id];
    if (!result) throw new Error(`Unknown axis: ${id}`);
    return result;
  };
  const gap = (id: Axis, metric: string, reason: string) =>
    axis(id).gaps.push({ id: metric, reason });
  const add = (
    id: Axis,
    metric: string,
    value: number | null,
    ratchet: number | null,
    better: Reading["better"],
    source: string,
    failed = false,
  ) => {
    const regression =
      failed ||
      value === null ||
      (ratchet !== null && (better === "higher" ? value < ratchet : value > ratchet));
    axis(id).readings.push({
      id: metric,
      value,
      ratchet,
      better,
      status: regression ? "regression" : "pass",
      source,
    });
  };
  return { axes, add, gap };
}
type Collector = ReturnType<typeof collector>;

function staticValue(inputs: Inputs, staticRatchet: unknown, id: "knip" | "complexity") {
  if (id === "knip")
    return inputs.static
      ? Object.values(inputs.static.knip).reduce((sum, count) => sum + count, 0)
      : field(staticRatchet, "knip", "total");
  return inputs.static?.complexity.length ?? field(staticRatchet, "complexity", "count");
}

function staticRegressed(inputs: Inputs, staticRatchet: unknown, id: "knip" | "complexity") {
  if (!inputs.static) return false;
  const result =
    id === "knip"
      ? compareKnip(inputs.static.knip, staticRatchet)
      : compareComplexity(inputs.static.complexity, staticRatchet);
  return result.failures.length > 0;
}

function staticReadings(c: Collector, inputs: Inputs, ratchets: Ratchets) {
  const { add, gap } = c;
  const staticRatchet = ratchets["static.json"];
  const limits = {
    knip: field(staticRatchet, "knip", "total"),
    complexity: field(staticRatchet, "complexity", "count"),
  };
  const source = inputs.static
    ? "scripts/check-static-ratchets.ts comparators"
    : "ratchet (not re-measured)";
  for (const id of ["knip", "complexity"] as const) {
    const value = staticValue(inputs, staticRatchet, id);
    if (value === undefined) gap("D2", id, "quality/ratchets/static.json unavailable");
    else
      add(
        "D2",
        id,
        number(value),
        optionalNumber(limits[id]),
        "lower",
        source,
        staticRegressed(inputs, staticRatchet, id),
      );
  }
}
function tokenReadings(c: Collector, inputs: Inputs, ratchets: Ratchets) {
  const { add, gap } = c;
  if (inputs.contrast !== undefined || ratchets["tokens.json"] !== undefined)
    add(
      "P1",
      "token-contrast-regressions",
      inputs.contrast ?? 0,
      0,
      "lower",
      inputs.contrast === undefined
        ? "ratchet (not re-measured)"
        : "scripts/check-tokens.ts measureTheme/compareToBaseline",
    );
  else gap("P1", "token-contrast-regressions", "quality/ratchets/tokens.json unavailable");
}
function coverageReadings(c: Collector, inputs: Inputs, ratchets: Ratchets) {
  const { add, gap } = c;
  for (const metric of ["lines", "branches", "functions", "statements"]) {
    if (!inputs.coverage) gap("D3", `coverage.${metric}`, "--coverage unavailable");
    else
      add(
        "D3",
        `coverage.${metric}`,
        number(field(inputs.coverage.data, "total", metric, "pct")),
        optionalNumber(field(ratchets["coverage.json"], "floors", metric)),
        "higher",
        inputs.coverage.source,
      );
  }
}
function mutationReading(c: Collector, inputs: Inputs, ratchets: Ratchets) {
  const { add, gap } = c;
  const mutation = inputs.mutation ? mutationScore(inputs.mutation.data) : null;
  if (mutation === null)
    gap("D3", "mutation", inputs.mutation ? "No scored mutants" : "--mutation unavailable");
  else
    add(
      "D3",
      "mutation",
      mutation,
      optionalNumber(field(ratchets["mutation.json"], "floors", "overall")),
      "higher",
      inputs.mutation?.source ?? "",
    );
}
function countReadings(c: Collector, inputs: Inputs) {
  const { add, gap } = c;
  for (const [key, id, metric, keys] of [
    ["flaky", "D3", "flaky", ["totals", "flaky"]],
    ["a11y", "P3", "axe-serious-critical", ["violations"]],
  ] as const) {
    const input = inputs[key];
    if (!input) gap(id, metric, `--${key} unavailable`);
    else {
      const value =
        key === "a11y" && Array.isArray(input.data)
          ? input.data.filter(
              (violation) =>
                field(violation, "impact") === "serious" ||
                field(violation, "impact") === "critical",
            ).length
          : number(field(input.data, ...keys));
      add(id, metric, value, 0, "lower", input.source);
    }
  }
}
function routeReadings(c: Collector, inputs: Inputs, ratchets: Ratchets) {
  const { gap } = c;
  for (const key of ["bundle", "lighthouse"] as const) {
    const input = inputs[key];
    if (!input) {
      gap("D6", key, `--${key} unavailable`);
      continue;
    }
    const routes = record(field(input.data, "routes"));
    const baseline = record(field(ratchets[`${key}.json`], "baseline", "routes") ?? {});
    const routeNames = new Set([...Object.keys(routes), ...Object.keys(baseline)]);
    if (routeNames.size === 0) gap("D6", key, "No routes measured");
    for (const route of routeNames)
      routeMetrics(c, key, route, routes[route], baseline[route], input.source);
  }
}
function routeMetrics(
  c: Collector,
  key: "bundle" | "lighthouse",
  route: string,
  current: unknown,
  baseline: unknown,
  source: string,
) {
  const metrics = record(current ?? {});
  const limits = record(baseline ?? {});
  for (const metric of new Set([...Object.keys(metrics), ...Object.keys(limits)])) {
    const id = `${key}.${route}.${metric}`;
    const lower =
      key === "bundle" ||
      ["tbt", "cls", "lcp", "fcp", "si", "ttfb"].includes(metric) ||
      /(?:Ms|Bytes)$/.test(metric);
    c.add(
      "D6",
      id,
      optionalNumber(metrics[metric]),
      optionalNumber(limits[metric]),
      lower ? "lower" : "higher",
      source,
    );
  }
}
function judgementReadings(axes: Collector["axes"], ratchets: Ratchets) {
  const judgement = ratchets["scorecard.json"];
  const scores: Record<string, number> = {};
  for (const id of Object.keys(names).filter((id) => !id.startsWith("D"))) {
    const score = field(judgement, "scores", id);
    if (score === undefined)
      axes[id]?.gaps.push({ id: "judgement", reason: "evaluator run pending" });
    else {
      scores[id] = number(score);
      if (scores[id] > 100) throw new Error("Evaluator score exceeds 100");
    }
  }
  return scores;
}
function warnAges(c: Collector, ratchets: Ratchets, today: number) {
  const { add } = c;
  for (const [file, data] of Object.entries(ratchets)) {
    if (field(data, "mode") !== "warn") continue;
    const since = field(data, "warnSince");
    let age: number | null = null;
    try {
      age = (today - dateValue(text(since))) / 86_400_000;
    } catch {
      /* Invalid or absent dates fail closed. */
    }
    add(
      "D4",
      `${file}.warn-age`,
      age === null || age < 0 ? null : age,
      14,
      "lower",
      `quality/ratchets/${file}`,
    );
  }
}

export function evaluate(inputs: Inputs, ratchets: Ratchets, date: string) {
  const c = collector();
  const { axes } = c;
  for (const [id, reason] of Object.entries(roadmapGaps)) {
    if (id in names) axes[id]?.gaps.push({ id: "roadmap", reason });
  }
  staticReadings(c, inputs, ratchets);
  tokenReadings(c, inputs, ratchets);
  coverageReadings(c, inputs, ratchets);
  mutationReading(c, inputs, ratchets);
  countReadings(c, inputs);
  routeReadings(c, inputs, ratchets);
  const scores = judgementReadings(axes, ratchets);
  const judgement = ratchets["scorecard.json"];
  warnAges(c, ratchets, dateValue(date));
  const summary = { pass: 0, regression: 0, gap: 0 };
  for (const result of Object.values(axes)) {
    for (const reading of result.readings) summary[reading.status] += 1;
    summary.gap += result.gaps.length;
  }
  const scorecard = {
    rubrics: "v2",
    evidence: { commit: inputs.commit ?? null, runUrl: inputs.runUrl ?? null, date },
    axes,
    judgement:
      judgement === undefined
        ? {
            scores,
            gaps: Object.keys(names)
              .filter((id) => !id.startsWith("D"))
              .map((id) => ({ id, reason: "evaluator run pending" })),
          }
        : {
            evaluatedAt: text(field(judgement, "evaluatedAt")),
            commit: text(field(judgement, "commit")),
            method: text(field(judgement, "method")),
            scores,
          },
    summary,
  };
  return { scorecard, exitCode: summary.regression > 0 ? 1 : 0 };
}

const flags = [
  "out",
  "coverage",
  "mutation",
  "flaky",
  "bundle",
  "lighthouse",
  "a11y",
  "commit",
  "run-url",
  "date",
];
const usage = `Usage: node scripts/scorecard/run.ts ${flags.map((flag) => `[--${flag} <value>]`).join(" ")}`;
export function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]?.slice(2);
    const value = args[index + 1];
    if (
      !args[index]?.startsWith("--") ||
      !flag ||
      !flags.includes(flag) ||
      !value ||
      value.startsWith("--")
    )
      throw new Error(usage);
    result[flag] = value;
  }
  return result;
}
function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}
// Keep spawn errors intact: tool diagnostics containing EPERM/ENOENT must never enable fallback.
function staticReport(root: string, script: string, args: string[]): unknown {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const start = result.stdout.indexOf("{");
  if (result.signal || result.status === null || result.status > 1 || start < 0)
    throw new Error(`${script} produced no valid report: ${result.stderr.slice(0, 400)}`);
  return JSON.parse(result.stdout.slice(start));
}
function measureStatic(inputs: Inputs, root: string) {
  try {
    const knip = staticReport(root, "node_modules/knip/bin/knip.js", [
      "--reporter",
      "json",
      "--no-progress",
    ]);
    const biome = staticReport(root, "node_modules/@biomejs/biome/bin/biome", [
      "lint",
      "--config-path=quality/biome-complexity.json",
      "--max-diagnostics=none",
      "--reporter=json",
      "src",
      "scripts",
    ]);
    inputs.static = { knip: countKnip(knip), complexity: complexityLocations(biome) };
  } catch (error) {
    const code = field(error, "code");
    if (process.env.CI !== undefined || (code !== "EPERM" && code !== "ENOENT")) throw error;
    console.error("Static tool spawn unavailable; using committed ratchet values.");
  }
}
function readRatchets(cwd: string): Ratchets {
  const ratchets: Ratchets = {};
  const directory = path.join(cwd, "quality/ratchets");
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".json")))
    ratchets[file] = readJson(path.join(directory, file));
  return ratchets;
}

async function readInputs(options: ReturnType<typeof parseArgs>, cwd: string): Promise<Inputs> {
  const inputs: Inputs = {
    commit:
      options.commit ??
      (await promisify(execFile)("git", ["rev-parse", "HEAD"], { cwd })).stdout.trim(),
  };
  if (options["run-url"]) inputs.runUrl = options["run-url"];
  for (const key of ["coverage", "mutation", "flaky", "bundle", "lighthouse", "a11y"] as const) {
    const source = options[key];
    if (!source) continue;
    const file = path.resolve(cwd, source);
    if (!existsSync(file)) throw new Error(`--${key} file does not exist: ${source}`);
    inputs[key] = { source, data: readJson(file) };
  }
  return inputs;
}

export async function main(args: string[], cwd = process.cwd()): Promise<number> {
  try {
    const options = parseArgs(args);
    const ratchets = readRatchets(cwd);
    const inputs = await readInputs(options, cwd);
    measureStatic(inputs, cwd);
    const css = readFileSync(path.join(cwd, "src/app/style.css"), "utf8");
    inputs.contrast = (["dark", "light"] as const).reduce(
      (count, theme) =>
        count +
        compareToBaseline(measureTheme(css, theme), ratchets["tokens.json"], theme).failures.length,
      0,
    );
    const result = evaluate(
      inputs,
      ratchets,
      options.date ?? new Date().toISOString().slice(0, 10),
    );
    writeFileSync(
      path.resolve(cwd, options.out ?? "scorecard.json"),
      `${JSON.stringify(result.scorecard, null, 2)}\n`,
    );
    const s = result.scorecard.summary;
    console.log(`Scorecard: ${s.pass} pass, ${s.regression} regression, ${s.gap} gap.`);
    return result.exitCode;
  } catch (error) {
    console.error(errorMessage(error));
    return 2;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  process.exitCode = await main(process.argv.slice(2));
