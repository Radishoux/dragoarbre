# Task Board — Phase 3 (Seemyools and Rhineetles)

Last update: 2026-08-18 15:40
Current wave: Wave 0 — lead solo. T1 and T2 landed; T3 (shared foundations) is the last thing gating the 4-agent fan-out.

| ID | Task | Owner | Status | Depends on | Notes |
|----|------|-------|--------|------------|-------|
| T1 | Step 0 housekeeping: commit ORCHESTRATION.md + BRIEF-phase-3.md, create this board, ratify the phase 2 deviations in DECISIONS.md | lead | done | - | Ratification entry appended; DECISIONS.md stays append-only |
| T2 | `cross` → `crosses` migration across types, data, index, planner and UI | lead | done | T1 | Done: 61 tests / 5147 assertions, identical to the pre-migration baseline. Builders keep a single-pair signature so the 66 entries were not rewritten |
| T3 | Shared foundations: full `StatId` vocabulary (brief §6), FR/EN stat keys, `buildSpecies()` helper for the §3 universal structure rules | lead | in progress | T2 | Unblocks T4 and T5 — both new species need the same vocabulary and bicolor derivation |
| T4 | Seemyool dataset + integrity tests | agent-seemyool | todo | T3 | Owns `src/data/seemyools.ts`, `src/data/seemyools.test.ts`. 120 colors, 15 monos, recipe counts 6/3/8/8/4/8/5/5/5/5. Transcribe the Azur irregularity faithfully with a flag comment |
| T5 | Rhineetle dataset + integrity tests | agent-rhineetle | todo | T3 | Owns `src/data/rhineetles.ts`, `src/data/rhineetles.test.ts`. 120 colors, 15 monos, recipe counts 3/3/3/3/12/12/8/2/2/2/2 |
| T6 | Planner: cheapest-recipe selection (memoized over the DAG) + generic p/k split rule + pair-collision detector | agent-planner | todo | T3 | Owns `src/core/planner.ts`, `src/core/planner.test.ts`. All phase 2 vectors must pass unchanged |
| T7 | Species-aware UI shell: live tabs, species in the route/plan URL, species-scoped tree + search + wild capture | agent-ui | todo | T3 | Owns `Header.tsx`, `TreePage.tsx`, `PlannerPage.tsx`, `utils/planUrl.ts`, `data/wildCapture.ts`. New URL params must be optional with defaults — shared links are a public contract |
| T8 | Multi-recipe tree rendering + detail panel recipe list | agent-ui | todo | T6, T7 | Default to the cheapest recipe's edges; reveal-all affordance on the selected node; panel always lists every recipe |
| T9 | Integration: merge, resolve seams, i18n key audit (duplicates/orphans/repurposed), full `bun test` + lint + build | lead | todo | T4,T5,T6,T7,T8 | The seam between individually-correct changes is the lead's responsibility |
| T10 | Documentation pass: DATA.md, ARCHITECTURE.md, DECISIONS.md, OVERVIEW.md, README.md, CLAUDE.md roadmap | lead | todo | T9 | Same commit as the code it describes |
| T11 | Deploy to GitHub Pages via CI and verify live | lead | todo | T9, T10 | Definition of done, brief §11 |

## Wave plan

- **Wave 0 (lead solo):** T1 → T2 → T3. Sequential by necessity — every downstream task reads the migrated types and the shared species builder.
- **Wave 1 (4 agents in parallel):** T4, T5, T6, T7. Disjoint file ownership, no shared writes.
- **Wave 2:** T8, then lead integration T9.
- **Wave 3 (lead):** T10 docs, T11 deploy.

## File ownership (wave 1)

| Owner | Owns | Must not touch |
|-------|------|----------------|
| agent-seemyool | `src/data/seemyools.ts`, `src/data/seemyools.test.ts` | `types.ts`, `index.ts`, `rhineetles.ts`, anything in `core/` or `components/` |
| agent-rhineetle | `src/data/rhineetles.ts`, `src/data/rhineetles.test.ts` | `types.ts`, `index.ts`, `seemyools.ts`, anything in `core/` or `components/` |
| agent-planner | `src/core/planner.ts`, `src/core/planner.test.ts` | any `src/data/` file, any component |
| agent-ui | `src/components/Header.tsx`, `src/pages/*.tsx`, `src/utils/planUrl.ts`, `src/data/wildCapture.ts` | `src/core/`, the two species datasets |

Shared root files (`package.json`, `bun.lock`, vite/tsconfig/biome config, CI workflow, `CLAUDE.md`, this board) are lead-owned. `src/data/types.ts`, `src/data/index.ts` and the i18n locale files are lead-owned and frozen after T3; an agent needing a change there reports it instead of editing.
