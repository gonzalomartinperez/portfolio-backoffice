import { expect, type Page, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

type Visit = {
  path: string;
  url: RegExp;
  heading: string;
  hydrated?: (page: Page) => Promise<void>;
};
const nonceOf = (policy: string) => /'nonce-([^']+)'/.exec(policy)?.[1];

// Visits each page, records every CSP violation (securitypolicyviolation events plus console
// messages) and checks the page really rendered (final URL, status, heading), that all inline
// scripts carry the nonce of the response CSP and that a hydrated control still works.
async function expectStrictCsp(page: Page, visits: Visit[]) {
  const violations: string[] = [];
  await page.exposeFunction("reportCspViolation", (detail: string) => violations.push(detail));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { reportCspViolation: (detail: string) => void }).reportCspViolation(
        `${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  page.on("console", (message) => {
    if (/content security policy/i.test(message.text())) violations.push(message.text());
  });
  for (const { path, url, heading, hydrated } of visits) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} status`).toBe(200);
    await expect(page, `${path} final URL`).toHaveURL(url);
    await expect(page.getByRole("heading", { level: 1 }), `${path} heading`).toHaveText(heading);
    const policy = response?.headers()["content-security-policy"] ?? "";
    const nonce = nonceOf(policy);
    expect(nonce, `${path} sends a nonce`).toBeTruthy();
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    await page.waitForLoadState("networkidle");
    const inline = await page.evaluate(() =>
      [...document.scripts].filter((script) => !script.src).map((script) => script.nonce),
    );
    expect(inline.length, `${path} has inline bootstrap scripts`).toBeGreaterThan(0);
    for (const value of inline) expect(value, `${path} inline script nonce`).toBe(nonce);
    await hydrated?.(page);
  }
  expect(violations).toEqual([]);
}

test("public pages run under the nonce CSP without violations", { tag: "@anonymous" }, async ({
  page,
}) => {
  await expectStrictCsp(page, [
    { path: "/sign-in", url: /\/sign-in$/, heading: "Portfolio backoffice" },
    { path: "/privacy", url: /\/privacy$/, heading: "Privacy and data" },
  ]);
});

test("the owner overview runs under the nonce CSP without violations", { tag: "@owner" }, async ({
  page,
}) => {
  test.skip(!available, "Available-mode lifecycle only");
  await expectStrictCsp(page, [
    {
      path: "/",
      url: /\/$/,
      heading: "Portfolio operations",
      // Hydrated control: the details toggle and the theme select only work once React hydrated.
      hydrated: async (page) => {
        await page.getByText("Preferences", { exact: true }).click();
        await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption("light");
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      },
    },
  ]);
});

test("each document load gets a fresh nonce", { tag: "@anonymous" }, async ({ page }) => {
  const nonces = new Set<string | undefined>();
  for (let load = 0; load < 2; load++) {
    const response = await page.goto("/privacy");
    nonces.add(nonceOf(response?.headers()["content-security-policy"] ?? ""));
    const inline = await page.evaluate(() => document.scripts[0]?.nonce ?? "");
    expect(inline).toBe([...nonces].at(-1));
  }
  expect(nonces.size).toBe(2);
  expect(nonces.has(undefined)).toBe(false);
});

test("the invitation landing response is no-referrer and not cacheable", {
  tag: "@anonymous",
}, async ({ request }) => {
  const response = await request.get(`/access/invitation?token=${"a".repeat(64)}`, {
    maxRedirects: 0,
  });
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("the theme cookie is rendered into the server HTML", { tag: "@anonymous" }, async ({
  request,
}) => {
  const html = async (cookie?: string) =>
    (await request.get("/sign-in", { headers: cookie ? { Cookie: cookie } : {} })).text();
  expect(await html("backoffice-theme=light")).toMatch(/<html[^>]* data-theme="light"/);
  expect(await html("backoffice-theme=dark")).toMatch(/<html[^>]* data-theme="dark"/);
  expect(await html("backoffice-theme=system")).not.toMatch(/<html[^>]* data-theme=/);
  expect(await html("backoffice-theme=bogus")).toMatch(/<html[^>]* data-theme="dark"/);
  expect(await html()).toMatch(/<html[^>]* data-theme="dark"/);
  expect(await html("backoffice-theme=light")).not.toContain("assistant-theme");
});
