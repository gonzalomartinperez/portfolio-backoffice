import { expect, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

test("operational failure presents safe no-data state without fabricated metrics", {
  tag: "@viewer",
}, async ({ page }) => {
  test.skip(available, "Separate unavailable/malformed fixture lifecycle");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Operational data is unavailable" }),
  ).toBeVisible();
  await expect(page.getByText("fixture-1", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Answer feedback" })).toContainText(
    "Feedback is unavailable; missing data is not zero.",
  );
  await expect(
    page.getByRole("region", { name: "Answer feedback" }).getByRole("definition"),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh data" })).toBeVisible();
  const response = await page.request.get("/api/operations");
  expect(response.status()).toBe(503);
  expect(await response.text()).not.toContain("public-loopback-operations-fixture");
});

test("calendar operational failure stays unavailable without fabricating zero counts", {
  tag: "@viewer",
}, async ({ page }) => {
  test.skip(available, "Unavailable fixture only");
  await page.goto("/analytics?locale=en");
  await expect(
    page.getByRole("heading", {
      name: "Product data is unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Page views", exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Seven-day event details", exact: true }),
  ).toBeVisible();
});
