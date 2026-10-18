import { open, unlink } from "node:fs/promises";
import { makeSignature } from "better-auth/crypto";
import { readAuthConfiguration } from "../src/features/auth/config.ts";
import { createAuthRuntime } from "../src/features/auth/runtime.ts";
import { verifySessionFixture } from "./check-project-fixture.ts";

export async function fixtureSession(
	role: "owner" | "viewer",
	configuration = readAuthConfiguration(process.env),
) {
	verifySessionFixture(configuration.origin, configuration.databaseUrl, {
		containerId: process.env.PROJECT_FIXTURE_CONTAINER,
		fixtureId: process.env.PROJECT_FIXTURE_ID,
	});
	const { auth, pool, store } = createAuthRuntime(configuration);
	try {
		const context = await auth.$context;
		const email =
			role === "owner" ? configuration.ownerEmail : "viewer@example.test";
		let user = await context.internalAdapter.findUserByEmail(email);
		if (!user) {
			if (role === "viewer") {
				await pool.query(
					'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,now(),now())',
					["fixture-viewer", "Fixture Viewer", email],
				);
				await pool.query(
					"INSERT INTO backoffice_member(user_id,role) VALUES($1,'viewer')",
					["fixture-viewer"],
				);
			} else
				await context.internalAdapter.createUser(
					{ name: "Fixture Owner", email, emailVerified: true },
					{ method: "oauth", oauth: { providerId: "google" } },
				);
			user = await context.internalAdapter.findUserByEmail(email);
		}
		if (!user) throw new Error("Fixture identity could not be created");
		if (role === "viewer")
			await pool.query(
				"UPDATE backoffice_member SET revoked_at=NULL WHERE user_id=$1",
				[user.user.id],
			);
		const session = await context.internalAdapter.createSession(user.user.id);
		if (!session) throw new Error("Fixture session could not be created");
		const cookie = context.authCookies.sessionToken;
		const value = encodeURIComponent(
			`${session.token}.${await makeSignature(session.token, configuration.secret)}`,
		);
		const access = await store.access({
			id: user.user.id,
			name: user.user.name,
			email: user.user.email,
		});
		return {
			userId: user.user.id,
			role: access?.role,
			cookie: {
				name: cookie.name,
				value,
				url: configuration.origin,
				httpOnly: true,
				secure: cookie.attributes.secure,
				sameSite: "Lax" as const,
			},
		};
	} finally {
		await pool.end();
	}
}
export async function writeFixtureSessions(
	destination: string,
	produce: () => Promise<{
		owner: Awaited<ReturnType<typeof fixtureSession>>;
		viewer: Awaited<ReturnType<typeof fixtureSession>>;
	}>,
) {
	const file = await open(destination, "wx", 0o600);
	try {
		await file.writeFile(JSON.stringify(await produce()));
	} catch (error: unknown) {
		await unlink(destination);
		throw error;
	} finally {
		await file.close();
	}
}
if (import.meta.url === `file://${process.argv[1]}`) {
	const destination = process.env.BACKOFFICE_FIXTURE_SESSION_FILE;
	if (!destination)
		throw new Error(
			"BACKOFFICE_FIXTURE_SESSION_FILE is required; session values are never printed",
		);
	await writeFixtureSessions(destination, async () => ({
		owner: await fixtureSession("owner"),
		viewer: await fixtureSession("viewer"),
	}));
	console.log("Fixture sessions written to the requested private artifact.");
}
