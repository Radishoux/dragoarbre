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

---

## 2026-08-18 — Planner assumption 1: clean genealogy

**Context:** A mount's target generation depends not only on its parents'
colors but on the generations present in their family trees (the game
tracks a pedigree back to the grandparents). A line carrying a stray
ancestor can make some *other* color reachable as a target-generation
outcome too, splitting `p` across several possible babies. Modelling that
would require per-mount pedigree state; the planner only knows color ids.

**Decision:** Assume every mating in a plan uses parents whose colors are
exactly the recipe and whose trees introduce no competing
target-generation outcome. The desired baby is then the only
target-generation possibility, so `planChance()` is exactly the chance of
getting it.

**Consequences:** `p` becomes one plan-wide number instead of a per-pair
one, which is what makes an entire plan expressible as a single shopping
list. The assumption matches how players actually farm — clean pairs are
bred on purpose, not by accident. A plan executed with mongrel parents
will underperform its numbers, so the assumption is surfaced in the
planner's collapsible assumptions note rather than left buried in this
file.

---

## 2026-08-18 — Planner assumption 2: failed births are not salvaged

**Context:** A failed mating still produces a mount — just not one of the
target generation. It is usually of a lower generation, and often of a
color the plan needs elsewhere, so a careful player recycles it instead of
throwing it away.

**Decision:** The planner discards failures. Only the `q / p` successes
count toward the plan; by-products are never fed back into the `needed`
map.

**Consequences:** The estimate is conservative — a patient player who
recycles will spend fewer captures than the plan states. A number players
can beat is better than one they can miss. Modelling salvage properly
would need the residual color distribution, which the "only the
target-generation formula is exact math" decision above rules out for lack
of a public source; guessing at it here would smuggle invented numbers
into the one part of the app that is supposed to be exact.

---

## 2026-08-18 — Planner assumption 3: genders are ignored

**Context:** A mating needs one male and one female. Gender is random both
at birth and at wild capture, so an unlucky run of one gender stalls a
breeding line even when the color counts are perfectly correct.

**Decision:** Assume males and females pair up as needed. The planner
counts mounts, not couples.

**Consequences:** The output stays one number per color instead of a
distribution over gender splits, at the cost of being slightly optimistic
in practice. The `safe` column (`Math.ceil(expected)`) absorbs part of the
slack, and the assumptions note tells players to keep a small buffer on
captures. Quantifying gender properly would mean simulating runs rather
than computing an expectation — a much larger change for a planner whose
main value is being instant and deterministic.

---

## 2026-08-18 — Planner assumption 4: cloning is amortised at 0.5

**Context:** Cloning merges two spent (sterile) parents into one fertile
mount that is randomly one of the two colors. Across many matings that
returns on average 0.5 of each parent color; on any *single* mating it
returns 1 of one color and 0 of the other.

**Decision:** Model cloning as its expectation — a flat factor
`f = 0.5` applied to both parents of every mating
(`parentConsumptionFactor()`) — rather than as a random variable.

**Consequences:** The plan stays a closed-form expected value instead of a
Monte Carlo simulation. It is accurate for large plans and slightly
optimistic for small ones: a two-mating plan can genuinely draw the wrong
clone twice. It also produces fractional mount counts (0.25 of a color),
which is why every `PlannedColor` carries a `safe` ceiling next to its
`expected` value. And it has one structural consequence surprising enough
to deserve its own entry below: with cloning on, a deeper color can cost
*less* than its own parent.

---

## 2026-08-18 — Brief deviation: the Indigo cloning-on vector is inconsistent

**Context:** `BRIEF-phase-2.md` section 5 gives a reference vector for the
planner: target 1 Indigo, `p = 1`, cloning on → 2 total matings, "captures
Amande 1.0 expected (0.5 + 0.25 + 0.25), Dorée 0.25, Rousse 0.25". Indigo
(gen 3) = Almond+Golden × Almond+Ginger; Almond+Golden = Almond × Golden;
Almond+Ginger = Almond × Ginger.

**Decision:** Implement the brief's normative pseudocode, which gives
Almond **0.5**, and treat the prose figure as an error. With `f = 0.5`
compounding at each level, both gen-2 parents are needed 0.5 times, so
each of *their* parents is needed 0.25 times. Almond sits at exactly two
leaves of the plan tree → 0.25 + 0.25 = 0.5. The brief's own Golden =
0.25, Ginger = 0.25 and 2-total-matings figures all confirm the
compounding model; no consistent model yields (Almond 1.0, Golden 0.25,
Ginger 0.25, 2 matings) simultaneously. The stray 0.5 inside the brief's
breakdown is the quantity of a gen-2 parent, not a capture of Almond.

**Consequences:** One worked example in the brief is contradicted; its
pseudocode, its other two capture figures and its mating total are all
honoured. `src/core/planner.test.ts` asserts Almond 0.5 with the full
derivation in a comment, so nobody has to re-derive it from scratch or
"fix" the code back toward the brief. If a real source ever shows the
brief's 1.0 was right, the bug would be in the consumption factor, not in
this example — and that test is where it would surface first.

---

## 2026-08-18 — Brief deviation: monotonicity holds only without cloning

**Context:** The brief lists as a required property test that "deeper
targets never require fewer resources than their own parents". It is an
intuitive invariant: a color built *from* another color ought to cost at
least as much.

**Decision:** Assert the property only for cloning-off configurations, and
separately pin the cloning-on counterexample as expected behaviour. The
property is provably false with cloning enabled — for 30 of the 63
crosses. Verified case: Crimson+Ginger (gen 6) = Crimson (gen 5) × Ginger
(gen 1) at `p = 1` with cloning on costs 2.5 total matings, while Crimson
*alone* costs 3. The mating spends a Crimson but cloning refunds half of
it, and the other parent, Ginger, is a free wild capture — so the gen-6
color lands cheaper than its own gen-5 parent.

**Consequences:** This is assumption 4 showing up structurally, not a
defect, so it is pinned rather than patched: `planner.test.ts` asserts the
exact 2.5 versus 3 so the behaviour can never change silently, and the
monotonicity property is still enforced across all 66 colors for
cloning-off settings. A related fact from the same test is worth knowing
when reading any plan: at `p = 1` with cloning on, total wild captures are
exactly 1.0 per mount for *every* color, because each mating consumes 0.5
of each parent color, so the weights sum to 1 at every level. If cloning
is ever remodelled, that counterexample test is where the change becomes
visible.

---

## 2026-08-18 — Plan state encoded in the URL instead of a store

**Context:** The planner's state — target color, quantity, parent level
and three assumption toggles — is shared by the whole planner screen, and
phase 1's architecture notes had flagged this as the moment to reconsider
adding a store. It is also exactly the state a player would want to send
to someone else ("here's the plan for Plum").

**Decision:** Put all of it in the query string of the hash route
(`#/planner?target=…&qty=…&level=…&opti=…&takeza=…&clone=…`), encoded and
decoded by `src/utils/planUrl.ts`. Every parameter is optional and falls
back to `DEFAULT_PLAN_URL_STATE`, and values are validated and clamped on
the way in, so a bare `#/planner`, a partial link and a hand-edited one
all resolve to a usable screen.

**Consequences:** Still no state library, now for a better reason than
"the app is small": the URL *is* the state, so there is no copy to keep in
sync and no cache to invalidate — `computePlan()` is pure and fast enough
to run on every render. Plans become bookmarkable, shareable and
back-button-correct for free, and the "Plan this mount" button in the
phase 1 detail panel is just a link. The cost is that the state shape is
now a public contract: renaming a query parameter breaks links people have
already shared, so parameter names are treated as stable and new options
must be optional with a default.

---

## 2026-08-18 — Descending-generation sweep instead of literal recursion

**Context:** The brief specifies the plan as a recursion:
`plan(X, q)` computes `M = q / p` matings and calls itself on each parent
with `M * f`. Written literally, that re-walks a shared ancestor once per
distinct path leading to it, which is exponential in the number of
ancestry paths — and the deep generations of the Dragoturkey DAG have many
of them.

**Decision:** `computePlan()` evaluates the same recurrence iteratively.
It seeds a `needed` map with the target quantity and sweeps the color list
once in **descending generation order**, adding each color's parent
requirements into the same map as it goes.

**Consequences:** Identical results, linear in the number of colors (66)
instead of exponential in paths, with no memoisation table to maintain.
The equivalence rests on an existing data invariant rather than on
cleverness: every `cross` edge points to a strictly lower generation, a
rule enforced structurally by `src/data/colors.test.ts`, so a descending
pass reaches a color only after every color that could consume it has
already contributed its share. That coupling is the one thing to know
before touching either file — if the generation invariant is ever relaxed
(a species in phase 3 with same-generation crosses, say), this sweep stops
being valid and would need a topological order instead.

---

## 2026-08-18 — Genetokens estimate implemented rather than deferred

**Context:** Genetokens (FR: généton) are a breeding reward: a mating
awards them when the baby's generation beats every generation present in
both parents' family trees. `BRIEF-phase-2.md` lists them in section 7 as
a stretch goal, not a requirement.

**Decision:** Implement the estimate. Under assumption 1 (clean
genealogy), the award condition holds for *every* successful mating in a
plan, so the total is a single pass over the recipe pairs the planner has
already computed: `successes × (value(genA) + value(genB))`, with the
per-generation values in `GENETOKEN_VALUE_BY_GENERATION`.

**Consequences:** A meaningful number — deep plans are expensive, and this
shows what they pay back — for one extra field on `BreedingPlan`, one
summary card, and no new traversal. The value table lives in
`core/planner.ts` beside the formula that consumes it rather than in
`src/data/`, since it describes the breeding reward system rather than any
particular color; generation 10 is absent from it because a generation-10
color is never a parent. The figure inherits the clean-genealogy caveat: a
line bred from mixed ancestry earns less than the plan predicts, so it is
labelled an estimate in the UI.
