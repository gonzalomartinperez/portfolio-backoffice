import { expect, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

// 320 CSS px is 400 % zoom of a 1280 px window; 640 CSS px is 200 %. Each role project runs
// its own routes with an explicit viewport (WCAG 1.4.10 reflow).
const viewports = [
  { width: 320, height: 700 },
  { width: 640, height: 900 },
] as const;

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
  paths: readonly string[],
) {
  test.setTimeout(120_000);
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const locale of ["en", "es"]) {
      for (const path of paths) {
        await test.step(`${path} ${locale} at ${viewport.width}px`, async () => {
          await page.goto(`${path}?locale=${locale}`);
          await expect(page.locator("main#main")).toBeVisible();
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  document.documentElement.scrollWidth <= window.innerWidth &&
                  document.body.scrollWidth <= window.innerWidth,
              ),
            )
            .toBe(true);
          // Content past the right edge, ignoring hidden elements and intentional scrollers.
          const clipped = await page.evaluate(() => {
            const scrolls = (element: Element) => {
              for (let node = element.parentElement; node; node = node.parentElement) {
                if (/auto|scroll/.test(getComputedStyle(node).overflowX)) return true;
              }
              return false;
            };
            return [...document.querySelectorAll("main *")]
              .filter(
                (element) =>
                  getComputedStyle(element).visibility !== "hidden" &&
                  element.getBoundingClientRect().right > window.innerWidth + 1 &&
                  !scrolls(element),
              )
              .slice(0, 10)
              .map(
                (element) => element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ""),
              );
          });
          expect(clipped).toEqual([]);
        });
      }
    }
  }
}

test("public routes reflow at 320 and 640 CSS px", { tag: "@anonymous" }, async ({ page }) => {
  await expectNoHorizontalOverflow(page, ["/sign-in", "/privacy"]);
});

test("viewer routes reflow at 320 and 640 CSS px", { tag: "@viewer" }, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await expectNoHorizontalOverflow(page, ["/", "/analytics"]);
});

test("owner access management reflows at 320 and 640 CSS px", { tag: "@owner" }, async ({
  page,
}) => {
  test.skip(!available, "Available-mode lifecycle only");
  await expectNoHorizontalOverflow(page, ["/access"]);
});
