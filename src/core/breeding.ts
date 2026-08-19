/**
 * Dofus 3.5 mount breeding mechanics — documented constants and pure
 * functions. Surfaced as informational content on the "How breeding works"
 * page, and called directly by `src/core/planner.ts` for its expected-value
 * math — {@link targetGenerationChance} is the formula every plan rests on.
 *
 * Source: `BRIEF-phase-1.md`, section 4. Only the target-generation formula
 * is modelled as exact math — the brief is explicit that the residual
 * distribution across non-target colors is not publicly documented and
 * must stay qualitative (see docs/OVERVIEW.md).
 */

export const BREEDING_CONSTANTS = {
  /** Base chance a baby is of the target generation. */
  baseTargetGenerationChance: 0.3,
  /** Chance added per mount level, summed across both parents. */
  perLevelBonus: 0.0015,
  /** Chance added when an Optimakina consumable is used. */
  optimakinaBonus: 0.1,
  /** Chance added on the yearly Almanax Takeza day. */
  almanaxTakezaBonus: 0.2,
  /** A mount's gauges (endurance, maturity, love) are maxed at this value. */
  maxGaugeValue: 20000,
  /** One mating yields 1 baby, or 2 if a parent has the Reproducer capacity. */
  babiesPerMating: 1,
  babiesPerMatingWithReproducer: 2,
  /**
   * Mounts one breeding couple yields: 1 baby + 1 clone from the spent
   * parents. Three when a parent carries the Reproducer capacity, since the
   * mating then gives two babies — see {@link babiesPerMatingWithReproducer}.
   */
  maxMountsPerCouple: 2,
} as const

export interface TargetGenerationChanceInput {
  /** Level (1-200) of the first parent. */
  parentALevel: number
  /** Level (1-200) of the second parent. */
  parentBLevel: number
  /** Whether an Optimakina consumable is used for this mating. */
  optimakina?: boolean
  /** Whether the yearly Almanax Takeza day bonus applies. */
  almanaxTakeza?: boolean
}

/**
 * The chance (0-1) that a baby is of the target generation — the highest
 * generation reachable from the two parents' colors and genealogy.
 *
 * @example
 * // Two level-200 parents, no consumable: 90%
 * targetGenerationChance({ parentALevel: 200, parentBLevel: 200 }) // 0.9
 * @example
 * // Same, with an Optimakina: capped at 100%
 * targetGenerationChance({ parentALevel: 200, parentBLevel: 200, optimakina: true }) // 1
 */
export function targetGenerationChance(input: TargetGenerationChanceInput): number {
  const { parentALevel, parentBLevel, optimakina = false, almanaxTakeza = false } = input
  const { baseTargetGenerationChance, perLevelBonus, optimakinaBonus, almanaxTakezaBonus } =
    BREEDING_CONSTANTS

  let chance = baseTargetGenerationChance + perLevelBonus * (parentALevel + parentBLevel)
  if (optimakina) chance += optimakinaBonus
  if (almanaxTakeza) chance += almanaxTakezaBonus

  // Round before capping to avoid floating-point drift (e.g. 0.9999999999999999).
  return Math.min(1, Math.round(chance * 1e6) / 1e6)
}

/**
 * Expected number of matings needed to obtain one baby of the target
 * generation, given the per-mating chance `p` (from
 * {@link targetGenerationChance}).
 *
 * @example
 * expectedMatingsForTargetGeneration(0.9) // 1.111... (~1.11 matings on average)
 */
export function expectedMatingsForTargetGeneration(chance: number): number {
  if (chance <= 0) return Number.POSITIVE_INFINITY
  return 1 / chance
}
