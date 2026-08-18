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
 * Structural quirks called out by the brief (section 5): generation 3
 * introduces all four of Roux, Amande, Ivoire and Turquoise at once, and
 * generation 7 introduces a single monocolor, Doré. Both are transcribed
 * faithfully below and pinned by `rhineetles.test.ts`.
 *
 * FR names are transcribed with standard French accents restored (the brief
 * text itself is unaccented, e.g. "Ebene", "Amethyste", "Dore" — the same
 * pattern `BRIEF-phase-1.md` used and `colors.ts` already resolved this way,
 * e.g. its own "Ébène"). This is an orthographic restoration, not a content
 * change: the underlying color identity and every numeric value come only
 * from the brief.
 *
 * Do not add, remove or alter values here without an updated source brief —
 * see `docs/DATA.md` for the correction process.
 */

import { buildSpecies, type MonoSpec } from './species'
import { RHINEETLE } from './speciesInfo'
import type { Bonus, MountColor } from './types'

const flat = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: 'flat' })
const pct = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: '%' })

/**
 * The 15 Rhineetle monocolors: 4 at generation 1 (wild capture), then 4, 2, 1 and 4 at generations 3, 5, 7 and 9.
 */
export const RHINEETLE_MONOS: MonoSpec[] = [
  // --- Generation 1 (wild capture) ---
  {
    id: 'ebony',
    generation: 1,
    name: { fr: 'Ébène', en: 'Ebony' },
    bonuses: [flat('agility', 90)],
    component: [flat('agility', 70)],
  },
  {
    id: 'indigo',
    generation: 1,
    name: { fr: 'Indigo', en: 'Indigo' },
    bonuses: [flat('chance', 90)],
    component: [flat('chance', 70)],
  },
  {
    id: 'crimson',
    generation: 1,
    name: { fr: 'Pourpre', en: 'Crimson' },
    bonuses: [flat('strength', 90)],
    component: [flat('strength', 70)],
  },
  {
    id: 'orchid',
    generation: 1,
    name: { fr: 'Orchidée', en: 'Orchid' },
    bonuses: [flat('intelligence', 90)],
    component: [flat('intelligence', 70)],
  },

  // --- Generation 3 (all four introduced at once — see header note) ---
  {
    id: 'ginger',
    generation: 3,
    name: { fr: 'Roux', en: 'Ginger' },
    bonuses: [flat('pushbackDamage', 70)],
    component: [flat('pushbackDamage', 50)],
    // Every pair of two distinct bicolors among {Pourpre et Orchidee, Pourpre
    // et Indigo, Pourpre et Ebene}: C(3,2) = 3 recipes.
    recipes: [
      [
        ['crimson', 'orchid'],
        ['crimson', 'indigo'],
      ],
      [
        ['crimson', 'orchid'],
        ['crimson', 'ebony'],
      ],
      [
        ['crimson', 'indigo'],
        ['crimson', 'ebony'],
      ],
    ],
  },
  {
    id: 'almond',
    generation: 3,
    name: { fr: 'Amande', en: 'Almond' },
    bonuses: [flat('pushbackResistance', 90)],
    component: [flat('pushbackResistance', 70)],
    // Every pair among {Pourpre et Ebene, Indigo et Ebene, Orchidee et Ebene}.
    recipes: [
      [
        ['crimson', 'ebony'],
        ['indigo', 'ebony'],
      ],
      [
        ['crimson', 'ebony'],
        ['orchid', 'ebony'],
      ],
      [
        ['indigo', 'ebony'],
        ['orchid', 'ebony'],
      ],
    ],
  },
  {
    id: 'ivory',
    generation: 3,
    name: { fr: 'Ivoire', en: 'Ivory' },
    bonuses: [flat('apReduction', 40)],
    component: [flat('apReduction', 30)],
    // Every pair among {Pourpre et Indigo, Orchidee et Indigo, Indigo et Ebene}.
    recipes: [
      [
        ['crimson', 'indigo'],
        ['orchid', 'indigo'],
      ],
      [
        ['crimson', 'indigo'],
        ['indigo', 'ebony'],
      ],
      [
        ['orchid', 'indigo'],
        ['indigo', 'ebony'],
      ],
    ],
  },
  {
    id: 'turquoise',
    generation: 3,
    name: { fr: 'Turquoise', en: 'Turquoise' },
    bonuses: [flat('mpReduction', 40)],
    component: [flat('mpReduction', 30)],
    // Every pair among {Pourpre et Orchidee, Orchidee et Indigo, Orchidee et Ebene}.
    recipes: [
      [
        ['crimson', 'orchid'],
        ['orchid', 'indigo'],
      ],
      [
        ['crimson', 'orchid'],
        ['orchid', 'ebony'],
      ],
      [
        ['orchid', 'indigo'],
        ['orchid', 'ebony'],
      ],
    ],
  },

  // --- Generation 5 ---
  {
    id: 'plum',
    generation: 5,
    name: { fr: 'Prune', en: 'Plum' },
    bonuses: [flat('criticalResistance', 60)],
    component: [flat('criticalResistance', 45)],
    // Amande et Roux + one of the 12 listed second parents.
    recipes: [
      [
        ['almond', 'ginger'],
        ['almond', 'crimson'],
      ],
      [
        ['almond', 'ginger'],
        ['almond', 'orchid'],
      ],
      [
        ['almond', 'ginger'],
        ['almond', 'indigo'],
      ],
      [
        ['almond', 'ginger'],
        ['almond', 'ebony'],
      ],
      [
        ['almond', 'ginger'],
        ['almond', 'turquoise'],
      ],
      [
        ['almond', 'ginger'],
        ['almond', 'ivory'],
      ],
      [
        ['almond', 'ginger'],
        ['ginger', 'crimson'],
      ],
      [
        ['almond', 'ginger'],
        ['ginger', 'orchid'],
      ],
      [
        ['almond', 'ginger'],
        ['ginger', 'indigo'],
      ],
      [
        ['almond', 'ginger'],
        ['ginger', 'ebony'],
      ],
      [
        ['almond', 'ginger'],
        ['ginger', 'ivory'],
      ],
      [
        ['almond', 'ginger'],
        ['ginger', 'turquoise'],
      ],
    ],
  },
  {
    id: 'emerald',
    generation: 5,
    name: { fr: 'Émeraude', en: 'Emerald' },
    bonuses: [pct('critical', 9)],
    component: [pct('critical', 7)],
    // Ivoire et Turquoise + one of the 12 listed second parents.
    recipes: [
      [
        ['ivory', 'turquoise'],
        ['ivory', 'orchid'],
      ],
      [
        ['ivory', 'turquoise'],
        ['ivory', 'indigo'],
      ],
      [
        ['ivory', 'turquoise'],
        ['ivory', 'ebony'],
      ],
      [
        ['ivory', 'turquoise'],
        ['ivory', 'crimson'],
      ],
      [
        ['ivory', 'turquoise'],
        ['almond', 'ivory'],
      ],
      [
        ['ivory', 'turquoise'],
        ['ginger', 'ivory'],
      ],
      [
        ['ivory', 'turquoise'],
        ['ginger', 'turquoise'],
      ],
      [
        ['ivory', 'turquoise'],
        ['turquoise', 'orchid'],
      ],
      [
        ['ivory', 'turquoise'],
        ['turquoise', 'crimson'],
      ],
      [
        ['ivory', 'turquoise'],
        ['turquoise', 'indigo'],
      ],
      [
        ['ivory', 'turquoise'],
        ['turquoise', 'ebony'],
      ],
      [
        ['ivory', 'turquoise'],
        ['almond', 'turquoise'],
      ],
    ],
  },

  // --- Generation 7 (single monocolor introduced — see header note) ---
  {
    id: 'golden',
    generation: 7,
    name: { fr: 'Doré', en: 'Golden' },
    bonuses: [flat('vitality', 250)],
    component: [flat('vitality', 200)],
    recipes: [
      [
        ['plum', 'crimson'],
        ['emerald', 'ginger'],
      ],
      [
        ['plum', 'orchid'],
        ['emerald', 'turquoise'],
      ],
      [
        ['plum', 'indigo'],
        ['emerald', 'ivory'],
      ],
      [
        ['plum', 'ebony'],
        ['emerald', 'almond'],
      ],
      [
        ['plum', 'almond'],
        ['emerald', 'ebony'],
      ],
      [
        ['plum', 'turquoise'],
        ['emerald', 'orchid'],
      ],
      [
        ['plum', 'ginger'],
        ['emerald', 'crimson'],
      ],
      [
        ['plum', 'ivory'],
        ['emerald', 'indigo'],
      ],
    ],
  },

  // --- Generation 9 ---
  {
    id: 'jade',
    generation: 9,
    name: { fr: 'Jade', en: 'Jade' },
    bonuses: [pct('earthResistance', 14)],
    component: [pct('earthResistance', 8)],
    recipes: [
      [
        ['golden', 'crimson'],
        ['plum', 'emerald'],
      ],
      [
        ['golden', 'plum'],
        ['golden', 'ginger'],
      ],
    ],
  },
  {
    id: 'ruby',
    generation: 9,
    name: { fr: 'Rubis', en: 'Ruby' },
    bonuses: [pct('fireResistance', 14)],
    component: [pct('fireResistance', 8)],
    recipes: [
      [
        ['golden', 'orchid'],
        ['plum', 'emerald'],
      ],
      [
        ['golden', 'plum'],
        ['golden', 'almond'],
      ],
    ],
  },
  {
    id: 'sapphire',
    generation: 9,
    name: { fr: 'Saphir', en: 'Sapphire' },
    bonuses: [pct('waterResistance', 14)],
    component: [pct('waterResistance', 8)],
    recipes: [
      [
        ['golden', 'indigo'],
        ['plum', 'emerald'],
      ],
      [
        ['golden', 'emerald'],
        ['golden', 'turquoise'],
      ],
    ],
  },
  {
    id: 'amethyst',
    generation: 9,
    name: { fr: 'Améthyste', en: 'Amethyst' },
    bonuses: [pct('airResistance', 14)],
    component: [pct('airResistance', 8)],
    recipes: [
      [
        ['golden', 'ebony'],
        ['plum', 'emerald'],
      ],
      [
        ['golden', 'emerald'],
        ['golden', 'ivory'],
      ],
    ],
  },
]

/** All 120 Rhineetle colors, ascending by generation then id. */
export const RHINEETLE_COLORS: MountColor[] = buildSpecies(RHINEETLE, RHINEETLE_MONOS)
