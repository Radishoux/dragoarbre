import { describe, expect, test } from 'bun:test'
import { DRAGOTURKEY_COLORS } from './colors'
import { getAncestorIds, getChildrenIds, getColorById, getLineageIds } from './index'
import { DRAGOTURKEY_SPECIALS } from './specials'

const EXPECTED_COUNTS_BY_GENERATION: Record<number, number> = {
  1: 3,
  2: 3,
  3: 2,
  4: 7,
  5: 2,
  6: 11,
  7: 2,
  8: 15,
  9: 2,
  10: 19,
}

describe('Dragoturkey data integrity', () => {
  test('has exactly 66 colors total', () => {
    expect(DRAGOTURKEY_COLORS.length).toBe(66)
  })

  test('has the correct color count per generation', () => {
    for (const [generation, expectedCount] of Object.entries(EXPECTED_COUNTS_BY_GENERATION)) {
      const actual = DRAGOTURKEY_COLORS.filter(
        (color) => color.generation === Number(generation),
      ).length
      expect(actual).toBe(expectedCount)
    }
  })

  test('has unique ids', () => {
    const ids = DRAGOTURKEY_COLORS.map((color) => color.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every cross references existing ids of strictly lower generation', () => {
    for (const color of DRAGOTURKEY_COLORS) {
      if (!color.cross) continue
      for (const parentId of color.cross) {
        const parent = getColorById(parentId)
        expect(parent).toBeDefined()
        expect(parent!.generation).toBeLessThan(color.generation)
      }
    }
  })

  test('generation 1 entries are wild-captured with no cross', () => {
    for (const color of DRAGOTURKEY_COLORS.filter((c) => c.generation === 1)) {
      expect(color.wildCapture).toBe(true)
      expect(color.cross).toBeUndefined()
    }
  })

  test('every non-generation-1 color has exactly one cross of two parents', () => {
    for (const color of DRAGOTURKEY_COLORS.filter((c) => c.generation > 1)) {
      expect(color.cross).toBeDefined()
      expect(color.cross).toHaveLength(2)
      expect(color.wildCapture).toBeUndefined()
    }
  })

  test('even generations are bicolor, odd generations are mono', () => {
    for (const color of DRAGOTURKEY_COLORS) {
      const expectedKind = color.generation % 2 === 0 ? 'bicolor' : 'mono'
      expect(color.kind).toBe(expectedKind)
    }
  })

  test('has exactly 2 special mounts, outside the breeding tree', () => {
    expect(DRAGOTURKEY_SPECIALS.length).toBe(2)
  })
})

describe('derived indices', () => {
  test('getChildrenIds finds both crosses a color participates in', () => {
    expect(getChildrenIds('almond')).toEqual(
      expect.arrayContaining(['almond-ginger', 'almond-golden']),
    )
  })

  test('getAncestorIds walks the full lineage back to generation 1', () => {
    const ancestors = getAncestorIds('ebony')
    expect(ancestors).toEqual(
      expect.arrayContaining(['almond-golden', 'golden-ginger', 'almond', 'golden', 'ginger']),
    )
  })

  test('getLineageIds includes the color itself plus its ancestors', () => {
    const lineage = getLineageIds('crimson-ginger')
    expect(lineage).toContain('crimson-ginger')
    expect(lineage).toContain('ebony-indigo')
    expect(lineage).toContain('almond')
  })
})
