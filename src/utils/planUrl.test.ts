import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_PLANNER_SETTINGS,
  PARENT_LEVEL_MAX,
  PARENT_LEVEL_MIN,
  type PlannerSettings,
} from '../core/planner'
import {
  buildPlannerHash,
  DEFAULT_PLAN_URL_STATE,
  decodePlanUrl,
  encodePlanUrl,
  type PlanUrlState,
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
      settings: { parentLevel: 200, optimakina: false, almanaxTakeza: true, cloning: false },
    },
    {
      targetId: 'ebony',
      quantity: QUANTITY_MAX,
      settings: {
        parentLevel: PARENT_LEVEL_MIN,
        optimakina: true,
        almanaxTakeza: false,
        cloning: true,
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
      settings: { parentLevel: 42, optimakina: false, almanaxTakeza: true, cloning: false },
    }
    const query = buildPlannerHash(state).split('?')[1] ?? ''
    expect(decodePlanUrl(new URLSearchParams(query))).toEqual(state)
  })
})
