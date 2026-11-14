import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { test as setup } from "@playwright/test";
import { type Role, readSessionCookie, storageStatePath } from "./auth.ts";

// Runs once per invocation as the `setup` project that role projects depend on. The session cookie
// stays in git-ignored, owner-only files; it is never logged or attached to a report.
for (const role of ["owner", "viewer"] as const satisfies readonly Role[]) {
  setup(`authenticate ${role}`, async ({ context }) => {
    await context.addCookies([readSessionCookie(role)]);
    const state = await context.storageState();
    const file = storageStatePath(role);
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    writeFileSync(file, JSON.stringify(state), { mode: 0o600 });
  });
}
