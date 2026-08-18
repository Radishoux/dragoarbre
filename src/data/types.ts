/**
 * Core data model for mounts, colors and stat bonuses.
 *
 * These types are intentionally species-agnostic: phase 3 (Seemyools,
 * Rhineetles) reuses them without modification. Only Dragoturkey data is
 * populated in phase 1 (see {@link file://./colors.ts}).
 */

/** The three mount species in Dofus. Only 'dragoturkey' has data in phase 1. */
export type SpeciesId = 'dragoturkey' | 'seemyool' | 'rhineetle'

/**
 * Stat identifiers for mount bonuses, matching the FR/EN stat table in the
 * project brief (section 3).
 */
export type StatId =
  | 'vitality'
  | 'initiative'
  | 'summons'
  | 'heals'
  | 'agility'
  | 'chance'
  | 'strength'
  | 'intelligence'
  | 'power'
  | 'prospecting'
  | 'critical'
  | 'range'

/** A single localized string pair. */
export interface Localized {
  fr: string
  en: string
}

/** A single stat bonus granted by a mount, at level 200. */
export interface Bonus {
  stat: StatId
  value: number
  /** '%' for percentage bonuses (e.g. Critical), 'flat' otherwise. */
  unit: '%' | 'flat'
}

/** A single breedable (or wild-caught) mount color. */
export interface MountColor {
  /** Stable kebab-case English id, e.g. 'almond-ginger', 'crimson'. */
  id: string
  species: SpeciesId
  /** 1 through 10. */
  generation: number
  /** Odd generations (1,3,5,7,9) are mono; even generations are bicolor. */
  kind: 'mono' | 'bicolor'
  /** Bare color name, without the species word (UI composes the full name). */
  name: Localized
  /** Excludes the species-wide Vitality bonus, which is implicit. */
  bonuses: Bonus[]
  /** The two parent color ids. Absent for generation 1 (wild capture). */
  cross?: [string, string]
  /** True only for generation 1 colors. */
  wildCapture?: boolean
}

/** One elemental resistance line, only used by {@link SpecialMount}. */
export interface ElementalResistance {
  element: 'neutral' | 'earth' | 'fire' | 'water' | 'air'
  value: number
}

/**
 * A special mount: bought, not bred, and outside the breeding tree.
 * Kept separate from {@link MountColor} because its bonuses (elemental
 * resistance, reflected damage) fall outside the {@link StatId} vocabulary
 * used for breeding-tree filtering.
 */
export interface SpecialMount {
  id: string
  species: SpeciesId
  name: Localized
  bonuses: Bonus[]
  resistances?: ElementalResistance[]
  reflectedDamage?: number
  /** Free-text acquisition note (NPC, location, price), localized. */
  acquisition: Localized
}
