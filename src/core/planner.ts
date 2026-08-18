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
 * Source: `BRIEF-phase-2.md`, sections 2 and 3. The four modelling assumptions
 * (clean genealogy, failed births not salvaged, genders ignored, cloning
 * amortised) are recorded in `docs/DECISIONS.md` and surfaced in the planner
 * UI — the numbers below are expectations, not guarantees, except when
 * {@link BreedingPlan.guaranteed} is true.
 */

import { DRAGOTURKEY_COLORS, getColorById, type MountColor } from '../data'
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
}

/** Brief-mandated defaults for a fresh planner. */
export const DEFAULT_PLANNER_SETTINGS: PlannerSettings = {
  parentLevel: 100,
  optimakina: true,
  almanaxTakeza: false,
  cloning: true,
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

/** One recipe pair in the plan, with how many times it must be mated. */
export interface PlannedPair {
  /** The colour this pair produces. */
  childId: string
  parentAId: string
  parentBId: string
  /** Expected matings of this pair: mounts needed of `childId` divided by `p`. */
  matings: number
  /** Expected successful births of `childId` from this pair. */
  successes: number
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
  /** Expected genetokens earned by executing the plan (brief section 7). */
  genetokens: number
}

/** Kills float drift like `0.30000000000000004` before display or `Math.ceil`. */
function tidy(value: number): number {
  return Math.round(value * 1e9) / 1e9
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
 * Computes the full breeding plan for `quantity` mounts of `targetId`.
 *
 * Implements the brief's recursion:
 *
 * ```text
 * plan(X, q):
 *   if gen(X) === 1: captures[X] += q
 *   else:
 *     M = q / p                    // expected matings for q successes
 *     matings[recipe(X)] += M
 *     f = cloning ? 0.5 : 1
 *     for each parent P of X: plan(P, M * f)
 * ```
 *
 * Evaluated iteratively in descending generation order rather than by literal
 * recursion. Every `cross` edge points to a strictly lower generation (a data
 * invariant enforced by `src/data/colors.test.ts`), so one descending sweep
 * visits each colour only after every colour that consumes it — the same
 * result as the recursion, but linear in the number of colours instead of
 * exponential in the number of distinct ancestry paths.
 *
 * @param targetId - id of the desired colour, e.g. `'indigo'`.
 * @param quantity - how many of them are wanted (negative values clamp to 0).
 * @param settings - plan-wide assumptions; see {@link PlannerSettings}.
 * @param colors - the colour set to plan over; defaults to all Dragoturkeys.
 * @returns the computed plan, or `null` if `targetId` is not a known colour.
 *
 * @example
 * // 1 Indigo, guaranteed matings, no cloning: 3 matings total,
 * // capturing 2 Almond + 1 Golden + 1 Ginger.
 * computePlan('indigo', 1, {
 *   parentLevel: 200, optimakina: true, almanaxTakeza: false, cloning: false,
 * })
 */
export function computePlan(
  targetId: string,
  quantity: number,
  settings: PlannerSettings,
  colors: readonly MountColor[] = DRAGOTURKEY_COLORS,
): BreedingPlan | null {
  const target = getColorById(targetId)
  if (!target) return null

  const chance = planChance(settings)
  const factor = parentConsumptionFactor(settings.cloning)

  /** Mounts of each colour the plan needs, accumulated as the sweep descends. */
  const needed = new Map<string, number>()
  needed.set(targetId, Math.max(0, quantity))

  const byId = new Map(colors.map((color) => [color.id, color]))
  const pairs: PlannedPair[] = []
  const matingsByColor = new Map<string, number>()

  const descending = [...colors].sort((a, b) => b.generation - a.generation)
  for (const color of descending) {
    const want = needed.get(color.id)
    if (!want || want <= 0) continue
    if (!color.cross) continue // generation 1: captured in the wild, never bred

    const matings = want / chance
    matingsByColor.set(color.id, matings)

    const [parentAId, parentBId] = color.cross
    pairs.push({
      childId: color.id,
      parentAId,
      parentBId,
      matings: tidy(matings),
      successes: tidy(want),
    })

    for (const parentId of color.cross) {
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
    genetokens: tidy(genetokens),
  }
}
