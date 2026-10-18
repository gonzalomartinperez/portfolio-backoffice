import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
	boundaryErrors,
	moduleGraphErrors,
	architectureSourceFile,
} from "../../scripts/check-boundaries.ts";
test("source dependency boundaries and public environment allowlist", () => {
	const sources: Record<string, string> = {};
	for (const file of readdirSync("src", {
		recursive: true,
		encoding: "utf8",
	}).filter(architectureSourceFile)) {
		const name = `src/${file}`;
		sources[name] = readFileSync(name, "utf8");
		assert.deepEqual(
			boundaryErrors(name, readFileSync(name, "utf8")),
			[],
			name,
		);
	}
	assert.deepEqual(moduleGraphErrors(sources), []);
});

test("source collection cannot hide ESM/CommonJS TypeScript dependency violations", () => {
	for (const extension of ["mts", "cts"]) {
		const candidates = {
			"src/features/auth/domain/value.ts": `import "./opaque.${extension}"`,
			[`src/features/auth/domain/opaque.${extension}`]: 'import "react"',
		};
		const sources = Object.fromEntries(
			Object.entries(candidates).filter(([file]) =>
				architectureSourceFile(file),
			),
		);
		assert.equal(Object.keys(sources).length, 2);
		const violations = Object.entries(sources).flatMap(([file, source]) =>
			boundaryErrors(file, source),
		);
		assert.ok(violations.includes("domain dependency"));
		for (const specifier of [
			`.${extension}`,
			extension === "mts" ? ".mjs" : ".cjs",
		]) {
			assert.ok(
				moduleGraphErrors({
					"src/client.tsx": `"use client"; import "./opaque${specifier}"`,
					[`src/opaque.${extension}`]: 'import "server-only"',
				}).some((error) => error.startsWith("client reaches server")),
			);
		}
		assert.ok(
			moduleGraphErrors({
				"src/a.ts": 'import "./folder"',
				[`src/folder/index.${extension}`]: 'import "../a.ts"',
			}).some((error) => error.startsWith("import cycle")),
		);
	}
});
test("boundaries resolve traversal and inspect dynamic and type-only imports", () => {
	const domain = "src/features/operations/domain/example.ts";
	for (const source of [
		'import x from "./../adapters/api"',
		'const x=import("../adapters/api")',
		'type X=import("../adapters/api").X',
		'const x=require("react")',
		"const x=import(destination)",
		'import x = require("react")',
	])
		assert.notEqual(boundaryErrors(domain, source).length, 0, source);
	assert.deepEqual(
		boundaryErrors(domain, 'import type {Message} from "./models"'),
		[],
	);
	assert.notEqual(
		boundaryErrors(
			"src/features/operations/application/example.ts",
			'import x from "./../presentation/chat"',
		).length,
		0,
	);
});

test("architecture detects relative/dynamic cycles and indirect client-to-server leaks", () => {
	for (const source of [
		'export * from "./b"',
		'const b = import("./b.ts")',
		'type B = import("./b.ts").B',
	])
		assert.ok(
			moduleGraphErrors({
				"src/a.ts": source,
				"src/b.ts": 'import "./a.ts"',
			}).some((error) => error.startsWith("import cycle")),
		);
	assert.ok(
		moduleGraphErrors({
			"src/view.tsx": '"use client"; import "./helper"',
			"src/helper.ts": 'export * from "./private"',
			"src/private.ts": 'import "server-only";',
		}).some((error) => error.startsWith("client reaches server")),
	);
	assert.deepEqual(
		moduleGraphErrors({
			"src/view.tsx": '"use client"; import "./action"',
			"src/action.ts":
				'"use server"; import "./private"; export async function act(){return {ok:true}}',
			"src/private.ts": 'import "server-only";',
		}),
		[],
	);
});

test("all feature cores reject platform I/O and adapters cannot render presentation", () => {
	for (const feature of ["auth", "operations"])
		for (const source of [
			'fetch("/api")',
			"process.env.SECRET",
			'globalThis.fetch("/api")',
			'import "../store.ts"',
		])
			assert.ok(
				boundaryErrors(`src/features/${feature}/application/example.ts`, source)
					.length > 0,
			);
	assert.ok(
		boundaryErrors(
			"src/features/operations/adapters/example.ts",
			'import "../presentation/dashboard"',
		).includes("adapter outer dependency"),
	);
});

test("owned application, fixtures and tooling remain type-checked TypeScript", () => {
	for (const directory of ["src", "scripts", "tests"]) {
		const javascript = readdirSync(directory, {
			recursive: true,
			encoding: "utf8",
		}).filter((file) => /\.(?:cjs|mjs|js|jsx)$/.test(file));
		assert.deepEqual(
			javascript,
			[],
			`${directory}: authored JavaScript needs an explicit compatibility decision`,
		);
	}
});

test("platform guards distinguish model properties from browser globals", () => {
	for (const layer of ["domain", "application"]) {
		const file = `src/features/analytics/${layer}/example.ts`;
		assert.deepEqual(
			boundaryErrors(
				file,
				"interface Report { window: string } function period(report: Report) { return report.window; }",
			),
			[],
		);
		for (const source of [
			"const current = window.location;",
			"const current = globalThis.window;",
			"interface Report { window: typeof window }",
			"const { location } = window;",
		])
			assert.ok(boundaryErrors(file, source).length > 0, source);
	}
});

test("client boundaries reject authentication infrastructure imports", () => {
	for (const module of [
		"server/auth/session",
		"server/auth/config",
		"server/auth/runtime",
		"features/auth/adapters/store",
	]) {
		assert.notEqual(
			boundaryErrors(
				"src/components/example.tsx",
				`"use client"; import x from "../${module}"`,
			).length,
			0,
			module,
		);
	}
});

test("client directives remain effective after comments and inside transitive import-equals graphs", () => {
	assert.ok(
		boundaryErrors(
			"src/components/example.tsx",
			'// Header\n"use client"; import "node:fs"',
		).length > 0,
	);
	assert.ok(
		moduleGraphErrors({
			"src/view.tsx": '// Header\n"use client"; import "./helper"',
			"src/helper.ts": 'import database = require("./private")',
			"src/private.ts": 'import { Pool } from "pg"',
		}).some((error) => error.startsWith("client reaches server")),
	);
});

test("client graph resolves emitted JavaScript specifiers and rejects computed loaders", () => {
	assert.ok(
		moduleGraphErrors({
			"src/view.tsx": '"use client"; import "./helper.js"',
			"src/helper.ts": 'import "server-only"',
		}).some((error) => error.startsWith("client reaches server")),
	);
	assert.ok(
		moduleGraphErrors({
			"src/view.tsx": '"use client"; import "./helper"',
			"src/helper.ts": "const module = import(destination)",
		}).some((error) => error.startsWith("client computed dependency")),
	);
});
