# CLAUDE.md — Dragoarbre

Fan-made, bilingual (FR/EN) interactive breeding tree and planner for
Dofus mounts. Static site, no backend, deployed to GitHub Pages. Phases 1
and 2 cover Dragoturkeys only — see the roadmap below.

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
- `planner.ts` — the phase 2 engine. `computePlan(targetId, quantity,
  settings)` returns a `BreedingPlan`: matings per recipe pair, mounts per
  color (`expected` and `safe`), generation-1 wild captures, totals and a
  genetokens estimate. Its TSDoc is the source of truth for the formulas;
  read it before changing anything numeric.

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
- **Phase 3 (next):** Seemyools and Rhineetles. See `docs/DATA.md`'s
  "adding a new species" checklist before starting — their data must come
  from a real source brief, not be stubbed. Note this is not a pure data
  drop: they breed differently from Dragoturkeys, and the planner's
  "one recipe per color" assumption will need revisiting.

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
  instead of recursing literally. This is only valid because every `cross`
  edge points to a strictly lower generation (enforced by
  `src/data/colors.test.ts`) — relax that invariant and the sweep breaks.
- One `parentLevel` is applied to both parents of every mating rather than
  modelling per-pair levels.
- Genetokens (a brief stretch goal) were implemented.

`docs/DECISIONS.md` carries the full reasoning, including an entry for
each of the planner's four modelling assumptions (clean genealogy, failed
births not salvaged, genders ignored, cloning amortised).
