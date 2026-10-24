# Design and UX for an operations backoffice

Planning only. Bracketed numbers refer to [sources](sources.md). Owner requirements that shape
this section: design tokens shared with the portfolio, light mode at dark-mode quality, and
cross-browser/mobile quality including iPhone Safari.

## Information hierarchy (Overview)

Five-second question: "is the assistant healthy, did anything change, how much did I spend?".
Target layout:

1. **Status strip** (sticky below the header, 48 px):
   `Service ● Healthy · Knowledge ● Fresh (indexed 2 h ago) · Budget 0.3 % of $10 · Checked 3 min ago [Refresh]`.
   Each item with icon + text (never color alone) and a link to its detail.
2. **KPI row** (4 compact stat tiles, 96–112 px high): Executions 30 d (with completion %),
   first-token p50/p95, estimated spend (settled + reserved), helpful share (feedback, if
   enabled). *Value + label + context* pattern; delta and sparkline **only when a historical
   contract exists** (today: show an honest "No trend data", not an empty sparkline).
3. **Execution composition**: horizontal 100 % *proportion bar* (completed/cancelled/failed/
   unclassified) with direct labels and counts; table in a "View data" `<details>`.
4. **Latency and traces**: waterfall with a shared time axis (ms) per trace, outcome filter,
   search by abbreviated ID (8 chars) with a copy button, sort by duration.
5. **Budget**: *bullet bar* (actual vs reserved vs limit, 50/80/100 % marks), text
   "Headroom $9.97"; ring removed or reduced to tile decoration.
6. **Provenance** (API commit, pricing revision, corpus) in the page footer.

Interactions (`/interactions`): visible filters as removable chips + "Reset" [17]; KPI row
(views/clicks/exposures); daily *column chart* with a localized axis (`Intl.DateTimeFormat`
`{day,month}`); countries as a **table with an inline bar** (not a separate chart); heatmap
with a perceptual sequential scale (OKLCH, 5 discrete steps + "withheld" with a striped
pattern) and a visible legend.

Access: member list as a table (email, role, provider(s), joined, last access), invitations
with state (pending/expired/consumed/revoked) and remaining TTL, audit in a tab.

## Data-visualization rules (ADR 012)

- Form by question: state → text + badge; single magnitude → stat; part-to-whole of ≤ 5 →
  proportion bar; time series → line/column with a time axis; comparison between categories →
  sorted horizontal bar; latency distribution → p50/p95 + waterfall; spatial density →
  discrete heatmap. Forbidden: pie/donut with > 3 parts, 3D, dual Y axis.
- Minimal ink: faint horizontal grid (`--viz-grid`), no plot borders, direct labels instead of a
  legend when there are ≤ 4 series, tabular numbers (`font-variant-numeric: tabular-nums`).
- Numbers: tiles rounded with compact units (`Intl` `notation:"compact"`), exact values in
  tables [17]; currency with 2 decimals except `< $0.01` (then "< $0.01"), never 4 decimals in
  tiles.
- "Unavailable ≠ 0": every metric is a `Metric<T>`; the `Stat` component renders `—` + the
  text "Not available" + the reason (tooltip/`aria-describedby`); never a zero-height bar.
- Accessibility: every chart in a `ChartFrame` with `<figure>`, `<figcaption>` (title +
  generated text summary: "20 of 24 completed (83 %)"), alternative table, Recharts
  `accessibilityLayer` [12] (arrow keys, not Tab per point), visible focus on the surface, mark
  contrast ≥ 3:1 against the background in both themes (WCAG 1.4.11) and between adjacent
  series; color is never the only channel (patterns/labels) [13][14].
- Animation: none on data (consistent with today); 140 ms transitions only on hover/focus.

## Color and themes

- 5-slot categorical palette in OKLCH with lightness adjusted per theme (dark: L 0.78–0.86;
  light: L 0.45–0.58), validated by a script (`scripts/check-palette.ts`: 3:1 contrast vs
  `--surface-raised`, ΔE between slots ≥ 15 under deuteranopia/protanopia simulation) —
  Okabe-Ito base adapted to the portfolio's cyan accent [14].
- Semantic colors separate from categorical ones: `--status-ok/warn/critical/unknown` (with an
  icon) ≠ `--viz-1..5`.
- Sequential (heatmap) scale of 5 steps on the accent; withheld = pattern, not color.
- Light mode at the same level: surfaces with elevation from a soft shadow (not only borders),
  accent `#0a6e9b` already AA; check `--text-muted #5c687b` on `#f1f4f8` (≥ 4.5:1) in automated
  tests.

## Design system shared with the portfolio

- Source of truth: DTCG tokens in the portfolio (decision B1 of the portfolio's engineering
  target state), exported with Style Dictionary to CSS vars + TS [21]. In the backoffice:
  `src/shared/tokens/` generated and **committed**, with `scripts/check-tokens.ts` comparing the
  hash against the portfolio's pinned commit (no cross-repository runtime dependency; respects
  "no runtime import crosses repositories").
- Scales to add (missing today): typography (12/13/14/16/20/24/32 + display), 4-pt spacing
  (`--space-1..10`), z-index, per-theme shadows/elevation, durations (`--duration-micro 140`
  and `--duration-transition 320` already exist) and easing; `comfortable|compact` density via
  `data-density` (tables and traces compact by default on desktop ≥ 1280).
- Primitives (CSS Modules, without Tailwind so as not to add a second convention; justify in
  ADR 011): `Card`, `Stat`, `Badge/StatusPill`, `Table` (sticky header, numeric alignment,
  optional zebra), `Disclosure`, `Tabs` (native with roving tabindex), `Field/Select/Input`,
  `Skeleton`, `EmptyState`, `InlineNotice`, `CopyButton`, `RelativeTime`. Portfolio identity:
  Inter/Inter Tight/JetBrains Mono (already), cyan accent, "G" brand mark → use the portfolio's
  real monogram/icon + favicon/`icon.tsx`.

## Motion

- Functional only: skeleton shimmer ≤ 1.2 s (off with reduced motion), 140 ms fade on filter
  change, *optional* View Transitions between shell sections (the portfolio already evaluated
  support in its research); never animate numeric values or bars.
- Refresh: `router.refresh()` from a button (no full reload) + optional auto-refresh every 60 s
  paused while `document.hidden`; an `aria-live="polite"` region only for "Updated 10:42".

## Responsive and mobile

- Shell: on desktop a collapsible side nav (≥ 1100) or top nav; on mobile a 56 px header +
  account menu in `<details>`/dialog, horizontally scrollable status strip, safe-area insets.
- Tables on mobile: card list or horizontal scroll with a sticky first column; targets
  ≥ 24×24 px (WCAG 2.5.8 [19]), 44×44 target for primary controls.
- Verification matrix: iPhone Safari (WebKit `iPhone 15`), Android Chrome (`Pixel 7`), desktop
  Chrome/Firefox/Safari, 320/390/768/1280/1920, 200 % text, landscape [11].
