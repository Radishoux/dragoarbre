import { getColorById } from '../../data'

/**
 * Approximate swatch colors for the 11 mono Dragoturkey colors. Purely
 * decorative (not game data) — generated to evoke each named color, no
 * Ankama assets involved. Bicolor nodes split their swatch between their
 * two cross parents, which are always mono colors (see docs/DATA.md).
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
}

export type Swatch = { kind: 'mono'; hex: string } | { kind: 'bicolor'; hexA: string; hexB: string }

export function getSwatch(colorId: string): Swatch {
  const mono = MONO_SWATCH[colorId]
  if (mono) return { kind: 'mono', hex: mono }

  const color = getColorById(colorId)
  const [parentA, parentB] = color?.cross ?? []
  return {
    kind: 'bicolor',
    hexA: (parentA && MONO_SWATCH[parentA]) || '#666',
    hexB: (parentB && MONO_SWATCH[parentB]) || '#666',
  }
}
