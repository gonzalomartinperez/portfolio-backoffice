import { feedbackPayload } from "../tests/fixtures/feedback.ts";
import { createServer, type Server } from "node:http";
import { productPayload } from "../tests/fixtures/product-analytics.ts";
import { operationalPayload } from "../tests/fixtures/operations.ts";
import { productReportPayload } from "../tests/fixtures/product-report.ts";
import { reportSelection } from "../src/features/analytics/presentation/selection.ts";

export const operationsFixtureToken = "public-loopback-operations-fixture";
export function startOperationsFixture({
	port = 8117,
	host = "127.0.0.1",
	mode = "available",
}: {
	port?: number;
	host?: "127.0.0.1" | "0.0.0.0";
	mode?: string;
} = {}): Promise<Server> {
	if (!["available", "unavailable", "malformed"].includes(mode))
		throw new Error("Unknown operational fixture mode");
	const server = createServer((incoming, outgoing) => {
		outgoing.setHeader("Cache-Control", "no-store");
		const url = new URL(incoming.url ?? "/", "http://fixture.invalid");
		const detailed = url.pathname === "/internal/ops/v2/product-analytics";
		if (
			!detailed &&
			![
				"/internal/ops/v1/status",
				"/internal/ops/v1/product-analytics",
				"/internal/ops/v1/feedback",
			].includes(incoming.url ?? "")
		) {
			outgoing.writeHead(404).end();
			return;
		}
		if (incoming.headers.authorization !== `Bearer ${operationsFixtureToken}`) {
			outgoing.writeHead(401).end();
			return;
		}
		if (mode === "unavailable") {
			outgoing.writeHead(503).end();
			return;
		}
		if (detailed) {
			const keys = [
				"period",
				"offset",
				"section",
				"region_id",
				"viewport",
				"locale",
			];
			if (
				[...url.searchParams.keys()].some(
					(key) =>
						!keys.includes(key) || url.searchParams.getAll(key).length !== 1,
				)
			) {
				outgoing.writeHead(422).end();
				return;
			}
			const selection = reportSelection({
				...Object.fromEntries(url.searchParams),
				region: url.searchParams.get("region_id") ?? undefined,
				eventLocale: url.searchParams.get("locale") ?? undefined,
			});
			if (!selection) {
				outgoing.writeHead(422).end();
				return;
			}
			outgoing.setHeader("Content-Type", "application/json");
			outgoing.end(
				JSON.stringify(
					mode === "malformed"
						? { status: "unsupported" }
						: productReportPayload(selection),
				),
			);
			return;
		}
		outgoing.setHeader("Content-Type", "application/json");
		outgoing.end(
			JSON.stringify(
				mode === "malformed"
					? { status: "unsupported" }
					: incoming.url === "/internal/ops/v1/feedback"
						? feedbackPayload
						: incoming.url === "/internal/ops/v1/product-analytics"
							? productPayload
							: operationalPayload,
			),
		);
	});
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, host, () => resolve(server));
	});
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const args = process.argv.slice(2);
	if (args.some((value) => value !== "--container-fixture") || args.length > 1)
		throw new Error(
			"Only the explicit private-container fixture flag is supported",
		);
	const server = await startOperationsFixture({
		host: args.length === 1 ? "0.0.0.0" : "127.0.0.1",
		mode: process.env.OPERATIONS_FIXTURE_MODE ?? "available",
	});
	let stopped = false;
	const stop = () => {
		if (stopped) return;
		stopped = true;
		server.closeAllConnections();
		server.close();
	};
	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);
}
