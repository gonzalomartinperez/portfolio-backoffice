import { readiness } from "../../../server/auth/session";
import { buildInfo, SCHEMA_VERSION } from "../../../server/build-info";

export async function GET() {
  const ready = await readiness();
  return Response.json(
    { status: ready ? "ready" : "unavailable", ...buildInfo(), schema_version: SCHEMA_VERSION },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
