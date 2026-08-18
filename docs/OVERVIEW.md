# Overview

What Dragoarbre is, the problem it solves, the domain it covers (for a
reader who has never played Dofus), how each screen works, and the phase
roadmap.

## The problem

Dofus players who want a specific mount color have to breed their way
there through a fixed, multi-generation family tree — and that tree is
large, branching, and easy to get lost in without a reference. Dragoarbre
is that reference: a visual map of every color, how to get it, and what it
leads to — plus a planner that turns "how do I get it" into "how much will
it cost me".

## The domain, for a non-player

- **Dragoturkey (Dragodinde)** is one of several mount species in the game
  Dofus. It comes in **66 distinct colors**, organized into **10
  generations**.
- **Generation 1** colors (3 of them: Almond, Golden, Ginger) are caught in
  the wild. Every other color, generations 2 through 10, is obtained only
  by **breeding** — crossing two specific parent colors together.
- Each non-generation-1 color has **exactly one possible cross** (this is
  specific to Dragoturkeys — the two other species due in phase 3 work
  differently). So the whole dataset forms a strict DAG: every color
  traces a unique lineage back to one or more of the three generation-1
  roots.
- Generations alternate in kind: odd generations (1, 3, 5, 7, 9) are
  **mono-color**, even generations (2, 4, 6, 8, 10) are **bicolor** —
  literally named after their two parent colors (e.g. "Almond and Ginger").
- Beyond looks, every color grants a **stat bonus** (Initiative, Chance,
  Critical, etc.) on top of the flat Vitality every Dragoturkey gives.
- Breeding itself is probabilistic: mating two parent mounts has a chance
  — not a certainty — of producing the specific color you're after. That
  chance is a documented formula (see "Breeding mechanics" below and
  `docs/ARCHITECTURE.md` for the implementation) that depends on parent
  levels and a couple of optional boosts.
- Two further mount species, **Seemyool (Muldo)** and **Rhineetle
  (Volkorne)**, exist in the game with their own breeding trees — out of
  scope for phase 1, see the roadmap below.

## How each screen works

### Breeding tree (`/`)

The core screen. Ten columns, one per generation, each node a color.
Edges connect a color to the two parents it was crossed from. Because the
graph is dense in the middle generations, the tree supports pan and pinch-
zoom (mouse drag + wheel on desktop, touch-drag + pinch on mobile), plus
explicit zoom buttons for precision.

Clicking or tapping a node **selects** it: its full lineage back to
generation 1 lights up, everything else dims — the same interaction
pattern as a game skill tree. A legend explains the mono/bicolor and
selection/lineage visual states.

Alongside the tree, the **detail panel** (a side panel on desktop, a
drawer-style panel on mobile) shows the selected color's name, generation,
bonuses, exact cross (or wild-capture info for generation 1), and the list
of colors it can produce as a parent — each of those is itself clickable,
so the detail panel doubles as a way to walk the tree without touching the
canvas.

**Search and filters** sit above the tree: a name search that matches
against both FR and EN names regardless of the active UI language, plus
filters by generation and by bonus stat. Matches stay in place in the tree
(non-matches dim), so the tree's structure is never disrupted by filtering.

The **special mounts** section (Armored and Feathered Dragoturkeys) sits
below the tree — bought, not bred, explicitly outside the breeding DAG.

### Breeding planner (`/planner`)

The tree answers "what do I cross to get this color?". The planner answers
the question that comes straight after it: **"and what is that actually
going to cost me?"**

You pick a target color (searchable by FR or EN name, like the tree) and
how many you want. Then you describe your breeding conditions: the level
of your parent mounts, whether you use an Optimakina, whether it's the
once-a-year Almanax Takeza day, and whether you clone your spent parents.
From that the planner walks the whole cross tree from your target back to
the three wild base colors and reports every mating and every capture
along the way. You can also arrive here pre-filled: the tree's detail
panel has a **"Plan this mount"** button on every color.

**How to read the numbers.**

- **Success chance** is the probability that one mating produces a baby of
  the generation you're after — which, for Dragoturkeys, means the exact
  color you're after, since every color has exactly one recipe. Everything
  else is derived from it: **matings per baby** is simply `1 / chance`, so
  a 70% chance means about 1.43 matings for each baby you want.
- **Expected** is the long-run average number of mounts of a color a plan
  of this shape consumes. **Safe** is that number rounded up — what you'd
  actually go and farm, since you cannot own two thirds of a Dragoturkey.
  Read *expected* to compare plans, and *safe* to pack your bags.
- **Fractional mounts are not a rounding bug.** They come from cloning:
  when you clone the two spent parents of a mating, you get back one
  fertile mount that is randomly one of their two colors — half of one, on
  average, and half of the other. So a mating that consumes one Almond and
  gets it back half the time really does cost half an Almond on average.
  Numbers like 0.25 are shares, not mounts.
- **Wild captures** are the bottom line of any plan: the generation-1
  colors (Almond, Golden, Ginger) you have to go out and catch, because
  they are the only ones that cannot be bred.
- **Genetokens** is what the plan pays you back — a breeding currency
  awarded when a baby outclasses everything in its parents' family trees,
  which is true of every successful mating in a clean plan.
- The **breakdown by generation** lists every color the plan touches, and
  the **plan tree** shows the same thing as a picture: the phase 1 tree,
  narrowed to your target's ancestry, with a quantity badge on every node.

**The Guaranteed badge** appears when the success chance reaches 100% —
two level-200 parents with an Optimakina, for instance. It means no mating
can be wasted, so the plan's mating counts stop being averages and become
exact. It does not make the whole plan deterministic: which color a clone
comes back as is still a coin flip, and gender is still random.

**These are expectations, not promises.** Every number outside a
Guaranteed plan is an average over many attempts, and a real run can land
either side of it — sometimes badly. The planner is also deliberately
simplified in four ways it states openly in its own Assumptions note: it
assumes clean parent lineages, it throws away the mounts that failed
matings still produce (which makes it pessimistic), it ignores gender
(which makes it optimistic), and it treats cloning as its long-run average
(optimistic on small plans). Use it to compare two targets, to decide
whether a color is worth the grind, and to know what to stock up on —
not as a receipt for what the game owes you. `docs/DECISIONS.md` records
each assumption and why it was made.

### How breeding works (`/how-breeding-works`)

A prose explainer of the mechanics summarized above: mating and fecundity
gauges, cloning, genealogy limits (a mount's family tree is only tracked
back to its grandparents), the target-generation probability formula, and
why the "which non-target color do I get instead" question is answered
qualitatively rather than with invented numbers. Bilingual, written for
both new players and as a technical reference for phase 2.

### Header

App name, main nav (tree, planner, how-it-works), the three species tabs —
all live since phase 3 — and the FR/EN language switcher (persisted in
`localStorage`, seeded from the browser's language on first visit).

The selected species is a URL concern, not component state: it rides in the
same `?species=` parameter the planner uses, so a pasted link restores the tab
and the tabs, the tree and the planner cannot disagree. Switching species
deliberately drops the rest of the query — a target colour belongs to exactly
one species, so carrying it across would build a plan the new tab cannot show.

## Breeding mechanics, briefly

A mating's baby has a **base 30% chance** of being the "target
generation" — the highest generation reachable from the two parents'
colors — **plus 0.15% per mount level summed across both parents**, plus a
flat **+10%** if an Optimakina consumable is used, capped at 100% (with a
once-a-year +20% Almanax bonus on top of that cap logic). For Dragoturkeys,
reaching the target generation means only one colour is possible, since every
colour has exactly one recipe — no further split needed. The two later species
have up to 12 recipes for a single colour, so phase 3 generalised this: if one
parent pair could produce `k` different colours of the target generation, the
pool splits and the effective chance is `p / k`. In the data as transcribed
`k` is 1 everywhere, and a test asserts it stays that way. This exact formula
is implemented and tested in
`src/core/breeding.ts`, and the planner is built entirely on top of it;
see `docs/ARCHITECTURE.md` for how it's wired up and `docs/DECISIONS.md`
for why only this part — not the residual distribution across non-target
colors — is modeled as exact math.

## Phase roadmap

- **Phase 1 — breeding tree (done):** the interactive tree described
  above, for Dragoturkeys only.
- **Phase 2 — shopping-list planner (done):** pick a target color and the
  app walks its cross tree, computing with the probability math above how
  many matings, mounts and wild captures you're expected to need. It
  needed no new game data — only `src/core/planner.ts` on top of the
  existing data and math layers, plus the `/planner` screen described
  above. Genetokens (a stretch goal in the brief) shipped with it.
- **Phase 3 — Seemyools and Rhineetles (done):** the two other mount
  species, taking the app from 66 colours to **306**. Not a data drop: they
  breed differently, and the planner's "one recipe per colour" assumption had
  to go. A colour can now have up to 12 recipes, so the planner ranks them by
  the total wild captures their full plan costs and breeds through the
  cheapest; the tree draws that recipe's edges by default with a per-node
  toggle to reveal the rest, and the detail panel lists every recipe with its
  price. The target-generation split rule was generalised at the same time.
  Each new species is declared as its 15 monocolors, with the other 105
  derived — see `docs/DATA.md`.

- **Phase 4 — setup, navigation and art (done):** two more planner levers, both
  off by default so no shared link changed — the **Reproducteur** capacity
  (two babies per mating, which roughly halves a plan) and the **multiplier
  capture net**, which reports capture *trips* alongside mounts. The breeding
  tree was turned to run top to bottom from generation 1, with the wheel
  scrolling and Ctrl/Shift zooming, and generations wider than twelve wrapping
  so the two 120-colour species stay a column you scroll rather than a strip
  eleven screens wide. Every colour now carries an original mount silhouette
  tinted with its own swatch. Phase 4 also corrected the species data against
  two community sources: the Dragoturkey vitality bonus is tiered (300 at level
  100, 400 at 200), the capture spell is « Apprivoisement de monture », and the
  two sources disagree on wild-mount level — recorded rather than resolved.

### Ideas, not commitments

Nothing below is planned or promised; they are the directions that looked
worth noting while phase 3 was being built.

- **Per-generation level overrides in the planner.** One parent level currently
  applies to every mating. Real lines are levelled unevenly, and early
  generations are often left low.
- **A Monte Carlo confidence mode.** Every count the planner reports is an
  expectation. Sampling the plan would turn "3.6 captures" into "you want 5 to
  be 90% sure", which is closer to the question a player is actually asking —
  the `safe` column is a crude stand-in for it today.
- **Time, not just counts.** The gauge and paddock mechanics are documented
  well enough to estimate how long a plan takes in real hours, which is the
  obvious next question after "how many".
- **Per-species mount silhouettes.** One shape currently serves all three; it
  reads as "a mount" rather than as a Dragoturkey, a Muldo or a Volkorne.
