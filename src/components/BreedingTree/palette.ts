import { getColorById } from '../../data'

/**
 * Approximate swatch colors for the 19 mono color names across the three
 * species. Purely decorative (not game data) — chosen to evoke each named
 * color, no Ankama assets involved. Bicolor nodes split their swatch between
 * their two cross parents, which are always mono colors (see docs/DATA.md).
 *
 * Keyed by the *bare* name, without the species prefix: all three species
 * share most of these names, and a Seemyool Amande is the same swatch as a
 * Dragodinde Amande as far as this file is concerned.
 */
const MONO_SWATCH: Record<string, string> = {
  almond: '#d8b479',
  golden: '#e0b830',
  ginger: '#c9622b',
  ebony: '#332b3d',
  indigo: '#4b3fa0',
  crimson: '#b3273c',
  orchid: '#a855c9',
  ivory: '#f2ecd9',
  turquoise: '#2fb3a6',
  emerald: '#2e9e5b',
  plum: '#6b2f52',
  // Phase 3: the eight names only the two new species carry.
  amber: '#d9930f',
  aquamarine: '#7fe3d4',
  azure: '#3aa0e8',
  coral: '#f0785c',
  amethyst: '#7d4bb5',
  jade: '#4fbf85',
  ruby: '#d81b45',
  sapphire: '#123a8f',
}

/** Drops the species prefix, so `seemyool-almond` looks up as `almond`. */
function bareName(colorId: string): string {
  return colorId.replace(/^(?:seemyool|rhineetle)-/, '')
}

export type Swatch = { kind: 'mono'; hex: string } | { kind: 'bicolor'; hexA: string; hexB: string }

export function getSwatch(colorId: string): Swatch {
  const mono = MONO_SWATCH[bareName(colorId)]
  if (mono) return { kind: 'mono', hex: mono }

  const color = getColorById(colorId)
  const [parentA, parentB] = color?.crosses?.[0] ?? []
  return {
    kind: 'bicolor',
    hexA: (parentA && MONO_SWATCH[bareName(parentA)]) || '#666',
    hexB: (parentB && MONO_SWATCH[bareName(parentB)]) || '#666',
  }
}
