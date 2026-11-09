# 13 - Master UI/UX foundation for the two public sites (portfolio, pequeverso)

Date: 2026-11-09. Builds on `06-ui-ux-design.md` (tokens, motion, a11y, budgets) and `07-cro-seo-analytics.md` (CRO, trust, legal); neither is repeated here, only referenced as 06 and 07. Scope: polish and elevate the current identities, never replace them. Everything below is a plan; nothing was changed in either repo.

Evidence base. Code read from `origin/develop` after `git fetch` (portfolio `0a1ff56`, 2026-10-25; pequeverso `cbf519c`, 2026-10-19). Portfolio measurements come from `docs/master-plan/audit/baseline-2026-10.md` in the portfolio repo (Lighthouse 12, axe 4.11, rAF sampling on a GTX 1050 via WSLg; lab only, no field data). Pequeverso measurements come from two fresh Lighthouse runs of the live home page in `audit/pequeverso/lighthouse/_home_mobile_{1,2}.json` (HeadlessChrome 157, simulated 4G, 4x CPU). `audit/portfolio/raw/` was empty when read, so fresh portfolio numbers are not included. Web research: three searches this session (Lenis, LoAF, WebGPU); results were mostly secondary and are flagged inline. Items I did not verify at a primary source are marked **(unverified)**.

---

## 1. Current-state critique

### 1.1 Portfolio (Next 16.4.2, React 19.3.1, GSAP 3.15, three 0.186.1, Tailwind 4.3.3)

What is already strong (keep): original identity (face caricature mark, particle sphere that opens into a technology catalogue, solar-system ambient field); `data-theme` as the single theme authority with pre-paint replay; CLS 0 on every route; axe clean except one systematic rule; skip link, 2 px focus ring, trapped dialogs; reduced motion respected on every layer (static SSR scene, 0 canvases); GSAP carousel with pause button; token files in one place (`src/app/globals.css`, 517 lines). Baseline score from the owner's rubric: **70/100** (visual 15/20, motion 14/20, performance 7/15, a11y 12/15, responsive 7/10, navigation 7/10, uniqueness 8/10).

Critique, ordered by impact on a recruiter's first 30 seconds and on the designer score:

1. **Mobile LCP 4.4-6.1 s (lab) even without WebGL** (`baseline-2026-10.md` section 1.2: 4.39 s on `/` with `--disable-3d-apis`). The LCP element is SSR text; 90-92% of the delay is render delay behind 395-465 KB of JS per route (`3794-*.js` 0.8-1.5 s scripting at 4x). Fluidity starts with first paint: the screen is blank for 4+ s on a mid-range phone.
2. **Two full-screen WebGL contexts on home** (hero sphere plus solar background), 11-14 MB heap. The solar field is `position: fixed`, so "always on screen": 60 fps rAF on every route, no idle pause, no render-on-demand. Desktop DPR 1 renders it at 0.62x. Textures (1.3 MB mobile, 2.2 MB desktop) download on every route, including `/contact`.
3. **The signature moment stutters.** First hero scroll on desktop: p99 1,067 ms frame, 18 fps over the scroll window; mobile 390 with 4x CPU: 43 fps, 14 frames over 33 ms. That is the wow moment (sphere opens into the logo cloud) and it is where it drops frames (mounting/decoding 100+ brand tiles or shader compile; not yet profiled).
4. **Home is 9,628 px tall on mobile** (hero journey) with 100+ keyboard tab stops through catalogue chips before the first project. Wayfinding and a11y both fail here.
5. **Light mode is a compatibility mode, not an identity** (audit section 3.3): `--field-additive: 0` turns the sphere into flat gray-blue noise; planets get transparent night sides (`nightAlpha`) so they read as milky blotches behind paragraphs; `--line-subtle: #e6e9ee` on `#fafafb` is about 1.2:1 and cards have no shadow token; header veil barely separates; portrait photo forms a dark rectangle; accent `#0a6e9b` passes contrast but has no "wash" so badges and rings vanish. Dark relies on additive light; light has no equivalent language.
6. **Page transitions are not designed.** `src/shell/page-motion.tsx` runs a 0.94 to 1 opacity fade for 180 ms and an IntersectionObserver that lifts sections by 8 px. No View Transitions, no directional memory, no theme-switch moment; the theme toggle is instant while two WebGL scenes flip.
7. **Motion tokens are thin**: two easings and 140/320 ms (`globals.css`); button hover uses a perspective `rotateX(3deg)` lift (a distinctive, slightly toy-like gesture) and transitions only transform and box-shadow, so background and color snap.
8. **Bilingual polish gaps**: `/es` served as `lang="en"` and corrected on the client (SEO 92, hreflang fails); the 404 under `/es/...` renders English; live region says "1 technologies and concepts"; uppercase mono eyebrow wraps to 3 lines at 390.
9. **No pause control** for the ambient solar animation (WCAG 2.2.2); `setPageMotionPaused()` exists in `src/shared/motion/motion-state.ts` but no component calls it.
10. Smaller: `label-content-name-mismatch` on 383 nodes (React Flow nodes, brand link, contact cards); EN/ES switch 38x34 px; `/stack` is 29,411 px tall on mobile; body text passes over moving planets so contrast varies per frame (axe reports 2,338 "incomplete" contrast nodes).

### 1.2 Pequeverso (Next 16.4.2 static export, React 19.3.1, GSAP, lazy three, Tailwind 4.3.3, TS 7)

What is already strong (keep): a documented design system (`docs/design-system.md`, ADR-0006): OKLCH `--pv-*` primitives, semantic roles, `on-navy`/`on-light` re-scoping, contrast pairs asserted by `tests/unit/design-system.test.ts`; "coral only for the purchase action" is a real rule; fluid type with metric-matched fallbacks (Fraunces 700, Nunito Sans); CSS-first motion (`src/shared/motion/motion.css`: scroll-driven reveals under `@supports (animation-timeline: view())`, hero entrance that never fades the LCP title, orbit that follows scroll rather than a clock); React `<ViewTransition>` already used locally (`age-selector.tsx`, `hero-stack.tsx`, gated by a motion-ok hook that includes Save-Data); server-first blocks; a static SVG fallback for the starfield and a webpack scene-budget plugin; a deliberate no-`backdrop-filter` policy (WebKit/Playwright issues documented); a syllable playground that is real product proof; an assistant that ships disabled behind a build-time flag with no code emitted. Budgets in `config/budgets.json` (route JS about 150-165 KB gz, deferred scene 177.6 KB of a 250 KB cap).

Critique:

1. **Live performance contradicts the documented 100.** The two fresh runs of the live home page score **54 and 55** (LCP 4.6 s / 4.3 s, TBT 1,810 / 2,360 ms, TTI 10.3 s, 1,099 KiB). `docs/performance.md` records 100 / 699 ms LCP on the static export. The difference is explained by the third-party summary: **`connect.facebook.net/en_US/fbevents.js` is 209 KB transferred and 2,112 ms of main-thread blocking** in a fresh browser profile. Docs and 07 say the pixel is consent-gated, so a fresh profile should not load it. Either the live build loads it before consent, the consent default differs from the documented one, or the audited deployment predates the gating. **I read only the first 60 lines of `adapters/meta.ts`, so this is a hypothesis to verify, not a finding.** If confirmed it is simultaneously a privacy-law issue (07 section 10), a CRO issue (LCP 4.3-4.6 s on a social in-app browser) and the main fluidity problem. The first-party JS chunks are modest (63 and 66 KB transfer).
2. **Home is a two-product hub** (kit plus a third-party affiliate course), with no single purchase action on `/`. That is an owner decision (`docs/specs/home-hub.md`, owner request 2026-10-13), so design effort goes into making the choice instant and equal, and into making `/grafismo-fonetico/` the conversion page. The hero ends in two "doors" plus an affiliate disclosure line; the h1 "Un pequeno universo para cada etapa." is evocative but says nothing concrete about a printable kit to a parent arriving from an Instagram ad; the concrete promise lives one click deeper.
3. **View Transitions are local only.** There is no route-level continuity between home door, kit landing and checkout hand-off. ADR-0006 puts `<ViewTransition>` as the "second" motion layer; it has not reached navigation.
4. **Product page is rich but long**: hero composition, buy box, includes, method steps, audience cards, creator note, playground, gallery wall, video block, offer card, FAQ, final offer, sticky CTA. Ordering and CTA rhythm have not been designed against a measured scroll depth (no analytics events yet; 07 P1 item 9).
5. **Still two token systems on product pages**: legacy CSS Modules sit next to Tailwind (`docs/performance.md`: "product pages still load their legacy CSS Modules"), so spacing and radius drift is possible on exactly the page that sells.
6. **Light-only (ADR-0006)**: defensible (06 section 8); no `color-scheme` meta or dark-ready `light-dark()` indirection is mentioned in the design system, so the "no-regret path" from 06 is not yet built.
7. **No measured fluidity gate**: LCP/CLS/TBT are gated (`lighthouserc.json`), frame time and INP are not. The scroll-driven reveals and orbit are compositor friendly, but nothing proves 60 fps on a low-end Android.
8. **Assistant entry**: the launcher stacking is designed (launcher 70 below sticky buy bar 60-70 below consent banner 90 below assistant panel 95, in `assistant.module.css`) but the disabled-state and activation UX are not specified as a product contract (section 4.7).

---

## 2. Shared motion and fluidity system

One engineering spec, two skins. Both repos get the same token names, the same choreography rules and the same gates; only values and "voice" differ.

### 2.1 Decisions on tooling (2025-2026 state of the art)

| Question | Decision | Why |
|---|---|---|
| GSAP vs Motion | **Keep GSAP** (both repos already ship 3.15; free since 2025 including ScrollTrigger and SplitText per the vendor pricing page, cited in 06 as [C]). Do not add Motion. | Adding a second animation runtime costs bytes and two mental models. CSS + WAAPI + React `<ViewTransition>` cover UI motion; GSAP is only for sequenced timelines, the 3D handoff and the ScrollTrigger fallback. Check the license text before relying on "free" for commercial use (06 flagged the text was not shown). |
| Smooth-scroll library (Lenis style) | **No, on both sites.** | Thoughtworks Radar flags Lenis for problems with vertical/horizontal scroll that can confuse users with disabilities; community guidance is to disable it for reduced motion and touch (`syncTouch: false`). It smooths wheel and touch only, leaving scrollbar and keyboard unsmoothed (inconsistent feel). No Lenis-specific INP measurements exist in what I found (secondary sources only). For pequeverso, parents scroll inside Instagram/TikTok in-app browsers where native momentum is the best-feeling thing available. For the portfolio, the hero journey is already scrubbed by ScrollTrigger on native scroll; "fluidity" there is a frame-time problem (section 1.1 item 3), not an easing-of-scroll problem. Revisit only if a measured design need appears, and then only desktop, fine pointer, no reduced motion. |
| Scroll-linked effects | **CSS scroll-driven animations first** (`animation-timeline: view()/scroll()`), GSAP ScrollTrigger as the documented fallback and for 3D scrub. | 06 records Baseline in Oct 2026 with Firefox 159 (Chrome 115, Safari 26), **(unverified at a primary source; web.dev roundup only; older June 2026 sources said flagged)**. Keep `@supports` guards and a "final state visible" fallback regardless. They run off the main thread when only transform/opacity change, so they do not hurt INP. Pequeverso already does this; the portfolio's `PageMotion` IntersectionObserver reveals should migrate to it. |
| Route transitions | **React `<ViewTransition>` at page level (same-document, App Router)**; cross-document `@view-transition` only for real full-page loads. | Same-document is Baseline Newly available since 2025-10-14 (06 S22). Next navigations are React transitions, so they animate automatically; wrap in each `page.tsx`, not the layout; anchor the header with a `view-transition-name` and `animation: none`; `::view-transition { pointer-events: none }`. Cross-document (Chrome 126, Safari 18.2, Firefox unverified) is irrelevant to Next client navigation and to the cross-origin Hotmart hand-off; the only place it helps is a hard load between two same-origin documents. In-app WebViews may lack both: treat as progressive enhancement and test one Instagram in-app session. |
| Prefetch / instant feel | Prefetch on viewport (Next default) plus **prefetch on intent** for the 2-3 money links (hover, focus, pointerdown) and immediate pressed state; never optimistic fake-navigation. | Perceived speed under 100 ms is "instant" (06 section 3, NN/g limits). The pressed state plus a 100-150 ms exit hides most of the remaining network. Speculation Rules prerender is Chromium-only and moot for a Next client-nav; skip. |
| Skeleton vs optimistic UI | Public marketing sites have almost no async UI; use **no skeleton under ~1 s**, reserve space (aspect-ratio) for everything that arrives late; skeletons only for the assistant panel and lazy gallery. Optimistic UI only for local state (filters, language/theme switch). | 06 section 4 thresholds. |
| WebGPU | **Stay on WebGL2 for production**; do not migrate three to the WebGPU renderer in Phase A/B. Feature-detect WebGPU only as a Phase C experiment. | Sources conflict: one says iOS 26 gave Safari full WebGPU, another (older) says none; three's `WebGPURenderer` falls back to WebGL2 automatically, but forum reports (r181, r182) describe the fallback path and WebGPU being slower than the plain WebGL renderer in some scenes (anecdotal, no benchmark found). Our scenes are point clouds and textured spheres; the bottleneck is main-thread/mount cost and fill rate, not draw-call throughput. A WebGPU migration is a risk with no measured upside. |
| 60/120 fps | Design to a **8.3 ms** budget on 120 Hz displays, validate at 16.7 ms on a 4x-throttled mid phone. | See 2.5. |

### 2.2 Tokens (unified names; sites override values)

Primitive layer (shared), semantic layer (per site), component layer only when two or more variants diverge (06 section 1).

```css
:root {
  /* durations (ms) - UI never exceeds --dur-page; anything longer is a named cinematic moment */
  --dur-instant: 100ms;   /* press, toggle */
  --dur-fast:    150ms;   /* hover, tooltip, EXIT of any enter/exit pair */
  --dur-base:    220ms;   /* menu, popover, color/bg changes, ENTER */
  --dur-slow:    320ms;   /* dialog, drawer, sheet */
  --dur-page:    400ms;   /* route and shared-element morph (UI maximum) */
  --dur-reveal:  480ms;   /* scroll reveal (pequeverso already uses 480) */
  --dur-hero:    700ms;   /* hero intro, first paint choreography only */
  --dur-theme:   520ms;   /* theme toggle reveal (portfolio only) */

  /* easings */
  --ease-out:      cubic-bezier(0.23, 1, 0.32, 1);    /* default entrance, hover */
  --ease-emphasis: cubic-bezier(0.05, 0.7, 0.1, 1);   /* decelerate, hero/reveal */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);        /* movement on screen */
  --ease-exit:     cubic-bezier(0.3, 0, 0.8, 0.15);   /* exits */
  --ease-spring:   linear(0, 0.5 7%, 0.95 21%, 1.04 31%, 1.01 43%, 1); /* CSS linear() spring, drawers, tilt release */

  --stagger: 50ms;  /* x --i, max 6-8 items, total < 500 ms */
  --travel-sm: 8px; --travel-md: 16px; --travel-slide: 60px;
}
```

Reconciliation with what exists: portfolio `--ease-out cubic-bezier(.16,1,.3,1)` and 140/320 map to `--ease-out` (swap to the quint curve; visually near-identical, slightly faster start) and `--dur-fast`/`--dur-slow`; pequeverso keeps its `--duration-*` names as aliases so no churn (`--duration-fast` 150, `--duration` 220, `--duration-reveal` 480, `--duration-hero` 600 to 700). The `linear()` spring is Baseline (2023) CSS; it avoids shipping a spring library. The numbers are recommendations synthesized from 06 and the Next.js view-transition guide (exit 150, enter 210, move 400, slide 60 px), not quotes.

### 2.3 Choreography rules (testable)

1. **One hero per screen.** At most one element runs a cinematic (over 400 ms) motion at a time; everything else is utility timing.
2. **Exit before enter, exit shorter** (150 vs 220 ms; 0.7x). Entering content never waits on JS: the LCP element (h1, hero image or poster) never animates opacity from 0 (already a rule in pequeverso's `motion.css`; adopt in the portfolio's hero).
3. **Stagger 40-60 ms, max 8 items, total under 500 ms**; beyond that the remainder appears together.
4. **Spatial continuity**: if something moves, the user sees where it came from (shared-element morph for case-study thumbnail to hero; product door to product page; popover grows from its trigger via `transform-origin`).
5. **Frequency inversely proportional to ornament**: keyboard actions, filters, repeated toggles get no animation beyond a 100 ms state change.
6. **Press feedback within 100 ms of pointerdown**; `scale(0.97)` on `:active`; never animate from `scale(0)` (start at 0.92-0.95).
7. **Transform/opacity only** (plus `filter` sparingly, `clip-path` for the theme reveal only); never `transition: all`; background/color transitions allowed at 150-220 ms for controls because they are tiny layers (portfolio buttons currently snap; fix).
8. **Interruptible**: hover/press/menus use CSS transitions or WAAPI so a new state retargets; no fire-and-forget keyframes on interactive elements.
9. **Hover only where hover exists**: `@media (hover: hover) and (pointer: fine)`; touch gets pressed state only.
10. **Ambient motion is pausable and idle-aware**: pause on `visibilitychange`, offscreen, reduced motion, Save-Data and after ~10 s of no input for continuously rendering canvases (render on demand); a visible pause control satisfies WCAG 2.2.2.
11. **A route change is a transition, not a reload**: header, theme and (portfolio) background persist; only `main` morphs.

### 2.4 Page transitions and scroll storytelling

Page transitions (both sites): `<ViewTransition>` wrapper per page with default crossfade 150 ms out / 220 ms in plus 10 px rise; `addTransitionType` for `nav-forward` / `nav-back` so slides are directional; shared element names for (portfolio) work-card thumbnail to case-study hero and (pequeverso) door image to kit hero (`view-transition-name` unique per route; `view-transition-class` for shared styling). 3D canvases are excluded from snapshots (named and `animation: none` or hidden during the transition) and the render loop pauses while it runs, otherwise the old/new snapshot shows a frozen frame. Reduced motion: keep the crossfade at 100 ms, remove the slide and shared-element travel.

Scroll storytelling rules:

- **Native scroll always; never change scroll speed, never pin for more than about 1.5 viewports**; pinned sequences must have a skip anchor and an equivalent static layout under reduced motion.
- Every scroll effect has three outputs: a CSS scroll-driven version, a GSAP fallback (only for essential effects), and a static fallback (content fully visible, no JS).
- Amplitudes: parallax at most 10-20 px (pequeverso's `--parallax-range 20px` is at the cap); no parallax at all for text blocks.
- `ScrollTrigger.refresh()` after language switch (EN/ES changes heights), fonts ready, and lazy images; create pins in scroll order; no nested ScrollTriggers inside timeline tweens (06 and the portfolio playbook cite GSAP's own mistakes list).
- A story beat is one idea: copy appears, visual changes, then rests. Reading time between beats at least the copy's reading time (about 0.25 s per word, so a 12-word beat needs a 3 s dwell, which at scroll speed means about 0.5-1 viewport of scroll).

### 2.5 Reduced motion and device-class variants

| Class | Trigger | Behavior |
|---|---|---|
| Full | `no-preference`, fine pointer, no Save-Data, `hardwareConcurrency > 4`, `deviceMemory >= 4` (when exposed) | Everything |
| Lite | coarse pointer or mid device | No tilt/cursor effects, DPR cap 1.5, 3D at 50-75% density, fewer simultaneous reveals |
| Still | `prefers-reduced-motion: reduce` | Static poster/SVG, opacity-only reveals at 100-150 ms, no parallax, no autorotation, no shared-element travel, no smooth anything; keep focus feedback, loaders, state color changes |
| Saved | `Save-Data`, or `effectiveType` slow-2g/2g/3g when exposed, or quality tier 2 after 2 s under 45 fps | Poster, no 3D download, CSS-only motion |

Never use the blanket `animation: none` kill switch for everything (it breaks `animationend` logic; 06 section 3); pequeverso's globals.css has a "reduced-motion kill switch"; review it so it shortens to about 1 ms and swaps to fades instead of removing state changes. Listen to `matchMedia(...).addEventListener('change')` for runtime changes, not only on mount.

### 2.6 Performance budgets (gate values, mobile lab unless noted)

Field p75 targets stay 06's (LCP 2.5 s, INP 200 ms, CLS 0.1); the lab gates below are stricter on purpose.

| Metric | Gate (public content routes) | Notes |
|---|---|---|
| LCP | <= 2.0 s mobile (4G sim, 4x CPU) | Portfolio today 4.4-6.1 s; pequeverso live 4.3-4.6 s |
| INP | <= 150 ms (lab interaction scripts), field p75 <= 200 ms | Lighthouse does not measure INP; use Playwright event timing (2.7) |
| CLS | <= 0.05 | Both sites already 0 on measured routes |
| TBT | <= 200 ms | Portfolio 991 ms without WebGL, pequeverso 1,810-2,360 ms (pixel) |
| Long frames while scrolling | p95 <= 20 ms, p99 <= 33 ms, dropped frames <= 2%, zero LoAF > 100 ms | At 4x CPU, 390x844 |
| First-load JS (gz, excl. lazy 3D/GSAP chunks) | <= 170 KB | Pequeverso 150-165 KB OK; portfolio 395-465 KB raw (measure gz) |
| CSS (gz) | <= 25 KB portfolio (frozen per A-E5), <= 18 KB pequeverso | |
| Fonts | <= 100 KB, 2 families variable, subset | Portfolio 133 KB / 3 families: drop to Inter Tight + JetBrains Mono or variable Inter |
| 3D chunk (gz) | <= 250 KB pequeverso (existing cap), <= 500 KB portfolio, never in the initial route, mount after LCP via `requestIdleCallback` | |
| 3D runtime | <= 100 draw calls, <= 150K tris, textures <= 2048 and <= 64 MB GPU, DPR cap 1.5 mobile / 2 desktop, no MSAA on mobile, one WebGL context at a time on mobile, pause offscreen/hidden/reduced | Portfolio home currently two contexts |
| Ambient GPU use | After 10 s idle render on demand; battery saver (`navigator.getBattery` unreliable, use frame-time tier) | |

Third parties: **zero third-party main-thread work before first interaction** on pequeverso (load pixel after consent and after `requestIdleCallback`/first interaction, in a worker via Partytown only if consent exists and measurement proves a gain; otherwise just defer). This one rule would move pequeverso's live score from about 54 to the documented range if the finding in 1.2 holds.

### 2.7 Testing fluidity automatically

1. **Frame-time sampling in Playwright (Chromium)**: the portfolio audit already used rAF sampling; formalize it as `tests/perf/frames.spec.ts`: set viewport 390x844 DPR 3, CDP `Emulation.setCPUThrottlingRate` 4, scroll with `page.mouse.wheel` in 100 px steps every 16 ms across the hero journey, record `requestAnimationFrame` deltas, assert p95/p99/dropped-frame gates from 2.6. Run once per route family and per theme.
2. **Long Animation Frames**: `PerformanceObserver({type: 'long-animation-frame', buffered: true})` injected via `addInitScript`; fail if any LoAF > 100 ms during the scripted scroll or interaction, and print `scripts[].sourceURL`/`invoker` for the culprit. LoAF is Chromium-only (Chrome 123+; not Firefox/Safari per the sources found), which is fine for a CI gate; I found no Playwright-specific write-up, so confirm it fires in headless Chromium in the repo's own CI image.
3. **INP in lab**: observe `type: 'event'` entries with `durationThreshold: 16` while the script performs the five money interactions (open menu, open product door, toggle FAQ, open gallery zoom, theme toggle / assistant launcher when enabled); assert max event duration <= 150 ms. Use `web-vitals/attribution` `onINP` in production RUM (07 recommends the same) and correlate with LoAF.
4. **GPU lane**: headless Lighthouse renders WebGL through SwiftShader and inflates TBT (portfolio audit: TBT 138 s on home). Keep two lanes: (a) CI Lighthouse with 3D disabled or static renderer forced, for regressions of the base app; (b) a scheduled GPU-backed run (the owner's WSLg/GTX 1050 setup, or a real device cloud) for frame-time of the 3D journeys. A frame trace on a real low-end Android once per release is the final check (06 section 11).
5. **Trace artifacts**: `chrome-devtools` `performance_start_trace`/`performance_analyze_insight` for ad hoc work; Playwright `browser.startTracing` attached on failure.
6. **View-transition checks**: assert no `ViewTransition` is active more than 600 ms (`document.getAnimations({subtree:true})` with pseudo-elements), that `::view-transition` has `pointer-events: none`, and that a click during a transition lands.
7. **Reduced-motion lane**: every perf and visual spec also runs with `reducedMotion: 'reduce'`; assert zero canvases and zero running animations beyond opacity.
8. **Budgets as code**: pequeverso's `check:bundle` pattern (`config/budgets.json`, gzip per route) is the model; port it to the portfolio (the roadmap's A-E5 CSS freeze is the seed) and add frame-time budgets to the same file.

---

## 3. Portfolio master design

Positioning (from `docs/specs/ai-engineer-positioning-v3.md`, not changed here): AI engineer, applied AI/RAG/evals, bilingual. The first screen must say who, what, one live proof and one contact action before asking anyone to explore motion (the repo's own design doc already states this).

### 3.1 Concept per theme

**Dark: "Observatory at night" (keep and polish).** Deep-navy ground (`#020617`, not pure black), additive luminous points, cyan accent `#3adaf2`, Inter Tight display, JetBrains Mono labels. Elevation by lighter surface plus border. Craft passes: tighten hero hierarchy; replace the toy-ish `rotateX(3deg)` button lift with a flat 1-2 px rise and a 150 ms bg/colour transition (keep the "pressed" 0.985 scale, which is good); add a faint grain (SVG noise as a static CSS background, 2-3% opacity) to kill gradient banding on OLED; make section heads a recurring "instrument label" (mono eyebrow, hairline, index number) so wayfinding becomes identity.

**Light: "Celestial atlas / ink on paper".** Adopt the plan's proposed direction (the playbook's option 1; the most editorial and the best contrast with dark), now in the owner's blue family: cool off-white paper, navy and blue inks, particles as ink dots, orbits as 1 px chart lines at 20-35% opacity, planets lit by rim light and shaded by terminator (not made transparent), deep ultramarine accent with cyan reserved for live signals. Elevation in light is **blue-tinted layered shadow plus hairline**, not border-only. Full tokens in 3.2.

### 3.2 Portfolio blue palette "Instrument blue" (owner preference: blue family, binding)

Owner direction: blue tones, tech-world fit. Dark theme grounds on deep navy; light theme is ink on paper in navy and blue inks on a cool off-white; cyan is the accent. All values below are my proposal; contrast ratios were **computed by me** (WCAG 2 relative luminance on sRGB values after gamut clamping, script in my scratchpad) and must be re-asserted by a unit test in the repo, as pequeverso does with `tests/unit/design-system.test.ts`. Hex values are the sRGB-clamped equivalents; ship OKLCH as the source and let P3 displays use up to +15% chroma via `@media (color-gamut: p3)`.

**Why it will not read as generic SaaS blue**

1. **Signature hue 262 ("ultramarine") with cyan at 210.** The accent family is a 52 degree hue arc, and gradients *travel* that arc while lightness rises (never through gray, never toward purple). A flat 250-260 blue-500 button is the SaaS default; a hue-travel from 262 to 210 is the identity.
2. **Everything is tinted.** Every neutral carries hue 262 at chroma 0.004-0.07; there is no gray and (outside light-mode cards) no pure white or black. The dark ground is navy, not black and not slate.
3. **Cyan is a signal, not a color.** Cyan is reserved for "alive/active" (primary action in dark, live dot, pulses, near particles, focus ring) and is held under about 5% of visible pixels; ultramarine does the structural work.
4. **One gradient and one glow per viewport** (rules below), mono labels and hairlines carry the rest of the character.

**Primitives (OKLCH, hue 262; L and C then sRGB)**

| Step | OKLCH | sRGB | Step | OKLCH (hue) | sRGB |
|---|---|---|---|---|---|
| blue-50 | 0.975 0.012 | `#f2f7ff` | cyan-100 | 0.96 0.03 (210) | `#dcf8fd` |
| blue-100 | 0.945 0.028 | `#e4edff` (0.026 after clamp) | cyan-300 | 0.88 0.09 (210) | `#8de8f8` |
| blue-200 | 0.895 0.06 | `#cbddfe` | cyan-400 | 0.82 0.13 (210) | `#3adaf2` |
| blue-300 | 0.83 0.10 | `#aac8fe` | cyan-500 | 0.75 0.132 (215) | `#05c2e2` |
| blue-400 | 0.74 0.15 | `#7caafe` | cyan-600 | 0.65 0.122 (225) | `#069ec7` |
| blue-500 | 0.64 0.19 | `#4886fe` | cyan-700 | 0.52 0.103 (230) | `#007399` |
| blue-600 | 0.55 0.20 | `#2867e4` | | | |
| blue-700 | 0.46 0.18 | `#174eba` | red-400 (dark) | 0.72 0.17 (25) | `#fd736d` |
| blue-800 | 0.37 0.15 | `#0b378d` | red-300 (dark) | 0.80 0.13 (25) | `#fea199` |
| blue-900 | 0.28 0.11 | `#06235e` | red-600 (light) | 0.52 0.19 (25) | `#be222a` |
| blue-950 | 0.20 0.08 | `#021239` | red-800 (light) | 0.44 0.17 (25) | `#9b0f1b` |

Chroma is tapered at both ends (below 0.03 at L above 0.95 and 0.08 at L 0.20) to stay inside sRGB; the current dark accent `#4cd6ff` is replaced by cyan-400 `#3adaf2` (near-identical, slightly deeper), and the current light accent `#0a6e9b` (teal-leaning) moves to blue-700 `#174eba`: a deliberate identity step toward royal blue, within the owner's palette preference. Status colours beyond red (success, warning) are out of scope here; use the same L steps at hue 155 and 85 when needed.

**Semantic roles (the only layer that changes by theme)**

| Role | Dark: "Observatory navy" | Light: "Ink on paper" |
|---|---|---|
| `--surface-void` (page) | `oklch(0.13 0.04 262)` `#020617` | `oklch(0.985 0.006 262)` `#f8fafe` cool off-white |
| `--surface-base` (bands) | `oklch(0.17 0.05 262)` `#040e25` | `oklch(0.965 0.012 262)` `#eff4fc` |
| `--surface-raised` (cards) | `oklch(0.21 0.055 262)` `#0a1731` | `#ffffff` (the one pure white) + shadow |
| `--line-subtle` | `oklch(0.26 0.06 262)` `#132341` (decorative, 1.3:1) | `oklch(0.92 0.016 262)` `#dfe5f0` (decorative, 1.2:1) |
| `--line-strong` (card border) | `oklch(0.33 0.07 262)` `#213459` (1.6:1) | `oklch(0.85 0.025 262)` `#c5cedf` (1.5:1) |
| `--line-control` (input/button borders) | `oklch(0.58 0.10 262)` `#597ab6`: 4.7:1 on void, 4.1:1 on raised | `oklch(0.58 0.06 262)` `#677b9e`: 4.1:1 on ground, 4.3:1 on raised |
| `--text-primary` | `oklch(0.97 0.01 262)` `#f1f5fc`: 18.5:1 on void | `oklch(0.20 0.06 262)` `#061431`: 17.4:1 on ground |
| `--text-secondary` | `oklch(0.82 0.03 262)` `#bac5d8`: 11.5:1 void, 10.2:1 raised | `oklch(0.40 0.05 262)` `#394863`: 8.8:1 ground, 9.2:1 raised |
| `--text-muted` | `oklch(0.72 0.04 262)` `#97a5be`: 8.1:1 void, 7.2:1 raised | `oklch(0.48 0.045 262)` `#505e77`: 6.3:1 ground, 5.9:1 base, 6.6:1 raised |
| `--accent` (text/links/icons) | cyan-400 `#3adaf2`: 12.0:1 on void | blue-700 `#174eba`: 7.1:1 on ground, 6.7:1 on base |
| `--accent-wash` | `oklch(0.82 0.13 210 / 12%)` + 1 px ring at 30% | `oklch(0.46 0.18 262 / 8%)` + 1 px ring at 28% |
| `--brand` (structural blue) | blue-500 `#4886fe`: 5.2:1 on raised | blue-800 `#0b378d`: 9.7:1 on base |
| `--focus-ring` | cyan-300 `#8de8f8`: 14.9:1 on void | blue-500 `#4886fe`: 3.3:1 on ground, 3.5:1 on white (meets 3:1) |
| `--danger` | red-400 `#fd736d`: 7.5:1 on void | red-600 `#be222a`: 5.8:1 on ground |
| Header veil | `oklch(0.13 0.04 262 / 80%)` + blur | `oklch(0.985 0.006 262 / 82%)` + 1 px line-strong + shadow-sm |
| Shadows | borders and lighter steps, no shadow | `0 1px 0 oklch(0.28 0.11 262 / 8%), 0 14px 32px -14px oklch(0.28 0.11 262 / 28%)` (blue-tinted, layered) |

Reasoning: text roles are chosen for at least 7:1 (AAA) where cheap (primary, secondary, muted all above 5.9:1 in both themes), UI boundaries that identify a control are at least 3:1 (`--line-control`), decorative hairlines are deliberately below 3:1 and never the only identifier. `--text-muted` is also tested against the darkest and lightest canvas zone behind it (3.8.4 scrim). Dark elevation is lighter surface plus border; light elevation is shadow, as in 06. Cyan on navy is high-chroma and can vibrate in thin type: use cyan for text only at 14 px and above in medium weight or heavier, and prefer cyan-300 for body-size links.

**Buttons (all states; 44 px minimum height on touch, 40 px desktop minimum, radius 12 px, flat 1 to 2 px rise on hover only under `(hover: hover)`, 100 ms press, `transform` and `opacity` plus 150 ms colour transitions)**

| Variant | Dark rest / hover / active | Light rest / hover / active | Contrast (label on fill) |
|---|---|---|---|
| Primary | fill cyan-400, label blue-950 / cyan-300 / cyan-500, then `translateY(1px) scale(0.985)` | fill blue-700, label white / blue-800 / blue-900 | dark 10.9 / 13.1 / 8.6; light 7.4 / 10.8 / 14.9 |
| Secondary | fill blue-800, label text-primary, 1 px blue-600 border / fill blue-700 / fill blue-900 | fill blue-100, label blue-800, 1 px blue-500 border / fill blue-200 / fill blue-300 | dark 9.9 / 6.8; light 9.2 / 7.9 (border blue-500 is 3.3:1 on ground) |
| Ghost | no fill, label cyan-300 (12.7:1 on raised) / cyan wash 12% / wash 20% | no fill, label blue-700 (7.1:1) / fill blue-100 / fill blue-200 | as listed |
| Destructive | fill red-400, label blue-950 / red-300 / `oklch(0.66 0.18 25)` | fill red-600, label white / red-800 / `oklch(0.38 0.15 25)` | dark 6.8 / 9.4; light 6.1 / 8.5 |
| Disabled (all) | fill line-subtle, label text-muted at 60%, no shadow, `cursor: not-allowed`, `aria-disabled` kept focusable only when it explains why | same with light roles | exempt from 1.4.3, still legible |
| Focus (all) | 2 px ring `--focus-ring`, 2 px offset in the page surface; never animated in (appears instantly); never clipped by `overflow` | same | ring at least 3:1 against the adjacent surface; `scroll-padding` keeps it unobscured by the header |

The primary button carries the identity: in dark, the fill is a **hue-travel gradient** from cyan-300 to cyan-500 over 135 degrees (210 to 215 hue, L 0.88 to 0.75; it stays above 8.5:1 for the blue-950 label at every point), in light a blue-600 to blue-800 gradient (label still at least 5:1 at the lightest stop). Replace the current perspective `rotateX(3deg)` lift by the flat rise; keep the 0.985 press scale.

**Gradient and glow rules**

- At most **one gradient surface and one glowing element in the viewport** (hero accent word or primary button; not both plus a card). No gradient text on body copy.
- Gradients travel hue (262 toward 210) while L rises; chroma never below 0.08 on the path; no gradient crosses `oklch` gray (no hue 262 to 330 sweeps).
- Dark glow: `0 0 24px oklch(0.82 0.13 210 / 22%)` on hover/focus of cyan elements and on the live dot only. Light has **no glow**: it uses the blue-tinted shadow above and a 1 px ring.
- Backgrounds: a faint radial `oklch(0.37 0.15 262 / 35%)` pool behind the hero in dark (navy lit from within), a `blue-50` to `surface-void` vertical wash in light; both static (no animated gradients; a gradient animation costs paint).
- Scrims: dark `surface-void` at 70-85%, light `surface-void` at 85-92%, as in 3.8.4.

**Hero particles on the blue to cyan ramp (3.8)**

| Role | Dark (additive) | Light (ink, normal blending) |
|---|---|---|
| Far / deep particles | blue-800 to blue-500, dim, small | `oklch(0.72 0.02 262)` mist (far) |
| Mid | blue-400 `#7caafe` | blue-700 |
| Near / fast | cyan-400 to cyan-300, tip toward `#f1f5fc` | blue-800 to blue-900 ink, +10-25% size |
| Speed shift | hue moves 262 toward 210 and L rises with velocity (the ramp is the speedometer, which also makes flow fields visible) | hue stays 262, L drops with velocity (darker ink on fast strokes) |
| Satellites and orbit rings | cyan-300, 70% | blue-600 |
| Neural pulses (figure 06) and wave crests (08) | cyan-300 to white | cyan-700 `#007399` (5.2:1 on ground) |
| HUD text and brackets | text-secondary and 1 px line-control | blue-800 mono and 1 px line-strong |

Depth is encoded by lightness along the ramp (deeper means darker blue in dark, lighter mist in light) so the 3D reads without fog. The vermilion "signal" proposed earlier is dropped: the blue family plus cyan carries "live", and red is reserved for destructive and error states only.

### 3.2a Light-mode rendering rules (kept from the playbook, now on blue inks)

Same shader and uniforms per theme (`uColorA/B`, `uOpacity`, `uBlend`), 520 ms uniform tween on theme change; transparent canvas clear so CSS owns the ground and no seam appears; `NeutralToneMapping`; no bloom in light (darker tinted halo, "ink bleed"); planet shader night side darkens instead of going transparent (the audit's root cause of milky blotches); scrim or text-exclusion mask behind headlines, contrast measured on the worst frame (F83). Portrait: re-key the photo onto a navy-tinted ground or add a soft vignette ring so the dark rectangle disappears in light.

### 3.3 Hero and solar elevation (keep both, improve both)

Hero (the sphere stage becomes the 10-figure particle system of 3.8; the points below still apply):

- **Order**: h1 (role, stack, what you built, in one sentence), two CTAs (primary: "See the production RAG assistant" or equivalent proof; secondary: contact), then the sphere. Text paints first with no opacity gate; the sphere mounts after LCP.
- **Make the journey short and skippable**: cut mobile hero from 9,628 px toward about 3,500 px by presenting the catalogue as an expandable mark cloud with a "Skip to projects" link first in tab order and `inert`/collapsed semantics for the 100+ chips until opened (also fixes the P0 tab-stop issue).
- **Fix the hitch before adding polish**: profile the first hero scroll (I would check, in order: pre-decoding brand textures as an `ImageBitmap` atlas in idle time; compiling shader programs ahead with `renderer.compile`; creating the logo-cloud geometry once as an instanced buffer; avoiding DOM writes inside the scrub). Target p99 <= 33 ms on desktop and p95 <= 20 ms on 4x mobile.
- **Motion language, four verbs** (portfolio playbook section 9): *settle* (resting breathing at 10-20% amplitude), *open* (sphere to cloud), *attract* (cursor gravity, damped by dt, fine pointer only), *return*. Frame-rate-independent damping (`1 - exp(-k*dt)`), not per-frame lerp, so 120 Hz does not feel 2x faster.
- **One context at a time on mobile**: when the hero sphere is on screen, the solar field renders at a frozen frame or half rate; when the hero is gone, the sphere context disposes. Desktop may keep both but the solar field drops to 30 fps behind content pages and renders on demand after 10 s idle.
- **Quality tiers** with the existing adaptive logic extended: tier chosen by 2 s of frame time, device memory and Save-Data; tier 3 swaps to per-theme poster.
- **Pause control** in the header overflow or footer ("Pause background motion"), wired to the existing `setPageMotionPaused()`; persisted; also satisfies WCAG 2.2.2.

Solar system:

- Load textures **per route need**: ambient background uses 512 px textures (about 4x fewer bytes than the 1024 set; mobile 1.3 MB to about 350 KB estimated) and only the solar *explorer* dialog streams 1024/2048 maps on open. Use KTX2/Basis if the toolchain allows; otherwise AVIF/WebP at 512. This alone should move the ambient cost off the LCP path on non-home routes.
- Render at DPR 1 with a half-resolution buffer plus a CSS upscale only when GPU tier is low (the desktop 0.62x on a DPR-1 screen is visible softness; fix the quality governor so it drops frame rate before resolution on desktop).
- **Dim and slow behind content**: on reading routes, reduce speed to about 30% and opacity so text contrast is stable; on light, planets get terminator shading and a paper-colored veil so Saturn no longer "stains" paragraphs.
- Make it a *wayfinding* device, not just wallpaper: each route focuses a different body or camera offset (Work: Saturn rings tilt, Stack: Jupiter bands, About: Earth/Moon, Contact: Sun) using the view-transition moment to move the camera, 400 ms, `--ease-standard`. This is the "single particle system that morphs between pages" idea from the playbook, applied to the solar field.

### 3.4 Navigation and wayfinding

- Header: brand, six links, EN/ES, theme, plus a **pause motion** control; sticky header must not cover focus (`scroll-padding-top` = header height); fix the sticky header below 416 px noted in the roadmap; EN/ES and theme controls to 44x44.
- **Scroll-spy progress rail** on long pages (`/work/*`, `/stack`, `/cv`): a 2 px progress line plus section index (01-05) with `aria-current`; scroll-driven CSS `scroll()` timeline, zero JS.
- **Case-study wayfinding**: sticky "On this page" (desktop) and a bottom sheet (mobile), "Next case" card at the end with a shared-element morph, breadcrumb back to `/work`.
- **Recruiter shortcuts**: a persistent contact action (header on desktop, floating "Get in touch" chip after first scroll on mobile that never overlaps the assistant launcher) and CV download one click away, repeated in footer.
- `/stack` (29,411 px on mobile): switch to a virtualized or `content-visibility: auto` grid with filter chips pinned; "N technologies" pluralization via `Intl.PluralRules`.
- Keyboard: skip links "to content", "to projects", "skip catalogue".

### 3.5 Page-by-page improvements

| Page | Improvements |
|---|---|
| Home | Hero reorder (3.3), skip catalogue, featured work strip above the fold fallback (static) for the LCP, signature moments (3.6), recruiter shortcuts, mobile eyebrow truncated to 1 line |
| Work index | Cards with a consistent 16:10 ratio, outcome-first copy (metric, eval, latency), shared-element thumbnail, filter by theme (RAG, evals, agents) as URL state |
| Case study (Filomena, Pequeverso) | Impact summary up top (problem, role, result, stack), architecture diagram with a text-first fallback and a "skip diagram" link, React Flow tab-stops reduced (nodes `tabindex=-1`, one entry point with arrow-key roving), lightbox arrows respect the active filter (known bug), eval table and failure analysis if allowed by the owner (no claims added without approval) |
| Stack | Search + filter retained, pluralization fix, grid virtualization, mono tags consistent, light-mode chips with ring |
| About | Portrait background fix (3.2), editorial two-column with 65ch measure, timeline with scroll-linked rail |
| Education / CV | CV body at least 15 px for long bullets, print stylesheet (CV is printed), PDF twin, `details` retained |
| Contact | Single clear form-or-email path, copy-to-clipboard with `aria-live` confirmation, response-time line |
| Assistant | Visible disclosure of what it is, example prompts, streaming with reduced-motion-safe caret, handoff to email; motion hold already integrated (`holdPageMotion`) |
| 404 | Locale-aware (fix `/es/...`), on-theme, offers Work/Contact; a tiny orbit animation under motion-ok |

### 3.6 Signature moments (budgeted, three only)

1. **Hero open** (sphere becomes the technology cloud): the existing moment, made smooth (3.3).
2. **Theme toggle as a brand moment**: View Transition circular `clip-path` reveal from the toggle, 520 ms, with the 3D uniform tween in parallel (night to day: stars switch off, atlas lines emerge); reduced motion: 150 ms crossfade; blocked storage still switches for the session. Snapshot only `root`; canvases excluded.
3. **Work card to case-study morph**: thumbnail becomes the case-study hero, header anchored, solar camera shifts focus body.

Delight details that cost nothing: copy-to-clipboard micro-confirmation, mono "typed" eyebrow only on first load, tabular numerals on metrics, `text-wrap: balance/pretty`, avatar pulse kept (keyboard-operable already).

### 3.7 Bilingual polish

- Serve `<html lang>` correctly on the server for `/es/**` (root layout per locale segment) and emit `hreflang` pairs and `x-default`; fixes SEO 92 and a screen-reader pronunciation bug.
- Layout budget for Spanish: strings run +20-30% longer; test hero, nav and cards with ES in both themes; allow 2-line nav labels or shorten labels, never truncate with ellipsis in nav.
- `lang` on mixed-language fragments; hyphenation `hyphens: auto` with `lang` set (Spanish hyphenation dictionary is widely supported); typographic quotes and punctuation per locale (`«»` optional, inverted `¿¡`); `Intl` for numbers, dates and plurals; locale switch via view transition crossfade (same-route crossfade pattern) and preserves scroll and focus (already does).
- ES copy in the owner's voice; do not add claims.

---

### 3.8 Hero particle system v2 (owner requirement: 10 unique figures)

Goal: the current star sphere becomes one continuous, GPU-driven particle system that morphs through **exactly 10 figures**, with flow fields between them, depth, pointer response and per-theme rendering, inside every budget and rule of section 2. It replaces the sphere stage of the hero only; the scroll "open into the technology catalogue" journey and the solar background stay (3.3). Inspiration is Stephan Livera's Claude motion reel (x.com/stephanlivera/status/2103315922098470926); **I could not open that post, so the traits below are taken from the coordinator's description of its frames, not from my own viewing.** Translation of those traits:

| Reel trait | Portfolio translation |
|---|---|
| Circle-to-star morph with trails | Every transition is a flow-field morph; velocity-stretched trails on tier 3 only |
| Satellites orbiting the figure | 2-3 thin orbit rings of small particles around the figure (analytic, no simulation), cyan-300 in dark, blue-600 in light |
| 3D dot-grid wave field | Figure 08 |
| Truchet tile patterns | Not a hero figure (would be the 11th); optional static light-theme poster ground or `/work` card hover in Phase C |
| Expressive easing shown explicitly (back-out, elastic) | Per-figure easing (below); HUD second line prints the easing name in mono |
| Technical HUD (corner brackets, timecode, mono labels) | DOM HUD: corner brackets, `01/10`, figure name, easing, in JetBrains Mono; timecode optional at 2 Hz or omitted |
| Motion blur, subtle chromatic aberration | Tier 3, dark theme, motion-ok only: velocity-stretched sprites; 1-2 px channel split limited to morph peaks, dropped on any frame over 20 ms |
| High-contrast palette | Dark: deep navy, cyan `#3adaf2`, near-white `#f1f5fc`; light: cool off-white, navy ink, cyan-700 for signals |

#### 3.8.1 The ten figures and the sequence

Sequence rule: **consecutive figures alternate curved and angular and alternate dense and sparse**, and the loop closes 10 to 01 on the same rule. The five required by the owner are marked R; the other five are my choices.

| # | Figure | Character | Why it is here | Construction (seeded surface sampling) | Enter easing | Dwell |
|---|---|---|---|---|---|---|
| 01 | **Sphere** (R) | curved, dense | Current identity, LCP poster, scroll-journey start | Fibonacci-sphere with shell jitter; depth-sorted density | `--ease-out` (quint out) | 4.0 s (first view) |
| 02 | **Cube** (R) | angular, dense shell | Hard-edge contrast; "structure, systems" | Face area sampling plus 20% of particles pinned to the 12 edges so the silhouette reads | `back.out(1.7)`: corners overshoot and snap | 3.0 s |
| 03 | **Wormhole** (R) | curved, hollow tube, dense rim, sparse core | Depth showpiece; best use of parallax and flow field | Hyperbolic funnel (two flared mouths joined by a throat), particles stream along the axis continuously during dwell | `expo.inOut` | 3.4 s |
| 04 | **Triangle to tetrahedron** (R) | angular, sparse | Two-beat figure: flat triangle (outline plus faint fill), then at +1.1 s the apex lifts out of plane and folds into a tetrahedron | Edge-weighted line sampling for the triangle; face sampling for the tetra; same particles, second sub-morph 0.9 s | `elastic.out(1, 0.6)` on the fold | 3.8 s |
| 05 | **Toroidal helix** (R) | curved, dense coil | A spring whose ends are joined into a ring; reads as a loop/recurrence, an "agent loop" | Tube of radius r wound n times around a torus of radius R (parametric `u, v` from particle id) | `--ease-standard` with 0.6 s swirl | 3.2 s |
| 06 | **Neural network graph** | angular, sparse | The AI-engineer identity: layered nodes (about 30% of particles), edges sampled by length (about 70%), pulses travel along edges in the shader | Layered 3D layout (4-5 layers), fixed seed; pulse = per-edge phase attribute | `power3.out`, then pulses | 3.6 s |
| 07 | **Galaxy spiral** | curved, dense core, sparse arms | Ties to the solar-system world; strongest "wow" in dark | Logarithmic two-arm spiral with Gaussian thickness; core density 4x | `circ.out` with rotation inherited from 05 | 3.2 s |
| 08 | **3D dot-grid wave field** | angular grid, planar | The reel's most recognisable trait; also reads as a loss surface or embedding landscape | 160x160-equivalent lattice, height = sum of two travelling sines plus radial ripple under the pointer | `--ease-emphasis` | 3.4 s |
| 09 | **Moebius strip** | curved, continuous surface | One surface, one edge: elegant, mathematically honest, different from 05 (a band, not a tube); torus knot is the reserve swap | Parametric strip, half twist, uniform area sampling | `sine.inOut` with slow roll | 3.0 s |
| 10 | **Monogram (finale)** | angular letterforms, sparse | Personal signature; loops back to the sphere | Sampled from the owner's approved monogram or brand-mark SVG (a small point list, tens of KB, replicated with jitter to fill N). **Owner decision: which monogram; I have not seen one, and the avatar caricature is a raster so it is not suitable for sampling.** | Spring (`--ease-spring`) settle | 4.5 s |

DNA double helix, considered and left as reserve: it duplicates the helix idea of 05 and says "biology" more than "AI". Reserve swaps: torus knot for 09, DNA for 07.

Alternation check: 01 to 02 curved to angular; 02 to 03 angular to curved, shell to hollow; 03 to 04 curved to angular, dense rim to sparse; 04 to 05 angular to curved, sparse to dense; 05 to 06 curved to angular, dense to sparse; 06 to 07 angular to curved, sparse to dense; 07 to 08 curved to angular; 08 to 09 angular to curved; 09 to 10 curved to angular; 10 to 01 angular to curved, sparse to dense.

Timing: morph 1.4 s each (a named cinematic exception to the 400 ms UI cap in 2.2; overshoot applies to particle positions only, never to layout), per-particle stagger over the first 30-35% of the morph so the shape "unzips"; dwell as in the table; total loop about 49 s (35.1 s dwell plus 14 s morph). Four **transition styles** rotate so it never feels repetitive: *flow* (low curl amplitude), *scatter* (high amplitude, wider stagger, then reassembly), *swirl* (angular velocity about the axis), *pour* (gravity-biased, used into the wave field). Assignment: 01-02 flow, 02-03 scatter, 03-04 swirl, 04-05 flow, 05-06 scatter, 06-07 swirl, 07-08 pour, 08-09 flow, 09-10 scatter, 10-01 pour (reassembly into the sphere).

#### 3.8.2 Technique

- **Renderer**: three.js `Points` on WebGL2 (production path per 2.1; WebGPU compute deferred to Phase C behind a `ParticleBackend` interface so the Clean Architecture phase can swap it, with WebGL2 as the fallback).
- **Default path (all tiers): GPU-side morph, no simulation state.** Targets for the 10 figures live in one `DataArrayTexture` (RGBA16F, N particles per layer). The vertex shader fetches layers A and B for its particle (`texelFetch`), computes `t_i = clamp((uProgress - delay_i) / (1 - spread), 0, 1)`, eases per the figure's easing, and displaces by a **curl-noise flow field sampled from a precomputed 32^3 RGB8 noise texture (about 96 KB)** scaled by `sin(pi * t_i)`, so particles scatter mid-morph and reassemble at the target. Pointer: a repel/attract falloff and a +-3 degree camera tilt, from two uniforms. Depth cue: size and alpha in dark, size and darkness in light. JS per frame writes about 8 uniforms and nothing else.
- **Tier 3 enhancement: FBO GPGPU** (ping-pong RGBA16F, 256x256) only for trails and true inertia (spring toward target plus curl, so pointer pushes persist); velocity-stretched quads for blur. If `EXT_color_buffer_half_float` is missing, drop to the default path.
- **Satellites**: separate small `Points` draw, positions analytic from `uTime` and per-ring inclination, scaled to the current figure's bounding radius (uniform). Draw calls: 2 on tiers 1-2, 3 on tier 3.
- **Target generation off the main thread**: a Web Worker builds the 10 target sets at fixed seed (mulberry32) from the analytic parametrizations and the monogram point list, then transfers `ArrayBuffer`s (no 4 MB asset to download). Budget: <= 60 ms (tier 1) and <= 150 ms (tier 3) of worker time, uploaded in slices with `scheduler.yield()`/idle gaps.
- **Equal particle count and no crossing**: every figure uses all N particles. Order is made consistent by **recursive median (k-d tree) matching**: split figure k and figure k+1 with the same alternating-axis median splits down to leaves of 1, and match leaves in order; chain 01 to 10 in worker. Because the chain is not cyclic, 10 to 01 uses a small remap texture (RG16UI, one layer). Metric to assert in tests: mean displacement of the matched pair at most 1.15x the unconstrained nearest-neighbour lower bound **(my threshold)**.
- **Programs**: `renderer.compileAsync()` (parallel shader compile) before the first frame to avoid the 1 s hitch measured in the baseline.

#### 3.8.3 Tiers, budgets and loading

| Tier | Selector | Particles | Satellites | DPR cap | Extras | GPU memory for hero system |
|---|---|---|---|---|---|---|
| 0 Poster | software GL (SwiftShader/llvmpipe via `WEBGL_debug_renderer_info`), Save-Data, battery under 20% and not charging (Chromium `getBattery`), reduced motion, viewport under 650 px tall (existing rule), context loss | 0 | 0 | n/a | per-theme posters | 0 |
| 1 Lite | low `hardwareConcurrency`/`deviceMemory`, or rAF intervals near 33 ms (iOS Low Power Mode cannot be read directly, so detect by cadence), or 1 s probe below 50 fps | 14k | 200 | 1.25 | 30 fps cap if throttled | about 1.1 MB |
| 2 Standard | mid phones, integrated GPUs | 32k | 400 | 1.5 | pointer, satellites | about 2.6 MB |
| 3 Full | discrete GPU, fine pointer, no Save-Data | 65k | 600 | 2 | FBO inertia, trails, blur, tier-3 chromatic split | about 8 MB |

Frame governor: 2 s moving average under 45 fps drops one tier (DPR first, then count); one tier up is never re-attempted in the same session. Hard limits from 2.6 apply (<= 100 draw calls, <= 64 MB textures). One WebGL context at a time on mobile (3.3).

Loading and LCP: the h1 is the LCP; the poster is the existing server-rendered static constellation, drawn as the **sphere at seed time 0** so the first GPU frame matches it. The canvas is created in `requestIdleCallback` (1.5 s timeout) only after the hero intersects the viewport and tier is not 0, then crossfades over the poster for 220 ms after its first rendered frame (never before). No scene JS in the initial route chunk; the hero chunk target is <= 60 KB gz on top of the shared three chunk **(to measure)**.

INP and main-thread rules: no per-frame allocation, no `getParameter`/`readPixels`/layout reads in the loop; `pointermove` stores coordinates only (passive), applied once per rAF with dt-based damping; figure changes are driven by a time uniform so JS does not schedule transitions, except one `textContent` write on the HUD per figure change; the timeline advances from `uTime` on the GPU.

Pause rules: IntersectionObserver offscreen, `visibilitychange`, the visible pause control, `webglcontextlost` (swap to poster, restore on `webglcontextrestored`), and while the assistant or a dialog holds page motion (existing `holdPageMotion`). Autoplay yields to the user: the first scroll input halts autoplay and the current figure morphs back to the sphere within the first 15% of the scroll journey (scrubbed), then the existing journey continues from the sphere.

#### 3.8.4 Per-theme rendering

| | Dark | Light |
|---|---|---|
| Blending | additive, `depthWrite: false`, soft round sprite | `NormalBlending`, premultiplied alpha, darker than ground |
| Colour | blue to cyan ramp from 3.2 (deep blue-800 to cyan-300 tip), speed shifts hue 262 toward 210; satellites cyan-300 | ink ramp from 3.2 (mist to blue-900), satellites blue-600, pulses cyan-700 |
| Size | base | +10-25% (ink-dot perception) |
| Glow/blur | bloom-like halo by sprite falloff; trails and blur on tier 3 | no bloom; trails as thin ink streaks at 60% opacity; no chromatic split |
| HUD | text-secondary, brackets 1 px line-control | blue-800 mono, brackets 1 px `--line-strong` |
| Switch | 520 ms uniform tween with the theme reveal (3.6); the figure does not restart | |

Text safety: a radial density/opacity mask in the shader behind the h1 and CTA rectangle (`uTextRect`), plus the scrim from 3.2; contrast measured on the worst frame.

#### 3.8.5 HUD, controls, accessibility, reduced motion

- **HUD** (DOM, `aria-hidden`, decorative): four corner brackets (CSS borders, 12-16 px), top-left `01/10` and figure name, second line the easing name in mono (for example `back.out(1.7)`), top-right optional timecode at 2 Hz or omitted. Mono 12 px, not uppercase-wrapping (fixes the three-line eyebrow at 390: truncate to one line). Hidden below 480 px except `01/10`.
- **Controls** (real controls, 44x44, keyboard operable, visible focus): Pause/Play (`aria-pressed`, persisted; satisfies WCAG 2.2.2), Previous/Next figure. Figure name announced through a polite live region only on a user-initiated step, never during autoplay. The canvas is `aria-hidden="true"`; the hero conveys its message in text.
- **Reduced motion (Still variant)**: zero canvases (as today); no autoplay; static composed sphere; Previous/Next step through **10 pre-rendered per-theme posters** (lazy, SVG or AVIF with alpha, target <= 12 KB each) with a 150 ms crossfade; no pointer response, no trails, no satellites orbiting (a static ring may remain). Runtime changes of the preference are honoured via the `change` listener.
- No flashing: no luminance change above 3 per second; chromatic split limited to under 400 ms peaks.

#### 3.8.6 Testing and acceptance

Deterministic QA mode (`?qa=1` or an init script flag): fixed seed, time set by `setTime(ms)` that renders one frame, curl amplitude zero at settled times, autoplay off.

1. **Per-figure visual snapshots (all 10)**: Playwright `toHaveScreenshot` at the settled time of each figure (end of dwell) for both themes and two viewports (1280x800 DPR 1, 390x844 DPR 2): 40 baselines, plus 50%-morph captures for pairs 02-03 and 09-10 (4 more per theme/viewport as needed), canvas region only, HUD asserted by DOM text rather than pixels. Software GL (SwiftShader) in the CI image for determinism; `maxDiffPixelRatio` about 0.01-0.02 because half-float differs by driver; baselines are only valid in that environment.
2. **Geometry unit tests (no GPU)**: per-figure mean distance of samples to the analytic surface under epsilon; bounding-box and centroid within tolerance; matching metric from 3.8.2; identical output for the same seed.
3. **Frame-time on the GPU lane** (2.7): full loop plus pointer sweep on tiers 1-3; p95 <= 20 ms, p99 <= 33 ms, zero LoAF over 100 ms, first-hero-scroll p99 <= 33 ms; separate runs at 4x CPU 390x844.
4. **Fallback tests**: force `WEBGL_lose_context`; disable float/half-float colour buffers; `--disable-3d-apis`; Save-Data emulation; reduced motion. Assert poster visible, controls working, zero console errors, and that the tier-0 path downloads no scene chunk.
5. **LCP/INP guard**: LCP element remains the h1 with and without the scene; canvas appears only after idle; max interaction duration <= 150 ms with the scene running.

Acceptance (hero v2): exactly 10 figures in the table's order, each recognisable in a 400 px snapshot in both themes; transitions alternate curved/angular and dense/sparse; no visible particle crossing through the figure centre in the 50% captures of 02-03 and 09-10; loop about 49 s with seamless 10 to 01; budgets in 3.8.3 met per tier; pause control, controls and reduced-motion variant verified; light theme uses non-additive ink rendering with worst-frame text contrast at least 4.5:1; designer re-score of the hero is at least 95 with the lower theme reported.

---

## 4. Pequeverso master design

Premise: the buyer is a parent on a phone (often inside Instagram/TikTok/Facebook in-app browsers) and the child is the end user. The site must feel playful to the child and trustworthy to the parent: **playful in color, shape and motion; calm and precise in copy, prices and legal facts**. Conversion is the goal, but 07 rules (no fake proof, urgency, kid-voice CTAs) bound the design.

### 4.1 Identity elevation (keep "pequeno universo")

The palette (navy, teal, coral-only-for-purchase, gold, cream) and the planet/orbit/sparkle vocabulary are right. Elevate by tightening, not adding:

- **Type**: Fraunces for h1/h2/price with `font-optical-sizing: auto` and `font-variation-settings: "SOFT" 50, "WONK" 0` (friendly but not quirky, per 06; the Latin subset file is variable in weight only, so confirm the `SOFT`/`opsz` axes are in the self-hosted file before relying on them: the `@font-face` declares `font-weight: 100 900` only. If the axes were subset away, either re-subset with `opsz` and `SOFT` (about +15-25 KB, **estimate**) or accept static optical behavior). Nunito Sans stays for UI and body; body 17 px / 1.6; price uses tabular numerals.
- **Shape language**: pills for actions, 20-28 px radii for content, 12 px for small tiles (already tokenized); introduce one **signature shape**: the "orbit swoosh" (existing hand-drawn gold swoosh under the h1 accent word) reused as the section-divider and underline on one phrase per section, never more.
- **Illustration rules**: flat-vector planets/stars/letters with consistent 3-stop shading from the existing `--pv-planet-*` tokens; product imagery is photographic or real render (the real worksheets), illustration is decoration only. Never mix the two in one frame without a clear boundary (a card or a cutout on color).
- **Color roles locked**: coral = buy and price only; navy = brand/structure; teal = links and icons; gold = delight accents on navy only; soft bands (mint/sky/lemon/rose) at most one between neutral bands (already documented). Add a lint rule (stylelint or a unit test scanning `.tsx`) that coral utilities appear only in the CTA/price components; this protects the conversion color.
- **Palette and button elevation (warm identity kept, anchored on the existing navy `#003068`; no tech palette).** (1) Shadow hue follows the surface: coral buttons cast a coral-tinted shadow (`oklch(0.5623 0.1722 28.49 / 35%)`, hue 28) and navy surfaces a navy-tinted one (hue 256), never neutral black; this is the cheapest warmth gain. (2) Add a fourth button treatment, **"sticker"**, for secondary actions: cream fill, 2 px navy border, a hard `0 3px 0 navy` offset shadow that collapses to `0 1px 0` and `translateY(2px)` on press (100 ms); tactile and playful, and the border gives the 3:1 control boundary for free. (3) Primary coral keeps its gradient and `.pv-shine` sweep but gains an inner top highlight (`inset 0 1px 0 oklch(1 0 0 / 35%)`) and a pressed state at `--pv-coral-press` (proposal `oklch(0.44 0.14 28)`, to be verified at 8:1 or better with white text). (4) One new accent for uniqueness, used at most once per page and never for text on light: a soft **sunrise gradient** from `--pv-peach` through `--pv-gold` for illustration grounds, so the sky/universe has a warm horizon rather than only navy and celeste. (5) Keep the focus ring: 3 px navy on light with a 2 px cream offset, gold on navy. All new pairs go through the existing contrast unit test before merge; the figures above marked as proposals are not measured.
- **Texture**: subtle paper grain on cream bands and a printed-sheet drop shadow (layered, navy-tinted `shadow-float`) on product sheets so the real worksheets look tangible.

### 4.2 Kid-safe aesthetics and conduct

- Motion: nothing flashes (no more than 3 flashes per second; practically, none), no sudden loud transitions, no autoplay audio, videos muted with controls and captions, motion pausable (existing marquee toggle, scene pause).
- Interaction: targets 44-48 px (child fingers, parents' thumbs), no drag-only interactions (WCAG 2.5.7), the syllable playground works with tap and keyboard, no timers, no failure states ("¡Casi!" is allowed; red X is not).
- Data: the playground makes no network requests and stores nothing; no behavioral targeting of minors (07 "do not do"); no third-party embeds on kid-facing interactive areas; YouTube via privacy-enhanced facade (click to load).
- Copy: tú form, neutral LATAM, no "Hola, soy tu amiguito" kid-voice CTAs (07), no outcome promises ("leerá en 30 días").
- Visuals: no stock "parents" with invented names; photos only with written consent and first names (07 section 4).

### 4.3 Conversion-first architecture

The home remains the hub (owner decision); `/grafismo-fonetico/` is the conversion page. Both have one job each.

**Home hub `/`** (job: route the parent to the right door in under 5 seconds, 2 taps):

1. Header with "Productos" dropdown (exists).
2. Hero: replace the abstract promise with a **two-line value statement plus the doors**: h1 keeps the brand line but adds a concrete lead ("Fichas imprimibles para aprender a leer y escribir (3 a 7 anos) y una guia de primeras comidas para tu bebe") visible without scrolling at 390 px; doors side by side (already), each with age, format and "Ver" (not "Comprar"); affiliate disclosure stays adjacent to the door it concerns.
3. Trust strip: payment via Hotmart, instant download, guarantee, support contact, real author (no counts).
4. Reading chapter and feeding chapter teasers (equal weight), FAQ by product, closing band with both doors.
5. Mobile hub sticky bar (exists) follows the chapter in view.
Design target: the two doors and the concrete lead are in the first viewport at 320x568 and 390x844; LCP element is the h1 at 390 (already) at <= 2.0 s.

**Kit landing `/grafismo-fonetico/`** (job: purchase decision; checkout happens at Hotmart, so the page's CTA is a link out; the page must pre-answer everything Hotmart will ask):

| # | Block | Job | Existing component | Design change |
|---|---|---|---|---|
| 1 | Hero | Who/what/age, price, guarantee, one CTA | `product-hero`, `hero-composition`, `buy-box` | Above the fold at 390: h1 with age, one-line promise, real sheet image (AVIF, preloaded, the LCP), **price with currency + "pagas en Hotmart" + guarantee line + format ("PDF, imprime en casa")** inside the buy box, coral CTA 56 px. Values come from `config/commerce.ts`, never hard-coded in copy |
| 2 | Trust strip | Remove digital-product doubt | `trust-row` | 4 icons: instant PDF, Hotmart secure payment, guarantee days, support email; no counters |
| 3 | See inside | Make the product concrete | `includes`, `page-wall`, `product-gallery` | **Scroll walkthrough**: a sticky sheet preview that changes as 3-4 steps scroll by (CSS `view()` timeline, static stacked layout when unsupported or reduced motion); each step names what's on the page (pages, sounds, trazos); zoom dialog on tap |
| 4 | Try it | Reduce risk with interaction | `playground-card`, `SyllablePlayground` | Promote the syllable playground as "Pruébalo con tu peque" right after "see inside"; it is the best honest proof; CTA under it |
| 5 | How it works | Print-and-use clarity | `method-steps` | 3 steps: buy, download, print (A4/Carta, B/N friendly); one line on how a week looks |
| 6 | Age fit | Is it for my child | `audience-cards`, `age-selector` | Age selector kept (ViewTransition exists); result card says exactly which pages to start with |
| 7 | Creator note | Human proof | `creator-note` | Named author, method, real photo or illustration of the author with consent; "last updated" date |
| 8 | Guarantee | Risk reversal | new small block | Plain-language guarantee with days and how to claim, link to `/compras-y-reembolsos`; sits immediately before the offer |
| 9 | Offer | The decision | `offer-card` | Price, what's included list, CTA, payment methods icons, security line |
| 10 | FAQ | Objections | `FAQ` (zero-JS details) | Top 6 by real objection: printing cost, level fit, format, refund, device, support |
| 11 | Final CTA | Close | `final-offer` | Repeat price, guarantee, CTA |
| - | Sticky buy bar | Persistent action | `sticky-cta` | Mobile only, appears after hero CTA leaves view, hides when the offer card or footer is in view, does not overlap consent banner or assistant launcher (stacking already specified) |

**CTA rhythm to Hotmart**: primary CTA in blocks 1, 3 or 4 (once, after the first strong proof), 9 and 11, plus the sticky bar; maximum 4 plus sticky. All identical copy and color ("Obtener el kit"), all `CheckoutLink` with the same `src` plus a per-block `sck` so the only measurement that exists (UTMs through Hotmart, 07 section 9) can say which block converts. The click handler gives pressed feedback in 100 ms and opens Hotmart in the same tab on mobile (in-app browsers handle new tabs poorly) **(judgment, test in Instagram's in-app browser)**.

**Course affiliate page `/alimentacion-bebe/`** (job: honest referral): disclosure first, producer facts from `config/affiliates.ts`, one outbound CTA through the redirect with `src`; same blocks 1, 2, 7 (author/producer), 8, 10, 11 in lighter form. No coral (hub spec says coral never appears on the hub; keep coral for the kit only, or use a distinct but calm CTA token for affiliate to preserve the "coral = our product" rule; owner call).

### 4.4 Proof without fabrication (design side)

Per 07: free sample sheet (email opt-in with explicit consent) as a secondary CTA near block 3; real printed-sheet photos; named author and method; "lanzamiento: se de las primeras familias" language while there are no buyers; Hotmart security line next to the CTA (Baymard card-distrust data cited in 07). The design must reserve a **proof slot** that can hold consented testimonials later (card with photo, first name, country, 1-2 lines) so adding them is content-only, not a redesign; do not ship the slot empty.

### 4.5 Product imagery and mockup strategy

- **Hero**: AVIF cutout of real sheets on a navy-to-celeste gradient, 2-3 sheets fanned with layered navy-tinted shadows and 3-6 degrees of tilt; the existing `--tilt-max 6deg` token; no parallax on the LCP element (settle only, transform).
- **Real renders only**: pages exported from the actual PDF at 640/1024 widths; never mockup a page that is not in the product. Include one honest "photo of a printed sheet with crayons" per section where consented photos exist; until then, use render-on-desk composites labelled as renders.
- **Sizes and formats**: AVIF primary, WebP fallback; `sizes` exact (already the pattern); hero <= 150 KB AVIF (currently about 118 KB at 1024 w, good); gallery slides lazy, `fetchpriority=low`.
- **Zoom**: tap-to-zoom dialog with pinch support and keyboard arrows; alt text describes the sheet's purpose, not "imagen".
- **Video**: poster-first facade, muted, captions, <= 30 s demonstration of the product in use; no autoplay unless in-viewport muted loop under motion-ok.
- **OG and share images** per page with the real sheet and price-free claim (price changes).

### 4.6 Micro-interactions that support conversion

All obey section 2 tokens and reduced motion.

1. **CTA**: 100 ms press, gradient slide and shine sweep only on hover-capable devices (existing `.pv-shine`), focus ring 3 px; after click, button shows "Abriendo Hotmart..." with a spinner for 600 ms in case of slow handoff (prevents double-clicks).
2. **Sticky bar**: slides in 220 ms `--ease-out` when the hero CTA exits viewport (IntersectionObserver), out when the offer card is visible.
3. **Price block**: a calm count-free display; no animated counters on price (trust).
4. **FAQ**: height-animation-free (`interpolate-size`/grid-rows trick or `details` with `::details-content` transition, progressive), marker `+` morphs to `-` (exists).
5. **Playground**: letters pop with `--ease-spring`, soft "tap" haptic via `navigator.vibrate` only if available and motion-ok; success is a sparkle, never a red error.
6. **Age selector**: `<ViewTransition>` crossfade (exists); announce change via `aria-live="polite"`.
7. **Scroll walkthrough**: sheet preview crossfades with 8 px rise.
8. **Reassurance micro-copy** at the CTA reveals on first hover/focus only if it adds info (payment methods) - otherwise always visible.
9. **Exit-intent overlays, countdown timers, fake stock, confetti on view**: none (07).

### 4.7 Assistant entry point UX (disabled until activation)

State today: build-time flag `NEXT_PUBLIC_ASSISTANT_ENABLED`, absent means no launcher, no panel, no session, no API call and the code is not emitted (`src/features/assistant/flag.ts`). Keep that as the contract.

**While disabled (now):** nothing renders and nothing is reserved that could shift layout (CLS 0). Support is the footer "Soporte" link and the contact email; the FAQ ends with "No encuentras tu respuesta? Escribenos" linking to `/soporte/`. Add a visual-regression case for the disabled state so a stray launcher is caught.

**Activation gate (design requirements before the flag flips; aligned with 07 P2 item 14):** eval set and refusal behavior passed; "asistente automatico, no una persona" disclosure visible in the panel header and first message; human handoff (email/WhatsApp) one tap away; price/guarantee/refund text read from the same source as the page; consent and privacy copy for chat data; assistant answers never obscure the checkout CTA.

**Entry UX when enabled:**

- Launcher: a labeled pill "Preguntanos" (not an icon-only bubble), bottom-right on desktop, bottom-left or above the sticky buy bar on mobile so it never covers the primary CTA; hidden while the offer card is in view on the kit page and while the consent banner is open; stack order stays as documented (launcher 70 < sticky bar < consent 90 < scrim 94 < panel 95).
- Load strategy: the launcher button is tiny SSR/static; the panel code loads on first intent (pointerenter, focus, or idle after first scroll), budget <= 60 KB gz lazy (**target, to measure**); open animation 220 ms `--ease-out` from the launcher's origin; mobile opens as a near-full-height sheet (exists in CSS per `assistant.module.css`), desktop as a compact panel that can expand.
- Empty state: 3 tappable starter questions drawn from the real objections (contents, ages, printing, guarantee), no free-form required.
- Streaming: tokens appended with no per-token layout animation; caret respects reduced motion; `aria-live="polite"` on the transcript with debounce; Escape closes; focus returns to the launcher.
- Holdout: 10-20% of traffic never sees it (07) so impact on conversion is measurable.
- Reduced motion and Save-Data: no panel-open animation, no prefetch of the panel code.

### 4.8 Dark mode recommendation (with evidence)

**Recommendation: do not ship dark mode now; build dark-ready and measure.** Evidence (06 section 8): NN/g's review finds light mode performs better for normal-vision users most of the time and recommends opt-in rather than default dark; a 2025 review found light better for readability, dark better for comfort in low light; **no evidence was found that dark mode changes e-commerce conversion**; nothing found favors dark for children. Product reasons: the brand's warmth, illustration and the **color accuracy of the kit photography** carry conversion; dark would add a full QA matrix (every band, planet, image ground) on the page that sells. Steps: (1) keep ADR-0006; (2) add `<meta name="color-scheme" content="light">` plus `color-scheme: light` (already in `:root`) so form controls/scrollbars/in-app browsers' forced-dark heuristics do not invert the page (Android WebViews can force-darken; `color-scheme` declaration opts out); (3) express semantic tokens so a future `light-dark()` pass is mechanical; (4) log `prefers-color-scheme: dark` share and evening-session share in the cookieless counter; (5) if dark share is material (e.g. above 25% of mobile sessions **(threshold is my judgment)**) ship a restrained "night reading" theme for legal/FAQ/blog first, not the sales page. The portfolio is the right place for dark-first; the store is not.

---

## 5. Per-site view list with acceptance criteria

Common acceptance (every view): axe 0 serious/critical in each theme (portfolio) and each viewport; WCAG 2.2 AA (focus not obscured, targets >= 24 px with 44 px for primary touch, dragging alternatives); no horizontal scroll 320-1920; 200% and 400% zoom reflow; reduced-motion render verified; frame-time gate where scroll effects exist; visual-regression baseline (both themes for portfolio); Lighthouse mobile gates from 2.6 and a11y >= 95; no text over canvas below 4.5:1 on the worst frame.

"Designer 95+" uses the portfolio's rubric (visual 20, motion 20, performance 15, a11y 15, responsive 10, navigation 10, uniqueness 10) with the cap rule from 06 (any a11y blocker caps at 89). "Recruiter/CRO 95+" means: recruiter rubric (portfolio) or the 07 CRO checklist items P0/P1 satisfied (pequeverso).

### 5.1 Portfolio (EN and ES for each)

| View | Designer 95+ criteria | Recruiter 95+ criteria |
|---|---|---|
| `/` | LCP <= 2.0 s mobile with 3D disabled and <= 3.0 s with 3D static fallback; hero journey <= 3,500 px mobile; scroll p95 <= 20 ms at 4x; light and dark both reach parity score within 2 points; theme reveal works; skip catalogue; one WebGL context on mobile | Role, stack and proof in first viewport; one live demo link and one contact action; featured work visible without scrolling the hero journey |
| `/work` | Cards with consistent ratio; shared-element morph; filter in URL; <= 30 tab stops | Each card shows outcome and stack; scannable in 30 s |
| `/work/filomena`, `/work/pequeverso` | Impact summary first; diagram has text fallback and <= 10 tab stops; lightbox respects filter; on-this-page nav; next-case morph | Problem, role, result, stack, eval/latency/cost where the owner approves; repo/demo links |
| `/stack` | <= 12,000 px mobile or virtualized; correct plural; chips with visible light-mode ring | Scannable tech evidence, filter works by keyboard |
| `/about` | Portrait has no dark rectangle in light; 65ch measure; stable contrast over solar field | Narrative in 3 short blocks, human photo, positioning consistent with CV |
| `/education`, `/cv` | CV print stylesheet; body >= 15 px; PDF twin | PDF download one click; dates and roles consistent |
| `/contact` | Copy-to-clipboard confirmation announced | Email and LinkedIn within one click from every page |
| `/assistant` | Disclosure, starters, streaming a11y, handoff | Demo link works; limitations stated |
| 404 (EN/ES) | Locale-aware, on-theme, no layout shift | Routes to Work/Contact |
| Global | Pause-motion control, lang correct on `/es`, hreflang, 3 signature moments within budget | Consistent nav, no dead links |

### 5.2 Pequeverso

| View | Designer 95+ criteria | CRO 95+ criteria |
|---|---|---|
| `/` hub | Doors and concrete lead in the first viewport at 320x568 and 390x844; LCP <= 2.0 s with the live third-party set; scroll-driven reveals pass frame gates on low-end Android; no CLS from fonts | Two taps to either product page; affiliate disclosure adjacent; trust strip real; click-through measured (cookieless) |
| `/grafismo-fonetico/` | Blocks 1-11 in the specified order; hero price/guarantee/format in the buy box; walkthrough has static fallback; legacy CSS Modules removed on this route; sticky bar stacking verified with consent and assistant; INP <= 150 ms on the five interactions | 07 P0 items 1-6 closed; price, currency, "pagas en Hotmart", guarantee length and format visible before the first CTA; CTA copy identical; free sample available; Instagram in-app browser run passes |
| `/alimentacion-bebe/` | Same system, no coral confusion, producer facts from config | Disclosure above the CTA, outbound link has `src`, no efficacy claims |
| `/grafismo-fonetico/gracias/` | Calm, branded, no heavy JS; download/next-steps and support | Clear "what now" in 3 steps, print tips, support link, review request only after real delivery |
| `/soporte/` | Contact paths, response time | Email/WhatsApp, refund path, link to terms |
| Legal pages (`/privacidad`, `/terminos`, `/cookies`, `/aviso-legal`, `/compras-y-reembolsos`, `/arrepentimiento`) | Same prose system, 65ch, headings navigable, print-friendly | Linked from footer and (arrepentimiento) from the first page per 07 |
| 404 / error / global-error | On-brand, offers home and kit, no JS dependency | Keeps the parent in the funnel |
| Assistant (disabled) | No trace in DOM or layout; activation checklist met before enabling | Support path covers the need until then |
| Global | `color-scheme` meta, zero third-party main-thread work before interaction, view transitions on route changes, coral lint | Measurement plan from 07 section 9 in place |

---

## 6. Phases, risks and gates

### Phase A: polish now (no architecture change; matches the portfolio roadmap's Phase A and pequeverso's current structure)

Portfolio A:

- A-E1 to A-E5 guardrails first (baseline, axe 2.2 tags, first screenshots with static renderer and masked canvas, scene contrast test, CSS freeze), then frame-time and LoAF specs from 2.7.
- Hero particle system v2 (3.8), starting with tier 0/1 and the poster-to-canvas handoff; fix the hero hitch; render-on-demand plus idle pause for the solar field; per-route texture loading (512 ambient); one context on mobile; hero journey shortening and skip catalogue; pause control; `lang` on `/es`, 404 locale.
- Light mode: tokens from 3.2, planet shader night-side fix, shadow tokens, header separation, portrait fix, ink-dot rendering.
- Motion tokens unified (2.2), button hover simplification, bg/color transitions; replace `PageMotion` IntersectionObserver reveals with scroll-driven CSS where supported.
- Page-level `<ViewTransition>`, theme reveal, work-card morph (behind feature detection and reduced-motion).
- Fonts 3 families to 2; responsive images (`unoptimized` removal for card previews).

Pequeverso A:

- **First**: verify and fix the pixel/third-party loading finding (1.2); re-run Lighthouse on the live URL and in the Instagram in-app browser; update `docs/performance.md` with the delta between static export and live.
- Add frame-time/INP gates to CI; stop relying on LCP/CLS/TBT alone.
- Hub hero concrete lead; kit landing hero buy-box facts; block ordering and CTA rhythm; guarantee block; walkthrough using existing scroll-driven reveal infrastructure; promote the playground.
- Route-level `<ViewTransition>`; sticky bar stacking tests; coral lint; `color-scheme` meta; finish deleting legacy CSS Modules on product pages.
- Assistant: disabled-state regression test and the activation checklist document (no code enabling).

### Phase B (structural, behind the guard, same UI)

Shared token package (DTCG 2025.10 JSON with Style Dictionary emitting both repos' CSS) once both sites agree on names; portfolio design-system refactor already planned (Clean Architecture phase); shared `motion` module (tokens, `useMotionOk`, scene-budget plugin) extracted from pequeverso's `src/shared/motion` (which the ADR says originated in the portfolio); cookieless analytics events wired to CTA blocks; sample-sheet flow with consent; per-theme posters and OG images; KTX2 textures; Lighthouse CI with GPU lane; real-device test routine.

### Phase C (end state / experiments)

WebGPU feature-detected enhancement for the portfolio only if a measured gain appears on iOS 26+ and Chrome; optional night reading mode for pequeverso legal/FAQ pages; assistant activation with holdout; field RUM dashboards (INP by route, LoAF attribution); consented testimonials slot filled; one bold A/B of hero+CTA bundle over >= 4 weeks via separate UTM URLs (07 P2 item 13); optional Speculation Rules if the sites move to multi-document navigation.

### Risks

| Risk | Mitigation |
|---|---|
| Polishing without visual diffs breaks identity | A-E3 screenshots (portfolio) before CSS changes; pequeverso visual baselines (`docs/verification/visual/`) extended; both themes in CI |
| Performance work weakens the signature scenes | Acceptance AC-A6: sphere and solar field stay and improve; poster/tier fallbacks only under load |
| View Transitions and 3D canvases snapshot a frozen frame | Exclude/pause canvases during the transition; test with traces |
| In-app WebViews (Instagram/TikTok) lack newer CSS/VT support | Progressive enhancement; test one real in-app session per release |
| Scroll-driven animation Baseline claim is unverified | Keep `@supports` guards and static fallbacks permanently; re-verify at MDN/caniuse before removing GSAP fallbacks |
| Live pequeverso third-party finding is a hypothesis | Verify first; if it is only a stale deployment, record that and still enforce the "no third-party before interaction" gate |
| Fraunces axes may be subset away | Check the shipped woff2 axes before specifying `SOFT`/`opsz` |
| WebGPU migration chases hype | Deferred to Phase C with measured gate |
| Motion tokens renamed across repos cause churn | Keep aliases; migrate opportunistically |
| Light-mode concept cannot be judged on tokens alone | Review with real frames per route, worst-frame contrast tests, designer re-score recorded separately for light and dark |
| Copy changes introduce claims | No claim added without owner approval; 07 "do not do" list is a gate |
| GSAP "free" license nuance | Read the license text before relying on it commercially |

### Gates (every PR touching UI)

1. **Visual regression**: Playwright `toHaveScreenshot` for each view in 5; portfolio in both themes and EN/ES samples, static renderer forced and canvas masked, mouse parked, fonts ready, animations frozen; baselines generated in the CI image; pequeverso at 320, 390, 768, 1280 with consent banner dismissed and assistant disabled.
2. **Accessibility**: axe-playwright with `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` and best-practice, 0 serious/critical, per route x theme x viewport; keyboard pass (tab order, no obscured focus, skip links); NVDA or VoiceOver spot check for new patterns (view transitions, pinned sections, assistant).
3. **Lighthouse CI**: mobile, simulated 4G and 4x CPU, median of 5, LCP <= 2.0 s, TBT <= 200 ms, CLS <= 0.05, a11y >= 95, bundle gates; 3D disabled lane in CI, GPU lane scheduled.
4. **Frame-time and INP**: specs from 2.7 with p95 <= 20 ms, p99 <= 33 ms, dropped <= 2%, zero LoAF > 100 ms, max interaction <= 150 ms, in full and reduced-motion lanes.
5. **Design-system lint**: no raw hex/oklch outside token files, coral only in CTA/price components, token contrast unit test, no `transition: all`, no animated properties beyond the allowed list (stylelint rule or test).
6. **Review**: reviewer plus architecture-reviewer for structural items; designer and recruiter/CRO rubric re-score with evidence (screenshots, traces) attached; the lower of the two themes is the reported score.

---

## Sources and honesty notes

Primary repo evidence: portfolio `docs/master-plan/audit/baseline-2026-10.md`, `docs/master-plan/research/design-ux-playbook.md`, `docs/master-plan/roadmap.md`, `src/app/globals.css`, `src/shell/page-motion.tsx`; pequeverso `docs/design-system.md`, `docs/performance.md`, `docs/decisions/ADR-0006-shadcn-tailwind-design-system.md`, `docs/specs/home-hub.md`, `src/app/globals.css`, `src/shared/motion/motion.css`, `src/views/home/home-hero.tsx`, `src/features/assistant/flag.ts`, `src/features/tracking/adapters/meta.ts` (first 60 lines only); live-site Lighthouse JSON in `audit/pequeverso/lighthouse/`.

Web research this session (secondary sources, no primary-spec verification): Thoughtworks Radar on Lenis (https://www.thoughtworks.com/radar/languages-and-frameworks/lenis), GSAP forum on ScrollSmoother vs Lenis (https://gsap.com/community/forums/topic/36030-use-scrollsmoother-features-with-lenis-scroll/), hontran.dev smooth-scroll and Core Web Vitals guides (https://www.hontran.dev/blog/core-web-vitals-for-animation-heavy-sites), Chrome LoAF docs (https://developer.chrome.com/docs/web-platform/long-animation-frames), three.js WebGPURenderer manual (https://threejs.org/manual/pages/webgpurenderer.html), three.js forum threads on WebGPU/WebGL fallback performance (https://discourse.threejs.org/t/webgpu-significant-performance-drop-and-shadow-quality-regression-in-r182-vs-webgl-r170/89322), and iOS 26 WebGPU articles whose claims conflict (https://appdevelopermagazine.com/webgpu-in-ios-26/). I did not run searches on kid-brand e-commerce references or Awwwards-style AI portfolio references this session; the design choices in 3 and 4 there rely on my expertise plus the portfolio playbook's reference list (Stripe dot globe, Abeto Messenger, Lusion) and 06/07. Numeric budgets and the light-mode OKLCH values are proposals to be validated, not measurements.
