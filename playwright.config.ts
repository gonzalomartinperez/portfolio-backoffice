import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { field, list, text } from "./scripts/json.ts";

// Quarantined flaky tests (tests/quarantine.json) are skipped unless the nightly detector opts in.
const quarantined = list(
  field(
    JSON.parse(readFileSync(new URL("./tests/quarantine.json", import.meta.url), "utf8")),
    "tests",
  ),
).map((entry) => text(field(entry, "title")));
const grepInvert =
  process.env.PLAYWRIGHT_INCLUDE_QUARANTINE !== "1" && quarantined.length > 0
    ? new RegExp(quarantined.map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"))
    : undefined;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  ...(grepInvert ? { grepInvert } : {}),
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3107",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "node scripts/test-server.ts",
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    url: "http://localhost:3107",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
