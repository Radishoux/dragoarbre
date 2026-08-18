/**
 * Dragoturkey (Dragodinde) breeding data — all 66 colors, generations 1-10.
 *
 * Source: `BRIEF-phase-1.md`, section 3 (community-documented data, current
 * as of the Dofus 3.5 breeding rework). Last verified: 2026-08-18.
 *
 * Do not add, remove or alter values here without an updated source brief —
 * see `docs/DATA.md` for the correction process.
 */
import type { Bonus, MountColor, Recipe } from './types'

const flat = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: 'flat' })
const pct = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: '%' })

/**
 * Builds a mono (odd-generation) color entry.
 *
 * The `cross` parameter stays a single pair: every Dragoturkey color has
 * exactly one recipe, and keeping the builder's shape meant the 66 entries
 * below did not have to be rewritten when the model moved to
 * {@link MountColor.crosses}. It is wrapped into a one-element list here.
 */
function mono(
  id: string,
  generation: number,
  name: MountColor['name'],
  bonuses: Bonus[],
  cross?: Recipe,
): MountColor {
  return {
    id,
    species: 'dragoturkey',
    generation,
    kind: 'mono',
    name,
    bonuses,
    ...(cross ? { crosses: [cross] } : { wildCapture: true as const }),
  }
}

/** Builds a bicolor (even-generation) entry, always from a two-parent cross. */
function bicolor(
  id: string,
  generation: number,
  name: MountColor['name'],
  bonuses: Bonus[],
  cross: Recipe,
): MountColor {
  return {
    id,
    species: 'dragoturkey',
    generation,
    kind: 'bicolor',
    name,
    bonuses,
    crosses: [cross],
  }
}

export const DRAGOTURKEY_COLORS: MountColor[] = [
  // --- Generation 1 (wild capture) ---
  mono('almond', 1, { fr: 'Amande', en: 'Almond' }, [flat('initiative', 1700)]),
  mono('golden', 1, { fr: 'Dorée', en: 'Golden' }, [flat('summons', 2)]),
  mono('ginger', 1, { fr: 'Rousse', en: 'Ginger' }, [flat('heals', 60)]),

  // --- Generation 2 ---
  bicolor(
    'almond-ginger',
    2,
    { fr: 'Amande et Rousse', en: 'Almond and Ginger' },
    [flat('heals', 60), flat('initiative', 1200)],
    ['almond', 'ginger'],
  ),
  bicolor(
    'golden-ginger',
    2,
    { fr: 'Dorée et Rousse', en: 'Golden and Ginger' },
    [flat('summons', 1), flat('heals', 45)],
    ['golden', 'ginger'],
  ),
  bicolor(
    'almond-golden',
    2,
    { fr: 'Amande et Dorée', en: 'Almond and Golden' },
    [flat('summons', 1), flat('initiative', 1200)],
    ['almond', 'golden'],
  ),

  // --- Generation 3 ---
  mono(
    'ebony',
    3,
    { fr: 'Ébène', en: 'Ebony' },
    [flat('agility', 120)],
    ['almond-golden', 'golden-ginger'],
  ),
  mono(
    'indigo',
    3,
    { fr: 'Indigo', en: 'Indigo' },
    [flat('chance', 120)],
    ['almond-golden', 'almond-ginger'],
  ),

  // --- Generation 4 ---
  bicolor(
    'indigo-ginger',
    4,
    { fr: 'Indigo et Rousse', en: 'Indigo and Ginger' },
    [flat('chance', 90), flat('heals', 45)],
    ['indigo', 'ginger'],
  ),
  bicolor(
    'ebony-ginger',
    4,
    { fr: 'Ébène et Rousse', en: 'Ebony and Ginger' },
    [flat('agility', 90), flat('heals', 45)],
    ['ebony', 'ginger'],
  ),
  bicolor(
    'almond-indigo',
    4,
    { fr: 'Amande et Indigo', en: 'Almond and Indigo' },
    [flat('chance', 90), flat('initiative', 1200)],
    ['almond', 'indigo'],
  ),
  bicolor(
    'almond-ebony',
    4,
    { fr: 'Amande et Ébène', en: 'Almond and Ebony' },
    [flat('agility', 120), flat('initiative', 1200)],
    ['almond', 'ebony'],
  ),
  bicolor(
    'golden-indigo',
    4,
    { fr: 'Dorée et Indigo', en: 'Golden and Indigo' },
    [flat('chance', 90), flat('summons', 1)],
    ['golden', 'indigo'],
  ),
  bicolor(
    'golden-ebony',
    4,
    { fr: 'Dorée et Ébène', en: 'Golden and Ebony' },
    [flat('agility', 90), flat('summons', 1)],
    ['golden', 'ebony'],
  ),
  bicolor(
    'ebony-indigo',
    4,
    { fr: 'Ébène et Indigo', en: 'Ebony and Indigo' },
    [flat('chance', 90), flat('agility', 90)],
    ['ebony', 'indigo'],
  ),

  // --- Generation 5 ---
  mono(
    'crimson',
    5,
    { fr: 'Pourpre', en: 'Crimson' },
    [flat('strength', 120)],
    ['ebony-indigo', 'almond-ginger'],
  ),
  mono(
    'orchid',
    5,
    { fr: 'Orchidée', en: 'Orchid' },
    [flat('intelligence', 120)],
    ['ebony-indigo', 'golden-ginger'],
  ),

  // --- Generation 6 ---
  bicolor(
    'crimson-ginger',
    6,
    { fr: 'Pourpre et Rousse', en: 'Crimson and Ginger' },
    [flat('strength', 90), flat('heals', 45)],
    ['crimson', 'ginger'],
  ),
  bicolor(
    'orchid-ginger',
    6,
    { fr: 'Orchidée et Rousse', en: 'Orchid and Ginger' },
    [flat('intelligence', 90), flat('heals', 45)],
    ['orchid', 'ginger'],
  ),
  bicolor(
    'almond-crimson',
    6,
    { fr: 'Amande et Pourpre', en: 'Almond and Crimson' },
    [flat('strength', 90), flat('initiative', 1200)],
    ['almond', 'crimson'],
  ),
  bicolor(
    'almond-orchid',
    6,
    { fr: 'Amande et Orchidée', en: 'Almond and Orchid' },
    [flat('intelligence', 90), flat('initiative', 1200)],
    ['almond', 'orchid'],
  ),
  bicolor(
    'golden-crimson',
    6,
    { fr: 'Dorée et Pourpre', en: 'Golden and Crimson' },
    [flat('strength', 90), flat('summons', 1)],
    ['golden', 'crimson'],
  ),
  bicolor(
    'golden-orchid',
    6,
    { fr: 'Dorée et Orchidée', en: 'Golden and Orchid' },
    [flat('intelligence', 90), flat('summons', 1)],
    ['golden', 'orchid'],
  ),
  bicolor(
    'indigo-crimson',
    6,
    { fr: 'Indigo et Pourpre', en: 'Indigo and Crimson' },
    [flat('strength', 90), flat('chance', 90)],
    ['indigo', 'crimson'],
  ),
  bicolor(
    'indigo-orchid',
    6,
    { fr: 'Indigo et Orchidée', en: 'Indigo and Orchid' },
    [flat('intelligence', 90), flat('chance', 90)],
    ['indigo', 'orchid'],
  ),
  bicolor(
    'ebony-crimson',
    6,
    { fr: 'Ébène et Pourpre', en: 'Ebony and Crimson' },
    [flat('strength', 90), flat('agility', 90)],
    ['ebony', 'crimson'],
  ),
  bicolor(
    'ebony-orchid',
    6,
    { fr: 'Ébène et Orchidée', en: 'Ebony and Orchid' },
    [flat('intelligence', 90), flat('agility', 90)],
    ['ebony', 'orchid'],
  ),
  bicolor(
    'orchid-crimson',
    6,
    { fr: 'Orchidée et Pourpre', en: 'Orchid and Crimson' },
    [flat('strength', 90), flat('intelligence', 90)],
    ['orchid', 'crimson'],
  ),

  // --- Generation 7 ---
  mono(
    'ivory',
    7,
    { fr: 'Ivoire', en: 'Ivory' },
    [flat('power', 90)],
    ['orchid-crimson', 'indigo-crimson'],
  ),
  mono(
    'turquoise',
    7,
    { fr: 'Turquoise', en: 'Turquoise' },
    [flat('prospecting', 90)],
    ['orchid-crimson', 'ebony-orchid'],
  ),

  // --- Generation 8 ---
  bicolor(
    'ivory-ginger',
    8,
    { fr: 'Ivoire et Rousse', en: 'Ivory and Ginger' },
    [flat('power', 70), flat('heals', 45)],
    ['ivory', 'ginger'],
  ),
  bicolor(
    'turquoise-ginger',
    8,
    { fr: 'Turquoise et Rousse', en: 'Turquoise and Ginger' },
    [flat('heals', 45), flat('prospecting', 70)],
    ['turquoise', 'ginger'],
  ),
  bicolor(
    'almond-ivory',
    8,
    { fr: 'Amande et Ivoire', en: 'Almond and Ivory' },
    [flat('power', 70), flat('initiative', 1200)],
    ['almond', 'ivory'],
  ),
  bicolor(
    'almond-turquoise',
    8,
    { fr: 'Amande et Turquoise', en: 'Almond and Turquoise' },
    [flat('prospecting', 70), flat('initiative', 1200)],
    ['almond', 'turquoise'],
  ),
  bicolor(
    'golden-ivory',
    8,
    { fr: 'Dorée et Ivoire', en: 'Golden and Ivory' },
    [flat('power', 70), flat('summons', 1)],
    ['golden', 'ivory'],
  ),
  bicolor(
    'golden-turquoise',
    8,
    { fr: 'Dorée et Turquoise', en: 'Golden and Turquoise' },
    [flat('summons', 1), flat('prospecting', 70)],
    ['golden', 'turquoise'],
  ),
  bicolor(
    'indigo-ivory',
    8,
    { fr: 'Indigo et Ivoire', en: 'Indigo and Ivory' },
    [flat('chance', 90), flat('power', 70)],
    ['indigo', 'ivory'],
  ),
  bicolor(
    'indigo-turquoise',
    8,
    { fr: 'Indigo et Turquoise', en: 'Indigo and Turquoise' },
    [flat('chance', 90), flat('prospecting', 70)],
    ['indigo', 'turquoise'],
  ),
  bicolor(
    'ebony-ivory',
    8,
    { fr: 'Ébène et Ivoire', en: 'Ebony and Ivory' },
    [flat('agility', 90), flat('power', 70)],
    ['ebony', 'ivory'],
  ),
  bicolor(
    'ebony-turquoise',
    8,
    { fr: 'Ébène et Turquoise', en: 'Ebony and Turquoise' },
    [flat('agility', 90), flat('prospecting', 70)],
    ['ebony', 'turquoise'],
  ),
  bicolor(
    'ivory-crimson',
    8,
    { fr: 'Ivoire et Pourpre', en: 'Ivory and Crimson' },
    [flat('strength', 90), flat('power', 70)],
    ['ivory', 'crimson'],
  ),
  bicolor(
    'turquoise-crimson',
    8,
    { fr: 'Turquoise et Pourpre', en: 'Turquoise and Crimson' },
    [flat('strength', 90), flat('prospecting', 70)],
    ['turquoise', 'crimson'],
  ),
  bicolor(
    'ivory-orchid',
    8,
    { fr: 'Ivoire et Orchidée', en: 'Ivory and Orchid' },
    [flat('intelligence', 90), flat('power', 70)],
    ['ivory', 'orchid'],
  ),
  bicolor(
    'turquoise-orchid',
    8,
    { fr: 'Turquoise et Orchidée', en: 'Turquoise and Orchid' },
    [flat('intelligence', 90), flat('prospecting', 70)],
    ['turquoise', 'orchid'],
  ),
  bicolor(
    'ivory-turquoise',
    8,
    { fr: 'Ivoire et Turquoise', en: 'Ivory and Turquoise' },
    [flat('power', 70), flat('prospecting', 70)],
    ['ivory', 'turquoise'],
  ),

  // --- Generation 9 ---
  mono(
    'emerald',
    9,
    { fr: 'Émeraude', en: 'Emerald' },
    [pct('critical', 14)],
    ['ivory-turquoise', 'ivory-crimson'],
  ),
  mono(
    'plum',
    9,
    { fr: 'Prune', en: 'Plum' },
    [flat('range', 2)],
    ['ivory-turquoise', 'turquoise-orchid'],
  ),

  // --- Generation 10 ---
  bicolor(
    'emerald-ginger',
    10,
    { fr: 'Émeraude et Rousse', en: 'Emerald and Ginger' },
    [pct('critical', 10), flat('heals', 45)],
    ['emerald', 'ginger'],
  ),
  bicolor(
    'plum-ginger',
    10,
    { fr: 'Prune et Rousse', en: 'Plum and Ginger' },
    [flat('range', 1), flat('heals', 45)],
    ['plum', 'ginger'],
  ),
  bicolor(
    'almond-emerald',
    10,
    { fr: 'Amande et Émeraude', en: 'Almond and Emerald' },
    [pct('critical', 10), flat('initiative', 1200)],
    ['almond', 'emerald'],
  ),
  bicolor(
    'plum-almond',
    10,
    { fr: 'Prune et Amande', en: 'Plum and Almond' },
    [flat('range', 1), flat('initiative', 1200)],
    ['plum', 'almond'],
  ),
  bicolor(
    'golden-emerald',
    10,
    { fr: 'Dorée et Émeraude', en: 'Golden and Emerald' },
    [pct('critical', 10), flat('summons', 1)],
    ['golden', 'emerald'],
  ),
  bicolor(
    'plum-golden',
    10,
    { fr: 'Prune et Dorée', en: 'Plum and Golden' },
    [flat('range', 1), flat('summons', 1)],
    ['plum', 'golden'],
  ),
  bicolor(
    'emerald-indigo',
    10,
    { fr: 'Émeraude et Indigo', en: 'Emerald and Indigo' },
    [flat('chance', 90), pct('critical', 10)],
    ['emerald', 'indigo'],
  ),
  bicolor(
    'plum-indigo',
    10,
    { fr: 'Prune et Indigo', en: 'Plum and Indigo' },
    [flat('chance', 90), flat('range', 1)],
    ['plum', 'indigo'],
  ),
  bicolor(
    'ebony-emerald',
    10,
    { fr: 'Ébène et Émeraude', en: 'Ebony and Emerald' },
    [flat('agility', 90), pct('critical', 10)],
    ['ebony', 'emerald'],
  ),
  bicolor(
    'plum-ebony',
    10,
    { fr: 'Prune et Ébène', en: 'Plum and Ebony' },
    [flat('agility', 90), flat('range', 1)],
    ['plum', 'ebony'],
  ),
  bicolor(
    'emerald-crimson',
    10,
    { fr: 'Émeraude et Pourpre', en: 'Emerald and Crimson' },
    [flat('strength', 90), pct('critical', 10)],
    ['emerald', 'crimson'],
  ),
  bicolor(
    'plum-crimson',
    10,
    { fr: 'Prune et Pourpre', en: 'Plum and Crimson' },
    [flat('strength', 90), flat('range', 1)],
    ['plum', 'crimson'],
  ),
  bicolor(
    'emerald-orchid',
    10,
    { fr: 'Émeraude et Orchidée', en: 'Emerald and Orchid' },
    [flat('intelligence', 90), pct('critical', 10)],
    ['emerald', 'orchid'],
  ),
  bicolor(
    'plum-orchid',
    10,
    { fr: 'Prune et Orchidée', en: 'Plum and Orchid' },
    [flat('intelligence', 90), flat('range', 1)],
    ['plum', 'orchid'],
  ),
  bicolor(
    'emerald-ivory',
    10,
    { fr: 'Émeraude et Ivoire', en: 'Emerald and Ivory' },
    [flat('power', 70), pct('critical', 10)],
    ['emerald', 'ivory'],
  ),
  bicolor(
    'plum-ivory',
    10,
    { fr: 'Prune et Ivoire', en: 'Plum and Ivory' },
    [flat('power', 70), flat('range', 1)],
    ['plum', 'ivory'],
  ),
  bicolor(
    'emerald-turquoise',
    10,
    { fr: 'Émeraude et Turquoise', en: 'Emerald and Turquoise' },
    [pct('critical', 10), flat('prospecting', 70)],
    ['emerald', 'turquoise'],
  ),
  bicolor(
    'plum-turquoise',
    10,
    { fr: 'Prune et Turquoise', en: 'Plum and Turquoise' },
    [flat('range', 1), flat('prospecting', 70)],
    ['plum', 'turquoise'],
  ),
  bicolor(
    'plum-emerald',
    10,
    { fr: 'Prune et Émeraude', en: 'Plum and Emerald' },
    [pct('critical', 10), flat('range', 1)],
    ['plum', 'emerald'],
  ),
]
