# Senior designer rubric

Lens: a senior product designer reviewing an operations backoffice in both themes, both
locales and on desktop and phones. Criteria marked **C** are critical (see
[scoring](README.md#how-to-score)). Details live in
[design and data-viz](../research/design-and-dataviz.md).

## 1 · Visual design and design system

- **C** Tokens generated from the DTCG source shared with the portfolio, with a drift check
  against the pinned portfolio commit; type, spacing, elevation, z-index and motion scales.
- **C** Light mode at the same quality as dark mode: elevation, contrast and hierarchy
  reviewed in both themes in the approved visual baseline.
- One styling language (CSS Modules + owned primitives); portfolio identity (typography, cyan
  accent, real monogram/icon).

## 2 · Dashboard UX and data-viz

- **C** Five-second test with 3 people ("is it healthy?", "how much is left?"): 3/3 correct.
- **C** Status strip, KPI row and form-by-question charts; no chart duplicates its table; no
  invented trends.
- Shared-axis trace waterfall, bullet budget, localized axes and relative times, heatmap with a
  visible legend; series contrast ≥ 3:1 validated by script in both themes.

## 3 · States

- Loading, empty, partial, unavailable (with reason) and error states designed and captured in
  both themes and locales.

## 4 · Responsive and mobile

- **C** Approved captures at 390 and 1280 in chromium and webkit; verified on the iPhone Safari
  device profile; no horizontal overflow from 320 to 1920; 200 % text and landscape.
- Mobile header 56 px with an account menu; safe-area insets; targets ≥ 24×24 (44×44 for
  primary controls).

## 5 · Accessibility (design)

- **C** Color is never the only channel; focus visible and not obscured; Lighthouse
  accessibility 100.
- Motion is functional only and respects reduced motion.
