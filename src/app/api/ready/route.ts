import { readiness } from "../../../server/auth/session";
export async function GET() {
	const ready = await readiness();
	return Response.json(
		{ status: ready ? "ready" : "unavailable" },
		{ status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
	);
}
