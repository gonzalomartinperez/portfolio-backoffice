import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { member, object } from "../src/features/analytics/adapters/report-values.ts";
import { parseProductSnapshot } from "../src/features/analytics/adapters/validate.ts";
import { parseProductReport } from "../src/features/analytics/adapters/validate-report.ts";
import { sections } from "../src/features/analytics/domain/models.ts";
import {
  eventLocales,
  type ReportSelection,
  regionsFor,
  reportPeriods,
  reportViewports,
} from "../src/features/analytics/domain/report.ts";
import { parseFeedback } from "../src/features/operations/adapters/feedback-validate.ts";
import { parseOperationalSnapshot } from "../src/features/operations/adapters/validate.ts";

const schemaFiles = [
  "operations.schema.json",
  "feedback.schema.json",
  "product-analytics.schema.json",
  "product-analytics-v2.schema.json",
];

export interface ConsumerReport {
  apiRef: string;
  schemas: {
    file: string;
    localSha256: string;
    upstreamSha256: string | null;
    drift: boolean;
  }[];
  examples: { file: string; accepted: boolean; error?: string }[];
  breaking: boolean;
}

function reportSelection(value: unknown): ReportSelection {
  if (!value || typeof value !== "object" || !("selection" in value))
    throw new Error("Missing aggregate selection");
  const selection = object(value.selection, [
    "period",
    "offset",
    "section",
    "region_id",
    "viewport",
    "locale",
  ]);
  const section = member(sections, selection.section);
  const offset = selection.offset;
  if (offset !== 0 && offset !== 1 && offset !== 2) throw new Error("Invalid calendar offset");
  return {
    period: member(reportPeriods, selection.period),
    offset,
    section,
    region: member(regionsFor(section), selection.region_id),
    viewport: member(reportViewports, selection.viewport),
    eventLocale: member(eventLocales, selection.locale),
  };
}

const exampleValidators = new Map<string, (value: unknown) => unknown>([
  ["operations.example.json", parseOperationalSnapshot],
  ["feedback.example.json", parseFeedback],
  ["product-analytics.example.json", parseProductSnapshot],
  [
    "product-analytics-v2.example.json",
    (value) => {
      // The published example wraps the response body: { fixture, scope, report }. The HTTP
      // adapter validates the body itself, so unwrap the envelope when it is present.
      const body =
        value && typeof value === "object" && "report" in value && "scope" in value
          ? value.report
          : value;
      return parseProductReport(body, reportSelection(body));
    },
  ],
]);

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// Maps contain no ref metadata; the CLI replaces this default with its requested ref.
export function checkConsumer(
  upstream: Map<string, string>,
  local: Map<string, string>,
): ConsumerReport {
  const schemas = schemaFiles.map((file) => {
    const localText = local.get(file);
    if (localText === undefined) throw new Error(`Missing local snapshot: ${file}`);
    const upstreamText = upstream.get(file);
    const localSha256 = sha256(localText);
    const upstreamSha256 = upstreamText === undefined ? null : sha256(upstreamText);
    return { file, localSha256, upstreamSha256, drift: localSha256 !== upstreamSha256 };
  });
  const examples: ConsumerReport["examples"] = [];
  for (const [file, validate] of exampleValidators) {
    const text = upstream.get(file);
    if (text === undefined) continue;
    try {
      let value: unknown;
      try {
        value = JSON.parse(text);
      } catch {
        throw new Error("Invalid example JSON");
      }
      validate(value);
      examples.push({ file, accepted: true });
    } catch (error) {
      examples.push({
        file,
        accepted: false,
        error: error instanceof Error ? error.message : "Example validation failed",
      });
    }
  }
  return { apiRef: "develop", schemas, examples, breaking: examples.some((row) => !row.accepted) };
}

function summary(report: ConsumerReport): string {
  return [
    "## Contract consumer check",
    "",
    `API ref: ${report.apiRef}`,
    "",
    ...report.schemas.map(
      (row) =>
        `- ${row.file}: ${row.drift ? "drift (refresh due)" : "unchanged"}${row.upstreamSha256 === null ? " (absent upstream)" : ""}`,
    ),
    ...report.examples.map((row) => `- ${row.file}: ${row.accepted ? "accepted" : "rejected"}`),
    `Available examples: ${report.examples.length}. Breaking: ${report.breaking}.`,
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if ((key !== "--ref" && key !== "--out") || !value || options.has(key))
      throw new Error("Usage: contract-consumer.ts --ref <git-ref> --out <report.json>");
    options.set(key, value);
  }
  const ref = options.get("--ref");
  const output = options.get("--out");
  if (!ref || !/^[A-Za-z0-9._/-]{1,100}$/.test(ref) || !output)
    throw new Error(
      "Usage: contract-consumer.ts --ref <git-ref> --out <report.json> (invalid or missing ref/output)",
    );
  const upstream = new Map<string, string>();
  await Promise.all(
    [...schemaFiles, ...exampleValidators.keys()].map(async (file) => {
      const response = await fetch(
        `https://raw.githubusercontent.com/gonzalomartinperez/portfolio-assistant-api/${ref}/contracts/${file}`,
        { signal: AbortSignal.timeout(20_000) },
      );
      if (response.status === 404) return;
      if (!response.ok) throw new Error(`Download failed for ${file}: HTTP ${response.status}`);
      upstream.set(file, await response.text());
    }),
  );
  const local = new Map(
    await Promise.all(
      schemaFiles.map(
        async (file): Promise<[string, string]> => [
          file,
          await readFile(new URL(`../contracts/${file}`, import.meta.url), "utf8"),
        ],
      ),
    ),
  );
  const report = { ...checkConsumer(upstream, local), apiRef: ref };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(summary(report));
  process.exitCode = report.breaking ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Contract consumer failed");
    process.exitCode = 2;
  }
}
