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
 * #/planner?species=<id>&target=<colorId>&qty=<int>&level=<int>&opti=<0|1>&takeza=<0|1>&clone=<0|1>
 * ```
 *
 * Phase 3 added `species` — and only `species`. The six phase 2 names above are
 * already live in shared links, so the new one is optional with a default and
 * is omitted from the query whenever it *is* the default. A phase 2 link
 * therefore still decodes to byte-identical state, which is what lets the whole
 * phase 2 test suite stand unchanged.
 */

import {
  DEFAULT_PLANNER_SETTINGS,
  PARENT_LEVEL_MAX,
  PARENT_LEVEL_MIN,
  type PlannerSettings,
} from '../core/planner'
import { ALL_SPECIES, getColorById, type SpeciesId } from '../data'

/**
 * Query-parameter names carried in the planner's hash route.
 *
 * Frozen contract: external links are written against these exact strings.
 */
export const PLAN_URL_PARAMS = {
  species: 'species',
  target: 'target',
  quantity: 'qty',
  level: 'level',
  optimakina: 'opti',
  takeza: 'takeza',
  cloning: 'clone',
} as const

/**
 * The species a URL carrying no `species` parameter scopes to.
 *
 * Dragoturkeys, because every link written before phase 3 meant them and none
 * of those links carry the parameter.
 */
export const DEFAULT_SPECIES: SpeciesId = 'dragoturkey'

const SPECIES_IDS: ReadonlySet<string> = new Set(ALL_SPECIES.map((species) => species.id))

/**
 * Reads the `species` parameter on its own.
 *
 * Used by every screen, not just the planner: the tree carries its selected
 * species in the same parameter so one vocabulary covers the whole app.
 * An absent, empty or unknown value falls back to {@link DEFAULT_SPECIES}
 * rather than erroring — a hand-edited link is user input.
 *
 * @example
 * decodeSpecies(new URLSearchParams('species=seemyool')) // 'seemyool'
 * decodeSpecies(new URLSearchParams('species=unicorn')) // 'dragoturkey'
 */
export function decodeSpecies(params: URLSearchParams): SpeciesId {
  const raw = params.get(PLAN_URL_PARAMS.species)
  return raw && SPECIES_IDS.has(raw) ? (raw as SpeciesId) : DEFAULT_SPECIES
}

/**
 * The search string that scopes a link to one species, `?`-prefixed and ready
 * for `<Link to={{ pathname, search }}>`. Empty for the default species, so
 * the Dragoturkey tab keeps producing the bare `#/` and `#/planner` URLs.
 *
 * @example
 * buildSpeciesSearch('rhineetle') // '?species=rhineetle'
 * buildSpeciesSearch('dragoturkey') // ''
 */
export function buildSpeciesSearch(species: SpeciesId): string {
  return species === DEFAULT_SPECIES ? '' : `?${PLAN_URL_PARAMS.species}=${species}`
}

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
  /**
   * Which species the planner is scoped to.
   *
   * Optional, and *absent* rather than `'dragoturkey'` when it is the default:
   * that is what keeps a decoded phase 2 state deep-equal to the object phase 2
   * produced. Read it through {@link planSpecies}, never raw, so the default is
   * applied in exactly one place.
   */
  species?: SpeciesId
}

/** What a planner URL carrying no parameters at all decodes to. */
export const DEFAULT_PLAN_URL_STATE: PlanUrlState = {
  targetId: null,
  quantity: QUANTITY_MIN,
  settings: DEFAULT_PLANNER_SETTINGS,
}

/**
 * The species a plan is actually scoped to.
 *
 * A valid target outranks the parameter: a plan for `seemyool-almond` is a
 * Seemyool plan whatever `?species=` claims, and letting the two disagree would
 * put the header on one species while the planner works on another. With no
 * target, the parameter decides; with neither, {@link DEFAULT_SPECIES} does.
 *
 * @example
 * planSpecies({ targetId: 'seemyool-almond', quantity: 1, settings, species: 'rhineetle' })
 * // 'seemyool' — the target wins
 */
export function planSpecies(state: PlanUrlState): SpeciesId {
  const target = state.targetId ? getColorById(state.targetId) : undefined
  return target?.species ?? state.species ?? DEFAULT_SPECIES
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
 * @example
 * // The species key is present only when it is not the default.
 * decodePlanUrl(new URLSearchParams('species=seemyool')).species // 'seemyool'
 * decodePlanUrl(new URLSearchParams('species=dragoturkey')).species // undefined
 */
export function decodePlanUrl(params: URLSearchParams): PlanUrlState {
  const rawTarget = params.get(PLAN_URL_PARAMS.target)
  const targetId = rawTarget && getColorById(rawTarget) ? rawTarget : null
  // Resolved rather than copied through, so `?species=rhineetle&target=indigo`
  // decodes to the one species that is actually consistent with the plan.
  const species = getColorById(targetId ?? '')?.species ?? decodeSpecies(params)

  return {
    // Spread-omitted rather than set to `undefined`: the default species leaves
    // no trace in the decoded object at all, exactly as it leaves none in the URL.
    ...(species === DEFAULT_SPECIES ? {} : { species }),
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
 * @example
 * // A non-default species leads, so a shared link says what it is about.
 * encodePlanUrl({ ...DEFAULT_PLAN_URL_STATE, targetId: 'seemyool-almond' })
 *   .toString() // 'species=seemyool&target=seemyool-almond'
 */
export function encodePlanUrl(state: PlanUrlState): URLSearchParams {
  const params = new URLSearchParams()

  // First, so the parameter that scopes everything else reads first in the
  // link. Written even when the target already implies it: `BRIEF-phase-3.md`
  // section 8 asks shared plan URLs to carry the species explicitly.
  const species = planSpecies(state)
  if (species !== DEFAULT_SPECIES) {
    params.set(PLAN_URL_PARAMS.species, species)
  }

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
