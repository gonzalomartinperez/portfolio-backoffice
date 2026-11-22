import { buildInfo } from "../../../server/build-info";

export function GET() {
  return Response.json(
    { status: "alive", application: "portfolio-assistant-backoffice", ...buildInfo() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
