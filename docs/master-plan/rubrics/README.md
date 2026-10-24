# Fixed review rubrics

The owner requires **95 or more on every axis** of the [scorecard](../scorecard.md) under three
lenses: senior developer, senior designer and senior recruiter. These rubrics fix the criteria
so that every re-score uses the same bar across phases.

| Lens | Rubric | Axes judged |
| --- | --- | --- |
| Senior developer (SD) | [senior-developer.md](senior-developer.md) | 3–12, 13 (technical docs), 14 |
| Senior designer (DS) | [senior-designer.md](senior-designer.md) | 1–5 |
| Senior recruiter (RC) | [senior-recruiter.md](senior-recruiter.md) | 1, 2, 13 (first impression and showcase) |

## How to score

- The criteria come from the master plan's research and phase acceptance criteria; they are
  not changed between re-scores. Changing a criterion requires a documented decision in the
  [master plan README](../README.md) and invalidates comparison with earlier scores.
- Score each axis 0–100 per lens and cite evidence for every criterion:
  - **95–100**: every criterion of the axis is met and backed by automated or recorded
    evidence (CI run, report artifact, screenshot set, signed checklist).
  - **85–94**: every critical criterion (marked **C**) is met; non-critical gaps remain.
  - **below 85**: at least one critical criterion is unmet or unevidenced.
- A criterion without evidence is unmet. Synthetic, real PostgreSQL, live OAuth and production
  evidence are labeled separately, as the repository rules require.
- When an axis is judged by more than one lens, the axis score is the lowest lens score.
- Record: commit SHA, date, lens, per-criterion result and evidence links.
