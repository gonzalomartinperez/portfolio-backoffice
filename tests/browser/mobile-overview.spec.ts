import { expect, test } from "@playwright/test";
import { available } from "./support/fixture.ts";
import { expectNoAxeViolations } from "./support/ui.ts";

for (const locale of ["en", "es"] as const) {
  for (const theme of ["dark", "light"] as const) {
    test(`mobile overview is accessible in ${locale}/${theme} without horizontal clipping`, {
      tag: ["@viewer", "@mobile"],
    }, async ({ page }) => {
      test.skip(!available, "Available-mode lifecycle only");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/?locale=${locale}`);
      await expect(
        page.getByRole("heading", {
          name: locale === "es" ? "Operaciones del portfolio" : "Portfolio operations",
          exact: true,
        }),
      ).toBeVisible();
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      expect(
        await page
          .getByRole("searchbox")
          .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      await expectNoAxeViolations(page, ["wcag2a", "wcag2aa", "wcag21aa"]);
      await page.screenshot({
        path: `test-results/backoffice-${test.info().project.name}-mobile-${locale}-${theme}.png`,
        fullPage: true,
      });
    });
  }
}
