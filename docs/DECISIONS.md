# Decisions

Lightweight architecture decision record. One entry per significant choice:
context, decision, consequences. Entries are append-only — later phases add
new entries; nothing here is rewritten in place.

---

## 2026-08-18 — Bun + Vite

**Context:** Stack was fixed by the phase 1 brief: Bun as package manager
and script runner, Vite as bundler.

**Decision:** Scaffolded with `bun create vite . --template react-ts`,
`bun test` as the test runner (no separate test framework), `bunx biome`
for lint/format.

**Consequences:** Single toolchain for install/dev/test/lint, fast cold
starts. `bun test` runs `.test.ts` files directly against the TypeScript
source — no bundler step needed for the pure data/logic tests in phase 1,
since none of them touch the DOM.

---

## 2026-08-18 — HashRouter for GitHub Pages

**Context:** The site deploys as a static site to GitHub Pages, which has
no server-side rewrite rule for client-side routes. A `BrowserRouter` app
would 404 on a hard refresh of `/how-breeding-works`.

**Decision:** Use `HashRouter` from `react-router` (routes become
`#/how-breeding-works`). This needs no Pages 404-redirect workaround.

**Consequences:** URLs are slightly less clean (`/dragoarbre/#/how-breeding-works`
instead of `/dragoarbre/how-breeding-works`), but zero deploy-side
configuration is required. Acceptable trade-off for a small, mostly-single-page
app; revisit if phase 2/3 add enough routes that clean URLs start to matter
for sharing/SEO.

---

## 2026-08-18 — Static typed data files instead of a backend

**Context:** The full Dragoturkey dataset (66 colors) is small, fixed, and
only changes when the game itself changes.

**Decision:** Store it as plain TypeScript data (`src/data/colors.ts`), not
JSON-over-API or a database. Derived indices (reverse cross lookup,
lineage) are computed once at module load from that data, never
hand-maintained separately.

**Consequences:** No backend, no fetch/loading states, no cache
invalidation — the entire dataset ships in the JS bundle and is available
synchronously. This only scales because the dataset is small (66 + a
future ~similar count for two more species in phase 3); it would not be
the right call for a large or frequently-changing dataset.

---

## 2026-08-18 — Only the target-generation formula is exact math

**Context:** The brief documents the mount-breeding probability system in
detail, but is explicit that the residual distribution (which non-target
color a baby gets, when several are possible) is not publicly documented —
only the in-game mating UI shows exact numbers for that part.

**Decision:** `src/core/breeding.ts` implements `targetGenerationChance()`
and `expectedMatingsForTargetGeneration()` as exact, tested pure functions.
The residual distribution is presented in the UI (`howItWorks.residual` in
the i18n locale files) as qualitative prose only — never as a formula or a
number Dragoarbre invented.

**Consequences:** Phase 2's shopping-list planner can rely on the
target-generation math for its expected-mating-count calculations (this is
also the case the brief calls out as the practical one, since Dragoturkeys
have exactly one recipe per color — no split needed). It must not attempt
to quantify the residual distribution without a real source for those
weights.

---

## 2026-08-18 — Custom SVG layout instead of a graph library

**Context:** The breeding tree is a dense, generation-by-generation DAG:
66 nodes, one column per generation, edges only ever pointing from a lower
generation to the next one that consumes it. The brief allowed a graph
library if needed, but suggested custom SVG/CSS as preferable given the
tree's clean structure.

**Decision:** Wrote a small pure layout function (`computeTreeLayout` in
`src/components/BreedingTree/layout.ts`) that buckets colors by generation
into fixed columns and stacks them vertically, plus a hand-rolled
pointer/touch pan-zoom hook (`usePanZoom.ts`). No graph/diagramming
library dependency.

**Consequences:** Full control over the visual style and lineage-highlight
interaction with zero extra dependency weight, at the cost of writing
pan/zoom and layout by hand instead of getting them for free. This was the
right trade for 66 fixed-structure nodes; would reconsider for phase 3 if
the combined node count or edge density grows enough to need automatic
graph layout (e.g. force-directed) rather than a fixed grid.

---

## 2026-08-18 — Tailwind CSS v4 (CSS-first config)

**Context:** Brief allowed Tailwind or plain CSS modules, whichever stayed
simpler.

**Decision:** Tailwind CSS v4 via `@tailwindcss/vite`, with the dark
fantasy palette defined as CSS custom properties in an `@theme` block in
`src/index.css` rather than a separate `tailwind.config.js` (v4's
CSS-first config approach).

**Consequences:** No JS config file to keep in sync; theme tokens
(`--color-ink`, `--color-accent`, etc.) are plain CSS variables usable both
via Tailwind's arbitrary-value syntax (`bg-(--color-panel)`) and directly
in component-level SVG `fill`/`stroke` attributes, which matters since the
tree is rendered as raw SVG, not styled DOM elements.

---

## 2026-08-18 — Biome instead of ESLint/oxlint

**Context:** The brief specified Biome for lint/format. The Vite scaffold
defaults to `oxlint` for linting.

**Decision:** Removed `oxlint`, added `@biomejs/biome` for both linting and
formatting (`bun run lint` / `bun run lint:fix`).

**Consequences:** One tool, one config file (`biome.json`), consistent
formatting rules (single quotes, no semicolons, trailing commas) enforced
across `.ts`/`.tsx`/`.json`/`.css`. Two lint findings needed inline
`biome-ignore` comments: SVG interactive nodes use `role="button"` on an
`<g>` (a real `<button>` isn't valid SVG content), and the language toggle
uses `role="group"` on a `<div>` rather than a `<fieldset>` (fieldset's
form semantics don't fit a stateless button toggle).

---

## 2026-08-18 — Bare color names in data; full display name composed in the UI

**Context:** The brief's naming pattern examples show the species word
baked into the full display name ("Dragodinde Amande et Rousse" /
"Almond and Ginger Dragoturkey"), with the species word's position
flipping between FR (first) and EN (last).

**Decision:** `MountColor.name` stores only the bare color name. A small
helper, `composeFullName()` in `src/utils/names.ts`, prepends/appends the
species word depending on language when a full name is needed (currently:
the detail panel title).

**Consequences:** Tree node labels stay short and readable for 66 nodes
without repeating "Dragodinde"/"Dragoturkey" 66 times; the full,
game-accurate name is still available anywhere it's actually needed. This
also means the FR/EN word-order rule lives in exactly one place instead of
being duplicated into the data file.
