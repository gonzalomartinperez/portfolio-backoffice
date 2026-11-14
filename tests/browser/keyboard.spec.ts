import { expect, type Page, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

test("skip link is the first tab stop and moves the next tab stop into the main landmark", {
  tag: "@viewer",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  // `main` has no tabindex, so it never takes focus itself; activating the link moves the
  // sequential focus starting point there, which puts the next Tab stop inside the landmark.
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      document.querySelector("main#main")?.contains(document.activeElement),
    ),
  ).toBe(true);
});

/** Tabs to the first control in main and checks it shows a visible focus indicator. */
async function expectFirstControlFocusable(page: Page, path: string, selector: string) {
  await page.goto(path);
  const first = page.locator(selector).first();
  await expect(first).toBeVisible();
  let reached = false;
  for (let step = 0; step < 40 && !reached; step += 1) {
    await page.keyboard.press("Tab");
    reached = await first.evaluate((element) => element === document.activeElement);
  }
  expect(reached, "first control in main is reachable by Tab").toBe(true);
  const indicator = await first.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(":focus-visible"),
      outline: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) >= 2,
      shadow: style.boxShadow !== "none",
    };
  });
  expect(indicator.focusVisible).toBe(true);
  // The app's :focus-visible outline is 3 px; accept 2 px or more, or a box-shadow ring.
  expect(indicator.outline || indicator.shadow).toBe(true);
}

const controls = "main a[href], main button, main summary, main input, main select";

test("overview controls are reachable by Tab with a visible focus indicator", {
  tag: "@viewer",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await expectFirstControlFocusable(page, "/", controls);
});

test("analytics controls are reachable by Tab with a visible focus indicator", {
  tag: "@viewer",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await expectFirstControlFocusable(page, "/analytics", controls);
});

test("access controls are reachable by Tab with a visible focus indicator", {
  tag: "@owner",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await expectFirstControlFocusable(page, "/access", controls);
});

test("reduced motion removes long animations and transitions from the shell", {
  tag: "@viewer",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.goto("/");
  await expect(page.locator("main#main")).toBeVisible();
  // Elements (including ::before and ::after) running an animation or transition over 0.01 s.
  const longMotion = () =>
    page.evaluate(() => {
      const seconds = (value: string) =>
        Math.max(
          0,
          ...value.split(",").map((part) => {
            const token = part.trim();
            return token.endsWith("ms")
              ? Number.parseFloat(token) / 1000
              : Number.parseFloat(token);
          }),
        );
      const found: string[] = [];
      for (const element of document.querySelectorAll("body, body *")) {
        for (const pseudo of [null, "::before", "::after"]) {
          const style = getComputedStyle(element, pseudo);
          const animated =
            style.animationName !== "none" && seconds(style.animationDuration) > 0.01;
          if (animated || seconds(style.transitionDuration) > 0.01)
            found.push(element.tagName.toLowerCase() + (pseudo ?? ""));
        }
      }
      return found.slice(0, 10);
    });
  // The probe must be able to see motion at all (button box-shadow transition is 140 ms).
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect((await longMotion()).length, "motion exists without the preference").toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await longMotion()).toEqual([]);
});
