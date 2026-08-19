import { describe, expect, test } from 'bun:test'
import {
  ALL_COLORS,
  buildSpecies,
  DRAGOTURKEY_COLORS,
  getColorById,
  getLineageIds,
  type MonoSpec,
  type MountColor,
  RHINEETLE_COLORS,
  SEEMYOOL_COLORS,
  type SpeciesInfo,
} from '../data'
import {
  type BreedingPlan,
  birthsPerMating,
  cheapestLineageIds,
  computePlan,
  DEFAULT_PLANNER_SETTINGS,
  findRecipeCollisions,
  type PlannerSettings,
  parentConsumptionFactor,
  planChance,
  type RecipeChoice,
  rankAllRecipes,
  rankRecipes,
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

// ---------------------------------------------------------------------------
// Phase 3: multi-recipe colours, the p/k split rule and species scoping.
// ---------------------------------------------------------------------------

const synthetic = (stat: 'agility' | 'strength' | 'dodge' | 'chance' | 'lock', value: number) =>
  ({ stat, value, unit: 'flat' }) as const

const SYNTHETIC_INFO: SpeciesInfo = {
  id: 'seemyool',
  singular: { fr: 'Muldo', en: 'Seemyool' },
  commonBonusTiers: [{ fromLevel: 100, bonus: synthetic('agility', 1) }],
  wildCapture: { fr: 'Bassin des Muldos', en: 'Seemyool Basin' },
}

const EBONY: MonoSpec = {
  id: 'ebony',
  generation: 1,
  name: { fr: 'Ébène', en: 'Ebony' },
  bonuses: [synthetic('agility', 90)],
  component: [synthetic('agility', 70)],
}

const CRIMSON: MonoSpec = {
  id: 'crimson',
  generation: 1,
  name: { fr: 'Pourpre', en: 'Crimson' },
  bonuses: [synthetic('strength', 90)],
  component: [synthetic('strength', 70)],
}

/** The recipe both colliding monos below are bred from: one bicolor, one mono. */
const SHARED_RECIPE = [['ebony', 'crimson'], 'ebony'] as const

/**
 * A stand-in species whose two generation-3 monocolors are produced by the
 * *same* parent pair — the `k = 2` case the split rule exists for.
 *
 * `BRIEF-phase-3.md` section 7 claims the real data has no such pair, and
 * `findRecipeCollisions` proves it below. This fixture is how the `k > 1`
 * branch stays tested anyway, so a future data correction that introduces a
 * collision meets code that already handles it.
 */
const COLLIDING: MountColor[] = buildSpecies(SYNTHETIC_INFO, [
  EBONY,
  CRIMSON,
  {
    id: 'almond',
    generation: 3,
    name: { fr: 'Amande', en: 'Almond' },
    bonuses: [synthetic('dodge', 50)],
    component: [synthetic('dodge', 40)],
    recipes: [SHARED_RECIPE],
  },
  {
    id: 'indigo',
    generation: 3,
    name: { fr: 'Indigo', en: 'Indigo' },
    bonuses: [synthetic('chance', 50)],
    component: [synthetic('chance', 40)],
    recipes: [SHARED_RECIPE],
  },
])

/** The same shared pair, but with its two children at different generations. */
const STAGGERED: MountColor[] = buildSpecies(SYNTHETIC_INFO, [
  EBONY,
  CRIMSON,
  {
    id: 'almond',
    generation: 3,
    name: { fr: 'Amande', en: 'Almond' },
    bonuses: [synthetic('dodge', 50)],
    component: [synthetic('dodge', 40)],
    recipes: [SHARED_RECIPE],
  },
  {
    id: 'ivory',
    generation: 5,
    name: { fr: 'Ivoire', en: 'Ivory' },
    bonuses: [synthetic('lock', 50)],
    component: [synthetic('lock', 40)],
    recipes: [SHARED_RECIPE],
  },
])

describe('findRecipeCollisions', () => {
  test('the shipped data has none, which is what makes k = 1 everywhere', () => {
    expect(findRecipeCollisions()).toEqual([])
  })

  test('defaults to all three species', () => {
    expect(findRecipeCollisions()).toEqual(findRecipeCollisions(ALL_COLORS))
  })

  test('reports a pair producing two colours of the same generation', () => {
    expect(findRecipeCollisions(COLLIDING)).toEqual([
      {
        parentAId: 'seemyool-crimson-ebony',
        parentBId: 'seemyool-ebony',
        generation: 3,
        childIds: ['seemyool-almond', 'seemyool-indigo'],
      },
    ])
  })

  test('the same pair feeding two different generations is not a collision', () => {
    // k counts colours competing for one target-generation pool. Two children
    // at different generations never compete, so neither probability splits.
    expect(findRecipeCollisions(STAGGERED)).toEqual([])
  })
})

describe('rankAllRecipes', () => {
  const rankings = rankAllRecipes(DEFAULT_PLANNER_SETTINGS)

  test('scores every colour of all three species', () => {
    expect(rankings.size).toBe(ALL_COLORS.length)
    for (const color of ALL_COLORS) expect(rankings.has(color.id)).toBe(true)
  })

  test('options are cheapest-first, with chosen and alternatives derived from them', () => {
    for (const ranking of rankings.values()) {
      const costs = ranking.options.map((option: RecipeChoice) => option.captureCost)
      expect([...costs].sort((a, b) => a - b)).toEqual(costs)
      expect(ranking.chosen).toEqual(ranking.options[0] ?? null)
      expect(ranking.alternatives).toEqual(ranking.options.slice(1))
      expect(ranking.captureCost).toBeCloseTo(ranking.chosen?.captureCost ?? 1, 9)
    }
  })

  test('a wild-caught colour has no recipe and costs exactly one capture', () => {
    const almond = rankings.get('almond')
    expect(almond?.options).toEqual([])
    expect(almond?.chosen).toBeNull()
    expect(almond?.captureCost).toBe(1)
  })

  test('the 12 recipeless colours are exactly the generation-1 ones', () => {
    const wild = [...rankings.values()].filter((ranking) => ranking.chosen === null)
    expect(wild.length).toBe(12)
    for (const ranking of wild) {
      expect(getColorById(ranking.colorId)?.generation).toBe(1)
    }
  })

  test('every Dragoturkey colour still has one recipe and no alternatives', () => {
    for (const color of DRAGOTURKEY_COLORS) {
      const ranking = rankings.get(color.id)
      expect(ranking?.options.length).toBe(color.generation === 1 ? 0 : 1)
      expect(ranking?.alternatives).toEqual([])
    }
  })

  test('a 12-recipe Rhineetle ranks its two cost tiers in order', () => {
    const plum = rankings.get('rhineetle-plum')
    expect(plum?.options.length).toBe(12)
    const costs = plum?.options.map((option: RecipeChoice) => option.captureCost) ?? []
    // Eight recipes reach Plum through the cheaper tier, four through the dearer.
    expect(costs.filter((cost) => cost < 4).length).toBe(8)
    expect(costs[0]).toBeCloseTo(3.633902541, 9)
    expect(costs[11]).toBeCloseTo(4.164931279, 9)
    expect(plum?.alternatives.length).toBe(11)
  })

  test('exact ties break on the ordered parent pair, not on storage order', () => {
    // All six Seemyool Ginger recipes cost the same, so only the tie-break
    // decides, and it picks index 1 which storage order never would.
    const ginger = rankings.get('seemyool-ginger')
    const costs = ginger?.options.map((option: RecipeChoice) => option.captureCost) ?? []
    expect(new Set(costs).size).toBe(1)
    expect(ginger?.chosen?.index).toBe(1)
    expect(ginger?.chosen?.parentAId).toBe('seemyool-crimson-golden')
    expect(ginger?.chosen?.parentBId).toBe('seemyool-ebony-golden')

    const keys = (ginger?.options ?? []).map((option: RecipeChoice) =>
      [option.parentAId, option.parentBId].sort().join('|'),
    )
    expect([...keys].sort()).toEqual(keys)
  })

  test('the ranking is deterministic across calls', () => {
    expect(rankAllRecipes(DEFAULT_PLANNER_SETTINGS)).toEqual(rankings)
  })

  test('at p = 1 with cloning every colour costs exactly one capture', () => {
    // f / p = 0.5 exactly offsets the two parents a mating consumes, so depth
    // stops costing anything. Documented in rankAllRecipes and DECISIONS.md as
    // a consequence of amortised cloning, not a bug, and pinned here so it
    // cannot change silently.
    const cheap = rankAllRecipes(settings({ ...GUARANTEED, cloning: true }))
    for (const ranking of cheap.values()) expect(ranking.captureCost).toBe(1)
  })

  test('without cloning, depth costs more', () => {
    const dear = rankAllRecipes(settings({ ...GUARANTEED, cloning: false }))
    expect(dear.get('almond')?.captureCost).toBe(1)
    expect(dear.get('indigo')?.captureCost).toBe(4)
  })

  test('scoping to one species scores only that species, at the same cost', () => {
    const scoped = rankAllRecipes(DEFAULT_PLANNER_SETTINGS, SEEMYOOL_COLORS)
    expect(scoped.size).toBe(SEEMYOOL_COLORS.length)
    expect(scoped.has('indigo')).toBe(false)
    // Recipes never cross species, so scoping changes no score.
    expect(scoped.get('seemyool-ginger')?.captureCost).toBe(
      rankings.get('seemyool-ginger')?.captureCost,
    )
  })
})

describe('rankRecipes', () => {
  test('returns the same ranking rankAllRecipes has for that colour', () => {
    const all = rankAllRecipes(DEFAULT_PLANNER_SETTINGS)
    for (const id of ['almond', 'indigo', 'seemyool-ginger', 'rhineetle-plum']) {
      expect(rankRecipes(id, DEFAULT_PLANNER_SETTINGS)).toEqual(all.get(id) ?? null)
    }
  })

  test('an unknown colour ranks to null', () => {
    expect(rankRecipes('not-a-colour', DEFAULT_PLANNER_SETTINGS)).toBeNull()
  })

  test('a colour outside the scoped set ranks to null', () => {
    expect(rankRecipes('indigo', DEFAULT_PLANNER_SETTINGS, SEEMYOOL_COLORS)).toBeNull()
  })
})

describe('computePlan — the p/k split rule', () => {
  const guaranteed = settings({ ...GUARANTEED, cloning: false })

  test('a shared pair halves the chance even when p is 1', () => {
    expect(planChance(guaranteed)).toBe(1)
    const ranking = rankRecipes('seemyool-almond', guaranteed, COLLIDING)
    expect(ranking?.chosen?.split).toBe(2)
    expect(ranking?.chosen?.successesPerMating).toBe(0.5)
  })

  test('and doubles the matings the plan asks for', () => {
    const plan = computePlan('seemyool-almond', 1, guaranteed, COLLIDING)
    const pair = plan?.pairs.find((entry) => entry.childId === 'seemyool-almond')
    expect(pair?.split).toBe(2)
    expect(pair?.successesPerMating).toBe(0.5)
    // One success at p/k = 0.5 costs two matings, not the one p alone buys.
    expect(pair?.matings).toBe(2)
    expect(pair?.successes).toBe(1)
    // Those 2 matings each spend one bicolor and one Ebony; the bicolor itself
    // costs 2 more matings, for 4 Ebony + 2 Crimson captured.
    expect(plan?.totalMatings).toBe(4)
    expect(plan?.totalCaptures).toBe(6)
  })

  test('k is 1 for every pair in the shipped data', () => {
    for (const color of ALL_COLORS) {
      const plan = computePlan(color.id, 1, DEFAULT_PLANNER_SETTINGS)
      for (const pair of plan?.pairs ?? []) expect(pair.split).toBe(1)
    }
  })
})

describe('computePlan — multi-recipe colours and species scoping', () => {
  test('the plan breeds through the recipe the ranking chose', () => {
    const plan = computePlan('rhineetle-plum', 1, DEFAULT_PLANNER_SETTINGS)
    const pair = plan?.pairs.find((entry) => entry.childId === 'rhineetle-plum')
    const chosen = rankRecipes('rhineetle-plum', DEFAULT_PLANNER_SETTINGS)?.chosen
    expect(pair?.parentAId).toBe(chosen?.parentAId ?? '')
    expect(pair?.parentBId).toBe(chosen?.parentBId ?? '')
    expect(pair?.recipeIndex).toBe(chosen?.index ?? -1)
  })

  test('and carries the 11 recipes it did not use, cheapest first', () => {
    const plan = computePlan('rhineetle-plum', 1, DEFAULT_PLANNER_SETTINGS)
    const pair = plan?.pairs.find((entry) => entry.childId === 'rhineetle-plum')
    const costs = (pair?.alternatives ?? []).map((option: RecipeChoice) => option.captureCost)
    expect(costs.length).toBe(11)
    expect([...costs].sort((a, b) => a - b)).toEqual(costs)
  })

  test('a single-recipe colour has no alternatives', () => {
    const plan = computePlan('indigo', 1, DEFAULT_PLANNER_SETTINGS)
    for (const pair of plan?.pairs ?? []) expect(pair.alternatives).toEqual([])
  })

  test('scoping to one species gives the identical plan', () => {
    for (const [id, scope] of [
      ['seemyool-ginger', SEEMYOOL_COLORS],
      ['rhineetle-plum', RHINEETLE_COLORS],
    ] as const) {
      const wide = computePlan(id, 1, DEFAULT_PLANNER_SETTINGS)
      const scoped = computePlan(id, 1, DEFAULT_PLANNER_SETTINGS, scope)
      expect(scoped).toEqual(wide)
    }
  })

  test('a target from another species is unplannable in a scoped set', () => {
    expect(computePlan('indigo', 1, DEFAULT_PLANNER_SETTINGS, SEEMYOOL_COLORS)).toBeNull()
    expect(computePlan('seemyool-ginger', 1, DEFAULT_PLANNER_SETTINGS, RHINEETLE_COLORS)).toBeNull()
  })

  test('every one of the 306 colours plans without error, within its own species', () => {
    const configs: PlannerSettings[] = [
      settings({ ...GUARANTEED, cloning: false }),
      settings({ ...GUARANTEED, cloning: true }),
      settings({ parentLevel: 1, optimakina: false, cloning: false }),
      DEFAULT_PLANNER_SETTINGS,
    ]
    for (const config of configs) {
      for (const color of ALL_COLORS) {
        const plan: BreedingPlan | null = computePlan(color.id, 1, config)
        expect(plan).not.toBeNull()
        if (!plan) continue
        expect(Number.isFinite(plan.totalMatings)).toBe(true)
        expect(plan.totalCaptures).toBeGreaterThan(0)
        // A plan never reaches outside the target's own species.
        for (const entry of plan.colors) {
          expect(getColorById(entry.colorId)?.species).toBe(color.species)
        }
      }
    }
  })
})

describe('cheapestLineageIds', () => {
  const rankings = rankAllRecipes(DEFAULT_PLANNER_SETTINGS)

  test('a wild-caught colour is its own whole lineage', () => {
    expect(cheapestLineageIds('almond', rankings)).toEqual(['almond'])
  })

  test('an unknown colour yields just itself, rather than throwing', () => {
    expect(cheapestLineageIds('not-a-colour', rankings)).toEqual(['not-a-colour'])
  })

  test('it walks parents before grandparents', () => {
    expect(cheapestLineageIds('indigo', rankings)).toEqual([
      'indigo',
      'almond-golden',
      'almond-ginger',
      'almond',
      'golden',
      'ginger',
    ])
  })

  test('with one recipe per colour it matches the union walk exactly', () => {
    // Every Dragoturkey colour has a single recipe, so "cheapest path" and
    // "every path" are the same set — phase 1 highlighting is unchanged.
    for (const color of DRAGOTURKEY_COLORS) {
      expect(new Set(cheapestLineageIds(color.id, rankings))).toEqual(
        new Set(getLineageIds(color.id)),
      )
    }
  })

  test('with several recipes it is a strict subset of the union walk', () => {
    // Rhineetle Plum has 12 recipes: 28 colours are reachable through some
    // recipe, but only 11 through the cheapest one. Highlighting the union
    // would light up most of the species.
    const cheapest = cheapestLineageIds('rhineetle-plum', rankings)
    const every = getLineageIds('rhineetle-plum')
    expect(cheapest.length).toBe(11)
    expect(every.length).toBe(28)
    for (const id of cheapest) expect(every).toContain(id)
  })

  test('it is exactly the colour set the plan touches, for all 306 colours', () => {
    // The tree highlights what the planner would actually breed. If these ever
    // diverged, the diagram would be showing a path the plan does not take.
    for (const color of ALL_COLORS) {
      const plan = computePlan(color.id, 1, DEFAULT_PLANNER_SETTINGS)
      const planned = new Set((plan?.colors ?? []).map((entry) => entry.colorId))
      expect(new Set(cheapestLineageIds(color.id, rankings))).toEqual(planned)
    }
  })

  test('it follows the settings, because the ranking does', () => {
    // Cloning off flips which recipes are cheapest for some colours, and the
    // highlighted lineage has to follow rather than being pinned to a default.
    const noCloning = rankAllRecipes(settings({ ...GUARANTEED, cloning: false }))
    for (const color of ALL_COLORS) {
      const plan = computePlan(color.id, 1, settings({ ...GUARANTEED, cloning: false }))
      const planned = new Set((plan?.colors ?? []).map((entry) => entry.colorId))
      expect(new Set(cheapestLineageIds(color.id, noCloning))).toEqual(planned)
    }
  })
})

describe('birthsPerMating', () => {
  test('Reproducteur turns one baby per mating into two', () => {
    expect(birthsPerMating(true)).toBe(2)
    expect(birthsPerMating(false)).toBe(1)
  })

  test('is off by default, so phase 3 plans are unchanged', () => {
    expect(DEFAULT_PLANNER_SETTINGS.reproducteur).toBe(false)
    expect(DEFAULT_PLANNER_SETTINGS.captureNet).toBe('universal')
  })
})

describe('computePlan — Reproducteur', () => {
  const plain = settings({ ...GUARANTEED, cloning: false })
  const repro = settings({ ...GUARANTEED, cloning: false, reproducteur: true })

  test('doubles the expected successes of every mating', () => {
    expect(planChance(repro)).toBe(1)
    const pair = computePlan('indigo', 1, repro)?.pairs.find((p) => p.childId === 'indigo')
    expect(pair?.successesPerMating).toBe(2)
    // Half a mating per Indigo, which is an expectation like every other
    // count here — two babies from one mating, both target-generation at p = 1.
    expect(pair?.matings).toBe(0.5)
  })

  test('the matings-per-baby headline halves too, instead of ignoring births', () => {
    // This one shipped wrong: the headline was 1 / p and ignored births, so it
    // read identically with the capacity on and off while every total beneath
    // it halved — the planner contradicting itself on one screen.
    const before = computePlan('indigo', 1, plain)
    const after = computePlan('indigo', 1, repro)
    expect(after?.expectedMatingsPerSuccess).toBeCloseTo(
      (before?.expectedMatingsPerSuccess ?? 0) / 2,
      9,
    )
  })

  test('it agrees with what the target pair actually costs', () => {
    // With split = 1, matings per baby is exactly the inverse of one pair's
    // successes per mating. If these two ever disagree, one of them is lying.
    for (const config of [plain, repro, DEFAULT_PLANNER_SETTINGS]) {
      const plan = computePlan('indigo', 1, config)
      const pair = plan?.pairs.find((entry) => entry.childId === 'indigo')
      expect(pair?.split).toBe(1)
      expect(plan?.expectedMatingsPerSuccess).toBeCloseTo(1 / (pair?.successesPerMating ?? 1), 9)
    }
  })

  test('halves the Indigo reference vector', () => {
    // Without it: 3 matings, capturing 2 Almond + 1 Golden + 1 Ginger.
    const before = computePlan('indigo', 1, plain)
    expect(before?.totalMatings).toBe(3)
    expect(before?.totalCaptures).toBe(4)

    const after = computePlan('indigo', 1, repro)
    expect(after?.totalMatings).toBe(1)
    expect(after?.totalCaptures).toBe(1)
  })

  test('the safe counts do not halve, because each still rounds up', () => {
    // 0.5 + 0.25 + 0.25 expected mounts ceil to 1 + 1 + 1.
    expect(computePlan('indigo', 1, repro)?.totalCapturesSafe).toBe(3)
  })

  test('never increases any count, for any colour', () => {
    for (const color of ALL_COLORS) {
      const before = computePlan(color.id, 1, plain)
      const after = computePlan(color.id, 1, repro)
      if (!before || !after) continue
      expect(after.totalMatings).toBeLessThanOrEqual(before.totalMatings)
      expect(after.totalCaptures).toBeLessThanOrEqual(before.totalCaptures)
    }
  })

  test('at p = 1 without cloning it reaches the same degenerate tie cloning does', () => {
    // The driver is f / (p * births / k). Cloning halves f; Reproducteur
    // doubles births. Either way the ratio hits 0.5 and depth stops costing
    // anything, so every colour costs exactly one capture. Same structural
    // consequence, recorded in DECISIONS.md under the cloning entry.
    const ranked = rankAllRecipes(repro)
    for (const ranking of ranked.values()) expect(ranking.captureCost).toBe(1)
  })
})

describe('computePlan — capture nets', () => {
  const universal = settings({ ...GUARANTEED, cloning: false })
  const multiplier = settings({ ...GUARANTEED, cloning: false, captureNet: 'multiplier' })

  test('a universal net needs one fight per mount', () => {
    for (const color of ALL_COLORS) {
      const plan = computePlan(color.id, 1, universal)
      if (!plan) continue
      expect(plan.captureFights).toBe(plan.totalCapturesSafe)
    }
  })

  test('a multiplier net halves the trips, rounded up per colour', () => {
    // Indigo needs 2 Almond + 1 Golden + 1 Ginger. The duplicate only helps
    // where two of the same colour are wanted: 1 + 1 + 1 = 3 fights, not 2.
    const plan = computePlan('indigo', 1, multiplier)
    expect(plan?.totalCapturesSafe).toBe(4)
    expect(plan?.captureFights).toBe(3)
    expect(plan?.captures.map((entry) => entry.safe)).toEqual([2, 1, 1])
  })

  test('it never costs more fights than a universal net, and never more than mounts', () => {
    for (const color of ALL_COLORS) {
      const plain = computePlan(color.id, 1, universal)
      const netted = computePlan(color.id, 1, multiplier)
      if (!plain || !netted) continue
      expect(netted.captureFights).toBeLessThanOrEqual(plain.captureFights)
      expect(netted.captureFights).toBeLessThanOrEqual(netted.totalCapturesSafe)
    }
  })

  test('the net changes no mount count and no recipe choice', () => {
    // It is a reporting concern: it changes how many trips the mounts take,
    // not how many mounts the plan needs, so it must not move the ranking.
    for (const color of ALL_COLORS) {
      const plain = computePlan(color.id, 1, universal)
      const netted = computePlan(color.id, 1, multiplier)
      expect(netted?.totalCaptures).toBe(plain?.totalCaptures ?? 0)
      expect(netted?.totalMatings).toBe(plain?.totalMatings ?? 0)
      expect(netted?.pairs.map((p) => p.recipeIndex)).toEqual(
        plain?.pairs.map((p) => p.recipeIndex) ?? [],
      )
    }
  })
})
