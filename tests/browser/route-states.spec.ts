import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./support/ui.ts";

// PBO-M3-5: unknown addresses render the bilingual not-found state inside the app shell.
test("unknown routes show an accessible, localized not-found page", {
  tag: "@anonymous",
}, async ({ page }) => {
  for (const [locale, tag, title, home] of [
    ["en", "en-US", "Page not found", "Back to the overview"],
    ["es", "es-419", "Página no encontrada", "Volver al resumen"],
  ] as const) {
    const response = await page.goto(`/does-not-exist?locale=${locale}`);
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", tag);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByRole("link", { name: home })).toHaveAttribute(
      "href",
      `/?locale=${locale}`,
    );
    await expectNoAxeViolations(page);
  }
});

// The access check runs in the (operations) layout, outside the loading boundary, so streaming
// never turns the sign-in redirect into a 200 with a client-side refresh.
test("anonymous requests to streamed operations routes get a real redirect", {
  tag: "@anonymous",
}, async ({ request }) => {
  for (const path of ["/", "/analytics"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect([302, 303, 307], path).toContain(response.status());
    expect(response.headers().location, path).toContain("/sign-in");
  }
});
