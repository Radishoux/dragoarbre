# CLAUDE.md — Dragoarbre

Fan-made, bilingual (FR/EN) interactive breeding tree and planner for
Dofus mounts. Static site, no backend, deployed to GitHub Pages. All three
species ship: 306 colours across Dragoturkeys, Seemyools and Rhineetles.

## Commands

```bash
bun install
bun run dev        # http://localhost:5173/dragoarbre/
bun test           # data, breeding-math and planner tests
bun run lint        # Biome check
bun run lint:fix     # Biome check --write
bun run build        # tsc -b && vite build → dist/
bun run preview      # serve the production build locally
```

## Where data lives

Game data (colors, bonuses, crosses, special mounts) lives in
`src/data/*.ts`, never in components. See `docs/DATA.md` for the full
field reference, sourcing rule, and correction process. **Hard rule: game
data is never invented, guessed, or scraped — only added from
user-provided sources**, with the source and verification date recorded in
each data file's header comment.

## Where the logic lives

`src/core/` is the pure, React-free layer and holds all the math:

- `breeding.ts` — the documented probability constants and
  `targetGenerationChance()` / `expectedMatingsForTargetGeneration()`.
- `planner.ts` — the planner engine. `computePlan(targetId, quantity,
  settings, colors?)` returns a `BreedingPlan`: matings per recipe pair,
  mounts per colour (`expected` and `safe`), generation-1 wild captures,
  totals and a genetokens estimate. `rankAllRecipes()` scores every recipe of
  every colour by the wild captures its full plan costs and is what picks the
  one `computePlan` breeds through; `findRecipeCollisions()` asserts the
  target-split `k` is 1 across the shipped data; `cheapestLineageIds()` gives
  the tree the ancestry the plan actually takes. Its TSDoc is the source of
  truth for the formulas; read it before changing anything numeric.

Nothing in `src/core/` may import from `components/`, `pages/` or `i18n/`.
The planner UI (`src/pages/PlannerPage.tsx`, `src/components/Planner/`)
only renders what `computePlan()` returns; the plan's inputs live in the
route's query string via `src/utils/planUrl.ts`, not in component state.

## Phase roadmap

- **Phase 1 (done):** the interactive Dragoturkey breeding tree.
- **Phase 2 (done):** the shopping-list planner — `src/core/planner.ts`
  plus the `/planner` screen. Pick a target color and get the expected
  matings, mounts and wild captures per generation, from
  `src/core/breeding.ts`'s probability math. Genetokens shipped with it.
- **Phase 3 (done):** Seemyools and Rhineetles — 66 colours to 306. Not a
  pure data drop: a colour can have up to 12 recipes, so the planner ranks
  them and breeds through the cheapest, the target-split rule was generalised
  to `p / k`, and the tree draws one recipe's edges with a per-node reveal.
  Each new species is declared as its 15 monocolors and `buildSpecies()`
  derives the other 105. See `docs/DATA.md` for the checklist before adding
  a fourth.

- **Phase 4 (done):** the Reproducteur capacity and the multiplier capture net
  as planner settings, both off by default; the breeding tree turned top to
  bottom with wrapping, wheel-scroll and modifier-zoom; and original mount
  silhouettes. Data corrected against two community sources supplied by Rudy —
  the tiered Dragoturkey vitality bonus, the capture spell name, and a
  wild-mount level conflict left documented rather than resolved.

Ideas noted but **not** committed to: per-generation level overrides in the
planner, a Monte Carlo confidence mode instead of bare expectations, and
wall-clock time estimates from the gauge mechanics. See `docs/OVERVIEW.md`.

## Documentation maintenance rules

- Documentation is updated in the **same commit** as the code it
  describes. A feature is not done if the docs lie about it.
- Every phase ends with a documentation pass bringing `README.md`,
  `docs/OVERVIEW.md`, `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` up to
  date.
- `docs/DECISIONS.md` is append-only: new phases add entries, past entries
  are never rewritten.
- See `docs/OVERVIEW.md` (product), `docs/ARCHITECTURE.md` (technical),
  `docs/DATA.md` (game data) and `docs/DECISIONS.md` (why) for the full
  documentation set.

## Judgment calls made during phase 1 (not spelled out in the brief)

- Bicolor node names in `MountColor.name` are stored bare (no species
  word); the full display name is composed in the UI. See
  `docs/DECISIONS.md`.
- Only `targetGenerationChance()` is modeled as exact math; the residual
  color distribution stays qualitative prose in the i18n locale files.
- Custom SVG layout/pan-zoom instead of a graph library.
- Biome replaces the Vite scaffold's default `oxlint`.

## Judgment calls made during phase 2 (two of them contradict the brief)

- **The brief's Indigo cloning-on vector is arithmetically inconsistent.**
  It asks for Almond 1.0; with the brief's own `f = 0.5` compounding, the
  answer is **0.5**, and its own Golden/Ginger/mating figures confirm it.
  The normative pseudocode won. `planner.test.ts` pins Almond 0.5 with the
  full derivation in a comment. Do not "fix" this back toward the brief.
- **"Deeper targets never cost less than their parents" is only asserted
  without cloning.** It is provably false with cloning on, for 30 of the
  63 crosses — at `p = 1`, Crimson+Ginger (gen 6) costs 2.5 matings while
  its own parent Crimson (gen 5) costs 3. That is the cloning assumption
  showing up structurally, not a bug — the counterexample is pinned by a
  test so it can never change silently.
- Plan state lives in the URL query (`#/planner?target=…&qty=…`), not in a
  store. Parameter names are a public contract — shared links break if
  they're renamed, so new options must be optional with a default.
- `computePlan()` sweeps colors once in descending generation order
  instead of recursing literally. This is only valid because every `crosses`
  edge points to a strictly lower generation (enforced by
  `src/data/colors.test.ts` and `src/data/species.test.ts`) — relax that
  invariant and both the sweep and the recipe ranking break.
- One `parentLevel` is applied to both parents of every mating rather than
  modelling per-pair levels.
- Genetokens (a brief stretch goal) were implemented.

`docs/DECISIONS.md` carries the full reasoning, including an entry for
each of the planner's modelling assumptions (clean genealogy, failed births
not salvaged, genders ignored, cloning amortised, and — from phase 4 — the
Reproducteur second baby rolling independently).

## Judgment calls made during phase 3

- **Cheapest-recipe selection is scored in wild captures**, not matings or
  path length — captures are the only resource you leave the paddock for.
  The ranking depends on the settings, and at `p = 1` with cloning on every
  recipe ties exactly; the deterministic id tie-break is therefore
  load-bearing, not a rare path.
- **The split rule is implemented generically but `k` is 1 everywhere**, and a
  test asserts it stays that way rather than assuming it.
- **Lineage highlighting follows the cheapest path**, via
  `cheapestLineageIds()`, not `getLineageIds()`'s union of every recipe. A
  property test pins it to exactly `computePlan()`'s colour set.
- **The species word comes from `speciesInfo.ts`**, not an i18n key: it is
  per-species game data. `{ fr, en }` on a data record is content;
  `translation.json` is UI chrome.
- **URL-dependent UI state is derived at render, never synchronised in an
  effect** — a stale selection, reveal or stat filter is dropped by a
  `x === expected ? x : null` expression rather than cleared by a `useEffect`.

`docs/DECISIONS.md` carries the full reasoning for each.

## Judgment calls made during phase 4

- **The Reproducteur second baby is assumed to roll independently.** The
  sources say the capacity grants an extra baby, not how its colour is decided.
  Plans with it on are optimistic if the two are linked; it is off by default
  and stated in the UI's assumptions disclosure.
- **`chance` became `successesPerMating`** on `RecipeChoice`/`PlannedPair`,
  because with the capacity it exceeds 1 and it is the value the plan divides
  by. Names that lie about their range are worse than churn.
- **Capture nets change trips, not counts**, so they stay out of the cost model.
  The two reinforced AoE nets are not modelled at all — their yield depends on
  zone occupancy, which no source gives.
- **The tree's rotation and its wrapping are one change, not two.** Rotating
  alone put the new species at 8660px wide on the axis the wheel had just
  stopped scrolling.
- **Mount art is drawn here.** No Ankama assets, no ripped sprites, no
  hotlinking — the phase 1 policy, applied.

`docs/DECISIONS.md` carries the full reasoning for each.
