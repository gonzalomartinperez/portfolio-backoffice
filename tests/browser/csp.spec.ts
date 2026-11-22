import { expect, type Page, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

// Visits each path, records every CSP violation (securitypolicyviolation events plus console
// messages) and checks that all inline scripts carry the nonce of the response CSP.
async function expectStrictCsp(page: Page, paths: string[]) {
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
  for (const path of paths) {
    const response = await page.goto(path);
    const policy = response?.headers()["content-security-policy"] ?? "";
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
    expect(nonce, `${path} sends a nonce`).toBeTruthy();
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    await page.waitForLoadState("networkidle");
    const inline = await page.evaluate(() =>
      [...document.scripts].filter((script) => !script.src).map((script) => script.nonce),
    );
    expect(inline.length, `${path} has inline bootstrap scripts`).toBeGreaterThan(0);
    for (const value of inline) expect(value, `${path} inline script nonce`).toBe(nonce);
  }
  expect(violations).toEqual([]);
}

test("public pages run under the nonce CSP without violations", { tag: "@anonymous" }, async ({
  page,
}) => {
  await expectStrictCsp(page, ["/sign-in", "/privacy"]);
});

test("the owner overview runs under the nonce CSP without violations", { tag: "@owner" }, async ({
  page,
}) => {
  test.skip(!available, "Available-mode lifecycle only");
  await expectStrictCsp(page, ["/"]);
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
