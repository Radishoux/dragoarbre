/**
 * Bilingual colour search.
 *
 * The interesting cases are the ones a French player hits: the FR names carry
 * accents (Ébène, Dorée, Émeraude, Pourpre) and almost nobody types them,
 * least of all on a phone. Before the fix below, "ebene" matched nothing at
 * all while "Ébène" matched eleven colours.
 */

import { describe, expect, test } from 'bun:test'
import { DRAGOTURKEY_COLORS, getColorById } from '../data'
import { matchesSearch } from './search'

/** How many of a species' colours a query lights up. */
function hits(query: string): number {
  return DRAGOTURKEY_COLORS.filter((color) => matchesSearch(color, query)).length
}

const ebony = getColorById('ebony')
const golden = getColorById('golden')

describe('matchesSearch — empty queries', () => {
  test('an empty query matches everything', () => {
    expect(hits('')).toBe(DRAGOTURKEY_COLORS.length)
  })

  test('a whitespace-only query matches everything, rather than nothing', () => {
    // Typing a space must not blank the tree.
    expect(hits('   ')).toBe(DRAGOTURKEY_COLORS.length)
  })
})

describe('matchesSearch — across languages', () => {
  test('a French name matches while the UI is in English, and vice versa', () => {
    // The matcher deliberately ignores the active language: a player who knows
    // the colour as "Rousse" finds it in the English UI.
    expect(matchesSearch(getColorById('ginger') as never, 'Rousse')).toBe(true)
    expect(matchesSearch(getColorById('ginger') as never, 'Ginger')).toBe(true)
  })

  test('matching is case-insensitive', () => {
    expect(matchesSearch(golden as never, 'GOLDEN')).toBe(true)
    expect(matchesSearch(golden as never, 'golden')).toBe(true)
  })

  test('matching is on any substring, not just a prefix', () => {
    // Deliberate looseness: "mond" finds Almond and every bicolor containing it.
    expect(hits('mond')).toBeGreaterThan(1)
  })
})

describe('matchesSearch — accents are folded', () => {
  test('an unaccented query finds an accented name', () => {
    // The bug this file exists for. All three of these returned nothing.
    expect(matchesSearch(ebony as never, 'ebene')).toBe(true)
    expect(matchesSearch(getColorById('emerald') as never, 'emeraude')).toBe(true)
    expect(matchesSearch(golden as never, 'doree')).toBe(true)
  })

  test('an accented query still finds the same name', () => {
    expect(matchesSearch(ebony as never, 'Ébène')).toBe(true)
    expect(matchesSearch(ebony as never, 'ébène')).toBe(true)
  })

  test('accented and unaccented queries light up the same colours', () => {
    expect(hits('ebene')).toBe(hits('Ébène'))
    expect(hits('emeraude')).toBe(hits('Émeraude'))
    expect(hits('doree')).toBe(hits('Dorée'))
  })

  test('folding does not make unrelated colours match', () => {
    // Guard against an over-eager normalisation collapsing distinct names.
    expect(matchesSearch(ebony as never, 'indigo')).toBe(false)
    expect(hits('zzz')).toBe(0)
  })
})
