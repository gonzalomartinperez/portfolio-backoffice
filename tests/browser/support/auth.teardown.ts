import { rmSync } from "node:fs";
import { dirname } from "node:path";
import { test as teardown } from "@playwright/test";
import { storageStatePath } from "./auth.ts";

// Teardown of the `setup` project: the per-role storage state holds signed session cookies, so it
// is deleted as soon as every dependent project has finished (test-server.ts removes its source).
teardown("remove per-role storage state", () => {
  rmSync(dirname(storageStatePath("owner")), { recursive: true, force: true });
});
