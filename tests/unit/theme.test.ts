import assert from "node:assert/strict";
import { test } from "vitest";
import {
  documentTheme,
  themeCookie,
  themeCookieValue,
  themePreference,
} from "../../src/shared/ui/theme.ts";

test.each([
  ["light", "light"],
  ["dark", "dark"],
  ["system", undefined],
  [undefined, "dark"],
  ["purple", "dark"],
  ["", "dark"],
])("cookie %s renders data-theme %s", (cookie, expected) => {
  assert.equal(documentTheme(themePreference(cookie)), expected);
});

test("the preference cookie is readable by the server and secure only on https", () => {
  assert.equal(themeCookie, "backoffice-theme");
  assert.equal(
    themeCookieValue("light", false),
    "backoffice-theme=light; Path=/; Max-Age=31536000; SameSite=Lax",
  );
  assert.match(themeCookieValue("dark", true), /; Secure$/);
});
