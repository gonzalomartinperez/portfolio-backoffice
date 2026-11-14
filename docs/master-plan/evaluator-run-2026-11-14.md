# Independent evaluator run, 2026-11-14 (PBO-M2-11)

First independent scoring of the judgement axes (lens 2, senior product designer, P1-P6; lens 3,
senior recruiter, R1-R7) under rubrics v2. These replace the provisional planner baselines in
[scorecard.md](scorecard.md). They are recorded in `quality/ratchets/scorecard.json`, which the
nightly `scorecard.json` reports under `judgement`.

## Method

- Two fresh evaluator agents, one per lens. Each had the rubric (`rubrics.md`) and the evidence,
  but not the planner's scores: `scorecard.md`, `progress.md`, `audit.md`, the plan README and the
  roadmap were excluded.
- Lens 2 evidence:
  - the 54 pre-redesign full-page screenshots from PBO-M2-4 (`tests/browser/__screenshots__`):
    five pages, EN and ES, dark and light, 390, 768 and 1440 px, synthetic fixture data, commit
    `181a88c`;
  - the source on `develop` (tokens in `src/app/style.css`, shared UI, browser tests);
  - the measured facts: axe reports 0 violations with the WCAG 2.2 AA tags, and Lighthouse
    accessibility is 100 on every route (CI run 43642010798).
- Lens 3 evidence: the public default branch (`main`, the page a visitor sees), with its README,
  docs, ADRs and community files, plus a delta note for `develop` and the screenshots.
- Each theme is scored and the minimum counts. A criterion without evidence is unmet.

## Scores

| Axis | Score | Provisional | Main reasons (unmet critical criteria in bold) |
|---|---|---|---|
| P1 Visual design and system | 72 | 68 | Tokens exist and contrast is ratcheted. **No DTCG source, no literal lint, no fluid type scale**, 11-12 px captions |
| P2 Interaction and motion | 70 | 72 | Reduced-motion CSS exists. **320 ms duration token, box-shadow transition, no loading/empty/error state for every async view** (empty Invitations) |
| P3 Accessibility | 88 | 84 | Axe 0 and Lighthouse a11y 100. Target size and chart keyboard evidence partial. Known below-WCAG token pairs |
| P4 Responsive and cross-browser | 72 | 72 | Five browser projects, no mobile overflow. **Visual baseline not yet approved, no 320 or 1920 px evidence.** Wide auth and legal pages left-hung |
| P5 Theme parity | 86 | 74 | Same structure and tokens in both themes. Notice and wash treatments differ. Subtle dark card boundaries |
| P6 Consistency and identity | 62 | 70 | **Access, sign-in and privacy lack the app shell. Shared primitives stop at Button**; mixed heading, spacing and button treatments |
| R1 First-screen clarity | 78 | 80 | Clear tagline. A dense "Current state" caveat block above the fold; hero image below the fold |
| R2 Proof | 62 | 82 | Real evidence exists, but no headline measured numbers in the README; the dashboard figures are synthetic |
| R3 Writing quality | 74 | 78 | Precise and honest, but dense and repetitive, with operational detail in the README |
| R4 Credibility | 88 | 88 | SECURITY, ADRs, pinned actions, labelled synthetic data. No CI badge or release yet |
| R5 Calls to action | 50 | 70 | No contact, portfolio link or "see it live" path for a recruiter; operator-only audience |
| R6 Polish | 82 | 75 | Clean, coherent UI. Stale gallery ("Assistant operations"), README typos, a no-op `<picture>` |
| R7 Differentiation | 72 | 70 | Privacy-first, "unavailable, never zero", enforced architecture, but buried under caveats; the UI reads as a standard dashboard |

The evaluators reported medium confidence: they judged from screenshots, source and docs, without
running the app. Lens 3 scored the stale `main`. The `develop` README differs little (about 13
lines trimmed), so R2 and R4 would gain slightly once the M2 evidence is surfaced.

## Top improvements named by the evaluators (inputs to M3-M5, not commitments)

1. App shell and shared primitives (Card, Field, Notice, List) on every page, including access,
   sign-in and privacy. Design the access page with an invitations table and an empty state (P6,
   P2).
2. DTCG token source with a literal lint, a fluid type scale and transform/opacity motion of at
   most 300 ms. Fix the below-WCAG token pairs (P1, P2, P3; already M5 scope).
3. Approve the visual baseline after the redesign, and add 320 and 1920 px evidence (P4).
4. README first screen: a one-sentence value line, a hero image at the top, a two-line status
   instead of the caveat block, an "At a glance" block with measured numbers from `scorecard.json`
   (tests, coverage, mutation, Lighthouse), and a contact and portfolio link. Regenerate the
   gallery (R1, R2, R5, R6; README template work in M3 and M6).
