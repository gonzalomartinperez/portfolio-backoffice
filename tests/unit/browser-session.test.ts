import assert from "node:assert/strict";
import test from "node:test";
import { createBrowserSession } from "../../src/features/auth/adapters/browser-session.ts";

test("browser session maps SDK responses to a narrow result and reviewed destinations", async () => {
	const requests: unknown[] = [];
	const navigation: string[] = [];
	const session = createBrowserSession(
		{
			signIn: {
				social: async (input) => {
					requests.push(input);
					return { error: null, data: { redirect: true } };
				},
			},
			linkSocial: async (input) => {
				requests.push(input);
				return { error: null };
			},
			signOut: async () => ({ error: null }),
		},
		(path) => navigation.push(path),
	);
	assert.equal(await session.signIn("github", "es"), true);
	assert.equal(await session.link("google", "en"), true);
	assert.equal(await session.signOut("es"), true);
	assert.deepEqual(requests, [
		{
			provider: "github",
			callbackURL: "/?locale=es",
			errorCallbackURL: "/sign-in?locale=es&error=access",
		},
		{ provider: "google", callbackURL: "/access?locale=en" },
	]);
	assert.deepEqual(navigation, ["/sign-in?locale=es"]);
});

for (const result of [
	null,
	undefined,
	{},
	{ error: "private SDK error" },
	{ error: undefined },
	"invalid",
])
	test("invalid or rejected SDK responses never navigate or automatically retry", async () => {
		let calls = 0;
		const request = async () => {
			calls++;
			return result;
		};
		const session = createBrowserSession(
			{ signIn: { social: request }, linkSocial: request, signOut: request },
			() => assert.fail("unexpected navigation"),
		);
		assert.equal(await session.signIn("google", "en"), false);
		assert.equal(await session.link("github", "es"), false);
		assert.equal(await session.signOut("en"), false);
		assert.equal(calls, 3);
	});

test("network failure remains a single attempt handled by presentation", async () => {
	let calls = 0;
	const request = async () => {
		calls++;
		throw new Error("synthetic network failure");
	};
	const session = createBrowserSession(
		{ signIn: { social: request }, linkSocial: request, signOut: request },
		() => assert.fail("unexpected navigation"),
	);
	await assert.rejects(session.signOut("en"), /synthetic network failure/);
	assert.equal(calls, 1);
});
