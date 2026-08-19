/**
 * Confidence sampling.
 *
 * The properties worth pinning are the ones a reader would assume without
 * checking: that the figure is reproducible, that a higher confidence never
 * asks for less, and that a sampled plan is never cheaper than the expectation
 * it sits next to.
 */

import { describe, expect, test } from 'bun:test'
import { ALL_COLORS, DRAGOTURKEY_COLORS, getColorById } from '../data'
import {
  DEFAULT_CONFIDENCE_PERCENTILE,
  DEFAULT_CONFIDENCE_SAMPLES,
  samplePlanConfidence,
} from './confidence'
import { computePlan, DEFAULT_PLANNER_SETTINGS, type PlannerSettings } from './planner'

const S = DEFAULT_PLANNER_SETTINGS
/** Small sample counts keep the suite fast; the properties hold at any size. */
const FAST = { samples: 400 }

function settings(overrides: Partial<PlannerSettings> = {}): PlannerSettings {
  return { ...DEFAULT_PLANNER_SETTINGS, ...overrides }
}

describe('samplePlanConfidence — contract', () => {
  test('an unknown colour samples to null', () => {
    expect(samplePlanConfidence('not-a-colour', 1, S, FAST)).toBeNull()
  })

  test('it echoes the sample count and percentile it used', () => {
    const result = samplePlanConfidence('indigo', 1, S)
    expect(result?.samples).toBe(DEFAULT_CONFIDENCE_SAMPLES)
    expect(result?.percentile).toBe(DEFAULT_CONFIDENCE_PERCENTILE)
  })

  test('nonsensical options are clamped rather than trusted', () => {
    const low = samplePlanConfidence('indigo', 1, S, { samples: 0, percentile: -1 })
    expect(low?.samples).toBe(1)
    expect(low?.percentile).toBeGreaterThan(0)
    const high = samplePlanConfidence('indigo', 1, S, { samples: 10, percentile: 5 })
    expect(high?.percentile).toBeLessThan(1)
  })
})

describe('samplePlanConfidence — determinism', () => {
  test('the same inputs always give the same figure', () => {
    // Seeded on purpose: a confidence number that changed between renders
    // would look broken and could not be asserted here at all.
    expect(samplePlanConfidence('indigo', 1, S, FAST)).toEqual(
      samplePlanConfidence('indigo', 1, S, FAST),
    )
  })

  test('a different seed gives an independent run', () => {
    const a = samplePlanConfidence('rhineetle-plum', 1, S, { ...FAST, seed: 1 })
    const b = samplePlanConfidence('rhineetle-plum', 1, S, { ...FAST, seed: 99 })
    // Same ballpark, not the same numbers — otherwise the seed does nothing.
    expect(a?.captures).toBeGreaterThan(0)
    expect(b?.captures).toBeGreaterThan(0)
    expect(Math.abs((a?.captures ?? 0) - (b?.captures ?? 0))).toBeLessThan(0.5 * (a?.captures ?? 1))
  })
})

describe('samplePlanConfidence — the figures behave like percentiles', () => {
  test('asking for more confidence never asks for fewer mounts', () => {
    for (const id of ['indigo', 'crimson', 'rhineetle-plum', 'seemyool-ginger']) {
      let previousCaptures = 0
      let previousMatings = 0
      for (const percentile of [0.5, 0.75, 0.9, 0.95, 0.99]) {
        const result = samplePlanConfidence(id, 1, S, { ...FAST, percentile })
        expect(result?.captures ?? 0).toBeGreaterThanOrEqual(previousCaptures)
        expect(result?.matings ?? 0).toBeGreaterThanOrEqual(previousMatings)
        previousCaptures = result?.captures ?? 0
        previousMatings = result?.matings ?? 0
      }
    }
  })

  test('wanting more of the target never needs less of anything', () => {
    const one = samplePlanConfidence('indigo', 1, S, FAST)
    const five = samplePlanConfidence('indigo', 5, S, FAST)
    expect(five?.captures ?? 0).toBeGreaterThanOrEqual(one?.captures ?? 0)
    expect(five?.matings ?? 0).toBeGreaterThanOrEqual(one?.matings ?? 0)
  })
})

describe('samplePlanConfidence — against the expected plan', () => {
  test('a sampled plan is never cheaper than the expectation beside it', () => {
    // The point of the feature. If this ever inverted, the confidence figure
    // would be telling players to catch fewer mounts than the average run
    // needs, which is worse than not showing it at all.
    for (const color of DRAGOTURKEY_COLORS) {
      const plan = computePlan(color.id, 1, S)
      const sampled = samplePlanConfidence(color.id, 1, S, FAST)
      if (!plan || !sampled) continue
      expect(sampled.captures).toBeGreaterThanOrEqual(Math.floor(plan.totalCaptures))
    }
  })

  test('it is usually dearer than the expectation, because one run cannot amortise', () => {
    // A deep plan needs at least one mating per colour it touches, where the
    // expectation happily spends 0.21 of one. That gap is the honest content of
    // this feature: the expected figures are optimistic for a single execution.
    const plan = computePlan('rhineetle-plum', 1, S)
    const sampled = samplePlanConfidence('rhineetle-plum', 1, S, { ...FAST, percentile: 0.5 })
    expect(sampled?.matings ?? 0).toBeGreaterThan(plan?.totalMatings ?? 0)
  })
})

describe('samplePlanConfidence — wild targets and per-colour figures', () => {
  test('a generation-1 target is exactly its own capture count, with no matings', () => {
    const result = samplePlanConfidence('almond', 3, S, FAST)
    expect(result?.captures).toBe(3)
    expect(result?.matings).toBe(0)
    expect(result?.capturesByColor).toEqual([{ colorId: 'almond', count: 3 }])
  })

  test('every per-colour entry is a generation-1 colour of the target species', () => {
    for (const id of ['indigo', 'seemyool-ginger', 'rhineetle-plum']) {
      const species = getColorById(id)?.species
      const result = samplePlanConfidence(id, 1, S, FAST)
      expect(result?.capturesByColor.length).toBeGreaterThan(0)
      for (const entry of result?.capturesByColor ?? []) {
        const color = getColorById(entry.colorId)
        expect(color?.generation).toBe(1)
        expect(color?.species).toBe(species)
        expect(entry.count).toBeGreaterThan(0)
      }
    }
  })

  test('it runs for every one of the 306 colours without hanging', () => {
    for (const color of ALL_COLORS) {
      const result = samplePlanConfidence(color.id, 1, S, { samples: 20 })
      expect(result).not.toBeNull()
      expect(Number.isFinite(result?.captures ?? Number.NaN)).toBe(true)
    }
  })
})

describe('samplePlanConfidence — the settings still matter', () => {
  test('Reproducteur reduces the matings a run needs', () => {
    const plain = samplePlanConfidence('rhineetle-plum', 1, settings({ cloning: false }), FAST)
    const repro = samplePlanConfidence(
      'rhineetle-plum',
      1,
      settings({ cloning: false, reproducteur: true }),
      FAST,
    )
    expect(repro?.matings ?? 0).toBeLessThan(plain?.matings ?? 0)
  })

  test('a guaranteed plan has no variance left to sample', () => {
    // At p = 1 every mating succeeds, so every trial is identical and the
    // percentile is the plan itself.
    const guaranteed = settings({ parentLevel: 200, optimakina: true, cloning: false })
    const low = samplePlanConfidence('indigo', 1, guaranteed, { ...FAST, percentile: 0.5 })
    const high = samplePlanConfidence('indigo', 1, guaranteed, { ...FAST, percentile: 0.99 })
    expect(low?.captures).toBe(high?.captures)
    expect(low?.matings).toBe(high?.matings)
  })
})
