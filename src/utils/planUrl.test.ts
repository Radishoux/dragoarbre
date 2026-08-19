import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_PLANNER_SETTINGS,
  PARENT_LEVEL_MAX,
  PARENT_LEVEL_MIN,
  type PlannerSettings,
} from '../core/planner'
import {
  buildPlannerHash,
  buildSpeciesSearch,
  CONFIDENCE_LEVELS,
  DEFAULT_PLAN_URL_STATE,
  DEFAULT_SPECIES,
  decodePlanUrl,
  decodeSpecies,
  encodePlanUrl,
  type PlanUrlState,
  planSpecies,
  QUANTITY_MAX,
  QUANTITY_MIN,
} from './planUrl'

const params = (query: string) => new URLSearchParams(query)

describe('decodePlanUrl', () => {
  test('an empty query gives the documented defaults', () => {
    expect(decodePlanUrl(params(''))).toEqual(DEFAULT_PLAN_URL_STATE)
  })

  test('reads every parameter', () => {
    expect(decodePlanUrl(params('target=indigo&qty=3&level=200&opti=0&takeza=1&clone=0'))).toEqual({
      targetId: 'indigo',
      quantity: 3,
      settings: {
        parentLevel: 200,
        optimakina: false,
        almanaxTakeza: true,
        cloning: false,
        reproducteur: false,
        captureNet: 'universal',
      },
    })
  })

  test('missing parameters fall back individually, not all-or-nothing', () => {
    const state = decodePlanUrl(params('target=ebony&takeza=1'))
    expect(state.targetId).toBe('ebony')
    expect(state.quantity).toBe(DEFAULT_PLAN_URL_STATE.quantity)
    expect(state.settings.parentLevel).toBe(DEFAULT_PLANNER_SETTINGS.parentLevel)
    expect(state.settings.optimakina).toBe(DEFAULT_PLANNER_SETTINGS.optimakina)
    expect(state.settings.cloning).toBe(DEFAULT_PLANNER_SETTINGS.cloning)
    expect(state.settings.almanaxTakeza).toBe(true)
  })

  test('an unknown colour id decodes to no target', () => {
    const state = decodePlanUrl(params('target=not-a-colour&qty=4'))
    expect(state.targetId).toBeNull()
    // The rest of the state still survives an unknown target.
    expect(state.quantity).toBe(4)
  })

  test('an empty target decodes to no target', () => {
    expect(decodePlanUrl(params('target=')).targetId).toBeNull()
  })

  test('clamps an out-of-range level', () => {
    expect(decodePlanUrl(params('level=9999')).settings.parentLevel).toBe(PARENT_LEVEL_MAX)
    expect(decodePlanUrl(params('level=-5')).settings.parentLevel).toBe(PARENT_LEVEL_MIN)
    expect(decodePlanUrl(params('level=0')).settings.parentLevel).toBe(PARENT_LEVEL_MIN)
  })

  test('clamps an out-of-range quantity', () => {
    expect(decodePlanUrl(params('qty=0')).quantity).toBe(QUANTITY_MIN)
    expect(decodePlanUrl(params('qty=-12')).quantity).toBe(QUANTITY_MIN)
    expect(decodePlanUrl(params(`qty=${QUANTITY_MAX + 1000}`)).quantity).toBe(QUANTITY_MAX)
  })

  test('unparseable numbers fall back to the default rather than NaN', () => {
    expect(decodePlanUrl(params('qty=many&level=high')).quantity).toBe(
      DEFAULT_PLAN_URL_STATE.quantity,
    )
    expect(decodePlanUrl(params('qty=many&level=high')).settings.parentLevel).toBe(
      DEFAULT_PLANNER_SETTINGS.parentLevel,
    )
  })

  test('only 0 and 1 flip a flag; anything else keeps the default', () => {
    expect(decodePlanUrl(params('opti=0')).settings.optimakina).toBe(false)
    expect(decodePlanUrl(params('opti=1')).settings.optimakina).toBe(true)
    expect(decodePlanUrl(params('opti=true')).settings.optimakina).toBe(
      DEFAULT_PLANNER_SETTINGS.optimakina,
    )
    expect(decodePlanUrl(params('clone=yes')).settings.cloning).toBe(
      DEFAULT_PLANNER_SETTINGS.cloning,
    )
  })
})

describe('encodePlanUrl', () => {
  test('omits every parameter that equals its default', () => {
    expect(encodePlanUrl(DEFAULT_PLAN_URL_STATE).toString()).toBe('')
  })

  test('a target alone produces a minimal query', () => {
    expect(encodePlanUrl({ ...DEFAULT_PLAN_URL_STATE, targetId: 'indigo' }).toString()).toBe(
      'target=indigo',
    )
  })

  test('writes only the non-default assumptions', () => {
    const settings: PlannerSettings = {
      ...DEFAULT_PLANNER_SETTINGS,
      almanaxTakeza: true,
      cloning: false,
    }
    const encoded = encodePlanUrl({ targetId: 'ebony', quantity: 1, settings })
    expect(encoded.get('takeza')).toBe('1')
    expect(encoded.get('clone')).toBe('0')
    expect(encoded.get('opti')).toBeNull()
    expect(encoded.get('level')).toBeNull()
    expect(encoded.get('qty')).toBeNull()
  })

  test('a non-default flag that is off is written explicitly as 0', () => {
    const encoded = encodePlanUrl({
      ...DEFAULT_PLAN_URL_STATE,
      settings: { ...DEFAULT_PLANNER_SETTINGS, optimakina: false },
    })
    expect(encoded.get('opti')).toBe('0')
  })

  test('normalises out-of-range and unknown values on the way out', () => {
    const encoded = encodePlanUrl({
      targetId: 'not-a-colour',
      quantity: 10_000,
      settings: { ...DEFAULT_PLANNER_SETTINGS, parentLevel: -3 },
    })
    expect(encoded.get('target')).toBeNull()
    expect(encoded.get('qty')).toBe(String(QUANTITY_MAX))
    expect(encoded.get('level')).toBe(String(PARENT_LEVEL_MIN))
  })
})

describe('round trip', () => {
  const cases: PlanUrlState[] = [
    DEFAULT_PLAN_URL_STATE,
    { ...DEFAULT_PLAN_URL_STATE, targetId: 'almond' },
    {
      targetId: 'indigo',
      quantity: 7,
      settings: {
        parentLevel: 200,
        optimakina: false,
        almanaxTakeza: true,
        cloning: false,
        reproducteur: false,
        captureNet: 'universal',
      },
    },
    {
      targetId: 'ebony',
      quantity: QUANTITY_MAX,
      settings: {
        parentLevel: PARENT_LEVEL_MIN,
        optimakina: true,
        almanaxTakeza: false,
        cloning: true,
        reproducteur: false,
        captureNet: 'universal',
      },
    },
  ]

  for (const state of cases) {
    test(`survives encode → decode: ${JSON.stringify(state)}`, () => {
      expect(decodePlanUrl(encodePlanUrl(state))).toEqual(state)
    })
  }

  test('normalises an invalid state to a valid one in a single round trip', () => {
    const decoded = decodePlanUrl(
      encodePlanUrl({
        targetId: 'nope',
        quantity: 0,
        settings: { ...DEFAULT_PLANNER_SETTINGS, parentLevel: 5000 },
      }),
    )
    expect(decoded).toEqual({
      targetId: null,
      quantity: QUANTITY_MIN,
      settings: { ...DEFAULT_PLANNER_SETTINGS, parentLevel: PARENT_LEVEL_MAX },
    })
  })
})

describe('buildPlannerHash', () => {
  test('drops the question mark when nothing is non-default', () => {
    expect(buildPlannerHash(DEFAULT_PLAN_URL_STATE)).toBe('#/planner')
  })

  test('puts the query inside the hash fragment', () => {
    expect(buildPlannerHash({ ...DEFAULT_PLAN_URL_STATE, targetId: 'indigo', quantity: 2 })).toBe(
      '#/planner?target=indigo&qty=2',
    )
  })

  test('a built hash decodes back to the same state', () => {
    const state: PlanUrlState = {
      targetId: 'ebony',
      quantity: 3,
      settings: {
        parentLevel: 42,
        optimakina: false,
        almanaxTakeza: true,
        cloning: false,
        reproducteur: false,
        captureNet: 'universal',
      },
    }
    const query = buildPlannerHash(state).split('?')[1] ?? ''
    expect(decodePlanUrl(new URLSearchParams(query))).toEqual(state)
  })
})

// Phase 3 added exactly one parameter, `species`. Everything above this line is
// the phase 2 contract and passes untouched; everything below pins the new one.
describe('decodeSpecies', () => {
  test('an absent parameter gives the documented default', () => {
    expect(decodeSpecies(params(''))).toBe(DEFAULT_SPECIES)
    expect(DEFAULT_SPECIES).toBe('dragoturkey')
  })

  test('reads each of the three species', () => {
    expect(decodeSpecies(params('species=dragoturkey'))).toBe('dragoturkey')
    expect(decodeSpecies(params('species=seemyool'))).toBe('seemyool')
    expect(decodeSpecies(params('species=rhineetle'))).toBe('rhineetle')
  })

  test('an unknown or empty species falls back to the default', () => {
    expect(decodeSpecies(params('species=unicorn'))).toBe(DEFAULT_SPECIES)
    expect(decodeSpecies(params('species='))).toBe(DEFAULT_SPECIES)
    expect(decodeSpecies(params('species=SEEMYOOL'))).toBe(DEFAULT_SPECIES)
  })

  test('ignores the other planner parameters', () => {
    expect(decodeSpecies(params('target=seemyool-almond&qty=3'))).toBe(DEFAULT_SPECIES)
  })
})

describe('buildSpeciesSearch', () => {
  test('the default species produces no query at all', () => {
    expect(buildSpeciesSearch('dragoturkey')).toBe('')
  })

  test('the other two produce a ?-prefixed search', () => {
    expect(buildSpeciesSearch('seemyool')).toBe('?species=seemyool')
    expect(buildSpeciesSearch('rhineetle')).toBe('?species=rhineetle')
  })

  test('what it builds is what decodeSpecies reads back', () => {
    for (const species of ['dragoturkey', 'seemyool', 'rhineetle'] as const) {
      const search = buildSpeciesSearch(species)
      expect(decodeSpecies(params(search.replace(/^\?/, '')))).toBe(species)
    }
  })
})

describe('planSpecies', () => {
  test('defaults when neither a target nor the parameter says otherwise', () => {
    expect(planSpecies(DEFAULT_PLAN_URL_STATE)).toBe('dragoturkey')
  })

  test('the parameter decides when there is no target', () => {
    expect(planSpecies({ ...DEFAULT_PLAN_URL_STATE, species: 'rhineetle' })).toBe('rhineetle')
  })

  test('a valid target outranks a contradictory parameter', () => {
    expect(
      planSpecies({
        ...DEFAULT_PLAN_URL_STATE,
        targetId: 'seemyool-almond',
        species: 'rhineetle',
      }),
    ).toBe('seemyool')
  })

  test('an unknown target leaves the parameter in charge', () => {
    expect(
      planSpecies({ ...DEFAULT_PLAN_URL_STATE, targetId: 'not-a-colour', species: 'seemyool' }),
    ).toBe('seemyool')
  })
})

describe('species in the plan URL', () => {
  test('absent decodes to no species key, so phase 2 state is unchanged', () => {
    expect(decodePlanUrl(params('target=indigo'))).toEqual({
      ...DEFAULT_PLAN_URL_STATE,
      targetId: 'indigo',
    })
    expect(decodePlanUrl(params('target=indigo'))).not.toHaveProperty('species')
  })

  test('an explicit default species is normalised away rather than stored', () => {
    expect(decodePlanUrl(params('species=dragoturkey'))).toEqual(DEFAULT_PLAN_URL_STATE)
  })

  test('an invalid species is ignored, and the rest of the state survives it', () => {
    const state = decodePlanUrl(params('species=unicorn&qty=4'))
    expect(state.species).toBeUndefined()
    expect(planSpecies(state)).toBe('dragoturkey')
    expect(state.quantity).toBe(4)
  })

  test('a species without a target decodes and re-encodes', () => {
    const state = decodePlanUrl(params('species=seemyool'))
    expect(state).toEqual({ ...DEFAULT_PLAN_URL_STATE, species: 'seemyool' })
    expect(encodePlanUrl(state).toString()).toBe('species=seemyool')
  })

  test('a target of another species overrides the parameter on the way in and out', () => {
    const state = decodePlanUrl(params('species=rhineetle&target=seemyool-almond'))
    expect(state.species).toBe('seemyool')
    expect(encodePlanUrl(state).get('species')).toBe('seemyool')
  })

  test('the species is derived from the target even when the parameter is missing', () => {
    expect(decodePlanUrl(params('target=rhineetle-golden')).species).toBe('rhineetle')
  })

  test('encoding leads with the species, so a shared link reads scope-first', () => {
    expect(
      encodePlanUrl({ ...DEFAULT_PLAN_URL_STATE, targetId: 'seemyool-almond', quantity: 2 }),
    ).toEqual(params('species=seemyool&target=seemyool-almond&qty=2'))
  })

  test('the default species is still omitted from the query', () => {
    expect(encodePlanUrl({ ...DEFAULT_PLAN_URL_STATE, species: 'dragoturkey' }).toString()).toBe('')
  })

  test('buildPlannerHash carries the species', () => {
    expect(buildPlannerHash({ ...DEFAULT_PLAN_URL_STATE, species: 'rhineetle' })).toBe(
      '#/planner?species=rhineetle',
    )
    expect(buildPlannerHash({ ...DEFAULT_PLAN_URL_STATE, targetId: 'seemyool-turquoise' })).toBe(
      '#/planner?species=seemyool&target=seemyool-turquoise',
    )
  })

  const speciesCases: PlanUrlState[] = [
    { ...DEFAULT_PLAN_URL_STATE, species: 'seemyool' },
    { ...DEFAULT_PLAN_URL_STATE, species: 'rhineetle' },
    { ...DEFAULT_PLAN_URL_STATE, targetId: 'seemyool-almond', species: 'seemyool' },
    {
      targetId: 'rhineetle-golden',
      quantity: 12,
      settings: {
        parentLevel: 150,
        optimakina: false,
        almanaxTakeza: true,
        cloning: false,
        reproducteur: false,
        captureNet: 'universal',
      },
      species: 'rhineetle',
    },
  ]

  for (const state of speciesCases) {
    test(`survives encode → decode: ${JSON.stringify(state)}`, () => {
      expect(decodePlanUrl(encodePlanUrl(state))).toEqual(state)
    })
  }
})

describe('confidence in the plan URL', () => {
  test('absent decodes to no key at all, so earlier state is unchanged', () => {
    // Same rule as the species parameter: a link written before this existed
    // must decode to an object deep-equal to what it decoded to then.
    expect(decodePlanUrl(params('target=indigo'))).toEqual({
      targetId: 'indigo',
      quantity: DEFAULT_PLAN_URL_STATE.quantity,
      settings: DEFAULT_PLANNER_SETTINGS,
    })
  })

  test('each offered level round-trips', () => {
    for (const level of CONFIDENCE_LEVELS) {
      const state = { ...DEFAULT_PLAN_URL_STATE, targetId: 'indigo', confidence: level }
      expect(decodePlanUrl(encodePlanUrl(state))).toEqual(state)
    }
  })

  test('a level that is not offered is ignored rather than trusted', () => {
    // Hand-edited URLs reach this; an unsupported percentile must not reach the
    // sampler, which would silently clamp it to something else.
    for (const raw of ['1', '99', '0', 'lots', '']) {
      expect(decodePlanUrl(params(`target=indigo&conf=${raw}`)).confidence).toBeUndefined()
    }
  })

  test('a fractional level truncates, the way level and quantity already do', () => {
    // Not a deliberate feature so much as the established convention: every
    // numeric parameter here goes through `parseInt`, so `level=200.7` is 200
    // and `conf=90.5` is 90. Documented rather than special-cased, because
    // diverging on one parameter would be the surprising choice.
    expect(decodePlanUrl(params('target=indigo&conf=90.5')).confidence).toBe(90)
  })

  test('it does not disturb the rest of the state', () => {
    const decoded = decodePlanUrl(params('target=ebony&qty=4&conf=95&clone=0'))
    expect(decoded.confidence).toBe(95)
    expect(decoded.targetId).toBe('ebony')
    expect(decoded.quantity).toBe(4)
    expect(decoded.settings.cloning).toBe(false)
  })
})
