import { expect, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

test("workbench budget and latency use observed data without invented targets", {
  tag: "@owner",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Budget headroom" })).toBeVisible();
  await expect(page.getByText("$0.03", { exact: true })).toBeVisible();
  await expect(page.getByText("$9.97", { exact: true })).toBeVisible();
  await expect(page.getByText("320 ms", { exact: true })).toBeVisible();
  await expect(page.getByText("840 ms", { exact: true })).toBeVisible();
  const meter = page.getByRole("meter", { name: "Budget accounted for" });
  expect(Number(await meter.getAttribute("value"))).toBeCloseTo(0.3);
  await page.getByText("Snapshot details", { exact: true }).click();
  await expect(page.getByText("fixture-1", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore in Grafana" })).toHaveCount(0);
});

test("sampled execution filtering and ID search preserve clear empty states", {
  tag: "@viewer",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.goto("/");
  await page.getByLabel("Filter by outcome", { exact: true }).selectOption("failed");
  await expect(
    page.getByText("No sampled executions match these filters.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Filter by outcome", { exact: true }).selectOption("all");
  await page.getByLabel("Trace ID", { exact: true }).fill("missing");
  await expect(
    page.getByText("No sampled executions match these filters.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Trace ID", { exact: true }).fill("CCCC");
  await page.locator("summary").filter({ hasText: "cccccccccccc" }).click();
  await expect(page.getByText("Vector retrieval", { exact: true })).toBeVisible();
  await expect(page.getByText("Generation", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Trace ID", { exact: true })).toHaveValue("CCCC");
});

test("workbench stays usable at compact, landscape and resized text widths", {
  tag: ["@viewer", "@mobile"],
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?locale=es");
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 844, height: 390 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect(page.getByRole("button", { name: "Actualizar datos", exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await expect(page.getByRole("button", { name: "Actualizar datos", exact: true })).toBeVisible();
});
