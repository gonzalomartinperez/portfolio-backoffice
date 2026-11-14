// Source-tree enumeration shared by the security tests (static, no module execution).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import ts from "@typescript/typescript6";

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

// Runtime exports by name, from the TypeScript AST so `export const A = ..., B = ...` is seen.
// Opaque forms (`export { x as GET }`, `export *`, destructured exports) fail instead of hiding.
export function runtimeExports(source: string, file: string): string[] {
  const kind = file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const names: string[] = [];
  for (const node of tree.statements) {
    if (ts.isExportDeclaration(node)) {
      assert.ok(node.isTypeOnly, `${file}: re-exports hide runtime exports`);
    } else if (ts.isExportAssignment(node)) {
      names.push("default");
    } else if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node)?.map((modifier) => modifier.kind) ?? [];
      if (!modifiers.includes(ts.SyntaxKind.ExportKeyword)) continue;
      const fallback = modifiers.includes(ts.SyntaxKind.DefaultKeyword) ? "default" : "";
      if (ts.isVariableStatement(node))
        for (const declaration of node.declarationList.declarations) {
          assert.ok(ts.isIdentifier(declaration.name), `${file}: destructured export`);
          names.push(declaration.name.text);
        }
      else if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node))
        names.push(node.name?.text ?? fallback);
    }
  }
  return names;
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

// Enumerates the real surface: pages, route handlers (per HTTP method) and "use server" exports.
export function enumerateSurface() {
  // The Pages Router would add routes this enumeration cannot see.
  for (const dir of ["src/pages", "pages"]) assert.equal(existsSync(dir), false, `${dir} exists`);
  const surface = new Map<string, string>();
  const add = (key: string, file: string) => {
    assert.equal(surface.has(key), false, `duplicate surface identity ${key}`);
    surface.set(key, file);
  };
  for (const file of sourceFiles()) {
    const source = read(file);
    const segments = file.replace(/^src\/app\/?/, "").split("/");
    const name = segments.pop() ?? "";
    const path = `/${segments
      .filter((part) => !/^\(.*\)$/.test(part))
      .map(decodeURIComponent)
      .join("/")}`;
    if (file.startsWith("src/app/") && /^page\.(tsx?|jsx?)$/.test(name)) add(`page ${path}`, file);
    if (file.startsWith("src/app/") && /^route\.(tsx?|jsx?)$/.test(name)) {
      const found = runtimeExports(source, file).filter((exported) => METHODS.includes(exported));
      assert.ok(found.length > 0, `${file}: no HTTP method handler`);
      for (const method of found) add(`route ${method} ${path}`, file);
    }
    if (hasDirective(source, "use server"))
      for (const action of runtimeExports(source, file)) add(`action ${file}#${action}`, file);
    else if (/["']use server["']/.test(source))
      assert.fail(`${file}: inline "use server" is not enumerable; use a top-level directive`);
  }
  return surface;
}
