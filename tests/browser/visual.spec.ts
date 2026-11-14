import { expect, type Page, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

// PBO-M2-4: visual regression of the CURRENT (pre-redesign) UI, the safety net for M3-M4. Runs
// only with VISUAL=1 in the pinned Playwright container (docs/ci.md), on a fresh fixture
// database before any journey creates invitations. Baselines are labelled pre-redesign and are
// re-approved at M5.
const viewports = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;
const themes = ["dark", "light"] as const;

type Case = {
  name: string;
  path: string;
  // Spanish only where copy length changes the layout.
  locales: readonly ("en" | "es")[];
};
// Grouped by role so each test declaration carries a literal role tag (browser-tags.test.ts).
const viewer: Case[] = [
  { name: "overview", path: "/", locales: ["en", "es"] },
  { name: "analytics", path: "/analytics", locales: ["en", "es"] },
];
const owner: Case[] = [{ name: "access", path: "/access", locales: ["en", "es"] }];
const anonymous: Case[] = [
  { name: "sign-in", path: "/sign-in", locales: ["en", "es"] },
  { name: "privacy", path: "/privacy", locales: ["en"] },
];

async function capture(page: Page, { name, path }: Case, locale: "en" | "es") {
  test.skip(!available, "Available-mode lifecycle only");
  // Six full-page captures per test; charts need a moment to settle after a viewport change.
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const theme of themes) {
    for (const [viewport, size] of Object.entries(viewports)) {
      await test.step(`${theme} ${viewport}`, async () => {
        await page.setViewportSize(size);
        await page.goto(`${path}?locale=${locale}`);
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        await page.evaluate(() => document.fonts.ready);
        await expect.soft(page).toHaveScreenshot(`${name}-${locale}-${theme}-${viewport}.png`, {
          fullPage: true,
          timeout: 20_000,
          // Request-time values (e.g. the operations "checked" time) change on every run.
          mask: [page.locator("time")],
        });
      });
    }
  }
}

const title = (c: Case, locale: string) =>
  `visual baseline of ${c.name} in ${locale} (pre-redesign)`;
for (const c of viewer)
  for (const locale of c.locales)
    test(title(c, locale), { tag: ["@viewer", "@visual"] }, async ({ page }) => {
      await capture(page, c, locale);
    });
for (const c of owner)
  for (const locale of c.locales)
    test(title(c, locale), { tag: ["@owner", "@visual"] }, async ({ page }) => {
      await capture(page, c, locale);
    });
for (const c of anonymous)
  for (const locale of c.locales)
    test(title(c, locale), { tag: ["@anonymous", "@visual"] }, async ({ page }) => {
      await capture(page, c, locale);
    });
