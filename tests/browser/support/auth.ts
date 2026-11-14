import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { field, record, text } from "../../../scripts/json.ts";

export type Role = "owner" | "viewer";

/** Private signed fixture sessions written by scripts/test-server.ts; never print or upload. */
export const sessionsFile = resolve(".artifacts/fixture-sessions.json");

/** Per-role Playwright storage state produced by auth.setup.ts under the git-ignored .artifacts/. */
export function storageStatePath(role: Role): string {
  return resolve(".artifacts/storage-state", `${role}.json`);
}

export function readSessionCookie(role: Role) {
  const sessions = record(JSON.parse(readFileSync(sessionsFile, "utf8")));
  const cookie = record(field(sessions, role, "cookie"));
  return {
    name: text(cookie.name),
    value: text(cookie.value),
    url: "http://localhost:3107",
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };
}
