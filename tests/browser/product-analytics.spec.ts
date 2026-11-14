import { expect, test } from "@playwright/test";
import { available } from "./support/fixture.ts";
import { expectNoAxeViolations, verifyPrimaryAction } from "./support/ui.ts";

test("private product analytics requires live access", { tag: "@anonymous" }, async ({ page }) => {
  await page.goto("/analytics");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Portfolio interactions" })).toHaveCount(0);
});

test("calendar product report separates totals, suppressed cells and filter scopes", {
  tag: "@viewer",
}, async ({ page }) => {
  test.skip(!available, "Available fixture only");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/analytics?locale=en");
  await expect(page.getByRole("heading", { name: "Page views", exact: true })).toBeVisible();
  await expect(page.getByText("Current period · still in progress", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Country collection is off. Retained historical buckets may still appear.", {
      exact: true,
    }),
  ).toBeVisible();
  const grid = page.getByRole("region", {
    name: "Reviewed-region click grid",
    exact: true,
  });
  await expect(grid.getByRole("table")).toBeVisible();
  await expect(grid.getByRole("row", { name: "3 4 3", exact: true })).toBeVisible();
  await expect(grid.getByText("Clicks withheld from the grid")).toBeVisible();
  await expect(grid.locator("dd").first()).toHaveText("1");
  await verifyPrimaryAction(page.getByRole("button", { name: "Apply filters", exact: true }));
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByLabel("Grid viewport", { exact: true })).toBeFocused();
  await expectNoAxeViolations(page);
  await page.screenshot({
    path: `test-results/calendar-${test.info().project.name}-desktop-en.png`,
    fullPage: true,
  });
  await page.getByLabel("Grid page", { exact: true }).selectOption("about");
  await expect(page.getByLabel("Public region", { exact: true })).toHaveValue("about-story");
  await expect(
    page.getByLabel("Public region", { exact: true }).locator('option[value="home-featured"]'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page).toHaveURL(/section=about/);
  await expect(
    page.getByText("No grid cell meets the publication threshold in this selection.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Page views", exact: true }).locator("..").locator(".metric"),
  ).toHaveText("4");
  await page.getByLabel("Event language", { exact: true }).selectOption("es");
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page).toHaveURL(/eventLocale=es/);
  await expect(
    page.getByRole("heading", { name: "Portfolio interactions", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "No accepted events in this selection. This does not establish complete collection.",
  );
  await page.goto("/analytics?locale=en&section=home&region=about-story");
  await expect(
    page.getByRole("heading", {
      name: "These filters are not supported",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Page views", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Reset filters", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Page views", exact: true })).toBeVisible();
});

test("calendar report supports Spanish light theme, reduced motion and narrow layout", {
  tag: ["@viewer", "@mobile"],
}, async ({ page }) => {
  test.skip(!available, "Available fixture only");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/analytics?locale=es");
  await page.getByText("Preferencias", { exact: true }).click();
  await page.getByLabel("Tema", { exact: true }).selectOption("light");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Preferencias", { exact: true })).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "Vistas de página", exact: true })).toBeVisible();
  await verifyPrimaryAction(page.getByRole("button", { name: "Aplicar filtros", exact: true }));
  await page.getByText("Cobertura e interpretación", { exact: true }).click();
  await expect(
    page.getByText(/No se registran la fecha de habilitación ni una cobertura ininterrumpida/),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expectNoAxeViolations(page);
  await page.screenshot({
    path: `test-results/calendar-${test.info().project.name}-mobile-es-light.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("product counts have honest labels, keyboard filtering and table alternatives", {
  tag: ["@viewer", "@mobile"],
}, async ({ page }) => {
  test.skip(!available, "Available fixture only");
  await page.goto("/analytics?view=legacy&locale=en");
  await expect(page.getByRole("heading", { name: "Portfolio interactions" })).toBeVisible();
  await expect(page.getByText("Synthetic fixture data · not production analytics")).toBeVisible();
  await expect(page.getByRole("table", { name: /Daily counts/ })).toBeVisible();
  await page.getByLabel("Interaction", { exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Interaction", { exact: true })).toHaveValue("navigation_click");
  await expect(page.getByRole("status")).toHaveText("No accepted events in this window.");
  await page.getByLabel("Interaction", { exact: true }).selectOption("cv_link_open");
  await expect(page.getByRole("table").getByRole("cell", { name: "7", exact: true })).toBeVisible();
  await page.getByLabel("Interaction", { exact: true }).selectOption("company_link_open");
  await expect(page.getByRole("status")).toHaveText("No accepted events in this window.");
  await page.getByLabel("Interaction", { exact: true }).selectOption("page_view");
  await expectNoAxeViolations(page);
  await page.screenshot({
    path: `test-results/product-${test.info().project.name}-desktop-en.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/analytics?view=legacy&locale=es");
  await expect(page.getByRole("heading", { name: "Interacciones del portfolio" })).toBeVisible();
  await page.getByText("Preferencias", { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByLabel("Tema", { exact: true }).selectOption("light");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Preferencias", { exact: true })).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expectNoAxeViolations(page);
  await page.screenshot({
    path: `test-results/product-${test.info().project.name}-mobile-es.png`,
    fullPage: true,
  });
});

test("product and privacy content reflow with doubled text on a narrow viewport", {
  tag: ["@viewer", "@mobile"],
}, async ({ page }) => {
  test.skip(!available, "Available fixture only");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["analytics", "privacy"]) {
    await page.goto(`/${route}?locale=es`);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
    // Enlarged month tables can exceed WebKit's full-page bitmap limit.
    await page.screenshot({
      path: `test-results/product-${test.info().project.name}-${route}-text-200.png`,
      fullPage: false,
    });
    if (route === "analytics") {
      const apply = page.getByRole("button", {
        name: "Aplicar filtros",
        exact: true,
      });
      await apply.focus();
      await expect(apply).toBeFocused();
      const grid = page.locator("#report-grid");
      await grid.scrollIntoViewIfNeeded();
      await expect(grid).toBeInViewport();
      await page.screenshot({
        path: `test-results/product-${test.info().project.name}-grid-text-200.png`,
        fullPage: false,
      });
      const actions = page.getByRole("region", {
        name: "Acciones semánticas · todas las páginas",
        exact: true,
      });
      await actions.focus();
      await expect(actions).toBeFocused();
      const before = await actions.evaluate((element) => element.scrollLeft);
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() => actions.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(before);
      const firstAction = actions.locator("tbody th").first();
      expect(
        await firstAction.evaluate(
          (element) =>
            element.getBoundingClientRect().height /
            parseFloat(getComputedStyle(element).lineHeight),
        ),
      ).toBeLessThan(8);
      await page.screenshot({
        path: `test-results/product-${test.info().project.name}-actions-text-200.png`,
        fullPage: false,
      });
      const coverage = page.locator("details summary").last();
      await coverage.focus();
      await page.keyboard.press("Enter");
      await expect(coverage.locator("..")).toHaveAttribute("open", "");
      await expect(coverage).toBeInViewport();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/product-${test.info().project.name}-coverage-text-200.png`,
        fullPage: false,
      });
    }
  }
});
