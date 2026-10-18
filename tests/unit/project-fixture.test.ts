import assert from "node:assert/strict";
import test from "node:test";
import { verifyProjectDatabase } from "../../scripts/check-project-fixture.ts";
const authority = { containerId: "a".repeat(64), fixtureId: "b".repeat(32) };
const connection =
	"postgresql://portfolio_iam_runtime:synthetic@127.0.0.1:59443/portfolio_iam";
const metadata = () => ({
	Id: authority.containerId,
	Config: {
		Image: "portfolio-assistant-postgres:synthetic-fixture",
		Labels: {
			"io.gmperez.portfolio-project-fixture": authority.fixtureId,
			"org.opencontainers.image.source":
				"https://github.com/gonzalomartinperez/portfolio-assistant-api",
		},
	},
	State: { Running: true },
	NetworkSettings: {
		Ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "59443" }] },
	},
});
test("project IAM fixture requires exact active owned loopback metadata", () => {
	verifyProjectDatabase(
		connection,
		authority,
		"portfolio_iam_runtime",
		metadata,
	);
	for (const fault of [
		"identity",
		"owner",
		"source",
		"stopped",
		"public",
		"port",
		"extra",
	]) {
		const value = metadata();
		if (fault === "identity") value.Id = "c".repeat(64);
		if (fault === "owner")
			value.Config.Labels["io.gmperez.portfolio-project-fixture"] =
				"another-agent";
		if (fault === "source")
			value.Config.Labels["org.opencontainers.image.source"] =
				"https://untrusted.invalid";
		if (fault === "stopped") value.State.Running = false;
		if (fault === "public")
			value.NetworkSettings.Ports["5432/tcp"][0] = {
				HostIp: "0.0.0.0",
				HostPort: "59443",
			};
		if (fault === "port")
			value.NetworkSettings.Ports["5432/tcp"][0] = {
				HostIp: "127.0.0.1",
				HostPort: "1",
			};
		if (fault === "extra")
			value.NetworkSettings.Ports["5432/tcp"].push({
				HostIp: "::",
				HostPort: "59443",
			});
		assert.throws(() =>
			verifyProjectDatabase(
				connection,
				authority,
				"portfolio_iam_runtime",
				() => value,
			),
		);
	}
});
test("missing authority and remote or elevated endpoints fail before inspection", () => {
	const forbidden = () => {
		throw new Error("unexpected inspection");
	};
	assert.throws(
		() =>
			verifyProjectDatabase(
				connection,
				{ containerId: undefined, fixtureId: undefined },
				"portfolio_iam_runtime",
				forbidden,
			),
		/identity is required/,
	);
	for (const value of [
		connection.replace("127.0.0.1", "remote.invalid"),
		connection.replace("portfolio_iam_runtime", "portfolio_bootstrap"),
		`${connection}?options=role%3Dportfolio_bootstrap`,
		`${connection}#ignored`,
	]) {
		assert.throws(
			() =>
				verifyProjectDatabase(
					value,
					authority,
					"portfolio_iam_runtime",
					forbidden,
				),
			/endpoint or identity/,
		);
	}
});
