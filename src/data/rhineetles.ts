/**
 * Rhineetle (Volkorne) breeding data — 120 colors, generations 1-10.
 *
 * Source: `BRIEF-phase-3.md`, section 5. Last verified: 2026-08-18.
 *
 * Only the 15 monocolors are transcribed here. The 105 bicolors are derived by
 * {@link buildSpecies} from the universal structure rules of the brief's
 * section 3 — every unordered pair of distinct monocolors, generation
 * `max + 1`, one recipe, bonuses summed from the two bicolor components.
 * Hand-writing them would be 105 chances to typo a value no test could catch.
 *
 * Do not add, remove or alter values here without an updated source brief —
 * see `docs/DATA.md` for the correction process.
 */

import { buildSpecies, type MonoSpec } from './species'
import { RHINEETLE } from './speciesInfo'
import type { MountColor } from './types'

/**
 * The 15 Rhineetle monocolors: 4 at generation 1 (wild capture), then 4, 2, 1 and 4 at generations 3, 5, 7 and 9.
 *
 * Populated by task T5 — see `TASKS.md`.
 */
export const RHINEETLE_MONOS: MonoSpec[] = []

/** All 120 Rhineetle colors, ascending by generation then id. */
export const RHINEETLE_COLORS: MountColor[] = buildSpecies(RHINEETLE, RHINEETLE_MONOS)
