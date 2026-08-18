import { describe, expect, test } from 'bun:test'
import { DRAGOTURKEY_COLORS, getColorById } from '../data'
import {
  type BreedingPlan,
  computePlan,
  DEFAULT_PLANNER_SETTINGS,
  type PlannerSettings,
  parentConsumptionFactor,
  planChance,
} from './planner'

/** A settings object with `cloning`/level overrides applied to the defaults. */
function settings(overrides: Partial<PlannerSettings> = {}): PlannerSettings {
  return { ...DEFAULT_PLANNER_SETTINGS, ...overrides }
}

/** Guaranteed matings (p = 1), so counts are exact rather than expectations. */
const GUARANTEED = { parentLevel: 200, optimakina: true, almanaxTakeza: false } as const

/** Expected count for one colour in a plan, or 0 if the plan never needs it. */
function expectedFor(plan: BreedingPlan, colorId: string): number {
  return plan.colors.find((entry) => entry.colorId === colorId)?.expected ?? 0
}

describe('planChance', () => {
  test('two level-1 parents with no bonuses give 0.303', () => {
    expect(planChance(settings({ parentLevel: 1, optimakina: false }))).toBeCloseTo(0.303, 6)
  })

  test('two level-200 parents with no bonuses give 0.90', () => {
    expect(planChance(settings({ parentLevel: 200, optimakina: false }))).toBeCloseTo(0.9, 6)
  })

  test('two level-200 parents with an Optimakina cap at 1', () => {
    expect(planChance(settings({ parentLevel: 200, optimakina: true }))).toBe(1)
  })

  test('two level-100 parents with an Optimakina give 0.70', () => {
    expect(planChance(settings({ parentLevel: 100, optimakina: true }))).toBeCloseTo(0.7, 6)
  })

  test('Takeza adds 0.20 before the cap', () => {
    // 0.30 + 0.0015 * 200 + 0.20 = 0.80, still under the cap.
    expect(
      planChance(settings({ parentLevel: 100, optimakina: false, almanaxTakeza: true })),
    ).toBeCloseTo(0.8, 6)
    // 0.30 + 0.30 + 0.10 + 0.20 = 0.90 -> under the cap, so the bonus is not clipped early.
    expect(
      planChance(settings({ parentLevel: 100, optimakina: true, almanaxTakeza: true })),
    ).toBeCloseTo(0.9, 6)
  })
})

describe('parentConsumptionFactor', () => {
  test('cloning halves parent consumption', () => {
    expect(parentConsumptionFactor(true)).toBe(0.5)
    expect(parentConsumptionFactor(false)).toBe(1)
  })
})

describe('computePlan — Indigo reference vectors', () => {
  // Indigo (gen 3) = Almond+Golden (gen 2) x Almond+Ginger (gen 2).
  // Almond+Golden = Almond x Golden; Almond+Ginger = Almond x Ginger.
  // Almond therefore appears at two leaves of the plan tree, Golden and
  // Ginger at one each.

  test('p = 1, cloning off: 3 matings, captures Almond 2 / Golden 1 / Ginger 1', () => {
    const plan = computePlan('indigo', 1, settings({ ...GUARANTEED, cloning: false }))
    expect(plan).not.toBeNull()
    if (!plan) return

    expect(plan.chance).toBe(1)
    expect(plan.guaranteed).toBe(true)
    expect(plan.totalMatings).toBe(3)
    expect(expectedFor(plan, 'almond')).toBe(2)
    expect(expectedFor(plan, 'golden')).toBe(1)
    expect(expectedFor(plan, 'ginger')).toBe(1)
    expect(plan.totalCaptures).toBe(4)
  })

  test('p = 1, cloning on: 2 matings, captures Almond 0.5 / Golden 0.25 / Ginger 0.25', () => {
    // NOTE: BRIEF-phase-2.md section 5 states Almond 1.0 "(0.5 + 0.25 + 0.25)"
    // for this vector. That contradicts its own recursion and its own Golden /
    // Ginger figures: with f = 0.5 compounding at each level, Almond+Golden and
    // Almond+Ginger are each needed 0.5 times, so each of their two parents is
    // needed 0.25 times. Almond sits at exactly two leaves, giving
    // 0.25 + 0.25 = 0.5 — the stray 0.5 in the brief's breakdown is the
    // quantity of a gen-2 parent, not a capture of Almond. No consistent model
    // yields (Almond 1.0, Golden 0.25, Ginger 0.25, 2 matings). The pseudocode
    // is normative here; see docs/DECISIONS.md.
    const plan = computePlan('indigo', 1, settings({ ...GUARANTEED, cloning: true }))
    expect(plan).not.toBeNull()
    if (!plan) return

    expect(plan.totalMatings).toBe(2)
    expect(expectedFor(plan, 'almond')).toBe(0.5)
    expect(expectedFor(plan, 'golden')).toBe(0.25)
    expect(expectedFor(plan, 'ginger')).toBe(0.25)
  })

  test('p = 1, cloning on: fractional captures ceil to whole mounts', () => {
    const plan = computePlan('indigo', 1, settings({ ...GUARANTEED, cloning: true }))
    if (!plan) throw new Error('expected a plan')

    for (const capture of plan.captures) {
      expect(capture.safe).toBe(Math.ceil(capture.expected))
    }
    expect(plan.captures.map((capture) => capture.safe)).toEqual([1, 1, 1])
    expect(plan.totalCapturesSafe).toBe(3)
  })

  test('the recipe pairs are the three real crosses', () => {
    const plan = computePlan('indigo', 1, settings({ ...GUARANTEED, cloning: false }))
    if (!plan) throw new Error('expected a plan')

    expect(plan.pairs.map((pair) => pair.childId).sort()).toEqual([
      'almond-ginger',
      'almond-golden',
      'indigo',
    ])
    for (const pair of plan.pairs) {
      expect(getColorById(pair.childId)?.crosses).toEqual([[pair.parentAId, pair.parentBId]])
    }
  })
})

describe('computePlan — edges', () => {
  test('a generation-1 target is pure capture with zero matings', () => {
    const plan = computePlan('almond', 3, settings())
    if (!plan) throw new Error('expected a plan')

    expect(plan.totalMatings).toBe(0)
    expect(plan.pairs).toHaveLength(0)
    expect(plan.captures).toHaveLength(1)
    expect(plan.captures[0]?.colorId).toBe('almond')
    expect(plan.captures[0]?.expected).toBe(3)
    expect(plan.totalCaptures).toBe(3)
  })

  test('an unknown target returns null', () => {
    expect(computePlan('not-a-colour', 1, settings())).toBeNull()
  })

  test('quantity scales every count linearly', () => {
    const one = computePlan('crimson', 1, settings())
    const four = computePlan('crimson', 4, settings())
    if (!one || !four) throw new Error('expected plans')

    expect(four.totalMatings).toBeCloseTo(one.totalMatings * 4, 6)
    expect(four.totalCaptures).toBeCloseTo(one.totalCaptures * 4, 6)
  })

  test('guaranteed plans produce whole-number counts without cloning', () => {
    const plan = computePlan('plum', 1, settings({ ...GUARANTEED, cloning: false }))
    if (!plan) throw new Error('expected a plan')

    expect(plan.guaranteed).toBe(true)
    for (const entry of plan.colors) {
      expect(Number.isInteger(entry.expected)).toBe(true)
    }
  })
})

describe('computePlan — properties across all 66 colours', () => {
  const CONFIGS: PlannerSettings[] = [
    settings({ ...GUARANTEED, cloning: false }),
    settings({ ...GUARANTEED, cloning: true }),
    settings({ parentLevel: 1, optimakina: false, cloning: false }),
    settings({ parentLevel: 100, optimakina: true, cloning: true }),
  ]

  test('runs without error for every colour under every configuration', () => {
    for (const config of CONFIGS) {
      for (const color of DRAGOTURKEY_COLORS) {
        const plan = computePlan(color.id, 1, config)
        expect(plan).not.toBeNull()
        if (!plan) continue
        expect(Number.isFinite(plan.totalMatings)).toBe(true)
        expect(Number.isFinite(plan.totalCaptures)).toBe(true)
        expect(plan.totalCaptures).toBeGreaterThan(0)
      }
    }
  })

  test('without cloning, a colour never costs less than either of its own parents', () => {
    const withoutCloning = CONFIGS.filter((config) => !config.cloning)
    expect(withoutCloning.length).toBeGreaterThan(0)

    for (const config of withoutCloning) {
      for (const color of DRAGOTURKEY_COLORS) {
        if (!color.crosses) continue
        const plan = computePlan(color.id, 1, config)
        if (!plan) throw new Error('expected a plan')

        for (const parentId of color.crosses.flat()) {
          const parentPlan = computePlan(parentId, 1, config)
          if (!parentPlan) throw new Error('expected a plan')
          expect(plan.totalMatings).toBeGreaterThanOrEqual(parentPlan.totalMatings - 1e-9)
          expect(plan.totalCaptures).toBeGreaterThanOrEqual(parentPlan.totalCaptures - 1e-9)
        }
      }
    }
  })

  test('with cloning, crossing an expensive parent with a wild colour can cost less', () => {
    // BRIEF-phase-2.md section 5 asks for "deeper targets never require fewer
    // resources than their own parents". That holds without cloning, but is
    // provably false *with* cloning, which is why the assertion above is scoped
    // to cloning-off configurations.
    //
    // Crimson+Ginger (gen 6) = Crimson (gen 5) x Ginger (gen 1). Cloning refunds
    // half of the expensive Crimson that the mating spent, while Ginger is a
    // free wild capture — so the gen-6 colour lands cheaper than its own gen-5
    // parent. This is assumption 4 ("cloning is amortised, slightly optimistic
    // for small plans") showing up structurally, not a defect. Pinned here so
    // the behaviour can never change silently. See docs/DECISIONS.md.
    const config = settings({ ...GUARANTEED, cloning: true })
    const child = computePlan('crimson-ginger', 1, config)
    const parent = computePlan('crimson', 1, config)
    if (!child || !parent) throw new Error('expected plans')

    expect(child.totalMatings).toBe(2.5)
    expect(parent.totalMatings).toBe(3)
    expect(child.totalMatings).toBeLessThan(parent.totalMatings)

    // Captures stay flat at 1.0 per mount when p = 1: each mating consumes 0.5
    // of each parent colour, so the weights sum to exactly 1 at every level.
    expect(child.totalCaptures).toBe(1)
    expect(parent.totalCaptures).toBe(1)
  })

  test('increasing p never increases any count', () => {
    const low = settings({ parentLevel: 1, optimakina: false, cloning: false })
    const high = settings({ ...GUARANTEED, cloning: false })
    expect(planChance(high)).toBeGreaterThan(planChance(low))

    for (const color of DRAGOTURKEY_COLORS) {
      const lowPlan = computePlan(color.id, 1, low)
      const highPlan = computePlan(color.id, 1, high)
      if (!lowPlan || !highPlan) throw new Error('expected plans')

      expect(highPlan.totalMatings).toBeLessThanOrEqual(lowPlan.totalMatings + 1e-9)
      expect(highPlan.totalCaptures).toBeLessThanOrEqual(lowPlan.totalCaptures + 1e-9)
      for (const entry of highPlan.colors) {
        expect(entry.expected).toBeLessThanOrEqual(expectedFor(lowPlan, entry.colorId) + 1e-9)
      }
    }
  })

  test('enabling cloning never increases any count', () => {
    const off = settings({ parentLevel: 100, optimakina: true, cloning: false })
    const on = settings({ parentLevel: 100, optimakina: true, cloning: true })

    for (const color of DRAGOTURKEY_COLORS) {
      const offPlan = computePlan(color.id, 1, off)
      const onPlan = computePlan(color.id, 1, on)
      if (!offPlan || !onPlan) throw new Error('expected plans')

      expect(onPlan.totalMatings).toBeLessThanOrEqual(offPlan.totalMatings + 1e-9)
      expect(onPlan.totalCaptures).toBeLessThanOrEqual(offPlan.totalCaptures + 1e-9)
      for (const entry of onPlan.colors) {
        expect(entry.expected).toBeLessThanOrEqual(expectedFor(offPlan, entry.colorId) + 1e-9)
      }
    }
  })

  test('every planned colour is an ancestor of the target, or the target itself', () => {
    for (const color of DRAGOTURKEY_COLORS) {
      const plan = computePlan(color.id, 1, settings())
      if (!plan) throw new Error('expected a plan')
      for (const entry of plan.colors) {
        expect(entry.generation).toBeLessThanOrEqual(color.generation)
      }
    }
  })
})

describe('computePlan — genetokens', () => {
  test('a generation-1 target earns nothing', () => {
    const plan = computePlan('golden', 1, settings())
    expect(plan?.genetokens).toBe(0)
  })

  test('one guaranteed Indigo earns 1 gen-2 pair plus 2 gen-1 pairs', () => {
    // Indigo from two gen-2 parents: 2 + 2 = 4 tokens.
    // Each gen-2 colour from two gen-1 parents: 1 + 1 = 2 tokens.
    // Cloning off, so both gen-2 colours are needed once each: 4 + 2 + 2 = 8.
    const plan = computePlan('indigo', 1, settings({ ...GUARANTEED, cloning: false }))
    expect(plan?.genetokens).toBe(8)
  })
})
