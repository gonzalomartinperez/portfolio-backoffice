import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { errorMessage, field, list, text } from "./json.ts";

function globToRegex(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; ) {
    if (pattern.startsWith("**/", i)) {
      out += "(?:.*/)?";
      i += 3;
    } else if (pattern.startsWith("**", i)) {
      out += ".*";
      i += 2;
    } else if (pattern[i] === "*") {
      out += "[^/]*";
      i += 1;
    } else if (pattern[i] === "?") {
      out += "[^/]";
      i += 1;
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

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [flag, base, ...extra] = process.argv.slice(2);
    if (flag !== "--base" || !base || base.startsWith("-") || extra.length)
      throw new Error("Usage: mutation-changed.ts --base BASE");
    const globs = list(
      field(JSON.parse(readFileSync("stryker.config.json", "utf8")), "mutate"),
    ).map(text);
    const files = execFileSync(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`, "--"],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    const changed = filterMutationFiles(files, globs);
    if (changed.length) console.log(changed.join("\n"));
  } catch (error) {
    console.error(errorMessage(error));
    process.exitCode = 2;
  }
}
