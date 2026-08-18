/**
 * The three species' metadata: the species word, the bonus every mount of the
 * species carries, and where generation 1 is captured in the wild.
 *
 * Sources: `BRIEF-phase-1.md` section 3 (Dragoturkeys) and
 * `BRIEF-phase-3.md` sections 4 and 5 (Seemyools, Rhineetles), corrected
 * against the user-provided dofuspourlesnoobs.com pages "Les dragodindes"
 * and "Guide de l'éleveur" (see `docs/DATA.md`).
 * Last verified: 2026-08-19.
 *
 * Split out from the per-species colour files on purpose: this is the
 * cross-cutting registry the UI reads to render a species tab, so it stays in
 * one place rather than being assembled from three datasets. Do not add,
 * remove or alter values here without an updated source brief — see
 * `docs/DATA.md` for the correction process.
 */

import type { SpeciesInfo } from './species'
import type { Bonus, SpeciesId } from './types'

const flat = (stat: Bonus['stat'], value: number): Bonus => ({ stat, value, unit: 'flat' })

/**
 * Dragoturkeys (Dragodindes).
 *
 * The common bonus is the one that is genuinely tiered: 300 Vitality from
 * level 100, 400 from level 200. The phase 1 brief gave only the 400 figure
 * with no level, so phase 3 shipped it flat; the breeder-guide source states
 * both steps explicitly.
 */
export const DRAGOTURKEY: SpeciesInfo = {
  id: 'dragoturkey',
  singular: { fr: 'Dragodinde', en: 'Dragoturkey' },
  commonBonusTiers: [
    { fromLevel: 100, bonus: flat('vitality', 300) },
    { fromLevel: 200, bonus: flat('vitality', 400) },
  ],
  wildCapture: {
    fr: 'Capturée sur le territoire des dragodindes sauvages, dans la zone de la Montagne Koalak (zaap le plus proche : Village des Éleveurs [-16,1]). Les dragodindes sauvages sont des monstres de niveau 62 à 70, 900 PV maximum. La capture nécessite un filet de capture confectionné par la profession Éleveur, qui octroie le sort « Apprivoisement de monture » en combat (1 PA, portée 7, sans ligne de vue, une fois par combat). Le personnage doit être niveau 60 pour équiper une Dragodinde.',
    en: 'Captured in the Wild Dragoturkey Territory, in the Koalak Mountain area (nearest zaap: Village des Éleveurs [-16,1]). Wild Dragoturkeys are level 62-70 monsters with 900 HP maximum. Capturing requires a capture net crafted by the Breeder profession, which grants the "Apprivoisement de monture" (Mount Taming) spell in combat: 1 AP, range 7, no line of sight, once per fight. A character must be level 60 to equip a Dragoturkey.',
  },
}

/** Seemyools (Muldos) — the amphibious species, equippable underwater. */
export const SEEMYOOL: SpeciesInfo = {
  id: 'seemyool',
  singular: { fr: 'Muldo', en: 'Seemyool' },
  commonBonusTiers: [{ fromLevel: 100, bonus: flat('movementPoints', 1) }],
  wildCapture: {
    fr: 'Capturé dans la zone « Bassin des Muldos », dans la baie de Sufokia. Trois accès : l’atelier des éleveurs de Sufokia en [19,23] (scaphandre à l’intérieur), le Territoire des Bandits en [15,19] (barque puis corde), ou Sufokia en [22,19] (échelle face au sous-marin). Les Muldos sauvages sont des monstres de niveau 62 à 70, 1000 PV maximum. Les Muldos sont amphibies : ils restent équipables sous l’eau.',
    en: 'Captured in the "Bassin des Muldos" area, in the bay of Sufokia. Three accesses: the breeders’ workshop of Sufokia at [19,23] (diving suit inside), the Bandit Territory at [15,19] (rowboat then rope), or Sufokia at [22,19] (ladder facing the submarine). Wild Seemyools are level 62-70 monsters, 1000 HP maximum. Seemyools are amphibious: they stay equippable underwater.',
  },
}

/** Rhineetles (Volkornes). */
export const RHINEETLE: SpeciesInfo = {
  id: 'rhineetle',
  singular: { fr: 'Volkorne', en: 'Rhineetle' },
  commonBonusTiers: [{ fromLevel: 100, bonus: flat('actionPoints', 1) }],
  wildCapture: {
    fr: 'Capturé dans la zone « Haras de Brakmar », au sud de Brakmar, accessible par la sortie sud de Brakmar en [-25,40]. Les Volkornes sauvages sont des monstres de niveau 62 à 70, 1000 PV maximum.',
    en: 'Captured in the "Haras de Brakmar" area, south of Brakmar, reached through the southern exit of Brakmar at [-25,40]. Wild Rhineetles are level 62-70 monsters, 1000 HP maximum.',
  },
}

/** Every species, in the order their tabs appear in the header. */
export const ALL_SPECIES: readonly SpeciesInfo[] = [DRAGOTURKEY, SEEMYOOL, RHINEETLE]

const BY_ID: ReadonlyMap<SpeciesId, SpeciesInfo> = new Map(
  ALL_SPECIES.map((species) => [species.id, species]),
)

/** Looks up a species' metadata. Total over {@link SpeciesId}, so never undefined. */
export function getSpecies(id: SpeciesId): SpeciesInfo {
  return BY_ID.get(id) as SpeciesInfo
}
