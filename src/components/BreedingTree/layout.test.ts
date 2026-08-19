/**
 * Tree layout tests.
 *
 * `computeTreeLayout` is pure and React-free but sits under `components/`, so
 * it had no tests until now. It is also about to gain a responsive row cap, so
 * these pin today's geometry first — a change to layout should show up as a
 * deliberate diff here, not as a tree that quietly looks wrong.
 *
 * The numbers below are derived from the module's own constants rather than
 * copied from a screenshot: PADDING 40, COLUMN_WIDTH 172, ROW_HEIGHT 118,
 * SUB_ROW_HEIGHT 74, NODE_WIDTH 152, NODE_HEIGHT 44.
 */

import { describe, expect, test } from 'bun:test'
import type { MountColor } from '../../data'
import { SEEMYOOL_COLORS } from '../../data'
import { COLUMN_WIDTH, computeTreeLayout, MAX_PER_ROW, NODE_HEIGHT, NODE_WIDTH } from './layout'

const PADDING = 40
const SUB_ROW_HEIGHT = 74

/** A colour that only has what the layout reads: an id and a generation. */
function at(generation: number, index: number): MountColor {
  return {
    id: `g${generation}-${index}`,
    species: 'dragoturkey',
    generation,
    kind: generation % 2 === 1 ? 'mono' : 'bicolor',
    name: { fr: `c${index}`, en: `c${index}` },
    bonuses: [],
    wildCapture: true,
  } as MountColor
}

/** `count` colours all sitting in one generation. */
function generation(gen: number, count: number): MountColor[] {
  return Array.from({ length: count }, (_, index) => at(gen, index))
}

const xs = (layout: ReturnType<typeof computeTreeLayout>) =>
  [...layout.positions.values()].map((p) => p.x)

describe('computeTreeLayout — empty and degenerate input', () => {
  test('an empty colour list gives an empty canvas, never a negative one', () => {
    // `Math.max()` over an empty list is -Infinity; the seeded 0 is the only
    // thing keeping width finite, and a negative height is invalid SVG.
    const layout = computeTreeLayout([])
    expect(layout.positions.size).toBe(0)
    expect(layout.width).toBe(PADDING * 2)
    expect(layout.height).toBeGreaterThanOrEqual(0)
  })

  test('a single colour sits at the padding origin', () => {
    const layout = computeTreeLayout(generation(1, 1))
    expect(layout.positions.get('g1-0')).toEqual({ x: PADDING, y: PADDING })
  })
})

describe('computeTreeLayout — generations run down the page', () => {
  test('a later generation is always lower than an earlier one', () => {
    const layout = computeTreeLayout([
      ...generation(1, 2),
      ...generation(2, 3),
      ...generation(3, 1),
    ])
    const y = (id: string) => layout.positions.get(id)?.y ?? -1
    expect(y('g1-0')).toBeLessThan(y('g2-0'))
    expect(y('g2-0')).toBeLessThan(y('g3-0'))
  })

  test('generations are ordered numerically, not lexicographically', () => {
    // A comparator-less sort would put generation 10 before generation 2.
    const layout = computeTreeLayout([...generation(10, 1), ...generation(2, 1)])
    const g2 = layout.positions.get('g2-0')?.y ?? 0
    const g10 = layout.positions.get('g10-0')?.y ?? 0
    expect(g2).toBeLessThan(g10)
  })

  test('a sparse generation set closes up instead of leaving empty bands', () => {
    // The planner lays out only a target's ancestry, which skips generations.
    // Rows depend on the order generations appear in, never on their number.
    const sparse = computeTreeLayout([
      ...generation(1, 1),
      ...generation(2, 1),
      ...generation(4, 1),
      ...generation(6, 1),
    ])
    const dense = computeTreeLayout([
      ...generation(1, 1),
      ...generation(2, 1),
      ...generation(3, 1),
      ...generation(4, 1),
    ])
    expect([...sparse.positions.values()].map((p) => p.y)).toEqual(
      [...dense.positions.values()].map((p) => p.y),
    )
  })
})

describe('computeTreeLayout — wrapping wide generations', () => {
  test(`exactly ${MAX_PER_ROW} colours stay on one row`, () => {
    const layout = computeTreeLayout(generation(1, MAX_PER_ROW))
    const ys = new Set([...layout.positions.values()].map((p) => p.y))
    expect(ys.size).toBe(1)
    expect(layout.width).toBe(PADDING * 2 + MAX_PER_ROW * COLUMN_WIDTH)
  })

  test(`the ${MAX_PER_ROW + 1}th colour wraps onto a second sub-row`, () => {
    const layout = computeTreeLayout(generation(1, MAX_PER_ROW + 1))
    const first = layout.positions.get('g1-0')
    const wrapped = layout.positions.get(`g1-${MAX_PER_ROW}`)
    expect(wrapped?.y).toBe((first?.y ?? 0) + SUB_ROW_HEIGHT)
    // The canvas does not get wider than the cap allows.
    expect(layout.width).toBe(PADDING * 2 + MAX_PER_ROW * COLUMN_WIDTH)
  })

  test('a wrapped generation pushes the next one further down', () => {
    // The accumulating y cursor is the fragile part: a generation is no longer
    // a fixed height, so a wrapped one has to displace everything below it.
    const wrapped = computeTreeLayout([...generation(1, MAX_PER_ROW + 1), ...generation(2, 1)])
    const flat = computeTreeLayout([...generation(1, 1), ...generation(2, 1)])
    const wrappedNext = wrapped.positions.get('g2-0')?.y ?? 0
    const flatNext = flat.positions.get('g2-0')?.y ?? 0
    expect(wrappedNext).toBe(flatNext + SUB_ROW_HEIGHT)
  })

  test('every sub-row is centred on the same axis, including a partial one', () => {
    // A partly-filled last sub-row must sit under the middle of the ones above,
    // not left-aligned against them.
    const layout = computeTreeLayout(generation(1, MAX_PER_ROW + 3))
    const byRow = new Map<number, number[]>()
    for (const p of layout.positions.values()) {
      byRow.set(p.y, [...(byRow.get(p.y) ?? []), p.x])
    }
    const centres = [...byRow.values()].map((row) => {
      const min = Math.min(...row)
      const max = Math.max(...row) + NODE_WIDTH
      return (min + max) / 2
    })
    expect(new Set(centres).size).toBe(1)
  })
})

describe('computeTreeLayout — a caller-supplied row cap', () => {
  test('a narrower cap makes the canvas narrower and the tree taller', () => {
    // This is the whole point of the parameter: a phone has no width to give,
    // but it can scroll, so wrapping harder trades one for the other.
    const wide = computeTreeLayout(generation(1, 12), 12)
    const narrow = computeTreeLayout(generation(1, 12), 4)
    expect(narrow.width).toBeLessThan(wide.width)
    expect(narrow.height).toBeGreaterThan(wide.height)
  })

  test('it wraps at the cap it is given, not the default', () => {
    const layout = computeTreeLayout(generation(1, 5), 4)
    const rows = new Set([...layout.positions.values()].map((p) => p.y))
    expect(rows.size).toBe(2)
    expect(layout.width).toBe(PADDING * 2 + 4 * COLUMN_WIDTH)
  })

  test('omitting it keeps the previous behaviour exactly', () => {
    expect(computeTreeLayout(SEEMYOOL_COLORS)).toEqual(
      computeTreeLayout(SEEMYOOL_COLORS, MAX_PER_ROW),
    )
  })

  test('a too-small cap degrades to one colour per row', () => {
    for (const cap of [0, -3, 0.4]) {
      const layout = computeTreeLayout(generation(1, 3), cap)
      expect(layout.positions.size).toBe(3)
      expect(new Set([...layout.positions.values()].map((p) => p.y)).size).toBe(3)
    }
  })

  test('a non-finite cap falls back to the default, never to NaN positions', () => {
    // A container measured mid-layout can report 0 or NaN. `Math.max(1, NaN)`
    // is NaN, so an unguarded floor puts every node at NaN — which renders as
    // an empty tree rather than as an obviously broken one.
    for (const cap of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const layout = computeTreeLayout(generation(1, 3), cap)
      expect(layout).toEqual(computeTreeLayout(generation(1, 3)))
      for (const p of layout.positions.values()) {
        expect(Number.isFinite(p.x)).toBe(true)
        expect(Number.isFinite(p.y)).toBe(true)
      }
    }
  })

  test('every colour still lands inside the canvas at a narrow cap', () => {
    const layout = computeTreeLayout(SEEMYOOL_COLORS, 4)
    for (const p of layout.positions.values()) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x + NODE_WIDTH).toBeLessThanOrEqual(layout.width)
      expect(p.y + NODE_HEIGHT).toBeLessThanOrEqual(layout.height)
    }
  })
})

describe('computeTreeLayout — real data', () => {
  test('the Seemyool tree is 2144 x 1630, the canvas the docs quote', () => {
    // Note this is the *canvas*, not the rightmost node's edge: COLUMN_WIDTH is
    // 20px wider than NODE_WIDTH, so the last node stops 20px short of it.
    const layout = computeTreeLayout(SEEMYOOL_COLORS)
    expect(layout.width).toBe(2144)
    expect(layout.height).toBe(1630)
  })

  test('every node is inside the canvas it reports', () => {
    for (const colors of [SEEMYOOL_COLORS]) {
      const layout = computeTreeLayout(colors)
      for (const p of layout.positions.values()) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.x + NODE_WIDTH).toBeLessThanOrEqual(layout.width)
        expect(p.y + NODE_HEIGHT).toBeLessThanOrEqual(layout.height)
      }
    }
  })

  test('no two colours land on the same spot', () => {
    const layout = computeTreeLayout(SEEMYOOL_COLORS)
    const spots = [...layout.positions.values()].map((p) => `${p.x},${p.y}`)
    expect(new Set(spots).size).toBe(spots.length)
  })

  test('every colour gets a position', () => {
    const layout = computeTreeLayout(SEEMYOOL_COLORS)
    expect(layout.positions.size).toBe(SEEMYOOL_COLORS.length)
    expect(xs(layout).every(Number.isFinite)).toBe(true)
  })
})
