/**
 * Public data API: re-exports the raw datasets and derives indices that must
 * NOT be hand-maintained (a reverse "children of" index, and lineage lookups).
 * All derivations are pure and computed once at module load.
 *
 * Phase 3 made this span three species. Every index below is keyed by colour
 * id across all of them, which is safe because ids are species-unique: the two
 * new species prefix theirs (see `species.ts#colorId`), so the three "Almond"
 * colours are `almond`, `seemyool-almond` and `rhineetle-almond`.
 */
import { DRAGOTURKEY_COLORS } from './colors'
import { RHINEETLE_COLORS } from './rhineetles'
import { SEEMYOOL_COLORS } from './seemyools'
import { DRAGOTURKEY_SPECIALS } from './specials'
import type { MountColor, Recipe, SpecialMount, SpeciesId } from './types'

export { buildSpecies, colorId, type MonoSpec, type SpeciesInfo } from './species'
export {
  ALL_SPECIES,
  DRAGOTURKEY,
  getSpecies,
  RHINEETLE,
  SEEMYOOL,
} from './speciesInfo'
export type * from './types'
export { WILD_CAPTURE_INFO } from './wildCapture'
export { DRAGOTURKEY_COLORS, DRAGOTURKEY_SPECIALS, RHINEETLE_COLORS, SEEMYOOL_COLORS }

/** Every colour of every species, ascending by species tab order then generation. */
export const ALL_COLORS: readonly MountColor[] = [
  ...DRAGOTURKEY_COLORS,
  ...SEEMYOOL_COLORS,
  ...RHINEETLE_COLORS,
]

const COLORS_BY_SPECIES: ReadonlyMap<SpeciesId, readonly MountColor[]> = new Map([
  ['dragoturkey', DRAGOTURKEY_COLORS],
  ['seemyool', SEEMYOOL_COLORS],
  ['rhineetle', RHINEETLE_COLORS],
])

/**
 * Every distinct parent id across all of a colour's recipes.
 *
 * Phase 1 could read `color.cross` directly because there was only ever one
 * recipe. With {@link MountColor.crosses} a colour can be reachable through
 * several parent pairs, so ancestry and the reverse index take the union — a
 * mount is an ancestor if *any* recipe path leads back to it.
 */
export function getParentIds(color: MountColor | undefined): readonly string[] {
  if (!color?.crosses) return []
  return [...new Set(color.crosses.flat())]
}

const COLORS_BY_ID: ReadonlyMap<string, MountColor> = new Map(
  ALL_COLORS.map((color) => [color.id, color]),
)

/**
 * Reverse index: for each colour id, the ids of colours it participates in
 * producing (as either parent). Derived from `crosses`, never stored.
 *
 * A colour is listed once per child even when several of that child's recipes
 * use it, so the "can produce" list in the UI never repeats itself.
 *
 * @example
 * getChildrenIds('almond') // ['almond-ginger', 'almond-golden']
 */
const CHILDREN_BY_ID: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, Set<string>>()
  for (const color of ALL_COLORS) {
    for (const parentId of getParentIds(color)) {
      const siblings = map.get(parentId) ?? new Set<string>()
      siblings.add(color.id)
      map.set(parentId, siblings)
    }
  }
  return new Map([...map].map(([id, children]) => [id, [...children]]))
})()

/** Looks up a colour by id, across every species. */
export function getColorById(id: string): MountColor | undefined {
  return COLORS_BY_ID.get(id)
}

/** Every recipe that produces a colour; empty for generation 1. */
export function getRecipes(id: string): readonly Recipe[] {
  return getColorById(id)?.crosses ?? []
}

/** All colours of one species, ascending by generation. */
export function getColorsBySpecies(species: SpeciesId): readonly MountColor[] {
  return COLORS_BY_SPECIES.get(species) ?? []
}

/** All colours a given colour id can be bred into, as a parent. */
export function getChildrenIds(id: string): readonly string[] {
  return CHILDREN_BY_ID.get(id) ?? []
}

/**
 * The full recursive ancestry of a colour, back to its generation-1 roots.
 * Does not include the colour itself. Follows every recipe, not just one, so
 * for a multi-recipe colour this is the union of all its ancestry paths.
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

/** The colour itself plus its full recursive ancestry (see {@link getAncestorIds}). */
export function getLineageIds(id: string): string[] {
  return [id, ...getAncestorIds(id)]
}

/**
 * All colours of one generation.
 *
 * @param generation - 1 through 10.
 * @param species - restrict to one species; omit to span all three.
 */
export function getColorsByGeneration(generation: number, species?: SpeciesId): MountColor[] {
  const pool = species ? getColorsBySpecies(species) : ALL_COLORS
  return pool.filter((color) => color.generation === generation)
}

export function findSpecialById(id: string): SpecialMount | undefined {
  return DRAGOTURKEY_SPECIALS.find((special) => special.id === id)
}
