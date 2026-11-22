import "server-only";

export const SCHEMA_VERSION = "002-audit";

export function buildInfo() {
  return {
    version: process.env.APP_VERSION || "unknown",
    revision: process.env.APP_REVISION || "unknown",
  };
}
