import { expect, test } from "@playwright/test";
import { available } from "./support/fixture.ts";

test("unauthenticated visitors cannot read operational data", { tag: "@anonymous" }, async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /GitHub/ })).toBeVisible();
  const response = await request.get("/api/operations");
  expect(response.status()).toBe(401);
  expect(await response.text()).not.toContain("fixture-1");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect((await request.get("/embed")).status()).toBe(404);
});

test("health and database readiness have distinct public semantics", { tag: "@anonymous" }, async ({
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  const ready = await request.get("/api/ready");
  expect(ready.ok()).toBe(true);
  expect(ready.headers()["cache-control"]).toContain("no-store");
});

test("viewer can read operations but cannot enter owner access management", {
  tag: "@viewer",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Portfolio operations" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage access" })).toHaveCount(0);
  await page.goto("/access");
  await expect(page).toHaveURL("http://localhost:3107/");
  await expect(
    page.getByRole("heading", {
      name: /Access management|Administración de acceso/,
    }),
  ).toHaveCount(0);
});

test("owner invitation confirmation supports Escape and focus restoration", {
  tag: "@owner",
}, async ({ page }) => {
  test.skip(!available, "Available-mode lifecycle only");
  await page.goto("/access?locale=en");
  const email = `guest-${test.info().project.name}-${Date.now()}@example.test`;
  await page.getByLabel("Guest email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Invite viewer", exact: true }).click();
  await expect(page.getByLabel("Invitation link", { exact: true })).toHaveValue(
    /http:\/\/localhost:3107\/access\/invitation\?token=/,
  );
  const trigger = page.getByRole("button", {
    name: `Revoke ${email}`,
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Revoke access?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Revoke access?" })).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("button", { name: "Confirm revocation", exact: true }).click();
  await expect(trigger).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: email })).toContainText("Revoked");
});
