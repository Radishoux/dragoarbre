# Task Board — Phase 3 (Seemyools and Rhineetles)

Last update: 2026-08-18 17:30
Current wave: Wave 1 — data tracks done, verified and committed (306 colours). The planner and UI tracks both died on server-side API errors and have been resumed; the planner left `src/core/planner.ts` mid-edit, so the build is red there and only there.

| ID | Task | Owner | Status | Depends on | Notes |
|----|------|-------|--------|------------|-------|
| T1 | Step 0 housekeeping: commit ORCHESTRATION.md + BRIEF-phase-3.md, create this board, ratify the phase 2 deviations in DECISIONS.md | lead | done | - | Ratification entry appended; DECISIONS.md stays append-only |
| T2 | `cross` → `crosses` migration across types, data, index, planner and UI | lead | done | T1 | Done: 61 tests / 5147 assertions, identical to the pre-migration baseline. Builders keep a single-pair signature so the 66 entries were not rewritten |
| T3 | Shared foundations: full `StatId` vocabulary (brief §6), FR/EN stat keys, `buildSpecies()` helper for the §3 universal structure rules | lead | done | T2 | Done: StatId 12→32, 20 stat keys per locale, `species.ts` + 23 tests, `speciesInfo.ts` registry, species-aware `index.ts`, empty dataset files for T4/T5 to fill |
| T4 | Seemyool dataset + integrity tests | agent-seemyool | done | T3 | Owns the `SEEMYOOL_MONOS` table in `src/data/seemyools.ts` plus `src/data/seemyools.test.ts`. Only the 15 monos are transcribed; `buildSpecies()` derives the 105 bicolors. 120 colors, recipe counts 6/3/8/8/4/8/5/5/5/5. Done: 15 tests. Found a second, un-briefed irregularity in Aigue-marine on top of the named Azur one; both transcribed as given and pinned |
| T5 | Rhineetle dataset + integrity tests | agent-rhineetle | done | T3 | Owns the `RHINEETLE_MONOS` table in `src/data/rhineetles.ts` plus `src/data/rhineetles.test.ts`. Only the 15 monos are transcribed; `buildSpecies()` derives the 105 bicolors. 120 colors, recipe counts 3/3/3/3/12/12/8/2/2/2/2 |
| T6 | Planner: cheapest-recipe selection (memoized over the DAG) + generic p/k split rule + pair-collision detector | agent-planner | in progress (resumed) | T3 | Owns `src/core/planner.ts`, `src/core/planner.test.ts`. All phase 2 vectors must pass unchanged |
| T7 | Species-aware UI shell: live tabs, species in the route/plan URL, species-scoped tree + search + wild capture | agent-ui | in progress (resumed) | T3 | Owns `Header.tsx`, `TreePage.tsx`, `PlannerPage.tsx`, `utils/planUrl.ts`, `data/wildCapture.ts`. New URL params must be optional with defaults — shared links are a public contract |
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
| agent-ui | `src/components/Header.tsx`, `src/pages/*.tsx`, `src/utils/planUrl.ts`, `src/components/DetailPanel.tsx` | `src/core/`, `src/data/` (read only — wild-capture text now lives in the lead-owned `speciesInfo.ts`) |

Shared root files (`package.json`, `bun.lock`, vite/tsconfig/biome config, CI workflow, `CLAUDE.md`, this board) are lead-owned. `src/data/types.ts`, `src/data/index.ts` and the i18n locale files are lead-owned and frozen after T3; an agent needing a change there reports it instead of editing.

## Wave 1 incident log

- **17:05** — `agent-planner` (T6) terminated on a server-side API error immediately after writing "Now `computePlan` itself." Everything it built survives on disk (`rankRecipes`, `findRecipeCollisions`, the split index, ~lines 90-514); only `computePlan` was left as the old phase 2 body against a changed import line, giving 3 compile errors. Resumed from its own transcript with that exact state described back to it.
- **17:05** — `agent-ui` (T7) terminated on a 500 while still reading context; nothing was started. Resumed with the original brief plus the note that both datasets have since landed.
- Neither failure was caused by the work; both were transport-level. The data tracks were unaffected and are committed.
