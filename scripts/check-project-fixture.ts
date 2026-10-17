import { execFileSync } from "node:child_process";

type Authority = {
	containerId: string | undefined;
	fixtureId: string | undefined;
};
const record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function inspectContainer(identity: string): unknown {
	try {
		return JSON.parse(
			execFileSync(
				"docker",
				["container", "inspect", "--format", "{{json .}}", identity],
				{ encoding: "utf8", timeout: 10000, stdio: "pipe" },
			),
		);
	} catch {
		throw new Error("Cannot verify the isolated IAM fixture container");
	}
}

export function verifyProjectDatabase(
	connection: string,
	authority: Authority,
	role: "portfolio_iam_runtime" | "portfolio_iam_migrator",
	inspect: (identity: string) => unknown = inspectContainer,
): void {
	if (
		!authority.containerId ||
		!authority.fixtureId ||
		!/^[a-f0-9]{64}$/.test(authority.containerId) ||
		!/^[a-f0-9]{32}$/.test(authority.fixtureId)
	)
		throw new Error("Explicit isolated IAM fixture identity is required");
	let url: URL;
	try {
		url = new URL(connection);
	} catch {
		throw new Error("Invalid isolated IAM fixture connection");
	}
	if (
		!["postgres:", "postgresql:"].includes(url.protocol) ||
		url.hostname !== "127.0.0.1" ||
		url.pathname !== "/portfolio_iam" ||
		url.username !== role ||
		url.search ||
		url.hash
	)
		throw new Error("Isolated IAM fixture endpoint or identity is invalid");
	const metadata = inspect(authority.containerId);
	if (!record(metadata)) throw new Error("Invalid IAM fixture metadata");
	const config = metadata.Config;
	const state = metadata.State;
	const network = metadata.NetworkSettings;
	if (!record(config) || !record(state) || !record(network))
		throw new Error("Incomplete IAM fixture metadata");
	const labels = config.Labels;
	const ports = network.Ports;
	if (!record(labels) || !record(ports))
		throw new Error("Missing IAM fixture ownership or ports");
	const bindings = ports["5432/tcp"];
	const binding =
		Array.isArray(bindings) && bindings.length === 1 ? bindings[0] : null;
	if (
		metadata.Id !== authority.containerId ||
		state.Running !== true ||
		typeof config.Image !== "string" ||
		!config.Image.startsWith("portfolio-assistant-postgres:") ||
		labels["io.gmperez.portfolio-project-fixture"] !== authority.fixtureId ||
		labels["org.opencontainers.image.source"] !==
			"https://github.com/gonzalomartinperez/portfolio-assistant-api" ||
		!record(binding) ||
		binding.HostIp !== "127.0.0.1" ||
		binding.HostPort !== url.port
	)
		throw new Error("IAM fixture does not match its owned loopback container");
}
