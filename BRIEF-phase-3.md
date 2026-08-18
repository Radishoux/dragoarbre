# Project Brief - Dragoarbre (Phase 3: Seemyools and Rhineetles)

This brief runs in the existing repository. Before writing any code: read CLAUDE.md, the docs/ folder and the existing core modules, and respect every convention in place. Follow ORCHESTRATION.md (see step 0). All existing tests stay green throughout.

## 0. Housekeeping before any feature work

1. ORCHESTRATION.md is provided alongside this brief but was missing from the repository during phases 1 and 2. Commit it at the repository root. From now on the lead creates and maintains TASKS.md exactly as that protocol describes, committed together with the work it tracks.
2. Ratification of the phase 2 deviations: both judgment calls made during phase 2 were correct and are now canonical. The phase 2 brief contained an arithmetic error by its author in the Indigo cloning-on vector: the parenthetical (0.5 + 0.25 + 0.25) wrongly added the 0.5 expected quantity of the Amande et Doree parent (a generation 2 mount) into the Amande capture count. The correct expected Almond captures are 0.5, as shipped. The monotonicity property is likewise genuinely false with cloning on, because the 0.5 consumption factor halves upstream demand at each recursion level, so a deeper target can require fewer captures of a given color than its own parent does; scoping the assertion to cloning-off with a pinned counterexample is the intended behavior. Do not revert either. Make sure DECISIONS.md records both as confirmed by the brief author, not as open questions.

## 1. Scope of phase 3

Full support for the two remaining species: Seemyools (FR: Muldos) and Rhineetles (FR: Volkornes). Both species tabs become live, with everything Dragoturkeys already have: breeding tree, detail panel, search and filters, the planner, full FR/EN i18n, and documentation. The complete datasets are in this brief (sections 4 and 5). As always, never invent or scrape data beyond what is provided here.

After this phase the app covers 66 + 120 + 120 = 306 mount colors.

## 2. Data model evolution: multiple recipes per color

Dragoturkeys have exactly one cross per color. Seemyools and Rhineetles do not: their odd-generation monocolors can each be produced by several different parent pairs (up to 12). Evolve the data model accordingly:

- Replace the single `cross?: [string, string]` with `crosses?: Array<[string, string]>` (or equivalent consistent with the codebase). Dragoturkey colors migrate to single-element arrays. Generation 1 colors still have no crosses and `wildCapture: true`.
- Every consumer (tree, detail panel, planner, tests) handles the array. Dragoturkey behavior must remain byte-identical; keep the existing planner test vectors as regression tests.

## 3. Universal structure rules (verified against the source data)

These rules hold for all three species and make the even generations fully derivable:

- Colors are either monocolors or bicolors. The bicolor set is exactly every unordered pair of two distinct monocolors of the species.
- generation(bicolor {A, B}) = max(generation(A), generation(B)) + 1.
- crosses(bicolor {A, B}) = [[A, B]] (the two monocolors, one recipe).
- bonuses(bicolor {A, B}) = species common bonus + bicolorComponent(A) + bicolorComponent(B), using the component values from the mono tables below.

Only the odd-generation monocolors are irregular: their recipes are the explicit lists in sections 4 and 5. For Seemyools and Rhineetles you may generate the even-generation entries from these rules or enumerate them in data, your call, but the integrity tests must assert the exact per-generation counts given below either way. Phase 1 Dragoturkey data already satisfies the structural rules (generation and cross); leave its bonus values untouched as they are the phase 1 source of truth, including their known irregularities.

## 4. Seemyool (Muldo) dataset

Species: Muldo (FR) = Seemyool (EN). 120 colors total: 15 monocolors, 105 bicolors. Common bonus on every Seemyool: 1 MP (FR: 1 PM), granted from level 100. Amphibious lore: equippable underwater.

Wild capture (generation 1 only, the five gen 1 monocolors): zone "Bassin des Muldos" in the Sufokia bay. Three accesses: the breeders' workshop of Sufokia at [19,23] (diving suit inside), the Bandit Territory at [15,19] (rowboat then rope), or Sufokia at [22,19] (ladder facing the submarine). Wild Seemyools are level 62 to 70 monsters, max 1000 HP.

Per-generation color counts (integrity test targets): gen 1: 5, gen 2: 10, gen 3: 2, gen 4: 11, gen 5: 2, gen 6: 15, gen 7: 2, gen 8: 19, gen 9: 4, gen 10: 50. Total 120.

### Seemyool monocolors

| Gen | Color (FR) | Color (EN) | Mono bonus (level 200) | Bicolor component |
|---|---|---|---|---|
| 1 | Ebene | Ebony | 18% Resistance Air | 10% Resistance Air |
| 1 | Indigo | Indigo | 18% Resistance Eau | 10% Resistance Eau |
| 1 | Pourpre | Crimson | 18% Resistance Terre | 10% Resistance Terre |
| 1 | Orchidee | Orchid | 18% Resistance Feu | 10% Resistance Feu |
| 1 | Dore | Golden | 70 Puissance | 60 Puissance |
| 3 | Roux | Ginger | 50 Tacle | 40 Tacle |
| 3 | Amande | Almond | 50 Fuite | 40 Fuite |
| 5 | Ivoire | Ivory | 50 Esquive PA | 40 Esquive PA |
| 5 | Turquoise | Turquoise | 50 Esquive PM | 40 Esquive PM |
| 7 | Prune | Plum | 12% Critique | 8% Critique |
| 7 | Emeraude | Emerald | 40 Dommages Critiques | 30 Dommages Critiques |
| 9 | Ambre | Amber | 40 Dommages Terre | 30 Dommages Terre |
| 9 | Corail | Coral | 40 Dommages Feu | 30 Dommages Feu |
| 9 | Azur | Azure | 40 Dommages Eau | 30 Dommages Eau |
| 9 | Aigue-marine | Aquamarine | 40 Dommages Air | 30 Dommages Air |

### Seemyool odd-generation recipes (expand every set into individual pairs in the data)

- Roux (6 recipes): every pair of two distinct bicolors among {Dore et Pourpre, Dore et Indigo, Dore et Ebene, Dore et Orchidee}.
- Amande (3): Indigo et Pourpre + Ebene et Orchidee; Ebene et Pourpre + Indigo et Orchidee; Orchidee et Pourpre + Ebene et Indigo.
- Ivoire (8): Roux et Dore + one of {Ebene et Amande, Indigo et Amande, Orchidee et Amande, Pourpre et Amande}; Roux et Amande + one of {Ebene et Amande, Pourpre et Amande, Indigo et Amande, Orchidee et Amande}.
- Turquoise (8): Dore et Amande + one of {Roux et Ebene, Roux et Orchidee, Roux et Pourpre, Roux et Indigo}; Roux et Amande + one of {Roux et Ebene, Roux et Indigo, Roux et Orchidee, Roux et Pourpre}.
- Prune (4): Ebene et Ivoire + Turquoise et Pourpre; Indigo et Ivoire + Turquoise et Orchidee; Orchidee et Ivoire + Turquoise et Indigo; Pourpre et Ivoire + Turquoise et Ebene.
- Emeraude (8): Turquoise et Ivoire + one of {Turquoise et Dore, Turquoise et Roux, Amande et Ivoire, Dore et Ivoire, Turquoise et Amande}; Turquoise et Amande + one of {Roux et Ivoire, Dore et Ivoire}; Dore et Ivoire + Turquoise et Roux.
- Ambre (5): Pourpre et Emeraude + Roux et Emeraude; Orchidee et Emeraude + Amande et Emeraude; Indigo et Emeraude + Ivoire et Emeraude; Ebene et Emeraude + Turquoise et Emeraude; Dore et Emeraude + Prune et Emeraude.
- Corail (5): Prune et Pourpre + Prune et Roux; Prune et Orchidee + Prune et Amande; Prune et Indigo + Prune et Ivoire; Prune et Ebene + Prune et Turquoise; Prune et Dore + Prune et Emeraude.
- Azur (5): Pourpre et Emeraude + Prune et Roux; Orchidee et Emeraude + Prune et Amande; Indigo et Emeraude + Prune et Ivoire; Ebene et Emeraude + Prune et Turquoise; Dore et Emeraude + Prune et Ivoire.
- Aigue-marine (5): Prune et Pourpre + Roux et Emeraude; Prune et Orchidee + Amande et Emeraude; Prune et Indigo + Ivoire et Emeraude; Prune et Ebene + Turquoise et Emeraude; Prune et Dore + Turquoise et Emeraude.

Note on Azur: the source lists Prune et Ivoire in two of its recipes (the third and the fifth), where symmetry with the sibling colors would suggest Prune et Emeraude in the fifth. Transcribe faithfully as given, and add a data comment flagging it as a possible source irregularity to re-verify in game. The sourcing rule stands: we do not "fix" data by guesswork.

## 5. Rhineetle (Volkorne) dataset

Species: Volkorne (FR) = Rhineetle (EN). 120 colors total: 15 monocolors, 105 bicolors. Common bonus on every Rhineetle: 1 AP (FR: 1 PA), granted from level 100.

Wild capture (generation 1 only, the four gen 1 monocolors): zone "Haras de Brakmar" south of Brakmar, access via the southern exit of Brakmar at [-25,40]. Wild Rhineetles are level 62 to 70 monsters, max 1000 HP.

Per-generation color counts (integrity test targets): gen 1: 4, gen 2: 6, gen 3: 4, gen 4: 22, gen 5: 2, gen 6: 17, gen 7: 1, gen 8: 10, gen 9: 4, gen 10: 50. Total 120. Note the structural quirks: generation 3 introduces four monocolors at once, and generation 7 introduces a single one (Dore).

### Rhineetle monocolors

| Gen | Color (FR) | Color (EN) | Mono bonus (level 200) | Bicolor component |
|---|---|---|---|---|
| 1 | Ebene | Ebony | 90 Agilite | 70 Agilite |
| 1 | Indigo | Indigo | 90 Chance | 70 Chance |
| 1 | Pourpre | Crimson | 90 Force | 70 Force |
| 1 | Orchidee | Orchid | 90 Intelligence | 70 Intelligence |
| 3 | Roux | Ginger | 70 Dommages Poussee | 50 Dommages Poussee |
| 3 | Amande | Almond | 90 Resistances Poussee | 70 Resistances Poussee |
| 3 | Ivoire | Ivory | 40 Retrait PA | 30 Retrait PA |
| 3 | Turquoise | Turquoise | 40 Retrait PM | 30 Retrait PM |
| 5 | Prune | Plum | 60 Resistances Critiques | 45 Resistances Critiques |
| 5 | Emeraude | Emerald | 9% Critique | 7% Critique |
| 7 | Dore | Golden | 250 Vitalite | 200 Vitalite |
| 9 | Jade | Jade | 14% Resistance Terre | 8% Resistance Terre |
| 9 | Rubis | Ruby | 14% Resistance Feu | 8% Resistance Feu |
| 9 | Saphir | Sapphire | 14% Resistance Eau | 8% Resistance Eau |
| 9 | Amethyste | Amethyst | 14% Resistance Air | 8% Resistance Air |

### Rhineetle odd-generation recipes (expand every set into individual pairs in the data)

- Roux (3 recipes): every pair of two distinct bicolors among {Pourpre et Orchidee, Pourpre et Indigo, Pourpre et Ebene}.
- Amande (3): every pair among {Pourpre et Ebene, Indigo et Ebene, Orchidee et Ebene}.
- Ivoire (3): every pair among {Pourpre et Indigo, Orchidee et Indigo, Indigo et Ebene}.
- Turquoise (3): every pair among {Pourpre et Orchidee, Orchidee et Indigo, Orchidee et Ebene}.
- Prune (12): Amande et Roux + one of {Amande et Pourpre, Amande et Orchidee, Amande et Indigo, Amande et Ebene, Amande et Turquoise, Amande et Ivoire, Roux et Pourpre, Roux et Orchidee, Roux et Indigo, Roux et Ebene, Roux et Ivoire, Roux et Turquoise}.
- Emeraude (12): Ivoire et Turquoise + one of {Ivoire et Orchidee, Ivoire et Indigo, Ivoire et Ebene, Ivoire et Pourpre, Amande et Ivoire, Roux et Ivoire, Roux et Turquoise, Turquoise et Orchidee, Turquoise et Pourpre, Turquoise et Indigo, Turquoise et Ebene, Amande et Turquoise}.
- Dore (8): Prune et Pourpre + Emeraude et Roux; Prune et Orchidee + Emeraude et Turquoise; Prune et Indigo + Emeraude et Ivoire; Prune et Ebene + Emeraude et Amande; Prune et Amande + Emeraude et Ebene; Prune et Turquoise + Emeraude et Orchidee; Prune et Roux + Emeraude et Pourpre; Prune et Ivoire + Emeraude et Indigo.
- Jade (2): Dore et Pourpre + Prune et Emeraude; Dore et Prune + Dore et Roux.
- Rubis (2): Dore et Orchidee + Prune et Emeraude; Dore et Prune + Dore et Amande.
- Saphir (2): Dore et Indigo + Prune et Emeraude; Dore et Emeraude + Dore et Turquoise.
- Amethyste (2): Dore et Ebene + Prune et Emeraude; Dore et Emeraude + Dore et Ivoire.

## 6. Stat name additions (FR to EN)

Extend the existing stat mapping: PM = MP, PA = AP, Tacle = Lock, Fuite = Dodge, Esquive PA = AP Parry, Esquive PM = MP Parry, Retrait PA = AP Reduction, Retrait PM = MP Reduction, Dommages Critiques = Critical Damage, Resistances Critiques = Critical Resistance, Dommages Poussee = Pushback Damage, Resistances Poussee = Pushback Resistance, % Resistance Terre/Feu/Eau/Air = % Earth/Fire/Water/Air Resistance, Dommages Terre/Feu/Eau/Air = Earth/Fire/Water/Air Damage. The EN color and stat names follow the established official mapping (confirmed patterns like "Almond and Emerald Seemyool" and "Almond and Crimson Rhineetle"); AP Parry and MP Parry are the expected EN terms for Esquive PA/PM but flag them with a verify comment in the data. All name strings stay in the data layer so corrections remain trivial.

## 7. Planner extensions

- Recipe selection for multi-recipe colors: when a planned color has several recipes, the engine chooses, per color, the recipe that minimizes the total expected number of wild captures of its full recursive plan (memoized computation over the DAG; the graph is acyclic since crosses always reference strictly lower generations). Tie-break deterministically (lexicographic on the pair of color ids). The chosen recipe is surfaced in the plan output and in the UI, with the alternatives listed in the detail panel.
- Generic target-split rule: if one exact parent pair appears in the recipe lists of k different colors of the same target generation, the target-generation probability pool is split, so the effective probability for the desired color is p / k. In the transcribed data every pair maps to a single color (k = 1 everywhere), but implement the rule generically and add an integrity test that detects and reports any pair collision, so a future data correction cannot silently break the math.
- Dragoturkey planner behavior is unchanged: all existing vectors pass as-is.

## 8. UI

- Species tabs fully live with the species common bonus displayed (400 Vitality / 1 MP / 1 AP) and per-species wild capture info in the detail panel of generation 1 colors.
- Trees for the two new species: 120 nodes each and multi-recipe odd generations make them denser than the Dragoturkey tree. Design call is yours, but a sensible default: show one recipe's edges per color by default (the planner's cheapest recipe) with an affordance on a selected node to reveal all its recipes; the detail panel always lists every recipe. Lineage highlighting follows the cheapest-recipe path by default. Keep pan and zoom smooth on mobile at 120 nodes.
- Planner works for every color of the three species; shared plan URLs include the species.

## 9. Tests

- Per-generation counts and totals for both new species exactly as stated in sections 4 and 5; grand total 306 colors across the app.
- Every recipe references existing colors of strictly lower generations; bicolor structure conforms to the universal rules of section 3 (all mono pairs present, generation = max + 1, bonuses match the component tables for the two new species).
- Odd-generation recipe counts per color: Seemyool 6/3/8/8/4/8/5/5/5/5, Rhineetle 3/3/3/3/12/12/8/2/2/2/2.
- Pair-collision detector reports zero collisions on current data; the split rule itself is unit-tested with a synthetic collision.
- Cheapest-recipe selection is deterministic and covered by at least one test on a multi-recipe color; planner runs without error for all 306 colors; Dragoturkey regression vectors unchanged.

## 10. Documentation updates (same commit as the code)

- docs/DATA.md: new species sections following its own phase 3 checklist, including the derivation rules of section 3, the Azur irregularity note, and the source-faithful transcription policy.
- docs/ARCHITECTURE.md: the multi-recipe planner selection and the split rule, with the Mermaid diagrams updated.
- docs/DECISIONS.md: entries for the phase 2 ratification (step 0), the crosses array migration, the cheapest-recipe selection strategy, and the generic split rule. Append, never rewrite.
- docs/OVERVIEW.md and README.md updated (features, counts, screenshots placeholders). CLAUDE.md roadmap updated: phases 1 to 3 done; note possible future ideas (per-generation level overrides in the planner, Monte Carlo confidence mode) without committing to them.

## 11. Definition of done for phase 3

- All tests pass (previous phases plus the new ones); lint and build clean.
- Both new species browsable and plannable in both languages, on mobile and desktop.
- ORCHESTRATION.md committed and TASKS.md maintained through the phase, per step 0.
- Documentation accurate against the shipped code.
- Deployed to GitHub Pages via CI and verified live.
