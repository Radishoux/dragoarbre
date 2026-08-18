/**
 * Species metadata and the builder that turns a species' monocolor table into
 * its full color set.
 *
 * `BRIEF-phase-3.md` section 3 establishes that only the odd-generation
 * monocolors of a species are irregular. Everything even is derivable:
 *
 * - the bicolor set is exactly every unordered pair of two distinct monocolors
 * - `generation({A,B})` = `max(generation(A), generation(B)) + 1`
 * - `crosses({A,B})` = `[[A, B]]` — one recipe, the two monocolors
 * - `bonuses({A,B})` = `component(A) + component(B)`
 *
 * So a species is declared as its 15 monocolors (names, bonuses, bicolor
 * components, and the explicit recipes for the odd generations) and
 * {@link buildSpecies} derives the other 105 entries. Hand-enumerating them
 * would be 105 opportunities to typo a value that no test could catch.
 *
 * Dragoturkeys are NOT built this way: their 66 entries are the phase 1 source
 * of truth, transcribed with known irregularities in their bonus values, and
 * `BRIEF-phase-3.md` section 3 says explicitly to leave them alone.
 */

import type { Bonus, Localized, MountColor, Recipe, SpeciesId } from './types'

/**
 * Names one parent inside a recipe: either a monocolor's bare id
 * (`'golden'`) or a bicolor written as the two monocolors that compose it
 * (`['golden', 'crimson']` for "Doré et Pourpre").
 *
 * The brief writes recipes in exactly those terms, so transcribing them needs
 * no id arithmetic in the dataset files — and gives no way to typo an id into
 * one that happens to be another real color.
 */
export type ParentRef = string | readonly [string, string]

/** One recipe as the brief writes it: two parents, each a {@link ParentRef}. */
export type RecipeSpec = readonly [ParentRef, ParentRef]

/** One monocolor of a species, as transcribed from the brief's mono table. */
export interface MonoSpec {
  /** Bare id, unprefixed and unique within the species, e.g. `'golden'`. */
  id: string
  /** Odd: 1, 3, 5, 7 or 9. */
  generation: number
  name: Localized
  /**
   * The monocolor's own bonuses at level 200, excluding the species common
   * bonus that every mount of the species carries (see
   * {@link SpeciesInfo.commonBonus}).
   */
  bonuses: Bonus[]
  /** What this monocolor contributes to every bicolor containing it. */
  component: Bonus[]
  /** Every recipe producing it. Omitted for generation 1, which is captured. */
  recipes?: readonly RecipeSpec[]
}

/**
 * One step of a species' common bonus.
 *
 * The game grants some species bonuses in stages as the mount levels, so a
 * single `{ value, fromLevel }` pair cannot express them. Each tier is the
 * value granted *from* its level, superseding the tier below it.
 */
export interface BonusTier {
  /** Mount level from which {@link bonus} applies. */
  fromLevel: number
  bonus: Bonus
}

/** Everything about a species that is not a per-color fact. */
export interface SpeciesInfo {
  id: SpeciesId
  /** The species word alone, e.g. "Dragodinde" / "Dragoturkey". */
  singular: Localized
  /**
   * The bonus every mount of the species carries, as one entry per level step,
   * ascending. Kept out of each color's `bonuses` — phase 1 established that
   * the species-wide bonus is implicit — and displayed once by the UI.
   *
   * A list rather than a single value because it is not flat for every
   * species: a Dragoturkey carries 300 Vitality from level 100 and 400 from
   * level 200, where a Seemyool's 1 MP has a single step. Never empty.
   */
  commonBonusTiers: readonly BonusTier[]
  /** Bilingual wild-capture note, shown on generation 1 colors. */
  wildCapture: Localized
}

/**
 * Prefixed color id for a species.
 *
 * Dragoturkey ids shipped bare in phase 1 and `docs/DATA.md` freezes them:
 * they are the routing key, and `#/planner?target=almond` links are already
 * live. The two new species are prefixed, which also keeps their colors from
 * colliding with the Dragoturkey ones — all three have an "Amande".
 */
export function colorId(species: SpeciesId, bare: string): string {
  return species === 'dragoturkey' ? bare : `${species}-${bare}`
}

/**
 * Canonical order of the two monocolors composing a bicolor, per language.
 *
 * The brief gives no names for the 210 new bicolors, so they are composed
 * rather than transcribed, and composing needs a deterministic order.
 * Alphabetical matches both officially-confirmed examples in
 * `BRIEF-phase-3.md` section 6 ("Almond and Emerald Seemyool", "Almond and
 * Crimson Rhineetle"). See `docs/DECISIONS.md` — this is a judgment call, and
 * composed names carry a verify flag until checked in game.
 *
 * Ordering is per language, so FR and EN may disagree on which name comes
 * first; each then reads correctly in its own language, which is the point.
 */
function orderedNames(a: Localized, b: Localized): { fr: [string, string]; en: [string, string] } {
  const byLocale = (x: string, y: string): [string, string] =>
    x.localeCompare(y, 'fr', { sensitivity: 'base' }) <= 0 ? [x, y] : [y, x]
  return { fr: byLocale(a.fr, b.fr), en: byLocale(a.en, b.en) }
}

/** Composes a bicolor's bare display name in both languages. */
function bicolorName(a: Localized, b: Localized): Localized {
  const ordered = orderedNames(a, b)
  return {
    fr: `${ordered.fr[0]} et ${ordered.fr[1]}`,
    en: `${ordered.en[0]} and ${ordered.en[1]}`,
  }
}

/**
 * Merges two monocolors' bicolor components into the bicolor's bonus list.
 *
 * Summing on `stat` matters: a species whose two parents contribute the same
 * stat must show one combined line, not the same stat twice.
 */
function mergeComponents(a: readonly Bonus[], b: readonly Bonus[]): Bonus[] {
  const merged: Bonus[] = []
  for (const bonus of [...a, ...b]) {
    const existing = merged.find((entry) => entry.stat === bonus.stat && entry.unit === bonus.unit)
    if (existing) existing.value += bonus.value
    else merged.push({ ...bonus })
  }
  return merged
}

/**
 * Builds a species' complete color set from its monocolor table.
 *
 * @param info - the species metadata; only its `id` is read here.
 * @param monos - the species' monocolors, in any order.
 * @returns every color of the species — the monos plus one bicolor per
 *   unordered pair of distinct monos — ascending by generation then id.
 * @throws if a recipe names a parent that does not exist, which is the one
 *   transcription error the shape of the data cannot otherwise reveal.
 *
 * @example
 * // 15 monocolors in, 120 colors out: 15 + C(15,2) = 15 + 105.
 * buildSpecies(SEEMYOOL, SEEMYOOL_MONOS).length // 120
 */
export function buildSpecies(info: SpeciesInfo, monos: readonly MonoSpec[]): MountColor[] {
  const species = info.id
  const monoById = new Map(monos.map((mono) => [mono.id, mono]))
  const pairKey = (a: string, b: string) => [a, b].sort().join('+')

  const bicolors: MountColor[] = []
  const bicolorIdByPair = new Map<string, string>()

  for (let i = 0; i < monos.length; i++) {
    for (let j = i + 1; j < monos.length; j++) {
      const a = monos[i] as MonoSpec
      const b = monos[j] as MonoSpec
      // The id follows the EN name order, so it reads the same way the English
      // label does rather than following the mono table's declaration order.
      const [firstEn] = orderedNames(a.name, b.name).en
      const [first, second] = firstEn === a.name.en ? [a, b] : [b, a]
      const id = colorId(species, `${first.id}-${second.id}`)

      bicolorIdByPair.set(pairKey(a.id, b.id), id)
      bicolors.push({
        id,
        species,
        generation: Math.max(a.generation, b.generation) + 1,
        kind: 'bicolor',
        name: bicolorName(a.name, b.name),
        bonuses: mergeComponents(a.component, b.component),
        // The recipe follows the same order as the id and the English name, so
        // the "Almond and Ebony" node lists Almond + Ebony rather than the
        // order the two happen to sit in the mono table.
        crosses: [[colorId(species, first.id), colorId(species, second.id)] as Recipe],
      })
    }
  }

  /** Resolves one parent reference to a concrete color id. */
  const resolve = (ref: ParentRef, owner: string): string => {
    if (typeof ref === 'string') {
      if (!monoById.has(ref)) {
        throw new Error(`${species}: recipe for '${owner}' names unknown monocolor '${ref}'`)
      }
      return colorId(species, ref)
    }
    const [a, b] = ref
    const id = bicolorIdByPair.get(pairKey(a, b))
    if (!id) {
      throw new Error(`${species}: recipe for '${owner}' names unknown bicolor '${a} + ${b}'`)
    }
    return id
  }

  const monoColors: MountColor[] = monos.map((mono) => ({
    id: colorId(species, mono.id),
    species,
    generation: mono.generation,
    kind: 'mono',
    name: mono.name,
    bonuses: mono.bonuses,
    ...(mono.recipes?.length
      ? {
          crosses: mono.recipes.map(
            ([a, b]) => [resolve(a, mono.id), resolve(b, mono.id)] as Recipe,
          ),
        }
      : { wildCapture: true as const }),
  }))

  return [...monoColors, ...bicolors].sort(
    (a, b) => a.generation - b.generation || a.id.localeCompare(b.id),
  )
}
