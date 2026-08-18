/**
 * Wild capture info for generation 1 Dragoturkeys.
 *
 * @deprecated Phase 3 moved this onto the species registry, because each of
 * the three species is captured somewhere different. Read
 * `getSpecies(color.species).wildCapture` instead; this alias exists so the
 * phase 1 import path keeps working and is removed once no caller uses it.
 */
import { DRAGOTURKEY } from './speciesInfo'
import type { Localized } from './types'

export const WILD_CAPTURE_INFO: Localized = DRAGOTURKEY.wildCapture
