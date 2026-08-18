import { describe, expect, test } from 'bun:test'
import { SEEMYOOL_COLORS, SEEMYOOL_MONOS } from './seemyools'
import { colorId } from './species'
import type { Bonus, MountColor } from './types'

const flat = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: 'flat' })
const pct = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: '%' })

const byId = new Map(SEEMYOOL_COLORS.map((color) => [color.id, color]))
const id = (bare: string) => colorId('seemyool', bare)

/** Finds the one bicolor bred from exactly these two monocolors (bare ids), regardless of stored parent order. */
function findBicolor(monoA: string, monoB: string): MountColor {
  const a = id(monoA)
  const b = id(monoB)
  const match = SEEMYOOL_COLORS.find((color) => {
    if (color.kind !== 'bicolor') return false
    const [recipe] = color.crosses ?? []
    const pair = recipe ?? []
    return (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)
  })
  if (!match) throw new Error(`no bicolor found for ${monoA} + ${monoB}`)
  return match
}

/** Local mirror of `species.ts`'s private `mergeComponents`, so this test does not import an internal. */
function mergeComponents(a: readonly Bonus[], b: readonly Bonus[]): Bonus[] {
  const merged: Bonus[] = []
  for (const bonus of [...a, ...b]) {
    const existing = merged.find((entry) => entry.stat === bonus.stat && entry.unit === bonus.unit)
    if (existing) existing.value += bonus.value
    else merged.push({ ...bonus })
  }
  return merged
}

const EXPECTED_COUNTS_BY_GENERATION: Record<number, number> = {
  1: 5,
  2: 10,
  3: 2,
  4: 11,
  5: 2,
  6: 15,
  7: 2,
  8: 19,
  9: 4,
  10: 50,
}

// Brief order (BRIEF-phase-3.md section 4): Roux, Amande, Ivoire, Turquoise,
// Prune, Emeraude, Ambre, Corail, Azur, Aigue-marine.
const EXPECTED_RECIPE_COUNTS: ReadonlyArray<readonly [string, number]> = [
  ['ginger', 6],
  ['almond', 3],
  ['ivory', 8],
  ['turquoise', 8],
  ['plum', 4],
  ['emerald', 8],
  ['amber', 5],
  ['coral', 5],
  ['azure', 5],
  ['aquamarine', 5],
]

/** The brief's mono table (BRIEF-phase-3.md section 4), transcribed for direct comparison. */
const EXPECTED_MONOS: ReadonlyArray<{
  id: string
  generation: number
  name: { fr: string; en: string }
  bonuses: Bonus[]
  component: Bonus[]
}> = [
  {
    id: 'ebony',
    generation: 1,
    name: { fr: 'Ébène', en: 'Ebony' },
    bonuses: [pct('airResistance', 18)],
    component: [pct('airResistance', 10)],
  },
  {
    id: 'indigo',
    generation: 1,
    name: { fr: 'Indigo', en: 'Indigo' },
    bonuses: [pct('waterResistance', 18)],
    component: [pct('waterResistance', 10)],
  },
  {
    id: 'crimson',
    generation: 1,
    name: { fr: 'Pourpre', en: 'Crimson' },
    bonuses: [pct('earthResistance', 18)],
    component: [pct('earthResistance', 10)],
  },
  {
    id: 'orchid',
    generation: 1,
    name: { fr: 'Orchidée', en: 'Orchid' },
    bonuses: [pct('fireResistance', 18)],
    component: [pct('fireResistance', 10)],
  },
  {
    id: 'golden',
    generation: 1,
    name: { fr: 'Doré', en: 'Golden' },
    bonuses: [flat('power', 70)],
    component: [flat('power', 60)],
  },
  {
    id: 'ginger',
    generation: 3,
    name: { fr: 'Roux', en: 'Ginger' },
    bonuses: [flat('lock', 50)],
    component: [flat('lock', 40)],
  },
  {
    id: 'almond',
    generation: 3,
    name: { fr: 'Amande', en: 'Almond' },
    bonuses: [flat('dodge', 50)],
    component: [flat('dodge', 40)],
  },
  {
    id: 'ivory',
    generation: 5,
    name: { fr: 'Ivoire', en: 'Ivory' },
    bonuses: [flat('apParry', 50)],
    component: [flat('apParry', 40)],
  },
  {
    id: 'turquoise',
    generation: 5,
    name: { fr: 'Turquoise', en: 'Turquoise' },
    bonuses: [flat('mpParry', 50)],
    component: [flat('mpParry', 40)],
  },
  {
    id: 'plum',
    generation: 7,
    name: { fr: 'Prune', en: 'Plum' },
    bonuses: [pct('critical', 12)],
    component: [pct('critical', 8)],
  },
  {
    id: 'emerald',
    generation: 7,
    name: { fr: 'Émeraude', en: 'Emerald' },
    bonuses: [flat('criticalDamage', 40)],
    component: [flat('criticalDamage', 30)],
  },
  {
    id: 'amber',
    generation: 9,
    name: { fr: 'Ambre', en: 'Amber' },
    bonuses: [flat('earthDamage', 40)],
    component: [flat('earthDamage', 30)],
  },
  {
    id: 'coral',
    generation: 9,
    name: { fr: 'Corail', en: 'Coral' },
    bonuses: [flat('fireDamage', 40)],
    component: [flat('fireDamage', 30)],
  },
  {
    id: 'azure',
    generation: 9,
    name: { fr: 'Azur', en: 'Azure' },
    bonuses: [flat('waterDamage', 40)],
    component: [flat('waterDamage', 30)],
  },
  {
    id: 'aquamarine',
    generation: 9,
    name: { fr: 'Aigue-marine', en: 'Aquamarine' },
    bonuses: [flat('airDamage', 40)],
    component: [flat('airDamage', 30)],
  },
]

describe('Seemyool data integrity', () => {
  test('has exactly 120 colors: 15 mono, 105 bicolor', () => {
    expect(SEEMYOOL_COLORS).toHaveLength(120)
    expect(SEEMYOOL_COLORS.filter((color) => color.kind === 'mono')).toHaveLength(15)
    expect(SEEMYOOL_COLORS.filter((color) => color.kind === 'bicolor')).toHaveLength(105)
  })

  test('has exactly 15 declared monocolors', () => {
    expect(SEEMYOOL_MONOS).toHaveLength(15)
  })

  test('has the correct color count per generation', () => {
    for (const [generation, expectedCount] of Object.entries(EXPECTED_COUNTS_BY_GENERATION)) {
      const actual = SEEMYOOL_COLORS.filter(
        (color) => color.generation === Number(generation),
      ).length
      expect(actual).toBe(expectedCount)
    }
  })

  test('has unique ids', () => {
    const ids = SEEMYOOL_COLORS.map((color) => color.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every id is prefixed with the species', () => {
    for (const color of SEEMYOOL_COLORS) expect(color.id.startsWith('seemyool-')).toBe(true)
  })

  test('generation 1 colors are wild-captured with no recipes', () => {
    const genOne = SEEMYOOL_COLORS.filter((color) => color.generation === 1)
    expect(genOne).toHaveLength(5)
    for (const color of genOne) {
      expect(color.wildCapture).toBe(true)
      expect(color.crosses).toBeUndefined()
    }
  })

  test('every recipe references an existing color of strictly lower generation', () => {
    for (const color of SEEMYOOL_COLORS) {
      for (const recipe of color.crosses ?? []) {
        for (const parentId of recipe) {
          const parent = byId.get(parentId)
          expect(parent).toBeDefined()
          expect(parent?.generation).toBeLessThan(color.generation)
        }
      }
    }
  })

  test('odd-generation monocolors have the exact recipe counts given by the brief', () => {
    expect(EXPECTED_RECIPE_COUNTS).toHaveLength(10)
    for (const [bare, expectedCount] of EXPECTED_RECIPE_COUNTS) {
      const color = byId.get(id(bare))
      expect(color).toBeDefined()
      expect(color?.crosses).toHaveLength(expectedCount)
    }
  })
})

describe('Seemyool monocolor table matches the brief exactly (section 4)', () => {
  test('has the 15 expected monocolor ids, generations, names, bonuses and components', () => {
    const actualById = new Map(SEEMYOOL_MONOS.map((mono) => [mono.id, mono]))
    expect(actualById.size).toBe(15)
    for (const expected of EXPECTED_MONOS) {
      const actual = actualById.get(expected.id)
      expect(actual).toBeDefined()
      expect(actual?.generation).toBe(expected.generation)
      expect(actual?.name).toEqual(expected.name)
      expect(actual?.bonuses).toEqual(expected.bonuses)
      expect(actual?.component).toEqual(expected.component)
    }
  })
})

describe('Seemyool bicolor structure conforms to the universal rules (brief section 3)', () => {
  test('every unordered pair of distinct monocolors has exactly one corresponding bicolor', () => {
    const monoIds = SEEMYOOL_MONOS.map((mono) => mono.id)
    let pairCount = 0
    for (let i = 0; i < monoIds.length; i++) {
      for (let j = i + 1; j < monoIds.length; j++) {
        pairCount++
        const a = monoIds[i] as string
        const b = monoIds[j] as string
        expect(() => findBicolor(a, b)).not.toThrow()
      }
    }
    expect(pairCount).toBe(105)
  })

  test('every bicolor generation is max(parent generations) + 1', () => {
    for (const color of SEEMYOOL_COLORS.filter((c) => c.kind === 'bicolor')) {
      const [recipe] = color.crosses ?? []
      expect(recipe).toBeDefined()
      const parents = (recipe ?? []).map((parentId) => byId.get(parentId))
      const maxParentGeneration = Math.max(...parents.map((parent) => parent?.generation ?? 0))
      expect(color.generation).toBe(maxParentGeneration + 1)
    }
  })

  test('every bicolor has exactly one recipe: its own two monocolors', () => {
    for (const color of SEEMYOOL_COLORS.filter((c) => c.kind === 'bicolor')) {
      expect(color.crosses).toHaveLength(1)
    }
  })

  test('every bicolor’s bonuses equal the sum of its two monocolors’ bicolor components', () => {
    // Walks the same i<j pairing `buildSpecies()` uses internally, so the
    // expected merge order matches production exactly (bonus order is a
    // declaration-order artifact, not something the brief specifies, but the
    // comparison must line up with it rather than with the `crosses` tuple's
    // EN-name order, which can differ).
    for (let i = 0; i < SEEMYOOL_MONOS.length; i++) {
      for (let j = i + 1; j < SEEMYOOL_MONOS.length; j++) {
        const monoA = SEEMYOOL_MONOS[i] as (typeof SEEMYOOL_MONOS)[number]
        const monoB = SEEMYOOL_MONOS[j] as (typeof SEEMYOOL_MONOS)[number]
        const bicolor = findBicolor(monoA.id, monoB.id)
        const expected = mergeComponents(monoA.component, monoB.component)
        expect(bicolor.bonuses).toEqual(expected)
      }
    }
  })
})

describe('Seemyool source irregularities — transcribed faithfully, not "fixed"', () => {
  test('Azur: recipes 3 and 5 both name Plum+Ivory as their second parent (source irregularity, see code comment)', () => {
    const azur = byId.get(id('azure'))
    const plumIvory = findBicolor('plum', 'ivory').id
    expect(azur?.crosses).toHaveLength(5)
    expect(azur?.crosses?.[2]?.includes(plumIvory)).toBe(true)
    expect(azur?.crosses?.[4]?.includes(plumIvory)).toBe(true)
  })

  test('Aigue-marine: recipes 4 and 5 both name Turquoise+Emerald as their second parent (possible source irregularity, see code comment)', () => {
    const aquamarine = byId.get(id('aquamarine'))
    const turquoiseEmerald = findBicolor('turquoise', 'emerald').id
    expect(aquamarine?.crosses).toHaveLength(5)
    expect(aquamarine?.crosses?.[3]?.includes(turquoiseEmerald)).toBe(true)
    expect(aquamarine?.crosses?.[4]?.includes(turquoiseEmerald)).toBe(true)
  })
})
