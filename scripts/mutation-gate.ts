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
    const floor = field(options.ratchet, "floors", "overall");
    if (typeof floor !== "number" || !Number.isFinite(floor) || floor < 0 || floor > 100)
      throw new Error("Invalid overall ratchet floor");
    if (scores.overall.score < floor) failures.push(`Overall score is below ratchet ${floor}%`);
  }
  return { ...scores, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [reportPath, ...args] = process.argv.slice(2);
    let full = false;
    let ratchet: unknown;
    if (!reportPath || reportPath.startsWith("--")) throw new Error("Expected report path");
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--full" && !full) full = true;
      else if (args[i] === "--ratchet" && ratchet === undefined && args[i + 1]) {
        ratchet = JSON.parse(readFileSync(args[++i] ?? "", "utf8"));
      } else throw new Error("Usage: mutation-gate.ts REPORT [--full] [--ratchet PATH]");
    }
    const result = mutationGate(JSON.parse(readFileSync(reportPath, "utf8")), { full, ratchet });
    console.log(
      `Overall: ${result.overall.score.toFixed(2)}% (${result.overall.total} mutants); permission: ${result.permission.score.toFixed(2)}% (${result.permission.total} mutants)`,
    );
    for (const failure of result.failures) console.error(failure);
    process.exitCode = result.failures.length ? 1 : 0;
  } catch (error) {
    console.error(errorMessage(error));
    process.exitCode = 2;
  }
}
