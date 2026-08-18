# CLAUDE.md — Dragoarbre

Fan-made, bilingual (FR/EN) interactive breeding tree for Dofus mounts.
Static site, no backend, deployed to GitHub Pages. Phase 1 covers
Dragoturkeys only — see the roadmap below.

## Commands

```bash
bun install
bun run dev        # http://localhost:5173/dragoarbre/
bun test           # data + breeding-math integrity tests
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

## Phase roadmap

- **Phase 1 (current):** the interactive Dragoturkey breeding tree.
- **Phase 2:** a shopping-list planner — pick a target color, get the
  expected mount counts per generation, using `src/core/breeding.ts`'s
  probability math.
- **Phase 3:** Seemyools and Rhineetles. See `docs/DATA.md`'s "adding a
  new species" checklist before starting — their data must come from a
  real source brief, not be stubbed.

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
