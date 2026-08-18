/**
 * The Breeding Planner ("shopping list") — pure expected-value math over the
 * phase 1 colour DAG.
 *
 * Given a target colour, a quantity and a set of plan-wide assumptions, this
 * module computes recursively how many matings of which recipe pairs, how many
 * mounts of each intermediate colour, and how many generation-1 wild captures
 * are needed. Everything here is a pure function: no React, no side effects,
 * no mutation of the game data (see `docs/DATA.md`).
 *
 * Source: `BRIEF-phase-2.md`, sections 2 and 3, extended by `BRIEF-phase-3.md`
 * section 7. The four modelling assumptions (clean genealogy, failed births not
 * salvaged, genders ignored, cloning amortised) are recorded in
 * `docs/DECISIONS.md` and surfaced in the planner UI — the numbers below are
 * expectations, not guarantees, except when {@link BreedingPlan.guaranteed} is
 * true.
 *
 * Phase 3 added two rules, both generic over the three species:
 *
 * - **Cheapest-recipe selection.** A colour can have several recipes (up to 12
 *   for a Seemyool or Rhineetle monocolour). {@link rankAllRecipes} scores every
 *   one of them by the expected wild captures of its full recursive plan and the
 *   planner breeds through the cheapest; see {@link RecipeRanking}.
 * - **The split rule.** If one exact parent pair produces `k` different colours
 *   of the same generation, the target-generation probability pool is shared, so
 *   the effective per-mating chance of the *desired* one is `p / k`. Today
 *   `k = 1` everywhere ({@link findRecipeCollisions} is the test that keeps it
 *   that way), but the rule is implemented generically.
 */

import { ALL_COLORS, type MountColor, type Recipe } from '../data'
import { expectedMatingsForTargetGeneration, targetGenerationChance } from './breeding'

/**
 * Plan-wide assumptions, applied identically to every mating in the plan.
 *
 * A single `parentLevel` is used for both parents of every pair: modelling
 * per-pair levels would multiply the input surface without changing the shape
 * of the answer, since players level a whole breeding line together.
 */
export interface PlannerSettings {
  /** Level (1-200) assumed for both parents of every mating. */
  parentLevel: number
  /** Whether an Optimakina consumable is used for every mating (+10%). */
  optimakina: boolean
  /** Whether the yearly Almanax Takeza day bonus applies (+20%). */
  almanaxTakeza: boolean
  /** Whether spent parents are cloned back, halving parent consumption. */
  cloning: boolean
  /**
   * Whether one parent of every mating carries the Reproducteur capacity,
   * which yields a second baby from the same mating.
   *
   * Off by default: it is a 5% roll from an Animakina, so assuming it would
   * quietly halve every plan for the players who do not have it. It works on
   * a male as well as a female, so one capacity covers a whole breeding line.
   */
  reproducteur: boolean
  /** Which capture net is used for generation-1 mounts. */
  captureNet: CaptureNet
}

/**
 * The capture nets the planner can model.
 *
 * The two *reinforced* nets are deliberately absent. They capture every wild
 * mount in a radius-3 zone, so their yield depends on how many happen to be
 * standing there — a number the planner has no basis to assume. Modelling them
 * would mean inventing an occupancy figure, which `docs/DATA.md`'s sourcing
 * rule forbids. See `docs/DECISIONS.md`.
 */
export type CaptureNet = 'universal' | 'multiplier'

/** Mounts obtained per successful capture, by net. */
export const MOUNTS_PER_CAPTURE: Readonly<Record<CaptureNet, number>> = {
  universal: 1,
  multiplier: 2,
}

/** Brief-mandated defaults for a fresh planner. */
export const DEFAULT_PLANNER_SETTINGS: PlannerSettings = {
  parentLevel: 100,
  optimakina: true,
  almanaxTakeza: false,
  cloning: true,
  reproducteur: false,
  captureNet: 'universal',
}

/** Inclusive bounds for {@link PlannerSettings.parentLevel}. */
export const PARENT_LEVEL_MIN = 1
export const PARENT_LEVEL_MAX = 200

/**
 * Genetoken (FR: généton) award value per parent generation, used by the
 * {@link BreedingPlan.genetokens} estimate. Generation 10 never appears here
 * because a generation-10 colour is never a parent.
 *
 * Source: `BRIEF-phase-2.md`, section 7.
 */
export const GENETOKEN_VALUE_BY_GENERATION: Readonly<Record<number, number>> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 15,
  6: 30,
  7: 60,
  8: 120,
  9: 250,
}

/**
 * One candidate recipe for a colour, scored by the planner.
 *
 * This is the shape the UI renders for both "the recipe we picked" and "the
 * ones we did not" — {@link PlannedPair.alternatives} and
 * {@link RecipeRanking.options} are lists of these, always cheapest first.
 */
export interface RecipeChoice {
  /** Index of this recipe in the colour's `crosses` array (a stable UI key). */
  index: number
  /** First parent, in the order the data stores it (recipes are unordered). */
  parentAId: string
  /** Second parent, in the order the data stores it. */
  parentBId: string
  /**
   * `k` for the split rule: how many colours of the child's generation list
   * this exact parent pair. 1 for every recipe in the current data.
   */
  split: number
  /**
   * Expected target-generation babies from one mating of this pair:
   * `p / split * births`.
   *
   * Not a probability — with the Reproducteur capacity it can exceed 1, since
   * a mating then yields two babies. Matings for `q` children is
   * `q / successesPerMating`.
   */
  successesPerMating: number
  /**
   * Expected wild captures needed to produce **one** mount of the child through
   * this recipe (with the cheapest recipes used below it). This is the number
   * the recipes are ranked by; lower is better.
   */
  captureCost: number
}

/**
 * Every recipe of one colour, ranked by {@link RecipeChoice.captureCost}.
 *
 * The planner breeds through {@link chosen}; the detail panel lists
 * {@link options} (or {@link alternatives} next to the chosen one) so a player
 * can see what else would have worked and what it would have cost.
 *
 * @example
 * const ranking = rankRecipes('indigo', DEFAULT_PLANNER_SETTINGS)
 * ranking?.chosen?.parentAId   // 'almond-golden'
 * ranking?.alternatives.length // 0 — Dragoturkeys have one recipe per colour
 */
export interface RecipeRanking {
  colorId: string
  /** Every recipe, cheapest first; `options[0]` is {@link chosen}. */
  options: readonly RecipeChoice[]
  /** The recipe the planner uses, or `null` for a wild-caught colour. */
  chosen: RecipeChoice | null
  /** `options` without the chosen one — what the UI lists as alternatives. */
  alternatives: readonly RecipeChoice[]
  /**
   * Expected wild captures per mount of this colour, using the chosen recipe.
   * Exactly 1 for a wild-caught colour.
   */
  captureCost: number
}

/**
 * One parent pair that produces several colours of the same generation — the
 * `k > 1` case of the split rule.
 *
 * `BRIEF-phase-3.md` section 7 states the transcribed data has none of these;
 * {@link findRecipeCollisions} is what proves it, so a future data correction
 * cannot silently divide every probability in the plan.
 */
export interface RecipeCollision {
  parentAId: string
  parentBId: string
  /** The shared target generation of the colliding colours. */
  generation: number
  /** The colliding colours, ascending by id. Always at least two. */
  childIds: readonly string[]
}

/** One recipe pair in the plan, with how many times it must be mated. */
export interface PlannedPair {
  /** The colour this pair produces. */
  childId: string
  parentAId: string
  parentBId: string
  /**
   * Expected matings of this pair: mounts needed of `childId` divided by the
   * pair's effective chance `p / split`.
   */
  matings: number
  /** Expected successful births of `childId` from this pair. */
  successes: number
  /** Index of the chosen recipe in the child's `crosses` array. */
  recipeIndex: number
  /** `k` for the split rule; 1 unless this pair also produces other colours. */
  split: number
  /** Expected target-generation babies per mating here: `p / split * births`. */
  successesPerMating: number
  /**
   * The child's other recipes, cheapest first — what the plan did *not* use.
   * Empty for every Dragoturkey colour, and for any colour with one recipe.
   */
  alternatives: readonly RecipeChoice[]
}

/** How many mounts of one colour the plan needs, and what it costs to make them. */
export interface PlannedColor {
  colorId: string
  generation: number
  /** Expected number of mounts of this colour needed (a real number). */
  expected: number
  /** `Math.ceil(expected)` — the practical count to actually farm. */
  safe: number
  /** Expected matings performed to produce them. Always 0 for generation 1. */
  matings: number
  /** True for generation-1 colours, which are captured rather than bred. */
  wildCapture: boolean
}

/** The complete computed plan. All counts are expectations unless `guaranteed`. */
export interface BreedingPlan {
  targetId: string
  quantity: number
  settings: PlannerSettings
  /** Per-mating target-generation success probability `p` (0-1). */
  chance: number
  /** `1 / p` — expected matings per desired baby. */
  expectedMatingsPerSuccess: number
  /** True when `p` is 1: every count below is then an exact integer. */
  guaranteed: boolean
  /** Generation-1 colours to capture in the wild. */
  captures: PlannedColor[]
  /** Every colour the plan touches (target and generation 1 included), ascending by generation. */
  colors: PlannedColor[]
  /** Every recipe pair to mate, ascending by the child's generation. */
  pairs: PlannedPair[]
  /** Sum of every pair's matings. */
  totalMatings: number
  /** Sum of every capture's expected count. */
  totalCaptures: number
  /** Sum of every capture's safe (ceiled) count. */
  totalCapturesSafe: number
  /**
   * Capture *fights* needed to bring home {@link totalCapturesSafe} mounts.
   *
   * Equal to it with a universal net. A multiplier net duplicates whatever it
   * catches, so it halves the trips — rounded up per colour, because you catch
   * one colour at a time and half a fight is a whole fight.
   */
  captureFights: number
  /** Expected genetokens earned by executing the plan (brief section 7). */
  genetokens: number
}

/** Kills float drift like `0.30000000000000004` before display or `Math.ceil`. */
function tidy(value: number): number {
  return Math.round(value * 1e9) / 1e9
}

/**
 * Orders a recipe by ascending parent id. This is the *comparison* key only —
 * a recipe is displayed in the order the data stores it, since that order is
 * what the tree edges and the detail panel already use.
 */
function orderedPair(recipe: Recipe): readonly [string, string] {
  const [a, b] = recipe
  return a.localeCompare(b) <= 0 ? [a, b] : [b, a]
}

/**
 * Compares two capture costs with a relative tolerance.
 *
 * Two structurally equivalent recipes can drift apart in the last bits of a
 * float after a dozen multiplications. Without the tolerance they would order
 * by that drift instead of by the deterministic id tie-break, and the planner
 * would pick a different recipe depending on the shape of the arithmetic.
 */
function compareCost(a: number, b: number): number {
  const scale = Math.max(1, Math.abs(a), Math.abs(b))
  return Math.abs(a - b) <= 1e-9 * scale ? 0 : a - b
}

/** All colours produced by one unordered parent pair at one target generation. */
interface PairGroup {
  parentAId: string
  parentBId: string
  generation: number
  childIds: Set<string>
}

/**
 * Indexes every recipe by (unordered parent pair, target generation) — the key
 * the split rule counts over. A colour that lists the same pair twice still
 * counts once, because `k` counts distinct *colours* competing for the
 * target-generation pool, not recipe entries.
 */
function buildSplitIndex(colors: readonly MountColor[]): Map<string, PairGroup> {
  const index = new Map<string, PairGroup>()
  for (const color of colors) {
    for (const recipe of color.crosses ?? []) {
      const [first, second] = orderedPair(recipe)
      const key = `${color.generation}|${first}|${second}`
      const group = index.get(key) ?? {
        parentAId: first,
        parentBId: second,
        generation: color.generation,
        childIds: new Set<string>(),
      }
      group.childIds.add(color.id)
      index.set(key, group)
    }
  }
  return index
}

/**
 * Every parent pair that produces more than one colour of the same generation.
 *
 * The split rule ({@link RecipeChoice.split}) handles `k > 1` correctly, so a
 * collision is not a crash — it is a claim about the game that the data has
 * never made. This detector exists so that claim is asserted rather than
 * assumed: `planner.test.ts` requires the list to be empty on the shipped data.
 *
 * @param colors - the colour set to scan; defaults to all three species.
 * @returns the collisions, ascending by generation then parent ids. Empty today.
 *
 * @example
 * findRecipeCollisions() // []
 */
export function findRecipeCollisions(
  colors: readonly MountColor[] = ALL_COLORS,
): RecipeCollision[] {
  const collisions: RecipeCollision[] = []
  for (const group of buildSplitIndex(colors).values()) {
    if (group.childIds.size < 2) continue
    collisions.push({
      parentAId: group.parentAId,
      parentBId: group.parentBId,
      generation: group.generation,
      childIds: [...group.childIds].sort((a, b) => a.localeCompare(b)),
    })
  }
  return collisions.sort(
    (a, b) =>
      a.generation - b.generation ||
      a.parentAId.localeCompare(b.parentAId) ||
      a.parentBId.localeCompare(b.parentBId),
  )
}

/**
 * The per-mating success probability `p` implied by a set of plan settings.
 *
 * Applies the documented formula with the same level on both parents:
 * `p = min(1, 0.30 + 0.0015 * 2 * level + (optimakina ? 0.10 : 0) + (takeza ? 0.20 : 0))`
 *
 * @example
 * // Default settings (level 100, Optimakina on): 0.30 + 0.30 + 0.10
 * planChance({ parentLevel: 100, optimakina: true, almanaxTakeza: false, cloning: true }) // 0.7
 * @example
 * // Two level-200 parents with an Optimakina saturate the cap
 * planChance({ parentLevel: 200, optimakina: true, almanaxTakeza: false, cloning: true }) // 1
 */
export function planChance(settings: PlannerSettings): number {
  return targetGenerationChance({
    parentALevel: settings.parentLevel,
    parentBLevel: settings.parentLevel,
    optimakina: settings.optimakina,
    almanaxTakeza: settings.almanaxTakeza,
  })
}

/**
 * How much of each parent colour one mating consumes, net of cloning.
 *
 * A mating spends two fertile parents (one of each recipe colour) and leaves
 * them sterile. Cloning merges the two spent parents back into one fertile
 * mount which is randomly one of the two colours — so on average it returns
 * 0.5 of each colour, netting 0.5 consumed per parent colour per mating
 * instead of 1.
 *
 * @example
 * parentConsumptionFactor(true) // 0.5
 * parentConsumptionFactor(false) // 1
 */
export function parentConsumptionFactor(cloning: boolean): number {
  return cloning ? 0.5 : 1
}

/**
 * Babies produced by one mating.
 *
 * A mating normally gives exactly one baby, instantly, and leaves both parents
 * sterile. The Reproducteur capacity on either parent adds a second.
 *
 * Each baby is modelled as an independent draw at the target-generation
 * probability, so two babies double the *expected* successes per mating
 * without changing what a mating costs in parents. That independence is a
 * modelling assumption, not a sourced fact — the sources state that the
 * capacity gives an extra baby, not how the extra baby's colour is rolled.
 * See `docs/DECISIONS.md`.
 *
 * @example
 * birthsPerMating(true) // 2
 * birthsPerMating(false) // 1
 */
export function birthsPerMating(reproducteur: boolean): number {
  return reproducteur ? 2 : 1
}

/**
 * Ranks every recipe of every colour by the cost of its full recursive plan.
 *
 * The cost of a colour is the expected number of **wild captures per mount**,
 * which is the resource the player actually has to go and farm:
 *
 * ```text
 * cost(X) = 1                                    if X is wild-caught
 * cost(X) = min over recipes (A, B) of
 *             (k / p) * f * (cost(A) + cost(B))  otherwise
 * ```
 *
 * where `p` is {@link planChance}, `f` is {@link parentConsumptionFactor} and
 * `k` is the split of the pair (see {@link RecipeChoice.split}): `k / p` matings
 * per mount, each consuming `f` of both parents.
 *
 * Memoised over the DAG by a single ascending-generation pass rather than by a
 * recursive walk with a cache: every recipe points at strictly lower
 * generations (enforced by `src/data/colors.test.ts` and `species.test.ts`), so
 * one ascending sweep reaches a colour only once both its parents are already
 * scored. Linear in the number of recipes, whatever the fan-out.
 *
 * Ties are broken deterministically: lexicographic on the pair of parent ids
 * (compared as an ordered pair, so the storage order of a recipe cannot change
 * the winner), then on the recipe's index. This is not a rare path — see the
 * note below.
 *
 * **The ranking depends on the settings.** The cost of a path of length `n` is
 * proportional to `(f / p)^n`, so when `f / p < 1` (cloning on, high `p`) a
 * *deeper* recipe scores cheaper, and when `f / p > 1` (cloning off, low `p`) a
 * shallower one does. At the extreme `p = 1` with cloning on, `f / p = 0.5` and
 * every colour costs exactly 1.0 captures per mount, so *every* recipe ties and
 * the id tie-break alone decides. That is the same structural consequence of
 * the amortised-cloning assumption recorded in `docs/DECISIONS.md` under
 * "monotonicity holds only without cloning", not a defect.
 *
 * A colour with no recipes is a leaf worth 1 capture. That covers generation 1,
 * and also any parent id that is not part of `colors` — such a parent cannot be
 * expanded, so the sweep in {@link computePlan} would treat it as a leaf too.
 *
 * @param settings - plan-wide assumptions; both `p` and `f` change the ranking.
 * @param colors - the colour set to score; defaults to all three species.
 * @returns one {@link RecipeRanking} per colour, keyed by colour id.
 *
 * @example
 * // The tree renders one recipe's edges per node by default:
 * const rankings = rankAllRecipes(DEFAULT_PLANNER_SETTINGS)
 * rankings.get('seemyool-ginger')?.chosen // the cheapest of its 6 recipes
 */
export function rankAllRecipes(
  settings: PlannerSettings,
  colors: readonly MountColor[] = ALL_COLORS,
): Map<string, RecipeRanking> {
  const chance = planChance(settings)
  const factor = parentConsumptionFactor(settings.cloning)
  const births = birthsPerMating(settings.reproducteur)
  const splits = buildSplitIndex(colors)

  /** Untidied costs, so rounding never accumulates through the recursion. */
  const costById = new Map<string, number>()
  const costOf = (colorId: string): number => costById.get(colorId) ?? 1

  const rankings = new Map<string, RecipeRanking>()
  const ascending = [...colors].sort((a, b) => a.generation - b.generation)

  for (const color of ascending) {
    const recipes = color.crosses ?? []
    const scored = recipes.map((recipe, index) => {
      const [parentAId, parentBId] = recipe
      const split =
        splits.get(`${color.generation}|${orderedPair(recipe).join('|')}`)?.childIds.size ?? 1
      const successesPerMating = (chance / split) * births
      const cost = (factor / successesPerMating) * (costOf(parentAId) + costOf(parentBId))
      return {
        cost,
        key: orderedPair(recipe),
        choice: {
          index,
          parentAId,
          parentBId,
          split,
          successesPerMating,
          captureCost: tidy(cost),
        } satisfies RecipeChoice,
      }
    })

    scored.sort(
      (a, b) =>
        compareCost(a.cost, b.cost) ||
        a.key[0].localeCompare(b.key[0]) ||
        a.key[1].localeCompare(b.key[1]) ||
        a.choice.index - b.choice.index,
    )

    const options = scored.map((entry) => entry.choice)
    const best = scored[0]
    costById.set(color.id, best ? best.cost : 1)
    rankings.set(color.id, {
      colorId: color.id,
      options,
      chosen: options[0] ?? null,
      alternatives: options.slice(1),
      captureCost: tidy(best ? best.cost : 1),
    })
  }

  return rankings
}

/**
 * The recipe ranking of a single colour — {@link rankAllRecipes} for one id.
 *
 * Convenient for a detail panel showing one colour. Ranking is a whole-graph
 * computation, so call {@link rankAllRecipes} once instead of this in a loop
 * over many colours.
 *
 * @returns the ranking, or `null` if `colorId` is not in `colors`.
 */
export function rankRecipes(
  colorId: string,
  settings: PlannerSettings,
  colors: readonly MountColor[] = ALL_COLORS,
): RecipeRanking | null {
  return rankAllRecipes(settings, colors).get(colorId) ?? null
}

/**
 * Computes the full breeding plan for `quantity` mounts of `targetId`.
 *
 * Implements the brief's recursion, extended by the two phase 3 rules:
 *
 * ```text
 * plan(X, q):
 *   if X has no recipe: captures[X] += q     // generation 1, caught in the wild
 *   else:
 *     (A, B) = cheapest recipe of X          // see rankAllRecipes
 *     k      = colours of gen(X) that this exact pair also produces
 *     M      = q / (p / k)                   // expected matings for q successes
 *     matings[(A, B)] += M
 *     f = cloning ? 0.5 : 1
 *     plan(A, M * f); plan(B, M * f)
 * ```
 *
 * Every Dragoturkey colour has exactly one recipe and `k` is 1 everywhere in
 * the current data, so this reduces to the phase 2 recursion for the species
 * phase 2 shipped — its reference vectors are the regression suite and pass
 * unchanged.
 *
 * Evaluated iteratively in descending generation order rather than by literal
 * recursion. Every `crosses` edge points to a strictly lower generation (a data
 * invariant enforced by `src/data/colors.test.ts` and `src/data/species.test.ts`),
 * so one descending sweep visits each colour only after every colour that
 * consumes it — the same result as the recursion, but linear in the number of
 * colours instead of exponential in the number of distinct ancestry paths.
 *
 * The recipe choice is made once for the whole colour set (not once per plan
 * node), which is what makes a single sweep enough: a colour is bred the same
 * way wherever it appears in the plan, so its demand can be accumulated in one
 * place. See {@link rankAllRecipes} for the cost model and its tie-break.
 *
 * @param targetId - id of the desired colour, e.g. `'indigo'`.
 * @param quantity - how many of them are wanted (negative values clamp to 0).
 * @param settings - plan-wide assumptions; see {@link PlannerSettings}.
 * @param colors - the colour set to plan over; defaults to all three species.
 *   A target outside this set yields `null`, so passing one species' colours
 *   scopes the planner to that species.
 * @returns the computed plan, or `null` if `targetId` is not a known colour.
 *
 * @example
 * // 1 Indigo, guaranteed matings, no cloning: 3 matings total,
 * // capturing 2 Almond + 1 Golden + 1 Ginger.
 * computePlan('indigo', 1, {
 *   parentLevel: 200, optimakina: true, almanaxTakeza: false, cloning: false,
 * })
 * @example
 * // Which of the 12 recipes did the plan pick for a Rhineetle Plum, and what
 * // were the runners-up?
 * const plan = computePlan('rhineetle-plum', 1, DEFAULT_PLANNER_SETTINGS)
 * const pair = plan?.pairs.find((entry) => entry.childId === 'rhineetle-plum')
 * pair?.parentAId       // the chosen recipe's first parent
 * pair?.alternatives    // the other 11, cheapest first, each with its captureCost
 */
export function computePlan(
  targetId: string,
  quantity: number,
  settings: PlannerSettings,
  colors: readonly MountColor[] = ALL_COLORS,
): BreedingPlan | null {
  const byId = new Map(colors.map((color) => [color.id, color]))
  if (!byId.has(targetId)) return null

  const chance = planChance(settings)
  const factor = parentConsumptionFactor(settings.cloning)
  const rankings = rankAllRecipes(settings, colors)

  /** Mounts of each colour the plan needs, accumulated as the sweep descends. */
  const needed = new Map<string, number>()
  needed.set(targetId, Math.max(0, quantity))

  const pairs: PlannedPair[] = []
  const matingsByColor = new Map<string, number>()

  const descending = [...colors].sort((a, b) => b.generation - a.generation)
  for (const color of descending) {
    const want = needed.get(color.id)
    if (!want || want <= 0) continue
    // The cheapest of the colour's recipes, already scored over the whole DAG.
    // A wild-caught colour has none and is captured rather than bred.
    const ranking = rankings.get(color.id)
    const recipe = ranking?.chosen
    if (!ranking || !recipe) continue

    // `successesPerMating` is p / k * births: a pair shared by k colours of
    // this generation splits the target-generation pool, so it needs k times
    // as many matings, and Reproducteur's second baby halves them again.
    const matings = want / recipe.successesPerMating
    matingsByColor.set(color.id, matings)

    pairs.push({
      childId: color.id,
      parentAId: recipe.parentAId,
      parentBId: recipe.parentBId,
      matings: tidy(matings),
      successes: tidy(want),
      recipeIndex: recipe.index,
      split: recipe.split,
      successesPerMating: recipe.successesPerMating,
      alternatives: ranking.alternatives,
    })

    for (const parentId of [recipe.parentAId, recipe.parentBId]) {
      needed.set(parentId, (needed.get(parentId) ?? 0) + matings * factor)
    }
  }

  const planned: PlannedColor[] = []
  for (const [colorId, expected] of needed) {
    const color = byId.get(colorId)
    if (!color) continue
    const tidied = tidy(expected)
    planned.push({
      colorId,
      generation: color.generation,
      expected: tidied,
      safe: Math.ceil(tidied),
      matings: tidy(matingsByColor.get(colorId) ?? 0),
      wildCapture: color.generation === 1,
    })
  }
  planned.sort((a, b) => a.generation - b.generation || a.colorId.localeCompare(b.colorId))
  pairs.sort((a, b) => {
    const genA = byId.get(a.childId)?.generation ?? 0
    const genB = byId.get(b.childId)?.generation ?? 0
    return genA - genB || a.childId.localeCompare(b.childId)
  })

  const captures = planned.filter((entry) => entry.wildCapture)
  const totalMatings = pairs.reduce((sum, pair) => sum + pair.matings, 0)
  const totalCaptures = captures.reduce((sum, entry) => sum + entry.expected, 0)

  const genetokens = pairs.reduce((sum, pair) => {
    const genA = byId.get(pair.parentAId)?.generation ?? 0
    const genB = byId.get(pair.parentBId)?.generation ?? 0
    const award =
      (GENETOKEN_VALUE_BY_GENERATION[genA] ?? 0) + (GENETOKEN_VALUE_BY_GENERATION[genB] ?? 0)
    return sum + pair.successes * award
  }, 0)

  return {
    targetId,
    quantity,
    settings,
    chance,
    expectedMatingsPerSuccess: expectedMatingsForTargetGeneration(chance),
    guaranteed: chance >= 1,
    captures,
    colors: planned,
    pairs,
    totalMatings: tidy(totalMatings),
    totalCaptures: tidy(totalCaptures),
    totalCapturesSafe: captures.reduce((sum, entry) => sum + entry.safe, 0),
    captureFights: captures.reduce(
      (sum, entry) => sum + Math.ceil(entry.safe / MOUNTS_PER_CAPTURE[settings.captureNet]),
      0,
    ),
    genetokens: tidy(genetokens),
  }
}

/**
 * The colour itself plus the ancestry the planner would actually breed.
 *
 * `getLineageIds` in `src/data` walks *every* recipe, so for a multi-recipe
 * colour it returns the union of all its ancestry paths — 12 recipes deep, that
 * is most of the species. This follows only each colour's chosen recipe, which
 * is the path the plan really takes and the one the tree draws edges for.
 *
 * `BRIEF-phase-3.md` section 9 asks for lineage highlighting to follow the
 * cheapest-recipe path by default; this is that path.
 *
 * A colour missing from `rankings`, or one whose ranking has no chosen recipe
 * (generation 1), simply contributes no parents — the walk stops there.
 *
 * @param colorId - the colour to start from; included in the result.
 * @param rankings - the output of {@link rankAllRecipes} for the same settings
 *   the tree is drawing.
 * @returns the colour and its cheapest-path ancestors, without duplicates.
 *
 * @example
 * const rankings = rankAllRecipes(DEFAULT_PLANNER_SETTINGS)
 * cheapestLineageIds('indigo', rankings)
 * // ['indigo', 'almond-golden', 'almond-ginger', 'almond', 'golden', 'ginger']
 */
export function cheapestLineageIds(
  colorId: string,
  rankings: ReadonlyMap<string, RecipeRanking>,
): string[] {
  const lineage: string[] = []
  const visited = new Set<string>()
  const queue = [colorId]

  // Breadth-first so the result reads outward from the colour — parents before
  // grandparents — which is the order the detail panel and the tree present.
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined || visited.has(current)) continue
    visited.add(current)
    lineage.push(current)

    const chosen = rankings.get(current)?.chosen
    if (!chosen) continue
    queue.push(chosen.parentAId, chosen.parentBId)
  }

  return lineage
}
