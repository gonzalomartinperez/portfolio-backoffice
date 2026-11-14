import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    include: [
      "tests/unit/auth-callback.test.ts",
      "tests/unit/auth-config.test.ts",
      "tests/unit/bounded-json.test.ts",
      "tests/unit/browser-session.test.ts",
      "tests/unit/manage-access.test.ts",
      "tests/unit/feedback.test.ts",
      "tests/unit/operational-insights.test.ts",
      "tests/unit/product-analytics.test.ts",
      "tests/unit/operations-fixture.test.ts",
      "tests/unit/operations.test.ts",
      "tests/unit/product-report.test.ts",
    ],
  },
});
