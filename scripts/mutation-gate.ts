import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { errorMessage, field, list, record, text } from "./json.ts";

const statuses = new Set([
  "Killed",
  "Timeout",
  "Survived",
  "NoCoverage",
  "CompileError",
  "RuntimeError",
  "Ignored",
  "Pending",
]);

export function mutationScore(results: string[]) {
  const counted = results.filter((status) =>
    ["Killed", "Timeout", "Survived", "NoCoverage"].includes(status),
  );
  const detected = counted.filter((status) => status === "Killed" || status === "Timeout").length;
  return {
    score: counted.length === 0 ? 100 : (100 * detected) / counted.length,
    total: results.length,
    counted: counted.length,
  };
}

/** True when Stryker wrote a report whose changed files contain no mutants (e.g. type-only). */
export function emptyReport(report: unknown): boolean {
  return Object.keys(record(field(report, "files"))).length === 0;
}

export function mutationScores(report: unknown) {
  const files = Object.entries(record(field(report, "files"))).map(([path, value]) => {
    const results = list(field(value, "mutants")).map((mutant) => {
      const status = text(field(mutant, "status"));
      if (!statuses.has(status)) throw new Error(`Unknown mutant status: ${status}`);
      return status;
    });
    return { path, results };
  });
  if (files.length === 0) throw new Error("Report contains no files");
  return {
    overall: mutationScore(files.flatMap((file) => file.results)),
    permission: mutationScore(
      files
        .filter((file) => /^src\/features\/auth\/(domain|application)\//.test(file.path))
        .flatMap((file) => file.results),
    ),
  };
}

export function mutationGate(report: unknown, options: { full?: boolean; ratchet?: unknown } = {}) {
  const scores = mutationScores(report);
  const failures: string[] = [];
  if (scores.overall.score < 70) failures.push("Overall score is below 70%");
  if (scores.permission.score < 85) failures.push("Permission score is below 85%");
  if (options.full && options.ratchet !== undefined) {
    for (const key of ["overall", "permission"] as const) {
      const floor = ratchetFloor(options.ratchet, key);
      if (scores[key].score < floor) failures.push(`${key} score is below ratchet ${floor}%`);
    }
  }
  return { ...scores, failures };
}

function ratchetFloor(ratchet: unknown, key: "overall" | "permission"): number {
  const floor = field(ratchet, "floors", key);
  const valid = typeof floor === "number" && Number.isFinite(floor) && floor >= 0 && floor <= 100;
  if (!valid) throw new Error(`Invalid ${key} ratchet floor`);
  return floor;
}

const usage = "Usage: mutation-gate.ts REPORT [--full --ratchet PATH] [--allow-empty]";

type GateOptions = { reportPath: string; full: boolean; allowEmpty: boolean; ratchetPath: string };

function readFlag(options: GateOptions, args: string[], i: number): number {
  const flag = args[i];
  if (flag === "--full") options.full = true;
  else if (flag === "--allow-empty") options.allowEmpty = true;
  else if (flag === "--ratchet" && args[i + 1]) {
    options.ratchetPath = args[i + 1] ?? "";
    return i + 1;
  } else throw new Error(usage);
  return i;
}

export function parseGateArgs(argv: string[]): GateOptions {
  const [reportPath, ...args] = argv;
  if (!reportPath || reportPath.startsWith("--")) throw new Error("Expected report path");
  const options: GateOptions = { reportPath, full: false, allowEmpty: false, ratchetPath: "" };
  for (let i = 0; i < args.length; i++) i = readFlag(options, args, i);
  // Ratchet floors apply to the full scope only; an empty report is acceptable only for a PR.
  if (options.ratchetPath && !options.full) throw new Error(`--ratchet requires --full. ${usage}`);
  if (options.allowEmpty && options.full)
    throw new Error(`--allow-empty is incremental only. ${usage}`);
  return options;
}

function runGate(argv: string[]): number {
  const options = parseGateArgs(argv);
  const report: unknown = JSON.parse(readFileSync(options.reportPath, "utf8"));
  if (options.allowEmpty && emptyReport(report)) {
    console.log("The changed files in scope contain no mutants; nothing to assess.");
    return 0;
  }
  const ratchet = options.ratchetPath
    ? JSON.parse(readFileSync(options.ratchetPath, "utf8"))
    : undefined;
  const result = mutationGate(report, { full: options.full, ratchet });
  const { overall, permission } = result;
  console.log(
    `Overall: ${overall.score.toFixed(2)}% (${overall.total} mutants); permission: ${permission.score.toFixed(2)}% (${permission.total} mutants)`,
  );
  for (const failure of result.failures) console.error(failure);
  return result.failures.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = runGate(process.argv.slice(2));
  } catch (error) {
    console.error(errorMessage(error));
    process.exitCode = 2;
  }
}
