/**
 * Public data API: re-exports the raw datasets and derives indices that
 * must NOT be hand-maintained (a reverse "children of" index, and lineage
 * lookups). All derivations are pure and computed once at module load.
 */
import { DRAGOTURKEY_COLORS } from './colors'
import { DRAGOTURKEY_SPECIALS } from './specials'
import type { MountColor, Recipe, SpecialMount } from './types'

export type * from './types'
export { WILD_CAPTURE_INFO } from './wildCapture'
export { DRAGOTURKEY_COLORS, DRAGOTURKEY_SPECIALS }

/**
 * Every distinct parent id across all of a color's recipes.
 *
 * Phase 1 could read `color.cross` directly because there was only ever one
 * recipe. With {@link MountColor.crosses} a color can be reachable through
 * several parent pairs, so ancestry and the reverse index take the union —
 * a mount is an ancestor if *any* recipe path leads back to it.
 */
export function getParentIds(color: MountColor | undefined): readonly string[] {
  if (!color?.crosses) return []
  return [...new Set(color.crosses.flat())]
}

/** Every recipe that produces a color; empty for generation 1. */
export function getRecipes(id: string): readonly Recipe[] {
  return getColorById(id)?.crosses ?? []
}

const COLORS_BY_ID: ReadonlyMap<string, MountColor> = new Map(
  DRAGOTURKEY_COLORS.map((color) => [color.id, color]),
)

/**
 * Reverse index: for each color id, the ids of colors it participates in
 * producing (as either parent). Derived from `crosses`, never stored.
 *
 * A color is listed once per child even when several of that child's recipes
 * use it, so the "can produce" list in the UI never repeats itself.
 *
 * @example
 * getChildrenIds('almond') // ['almond-ginger', 'almond-golden']
 */
const CHILDREN_BY_ID: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, Set<string>>()
  for (const color of DRAGOTURKEY_COLORS) {
    for (const parentId of getParentIds(color)) {
      const siblings = map.get(parentId) ?? new Set<string>()
      siblings.add(color.id)
      map.set(parentId, siblings)
    }
  }
  return new Map([...map].map(([id, children]) => [id, [...children]]))
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
 * Does not include the color itself. Follows every recipe, not just one, so
 * for a multi-recipe color this is the union of all its ancestry paths.
 *
 * @example
 * getAncestorIds('ebony') // ['almond-golden', 'golden-ginger', 'almond', 'golden', 'ginger']
 */
export function getAncestorIds(id: string): string[] {
  const visited = new Set<string>()
  const stack = [...getParentIds(getColorById(id))]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || visited.has(current)) continue
    visited.add(current)
    stack.push(...getParentIds(getColorById(current)))
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
