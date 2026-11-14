import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { errorMessage, field, list, text } from "./json.ts";

// Glob tokens in match order; anything else is a literal character.
const globTokens: [string, string][] = [
  ["**/", "(?:.*/)?"],
  ["**", ".*"],
  ["*", "[^/]*"],
  ["?", "[^/]"],
];

function globToRegex(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; ) {
    const token = globTokens.find(([glob]) => pattern.startsWith(glob, i));
    if (token) {
      out += token[1];
      i += token[0].length;
    } else {
      out += (pattern[i] ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${out}$`);
}

export function filterMutationFiles(files: string[], globs: string[]): string[] {
  const includes = globs.filter((glob) => !glob.startsWith("!")).map(globToRegex);
  const excludes = globs
    .filter((glob) => glob.startsWith("!"))
    .map((glob) => globToRegex(glob.slice(1)));
  return files.filter(
    (file) => includes.some((glob) => glob.test(file)) && !excludes.some((glob) => glob.test(file)),
  );
}

// Stryker splits --mutate on commas and treats the values as globs: refuse names that would be
// split or expanded instead of silently mutating less than changed.
export function unsafeTargets(files: string[]): string[] {
  return files.filter((file) => /[,"'[\]{}()!*?\s]/.test(file));
}

function changedTargets(argv: string[]): string[] {
  const [flag, base, ...extra] = argv;
  if (flag !== "--base" || !base || base.startsWith("-") || extra.length)
    throw new Error("Usage: mutation-changed.ts --base BASE");
  const globs = list(field(JSON.parse(readFileSync("stryker.config.json", "utf8")), "mutate")).map(
    text,
  );
  const files = execFileSync(
    "git",
    ["diff", "-z", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`, "--"],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  const changed = filterMutationFiles(files, globs);
  const unsafe = unsafeTargets(changed);
  if (unsafe.length)
    throw new Error(`Unsupported characters in mutation targets: ${unsafe.join(" ")}`);
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const changed = changedTargets(process.argv.slice(2));
    if (changed.length) console.log(changed.join("\n"));
  } catch (error) {
    console.error(errorMessage(error));
    process.exitCode = 2;
  }
}
