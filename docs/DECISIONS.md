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

---

## 2026-08-18 — Phase 2 deviations ratified by the brief author

**Context:** Phase 2 shipped two judgment calls that contradicted
`BRIEF-phase-2.md` on its face: the Indigo cloning-on capture vector
(Almond 0.5, not the brief's 1.0) and the monotonicity property scoped to
cloning-off only. Both were recorded at the time as deviations, which left
them reading like open questions a later phase might "fix" back.

**Decision:** `BRIEF-phase-3.md` section 0 closes both. The brief author
confirms the phase 2 brief contained an arithmetic error of its own: its
parenthetical `(0.5 + 0.25 + 0.25)` added the 0.5 expected quantity of the
Amande et Dorée parent — a generation 2 mount — into the Almond *capture*
count. The shipped 0.5 is correct. Monotonicity is likewise genuinely
false with cloning on: the 0.5 consumption factor halves upstream demand
at each recursion level, so a deeper target can require fewer captures of
a given color than its own parent does. Scoping the assertion to
cloning-off with a pinned counterexample is the intended behavior.

**Consequences:** Both entries above are now canonical, not provisional.
The pinned test vectors in `src/core/planner.test.ts` stay exactly as they
are — a future contributor reading the phase 2 brief and "correcting" the
code toward it would be reintroducing the brief's own error. Neither is to
be reverted.

---

## 2026-08-18 — `cross` becomes a `crosses` list

**Context:** Every Dragoturkey color has exactly one recipe, so phase 1
modelled it as `cross?: [string, string]`. Seemyools and Rhineetles do
not: their odd-generation monocolors can each be produced by several
parent pairs — up to 12 for a single Rhineetle Prune or Émeraude.

**Decision:** Replace the tuple with `crosses?: readonly Recipe[]`, where
`Recipe = readonly [string, string]`. Dragoturkey colors carry a
one-element list. The `mono()` / `bicolor()` builders keep taking a single
pair and wrap it, so none of the 66 phase 1 entries were rewritten — the
migration diff physically cannot have altered a value, and the existing 61
tests passing with an unchanged assertion count is the proof.

**Consequences:** Two derivations had to get more careful. `getParentIds()`
takes the union of parents across all of a color's recipes, so ancestry
follows every path rather than an arbitrary one, and the reverse
"children of" index dedupes so a parent shared by two recipes of the same
child is listed once. The tree dedupes the same way before drawing edges,
which also keeps its React keys unique. Consumers that display a single
recipe read `crosses[0]`, which is exact for Dragoturkeys and became the
planner-chosen recipe for the other two species.

---

## 2026-08-18 — Species are built from their monocolors, not enumerated

**Context:** The two new species have 120 colors each. Brief section 3
establishes that only the odd-generation monocolors are irregular:
bicolors are exactly every unordered pair of distinct monocolors, with
`generation = max + 1`, a single recipe of the two monocolors, and bonuses
equal to the two bicolor components summed. The brief leaves the choice of
generating or enumerating them to us.

**Decision:** Generate. `src/data/species.ts#buildSpecies()` takes a
species' 15 monocolors and derives the other 105 entries. Recipes are
transcribed in the brief's own vocabulary — a parent is either a
monocolor id or a bicolor named by its two monocolors, in either order —
and a reference that resolves to nothing throws at module load rather than
leaving a dangling id.

**Consequences:** 30 hand-written monocolors instead of 240 hand-written
entries. The 210 derived bicolors cannot carry a transcription typo,
because there is nothing to transcribe; the integrity tests still assert
the brief's exact per-generation counts, so a wrong *monocolor* generation
surfaces as a count mismatch. Dragoturkeys are deliberately not built this
way: their entries are the phase 1 source of truth, with known
irregularities in their bonus values, and the brief says to leave them
alone. The cost is that a genuine in-game irregularity among the new
species' bicolors cannot be expressed without adding an override
mechanism — an acceptable trade while no such irregularity is known.

---

## 2026-08-18 — New species prefix their color ids; Dragoturkeys do not

**Context:** All three species have an "Amande", a "Pourpre" and an
"Ivoire". Color ids key the URL (`#/planner?target=almond`), the data
indices and the routing, so they must be unique across the whole app.

**Decision:** Seemyool and Rhineetle ids are prefixed
(`seemyool-almond`, `rhineetle-almond`); Dragoturkey ids stay bare
(`almond`). The asymmetry is deliberate. `docs/DATA.md` freezes shipped
ids — "never reused, never renamed once shipped" — and phase 2 links are
live in the wild, so renaming the Dragoturkey set would break every shared
plan URL for a purely cosmetic symmetry.

**Consequences:** `colorId(species, bare)` is the single place that knows
the rule, and nothing else needs to. A reader seeing bare and prefixed ids
side by side should read it as "the bare ones shipped first", not as an
oversight.

---

## 2026-08-18 — Bicolor display names are composed alphabetically

**Context:** The brief gives explicit names for the 30 new monocolors but
for none of the 210 new bicolors, so their names must be composed. Phase 1
transcribed Dragoturkey bicolor names from its own source and those names
follow no single rule — "Prune et Ivoire" puts the higher generation
first, "Amande et Dorée" is alphabetical.

**Decision:** Compose alphabetically within each language, accent-
insensitively, so "Ébène" sorts as "Ebene" rather than last. Both
officially-confirmed examples in brief section 6 — "Almond and Emerald
Seemyool" and "Almond and Crimson Rhineetle" — are alphabetical, and they
are the only evidence available for the new species. The id follows the
English order so it reads the way the English label does.

**Consequences:** FR and EN can order the same bicolor differently; each
then reads correctly in its own language, which is the point. This is a
judgment call on data we do not have, not a transcribed fact, so the
composed names carry a verify flag until someone checks them in game — and
because they are composed rather than stored, correcting the rule is a
one-line change rather than 210 edits. Phase 1's transcribed Dragoturkey
names are untouched, as the brief requires.

---

## 2026-08-18 — Cheapest-recipe selection, scored in wild captures

**Context:** Phase 2 could assume one recipe per colour. Phase 3 cannot —
21 of the 306 colours have several, up to 12 for a Rhineetle Emerald or Plum.
The planner has to choose one, and "cheapest" needs a unit before it means
anything. Candidates: fewest matings, fewest intermediate mounts, shortest
path, fewest wild captures.

**Decision:** Score a recipe by the total expected **wild captures** of the
colour's full recursive plan, as brief section 8 specifies:
`cost(X) = min over recipes (A, B) of (k / p) * f * (cost(A) + cost(B))`, with
wild-caught colours costing 1. Memoise it as a single ascending-generation
sweep rather than a recursive walk with a cache. Break ties lexicographically
on the pair of parent ids compared as an *ordered* pair, then on recipe index.

**Consequences:** Captures are the right unit because they are the only
resource a player has to leave the paddock to get — matings and intermediate
mounts are consequences of the capture count, not independent costs.

The ascending sweep is the mirror of `computePlan()`'s descending one and rests
on the same invariant (every recipe points to a strictly lower generation), so
one pass reaches a colour only once both parents are scored. Linear in recipes,
whatever the fan-out.

Two consequences are worth stating because they look like bugs:

1. **The ranking depends on the settings.** Cost of a path of length `n` goes
   as `(f / p)^n`, so with `f / p < 1` a *deeper* recipe scores cheaper. This is
   the amortised-cloning assumption showing up structurally — the same one
   already recorded under "monotonicity holds only without cloning".
2. **At `p = 1` with cloning on, every recipe ties**, because `f / p` is exactly
   0.5 and every colour costs exactly 1.0 captures per mount. Ties are therefore
   common rather than rare, which is why the tie-break has to be deterministic
   and why costs are compared with a relative tolerance — two structurally
   equivalent recipes drift apart in the last bits of a float after a dozen
   multiplications, and would otherwise order by that drift.

Both are pinned by tests so neither can change silently.

---

## 2026-08-18 — The split rule is implemented generically, then asserted absent

**Context:** Brief section 8 defines it: if one exact parent pair appears in the
recipe lists of `k` different colours of the same target generation, the
target-generation pool is split and the effective chance for the colour you
want is `p / k`. The brief also states that in the transcribed data `k` is 1
everywhere.

**Decision:** Implement the rule generically anyway, and add
`findRecipeCollisions(colors)` whose result `planner.test.ts` requires to be
empty on the shipped data. Keep the `k > 1` branch under test with a synthetic
species whose two generation-3 monocolors share one parent pair.

**Consequences:** "There are no collisions" becomes an assertion rather than an
assumption. A future data correction that introduces one cannot silently divide
every probability in the plan — either the detector fails the build, or it
meets code that already handles it correctly.

The detector also had to settle what `k` counts. It counts distinct *colours*
competing for one generation's pool, not recipe entries: a colour listing the
same pair twice counts once, and the same pair feeding two colours at
*different* generations is not a collision, since they never compete. Both are
pinned by tests.

The cost of carrying an unexercised branch is one function and a fixture. The
cost of not carrying it would be a silently wrong plan.

---

## 2026-08-18 — Lineage highlighting follows the cheapest path, not every path

**Context:** Phase 1's tree highlighted `getLineageIds(selected)` — the walk
back to generation 1 following every recipe. With one recipe per colour that is
the only path there is. With twelve it is the union of all of them: 28 colours
for a Rhineetle Plum whose plan actually breeds 11.

**Decision:** Add `cheapestLineageIds(colorId, rankings)` to `src/core/planner.ts`
and highlight that instead. Brief section 9 asks for it, and the edges drawn in
the same view already follow the cheapest recipe, so the alternative was a
diagram whose highlighting and edges disagreed.

**Consequences:** It lives in `core/` rather than `src/data/` because it depends
on the planner's cost ranking, and the data layer must not know the planner
exists. `getLineageIds()` stays as-is and is still right for "what could this
ever be made from".

A property test asserts the two agree where it matters: `cheapestLineageIds()`
equals exactly `computePlan()`'s colour set, for all 306 colours under two
settings profiles. If the tree's highlighting and the plan ever diverged, that
fails rather than the UI quietly showing a path nothing takes.

---

## 2026-08-18 — One recipe's edges by default, revealed per node

**Context:** The Dragoturkey tree draws 126 edges over 66 nodes. Drawing every
recipe's edges for the new species gives 280 over 120 — sixteen converging on a
single Rhineetle — which is unreadable at the zoom level where you can also read
the labels.

**Decision:** `BreedingTree` takes an optional `parentsFor(color)` prop. Omitted,
it draws every parent across every recipe, which is the phase 1 behaviour and
correct for a single-recipe colour. `TreePage` passes the cheapest recipe's two
parents (280 → 232 edges), with a toggle on the selected node revealing all of
its recipes; `PlanTree` passes the pairs the plan actually mates. The detail
panel always lists every recipe regardless, cheapest first and priced.

**Consequences:** The default view answers "how do I actually make this", and
the full recipe set stays one click away in two places. Making the prop optional
meant no existing caller changed behaviour.

Keeping the toggle on the node rather than in a toolbar is what the brief
suggests, and it costs an event-propagation subtlety: the node itself is
clickable, so the toggle must stop the click reaching it or revealing recipes
would also re-select the node.

The reveal is *derived* rather than stored as its own synchronised state — it
survives only while its node stays selected, so `revealedId === activeId ?
revealedId : null` closes it on a new selection and on a species change at once,
with no effect to keep in sync.

---

## 2026-08-18 — The species word comes from the data registry, not an i18n key

**Context:** `useLocalizedName()` composed full display names with
`t('species.dragoturkeySingular')` — correct in phase 1, when there was one
species. With three, every Seemyool and Rhineetle would have been titled
"… Dragoturkey".

**Decision:** Read `getSpecies(color.species).singular[language]` from
`speciesInfo.ts` instead, and delete the now-orphaned i18n key.

**Consequences:** The species word is per-species game data, and `speciesInfo.ts`
is already the cross-cutting registry the UI reads to render a tab — so this
puts it where the sourcing rule can see it, rather than in the UI-chrome layer.
It also means adding a fourth species needs no new i18n key for its name.

The general line: `{ fr, en }` on a data record is for content; `translation.json`
is for UI chrome. The species word was on the wrong side of it.

---

## 2026-08-18 — Filter options are derived from the species on screen

**Context:** `SearchFilters` carried a hardcoded 12-entry stat list from phase 1.
The tree became species-aware in phase 3; its filter did not. So a Seemyool could
not be filtered by Earth Resistance, Lock or MP Parry at all, while the list
offered Vitality, which no colour carries — it is the species-wide bonus, kept
out of every colour's `bonuses` by design.

**Decision:** Derive the options from the colours currently on screen, in order
of first appearance. Dragoturkey 11, Seemyool 15, Rhineetle 15.

**Consequences:** The dead Vitality option disappears and 30-odd genuinely
useful ones appear. Order of first appearance is ascending generation, so the
list reads the way the tree does, and it reproduces phase 1's order for
Dragoturkeys minus the dead entry — no arbitrary re-sort to justify.

A stat the next species does not carry is dropped rather than left set, which
would have filtered every node away and read as an empty tree. Same derived-not-
synchronised pattern as the selection and the reveal.

This one is worth recording less for the decision than for how it was found: it
survived four parallel agents and two green test runs, because every track was
individually correct and no test covered "the filter offers what the data has".
The integration pass is where it surfaced, which is what that pass is for.

---

## 2026-08-19 — Species bonuses are a tier list, and a source conflict is kept unresolved

**Context:** Rudy supplied two community pages (dofuspourlesnoobs.com) as
additional sources. Cross-checking them against the shipped data confirmed
almost everything — all 11 Dragoturkey monocolor bonuses to the digit, the
generation-3 and -5 recipes, the genetoken table, and all three constants of
the target-generation formula — and turned up three discrepancies.

**Decision:**

1. **`SpeciesInfo.commonBonus` + `commonBonusFromLevel` become
   `commonBonusTiers`**, a list of `{ fromLevel, bonus }`. A Dragoturkey
   carries 300 Vitality from level 100 and 400 from level 200; the single
   value plus single level could not express that. Seemyools and Rhineetles
   have one tier each, so the list is uniform rather than a special case.
2. **The capture spell is corrected** to « Apprivoisement de monture » from the
   « Dressage de Monture » that had shipped. Both pages name it independently.
3. **The wild-mount level conflict is left unresolved and documented.** The
   dedicated Dragoturkey page and the phase 1 brief both give 62-70; the
   breeder guide says 60. The shipped value stands.

**Consequences:** The tier list is the honest shape — the game grants some
species bonuses in steps, and flattening that was losing information rather
than simplifying. The detail panel lists one line per tier, which reads the
same for a one-tier species as the old sentence did.

On the conflict: the sourcing rule says data is never repaired by guesswork,
and picking the more convenient of two disagreeing sources is guesswork wearing
a better hat. Two independent sources give 62-70 and the odd figure sits on the
same page as a distinct level-60 *equip* requirement, which is a plausible
conflation — but plausible is not verified, so it is recorded in `docs/DATA.md`
for someone to settle in game.

A process note worth keeping: the first pass over these pages was read through
a summarising model and visibly glossed sections it did not have room for.
Every claim that became data here was re-read verbatim first, and the one
figure still resting only on the summary — mounts per enclos — was deliberately
left out. Fetched prose is a lead, not a source.

`src/data/speciesInfo.test.ts` pins all three corrections, including asserting
the wrong spell name cannot come back.

---

## 2026-08-19 — Reproducteur doubles births; the second baby is assumed independent

**Context:** The Reproducteur capacity gives a second baby from one mating, and
works on either parent. The sources are explicit about that and silent about
how the second baby's colour is decided.

**Decision:** Model it as `birthsPerMating`, and treat each baby as an
independent roll at the target-generation probability, so a mating is worth
`p * births` successes for the same two parents. Off by default, since it is a
5% roll from an Animakina and assuming it would quietly halve every plan for
the players who do not have it. Listed as a fifth entry in the UI's assumptions
disclosure.

`RecipeChoice.chance` and `PlannedPair.chance` were renamed to
`successesPerMating` in the same change.

**Consequences:** The rename is the honest part. With the capacity the quantity
reaches 1.4 at the default settings and 2 at `p = 1` — calling a number above 1
a "chance" would be wrong, and the field is what the plan divides by, so the
name is load-bearing rather than cosmetic. Nothing outside `core/` read it.

If the two babies turn out to be linked rather than independent, plans with the
capacity on are optimistic. That is stated in the disclosure rather than buried:
the planner's other four assumptions are each recorded the same way, and the
honest position is that this is the one we have the least source for.

A pleasing structural echo: at `p = 1` the ratio driving recipe cost is
`f / births`, so cloning (halving `f`) and Reproducteur (doubling `births`)
reach the same degenerate 0.5 where every recipe ties and depth costs nothing.
Both are pinned by tests.

---

## 2026-08-19 — Capture nets change trips, not counts; the AoE nets are not modelled

**Context:** Four capture nets exist. The multiplier net (Breeder 100+)
duplicates whatever it catches. The two reinforced nets take every wild mount
in a radius-3 zone.

**Decision:** Model the multiplier net only, and model it as a *reporting*
concern: `BreedingPlan.captureFights` divides each colour's safe count by the
net's yield and rounds up per colour. The mount counts, the matings and the
recipe ranking are all untouched. The reinforced nets are absent.

**Consequences:** Rounding per colour rather than over the total is the detail
that makes the number true — you catch one colour at a time, so a plan wanting
2 Almond, 1 Golden and 1 Ginger is three trips with a multiplier net, not two.
The duplicate only pays where two of the same colour are wanted.

Keeping it out of the cost model was deliberate. A uniform divisor on every
leaf could not move the ranking, so putting it there would buy nothing and
would place a display choice inside the maths.

The reinforced nets are left out because their yield depends on how many wild
mounts happen to be in the zone. There is no sourced occupancy figure, and
inventing one is what `docs/DATA.md`'s sourcing rule forbids — the same reason
the wild-mount level conflict was left unresolved rather than decided.

---

## 2026-08-19 — The tree turns top-to-bottom, wraps wide generations, and the wheel scrolls

**Context:** Rudy asked for the tree to be more manoeuvrable: turned to run top
to bottom from generation 1, with the wheel scrolling rather than zooming and
zoom moved onto a modifier or the buttons.

**Decision:** All three, plus two consequences that only appeared once they were
built: generations wider than 12 wrap onto sub-rows, and the view opens
width-fitted at the top with a legible-zoom floor instead of fitting both axes.

**Consequences:** The rotation alone would have made things worse for the two
species it matters most for. Their widest generation holds 50 colours, so
turning the tree put them at 8660px wide — about eleven screens, on exactly the
axis the wheel had just stopped scrolling. Wrapping at 12 brings Seemyool to
2144 × 1630, which is a column you scroll. The two changes only work together;
either alone is a regression.

Fitting both axes had to go for the same reason. At full extent the tree sits
around 22% zoom, where a 12px label is unreadable — a diagram of nothing. The
view now behaves like a document opening at page one.

The wheel change exposed a live bug rather than causing one. React registers
`wheel` and `touchmove` as passive listeners, so the existing `preventDefault()`
had always been failing and logging; zoom still worked, so nothing looked
broken, but the page had been scrolling behind the tree on every gesture since
phase 1. Both handlers are now attached natively with `{ passive: false }`.

Binding zoom to Shift as well as Ctrl was Rudy's call and costs the conventional
Shift-as-horizontal-scroll. Horizontal panning stays available by drag, and a
trackpad's horizontal swipe still works through `deltaX`.

---

## 2026-08-19 — Mount art is drawn here, not borrowed

**Context:** Rudy asked for representations of the mounts, pointing at community
pages that show them. Those pages display Ankama's game sprites.

**Decision:** Draw an original silhouette from SVG primitives
(`MountSilhouette.tsx`), tinted from the existing swatch palette — flat for a
monocolor, split hard down the middle for a bicolor, matching how the node
swatch already reads. No sprite is copied, embedded, or hotlinked.

**Consequences:** This is the project's existing policy applied, not a new one:
`README.md` has said "no Ankama assets, no ripped sprites" since phase 1, and
the site is public, so hosting or hotlinking someone else's game art is not
ours to do. Hotlinking would not have helped — it is still redistribution, and
it would take another site's bandwidth.

One shape serves all three species. It reads as "a mount" rather than as a
Dragoturkey, which is honest about what it is: a colour swatch with a body, not
a portrait. Per-species shapes are more drawing, not a different decision.

Wiring it up surfaced a bug that had shipped with phase 3: `palette.ts` was
keyed by bare Dragoturkey ids, so every prefixed id missed and **240 of the 306
colours rendered with a `#666` fallback** — every Seemyool and Rhineetle node
was grey. The lookup now strips the species prefix, and the eight colour names
only the new species carry were added. The palette stays explicitly decorative
and is not game data.

---

## 2026-08-19 — Test the pure logic that broke, not the components

**Context:** Every bug this project has shipped lived in the same place. A
swatch lookup keyed by bare Dragoturkey ids greyed out 240 of 306 colours; zoom
scaled about the transform origin and drifted; a ref dereferenced inside a
`setState` updater unmounted the tree mid-drag; an SVG sized `h-full` inside a
`min-height`-only parent collapsed to 150px on a phone. There were 188 tests at
the time and not one touched `src/components/`, `src/pages/` or `src/hooks/`.

**Decision:** Add unit tests for the pure modules that happen to live under
`components/` — `layout.ts`, `palette.ts` — plus `names.ts` and `search.ts`.
No DOM test environment.

**Consequences:** The honest scorecard is that this catches one of those four
bugs outright (the grey swatches, as a property over all 306 colours) and would
catch the layout collapse only if it had been a maths error rather than a CSS
one. That is still the best available trade: those modules never needed a DOM,
they were untested because of their folder, and the tests cost nothing to run.

happy-dom or `@testing-library/react` was considered and declined. It would
cover component conditionals, but it would have caught **none** of the four:
it reports zero-sized boxes, so every layout-dependent path degrades to a
fallback, and it models neither passive listeners nor pointer capture. It also
drags i18next's initialisation into every test. Revisit if a second contributor
appears.

The remaining two bugs point elsewhere, and it is worth being clear about it:
the crash was flagged by a lint warning that was waved through as pre-existing
style noise, and the passive-listener failure is only observable in a real
browser. Those are a policy question and a browser question, not test-coverage
questions.

Writing the tests immediately paid for itself twice: `computeTreeLayout` had no
guard against a non-finite row cap (`Math.max(1, NaN)` is `NaN`, which would
have placed every node at `NaN`), and the docs quoted the Seemyool canvas as
2124 × 1630 when it is 2144 — a number taken from node positions, which stop
20px short of the canvas edge because `COLUMN_WIDTH` exceeds `NODE_WIDTH`.

---

## 2026-08-19 — The tree fits its pane, on every screen

**Context:** At 375px the tree was unusable: the container asked for 420px of
height but the `<svg className="h-full">` inside it resolved `height: 100%`
against a parent whose `height` was `auto` (only `min-height` was set), so it
fell back to the CSS default replaced-element box of 300×150. Six of 66 colours
were visible, and zooming fully out still showed six, because the canvas was
2144px wide against a 341px viewport.

**Decision:** Three changes that only work together. The SVG is positioned
`absolute inset-0` inside its already-`relative` container, so it has a
definite box. The row cap became a parameter that `BreedingTree` derives from
the measured container width. And the opening view lets a fitting scale beat
the readability floor when the two are close.

**Consequences:** The tree now fits its pane horizontally on every screen and
scrolls only vertically — which is the axis the wheel was rebound to, so the
two decisions finally agree. A phone gets 2 columns at 0.79 zoom with the width
fitting; a 786px desktop pane gets 5.

That desktop number is a visible change: it used to be 12 columns and 2144px,
needing a horizontal drag. Fitting the pane is the more coherent rule, but it
does make a generation of 19 colours span four sub-rows rather than two, so the
generation structure reads less immediately than it did. Worth revisiting if it
proves annoying in use.

Measuring the container turned out to need three triggers — an immediate read,
an animation frame, and a `ResizeObserver` — because the immediate read races
the flex layout it depends on. A one-shot read pinned the desktop tree to one
colour per row.

---

## 2026-08-19 — Search folds accents

**Context:** `matchesSearch` lowercased but did not normalise, so on the live
site "ebene" matched nothing while "Ébène" matched eleven colours. The same
held for "emeraude" and "doree". Most French colour names carry an accent and
almost nobody types them, least of all on a phone.

**Decision:** Normalise to NFD and strip `\p{Diacritic}` on both the needle and
the names.

**Consequences:** The search box now works the way a French player would type.
`src/data/species.ts` already sorted accent-insensitively via `localeCompare`
with `sensitivity: 'base'`, so this is the established intent applied to
matching rather than a new one.

Pinned by `search.test.ts` with the exact strings that failed. The tests were
written first, against the old behaviour, so the fix landed as a visible
red-to-green diff rather than as an unverifiable claim.
