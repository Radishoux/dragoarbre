import type { MountColor } from '../data'

/** Matches a query against a color's FR or EN name, regardless of active language. */
export function matchesSearch(color: MountColor, query: string): boolean {
  if (!query.trim()) return true
  const needle = query.trim().toLowerCase()
  return (
    color.name.fr.toLowerCase().includes(needle) || color.name.en.toLowerCase().includes(needle)
  )
}
