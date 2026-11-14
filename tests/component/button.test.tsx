import { describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../src/app/style.css";
import { Button } from "../../src/shared/ui/button.tsx";

const variants = ["default", "outline", "ghost"] as const;

describe("Button", () => {
  test.each(variants)("renders the %s variant as a native button", async (variant) => {
    await render(<Button variant={variant}>Save</Button>);
    const button = page.getByRole("button", { name: "Save" });
    await expect.element(button).toBeVisible();
    await expect.element(button).toHaveAttribute("data-slot", "button");
    expect(button.element().tagName).toBe("BUTTON");
  });

  test("variants differ visually and the default size keeps a 44px target", async () => {
    const backgrounds: string[] = [];
    for (const variant of variants) {
      const view = await render(<Button variant={variant}>{variant}</Button>);
      const element = page.getByRole("button", { name: variant }).element();
      backgrounds.push(getComputedStyle(element).backgroundColor);
      expect(element.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      await view.unmount();
    }
    expect(backgrounds[0]).not.toBe(backgrounds[1]);
    expect(backgrounds[2]).toBe("rgba(0, 0, 0, 0)");
  });

  test("the icon size is a 44px square named by aria-label", async () => {
    await render(
      <Button size="icon" aria-label="Open menu">
        +
      </Button>,
    );
    const button = page.getByRole("button", { name: "Open menu" });
    await expect.element(button).toBeVisible();
    const box = button.element().getBoundingClientRect();
    expect(box.width).toBe(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test("takes its accessible name from its children", async () => {
    await render(
      <Button>
        <span>Export</span> <span>report</span>
      </Button>,
    );
    await expect.element(page.getByRole("button", { name: "Export report" })).toBeVisible();
  });

  test("defaults to type=button and honours an explicit submit", async () => {
    await render(
      <>
        <Button>Plain</Button>
        <Button type="submit">Send</Button>
      </>,
    );
    await expect
      .element(page.getByRole("button", { name: "Plain" }))
      .toHaveAttribute("type", "button");
    await expect
      .element(page.getByRole("button", { name: "Send" }))
      .toHaveAttribute("type", "submit");
  });

  test("merges className after its own classes", async () => {
    await render(<Button className="extra-class">Merge</Button>);
    const element = page.getByRole("button", { name: "Merge" }).element();
    expect(element.classList.contains("extra-class")).toBe(true);
    expect(element.classList.length).toBeGreaterThan(2);
    expect(element.classList.item(element.classList.length - 1)).toBe("extra-class");
  });

  test("calls the click handler exactly once per click", async () => {
    const onClick = vi.fn();
    await render(<Button onClick={onClick}>Run</Button>);
    await page.getByRole("button", { name: "Run" }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("a disabled button is not clickable and is not focused by a click", async () => {
    const onClick = vi.fn();
    await render(
      <Button disabled onClick={onClick}>
        Blocked
      </Button>,
    );
    const button = page.getByRole("button", { name: "Blocked" });
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute("disabled");
    // Playwright refuses to click a disabled element; a forced DOM click must still not call it.
    await expect(button.click({ timeout: 500 })).rejects.toThrow();
    const element = button.element();
    expect(element).toBeInstanceOf(HTMLElement);
    if (element instanceof HTMLElement) element.click();
    expect(onClick).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(button.element());
  });

  test("Tab reaches the button and shows a visible focus indicator", async () => {
    await render(<Button>Focus me</Button>);
    const button = page.getByRole("button", { name: "Focus me" });
    expect(getComputedStyle(button.element()).outlineStyle).toBe("none");
    await userEvent.tab();
    await expect.element(button).toHaveFocus();
    const style = getComputedStyle(button.element());
    const outlined = style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0;
    expect(outlined || style.boxShadow !== "none").toBe(true);
  });

  test("a disabled button is skipped by Tab", async () => {
    await render(
      <>
        <Button disabled>Skipped</Button>
        <Button>Next</Button>
      </>,
    );
    await userEvent.tab();
    await expect.element(page.getByRole("button", { name: "Next" })).toHaveFocus();
  });

  test("Enter and Space activate a focused button", async () => {
    const onClick = vi.fn();
    await render(<Button onClick={onClick}>Keys</Button>);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
