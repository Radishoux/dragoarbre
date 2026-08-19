/**
 * How many mounts to actually farm, rather than how many you need on average.
 *
 * `computePlan()` answers with expectations: 3.6 wild captures, 8.8 matings.
 * Those are correct and unhelpful at the moment you leave for the paddock,
 * because half the time you will need more. `BreedingPlan.safe` — a per-colour
 * `Math.ceil` — is a crude stand-in that answers "round up", not "how sure am
 * I". This module answers the second question by simulating the plan.
 *
 * What is simulated and what is not:
 *
 * - **Simulated:** how many matings a colour actually takes. Each mating yields
 *   `births` babies, each independently of the target generation with
 *   probability `p / split`. The number of matings to reach a whole number of
 *   mounts is therefore a negative-binomial draw, and that is the dominant
 *   source of variance in a plan.
 * - **Not simulated:** cloning. The 0.5 parent-consumption factor is already
 *   documented as a large-plan expectation (see `docs/DECISIONS.md`), and it is
 *   applied here as the same deterministic factor rather than modelled as a
 *   coin flip per mating. A confidence figure that pretended otherwise would be
 *   more precise than the model underneath it.
 *
 * Every colour's demand is rounded **up** before it is bred, because you cannot
 * breed two-thirds of a mount. That makes a sampled plan systematically at
 * least as expensive as the expected one, which is the honest direction for a
 * number people use to decide what to go and catch.
 */

import { ALL_COLORS, type MountColor } from '../data'
import {
  birthsPerMating,
  type PlannerSettings,
  parentConsumptionFactor,
  planChance,
  rankAllRecipes,
} from './planner'

/** Options for {@link samplePlanConfidence}. */
export interface ConfidenceOptions {
  /** Trials to run. More is smoother and slower; 2000 settles the percentiles. */
  samples?: number
  /** Confidence wanted, 0-1 exclusive. 0.9 means "enough nine times in ten". */
  percentile?: number
  /**
   * Seed for the generator.
   *
   * Fixed by default, which makes a confidence figure reproducible: the same
   * plan and settings always give the same number, so the UI does not flicker
   * between renders and the tests can assert exact values.
   */
  seed?: number
}

/** One colour's count at the requested confidence. */
export interface ConfidenceEntry {
  colorId: string
  /** Mounts of this colour to catch or breed to cover the plan that often. */
  count: number
}

/** The result of simulating a plan many times. */
export interface PlanConfidence {
  samples: number
  percentile: number
  /** Total wild captures that cover the whole plan at this confidence. */
  captures: number
  /** Total matings likewise. */
  matings: number
  /** Per generation-1 colour, ascending by id. Sums to at least {@link captures}. */
  capturesByColor: ConfidenceEntry[]
}

export const DEFAULT_CONFIDENCE_SAMPLES = 2000
export const DEFAULT_CONFIDENCE_PERCENTILE = 0.9

/**
 * A mating can, in principle, fail forever. The loop is bounded so a data or
 * settings change that drove a probability to zero would produce a visibly
 * wrong number instead of hanging the browser.
 */
const MAX_MATINGS_PER_COLOR = 100_000

/**
 * Small deterministic PRNG (mulberry32).
 *
 * `Math.random()` is deliberately not used: a confidence figure that changed on
 * every render would be untestable and would look broken.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The value at `percentile` of a sorted-in-place sample, nearest-rank. */
function percentileOf(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  values.sort((a, b) => a - b)
  const rank = Math.ceil(percentile * values.length)
  const index = Math.min(values.length - 1, Math.max(0, rank - 1))
  return values[index] as number
}

/**
 * Simulates a plan repeatedly and reports the counts that cover it at a given
 * confidence.
 *
 * @param targetId - the colour wanted.
 * @param quantity - how many of them.
 * @param settings - the same assumptions `computePlan()` takes.
 * @param options - see {@link ConfidenceOptions}.
 * @param colors - the colour set to plan over; defaults to all three species.
 * @returns the sampled figures, or `null` if `targetId` is not a known colour.
 *
 * @example
 * // "Catch 6 Almond and you are covered nine times in ten."
 * samplePlanConfidence('indigo', 1, DEFAULT_PLANNER_SETTINGS)?.captures
 */
export function samplePlanConfidence(
  targetId: string,
  quantity: number,
  settings: PlannerSettings,
  options: ConfidenceOptions = {},
  colors: readonly MountColor[] = ALL_COLORS,
): PlanConfidence | null {
  const byId = new Map(colors.map((color) => [color.id, color]))
  if (!byId.has(targetId)) return null

  const samples = Math.max(1, Math.floor(options.samples ?? DEFAULT_CONFIDENCE_SAMPLES))
  const percentile = Math.min(
    0.999,
    Math.max(0.001, options.percentile ?? DEFAULT_CONFIDENCE_PERCENTILE),
  )
  const random = createRandom(options.seed ?? 1)

  const rankings = rankAllRecipes(settings, colors)
  const factor = parentConsumptionFactor(settings.cloning)
  const births = birthsPerMating(settings.reproducteur)
  const chance = planChance(settings)
  // Descending, for the same reason `computePlan` sweeps that way: every recipe
  // points at a strictly lower generation, so a colour is reached only once all
  // of its consumers have added their demand.
  const descending = [...colors].sort((a, b) => b.generation - a.generation)

  const captureTotals: number[] = []
  const matingTotals: number[] = []
  const perColor = new Map<string, number[]>()
  const wanted = Math.max(0, Math.floor(quantity))

  for (let trial = 0; trial < samples; trial++) {
    const needed = new Map<string, number>([[targetId, wanted]])
    let matings = 0
    let captures = 0

    for (const color of descending) {
      // Whole mounts only: you cannot breed two-thirds of one, and rounding up
      // here is what makes the sample a plan you could actually execute.
      const want = Math.ceil(needed.get(color.id) ?? 0)
      if (want <= 0) continue

      const chosen = rankings.get(color.id)?.chosen
      if (!chosen) {
        captures += want
        perColor.set(color.id, [...(perColor.get(color.id) ?? []), want])
        continue
      }

      // Per *baby*, not per mating: `successesPerMating` already folds in
      // births, and the loop below draws each baby separately.
      const perBaby = chance / chosen.split
      let successes = 0
      let colorMatings = 0
      while (successes < want && colorMatings < MAX_MATINGS_PER_COLOR) {
        colorMatings++
        for (let birth = 0; birth < births; birth++) {
          if (random() < perBaby) successes++
        }
      }
      matings += colorMatings

      for (const parentId of [chosen.parentAId, chosen.parentBId]) {
        needed.set(parentId, (needed.get(parentId) ?? 0) + colorMatings * factor)
      }
    }

    captureTotals.push(captures)
    matingTotals.push(matings)
  }

  const capturesByColor: ConfidenceEntry[] = [...perColor.entries()]
    .map(([colorId, values]) => {
      // A colour absent from some trials still has to cover those trials, so
      // pad with zeroes rather than taking a percentile of the trials it
      // happened to appear in.
      const padded = [...values, ...new Array(samples - values.length).fill(0)]
      return { colorId, count: percentileOf(padded, percentile) }
    })
    .sort((a, b) => a.colorId.localeCompare(b.colorId))

  return {
    samples,
    percentile,
    captures: percentileOf(captureTotals, percentile),
    matings: percentileOf(matingTotals, percentile),
    capturesByColor,
  }
}
