# Task Board — Phases 3 and 4

Last update: 2026-08-19 01:30
Current wave: **Phase 3 complete.** All 11 tasks done. Committed as `1586adf` and pushed to `main`; CI ran tests, lint and build on the runner and deployed to GitHub Pages. Verified live at https://radishoux.github.io/dragoarbre/ — all three species, both languages, and phase 2 links still resolving unchanged.

| ID | Task | Owner | Status | Depends on | Notes |
|----|------|-------|--------|------------|-------|
| T1 | Step 0 housekeeping: commit ORCHESTRATION.md + BRIEF-phase-3.md, create this board, ratify the phase 2 deviations in DECISIONS.md | lead | done | - | Ratification entry appended; DECISIONS.md stays append-only |
| T2 | `cross` → `crosses` migration across types, data, index, planner and UI | lead | done | T1 | Done: 61 tests / 5147 assertions, identical to the pre-migration baseline. Builders keep a single-pair signature so the 66 entries were not rewritten |
| T3 | Shared foundations: full `StatId` vocabulary (brief §6), FR/EN stat keys, `buildSpecies()` helper for the §3 universal structure rules | lead | done | T2 | Done: StatId 12→32, 20 stat keys per locale, `species.ts` + 23 tests, `speciesInfo.ts` registry, species-aware `index.ts`, empty dataset files for T4/T5 to fill |
| T4 | Seemyool dataset + integrity tests | agent-seemyool | done | T3 | Owns the `SEEMYOOL_MONOS` table in `src/data/seemyools.ts` plus `src/data/seemyools.test.ts`. Only the 15 monos are transcribed; `buildSpecies()` derives the 105 bicolors. 120 colors, recipe counts 6/3/8/8/4/8/5/5/5/5. Done: 15 tests. Found a second, un-briefed irregularity in Aigue-marine on top of the named Azur one; both transcribed as given and pinned |
| T5 | Rhineetle dataset + integrity tests | agent-rhineetle | done | T3 | Owns the `RHINEETLE_MONOS` table in `src/data/rhineetles.ts` plus `src/data/rhineetles.test.ts`. Only the 15 monos are transcribed; `buildSpecies()` derives the 105 bicolors. 120 colors, recipe counts 3/3/3/3/12/12/8/2/2/2/2 |
| T6 | Planner: cheapest-recipe selection (memoized over the DAG) + generic p/k split rule + pair-collision detector | agent-planner / lead | done | T3 | `planner.ts` came from agent-planner; the lead wrote the missing test block after the agent died before it. 27 new tests: collision detector (empty on shipped data, and a synthetic k=2 species proving the `k > 1` branch), ranking order and tie-break, the p=1+cloning degenerate case, and species scoping. All phase 2 vectors pass unchanged |
| T7 | Species-aware UI shell: live tabs, species in the route/plan URL, species-scoped tree + search + wild capture | agent-ui / lead | done | T3 | `planUrl.ts` + its 45 tests came from agent-ui; the lead finished `Header.tsx` (undefined `speciesSearch`), scoped `TreePage` and `PlannerControls` via `getColorsBySpecies`, made `DetailPanel` species-aware (registry `wildCapture` + the species-bonus block), and fixed `useLocalizedName` which hardcoded the Dragoturkey species word for all three species. Phase 2 URLs are byte-identical |
| T8 | Multi-recipe tree rendering + detail panel recipe list | lead | done | T6, T7 | All four of brief §9's asks: the tree defaults to the cheapest recipe's edges (Rhineetle 280 → 232), a reveal toggle on the selected multi-recipe node shows the rest, the panel lists every recipe cheapest-first with its capture cost, and lineage highlighting follows the cheapest path via the new `cheapestLineageIds()` (Plum 28 → 11). `BreedingTree` took an optional `parentsFor` prop; `PlanTree` now draws the pairs the plan actually mates |
| T9 | Integration: merge, resolve seams, i18n key audit (duplicates/orphans/repurposed), full `bun test` + lint + build | lead | done | T4,T5,T6,T7,T8 | Audit scripted, not eyeballed: FR/EN parity exact (166 = 166), 0 keys used-but-undefined, 0 orphans after removing 7, and every stat/element/species key the data actually needs is translated in both locales. Found and fixed a real seam the per-track work could not see: the stat filter was a hardcoded Dragoturkey list |
| T10 | Documentation pass: DATA.md, ARCHITECTURE.md, DECISIONS.md, OVERVIEW.md, README.md, CLAUDE.md roadmap | lead | done | T9 | All six updated against brief §10. ARCHITECTURE gained the cheapest-recipe and split-rule sections with all three Mermaid diagrams redrawn; DECISIONS gained 6 appended entries (28 total); OVERVIEW and CLAUDE.md record the future ideas §10 asks for without committing to them |
| T11 | Deploy to GitHub Pages via CI and verify live | lead | done | T9, T10 | Commit `1586adf` pushed to `main` (7 commits total, including the 6 wave-0/1 ones). Run 32188449519 green: tests, lint, build, deploy. Live site verified — see below |

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

## Wave 1 close-out

- **18:38-18:44** — both resumed agents died a second time, again mid-file and again on transport errors, not on the work. `agent-planner` left `planner.ts` complete and compiling but `planner.test.ts` holding only the new import line (8 unused-import errors, no new tests). `agent-ui` left `planUrl.ts` and its tests complete but `Header.tsx` referencing an undeclared `speciesSearch` (3 errors), and had not started the pages.
- **22:45** — the lead finished both residuals rather than resuming a third time: each was a bounded remainder, and the T6/T7 seam is the lead's job under T9 anyway.
- Verified in a browser, not just in tests: all three trees render (66 / 120 / 120 colours), tabs and nav links carry `?species=`, the Rhineetle Plum plan matches the planner's own figures (3.6 expected captures, 5 safe, 8.8 matings, 35.8 genetokens), FR and EN both interpolate the species-bonus strings, a foreign selection is dropped when the tab changes, and the console is clean.
- Two follow-ups for T9, neither blocking: `WILD_CAPTURE_INFO` in `src/data/wildCapture.ts` is now a deprecated export with no callers (its own doc says to delete it once unused), and `species.dragoturkeySingular` is now an orphan i18n key — the species word comes from the `speciesInfo` registry.

## Wave 2 close-out (T8)

- The tree was drawing the **union** of every recipe's edges, not one set — so T8 was about narrowing the default rather than adding edges. Rhineetle went from 280 edges to 232 (two per bred colour); Dragoturkey is unchanged at 126, since every colour there has one recipe.
- `cheapestLineageIds()` was added to `src/core/planner.ts` because brief §9 also asks for lineage highlighting to follow the cheapest path. It is pinned by a property test to be exactly the colour set `computePlan()` touches, for all 306 colours and under two settings profiles — if the diagram and the plan ever diverged, that test fails.
- `PlanTree` had a latent problem the narrowing exposed: it laid out `getLineageIds(target)` (28 colours for Plum) while the plan breeds 11, so 17 nodes would have been left with no badge and no edges. It now lays out `plan.colors`.
- Verified in a browser: Rhineetle Plum lists all 12 recipes cheapest-first (3.63 → 4.16 captures/mount, matching the planner's own figures), the toggle adds 11 edges and flips its label without losing the selection, highlighting lights exactly the 11 cheapest-path colours, the planner tree is 11 nodes / 16 edges with every node badged, FR renders "3,63" with the decimal comma, and the console is clean.
- Still open for T9, unchanged: the callerless `WILD_CAPTURE_INFO` export and the orphaned `species.dragoturkeySingular` key.

## Wave 2 close-out (T9)

- **The i18n audit is a script, not an eyeball pass** (kept out of the repo, in the session scratchpad). Two blind spots had to be closed before its output could be trusted: keys reached through a variable (`{ titleKey: 'howItWorks.x' }` then `t(titleKey)`) looked orphaned, and the `species.` dynamic prefix masked genuine orphans underneath it. It now separates "never referenced" from "reachable only by dynamic lookup, verify by hand".
- **7 orphan keys removed.** Three were superseded by phase 3 — `detail.crossLabel` (replaced by T8's recipe list), `species.dragoturkeySingular` (the species word now comes from the `speciesInfo` registry), `species.comingSoon` (the tabs went live in T7). Four were phase 1 leftovers that never rendered: `app.tagline`, `detail.title`, `language.en`, `language.fr`.
- **1 key added.** `detail.recipesLabel` had only its `_one`/`_other` plural forms. i18next resolves plurals without a base key, but every other plural in the file carries one (see `planner.badgeTooltip`), so it now matches the file's own convention.
- **`src/data/wildCapture.ts` deleted** along with its re-export — the deprecated `WILD_CAPTURE_INFO` alias had no callers left, which its own doc comment gave as the condition for removal.
- **A real seam the per-track work could not see:** `SearchFilters` carried a hardcoded 12-entry stat list from phase 1. The tree became species-aware in T7 but its filter did not, so a Seemyool could not be filtered by Earth Resistance, Lock or MP Parry at all — and the list offered Vitality, which no colour carries (it is the species-wide bonus). The options are now derived from the colours on screen: Dragoturkey 11, Seemyool 15, Rhineetle 15. A stat the next species does not carry is dropped rather than left set, which would have filtered every node away and read as an empty tree.
- Verified in a browser: filtering Seemyools by Lock matches 15 of 120, switching species clears the filter and relights all 66 Dragoturkeys, the plural label renders "12 recipes" / "12 recettes", no raw i18n key leaks into the page in either language, and the console is clean.

## Wave 3 (T10) — what changed in the docs

- **DATA.md** was already largely phase 3 current (T3-T5 maintained it). Two things had gone stale: the `wildCapture.ts` row, for a file T9 deleted, and the derived-data section, which now distinguishes `getLineageIds()` (every recipe, 28 colours for Plum) from `cheapestLineageIds()` (the chosen path, 11).
- **ARCHITECTURE.md** took the bulk of it: two new sections for cheapest-recipe selection and the generic split rule, the invariants section rewritten for 306 colours across three species, and **all three Mermaid diagrams redrawn** — the dependency graph gained `components --> planner`, the data-flow graph gained the ranking and the `?species=` parameter, and the sweep graph gained the ranking input and the `p / k` mating count. Also documents the `?species=` URL contract and the derived-not-synchronised state pattern.
- **DECISIONS.md** gained 6 appended entries (28 total, none rewritten): cheapest-recipe selection, the split rule, cheapest-path highlighting, one-recipe-by-default edges, the species word moving to the registry, and species-derived filter options.
- **OVERVIEW.md, README.md and CLAUDE.md** carry the new counts and features, and both the roadmap files now record phase 3 as done. Brief §10 asks for future ideas to be noted without commitment: per-generation level overrides and a Monte Carlo confidence mode as named, plus two the phase surfaced — wall-clock time estimates from the gauge mechanics, and modelling capture nets and the Reproducer capacity.

## T11 — what remains

The only open task, and the first that needs a commit. Everything else is done and verified. Definition of done, brief §11: CI deploys to GitHub Pages and the live site is checked.

## T11 — deployed and verified live

Commit `1586adf` on `main`. Note the default branch here is `main`, not the
workspace repo's `master`; the deploy workflow triggers on `main` only.

CI run 32188449519: install, `bun test`, `bun run lint`, `bun run build`,
Pages deploy — all green on the runner, 31s. One pre-existing annotation about
Node 20 deprecation in `actions/checkout@v4` / `configure-pages@v5` /
`upload-artifact@v4`; it is a warning about the actions themselves, not our
build, and is worth a separate bump.

Verified against the live site, not localhost:

| Check | Live result |
|---|---|
| Dragoturkey tree | 66 nodes / 126 edges, 11 stat filter options |
| Seemyool tree | 120 nodes / 230 edges, 15 stat options |
| Rhineetle tree | 120 nodes / 232 edges, 15 stat options |
| Detail panel, Rhineetle Plum | 12 recipes, cheapest 3.63 captures/mount |
| Reveal toggle | "Show all 12 recipes" on the selected node |
| Cheapest-path highlighting | 11 nodes lit, not the union's 28 |
| Plan for Rhineetle Plum | 5 safe / 3.6 expected captures, 8.8 matings, 35.8 genetokens, 11 plan nodes |
| FR | "Planificateur d'élevage", Dragodindes / Muldos / Volkornes |
| Phase 2 link `#/planner?target=indigo&qty=2&level=200&opti=1&clone=0` | resolves unchanged, no `?species=` injected, 8 captures / 6 matings |
| Raw i18n keys leaked | none |
| Console errors | none |

Every figure matches what the planner computes locally.

## Phase 3 retrospective — for whoever runs phase 4

- **Four parallel agents produced individually-correct work with a seam none of them could see.** The stat filter stayed a hardcoded Dragoturkey list through two green test runs, because every track was correct within its own file ownership and no test covered "the filter offers what the data has". The T9 integration pass is what caught it. Budget for that pass; it is not a formality.
- **Both code agents died mid-file on transport errors, twice each.** What survived on disk was in each case complete and compiling in one file and half-written in another. Resuming from the transcript worked the first time; the second time the lead finishing the bounded remainder was faster and produced the T6/T7 seam knowledge T9 needed anyway.
- **Browser verification caught what tests could not**, three times: a `speciesSearch` that typechecked as a missing identifier only, a missing space in "Cheapest ·3.63", and the stat filter. Green tests are necessary and not sufficient — see the standing note in the user's own memory.
- **Watch for stale bundles.** The dev server serves the previous build after a restart; two measurements were wrong before a hard reload. Any edge or node count taken without one is suspect.
- **Keep scratch files outside the project.** A probe written into the repo triggered a Vite hot-reload mid-verification and reset component state, briefly looking like a bug.

---

# Phase 4 — setup, navigation and art

Unplanned: it grew out of two community sources Rudy supplied and two UI
requests, rather than from a brief. No task board was kept; this is the record.

| Work | Result |
|---|---|
| Source verification | Both dofuspourlesnoobs pages re-read verbatim. Corroborated all 11 Dragoturkey monocolor bonuses, the gen-3/5 recipes, the genetoken table and the three formula constants |
| Data corrections | Tiered Dragoturkey vitality (300@100, 400@200), capture spell « Apprivoisement de monture », 900 PV. `speciesInfo.test.ts` pins all three |
| Source conflict | Wild-mount level: 62-70 (brief + dedicated page) vs 60 (breeder guide). Left as shipped, documented in `docs/DATA.md`, not resolved by picking a side |
| Planner | Reproducteur (2 births per mating) and the multiplier capture net (trips, not counts). Both off by default; both optional URL params |
| Tree | Runs top to bottom, wheel scrolls, Ctrl/Shift zooms, generations wrap at 12 |
| Art | Original SVG mount silhouettes, tinted per colour |

## Bugs found and fixed along the way

None of these were the work being asked for; all three were shipped defects
surfaced by doing it.

1. **240 of 306 colours rendered grey.** `palette.ts` was keyed by bare
   Dragoturkey ids, so every prefixed Seemyool and Rhineetle id fell through to
   a `#666` fallback. Shipped since phase 3, found while tinting the silhouette.
2. **The page scrolled behind the tree on every gesture.** React registers
   `wheel` and `touchmove` as passive, so the existing `preventDefault()` had
   always been failing and logging. Zoom still worked, so nothing looked broken.
3. **The wrong capture spell name was in user-facing text** — « Dressage de
   Monture » where both sources say « Apprivoisement de monture ».

## Process notes

- **The documentation rule was broken once.** Commit `4ad5100` shipped the
  planner levers, the tree rework and the art with no doc changes; `70e9ef1`
  is the pass, late. The rule exists because the gap is invisible from the
  code side — everything was green and the docs simply described a different
  app.
- **A fetched page is a lead, not a source.** The first pass over both pages
  was read through a summarising model and glossed sections it had no room
  for. Only verbatim re-reads became data; the one figure still resting on the
  summary (mounts per enclos) was left out.
- **The dev server serves a stale bundle after a restart.** At least four
  measurements this phase were wrong until a hard reload — including one that
  briefly looked like the fifth assumption had failed to deploy.
- CI actions were bumped past the Node 20 deprecation (checkout v7,
  configure-pages v6, upload-pages-artifact v5, deploy-pages v5). The
  annotation every run had been carrying is gone.
