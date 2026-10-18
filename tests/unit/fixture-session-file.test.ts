import assert from "node:assert/strict";
import test from "node:test";
import {
	mkdtemp,
	readFile,
	writeFile,
	symlink,
	stat,
	rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFixtureSessions } from "../../scripts/auth-fixture-session.ts";

test("session artifacts reject existing files and symlinks before minting credentials", async () => {
	const directory = await mkdtemp(join(tmpdir(), "portfolio-session-file-"));
	try {
		const target = join(directory, "existing");
		const link = join(directory, "symlink");
		await writeFile(target, "preserve", { mode: 0o644 });
		const originalMode = (await stat(target)).mode & 0o777;
		await symlink(target, link);
		let calls = 0;
		const produce = async (): Promise<never> => {
			calls++;
			throw new Error("synthetic failure");
		};
		for (const path of [target, link])
			await assert.rejects(writeFixtureSessions(path, produce), {
				code: "EEXIST",
			});
		assert.equal(calls, 0);
		assert.equal(await readFile(target, "utf8"), "preserve");
		assert.equal((await stat(target)).mode & 0o777, originalMode);
		const fresh = join(directory, "fresh");
		await assert.rejects(
			writeFixtureSessions(fresh, async () => {
				assert.equal((await stat(fresh)).mode & 0o777, 0o600);
				throw new Error("synthetic failure");
			}),
			/synthetic failure/,
		);
		await assert.rejects(stat(fresh), { code: "ENOENT" });
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("fresh session artifacts are private and preserve their serialized content", async () => {
	const directory = await mkdtemp(join(tmpdir(), "portfolio-session-file-"));
	try {
		const path = join(directory, "sessions.json");
		const owner = {
			userId: "synthetic-owner",
			role: "owner" as const,
			cookie: {
				name: "fixture",
				value: "synthetic",
				url: "http://localhost:3107",
				httpOnly: true,
				secure: false,
				sameSite: "Lax" as const,
			},
		};
		const viewer = {
			...owner,
			userId: "synthetic-viewer",
			role: "viewer" as const,
		};
		await writeFixtureSessions(path, async () => ({ owner, viewer }));
		assert.equal((await stat(path)).mode & 0o777, 0o600);
		assert.deepEqual(JSON.parse(await readFile(path, "utf8")), {
			owner,
			viewer,
		});
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
