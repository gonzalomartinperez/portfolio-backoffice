import { expect, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

test("preferences synchronize language and the single theme authority", { tag: "@owner" }, async ({
  page,
}) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.goto("/");
  await page.getByText("Preferences", { exact: true }).click();
  await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page.getByRole("heading", { name: "Operaciones del portfolio" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Opiniones sobre las respuestas" })).toContainText(
    "82,4%",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("preferences close with Escape and restore their summary focus", { tag: "@viewer" }, async ({
  page,
}) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.goto("/");
  await page.getByText("Preferences", { exact: true }).click();
  await page.getByRole("combobox", { name: "Theme", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox", { name: "Theme", exact: true })).not.toBeVisible();
  await expect(page.locator("summary").filter({ hasText: "Preferences" })).toBeFocused();
});
