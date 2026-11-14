import { expect, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

test("owner receives validated fixture metrics and restricted access navigation", {
  tag: "@owner",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Portfolio operations" })).toBeVisible();
  await expect(page.getByText("Synthetic fixture data · not production telemetry")).toBeVisible();
  await expect(page.getByText("fixture-1", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage access" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Website interactions" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore website data" })).toHaveAttribute(
    "href",
    "/analytics?locale=en",
  );
  const product = page.getByRole("region", { name: "Website interactions" });
  const summary = product.locator("dl");
  await expect(summary).toHaveCSS("display", "flex");
  const cells = summary.locator(":scope > div");
  expect(await cells.count()).toBe(3);
  const bounds = await cells.evaluateAll((elements) =>
    elements.map((element) => {
      const label = element.querySelector("dt")?.getBoundingClientRect();
      const count = element.querySelector("dd")?.getBoundingClientRect();
      return Boolean(
        label && count && Math.abs(label.left - count.left) < 1 && count.top >= label.bottom,
      );
    }),
  );
  expect(bounds.every(Boolean)).toBe(true);
  const feedback = page.getByRole("region", { name: "Answer feedback" });
  await expect(feedback).toBeVisible();
  await expect(feedback.getByText("14", { exact: true })).toBeVisible();
  await expect(feedback.getByText("3", { exact: true })).toBeVisible();
  await expect(feedback.getByText("82.4%", { exact: true })).toBeVisible();
  await expect(feedback).toContainText("not a measure of verified accuracy");
  const data = await page.request.get("/api/operations");
  expect(data.ok()).toBe(true);
  expect(data.headers()["cache-control"]).toContain("no-store");
  expect(await data.text()).not.toContain("public-loopback-operations-fixture");
  await expect(page.getByRole("table", { name: "Executions" })).toBeVisible();
  await page.getByRole("application").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".recharts-tooltip-wrapper")).toBeVisible();
  await page.getByLabel("Metric", { exact: true }).selectOption("tokens");
  await expect(page.getByRole("table", { name: "Tokens" })).toBeVisible();
  await expect(page.getByRole("table").getByRole("row", { name: /Input tokens/ })).toBeVisible();
  await page.getByLabel("Metric", { exact: true }).selectOption("executions");
  await expect(page.getByRole("table", { name: "Executions" })).toBeVisible();
  await page.locator("summary").filter({ hasText: "cccccccccccc" }).click();
  await expect(page.getByText("Vector retrieval", { exact: true })).toBeVisible();
  await expect(page.getByText("Generation", { exact: true })).toBeVisible();
  await expect(page.getByText("Graph retrieval", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: `test-results/backoffice-${test.info().project.name}-desktop-en.png`,
    fullPage: true,
  });
});
