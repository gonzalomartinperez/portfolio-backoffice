import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { NextRequest } from "next/server";
import { test } from "vitest";
import { localeHeader, proxy } from "../../src/proxy.ts";
import {
  dateTimeFormat,
  displayNames,
  languageTag,
  numberFormat,
} from "../../src/shared/ui/intl.ts";
import { read } from "../security/source-tree.ts";

test("language tags identify US English and Latin American Spanish", () => {
  assert.equal(languageTag("en"), "en-US");
  assert.equal(languageTag("es"), "es-419");
});

test("date and time formatting always uses UTC", () => {
  assert.equal(dateTimeFormat("en").resolvedOptions().timeZone, "UTC");
  assert.equal(
    dateTimeFormat("es", { timeZone: "America/Argentina/Buenos_Aires" }).resolvedOptions().timeZone,
    "UTC",
  );
});

test("Spanish numbers use Latin American conventions", () => {
  const formatter = numberFormat("es");
  assert.equal(formatter.resolvedOptions().locale, "es-419");
  assert.equal(formatter.format(12345.67), "12,345.67");
});

test("display names use the requested language tag", () => {
  assert.equal(displayNames("en", { type: "region" }).of("US"), "United States");
  assert.equal(displayNames("es", { type: "region" }).of("US"), "Estados Unidos");
});

test("source uses the shared locale and formatting helpers", () => {
  const files = readdirSync("src", { recursive: true, withFileTypes: true });
  for (const entry of files) {
    if (!entry.isFile()) continue;
    const file = `${entry.parentPath}/${entry.name}`;
    const source = read(file);
    assert.doesNotMatch(source, /es-AR/, file);
    if (file !== "src/shared/ui/intl.ts") {
      assert.doesNotMatch(
        source,
        /\bIntl\s*\.\s*(?:NumberFormat|DateTimeFormat|DisplayNames|RelativeTimeFormat|ListFormat|PluralRules)\b|\.toLocale(?:Date|Time)?String\s*\(/,
        file,
      );
    }
  }
});

test("the proxy forwards only a supported query locale to the document", () => {
  const forwarded = (url: string, headers: HeadersInit = {}) =>
    proxy(new NextRequest(url, { headers })).headers.get(`x-middleware-request-${localeHeader}`);
  assert.equal(forwarded("http://localhost/?locale=es"), "es");
  assert.equal(
    forwarded("http://localhost/privacy?locale=en", { cookie: "backoffice-locale=es" }),
    "en",
  );
  assert.equal(forwarded("http://localhost/?locale=fr"), null);
  // A client-supplied header is dropped, so only the query or the cookie decide.
  assert.equal(forwarded("http://localhost/", { [localeHeader]: "es" }), null);
});
