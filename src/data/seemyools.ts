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
 * FR names are transcribed with standard French accents restored (the brief
 * text itself is unaccented, e.g. "Ebene", "Dore", "Emeraude" — the same
 * pattern `BRIEF-phase-1.md` used and `colors.ts` already resolved this way,
 * e.g. its own "Ébène"). This is an orthographic restoration, not a content
 * change: the underlying color identity and every numeric value come only
 * from the brief.
 *
 * Esquive PA / Esquive PM are mapped to the `apParry` / `mpParry` `StatId`s.
 * The brief itself flags these EN terms as expected-but-unconfirmed (section
 * 6) — see the verify comments on Ivory and Turquoise below.
 *
 * Do not add, remove or alter values here without an updated source brief —
 * see `docs/DATA.md` for the correction process.
 */

import { buildSpecies, type MonoSpec } from './species'
import { SEEMYOOL } from './speciesInfo'
import type { Bonus, MountColor } from './types'

const flat = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: 'flat' })
const pct = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: '%' })

/**
 * The 15 Seemyool monocolors: 5 at generation 1 (wild capture), then 2, 2, 2
 * and 4 at generations 3, 5, 7 and 9. `buildSpecies()` derives the other 105
 * (bicolor) colors from these.
 */
export const SEEMYOOL_MONOS: MonoSpec[] = [
  // --- Generation 1 (wild capture) ---
  {
    id: 'ebony',
    generation: 1,
    name: { fr: 'Ébène', en: 'Ebony' },
    bonuses: [pct('airResistance', 18)],
    component: [pct('airResistance', 10)],
  },
  {
    id: 'indigo',
    generation: 1,
    name: { fr: 'Indigo', en: 'Indigo' },
    bonuses: [pct('waterResistance', 18)],
    component: [pct('waterResistance', 10)],
  },
  {
    id: 'crimson',
    generation: 1,
    name: { fr: 'Pourpre', en: 'Crimson' },
    bonuses: [pct('earthResistance', 18)],
    component: [pct('earthResistance', 10)],
  },
  {
    id: 'orchid',
    generation: 1,
    name: { fr: 'Orchidée', en: 'Orchid' },
    bonuses: [pct('fireResistance', 18)],
    component: [pct('fireResistance', 10)],
  },
  {
    id: 'golden',
    generation: 1,
    name: { fr: 'Doré', en: 'Golden' },
    bonuses: [flat('power', 70)],
    component: [flat('power', 60)],
  },

  // --- Generation 3 ---
  {
    id: 'ginger',
    generation: 3,
    name: { fr: 'Roux', en: 'Ginger' },
    bonuses: [flat('lock', 50)],
    component: [flat('lock', 40)],
    // Every pair of two distinct bicolors among {Dore et Pourpre, Dore et
    // Indigo, Dore et Ebene, Dore et Orchidee}: C(4,2) = 6 recipes.
    recipes: [
      [
        ['golden', 'crimson'],
        ['golden', 'indigo'],
      ],
      [
        ['golden', 'crimson'],
        ['golden', 'ebony'],
      ],
      [
        ['golden', 'crimson'],
        ['golden', 'orchid'],
      ],
      [
        ['golden', 'indigo'],
        ['golden', 'ebony'],
      ],
      [
        ['golden', 'indigo'],
        ['golden', 'orchid'],
      ],
      [
        ['golden', 'ebony'],
        ['golden', 'orchid'],
      ],
    ],
  },
  {
    id: 'almond',
    generation: 3,
    name: { fr: 'Amande', en: 'Almond' },
    bonuses: [flat('dodge', 50)],
    component: [flat('dodge', 40)],
    // Indigo et Pourpre + Ebene et Orchidee; Ebene et Pourpre + Indigo et
    // Orchidee; Orchidee et Pourpre + Ebene et Indigo.
    recipes: [
      [
        ['indigo', 'crimson'],
        ['ebony', 'orchid'],
      ],
      [
        ['ebony', 'crimson'],
        ['indigo', 'orchid'],
      ],
      [
        ['orchid', 'crimson'],
        ['ebony', 'indigo'],
      ],
    ],
  },

  // --- Generation 5 ---
  {
    id: 'ivory',
    generation: 5,
    name: { fr: 'Ivoire', en: 'Ivory' },
    // Esquive PA -> 'apParry': expected EN term per the brief (section 6),
    // but explicitly flagged there as unconfirmed. Verify in game.
    bonuses: [flat('apParry', 50)],
    component: [flat('apParry', 40)],
    // Roux et Dore + one of {Ebene et Amande, Indigo et Amande, Orchidee et
    // Amande, Pourpre et Amande}; Roux et Amande + one of {Ebene et Amande,
    // Pourpre et Amande, Indigo et Amande, Orchidee et Amande}.
    recipes: [
      [
        ['ginger', 'golden'],
        ['ebony', 'almond'],
      ],
      [
        ['ginger', 'golden'],
        ['indigo', 'almond'],
      ],
      [
        ['ginger', 'golden'],
        ['orchid', 'almond'],
      ],
      [
        ['ginger', 'golden'],
        ['crimson', 'almond'],
      ],
      [
        ['ginger', 'almond'],
        ['ebony', 'almond'],
      ],
      [
        ['ginger', 'almond'],
        ['crimson', 'almond'],
      ],
      [
        ['ginger', 'almond'],
        ['indigo', 'almond'],
      ],
      [
        ['ginger', 'almond'],
        ['orchid', 'almond'],
      ],
    ],
  },
  {
    id: 'turquoise',
    generation: 5,
    name: { fr: 'Turquoise', en: 'Turquoise' },
    // Esquive PM -> 'mpParry': expected EN term per the brief (section 6),
    // but explicitly flagged there as unconfirmed. Verify in game.
    bonuses: [flat('mpParry', 50)],
    component: [flat('mpParry', 40)],
    // Dore et Amande + one of {Roux et Ebene, Roux et Orchidee, Roux et
    // Pourpre, Roux et Indigo}; Roux et Amande + one of {Roux et Ebene, Roux
    // et Indigo, Roux et Orchidee, Roux et Pourpre}.
    recipes: [
      [
        ['golden', 'almond'],
        ['ginger', 'ebony'],
      ],
      [
        ['golden', 'almond'],
        ['ginger', 'orchid'],
      ],
      [
        ['golden', 'almond'],
        ['ginger', 'crimson'],
      ],
      [
        ['golden', 'almond'],
        ['ginger', 'indigo'],
      ],
      [
        ['ginger', 'almond'],
        ['ginger', 'ebony'],
      ],
      [
        ['ginger', 'almond'],
        ['ginger', 'indigo'],
      ],
      [
        ['ginger', 'almond'],
        ['ginger', 'orchid'],
      ],
      [
        ['ginger', 'almond'],
        ['ginger', 'crimson'],
      ],
    ],
  },

  // --- Generation 7 ---
  {
    id: 'plum',
    generation: 7,
    name: { fr: 'Prune', en: 'Plum' },
    bonuses: [pct('critical', 12)],
    component: [pct('critical', 8)],
    // Ebene et Ivoire + Turquoise et Pourpre; Indigo et Ivoire + Turquoise et
    // Orchidee; Orchidee et Ivoire + Turquoise et Indigo; Pourpre et Ivoire +
    // Turquoise et Ebene.
    recipes: [
      [
        ['ebony', 'ivory'],
        ['turquoise', 'crimson'],
      ],
      [
        ['indigo', 'ivory'],
        ['turquoise', 'orchid'],
      ],
      [
        ['orchid', 'ivory'],
        ['turquoise', 'indigo'],
      ],
      [
        ['crimson', 'ivory'],
        ['turquoise', 'ebony'],
      ],
    ],
  },
  {
    id: 'emerald',
    generation: 7,
    name: { fr: 'Émeraude', en: 'Emerald' },
    bonuses: [flat('criticalDamage', 40)],
    component: [flat('criticalDamage', 30)],
    // Turquoise et Ivoire + one of {Turquoise et Dore, Turquoise et Roux,
    // Amande et Ivoire, Dore et Ivoire, Turquoise et Amande}; Turquoise et
    // Amande + one of {Roux et Ivoire, Dore et Ivoire}; Dore et Ivoire +
    // Turquoise et Roux.
    recipes: [
      [
        ['turquoise', 'ivory'],
        ['turquoise', 'golden'],
      ],
      [
        ['turquoise', 'ivory'],
        ['turquoise', 'ginger'],
      ],
      [
        ['turquoise', 'ivory'],
        ['almond', 'ivory'],
      ],
      [
        ['turquoise', 'ivory'],
        ['golden', 'ivory'],
      ],
      [
        ['turquoise', 'ivory'],
        ['turquoise', 'almond'],
      ],
      [
        ['turquoise', 'almond'],
        ['ginger', 'ivory'],
      ],
      [
        ['turquoise', 'almond'],
        ['golden', 'ivory'],
      ],
      [
        ['golden', 'ivory'],
        ['turquoise', 'ginger'],
      ],
    ],
  },

  // --- Generation 9 ---
  {
    id: 'amber',
    generation: 9,
    name: { fr: 'Ambre', en: 'Amber' },
    bonuses: [flat('earthDamage', 40)],
    component: [flat('earthDamage', 30)],
    // Pourpre et Emeraude + Roux et Emeraude; Orchidee et Emeraude + Amande
    // et Emeraude; Indigo et Emeraude + Ivoire et Emeraude; Ebene et
    // Emeraude + Turquoise et Emeraude; Dore et Emeraude + Prune et
    // Emeraude.
    recipes: [
      [
        ['crimson', 'emerald'],
        ['ginger', 'emerald'],
      ],
      [
        ['orchid', 'emerald'],
        ['almond', 'emerald'],
      ],
      [
        ['indigo', 'emerald'],
        ['ivory', 'emerald'],
      ],
      [
        ['ebony', 'emerald'],
        ['turquoise', 'emerald'],
      ],
      [
        ['golden', 'emerald'],
        ['plum', 'emerald'],
      ],
    ],
  },
  {
    id: 'coral',
    generation: 9,
    name: { fr: 'Corail', en: 'Coral' },
    bonuses: [flat('fireDamage', 40)],
    component: [flat('fireDamage', 30)],
    // Prune et Pourpre + Prune et Roux; Prune et Orchidee + Prune et Amande;
    // Prune et Indigo + Prune et Ivoire; Prune et Ebene + Prune et
    // Turquoise; Prune et Dore + Prune et Emeraude.
    recipes: [
      [
        ['plum', 'crimson'],
        ['plum', 'ginger'],
      ],
      [
        ['plum', 'orchid'],
        ['plum', 'almond'],
      ],
      [
        ['plum', 'indigo'],
        ['plum', 'ivory'],
      ],
      [
        ['plum', 'ebony'],
        ['plum', 'turquoise'],
      ],
      [
        ['plum', 'golden'],
        ['plum', 'emerald'],
      ],
    ],
  },
  {
    id: 'azure',
    generation: 9,
    name: { fr: 'Azur', en: 'Azure' },
    bonuses: [flat('waterDamage', 40)],
    component: [flat('waterDamage', 30)],
    // SOURCE IRREGULARITY (BRIEF-phase-3.md section 4, "Note on Azur"): the
    // brief lists "Prune et Ivoire" as the second parent of BOTH the third
    // AND the fifth recipe below. Symmetry with the sibling colors (Ambre,
    // Corail, Aigue-marine, each of which cycles its second parent through
    // five distinct bicolors) suggests the fifth should read "Prune et
    // Emeraude" instead — but the sourcing rule (docs/DATA.md) forbids
    // "fixing" data by guesswork, so this is transcribed exactly as given.
    // Re-verify in game.
    recipes: [
      [
        ['crimson', 'emerald'],
        ['plum', 'ginger'],
      ],
      [
        ['orchid', 'emerald'],
        ['plum', 'almond'],
      ],
      [
        ['indigo', 'emerald'],
        ['plum', 'ivory'],
      ],
      [
        ['ebony', 'emerald'],
        ['plum', 'turquoise'],
      ],
      [
        ['golden', 'emerald'],
        ['plum', 'ivory'], // faithful transcription — see irregularity note above
      ],
    ],
  },
  {
    id: 'aquamarine',
    generation: 9,
    name: { fr: 'Aigue-marine', en: 'Aquamarine' },
    bonuses: [flat('airDamage', 40)],
    component: [flat('airDamage', 30)],
    // POSSIBLE SOURCE IRREGULARITY, same shape as the confirmed Azur one
    // above (not separately named in BRIEF-phase-3.md, but noticed while
    // transcribing): the brief lists "Turquoise et Emeraude" as the second
    // parent of BOTH the fourth AND the fifth recipe below, where the
    // sibling colors (Ambre, Corail) each cycle through five distinct
    // second parents. Transcribed exactly as given per the sourcing rule —
    // re-verify in game.
    recipes: [
      [
        ['plum', 'crimson'],
        ['ginger', 'emerald'],
      ],
      [
        ['plum', 'orchid'],
        ['almond', 'emerald'],
      ],
      [
        ['plum', 'indigo'],
        ['ivory', 'emerald'],
      ],
      [
        ['plum', 'ebony'],
        ['turquoise', 'emerald'],
      ],
      [
        ['plum', 'golden'],
        ['turquoise', 'emerald'], // faithful transcription — see irregularity note above
      ],
    ],
  },
]

/** All 120 Seemyool colors, ascending by generation then id. */
export const SEEMYOOL_COLORS: MountColor[] = buildSpecies(SEEMYOOL, SEEMYOOL_MONOS)
