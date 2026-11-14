import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./support/ui.ts";

test("privacy notice is bilingual, accessible and public without starting OAuth", {
  tag: "@anonymous",
}, async ({ page }) => {
  for (const locale of ["en", "es"]) {
    await page.goto(`/privacy?locale=${locale}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      locale === "en" ? "Privacy and data" : "Privacidad y datos",
    );
    await expect(
      page.getByRole("link", {
        name: locale === "en" ? "Contact the maintainer" : "Contactar al responsable",
      }),
    ).toHaveAttribute(
      "href",
      `https://gonzalomartinperez.com/${locale === "es" ? "es/" : ""}contact`,
    );
    await expectNoAxeViolations(page);
  }
});
