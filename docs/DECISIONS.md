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
