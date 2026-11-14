import { readFileSync } from "node:fs";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const ratchet = JSON.parse(
  readFileSync(new URL("./quality/ratchets/coverage.json", import.meta.url), "utf8"),
) as {
  floors: { lines: number; branches: number; functions: number; statements: number };
};

// One runner for the repository's TypeScript tests (DR-09, PBO-M2-1). The `unit` project runs on
// every `npm test`; the `component` project (Vitest Browser Mode, Chromium and WebKit) runs in the
// CI `component` job (`npm run test:component`); the `integration` project owns throwaway
// Testcontainers PostgreSQL databases and runs in the CI `database` job (`npm run test:auth`).
// Coverage is measured on `src/` only and reported apart for `scripts/`
// (`npm run test:coverage:scripts`); the floors live in quality/ratchets/coverage.json and may
// only tighten.
export default defineConfig({
  test: {
    // Same assertion library as before the port (node:assert); no globals, explicit imports.
    globals: false,
    // Leaked fakes or timers must never couple two tests.
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          // Several guard tests spawn git, Biome or Next type generation.
          testTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // Container start and the full OAuth journeys need room; files stay serial.
          testTimeout: 120_000,
          hookTimeout: 180_000,
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          include: ["tests/component/**/*.test.tsx"],
          // Real Chromium and WebKit (PBO-M2-2); CSS modules and the token sheet load as in Next.
          browser: {
            enabled: true,
            headless: true,
            // WebKit cold starts slowly on busy runners and developer machines (default 60 s).
            connectTimeout: 180_000,
            provider: playwright(),
            instances: [{ browser: "chromium" }, { browser: "webkit" }],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text-summary", "json-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      thresholds: ratchet.floors,
    },
  },
});
