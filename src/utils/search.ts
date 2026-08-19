import type { MountColor } from '../data'

/**
 * Strips diacritics so "ebene" finds "Ébène".
 *
 * NFD splits an accented character into its base letter plus a combining mark,
 * which the `\p{Diacritic}` class then removes. Without this the search box
 * silently fails for most of the French colour names — Ébène, Dorée, Émeraude,
 * Pourpre — because almost nobody types the accents, least of all on a phone.
 *
 * `src/data/species.ts` already sorts accent-insensitively via
 * `localeCompare(..., { sensitivity: 'base' })`; this is the same intent for
 * matching.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Matches a query against a color's FR or EN name, regardless of active language. */
export function matchesSearch(color: MountColor, query: string): boolean {
  if (!query.trim()) return true
  const needle = fold(query.trim())
  return fold(color.name.fr).includes(needle) || fold(color.name.en).includes(needle)
}
