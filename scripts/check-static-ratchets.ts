import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { field, isRecord, list } from "./json.ts";

// Static quality ratchets (PBO-M2-10): knip findings and cognitive-complexity violations may only
// fall. Baselines live in quality/ratchets/static.json; knip findings are removed in PBO-M3-1.

export const complexityThreshold = 10;
const complexityRule = "lint/complexity/noExcessiveCognitiveComplexity";
const notCategories = new Set(["file", "owners"]);

export interface Location {
  file: string;
  line: number;
  complexity: number;
}
export interface Measured {
  knip: Record<string, number>;
  complexity: Location[];
}

export function countKnip(report: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const issue of list(field(report, "issues"))) {
    if (!isRecord(issue)) continue;
    for (const [category, items] of Object.entries(issue))
      if (!notCategories.has(category) && Array.isArray(items))
        counts[category] = (counts[category] ?? 0) + items.length;
  }
  return counts;
}

export function complexityLocations(report: unknown): Location[] {
  // A report without a summary means Biome did not analyse anything (configuration failure).
  if (field(report, "summary") === undefined)
    throw new Error("Biome produced no summary; the complexity measurement is invalid.");
  const found: Location[] = [];
  for (const diagnostic of list(field(report, "diagnostics"))) {
    const category = field(diagnostic, "category");
    // Any other diagnostic (unreadable file, parse or configuration error) would otherwise read
    // as "no complexity findings" and pass as an improvement: fail closed instead.
    // The complexity-only config leaves the repository's other suppression comments unused.
    if (typeof category === "string" && category.startsWith("suppressions/")) continue;
    if (category !== complexityRule)
      throw new Error(
        `Unexpected Biome diagnostic ${String(category)}; the measurement is invalid.`,
      );
    const message = String(field(diagnostic, "message"));
    const score = /complexity of (\d+)/.exec(message)?.[1];
    const file = field(diagnostic, "location", "path");
    const line = field(diagnostic, "location", "start", "line");
    if (!score || typeof file !== "string" || typeof line !== "number")
      throw new Error(`Unreadable complexity diagnostic: ${message.slice(0, 200)}`);
    found.push({ file, line, complexity: Number(score) });
  }
  return found.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

function perFile(locations: readonly Location[]): Map<string, number[]> {
  const files = new Map<string, number[]>();
  for (const location of locations)
    files.set(location.file, [...(files.get(location.file) ?? []), location.complexity]);
  for (const scores of files.values()) scores.sort((a, b) => b - a);
  return files;
}

export interface Findings {
  failures: string[];
  hints: string[];
}

export function compareKnip(current: Record<string, number>, baseline: unknown): Findings {
  const findings: Findings = { failures: [], hints: [] };
  const recorded = field(baseline, "knip", "counts");
  for (const category of new Set([
    ...Object.keys(current),
    ...Object.keys(isRecord(recorded) ? recorded : {}),
  ])) {
    const now = current[category] ?? 0;
    const before = field(recorded, category);
    const limit = typeof before === "number" ? before : 0;
    if (now > limit) findings.failures.push(`knip ${category}: ${now} findings, baseline ${limit}`);
    if (now < limit)
      findings.hints.push(`knip ${category} fell from ${limit} to ${now}; tighten static.json`);
  }
  return findings;
}

function compareFile(file: string, now: number[], before: number[], findings: Findings): void {
  if (now.length > before.length)
    findings.failures.push(
      `complexity: ${file} has ${now.length} functions over ${complexityThreshold}, baseline ${before.length}`,
    );
  now.forEach((score, index) => {
    const limit = before[index];
    if (limit !== undefined && score > limit)
      findings.failures.push(`complexity: ${file} a function rose to ${score}, baseline ${limit}`);
  });
  if (now.length < before.length || now.some((score, index) => score < (before[index] ?? 0)))
    findings.hints.push(`complexity in ${file} improved; tighten static.json`);
}

export function compareComplexity(current: readonly Location[], baseline: unknown): Findings {
  const findings: Findings = { failures: [], hints: [] };
  const recorded = list(field(baseline, "complexity", "locations")).map((entry) => ({
    file: String(field(entry, "file")),
    line: Number(field(entry, "line")),
    complexity: Number(field(entry, "complexity")),
  }));
  const before = perFile(recorded);
  const now = perFile(current);
  const allowed = Number(field(baseline, "complexity", "count"));
  if (current.length > allowed)
    findings.failures.push(
      `complexity: ${current.length} functions over ${complexityThreshold}, baseline ${allowed}`,
    );
  for (const [file, scores] of now) {
    if (!before.has(file)) findings.failures.push(`complexity: new location ${file}`);
    compareFile(file, scores, before.get(file) ?? [], findings);
  }
  for (const file of before.keys())
    if (!now.has(file)) findings.hints.push(`complexity in ${file} is clean; tighten static.json`);
  return findings;
}

function runJson(root: string, script: string, args: string[]): unknown {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const start = result.stdout.indexOf("{");
  if (result.error || start < 0)
    throw new Error(
      `${script} produced no JSON report: ${result.error?.message ?? result.stderr.slice(0, 400)}`,
    );
  return JSON.parse(result.stdout.slice(start));
}

export function measure(root: string): Measured {
  const knip = runJson(root, "node_modules/knip/bin/knip.js", [
    "--reporter",
    "json",
    "--no-progress",
  ]);
  const biome = runJson(root, "node_modules/@biomejs/biome/bin/biome", [
    "lint",
    "--config-path=quality/biome-complexity.json",
    "--max-diagnostics=none",
    "--reporter=json",
    "src",
    "scripts",
  ]);
  return { knip: countKnip(knip), complexity: complexityLocations(biome) };
}

function document(measured: Measured, previous: unknown): unknown {
  const total = Object.values(measured.knip).reduce((sum, value) => sum + value, 0);
  return {
    $comment:
      previous === undefined
        ? "Static ratchet baselines (PBO-M2-10), measured on 2026-11-14. Counts may only fall (scripts/check-static-ratchets.ts). The knip findings are removed in PBO-M3-1, not by deleting code here. Complexity is Biome noExcessiveCognitiveComplexity with threshold 10 over src/ and scripts/ (quality/biome-complexity.json); line numbers are informational, the ratchet compares counts and scores per file."
        : field(previous, "$comment"),
    knip: { config: "knip.json", total, counts: measured.knip },
    complexity: {
      threshold: complexityThreshold,
      count: measured.complexity.length,
      locations: measured.complexity,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd();
  const baselinePath = path.join(root, "quality/ratchets/static.json");
  const measured = measure(root);
  if (process.argv.includes("--write")) {
    let previous: unknown;
    try {
      previous = JSON.parse(readFileSync(baselinePath, "utf8"));
    } catch {
      previous = undefined;
    }
    const refused =
      previous === undefined
        ? 0
        : compareKnip(measured.knip, previous).failures.length +
          compareComplexity(measured.complexity, previous).failures.length;
    if (refused) throw new Error("Refusing to raise a ratchet baseline; counts may only fall.");
    writeFileSync(baselinePath, `${JSON.stringify(document(measured, previous), null, 2)}\n`);
    console.log(`Wrote ${path.relative(root, baselinePath)}`);
  } else {
    const baseline: unknown = JSON.parse(readFileSync(baselinePath, "utf8"));
    const results = [
      compareKnip(measured.knip, baseline),
      compareComplexity(measured.complexity, baseline),
    ];
    for (const result of results) {
      for (const hint of result.hints) console.log(`Hint: ${hint}`);
      for (const failure of result.failures) console.error(failure);
    }
    const failed = results.flatMap((result) => result.failures).length;
    const total = Object.values(measured.knip).reduce((sum, value) => sum + value, 0);
    console.log(
      `Static ratchets: knip ${total} findings, ${measured.complexity.length} functions over complexity ${complexityThreshold}, ${failed} regressions.`,
    );
    if (failed) process.exitCode = 1;
  }
}
