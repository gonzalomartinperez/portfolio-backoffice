import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";
import {
  compareToBaseline,
  composite,
  contrastRatio,
  measureTheme,
  parseColor,
  parseTokens,
  resolveToken,
  roundRatio,
  tokenPairs,
} from "../../scripts/check-tokens.ts";

const css = readFileSync("src/app/style.css", "utf8");
const black = { r: 0, g: 0, b: 0, a: 1 };
const white = { r: 255, g: 255, b: 255, a: 1 };

test("parseColor reads hex and rgb notations with alpha", () => {
  assert.deepEqual(parseColor("#000"), black);
  assert.deepEqual(parseColor("#FFF"), white);
  assert.deepEqual(parseColor("#4cd6ff"), { r: 76, g: 214, b: 255, a: 1 });
  assert.deepEqual(parseColor("rgb(76 214 255 / 12%)"), { r: 76, g: 214, b: 255, a: 0.12 });
  assert.deepEqual(parseColor("rgba(0, 0, 0, 0.5)"), { r: 0, g: 0, b: 0, a: 0.5 });
  assert.equal(parseColor("#12345"), null);
  assert.equal(parseColor("#8000")?.a, 0);
  assert.equal(parseColor("var(--x)"), null);
  assert.equal(parseColor("hsl(0 0% 0%)"), null);
});

test("contrast math matches WCAG reference values", () => {
  assert.equal(contrastRatio(black, white), 21);
  assert.equal(contrastRatio(white, black), 21);
  assert.equal(contrastRatio(white, white), 1);
  // #767676 on white is the classic 4.54:1 boundary pair.
  assert.equal(roundRatio(contrastRatio(parseColor("#767676") ?? black, white)), 4.54);
  assert.deepEqual(composite({ r: 0, g: 0, b: 0, a: 0.5 }, white), {
    r: 127.5,
    g: 127.5,
    b: 127.5,
    a: 1,
  });
});

test("tokens resolve per theme with var() indirection and the light overlay", () => {
  const dark = parseTokens(css, "dark");
  const light = parseTokens(css, "light");
  assert.deepEqual(resolveToken(dark, "surface-void"), black);
  assert.deepEqual(resolveToken(light, "surface-raised"), white);
  assert.equal(dark.get("radius-sm"), "6px");
  const indirect = new Map([
    ["a", "var(--b)"],
    ["b", "#fff"],
    ["loop", "var(--loop)"],
  ]);
  assert.deepEqual(resolveToken(indirect, "a"), white);
  assert.equal(resolveToken(indirect, "loop"), null);
  assert.equal(resolveToken(indirect, "missing"), null);
  assert.throws(() => parseTokens(":root { --a: #fff; }", "dark"));
});

test("every token pair is measurable in both themes and the baseline matches", () => {
  const baseline: unknown = JSON.parse(readFileSync("quality/ratchets/tokens.json", "utf8"));
  for (const theme of ["dark", "light"] as const) {
    const measured = measureTheme(css, theme);
    assert.equal(Object.keys(measured).length, tokenPairs.length);
    const findings = compareToBaseline(measured, baseline, theme);
    assert.deepEqual(findings.failures, []);
  }
});

test("the ratchet fails on a drop, a new below-WCAG pair and a missing baseline", () => {
  const baseline = {
    themes: {
      dark: {
        "a on b": { ratio: 5, minimum: 4.5, belowWcag: false },
        "c on d": { ratio: 3, minimum: 4.5, belowWcag: true },
      },
    },
  };
  const ok = {
    "a on b": { ratio: 5, minimum: 4.5, belowWcag: false },
    "c on d": { ratio: 3, minimum: 4.5, belowWcag: true },
  };
  assert.deepEqual(compareToBaseline(ok, baseline, "dark").failures, []);
  const dropped = { ...ok, "a on b": { ratio: 4.4, minimum: 4.5, belowWcag: true } };
  assert.equal(compareToBaseline(dropped, baseline, "dark").failures.length, 2);
  const worse = { ...ok, "c on d": { ratio: 2.9, minimum: 4.5, belowWcag: true } };
  assert.equal(compareToBaseline(worse, baseline, "dark").failures.length, 1);
  const improved = { ...ok, "c on d": { ratio: 4.6, minimum: 4.5, belowWcag: false } };
  const better = compareToBaseline(improved, baseline, "dark");
  assert.deepEqual(better.failures, []);
  assert.equal(better.hints.length, 2);
  assert.equal(compareToBaseline({ new: ok["a on b"] }, baseline, "dark").failures.length, 3);
});
