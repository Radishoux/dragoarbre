/**
 * Integrity tests for the species registry.
 *
 * These pin corrected values rather than structure. Every figure here was
 * wrong or missing in a shipped build at some point, so each assertion exists
 * because something actually regressed — see `docs/DECISIONS.md`.
 */

import { describe, expect, test } from 'bun:test'
import { ALL_SPECIES, DRAGOTURKEY, getSpecies, RHINEETLE, SEEMYOOL } from './speciesInfo'

describe('species registry', () => {
  test('covers exactly the three species, in tab order', () => {
    expect(ALL_SPECIES.map((species) => species.id)).toEqual([
      'dragoturkey',
      'seemyool',
      'rhineetle',
    ])
  })

  test('getSpecies is total over the registry', () => {
    for (const species of ALL_SPECIES) {
      expect(getSpecies(species.id)).toBe(species)
    }
  })
})

describe('common bonus tiers', () => {
  test('every species has at least one tier, ascending by level', () => {
    for (const species of ALL_SPECIES) {
      expect(species.commonBonusTiers.length).toBeGreaterThan(0)
      const levels = species.commonBonusTiers.map((tier) => tier.fromLevel)
      expect([...levels].sort((a, b) => a - b)).toEqual(levels)
      expect(new Set(levels).size).toBe(levels.length)
    }
  })

  test('a Dragoturkey carries 300 Vitality at level 100 and 400 at level 200', () => {
    // Shipped flat at 400 with no level until the breeder-guide source gave
    // both steps. The tier list exists for this species.
    expect(DRAGOTURKEY.commonBonusTiers).toEqual([
      { fromLevel: 100, bonus: { stat: 'vitality', value: 300, unit: 'flat' } },
      { fromLevel: 200, bonus: { stat: 'vitality', value: 400, unit: 'flat' } },
    ])
  })

  test('the other two species have a single step at level 100', () => {
    expect(SEEMYOOL.commonBonusTiers).toEqual([
      { fromLevel: 100, bonus: { stat: 'movementPoints', value: 1, unit: 'flat' } },
    ])
    expect(RHINEETLE.commonBonusTiers).toEqual([
      { fromLevel: 100, bonus: { stat: 'actionPoints', value: 1, unit: 'flat' } },
    ])
  })
})

describe('wild capture text', () => {
  test('is present and non-trivial in both languages', () => {
    for (const species of ALL_SPECIES) {
      expect(species.wildCapture.fr.length).toBeGreaterThan(40)
      expect(species.wildCapture.en.length).toBeGreaterThan(40)
    }
  })

  test('names the capture spell correctly', () => {
    // Shipped as "Dressage de Monture" / "Mount Taming"; both source pages
    // independently give "Apprivoisement de monture". Pinned so the wrong
    // name cannot come back.
    expect(DRAGOTURKEY.wildCapture.fr).toContain('Apprivoisement de monture')
    expect(DRAGOTURKEY.wildCapture.en).toContain('Apprivoisement de monture')
    for (const species of ALL_SPECIES) {
      expect(species.wildCapture.fr).not.toContain('Dressage de Monture')
      expect(species.wildCapture.en).not.toContain('Mount Taming"')
    }
  })

  test('states each species maximum HP', () => {
    expect(DRAGOTURKEY.wildCapture.fr).toContain('900 PV')
    expect(SEEMYOOL.wildCapture.fr).toContain('1000 PV')
    expect(RHINEETLE.wildCapture.fr).toContain('1000 PV')
  })
})
