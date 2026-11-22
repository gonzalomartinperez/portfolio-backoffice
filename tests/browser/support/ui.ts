import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

export async function verifyPrimaryAction(button: Locator) {
  const accent = await button.evaluate((element) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--accent)";
    element.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
  await expect(button).toHaveCSS("background-color", accent);
  await button.hover();
  await expect(button).toHaveCSS("background-color", accent);
  await button.focus();
  await expect(button).toBeFocused();
}

/** Asserts there are no axe violations (default rule set, or only the given tags). */
export async function expectNoAxeViolations(page: Page, tags?: string[]) {
  const builder = new AxeBuilder({ page });
  const results = await (tags ? builder.withTags(tags) : builder).analyze();
  expect(results.violations).toEqual([]);
}

export const wcag22Tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Runs axe with the given tags and asserts nothing serious or critical is found, then that
 * nothing at all is found. The two assertions give a clearer failure for the blocking impacts.
 */
export async function expectNoWcagViolations(page: Page, tags = wcag22Tags) {
  const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
  const summary = (list: typeof violations) =>
    list.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target.join(" ")),
    }));
  expect(
    summary(violations.filter(({ impact }) => impact === "serious" || impact === "critical")),
  ).toEqual([]);
  expect(summary(violations)).toEqual([]);
}

/** Switches theme the way the preferences control does (the backoffice-theme cookie is the server-side authority). */
export async function setTheme(page: Page, theme: "dark" | "light") {
  await page.evaluate((value) => {
    document.documentElement.dataset.theme = value;
  }, theme);
}
