/**
 * Seemyool (Muldo) breeding data — 120 colors, generations 1-10.
 *
 * Source: `BRIEF-phase-3.md`, section 4. Last verified: 2026-08-18.
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
import { SEEMYOOL } from './speciesInfo'
import type { MountColor } from './types'

/**
 * The 15 Seemyool monocolors: 5 at generation 1 (wild capture), then 2, 2, 2 and 4 at generations 3, 5, 7 and 9.
 *
 * Populated by task T4 — see `TASKS.md`.
 */
export const SEEMYOOL_MONOS: MonoSpec[] = []

/** All 120 Seemyool colors, ascending by generation then id. */
export const SEEMYOOL_COLORS: MountColor[] = buildSpecies(SEEMYOOL, SEEMYOOL_MONOS)
