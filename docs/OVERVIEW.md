# Overview

What Dragoarbre is, the problem it solves, the domain it covers (for a
reader who has never played Dofus), how each screen works, and the phase
roadmap.

## The problem

Dofus players who want a specific mount color have to breed their way
there through a fixed, multi-generation family tree — and that tree is
large, branching, and easy to get lost in without a reference. Dragoarbre
is that reference: a visual map of every color, how to get it, and what it
leads to.

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

### How breeding works (`/how-breeding-works`)

A prose explainer of the mechanics summarized above: mating and fecundity
gauges, cloning, genealogy limits (a mount's family tree is only tracked
back to its grandparents), the target-generation probability formula, and
why the "which non-target color do I get instead" question is answered
qualitatively rather than with invented numbers. Bilingual, written for
both new players and as a technical reference for phase 2.

### Header

App name, main nav (tree / how-it-works), the species tabs (Dragoturkeys
active; Seemyools and Rhineetles visible but disabled, "coming soon"), and
the FR/EN language switcher (persisted in `localStorage`, seeded from the
browser's language on first visit).

## Breeding mechanics, briefly

A mating's baby has a **base 30% chance** of being the "target
generation" — the highest generation reachable from the two parents'
colors — **plus 0.15% per mount level summed across both parents**, plus a
flat **+10%** if an Optimakina consumable is used, capped at 100% (with a
once-a-year +20% Almanax bonus on top of that cap logic). For Dragoturkeys
specifically, reaching the target generation means only one color is
possible (since every color has exactly one recipe) — no further split
needed. This exact formula is implemented and tested in
`src/core/breeding.ts`; see `docs/ARCHITECTURE.md` for how it's wired up
and `docs/DECISIONS.md` for why only this part — not the residual
distribution across non-target colors — is modeled as exact math.

## Phase roadmap

- **Phase 1 (this phase):** the interactive breeding tree described above,
  for Dragoturkeys only.
- **Phase 2 — shopping-list planner:** pick a target color; the app
  recursively walks its cross tree and computes, using the probability
  math above, how many mounts of each lower generation you're expected to
  need to reach it. Everything phase 2 needs from the data and math layers
  already exists (`src/data`, `src/core/breeding.ts`) — phase 2 is
  primarily a new UI flow on top of them.
- **Phase 3 — Seemyools and Rhineetles:** the two other mount species. Their
  data is not in this repo yet and must never be fabricated to fill the
  disabled tabs — see `docs/DATA.md`'s checklist for adding a species.
