# Design playbook: Instrument blue

Owner decisions (2026-11-09): (1) the portfolio family uses a blue identity, "Instrument blue" (ultramarine hue about 262 to cyan about 210, deep navy dark ground, navy ink on cool off-white light), replacing the graphite base proposed in [research 12](research/12-backoffice-redesign.md); (2) migrate from CSS Modules to Tailwind 4 with a complete semantic token system and owned CVA primitives. The planner has full creative freedom; the structure is shared with the Pequeverso backoffice (same routes skeleton, shell, templates, component names, states, chart rules, motion, density, shortcuts, semantic token names and gates) and the identity lives only in tokens, type, icon style, signature details and copy voice. Foundations are [research 12](research/12-backoffice-redesign.md) sections 2-6 and [research 13](research/13-sites-master-uiux.md) section 3.2; this file records the decisions and the measured values for this repository.

All colour values below were computed by script (OKLCH to sRGB with gamut clamping; WCAG 2 relative luminance; OKLab distance after colour-vision-deficiency simulation with Machado 2009 matrices at severity 1.0). `scripts/guards/check-tokens.ts` re-computes every ratio and distance from `src/design/tokens/*.tokens.json` and fails CI on regression.

## 1. Concept: a flight recorder for a RAG assistant, in two lights

- **Dark, "Observatory navy" (default for operators):** deep navy ground (never black, never slate), layered lighter surfaces instead of shadows, cyan as the one live signal. It is the quiet sibling of the portfolio's star-field hero.
- **Light, "Ink on paper":** cool off-white paper, navy ink, ultramarine as the structural colour, blue-tinted layered shadows and hairlines. Not an inversion: each theme has its own elevation model and its own contrast relationships (ecosystem 13).
- **User:** an AI engineer reading traces at 11 pm, or the owner checking spend over coffee. Every number is a measurement with a unit, a timestamp and a source. Terse, confident copy. The honesty doctrine ("unavailable, never zero", "estimated, not an invoice", "synthetic data") is the product's character and becomes the design language, not a banner.

### Why it will not read as generic SaaS blue

1. **Hue travel.** The accent family is a 52 degree arc, 262 (ultramarine) to 210 (cyan). Gradients, sparklines, sequential ramps and the primary-button fill travel that arc while lightness rises (never through grey, never toward purple). A flat 255-260 "blue-500" button is the SaaS default; hue travel is the identity.
2. **Everything is tinted.** Every neutral carries hue 262 at chroma 0.01-0.07. There is no grey; the only pure white is the light-mode card surface; dark grounds are navy.
3. **Cyan is a signal, not a colour.** It means "live", "selected" or "primary action in dark", held under about 5% of visible pixels. Ultramarine does the structural work in light.
4. **One gradient and one glow per viewport.** Hairlines, mono units and the hatch carry the rest.
5. **Five signature details** (section 8) that no admin template has: the trace rail, registration ticks, unit chips, the telemetry ticker, and hatch-for-unknown, plus the unlit constellation for empty states.

## 2. Shared standard (summary of research 12; this is the contract with the sibling)

### Information architecture

| Slot | Destination | Route | Question it answers |
|---|---|---|---|
| 1 | Overview | `/` | Is it healthy, did it change, what did it cost |
| 2 | Assistant runs | `/runs`, `/runs/[id]` | Which executions failed or were slow, where did the time go |
| 3 | Usage and cost | `/usage` | Tokens, latency distribution, budget, errors |
| 4 | Audience | `/analytics` | What do visitors do on the site |
| 5 | Feedback | `/feedback` | Are answers helpful |
| 6 | Access | `/access`, `/access/audit` | Who can sign in, who changed what |
| - | Account | `/account` (user menu) | Profile, linked providers, theme, density, language |
| - | Utility | `/sign-in`, `/privacy`, `/access/invitation` | Entry and policy |

Viewer role sees every route except Access and Audit; hidden items are removed from navigation and a direct URL returns a typed Forbidden state, never a blank page. URL state (`?range=7d&outcome=failed&sort=-duration`) makes every view linkable. Time is UTC and says so.

### Shell (desktop at least 1024 px)

Status strip (32 px, sticky: Environment, Data source, Checked time with refresh) above a 232 px sidebar (56 px rail, toggled with `[`) and a 48 px topbar (breadcrumbs, range control, command palette trigger, user menu), then a page header and a 12-column content area (max 1280 px, 24 px gutters). Tablet: overlay drawer. Mobile (under 640 px): 56 px header, full-height drawer, range control inside the page header, tables become card lists or scroll regions with a sticky first column, safe-area insets respected. Skip link first in tab order; landmarks `header`, `nav`, `main#content`, `aside`.

The synthetic or fixture state turns the strip warning-toned with the text "Synthetic data, not production telemetry" and a corner badge "SYNTHETIC" on every `Metric`; clicking the strip opens provenance (API commit, pricing revision, corpus hash).

### Templates

1. **Overview**: KPI row (4 tiles, none above 120 px), then trend and composition panels (8/4 columns), then "Needs attention" (at most 5 items with deep links), then provenance. No panel inside a panel.
2. **List and Detail** (Runs, Feedback, Members): toolbar (search, filter chips, density, column menu, export) over a table; row or `Enter` opens a 480 px peek sheet with `J`/`K`; the ID link opens the full route; on mobile the sheet is a route.
3. **Run detail**: outcome badge, copyable ID, timestamp, total duration, facts; waterfall with stage-table twin and an inspector; never prompts or answers.
4. **Settings and IAM**: section navigation left, one fieldset card per section, one primary action each; destructive actions show their consequence in text.
5. **Audit log**: append-only table, sticky filter bar, monospace IDs, relative and absolute time, expandable before/after summary, owner-only CSV export, retention notice.

### States (one component per state, same anatomy: icon, title, one sentence, action, optional details)

Loading (skeleton matching the final layout, after 200 ms; refresh keeps data), Empty (never any data; identity-specific), Empty filtered ("Clear filters"), Unavailable (dash, reason, hatched frame, no zero bars), Stale (value kept, warning tone, age), Withheld (privacy threshold k, neutral hatch), Partial (failed panels in place plus a page callout), Error (`role="alert"`, retry, request id), Forbidden and Not found (dedicated pages), Success (polite toast, 5 s, undo only if reversible), Fixture (strip plus corner badge). Every async view implements all of them in `/__kit` fixtures; a Playwright matrix visits each.

### Keyboard

`Ctrl/Cmd+K` and `/` palette; `g` then `o r u a f s` go to Overview, Runs, Usage, Audience, Feedback, Access; `[` collapse sidebar; `r` refresh; `t` theme; `d` density; `j`/`k`/`Enter`/`Esc` for lists; `?` help dialog. Disabled inside inputs; every shortcut has a visible UI equivalent (WCAG 2.1.4); the chord times out after 1.2 s.

### Density

`data-density="comfortable|compact"` on `<html>`, stored in a cookie and rendered on the server. Defaults: compact for fine pointer at least 1024 px, comfortable otherwise.

| Token | Comfortable | Compact |
|---|---|---|
| Table row | 48 px | 32 px |
| Control height md | 40 px | 32 px |
| Card padding | 20 px | 16 px |
| Page gap | 24 px | 16 px |
| Body | 15 px | 14 px |
| Coarse pointer hit area | at least 44 px | at least 44 px (forced) |

## 3. Tokens

### Architecture

Three tiers (ecosystem 13): primitive `--ref-*`, semantic `--sys-*` exposed to Tailwind as colours, component `--cmp-*` only where two or more variants diverge. Sources are DTCG 2025.10 JSON, OKLCH with hex fallback, built by Style Dictionary v5 (spike S3; Terrazzo is the fallback) into one committed `src/design/theme.css`:

- `structure.tokens.json`: semantic names, type, space, radius, motion, density, z-index, breakpoints. **Identical in both backoffices** (synced from the kit).
- `pack-instrument.tokens.json`: `--ref-*` ramps and the light/dark mapping. **Different** from the sibling's `pack-atelier`.
- Contract tests: both packs define every semantic token for both themes; required pairs meet contrast; snapshot of `theme.css`.

Tailwind 4 wiring (docs fetched 2026-11-09): semantic values are plain variables on `:root`; `@theme inline` maps them to utilities so a theme switch does not break the variable chain.

```css
/* src/app/globals.css (hand-written, 12 lines) */
@import "tailwindcss";
@import "../design/theme.css";           /* generated: :root, dark, @theme inline */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
/* generated excerpt */
:root { --sys-canvas: oklch(0.975 0.01 262); --sys-surface: oklch(1 0 0); --sys-fg: oklch(0.2 0.06 262); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --sys-canvas: oklch(0.16 0.045 262); } }
:root[data-theme="dark"] { --sys-canvas: oklch(0.16 0.045 262); }
@theme inline { --color-canvas: var(--sys-canvas); --color-surface: var(--sys-surface); --color-fg: var(--sys-fg); }
```

Rules: no `bg-[#...]` or arbitrary length values outside an allowlist (G10); `cn()` = `clsx` + `tailwind-merge` with a registered config for the custom text sizes; Biome sorts classes; container queries for panels; `motion-safe:` convention; logical properties (`ms-`, `ps-`).

### Semantic token set (names shared with the sibling)

Surfaces `canvas`, `surface`, `surface-raised`, `surface-inset`, `surface-hover`, `surface-selected`, `overlay`. Text `fg`, `fg-secondary`, `fg-muted`, `fg-on-accent`, `fg-link`. Lines `line-subtle`, `line`, `line-control`, `ring`. Accent `accent`, `accent-hover`, `accent-fg`, `accent-soft`, `accent-text`; `signal` and `brand` are Instrument-only additions mapped in the pack. Status `ok`, `warn`, `critical`, `info`, `unknown` each with `-fg`, `-soft`, `-line`. Viz `viz-1..5`, `viz-seq-1..5`, `viz-grid`, `viz-axis`, `viz-withheld`. Elevation `shadow-1/2/3`, `border-elev`.

### Primitives (hue 262 unless stated)

| Step | Hex | Step | Hex |
|---|---|---|---|
| blue-50 | `#f2f7ff` | cyan-100 (h210) | `#dcf8fd` |
| blue-100 | `#e3edff` | cyan-300 | `#8de8f8` |
| blue-200 | `#caddff` | cyan-400 | `#3adaf2` |
| blue-300 | `#aac8ff` | cyan-500 (h215) | `#05c2e2` |
| blue-400 | `#7caaff` | cyan-600 (h225) | `#089ec7` |
| blue-500 | `#4886fe` | cyan-700 (h230) | `#027398` |
| blue-600 | `#2867e4` | | |
| blue-700 | `#174eba` | | |
| blue-800 | `#0b378d` | | |
| blue-900 | `#06235e` | | |
| blue-950 | `#021239` | | |

OKLCH sources: lightness 0.975, 0.945, 0.895, 0.83, 0.74, 0.64, 0.55, 0.46, 0.37, 0.28, 0.20 with chroma 0.012, 0.026, 0.06, 0.10, 0.15, 0.19, 0.20, 0.18, 0.15, 0.11, 0.08 (tapered at both ends to stay in sRGB); P3 displays may use up to +15% chroma under `@media (color-gamut: p3)`.

### Semantic values, computed (WCAG 2 contrast on the named surface)

**Light, "Ink on paper"**

| Token | OKLCH | Hex | Contrast |
|---|---|---|---|
| canvas | 0.975 0.010 262 | `#f3f7fe` | - |
| surface (cards) | 1 0 0 | `#ffffff` | - |
| surface-inset | 0.955 0.016 262 | `#eaf0fb` | - |
| surface-hover / selected | 0.95 0.022 / 0.93 0.04 | `#e7effe` / `#dce9ff` | fg 15.0+ on both |
| fg | 0.20 0.06 262 | `#061431` | 18.2 on surface, 17.0 canvas |
| fg-secondary | 0.40 0.05 262 | `#394863` | 9.2 / 8.6 |
| fg-muted | 0.48 0.045 262 | `#505e77` | 6.5 / 6.1 (metadata at least 13 px only) |
| line-subtle (decorative) | 0.92 0.016 262 | `#dfe5f0` | 1.26 |
| line (cards) | 0.86 0.026 262 | `#c8d1e3` | 1.53 |
| line-control (inputs, buttons) | 0.58 0.065 262 | `#657ba1` | 4.3 on surface, 4.0 canvas (need 3.0) |
| accent / accent-text | 0.46 0.18 262 | `#174eba` | 7.4 surface, 6.9 canvas |
| accent-hover | 0.40 0.16 262 | `#0f3f9c` | white label 9.5 |
| accent-fg | white | `#ffffff` | 7.4 on accent |
| ring | 0.55 0.20 262 | `#2867e4` | 5.1 surface, 4.7 canvas |
| brand | 0.37 0.15 262 | `#0b378d` | 10.8 |
| signal / info | 0.52 0.103 230 | `#027398` | 5.4 surface |
| ok | 0.50 0.11 155 | `#1e7546` | 5.7 surface, text on 10% soft 4.9 |
| warn | 0.50 0.10 75 | `#845a0f` | 6.1 surface, on soft 5.3 |
| critical | 0.50 0.17 25 | `#b02a2d` | 6.5 surface, on soft 5.6; white label 6.5 |
| unknown | = fg-muted | `#505e77` | 6.5 |
| Shadows | blue-tinted | `0 1px 0 oklch(0.28 0.11 262 / 8%), 0 14px 32px -14px oklch(0.28 0.11 262 / 28%)` | - |

**Dark, "Observatory navy"** (page and card surfaces L 0.16-0.20 inside the ecosystem 13 range of 0.16-0.22; `surface-raised` at 0.24 is used only for menus, popovers and sheets so they separate by lightness; neutrals stay tinted at chroma 0.045-0.055)

| Token | OKLCH | Hex | Contrast |
|---|---|---|---|
| canvas | 0.160 0.045 262 | `#040c20` | - |
| surface | 0.200 0.050 262 | `#09152c` | - |
| surface-inset | 0.175 0.045 262 | `#061024` | - |
| surface-raised | 0.240 0.055 262 | `#101e39` | - |
| surface-hover / selected | 0.25 0.06 / 0.30 0.09 | `#11213e` / `#132b5a` | fg 12.3 on selected |
| fg | 0.96 0.012 262 | `#edf2fa` | 16.2 surface, 17.3 canvas |
| fg-secondary | 0.82 0.03 262 | `#bac5d8` | 10.4 / 11.2 |
| fg-muted | 0.72 0.04 262 | `#97a5be` | 7.3 / 7.8 |
| line-subtle / line | 0.26 0.055 / 0.33 0.07 | `#15233e` / `#213459` | 1.16 / 1.47 (decorative) |
| line-control | 0.58 0.10 262 | `#597ab6` | 4.2 surface, 4.5 canvas |
| accent / accent-text / signal / info | 0.82 0.13 210 | `#3adaf2` | 10.8 surface |
| accent-hover / ring | 0.88 0.09 210 | `#8de8f8` | ring 13.0 surface, 13.9 canvas |
| accent-fg | blue-950 | `#021239` | 10.9 on accent, 13.1 on hover |
| brand | 0.64 0.19 262 | `#4886fe` | 5.3 surface |
| ok | 0.80 0.14 155 | `#6ad895` | 10.3 surface |
| warn | 0.84 0.12 85 | `#eec469` | 11.0 |
| critical | 0.76 0.14 22 | `#fe8a88` | 8.0; navy label 8.0 |
| unknown | = fg-muted | `#97a5be` | 7.3 |

Status text on its own 10-14% soft wash: light 4.7-5.6, dark 6.5-8.3 (all at least 4.5). Muted text is allowed only for non-essential metadata at 13 px or larger. Cyan text is used at 14 px and heavier; body-size links in dark use `accent-hover`.

### Data-visualization palette (computed contrast and colour-vision separation)

Searched so that all five series differ by at least 12 OKLab units (x100) under normal vision and under simulated deuteranopia, protanopia and tritanopia, each at least 3:1 against the card surface.

| Series | Light | vs `#ffffff` | Dark | vs `#09152c` |
|---|---|---|---|---|
| viz-1 ultramarine | `#2357c8` | 6.4 | `#608cef` | 5.6 |
| viz-2 amber | `#c27e00` | 3.3 | `#ecad36` | 9.2 |
| viz-3 teal | `#009f97` | 3.3 | `#91f0ec` | 13.7 |
| viz-4 magenta | `#a1007c` | 7.5 | `#ce579e` | 4.7 |
| viz-5 ink ("other") | `#1f2735` | 15.0 | `#aab3c3` | 8.6 |
| Minimum pair distance: normal / deut / prot / trit | 21.3 / 15.1 / 14.3 / 15.4 | | 15.6 / 12.9 / 13.7 / 14.5 | |

Amber and teal at 3.3:1 are marks only, never text, and adjacent marks are separated by a 2 px surface gap (WCAG 1.4.11). Series never reuse status tokens; outcome series (completed, failed, cancelled, interrupted) use status colours plus a glyph (check, cross, dash, pause) and a label. Line series add a dash pattern and end markers; bars carry direct labels.

Sequential ramp (5 steps, hue travels with lightness; label colour chosen per step by the larger contrast, asserted at least 4.5):

| Step | Light | Label | Dark | Label |
|---|---|---|---|---|
| 1 | `#e3edff` | ink | `#132b5a` | near-white |
| 2 | `#abcdff` | ink | `#1e5099` | near-white |
| 3 | `#59a0f9` | ink (6.8) | `#0486d3` | navy (4.6) |
| 4 | `#2a66db` | white (5.2) | `#02bced` | navy (8.2) |
| 5 | `#0f3a90` | white (10.4) | `#6ee5f9` | navy (12.4) |

Withheld or unknown cells use the 45 degree hatch in `line-control` (`#657ba1` light, `#597ab6` dark) on `surface-inset`; under `forced-colors: active` the pattern uses `CanvasText` and `GrayText`.

### Buttons

44 px minimum height on coarse pointers, 32 compact and 40 comfortable on fine pointers, radius 4 px (controls), flat 1 px rise on hover only under `(hover: hover)`, 100 ms press with 0.985 scale, 150 ms colour transition, `transform` and `opacity` only.

| Variant | Dark rest / hover | Light rest / hover | Label contrast |
|---|---|---|---|
| Primary | hue-travel fill cyan-300 to cyan-500 at 135 degrees, label blue-950 | fill blue-600 to blue-800 at 135 degrees, label white | dark at least 8.6 along the path; light 5.1 at the lightest stop, 10.8 at the darkest |
| Secondary | fill surface-raised, `line-control` border | fill surface, `line-control` border | fg on fill 10+ |
| Ghost | no fill, label accent-text | no fill, label accent-text | 7+ |
| Destructive | fill critical, navy label | fill critical, white label | 8.0 / 6.5 |
| Disabled | fill line-subtle, muted label, `aria-disabled` kept focusable only when it explains why | same | exempt from 1.4.3 |
| Loading | spinner replaces icon, width locked, `aria-busy` | same | - |

Focus: 2 px `ring`, 2 px offset on the page surface, appears instantly, never clipped; `scroll-padding-top` keeps it clear of the sticky strip and topbar (WCAG 2.4.11). Gradient and glow rules: at most one gradient surface and one glowing element per viewport; no gradient text; dark glow `0 0 24px oklch(0.82 0.13 210 / 22%)` only on the live dot and cyan hover and focus; **light has no glow**; backgrounds are static.

### Type, space, radius, motion

| Role | Font | Notes |
|---|---|---|
| Display and page titles | Inter Tight 600, tracking -0.02em | fixes the collided headings (-0.035em in v1) |
| Body and UI | Inter 400/500, 14 px compact, 15 px comfortable, 16 px inputs on touch | |
| Data, IDs, units, timestamps | JetBrains Mono 400/500, 12-13 px, `tabular-nums slashed-zero` | data only, never decoration |
| KPI value | Inter Tight 600, 32 px (44 px hero KPI on Overview only) | |

Fonts are self-hosted variable woff2 through `next/font/local` with metric-matched fallbacks (hermetic build). Type scale (px/line): 12/16, 13/18, 14/20, 15/22, 16/24, 18/26, 20/28, 24/30, 32/38, 44/48. Spacing 4 px base (0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64). Radii 4 (controls, badges), 8 (cards), 12 (sheets, dialogs). Z-index 0, 10 sticky, 20 strip, 30 drawer, 40 dialog, 50 toast, 60 tooltip. Breakpoints 480, 640, 768, 1024, 1280, 1536. Motion tokens 100/150/220/320 ms, out easing `(.16,1,.3,1)`, standard `(.4,0,.2,1)`; only `transform` and `opacity`; `prefers-reduced-motion` sets durations to 0.01 ms, shimmer static, live pulse off; allowed: popover fade plus 4 px, sheet slide, toast, tab indicator, skeleton shimmer, copy confirmation; not allowed: counting numbers, bar growth, parallax, route transitions beyond opacity.

## 4. Component inventory

Primitives (CVA, tokens only, native elements first): `Button`, `LinkButton`, `IconButton` (tooltip required), `Input`, `Textarea`, `Field` (label, hint, error), `Select` (native with styled trigger), `Checkbox`, `Switch`, `RadioGroup`, `SegmentedControl` (roving tabindex), `Tabs`, `Breadcrumb`, `Pagination`, `Disclosure` (`details`), `Badge` (neutral, info, success, warning, critical, accent; never colour only), `StatusPill`, `Dialog` (`dialog`), `Sheet`, `Popover` (Popover API; anchor positioning if spike S5 passes, else a 60-line positioner), `Menu`, `Tooltip`, `Toast`, `Avatar` (initial plus provider glyph), `Kbd`, `CopyButton` (reports real clipboard result), `RelativeTime` (`<time>` with title), `Skeleton`, `Spinner`, `Meter`, `Separator`, `Card` (flat, raised, inset), `Callout`.

Composites: `AppShell`, `Sidebar`, `Topbar`, `StatusStrip`, `CommandPalette` (dialog plus listbox, owned), `RangePicker`, `UserMenu`, `PageHeader`, `Toolbar`, `FilterChips`, `Metric` (value, unit, label, delta, sparkline, context, source; states ok, loading, empty, unavailable, stale, withheld, error), `KpiTile`, `KpiRow`, `DataTable` (sticky header, sort, column menu, density, keyboard grid navigation, row actions; states loading rows, empty, empty-filtered, error, partial), `ChartFrame` (`figure`, caption, generated summary sentence, legend, "View as table" toggle, source note), `ProportionBar`, `BulletBar`, `Sparkline`, `LineChart`, `ColumnChart`, `HBarList`, `Heatmap`, `Waterfall`, state components (`EmptyState`, `ErrorState`, `UnavailableState`, `ForbiddenState`, `NotFoundState`), `MemberRow`, `InviteForm`, `InvitationRow` (pending, expired, consumed, revoked, TTL), `SessionRow`, `AuditRow`, `ConfirmDialog` (typed confirmation for destructive and irreversible actions), `Constellation` (decorative SVG).

Acceptance for every component: all states render in `/__kit`, axe zero, keyboard path, visible focus, reduced motion, both themes, snapshot in the visual project, Tailwind classes sorted, no literal outside tokens.

## 5. Data-visualization standard (ADR 0013)

| Question | Allowed | Forbidden |
|---|---|---|
| Is X OK? | `StatusPill` plus sentence | gauge, traffic light without text |
| How much (one number)? | `Metric` (delta, sparkline when history exists) | radial rings for small shares |
| Over time | `LineChart` (continuous), `ColumnChart` (counts per day, at most 45 bars), time axis, tabular numerals | smoothing across missing days, stacks above 4 series |
| Part of whole (at most 5) | `ProportionBar` with direct labels | pie or donut above 3 parts, 3D |
| Compare categories | sorted `HBarList` with inline value | dual axes, unsorted bars |
| Spend versus limit | `BulletBar` (settled, reserved, marks at 50/80/100) | ring, gauge; a 0 limit shows no percentage |
| Latency | p50 and p95 `Metric` pair plus a distribution strip (8-12 bins) and a waterfall per run | mean only |
| Density | discrete `Heatmap` (5 steps plus withheld hatch) | continuous rainbow |
| Sequence inside a run | `Waterfall`: shared ms axis, start offsets, nested spans, duration labels, critical-path marker | bars normalised to the longest phase (v1) |

Rules: every `ChartFrame` renders `<figure>` with a generated sentence ("20 of 24 runs completed (83%)") and a "View as table" toggle that swaps (not duplicates) chart and table; the table is the default under `prefers-contrast: more` and print; Recharts keeps `accessibilityLayer` with arrow-key navigation; charts accept `Series | Unavailable` so `null` cannot become zero; a chart with no usable points becomes the Unavailable state; a lint test greps presentation code for `?? 0`; sparklines only with at least 7 real points ("No trend yet" otherwise); no motion on data; hover and focus crosshair only; the first six forms are server-rendered SVG with zero client JS; Recharts (lazy, on `/usage` and `/analytics` only) renders only line and column.

## 6. Views (acceptance per view in addition to the cross-cutting gate)

Cross-cutting: light and dark at 1440, 1024, 768, 390 px; 200% text without clipping; axe zero (2.2 rules); keyboard-only completion of the primary task; all states reachable in fixtures; CLS at most 0.05; no zero for unavailable data; EN and ES.

| View | Primary KPIs | Key components | Acceptance |
|---|---|---|---|
| Overview `/` | executions 30 d with completion %, first-token p50/p95, estimated spend versus limit, helpful share | StatusStrip, 4 KpiTiles, ProportionBar (outcomes), Sparkline when history exists, Needs attention, deep-link tiles | The three questions answered without scroll at 1440 x 900; no tile above 120 px; "Ready" and "Fresh" become strip pills |
| Runs `/runs` | count, failure rate, slowest | DataTable, filter chips, peek sheet | Sort by duration; filter outcome plus ID prefix; `j`/`k`; server pagination for 10k rows; copy ID |
| Run `/runs/[id]` | total ms, time to first token, tokens, estimated cost | Waterfall, stage table twin, inspector, facts | Overlapping stages visible; cursor with ms readout; no prompts or answers; permalink; only sampled runs until PBO-D17 |
| Usage `/usage` | spend settled, reserved, limit; tokens; p50/p95 | BulletBar, ColumnChart, latency strip, error HBarList | "Estimated, not an invoice"; zero limit shows no percentage; missing pricing revision handled |
| Audience `/analytics` | views, clicks, exposures | filter chips, RangePicker, ColumnChart, countries table with inline bar, Heatmap, coverage details | Withheld cells never numeric; legend with text; table twin default under high contrast |
| Feedback `/feedback` | helpful share, volume, unresolved | ProportionBar, DataTable, peek sheet | Disabled-feature state explained; no transcript |
| Access `/access` | members, pending invitations, active sessions | MemberRow table, InviteForm, InvitationRow, SessionRow, linked providers | Cannot remove the last owner (inline reason); one-time link copy reports real clipboard result and warns it is a secret; revoke states the consequence; viewer sees Forbidden |
| Audit `/access/audit` | events | audit table, filters, row expand, export | No edit affordances; cursor pagination; UTC with local tooltip |
| Account `/account` | - | form sections | Preferences stored server-side (cookies) and applied before paint |
| Sign-in, Privacy | - | centered card with monogram | Buttons keep layout until hydrated; explains invite-only |

## 7. Unique identity: the Instrument checklist

Same as the sibling: routes skeleton, shell anatomy, templates, component names, states, chart rules, motion, density, shortcuts, semantic token names, accessibility gates. Different: palette pack, fonts, radii, elevation, icon stroke, illustration, signature details, voice. A screenshot with the logo removed must still be identifiable as this backoffice within a second; one with colours removed must show the same layout as the sibling.

## 8. Signature details (acceptance criteria, implemented once, reused)

1. **The trace rail.** Waterfall rows render a 1 px cyan time cursor that follows the pointer across spans and mirrors in the inspector with exact ms; Run detail's header shows a mini waterfall silhouette of the run as its thumbnail.
2. **Registration ticks.** KPI tiles and panels carry 6 px corner ticks at top-left and bottom-right in `line-control` (pseudo-elements, no transform), a nod to instrument bezels. Off in compact density if review judges them noisy.
3. **Unit chips.** Numbers show their unit in mono at about 60% of fg ("320 ms", "$0.02 / $10.00"); deltas sit in a tinted pill with an arrow glyph.
4. **Telemetry ticker (status strip).** Segments separated by 1 px dividers; a 6 px dot breathes (opacity, 2 s) only while data is live; off under reduced motion; below the strip a static 1 px hairline whose colour travels 262 to 210 left to right.
5. **Hatch for the unknown.** The 45 degree hatch is the single visual meaning of "no data" or "withheld" in every chart, cell and tile.
6. **The unlit constellation.** Empty states and the sign-in backdrop use a static SVG of 7-40 points joined by hairlines at 2-6% opacity (a nod to the portfolio's star field). In an empty state the points are unlit and the sentence says what will light them ("No runs in range. Widen to 30 d"). It never encodes data and is `aria-hidden`.
7. **Monogram.** The "G" in a 28 px rounded square filled with the hue-travel gradient (the one gradient of that viewport), also the favicon and `icon.tsx`.

Iconography: Lucide at 1.5 px stroke, 16 px, square caps, plus a small domain set (run, span, token, budget, corpus) drawn on the same grid. Illustration: none beyond the constellation. Voice: terse, confident, units first, sentence case; no all-caps copy except 12 px eyebrow labels at 0.04em.

## 9. Gates

| Gate | Rule | Tool |
|---|---|---|
| Token contract | DTCG valid; both themes define every semantic token; contrast pairs (fg, secondary, muted, accent-text, status on surface and canvas at least 4.5; line-control, ring, viz marks at least 3; ring against both adjacent surfaces); viz CVD distance at least 12 under all four simulations; no literal outside tokens | `scripts/guards/check-tokens.ts` |
| Visual regression | Routes x light/dark x 1440/768/390 x states x EN/ES (key views), `maxDiffPixelRatio` 0.002, animations disabled, frozen clock, pinned Playwright container; WebKit smoke on 3 key views | Playwright `toHaveScreenshot` |
| Accessibility | axe `wcag22aa` on every route x theme x locale x role x state; keyboard tests per template (palette, peek sheet, focus restore, dialog trap, skip link); 200% and 400% reflow; forced-colors test for hatch and status shapes; 3.2.6, 3.3.7, 3.3.8 checks | `@axe-core/playwright`, Playwright |
| Performance | Per-route first-load JS at most 170 KB gz excluding the lazy chart chunk; Lighthouse mobile perf at least 0.85 on `/` and 0.90 on sign-in (5 runs, median) from PBO-M3, a11y 1.0, TBT at most 300 ms (warn) | `check-bundle.ts`, Lighthouse CI |
| Manual per release | VoiceOver Safari on one view per template, NVDA Firefox on tables and charts, 400% zoom | checklist in `docs/how-to/release.md` |
| Evaluator | Independent agent scores lens 2 on screenshots (3 viewports x 2 themes x states), at least 95 per axis | scorecard |

## 10. Implementation notes

- Migration by replacement (PBO-D1): new shell first, then Access, Overview, Runs, Usage, Audience, Feedback; each route deletes its CSS Module and old presentation file; `quality/ratchets/css-modules.json` lists the remaining modules and only decreases. v1 sizes: 1,195 lines of CSS.
- Kit: `shared/ui`, `tokens/structure`, `lib/cn.ts`, chart wrappers and test helpers are synced from `engineering-standards/design-kit/` with `kit.lock.json` (commit SHA, file hashes); CI `check-kit` fails on local drift unless declared in `kit.exceptions.json`.
- Risks and mitigations: over-unifying with the sibling (identity checklist, logo-removed review), rebuild scope (route by route, domain untouched), kit drift (lock plus hash), Recharts a11y and size (wrapped, lazy, replaced where possible), dense UI versus touch and 200% text (density forces 44 px on coarse pointers), honesty regressions (`Series | Unavailable` types, `?? 0` lint), dark and light parity (both in every visual test).
- Not decided here: public copy for the sibling; the portfolio site's hero particle system (separate plan).
