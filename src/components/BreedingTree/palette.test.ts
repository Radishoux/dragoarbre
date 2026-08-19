/**
 * Swatch tests.
 *
 * `palette.ts` is pure and React-free, and was untested only because of the
 * folder it sits in — which is how it shipped a bug that greyed out 240 of the
 * 306 colours: the lookup was keyed by bare Dragoturkey ids, so every prefixed
 * Seemyool and Rhineetle id missed and fell through to the `#666` fallback.
 * The first test here is that bug, expressed as a property.
 */

import { describe, expect, test } from 'bun:test'
import { ALL_COLORS, getColorById } from '../../data'
import { getSwatch } from './palette'

/** Every hex a swatch resolves to, whichever kind it is. */
function hexesOf(colorId: string): string[] {
  const swatch = getSwatch(colorId)
  return swatch.kind === 'mono' ? [swatch.hex] : [swatch.hexA, swatch.hexB]
}

describe('getSwatch — no colour falls back to grey', () => {
  test('all 306 colours across all three species resolve to real swatches', () => {
    const grey = ALL_COLORS.filter((color) => hexesOf(color.id).includes('#666'))
    expect(grey.map((color) => color.id)).toEqual([])
  })

  test('every swatch hex is a full 6-digit hex colour', () => {
    for (const color of ALL_COLORS) {
      for (const hex of hexesOf(color.id)) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })
})

describe('getSwatch — species prefixes', () => {
  test('the same colour name is the same swatch in every species', () => {
    // A Seemyool Amande is the same shade as a Dragodinde Amande as far as this
    // file is concerned; the prefix carries no colour information.
    const dragoturkey = getSwatch('almond')
    expect(getSwatch('seemyool-almond')).toEqual(dragoturkey)
    expect(getSwatch('rhineetle-almond')).toEqual(dragoturkey)
  })

  test('only the leading species token is stripped, not an interior one', () => {
    // `seemyool-almond-golden` is a bicolor whose *name* contains a mono name.
    // Stripping greedily would turn it into a mono lookup and mis-colour it.
    expect(getSwatch('seemyool-almond-golden').kind).toBe('bicolor')
  })

  test('an unknown id is a bicolor of two greys rather than a throw', () => {
    // Hand-edited URLs reach this; a swatch must always be renderable.
    expect(getSwatch('not-a-colour')).toEqual({ kind: 'bicolor', hexA: '#666', hexB: '#666' })
  })
})

describe('getSwatch — kinds and stripe order', () => {
  test('kind follows the colour, not the id shape', () => {
    for (const color of ALL_COLORS) {
      expect(getSwatch(color.id).kind).toBe(color.kind)
    }
  })

  test('a bicolor stripes its two parents in recipe order, not sorted order', () => {
    // The stripes have to read the same way the label does: "Almond and Ginger"
    // is almond on the left. Sorting the pair here would silently desync them.
    const almond = hexesOf('almond')[0] ?? ''
    const ginger = hexesOf('ginger')[0] ?? ''
    expect(getSwatch('almond-ginger')).toEqual({ kind: 'bicolor', hexA: almond, hexB: ginger })
  })

  test('every bicolor is bred from two monocolors, which is what the lookup assumes', () => {
    // The bicolor branch reads `crosses[0]` and looks both parents up in the
    // mono table. If a bicolor were ever bred from a bicolor, that lookup would
    // miss and the grey fallback would come back — so the assumption is pinned
    // here, next to the code that depends on it.
    for (const color of ALL_COLORS) {
      if (color.kind !== 'bicolor') continue
      const [parentA, parentB] = color.crosses?.[0] ?? []
      expect(getColorById(parentA ?? '')?.kind).toBe('mono')
      expect(getColorById(parentB ?? '')?.kind).toBe('mono')
    }
  })
})
