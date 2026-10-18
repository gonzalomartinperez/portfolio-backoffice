import assert from "node:assert/strict";
import test from "node:test";
import {
	boundaryErrors,
	moduleGraphErrors,
} from "../../scripts/check-boundaries.ts";
import { runtimeTracePath } from "../../scripts/prepare-runtime.ts";

test("private composition stays private through plain CLI-safe config and barrels", () => {
	for (const specifier of ["../server/auth/config", "@/server/auth/config"]) {
		assert.ok(
			boundaryErrors(
				"src/client/view.tsx",
				`"use client"; import {readConfig} from "${specifier}"`,
			).includes("client server dependency"),
		);
	}
	assert.ok(
		moduleGraphErrors({
			"src/client.tsx": '"use client"; import "./helper"',
			"src/helper.ts": 'export * from "./server/auth/config"',
			"src/server/auth/config.ts":
				'export const readConfig = () => "synthetic"',
		}).some((error) => error.startsWith("client reaches server")),
	);
});

test("explicit Server Action RPC and client-safe shared UI stay valid", () => {
	assert.deepEqual(
		moduleGraphErrors({
			"src/client.tsx":
				'"use client"; import {act} from "./server/auth/actions"; import "./shared/ui/button"',
			"src/server/auth/actions.ts":
				'"use server"; import "./config"; export async function act(){return {ok:true}}',
			"src/server/auth/config.ts": 'export const secret="synthetic"',
			"src/shared/ui/button.tsx": "export function Button(){return null}",
		}),
		[],
	);
});

test("migration trace admits only the relocated CLI factory closure", () => {
	for (const path of [
		"src/server/auth/config.ts",
		"src/server/auth/runtime.ts",
		"src/features/auth/adapters/store.ts",
		"src/features/auth/domain/access.ts",
	])
		assert.equal(runtimeTracePath(path), path);
	for (const path of [
		"src/server/auth/session.ts",
		"src/server/auth/actions.ts",
		"src/server/private.ts",
		"src/features/auth/presentation/sign-in.tsx",
		"scripts/auth-fixture-session.ts",
	])
		assert.throws(() => runtimeTracePath(path));
});
