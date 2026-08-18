/**
 * Public data API: re-exports the raw datasets and derives indices that
 * must NOT be hand-maintained (a reverse "children of" index, and lineage
 * lookups). All derivations are pure and computed once at module load.
 */
import { DRAGOTURKEY_COLORS } from './colors'
import { DRAGOTURKEY_SPECIALS } from './specials'
import type { MountColor, SpecialMount } from './types'

export type * from './types'
export { WILD_CAPTURE_INFO } from './wildCapture'
export { DRAGOTURKEY_COLORS, DRAGOTURKEY_SPECIALS }

const COLORS_BY_ID: ReadonlyMap<string, MountColor> = new Map(
  DRAGOTURKEY_COLORS.map((color) => [color.id, color]),
)

/**
 * Reverse index: for each color id, the ids of colors it participates in
 * producing (as either parent). Derived from `cross`, never stored.
 *
 * @example
 * getChildrenIds('almond') // ['almond-ginger', 'almond-golden']
 */
const CHILDREN_BY_ID: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, string[]>()
  for (const color of DRAGOTURKEY_COLORS) {
    if (!color.cross) continue
    for (const parentId of color.cross) {
      const siblings = map.get(parentId) ?? []
      siblings.push(color.id)
      map.set(parentId, siblings)
    }
  }
  return map
})()

/** Looks up a Dragoturkey color by id. */
export function getColorById(id: string): MountColor | undefined {
  return COLORS_BY_ID.get(id)
}

/** All colors a given color id can be bred into, as a parent. */
export function getChildrenIds(id: string): readonly string[] {
  return CHILDREN_BY_ID.get(id) ?? []
}

/**
 * The full recursive ancestry of a color, back to its generation-1 roots.
 * Does not include the color itself.
 *
 * @example
 * getAncestorIds('ebony') // ['almond-golden', 'golden-ginger', 'almond', 'golden', 'ginger']
 */
export function getAncestorIds(id: string): string[] {
  const visited = new Set<string>()
  const stack = [...(getColorById(id)?.cross ?? [])]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || visited.has(current)) continue
    visited.add(current)
    const parents = getColorById(current)?.cross
    if (parents) stack.push(...parents)
  }
  return [...visited]
}

/** The color itself plus its full recursive ancestry (see {@link getAncestorIds}). */
export function getLineageIds(id: string): string[] {
  return [id, ...getAncestorIds(id)]
}

export function getColorsByGeneration(generation: number): MountColor[] {
  return DRAGOTURKEY_COLORS.filter((color) => color.generation === generation)
}

export function findSpecialById(id: string): SpecialMount | undefined {
  return DRAGOTURKEY_SPECIALS.find((special) => special.id === id)
}
