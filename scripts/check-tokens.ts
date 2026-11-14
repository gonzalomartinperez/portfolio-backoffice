import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { field, isRecord } from "./json.ts";

// WCAG 2.2 contrast ratchet over the CSS custom properties in src/app/style.css (PBO-M2-10).
// The baseline lives in quality/ratchets/tokens.json; ratios may only rise. Pairs that already
// fail WCAG are recorded with belowWcag: true and are fixed by the M5 redesign, not here.

export type Rgba = { r: number; g: number; b: number; a: number };
export type Theme = "dark" | "light";
export type PairKind = "text" | "non-text";
export interface Pair {
  foreground: string;
  background: string;
  kind: PairKind;
  minimum: number;
}
export interface Measurement {
  ratio: number;
  minimum: number;
  belowWcag: boolean;
}

export const minimums: Record<PairKind, number> = { text: 4.5, "non-text": 3 };

const surfaces = ["surface-void", "surface-base", "surface-raised"];
const textTokens = ["text-primary", "text-secondary", "text-muted", "accent", "danger"];

function pairs(): Pair[] {
  const result: Pair[] = [];
  for (const background of surfaces)
    for (const foreground of textTokens)
      result.push({ foreground, background, kind: "text", minimum: minimums.text });
  // Button label on the accent fill (button.module.css .default).
  result.push({
    foreground: "accent-ink",
    background: "accent",
    kind: "text",
    minimum: minimums.text,
  });
  // Status text on its own wash, which sits over the raised surface (workbench.module.css).
  for (const signal of ["signal-success", "signal-warning", "accent"])
    result.push({
      foreground: signal,
      background: `${signal}-wash`,
      kind: "text",
      minimum: minimums.text,
    });
  // Non-text: control borders, focus ring and status dots against the surfaces (3:1).
  for (const background of surfaces)
    for (const foreground of ["line-control", "accent", "signal-success", "signal-warning"])
      result.push({ foreground, background, kind: "non-text", minimum: minimums["non-text"] });
  return result;
}

export const tokenPairs: readonly Pair[] = pairs();

export function parseColor(value: string): Rgba | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
  if (hex?.[1]) return parseHex(hex[1]);
  const fn = /^rgba?\(([^)]+)\)$/.exec(text);
  if (fn?.[1]) return parseRgbFunction(fn[1]);
  return null;
}

function parseHex(digits: string): Rgba {
  const full = digits.length <= 4 ? [...digits].map((digit) => digit + digit).join("") : digits;
  const channel = (index: number) => Number.parseInt(full.slice(index * 2, index * 2 + 2), 16);
  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
    a: full.length === 8 ? channel(3) / 255 : 1,
  };
}

function parseChannel(part: string): number | null {
  const percent = part.endsWith("%");
  const number = Number(percent ? part.slice(0, -1) : part);
  if (!Number.isFinite(number)) return null;
  return percent ? (number / 100) * 255 : number;
}

function parseRgbFunction(body: string): Rgba | null {
  const [colors = "", alphaPart] = body.split("/");
  const parts = colors.split(/[\s,]+/).filter(Boolean);
  const rawAlpha = alphaPart?.trim() ?? (parts.length === 4 ? parts.pop() : undefined);
  if (parts.length !== 3) return null;
  const [r, g, b] = parts.map(parseChannel);
  if (r == null || g == null || b == null) return null;
  let a = 1;
  if (rawAlpha !== undefined) {
    const parsed = parseChannel(rawAlpha.endsWith("%") ? rawAlpha : `${Number(rawAlpha) * 100}%`);
    if (parsed === null) return null;
    a = parsed / 255;
  }
  return { r: clamp(r, 255), g: clamp(g, 255), b: clamp(b, 255), a: clamp(a, 1) };
}

function clamp(value: number, maximum: number): number {
  return Math.min(maximum, Math.max(0, value));
}

/** Source-over compositing of `top` on an opaque `bottom`. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const mix = (front: number, back: number) => front * top.a + back * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

export function relativeLuminance(color: Rgba): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

export function contrastRatio(first: Rgba, second: Rgba): number {
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

export function roundRatio(ratio: number): number {
  return Math.floor(ratio * 100 + 1e-9) / 100;
}

function declarations(block: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g))
    if (match[1] && match[2]) result.set(match[1].slice(2), match[2].trim());
  return result;
}

/** Custom properties declared for one theme; the light theme overlays the dark default. */
export function parseTokens(css: string, theme: Theme): Map<string, string> {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const dark = /:root\s*\{([^}]*)\}/.exec(stripped)?.[1];
  const light = /:root\[data-theme="light"\]\s*\{([^}]*)\}/.exec(stripped)?.[1];
  if (dark === undefined || light === undefined)
    throw new Error('style.css must declare :root and :root[data-theme="light"] token blocks');
  const tokens = declarations(dark);
  if (theme === "light") for (const [name, value] of declarations(light)) tokens.set(name, value);
  return tokens;
}

export function resolveToken(
  tokens: Map<string, string>,
  name: string,
  seen: readonly string[] = [],
): Rgba | null {
  const raw = tokens.get(name);
  if (raw === undefined || seen.includes(name)) return null;
  const reference = /^var\(--([a-z0-9-]+)\)$/.exec(raw);
  if (reference?.[1]) return resolveToken(tokens, reference[1], [...seen, name]);
  return parseColor(raw);
}

export function measure(tokens: Map<string, string>, pair: Pair): Measurement | null {
  const foreground = resolveToken(tokens, pair.foreground);
  let background = resolveToken(tokens, pair.background);
  if (!foreground || !background) return null;
  // Translucent washes sit on the raised surface; translucent text is composited on the background.
  if (background.a < 1) {
    const base = resolveToken(tokens, "surface-raised");
    if (!base) return null;
    background = composite(background, base);
  }
  const ratio = contrastRatio(
    foreground.a < 1 ? composite(foreground, background) : foreground,
    background,
  );
  return { ratio: roundRatio(ratio), minimum: pair.minimum, belowWcag: ratio < pair.minimum };
}

export function pairName(pair: Pair): string {
  return `${pair.foreground} on ${pair.background}${pair.kind === "non-text" ? " (non-text)" : ""}`;
}

export function measureTheme(css: string, theme: Theme): Record<string, Measurement> {
  const tokens = parseTokens(css, theme);
  const result: Record<string, Measurement> = {};
  for (const pair of tokenPairs) {
    const measured = measure(tokens, pair);
    if (!measured) throw new Error(`Cannot resolve ${pairName(pair)} in the ${theme} theme`);
    result[pairName(pair)] = measured;
  }
  return result;
}

export interface TokenFindings {
  failures: string[];
  hints: string[];
}

function compareOne(
  name: string,
  now: Measurement,
  recorded: unknown,
  theme: Theme,
  findings: TokenFindings,
): void {
  const ratio = field(recorded, "ratio");
  if (typeof ratio !== "number") {
    findings.failures.push(`${theme}: ${name} has no baseline in quality/ratchets/tokens.json`);
    return;
  }
  const known = field(recorded, "belowWcag") === true;
  if (now.ratio < ratio)
    findings.failures.push(`${theme}: ${name} fell from ${ratio} to ${now.ratio}`);
  if (now.ratio > ratio)
    findings.hints.push(`${theme}: ${name} improved to ${now.ratio} (was ${ratio})`);
  if (now.belowWcag && !known)
    findings.failures.push(
      `${theme}: ${name} is ${now.ratio}, below the WCAG minimum ${now.minimum}`,
    );
  if (!now.belowWcag && known)
    findings.hints.push(`${theme}: ${name} now meets WCAG; drop belowWcag from the baseline`);
}

export function compareToBaseline(
  current: Record<string, Measurement>,
  baseline: unknown,
  theme: Theme,
): TokenFindings {
  const findings: TokenFindings = { failures: [], hints: [] };
  const recordedThemes = field(baseline, "themes", theme);
  for (const [name, now] of Object.entries(current))
    compareOne(name, now, field(recordedThemes, name), theme, findings);
  for (const name of isRecord(recordedThemes) ? Object.keys(recordedThemes) : [])
    if (!(name in current))
      findings.failures.push(`${theme}: baseline pair ${name} is no longer measured`);
  return findings;
}

export function baselineDocument(css: string, comment: string): unknown {
  return {
    $comment: comment,
    standard: "WCAG 2.2 (1.4.3 text 4.5, 1.4.11 non-text 3)",
    source: "src/app/style.css",
    themes: { dark: measureTheme(css, "dark"), light: measureTheme(css, "light") },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd();
  const css = readFileSync(path.join(root, "src/app/style.css"), "utf8");
  const baselinePath = path.join(root, "quality/ratchets/tokens.json");
  const baseline: unknown = JSON.parse(readFileSync(baselinePath, "utf8"));
  const failures: string[] = [];
  let known = 0;
  for (const theme of ["dark", "light"] as const) {
    const current = measureTheme(css, theme);
    const findings = compareToBaseline(current, baseline, theme);
    failures.push(...findings.failures);
    for (const hint of findings.hints) console.log(`Hint: ${hint}. Tighten tokens.json.`);
    known += Object.values(current).filter((entry) => entry.belowWcag).length;
  }
  for (const failure of failures) console.error(failure);
  console.log(
    `Token contrast: ${failures.length} regressions, ${known} known below-WCAG pairs (fixed in M5).`,
  );
  if (failures.length) process.exitCode = 1;
}
