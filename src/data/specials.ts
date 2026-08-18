/**
 * Special Dragoturkeys — bought, not bred, and kept outside the breeding
 * tree entirely.
 *
 * Source: `BRIEF-phase-1.md`, section 3. Last verified: 2026-08-18.
 */
import type { SpecialMount } from './types'

const ACQUISITION_FR =
  'Acheté au PNJ Gladiagob, à la Foire du Trool [-11,-37], pour 50 Gladiatokens.'
const ACQUISITION_EN =
  'Bought from the NPC Gladiagob at the Trool Fair [-11,-37], for 50 Gladiatokens.'

export const DRAGOTURKEY_SPECIALS: SpecialMount[] = [
  {
    id: 'armored',
    species: 'dragoturkey',
    name: { fr: 'Dragodinde en armure', en: 'Armored Dragoturkey' },
    bonuses: [{ stat: 'power', value: 70, unit: 'flat' }],
    resistances: [
      { element: 'neutral', value: 7 },
      { element: 'earth', value: 7 },
      { element: 'fire', value: 7 },
      { element: 'water', value: 7 },
      { element: 'air', value: 7 },
    ],
    acquisition: { fr: ACQUISITION_FR, en: ACQUISITION_EN },
  },
  {
    id: 'feathered',
    species: 'dragoturkey',
    name: { fr: 'Dragodinde à Plumes', en: 'Feathered Dragoturkey' },
    bonuses: [{ stat: 'vitality', value: 400, unit: 'flat' }],
    reflectedDamage: 40,
    acquisition: { fr: ACQUISITION_FR, en: ACQUISITION_EN },
  },
]
