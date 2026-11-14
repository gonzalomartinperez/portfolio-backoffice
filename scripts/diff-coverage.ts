// Diff coverage gate (PBO-M2-1, testing.md section 1): the executable lines a pull request adds
// or changes under src/ must be covered by the unit and integration projects: 90 % on auth,
// permission and data-access code, 80 % elsewhere. Reads an lcov report and a zero-context
// `git diff <base>...HEAD`. Node built-ins only.
// Usage: node scripts/diff-coverage.ts [--lcov coverage/lcov.info] [--base origin/develop]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const DIFF_FLOORS = { critical: 90, rest: 80 } as const;

/**
 * Gated files: TypeScript modules under src/ outside the Next route tree. Routes, pages and
 * `.tsx` presentation are exercised by the browser suite, which reports no line coverage; they
 * join the gate once the component project measures them (PBO-M2-2).
 */
export function isGated(file: string): boolean {
  return /^src\/(?!app\/).*\.ts$/.test(file);
}
type Group = keyof typeof DIFF_FLOORS;

/** Auth, permission and data-access code carries the stricter floor. */
export function isCriticalPath(file: string): boolean {
  return /^src\/(features\/auth|server\/auth|server\/dal)\//.test(file);
}

/** Repository-relative file -> (line -> hits) for every executable line (lcov DA records). */
export function parseLcov(text: string, root: string): Map<string, Map<number, number>> {
  const prefix = root.endsWith("/") ? root : `${root}/`;
  const files = new Map<string, Map<number, number>>();
  let current: Map<number, number> | undefined;
  for (const line of text.split("\n")) {
    if (line.startsWith("SF:")) {
      const file = line.slice(3).trim();
      current = new Map();
      files.set(file.startsWith(prefix) ? file.slice(prefix.length) : file, current);
    } else if (line.startsWith("DA:") && current) {
      const [lineNumber, hits] = line.slice(3).split(",");
      current.set(Number(lineNumber), Number(hits));
    } else if (line === "end_of_record") {
      current = undefined;
    }
  }
  return files;
}

/** File -> added or changed line numbers from `git diff -U0`. */
export function parseChangedLines(diff: string): Map<string, Set<number>> {
  const changed = new Map<string, Set<number>>();
  let file: string | undefined;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      file = line === "+++ /dev/null" ? undefined : line.replace(/^\+\+\+ b\//, "");
    } else if (file && line.startsWith("@@")) {
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (!match) throw new Error(`Unreadable hunk header: ${line}`);
      const start = Number(match[1]);
      const count = match[2] === undefined ? 1 : Number(match[2]);
      const lines = changed.get(file) ?? new Set<number>();
      for (let offset = 0; offset < count; offset += 1) lines.add(start + offset);
      changed.set(file, lines);
    }
  }
  return changed;
}

export type DiffResult = { group: Group; covered: number; total: number; percent: number };

export function evaluateDiff(
  coverage: Map<string, Map<number, number>>,
  changed: Map<string, Set<number>>,
): { results: DiffResult[]; uncovered: string[]; errors: string[] } {
  const tally = { critical: { covered: 0, total: 0 }, rest: { covered: 0, total: 0 } };
  const uncovered: string[] = [];
  const errors: string[] = [];
  for (const [file, lines] of [...changed].sort(([a], [b]) => a.localeCompare(b))) {
    if (!isGated(file)) continue;
    const executable = coverage.get(file);
    if (!executable) {
      // Every src/**/*.{ts,tsx} file is in the coverage include set, so absence is a wiring error.
      errors.push(`${file} changed but is missing from the coverage report`);
      continue;
    }
    const group = tally[isCriticalPath(file) ? "critical" : "rest"];
    for (const lineNumber of [...lines].sort((a, b) => a - b)) {
      const hits = executable.get(lineNumber);
      if (hits === undefined) continue;
      group.total += 1;
      if (hits > 0) group.covered += 1;
      else uncovered.push(`${file}:${lineNumber}`);
    }
  }
  const results = (["critical", "rest"] as const).map((group) => {
    const { covered, total } = tally[group];
    return { group, covered, total, percent: total === 0 ? 100 : (covered / total) * 100 };
  });
  for (const result of results)
    if (result.percent < DIFF_FLOORS[result.group])
      errors.push(
        `${result.group} diff coverage ${result.percent.toFixed(1)} % (${result.covered}/${result.total}) is below ${DIFF_FLOORS[result.group]} %`,
      );
  return { results, uncovered, errors };
}

function option(args: string[], name: string, fallback: string): string {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} needs a value`);
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const lcov = option(args, "--lcov", "coverage/lcov.info");
  const base = option(args, "--base", "origin/develop");
  const diff = execFileSync(
    "git",
    ["diff", "-U0", "--no-color", "--no-ext-diff", `${base}...HEAD`, "--", "src"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const { results, uncovered, errors } = evaluateDiff(
    parseLcov(readFileSync(lcov, "utf8"), process.cwd()),
    parseChangedLines(diff),
  );
  for (const result of results)
    console.log(
      `Diff coverage ${result.group}: ${result.percent.toFixed(1)} % (${result.covered}/${result.total} changed executable lines, floor ${DIFF_FLOORS[result.group]} %)`,
    );
  for (const line of uncovered) console.log(`  uncovered ${line}`);
  for (const error of errors) console.error(`Diff coverage gate: ${error}`);
  if (errors.length > 0) process.exitCode = 1;
}
