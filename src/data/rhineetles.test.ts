import { describe, expect, test } from 'bun:test'
import { RHINEETLE_COLORS, RHINEETLE_MONOS } from './rhineetles'
import { colorId } from './species'
import type { Bonus } from './types'

const id = (bare: string) => colorId('rhineetle', bare)
const byId = new Map(RHINEETLE_COLORS.map((color) => [color.id, color]))

const EXPECTED_COUNTS_BY_GENERATION: Record<number, number> = {
  1: 4,
  2: 6,
  3: 4,
  4: 22,
  5: 2,
  6: 17,
  7: 1,
  8: 10,
  9: 4,
  10: 50,
}

// Brief order: Roux, Amande, Ivoire, Turquoise, Prune, Emeraude, Dore, Jade,
// Rubis, Saphir, Amethyste.
const EXPECTED_RECIPE_COUNTS: Array<[string, number]> = [
  ['ginger', 3],
  ['almond', 3],
  ['ivory', 3],
  ['turquoise', 3],
  ['plum', 12],
  ['emerald', 12],
  ['golden', 8],
  ['jade', 2],
  ['ruby', 2],
  ['sapphire', 2],
  ['amethyst', 2],
]

/** Merges two bonus lists the same way `buildSpecies`'s `mergeComponents` does. */
function mergeExpected(a: readonly Bonus[], b: readonly Bonus[]): Bonus[] {
  const merged: Bonus[] = []
  for (const bonus of [...a, ...b]) {
    const existing = merged.find((entry) => entry.stat === bonus.stat && entry.unit === bonus.unit)
    if (existing) existing.value += bonus.value
    else merged.push({ ...bonus })
  }
  return merged
}

describe('Rhineetle data integrity', () => {
  test('has exactly 120 colors: 15 mono, 105 bicolor', () => {
    expect(RHINEETLE_COLORS).toHaveLength(120)
    expect(RHINEETLE_COLORS.filter((c) => c.kind === 'mono')).toHaveLength(15)
    expect(RHINEETLE_COLORS.filter((c) => c.kind === 'bicolor')).toHaveLength(105)
  })

  test('has the correct color count per generation', () => {
    for (const [generation, expectedCount] of Object.entries(EXPECTED_COUNTS_BY_GENERATION)) {
      const actual = RHINEETLE_COLORS.filter((c) => c.generation === Number(generation)).length
      expect(actual).toBe(expectedCount)
    }
  })

  test('generation 3 introduces all four monocolors at once (Roux, Amande, Ivoire, Turquoise)', () => {
    const gen3 = RHINEETLE_COLORS.filter((c) => c.generation === 3 && c.kind === 'mono')
    expect(gen3.map((c) => c.id).sort()).toEqual(
      [id('ginger'), id('almond'), id('ivory'), id('turquoise')].sort(),
    )
  })

  test('generation 7 introduces a single monocolor (Dore)', () => {
    const gen7 = RHINEETLE_COLORS.filter((c) => c.generation === 7 && c.kind === 'mono')
    expect(gen7.map((c) => c.id)).toEqual([id('golden')])
  })

  test('has unique ids', () => {
    const ids = RHINEETLE_COLORS.map((color) => color.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every recipe references an existing color of strictly lower generation', () => {
    for (const color of RHINEETLE_COLORS) {
      for (const recipe of color.crosses ?? []) {
        for (const parentId of recipe) {
          const parent = byId.get(parentId)
          expect(parent).toBeDefined()
          expect(parent?.generation).toBeLessThan(color.generation)
        }
      }
    }
  })

  test('generation 1 colors are wild-captured with no recipes', () => {
    for (const color of RHINEETLE_COLORS.filter((c) => c.generation === 1)) {
      expect(color.wildCapture).toBe(true)
      expect(color.crosses).toBeUndefined()
    }
  })

  test('every non-generation-1 color has at least one recipe', () => {
    for (const color of RHINEETLE_COLORS.filter((c) => c.generation > 1)) {
      expect(color.crosses?.length).toBeGreaterThan(0)
      expect(color.wildCapture).toBeUndefined()
    }
  })

  test('odd-generation monocolor recipe counts match the brief exactly', () => {
    for (const [bare, expectedCount] of EXPECTED_RECIPE_COUNTS) {
      const color = byId.get(id(bare))
      expect(color).toBeDefined()
      expect(color?.crosses).toHaveLength(expectedCount)
    }
  })

  test('every bicolor has exactly one recipe of two parents', () => {
    for (const color of RHINEETLE_COLORS.filter((c) => c.kind === 'bicolor')) {
      expect(color.crosses).toHaveLength(1)
      expect(color.crosses?.[0]).toHaveLength(2)
    }
  })

  test('even generations are bicolor, odd generations are mono', () => {
    for (const color of RHINEETLE_COLORS) {
      const expectedKind = color.generation % 2 === 0 ? 'bicolor' : 'mono'
      expect(color.kind).toBe(expectedKind)
    }
  })
})

describe('Rhineetle bicolor structure (BRIEF-phase-3.md section 3)', () => {
  test('every unordered pair of distinct monocolors has exactly one bicolor', () => {
    const monoIds = RHINEETLE_MONOS.map((m) => m.id)
    const expectedPairCount = (monoIds.length * (monoIds.length - 1)) / 2
    const bicolors = RHINEETLE_COLORS.filter((c) => c.kind === 'bicolor')
    expect(bicolors).toHaveLength(expectedPairCount)

    for (let i = 0; i < monoIds.length; i++) {
      for (let j = i + 1; j < monoIds.length; j++) {
        const a = monoIds[i] as string
        const b = monoIds[j] as string
        const match = bicolors.find((bicolor) => {
          const [recipe] = bicolor.crosses ?? []
          if (!recipe) return false
          const parents = new Set(recipe)
          return parents.has(id(a)) && parents.has(id(b)) && parents.size === 2
        })
        expect(match, `no bicolor found for pair {${a}, ${b}}`).toBeDefined()
      }
    }
  })

  test('bicolor generation is max(parent generations) + 1', () => {
    for (const color of RHINEETLE_COLORS.filter((c) => c.kind === 'bicolor')) {
      const [recipe] = color.crosses ?? []
      expect(recipe).toBeDefined()
      const parents = (recipe ?? []).map((parentId) => byId.get(parentId))
      const maxParentGeneration = Math.max(...parents.map((p) => p?.generation ?? 0))
      expect(color.generation).toBe(maxParentGeneration + 1)
    }
  })

  test('bicolor bonuses equal the sum of both monocolors’ bicolor components', () => {
    for (const color of RHINEETLE_COLORS.filter((c) => c.kind === 'bicolor')) {
      const [recipe] = color.crosses ?? []
      expect(recipe).toBeDefined()
      const [aId, bId] = recipe ?? ['', '']
      const aMono = RHINEETLE_MONOS.find((m) => id(m.id) === aId)
      const bMono = RHINEETLE_MONOS.find((m) => id(m.id) === bId)
      expect(aMono).toBeDefined()
      expect(bMono).toBeDefined()
      const expected = mergeExpected(aMono?.component ?? [], bMono?.component ?? [])
      const byStat = (list: readonly Bonus[]) =>
        [...list].sort((x, y) => x.stat.localeCompare(y.stat))
      expect(byStat(color.bonuses)).toEqual(byStat(expected))
    }
  })

  test('a known bicolor carries the summed component values (Amande and Crimson Rhineetle)', () => {
    // Pourpre (component: 70 Force) + Amande (component: 70 Resistances Poussee).
    const almondCrimson = byId.get(id('almond-crimson'))
    expect(almondCrimson?.bonuses).toEqual(
      expect.arrayContaining([
        { stat: 'strength', value: 70, unit: 'flat' },
        { stat: 'pushbackResistance', value: 70, unit: 'flat' },
      ]),
    )
  })
})

describe('Rhineetle monocolor bonuses', () => {
  test('generation 1 monos carry their own (not component) bonus values', () => {
    expect(byId.get(id('ebony'))?.bonuses).toEqual([{ stat: 'agility', value: 90, unit: 'flat' }])
    expect(byId.get(id('indigo'))?.bonuses).toEqual([{ stat: 'chance', value: 90, unit: 'flat' }])
    expect(byId.get(id('crimson'))?.bonuses).toEqual([
      { stat: 'strength', value: 90, unit: 'flat' },
    ])
    expect(byId.get(id('orchid'))?.bonuses).toEqual([
      { stat: 'intelligence', value: 90, unit: 'flat' },
    ])
  })

  test('Dore grants 250 Vitality, distinct from the species common 1 AP bonus', () => {
    expect(byId.get(id('golden'))?.bonuses).toEqual([
      { stat: 'vitality', value: 250, unit: 'flat' },
    ])
  })

  test('the four generation-9 monos carry their 14% elemental resistance bonus', () => {
    expect(byId.get(id('jade'))?.bonuses).toEqual([
      { stat: 'earthResistance', value: 14, unit: '%' },
    ])
    expect(byId.get(id('ruby'))?.bonuses).toEqual([
      { stat: 'fireResistance', value: 14, unit: '%' },
    ])
    expect(byId.get(id('sapphire'))?.bonuses).toEqual([
      { stat: 'waterResistance', value: 14, unit: '%' },
    ])
    expect(byId.get(id('amethyst'))?.bonuses).toEqual([
      { stat: 'airResistance', value: 14, unit: '%' },
    ])
  })
})
