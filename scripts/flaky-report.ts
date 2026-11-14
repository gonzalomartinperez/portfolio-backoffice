import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { errorMessage, field, list, record, text } from "./json.ts";

export interface FlakyEntry {
  id: string;
  passed: number;
  failed: number;
}

export interface QuarantinedEntry extends FlakyEntry {
  kind: "flaky" | "failing";
}

export interface FlakyReport {
  schema: 1;
  generatedAt: string;
  totals: {
    tests: number;
    stable: number;
    flaky: number;
    failing: number;
    quarantined: number;
    skipped: number;
  };
  flaky: FlakyEntry[];
  failing: FlakyEntry[];
  /** Non-stable tests listed in tests/quarantine.json: reported, never failing the run. */
  quarantined: QuarantinedEntry[];
}

interface Tally {
  passed: number;
  failed: number;
}

const failedStatuses = new Set(["failed", "timedOut", "interrupted"]);
const knownStatuses = new Set(["passed", "skipped", ...failedStatuses]);

function collect(suite: unknown, parents: string[], tallies: Map<string, Tally>): void {
  const value = record(suite);
  const title = text(value.title);
  const file = field(value, "file");
  const titles = [...parents];
  if (title !== "" && !(typeof file === "string" && title === file)) titles.push(title);
  for (const spec of list(value.specs ?? [])) {
    const specValue = record(spec);
    const specFile = text(specValue.file);
    const specTitles = [...titles, text(specValue.title)].filter((part) => part !== specFile);
    for (const test of list(specValue.tests)) {
      const testValue = record(test);
      const id = [text(testValue.projectName), specFile, specTitles.join(" › ")].join(" › ");
      const tally = tallies.get(id) ?? { passed: 0, failed: 0 };
      for (const result of list(testValue.results)) {
        // An interrupted or crashed run leaves `status` unset: count it as a failure.
        const raw = record(result).status;
        const status = raw === undefined ? "interrupted" : text(raw);
        if (!knownStatuses.has(status)) throw new Error(`Unknown result status: ${status}`);
        if (status === "passed") tally.passed += 1;
        else if (failedStatuses.has(status)) tally.failed += 1;
      }
      tallies.set(id, tally);
    }
  }
  for (const child of list(value.suites ?? [])) collect(child, titles, tallies);
}

export function classify(
  reports: unknown[],
  generatedAt: string = new Date().toISOString(),
  quarantinedTitles: readonly string[] = [],
): FlakyReport {
  const tallies = new Map<string, Tally>();
  for (const report of reports)
    for (const suite of list(record(report).suites)) collect(suite, [], tallies);
  const flaky: FlakyEntry[] = [];
  const failing: FlakyEntry[] = [];
  const quarantined: QuarantinedEntry[] = [];
  let stable = 0;
  let skipped = 0;
  for (const [id, { passed, failed }] of tallies) {
    if (passed === 0 && failed === 0) skipped += 1;
    else if (failed === 0) stable += 1;
    else {
      const kind = passed > 0 ? "flaky" : "failing";
      if (quarantinedTitles.some((title) => id.includes(title)))
        quarantined.push({ id, passed, failed, kind });
      else (kind === "flaky" ? flaky : failing).push({ id, passed, failed });
    }
  }
  const byId = (a: FlakyEntry, b: FlakyEntry): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  flaky.sort(byId);
  failing.sort(byId);
  quarantined.sort(byId);
  return {
    schema: 1,
    generatedAt,
    totals: {
      tests: tallies.size,
      stable,
      flaky: flaky.length,
      failing: failing.length,
      quarantined: quarantined.length,
      skipped,
    },
    flaky,
    failing,
    quarantined,
  };
}

function summary(report: FlakyReport): string {
  const { totals } = report;
  const lines = [
    "## Flaky test report",
    "",
    `Tests: ${totals.tests}, stable: ${totals.stable}, flaky: ${totals.flaky}, failing: ${totals.failing}, quarantined: ${totals.quarantined}, skipped: ${totals.skipped}.`,
  ];
  for (const entry of report.flaky)
    lines.push(`- flaky: ${entry.id} (${entry.passed} passed, ${entry.failed} failed)`);
  for (const entry of report.failing)
    lines.push(`- failing: ${entry.id} (${entry.passed} passed, ${entry.failed} failed)`);
  for (const entry of report.quarantined)
    lines.push(
      `- quarantined (${entry.kind}): ${entry.id} (${entry.passed} passed, ${entry.failed} failed)`,
    );
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [output, ...inputs] = process.argv.slice(2);
  try {
    if (!output || inputs.length === 0)
      throw new Error("Usage: flaky-report.ts <output.json> <report.json>...");
    const missing = inputs.filter((input) => !existsSync(input));
    if (missing.length) throw new Error(`Missing report files: ${missing.join(", ")}`);
    const reports = inputs.map((input): unknown => JSON.parse(readFileSync(input, "utf8")));
    const quarantine = existsSync("tests/quarantine.json")
      ? list(field(JSON.parse(readFileSync("tests/quarantine.json", "utf8")), "tests")).map(
          (entry) => text(field(entry, "title")),
        )
      : [];
    const report = classify(reports, new Date().toISOString(), quarantine);
    mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(summary(report));
    if (report.totals.tests === report.totals.skipped)
      throw new Error("No browser test executed: a run that skips everything is not stable.");
    if (report.flaky.length || report.failing.length) process.exitCode = 1;
  } catch (error) {
    console.error(errorMessage(error));
    process.exitCode = 2;
  }
}
