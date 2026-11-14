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

// Flaky tests fail the run on main or a release; elsewhere (pull requests) they only warn
// (testing.md section 6). PLAYWRIGHT_FAIL_ON_FLAKY=1 forces the strict mode.
const failOnFlakyTests =
  process.env.GITHUB_BASE_REF === "main" ||
  process.env.GITHUB_REF === "refs/heads/main" ||
  process.env.GITHUB_REF?.startsWith("refs/heads/gh-readonly-queue/main/") === true ||
  process.env.PLAYWRIGHT_FAIL_ON_FLAKY === "1";

// Visual regression (PBO-M2-4) runs only with VISUAL=1, in the pinned Playwright container, so
// the default role projects never run @visual tests. A project-level grepInvert replaces the
// top-level one, so the quarantine pattern is carried over.
const visual = process.env.VISUAL === "1";
const withoutVisual = grepInvert ? new RegExp(`${grepInvert.source}|@visual\\b`) : /@visual\b/;

// Role is a dimension only where a test needs it: every journey test carries exactly one of
// @anonymous, @owner or @viewer, and each desktop browser runs it once in that role.
const roles = ["anonymous", "owner", "viewer"] as const;
type Role = (typeof roles)[number];
const storageState = (role: Role) =>
  role === "anonymous" ? undefined : `.artifacts/storage-state/${role}.json`;
const desktopBrowsers = [
  { name: "chromium", device: devices["Desktop Chrome"] },
  { name: "firefox", device: devices["Desktop Firefox"] },
  { name: "webkit", device: devices["Desktop Safari"] },
];
// Device profiles run only the @mobile journeys, all authored for the viewer role.
const mobileDevices = [
  { name: "iphone-15", device: devices["iPhone 15"] },
  { name: "pixel-7", device: devices["Pixel 7"] },
];

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  ...(grepInvert ? { grepInvert } : {}),
  ...(process.env.CI ? { workers: 2 } : {}),
  failOnFlakyTests,
  // CI keeps a blob report (merge with `npx playwright merge-reports`); local runs get HTML.
  reporter: process.env.CI ? [["list"], ["blob"]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3107",
    // Blob reports embed traces and CI uploads them, so CI records none (never upload traces).
    trace: process.env.CI ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Writes per-role storage state from .artifacts/fixture-sessions.json (test-server.ts).
    // Its teardown deletes that storage state once every dependent project has finished.
    { name: "setup", testMatch: /support\/auth\.setup\.ts$/, teardown: "cleanup" },
    { name: "cleanup", testMatch: /support\/auth\.teardown\.ts$/ },
    ...desktopBrowsers.flatMap(({ name, device }) =>
      roles.map((role) => ({
        name: `${name}-${role}`,
        grep: new RegExp(`@${role}\\b`),
        grepInvert: withoutVisual,
        use: { ...device, storageState: storageState(role) },
        ...(role === "anonymous" ? {} : { dependencies: ["setup"] }),
      })),
    ),
    ...mobileDevices.map(({ name, device }) => ({
      name,
      grep: /@mobile\b/,
      grepInvert: withoutVisual,
      use: { ...device, storageState: storageState("viewer") },
      dependencies: ["setup"],
    })),
    // Pre-redesign visual baseline: desktop Chromium per role; viewports are set by the tests.
    ...(visual
      ? roles.map((role) => ({
          name: `visual-${role}`,
          grep: new RegExp(`(?=.*@visual\\b)(?=.*@${role}\\b)`),
          use: { ...devices["Desktop Chrome"], storageState: storageState(role) },
          ...(role === "anonymous" ? {} : { dependencies: ["setup"] }),
        }))
      : []),
  ],
  // Baselines live next to the specs; one image per name, independent of the project.
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled", caret: "hide" },
  },
  webServer: {
    command: "node scripts/test-server.ts",
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    url: "http://localhost:3107",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
