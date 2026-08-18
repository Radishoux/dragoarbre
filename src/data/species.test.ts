import { describe, expect, test } from 'bun:test'
import { buildSpecies, colorId, type MonoSpec, type SpeciesInfo } from './species'
import type { Bonus } from './types'

const flat = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: 'flat' })

const TEST_SPECIES: SpeciesInfo = {
  id: 'seemyool',
  singular: { fr: 'Muldo', en: 'Seemyool' },
  commonBonusTiers: [{ fromLevel: 100, bonus: flat('movementPoints', 1) }],
  wildCapture: { fr: 'Bassin des Muldos', en: 'Seemyool Basin' },
}

/**
 * A four-monocolor stand-in for a real species: small enough to assert every
 * derived entry by hand, shaped like the real thing (two generation-1 monos,
 * one generation-3 mono bred from bicolors, one generation-5 mono bred from a
 * mix of a mono and a bicolor).
 */
const MONOS: MonoSpec[] = [
  {
    id: 'ebony',
    generation: 1,
    name: { fr: 'Ébène', en: 'Ebony' },
    bonuses: [flat('agility', 90)],
    component: [flat('agility', 70)],
  },
  {
    id: 'crimson',
    generation: 1,
    name: { fr: 'Pourpre', en: 'Crimson' },
    bonuses: [flat('strength', 90)],
    component: [flat('strength', 70)],
  },
  {
    id: 'almond',
    generation: 3,
    name: { fr: 'Amande', en: 'Almond' },
    bonuses: [flat('dodge', 50)],
    component: [flat('dodge', 40)],
    // "Ébène et Pourpre + Ébène" — one bicolor parent, one mono parent.
    recipes: [[['ebony', 'crimson'], 'ebony']],
  },
  {
    id: 'ivory',
    generation: 5,
    name: { fr: 'Ivoire', en: 'Ivory' },
    bonuses: [flat('lock', 50)],
    component: [flat('lock', 40)],
    recipes: [
      [
        ['almond', 'ebony'],
        ['almond', 'crimson'],
      ],
      [['almond', 'ebony'], 'almond'],
    ],
  },
]

const built = buildSpecies(TEST_SPECIES, MONOS)
const byId = new Map(built.map((color) => [color.id, color]))
const id = (bare: string) => colorId('seemyool', bare)

describe('buildSpecies — structure', () => {
  test('derives one bicolor per unordered pair of distinct monocolors', () => {
    // 4 monos + C(4,2) = 4 + 6.
    expect(built).toHaveLength(10)
    expect(built.filter((color) => color.kind === 'mono')).toHaveLength(4)
    expect(built.filter((color) => color.kind === 'bicolor')).toHaveLength(6)
  })

  test('prefixes every id with the species', () => {
    for (const color of built) expect(color.id.startsWith('seemyool-')).toBe(true)
  })

  test('leaves Dragoturkey ids bare, since they are a frozen routing contract', () => {
    expect(colorId('dragoturkey', 'almond')).toBe('almond')
    expect(colorId('rhineetle', 'almond')).toBe('rhineetle-almond')
  })

  test('has unique ids', () => {
    const ids = built.map((color) => color.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every generation is one more than its two parents’ maximum', () => {
    for (const color of built.filter((c) => c.kind === 'bicolor')) {
      const [recipe] = color.crosses ?? []
      expect(recipe).toBeDefined()
      const parents = (recipe ?? []).map((parentId) => byId.get(parentId))
      const maxParentGeneration = Math.max(...parents.map((parent) => parent?.generation ?? 0))
      expect(color.generation).toBe(maxParentGeneration + 1)
    }
  })

  test('a bicolor of two generation-1 monos is generation 2', () => {
    expect(byId.get(id('crimson-ebony'))?.generation).toBe(2)
  })

  test('a bicolor pairing generation 3 with generation 1 is generation 4', () => {
    expect(byId.get(id('almond-ebony'))?.generation).toBe(4)
  })

  test('every bicolor has exactly one recipe: its own two monocolors', () => {
    expect(byId.get(id('almond-ebony'))?.crosses).toEqual([[id('almond'), id('ebony')]])
  })
})

describe('buildSpecies — names', () => {
  test('composes bicolor names alphabetically within each language', () => {
    expect(byId.get(id('crimson-ebony'))?.name).toEqual({
      fr: 'Ébène et Pourpre',
      en: 'Crimson and Ebony',
    })
  })

  test('orders the two languages independently', () => {
    // FR "Amande" sorts before "Ébène"; EN "Almond" before "Ebony" too, but
    // the id follows the EN order, which is what this pins.
    expect(byId.get(id('almond-ebony'))?.name).toEqual({
      fr: 'Amande et Ébène',
      en: 'Almond and Ebony',
    })
  })

  test('ignores accents when ordering, so É sorts as E rather than last', () => {
    expect(byId.get(id('crimson-ebony'))?.name.fr).toBe('Ébène et Pourpre')
  })
})

describe('buildSpecies — bonuses', () => {
  test('a bicolor carries the component values of both its monocolors', () => {
    expect(byId.get(id('crimson-ebony'))?.bonuses).toEqual([
      flat('agility', 70),
      flat('strength', 70),
    ])
  })

  test('a monocolor keeps its own bonuses, not its component values', () => {
    expect(byId.get(id('ebony'))?.bonuses).toEqual([flat('agility', 90)])
  })

  test('sums rather than duplicates a stat both components contribute', () => {
    const shared = buildSpecies(TEST_SPECIES, [
      { ...(MONOS[0] as MonoSpec), component: [flat('agility', 70)] },
      { ...(MONOS[1] as MonoSpec), component: [flat('agility', 30)] },
    ])
    expect(shared.find((color) => color.kind === 'bicolor')?.bonuses).toEqual([
      flat('agility', 100),
    ])
  })

  test('does not mutate the caller’s component arrays', () => {
    expect(MONOS[0]?.component).toEqual([flat('agility', 70)])
  })
})

describe('buildSpecies — recipes', () => {
  test('generation 1 monocolors are wild-captured with no recipe', () => {
    const ebony = byId.get(id('ebony'))
    expect(ebony?.wildCapture).toBe(true)
    expect(ebony?.crosses).toBeUndefined()
  })

  test('resolves a bicolor parent reference written as its two monocolors', () => {
    expect(byId.get(id('almond'))?.crosses).toEqual([[id('crimson-ebony'), id('ebony')]])
  })

  test('keeps every recipe of a multi-recipe monocolor, in order', () => {
    expect(byId.get(id('ivory'))?.crosses).toEqual([
      [id('almond-ebony'), id('almond-crimson')],
      [id('almond-ebony'), id('almond')],
    ])
  })

  test('every recipe parent exists and is of a strictly lower generation', () => {
    for (const color of built) {
      for (const recipe of color.crosses ?? []) {
        for (const parentId of recipe) {
          const parent = byId.get(parentId)
          expect(parent).toBeDefined()
          expect(parent?.generation).toBeLessThan(color.generation)
        }
      }
    }
  })

  test('throws on a recipe naming a monocolor that does not exist', () => {
    const broken: MonoSpec[] = [
      ...MONOS.slice(0, 2),
      { ...(MONOS[2] as MonoSpec), recipes: [['ebony', 'nonexistent']] },
    ]
    expect(() => buildSpecies(TEST_SPECIES, broken)).toThrow(/unknown monocolor 'nonexistent'/)
  })

  test('throws on a recipe naming a bicolor pair that does not exist', () => {
    const broken: MonoSpec[] = [
      ...MONOS.slice(0, 2),
      { ...(MONOS[2] as MonoSpec), recipes: [[['ebony', 'nonexistent'], 'ebony']] },
    ]
    expect(() => buildSpecies(TEST_SPECIES, broken)).toThrow(/unknown bicolor/)
  })

  test('accepts a bicolor reference written in either order', () => {
    const swapped: MonoSpec[] = [
      ...MONOS.slice(0, 2),
      { ...(MONOS[2] as MonoSpec), recipes: [[['crimson', 'ebony'], 'ebony']] },
    ]
    const rebuilt = buildSpecies(TEST_SPECIES, swapped)
    expect(rebuilt.find((color) => color.id === id('almond'))?.crosses).toEqual([
      [id('crimson-ebony'), id('ebony')],
    ])
  })
})

describe('buildSpecies — ordering', () => {
  test('returns colors ascending by generation, then by id', () => {
    const keys = built.map((color) => `${color.generation}:${color.id}`)
    expect([...keys].sort()).toEqual(keys.map((key) => key).sort())
    for (let i = 1; i < built.length; i++) {
      const previous = built[i - 1] as (typeof built)[number]
      const current = built[i] as (typeof built)[number]
      expect(previous.generation).toBeLessThanOrEqual(current.generation)
    }
  })
})
