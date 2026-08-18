/**
 * Shareable URL state for the breeding planner.
 *
 * The planner has no persistent store: the query string *is* its state, so a
 * pasted link rebuilds the exact same plan. These are pure functions over
 * `URLSearchParams` — the page reads them through `useSearchParams`, and other
 * screens (e.g. the detail panel's "plan this mount" link) build a planner href
 * from the same vocabulary.
 *
 * The parameter names are a contract with those callers; they are exported as
 * {@link PLAN_URL_PARAMS} rather than inlined so a rename can never silently
 * break an inbound link.
 *
 * ```text
 * #/planner?target=<colorId>&qty=<int>&level=<int>&opti=<0|1>&takeza=<0|1>&clone=<0|1>
 * ```
 */

import {
  DEFAULT_PLANNER_SETTINGS,
  PARENT_LEVEL_MAX,
  PARENT_LEVEL_MIN,
  type PlannerSettings,
} from '../core/planner'
import { getColorById } from '../data'

/**
 * Query-parameter names carried in the planner's hash route.
 *
 * Frozen contract: external links are written against these exact strings.
 */
export const PLAN_URL_PARAMS = {
  target: 'target',
  quantity: 'qty',
  level: 'level',
  optimakina: 'opti',
  takeza: 'takeza',
  cloning: 'clone',
} as const

/** Inclusive bounds for the planner's quantity input. */
export const QUANTITY_MIN = 1

/**
 * Upper bound for the quantity input. The maths stays linear well beyond this,
 * but a four-digit order of magnitude is past the point where a "shopping
 * list" means anything, and it keeps a hand-edited URL from rendering a
 * nonsense plan.
 */
export const QUANTITY_MAX = 999

/** The planner's complete user-controlled state, and everything the URL carries. */
export interface PlanUrlState {
  /** Target colour id, or `null` when no (valid) target is selected. */
  targetId: string | null
  /** How many of the target are wanted; always within the quantity bounds. */
  quantity: number
  /** Plan-wide breeding assumptions; always within the level bounds. */
  settings: PlannerSettings
}

/** What a planner URL carrying no parameters at all decodes to. */
export const DEFAULT_PLAN_URL_STATE: PlanUrlState = {
  targetId: null,
  quantity: QUANTITY_MIN,
  settings: DEFAULT_PLANNER_SETTINGS,
}

/** The planner's route path, without the leading `#` of the hash router. */
const PLANNER_PATH = '/planner'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Reads an integer parameter, falling back to `fallback` when it is absent or
 * unparseable and clamping it into range otherwise. Hand-edited and stale
 * links are treated as user input, never trusted.
 */
function readInt(
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = params.get(name)
  if (raw === null) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return fallback
  return clamp(parsed, min, max)
}

/** Reads a `0`/`1` flag; any other value (including absence) keeps `fallback`. */
function readFlag(params: URLSearchParams, name: string, fallback: boolean): boolean {
  const raw = params.get(name)
  if (raw === '1') return true
  if (raw === '0') return false
  return fallback
}

/**
 * Parses planner state out of a query string.
 *
 * Every parameter is optional and independently validated, so a partial,
 * stale or hand-edited URL still yields a usable plan instead of an error.
 * An unknown colour id decodes to no target at all rather than to a plan the
 * engine would refuse to compute.
 *
 * @example
 * decodePlanUrl(new URLSearchParams('target=indigo&qty=2&level=200'))
 * // { targetId: 'indigo', quantity: 2, settings: { parentLevel: 200, ... } }
 * @example
 * // Out-of-range values clamp instead of throwing.
 * decodePlanUrl(new URLSearchParams('level=9999')).settings.parentLevel // 200
 */
export function decodePlanUrl(params: URLSearchParams): PlanUrlState {
  const rawTarget = params.get(PLAN_URL_PARAMS.target)
  const targetId = rawTarget && getColorById(rawTarget) ? rawTarget : null

  return {
    targetId,
    quantity: readInt(
      params,
      PLAN_URL_PARAMS.quantity,
      DEFAULT_PLAN_URL_STATE.quantity,
      QUANTITY_MIN,
      QUANTITY_MAX,
    ),
    settings: {
      parentLevel: readInt(
        params,
        PLAN_URL_PARAMS.level,
        DEFAULT_PLANNER_SETTINGS.parentLevel,
        PARENT_LEVEL_MIN,
        PARENT_LEVEL_MAX,
      ),
      optimakina: readFlag(params, PLAN_URL_PARAMS.optimakina, DEFAULT_PLANNER_SETTINGS.optimakina),
      almanaxTakeza: readFlag(
        params,
        PLAN_URL_PARAMS.takeza,
        DEFAULT_PLANNER_SETTINGS.almanaxTakeza,
      ),
      cloning: readFlag(params, PLAN_URL_PARAMS.cloning, DEFAULT_PLANNER_SETTINGS.cloning),
    },
  }
}

/**
 * Serialises planner state back into a query string.
 *
 * Parameters equal to their default are omitted, so the common case produces a
 * short, readable link (`?target=indigo`). Values are normalised on the way
 * out — clamped, and an unknown colour id dropped — which makes
 * `decodePlanUrl(encodePlanUrl(state))` a fixed point for any input.
 *
 * @example
 * encodePlanUrl({ targetId: 'indigo', quantity: 1, settings: DEFAULT_PLANNER_SETTINGS })
 *   .toString() // 'target=indigo'
 */
export function encodePlanUrl(state: PlanUrlState): URLSearchParams {
  const params = new URLSearchParams()

  if (state.targetId && getColorById(state.targetId)) {
    params.set(PLAN_URL_PARAMS.target, state.targetId)
  }

  const quantity = clamp(Math.trunc(state.quantity), QUANTITY_MIN, QUANTITY_MAX)
  if (quantity !== DEFAULT_PLAN_URL_STATE.quantity) {
    params.set(PLAN_URL_PARAMS.quantity, String(quantity))
  }

  const level = clamp(Math.trunc(state.settings.parentLevel), PARENT_LEVEL_MIN, PARENT_LEVEL_MAX)
  if (level !== DEFAULT_PLANNER_SETTINGS.parentLevel) {
    params.set(PLAN_URL_PARAMS.level, String(level))
  }

  if (state.settings.optimakina !== DEFAULT_PLANNER_SETTINGS.optimakina) {
    params.set(PLAN_URL_PARAMS.optimakina, state.settings.optimakina ? '1' : '0')
  }
  if (state.settings.almanaxTakeza !== DEFAULT_PLANNER_SETTINGS.almanaxTakeza) {
    params.set(PLAN_URL_PARAMS.takeza, state.settings.almanaxTakeza ? '1' : '0')
  }
  if (state.settings.cloning !== DEFAULT_PLANNER_SETTINGS.cloning) {
    params.set(PLAN_URL_PARAMS.cloning, state.settings.cloning ? '1' : '0')
  }

  return params
}

/**
 * Builds the hash fragment for a planner link, e.g. `#/planner?target=indigo`.
 *
 * Prefixed with `#` because the app runs under a `HashRouter`: the query lives
 * *inside* the fragment, not before it.
 *
 * @example
 * buildPlannerHash(DEFAULT_PLAN_URL_STATE) // '#/planner'
 */
export function buildPlannerHash(state: PlanUrlState): string {
  const query = encodePlanUrl(state).toString()
  return query ? `#${PLANNER_PATH}?${query}` : `#${PLANNER_PATH}`
}
