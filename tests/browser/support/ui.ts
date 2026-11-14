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
