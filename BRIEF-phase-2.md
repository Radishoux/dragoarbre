# Project Brief - Dragoarbre (Phase 2: Breeding Planner)

Phase 1 shipped and is live. This brief runs in the existing repository. Before writing any code: read CLAUDE.md, docs/ARCHITECTURE.md, docs/DATA.md and the existing `src/core` and data modules, and respect every convention already in place. Follow ORCHESTRATION.md for parallel agents and TASKS.md tracking. Phase 1 must not regress: all existing tests stay green.

## 1. The feature

The Breeding Planner (the "shopping list"). The user picks a target mount color and a quantity, and Dragoarbre computes recursively everything needed to get there: how many matings of which pairs, how many mounts of each intermediate color, and how many generation 1 wild captures of each base color, all derived from the real Dofus 3.5 target-generation probability system. The plan is driven by user-controlled assumptions (parent level, Optimakina, Almanax bonus, cloning) so the numbers update live.

This is the phase the architecture was designed for: the data graph and the breeding constants from phase 1 are consumed by a new pure computation module.

## 2. The math model

### Success probability of one mating

Under the clean-genealogy assumption (defined in section 3), the probability that a mating of the two exact recipe parents produces the desired child is the target-generation probability:

```
p = min(1, 0.30 + 0.0015 * (levelA + levelB) + (optimakina ? 0.10 : 0) + (takeza ? 0.20 : 0))
```

Plan-level settings (applied to every mating in the plan): one parent level value 1..200 used for both parents of every pair (default 100), Optimakina on/off (default on), Almanax Takeza bonus on/off (default off), cloning on/off (default on).

Expected matings to obtain q desired children of a color: `M = q / p`.

### Recursion

```
plan(color X, quantity q):
  if X is generation 1:
    captures[X] += q
  else:
    M = q / p
    matings[recipe(X)] += M
    f = cloning ? 0.5 : 1
    for each parent P of X:
      plan(P, M * f)
```

The cloning factor: each mating consumes two fertile parents which become sterile; cloning the two spent parents returns one fertile mount, randomly one of the two colors. Amortized over a plan this nets out to 0.5 consumed per parent color per mating instead of 1.

All engine values are exact real numbers (expectations). The UI layer handles rounding: show expected values with one decimal, plus a "safe count" column using ceil at each color.

### Outputs of the engine

For a given target and settings: p and expected matings per attempt, captures per generation 1 color, mounts needed per color, matings per recipe pair, total matings, and a flag `guaranteed` when p equals 1 (then all numbers are exact integers, not expectations).

## 3. Modeling assumptions (state them, do not hide them)

These four assumptions are deliberate simplifications. Record each as an entry in docs/DECISIONS.md and surface them to the user in a collapsible "Assumptions" note on the planner page (bilingual):

1. Clean genealogy: every mating uses parents whose own colors are exactly the recipe and whose family trees do not introduce competing target-generation outcomes. Then the desired child is the only target-generation possibility and its probability is p. This matches how players actually farm a line.
2. Failed births are not salvaged: a failed mating still produces some other mount (usually lower generation) that a real player can often reuse elsewhere in the plan. The planner ignores this, so it is a conservative (slightly pessimistic) estimate.
3. Genders are ignored: the model assumes males and females pair up as needed. Real captures may require a small buffer since gender at birth and capture is random.
4. Cloning is amortized: the 0.5 factor is the large-plan expectation. For very small plans it is slightly optimistic; the "safe count" ceil column compensates in practice.

Numbers are expectations, not guarantees, except when p = 100%.

## 4. UX spec

- New "Planner" page, reachable from the main navigation, plus a "Plan this mount" button in the phase 1 detail panel that opens the planner with that color preselected.
- Inputs: target color (searchable selector, both languages), quantity (default 1), parent level slider 1..200, Optimakina toggle, Takeza toggle, Cloning toggle.
- Prominent display of p as a percentage and expected matings per attempt (1/p), with a clear "Guaranteed" badge state when p reaches 100% (two level 200 parents plus Optimakina).
- Results: summary cards (total wild captures per base color, total matings), a per-generation breakdown table (color, expected count, safe count, matings), and an annotated plan tree: reuse the phase 1 tree rendering restricted to the target's ancestry, with quantity badges on each node. Keep it pan/zoomable and touch friendly.
- Plan state (target, quantity, settings) encoded in the URL query within the hash route, so a plan can be bookmarked and shared. Loading a shared URL restores the exact plan.
- Everything bilingual through the existing i18n setup, no hardcoded strings. Number formatting respects the active locale.

## 5. Engineering requirements

- New module `src/core/planner.ts` (or consistent with existing structure): pure functions, no React imports, consuming the existing data graph and breeding constants. Full TSDoc with the formulas on every exported function.
- Do not modify the game data files. Do not refactor phase 1 beyond what integration strictly requires.
- Tests with bun test, including these exact vectors:
  - p at levels 1+1, no bonuses: 0.303. At 200+200: 0.90. At 200+200 plus Optimakina: capped at 1. At 100+100 plus Optimakina: 0.70. Takeza adds 0.20 before the cap.
  - Target 1 Indigo, p = 1, cloning off: 3 total matings; captures Amande 2, Doree 1, Rousse 1.
  - Target 1 Indigo, p = 1, cloning on: 2 total matings; captures Amande 1.0 expected (0.5 + 0.25 + 0.25), Doree 0.25, Rousse 0.25; safe counts ceil correctly.
  - A generation 1 target returns pure capture with zero matings.
  - The planner runs without error for all 66 colors; deeper targets never require fewer resources than their own parents; increasing p never increases any count; enabling cloning never increases any count.
- Suggested agent split per ORCHESTRATION.md: one agent on the core engine and its tests, one on the planner page UI, one on the tree annotation and the detail-panel integration, one on i18n content and documentation. Adapt as the lead sees fit.

## 6. Documentation updates (same commit as the code, per the sync rule)

- docs/ARCHITECTURE.md: a Planner section with the formulas, the recursion, and a Mermaid diagram of the plan computation flow.
- docs/DECISIONS.md: one entry per assumption from section 3, plus any implementation decision worth recording. Append, never rewrite.
- docs/OVERVIEW.md: user-level explanation of the planner and how to read its numbers.
- README.md: feature list and screenshot placeholder updated.
- CLAUDE.md: roadmap updated (phase 2 done, phase 3 Seemyools and Rhineetles next).

## 7. Optional stretch goal (only if everything above is done and green)

Estimated Genetokens (FR: genetons) earned by executing the plan. Rule: a mating awards tokens only when the baby's generation exceeds every generation present in both parents' trees, which is true for every successful mating of a clean plan and false for failures. Award per successful mating: the sum of the two parents' generation values from this table: gen 1 = 1, gen 2 = 2, gen 3 = 4, gen 4 = 8, gen 5 = 15, gen 6 = 30, gen 7 = 60, gen 8 = 120, gen 9 = 250. Expected total = sum over recipe pairs of (successes for that pair) x (value(genA) + value(genB)). Skip this entirely if time is short.

## 8. Definition of done for phase 2

- All phase 1 tests plus the new planner tests pass; lint and build clean.
- The planner produces correct numbers for the test vectors and works for all 66 colors in both languages.
- Shared plan URLs restore state correctly.
- Documentation set updated and accurate against the shipped code.
- Deployed to GitHub Pages via CI and verified live.

---

## Implementation notes (added after the fact)

Two items in section 5 could not be implemented as literally written. Both are
recorded in full in `docs/DECISIONS.md`, and each is pinned by a test.

1. **The Indigo cloning-on vector is arithmetically inconsistent.** It asks for
   Amande 1.0 "(0.5 + 0.25 + 0.25)". Indigo = Amande-et-Dorée x Amande-et-Rousse,
   and each of those is Amande x (Dorée | Rousse). With the `f = 0.5` factor from
   section 2 compounding at each level, both generation-2 parents are needed 0.5
   times, so each of *their* parents is needed 0.25 times. Amande sits at exactly
   two leaves, giving 0.25 + 0.25 = **0.5**. The brief's own Dorée = 0.25,
   Rousse = 0.25 and 2 total matings all confirm the compounding model, and no
   consistent model yields Amande 1.0 alongside them. The normative pseudocode in
   section 2 was implemented.

2. **"Deeper targets never require fewer resources than their own parents" holds
   only without cloning.** With cloning enabled it is false for 30 of the 63
   crosses: Pourpre-et-Rousse (gen 6) costs 2.5 matings while Pourpre (gen 5)
   alone costs 3, because cloning refunds half the expensive Pourpre the mating
   spent while Rousse is a free wild capture. That is assumption 4 of section 3
   surfacing structurally, not a defect. The property is asserted for
   cloning-off configurations, and the counterexample is pinned separately.

`ORCHESTRATION.md` and `TASKS.md`, referenced in the preamble and section 5, do
not exist in this repository. The work was tracked with the session task list and
split across parallel agents along the lines section 5 suggests.
