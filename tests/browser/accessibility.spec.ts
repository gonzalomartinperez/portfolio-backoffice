import { expect, type Page, test } from "@playwright/test";
import { available } from "./support/fixture.ts";
import { expectNoWcagViolations, setTheme } from "./support/ui.ts";

const themes = ["dark", "light"] as const;
const locales = ["en", "es"] as const;

/** Audits one state in every theme x locale; `open` reaches the state after navigation. */
async function auditState(
  page: Page,
  path: string,
  open?: (page: Page, locale: "en" | "es") => Promise<void>,
) {
  // Four full axe passes per state (theme x locale) need more than the 30 s default.
  test.setTimeout(120_000);
  for (const locale of locales) {
    for (const theme of themes) {
      await test.step(`${path} ${locale}/${theme}`, async () => {
        const separator = path.includes("?") ? "&" : "?";
        await page.goto(`${path}${separator}locale=${locale}`);
        await expect(page.locator("main#main")).toBeVisible();
        // The lang assertion also waits for hydration (the skip link sets it on mount).
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await setTheme(page, theme);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await open?.(page, locale);
        await expectNoWcagViolations(page);
      });
    }
  }
}

const anonymousStates = [
  ["sign-in", "/sign-in"],
  ["sign-in denied error", "/sign-in?error=AccessDenied"],
  ["privacy", "/privacy"],
] as const;
for (const [name, path] of anonymousStates) {
  test(`axe wcag22aa anonymous ${name}`, { tag: "@anonymous" }, async ({ page }) => {
    await auditState(page, path);
  });
}

test("invitation landing redirects to sign-in with and without a token", {
  tag: "@anonymous",
}, async ({ page }) => {
  // The route always redirects; the landing page is the audited sign-in state.
  await page.goto("/access/invitation?token=invalid");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/access/invitation");
  await expect(page).toHaveURL(/\/sign-in/);
});

const viewerStates = [
  ["overview", "/"],
  ["analytics", "/analytics"],
  ["privacy", "/privacy"],
] as const;
for (const [name, path] of viewerStates) {
  test(`axe wcag22aa viewer ${name}`, { tag: "@viewer" }, async ({ page }) => {
    test.skip(!available, "Available-mode lifecycle only");
    await auditState(page, path);
  });
}

const ownerStates = [
  ["overview", "/"],
  ["analytics", "/analytics"],
  ["access", "/access"],
] as const;
for (const [name, path] of ownerStates) {
  test(`axe wcag22aa owner ${name}`, { tag: "@owner" }, async ({ page }) => {
    test.skip(!available, "Available-mode lifecycle only");
    await auditState(page, path);
  });
}

test("axe wcag22aa owner access revoke confirmation dialog", { tag: "@owner" }, async ({
  page,
}) => {
  test.skip(!available, "Available-mode lifecycle only");
  await auditState(page, "/access", async (current) => {
    // Opens the confirmation on an existing viewer member; it is never confirmed.
    await expect(async () => {
      await current
        .getByRole("button", { name: /^(Revoke|Revocar)/ })
        .first()
        .click();
      await expect(current.getByRole("dialog")).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10_000 });
  });
});

test("axe wcag22aa viewer operational failure overview", { tag: "@viewer" }, async ({ page }) => {
  test.skip(available, "Unavailable fixture only");
  await auditState(page, "/");
});

test("axe wcag22aa viewer operational failure analytics", { tag: "@viewer" }, async ({ page }) => {
  test.skip(available, "Unavailable fixture only");
  await auditState(page, "/analytics");
});
