# Lighthouse summary (n=1, Lighthouse 13.5.0, localhost fixture, 2026-11-09)

Trimmed JSON (category scores and core metrics per run) is committed in [lighthouse/](lighthouse/); the 1.9 MB raw reports stay in the planning workspace (`audit/portfolio-backoffice/lighthouse/`). The numbers below are extracted from them. n=1, so treat differences under 5 points as noise; the CI gate uses 5 runs and the median.

| Page | Form factor | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | TTI | JS transferred | Largest chunk (raw / transferred) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /sign-in | desktop | 97 | 100 | 96 | 60 | 0.3 s | 0.8 s | 140 ms | 0 | 0.8 s | 148 KiB | 237 / 66 KiB |
| /sign-in | mobile | 79 | 100 | 96 | 60 | 0.9 s | 2.5 s | 780 ms | 0 | 3.6 s | 148 KiB | 237 / 66 KiB |
| / | desktop | 84 | 100 | 96 | 60 | 0.3 s | 0.7 s | 350 ms | 0 | 1.2 s | 261 KiB | 365 / 108 KiB |
| / | mobile | 60 | 100 | 96 | 60 | 1.0 s | 3.6 s | 3,890 ms | 0 | 7.0 s | 261 KiB | 365 / 108 KiB |

SEO 60 is by design: the app sends `noindex` (robots meta and header). It is not a defect and the SEO category is not budgeted for this repository.
