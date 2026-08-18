import { describe, expect, test } from 'bun:test'
import { expectedMatingsForTargetGeneration, targetGenerationChance } from './breeding'

describe('targetGenerationChance', () => {
  test('two level-200 parents give a 90% chance', () => {
    expect(targetGenerationChance({ parentALevel: 200, parentBLevel: 200 })).toBeCloseTo(0.9)
  })

  test('an Optimakina pushes two level-200 parents to a 100% chance', () => {
    expect(targetGenerationChance({ parentALevel: 200, parentBLevel: 200, optimakina: true })).toBe(
      1,
    )
  })

  test('is capped at 100% even when bonuses would exceed it', () => {
    expect(
      targetGenerationChance({
        parentALevel: 200,
        parentBLevel: 200,
        optimakina: true,
        almanaxTakeza: true,
      }),
    ).toBe(1)
  })

  test('two level-1 parents give the base 30% chance', () => {
    expect(targetGenerationChance({ parentALevel: 1, parentBLevel: 1 })).toBeCloseTo(0.3003)
  })
})

describe('expectedMatingsForTargetGeneration', () => {
  test('is the inverse of the chance', () => {
    expect(expectedMatingsForTargetGeneration(0.9)).toBeCloseTo(1.111, 3)
  })

  test('is infinite for a zero chance', () => {
    expect(expectedMatingsForTargetGeneration(0)).toBe(Number.POSITIVE_INFINITY)
  })
})
