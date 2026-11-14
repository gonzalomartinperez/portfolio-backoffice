// Source-tree enumeration shared by the security tests (static, no module execution).
import { readdirSync, readFileSync } from "node:fs";

export function sourceFiles(root = "src"): string[] {
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .map((path) => `${root}/${path}`)
    .filter((path) => /\.(ts|tsx|js|jsx)$/.test(path))
    .sort();
}

export const read = (path: string): string => readFileSync(path, "utf8");

const directive = (name: string) =>
  new RegExp(`^\\s*(?:(?://[^\\n]*\\n|/\\*[\\s\\S]*?\\*/)\\s*)*["']${name}["']`);

export const hasDirective = (source: string, name: "use client" | "use server") =>
  directive(name).test(source);

export const exportedFunctions = (source: string): string[] =>
  [...source.matchAll(/^export\s+(?:async\s+)?(?:function\s+|const\s+)(\w+)/gm)].map(
    (match) => match[1] ?? "",
  );
