import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function releaseNotes(
  changelog: string,
  version: string,
): { version: string; notes: string | null } {
  if (!/^\d+\.\d+\.\d+$/.test(version) || version.trim() !== version)
    throw new Error("Version must be X.Y.Z.");
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const section = new RegExp(
    `^## \\[${escapedVersion}\\][^\\n]*\\n(.*?)(?=^## \\[|^\\[[^\\]]+\\]: |(?![\\s\\S]))`,
    "ms",
  ).exec(changelog);
  if (!section) return { version, notes: null };
  const notes = (section[1] ?? "").trim();
  if (!notes) throw new Error(`CHANGELOG section for ${version} is empty.`);
  return { version, notes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputPath = process.argv[2];
  if (!outputPath) throw new Error("Usage: node scripts/release-notes.ts <notes-path>");
  const manifest: unknown = JSON.parse(readFileSync("package.json", "utf8"));
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !("version" in manifest) ||
    typeof manifest.version !== "string"
  )
    throw new Error("package.json must contain a string version.");
  const result = releaseNotes(readFileSync("CHANGELOG.md", "utf8"), manifest.version);
  if (result.notes !== null) writeFileSync(outputPath, result.notes);
  console.log(`version=${result.version}`);
  console.log(`has_section=${result.notes !== null}`);
}
