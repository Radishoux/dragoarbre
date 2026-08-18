import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { PlanAssumptions } from '../components/Planner/PlanAssumptions'
import { PlanBreakdown } from '../components/Planner/PlanBreakdown'
import { PlanCaptures } from '../components/Planner/PlanCaptures'
import { PlannerControls } from '../components/Planner/PlannerControls'
import { PlanSummary } from '../components/Planner/PlanSummary'
import { PlanTree } from '../components/Planner/PlanTree'
import { computePlan, type PlannerSettings } from '../core/planner'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { buildPlannerHash, decodePlanUrl, encodePlanUrl, type PlanUrlState } from '../utils/planUrl'

/** How long the "link copied" confirmation stays up, in milliseconds. */
const COPY_FEEDBACK_MS = 2000

/**
 * Phase 2's breeding planner: pick a target colour and see every mating, wild
 * capture and intermediate mount it takes to get there.
 *
 * All plan state lives in the URL query rather than in `useState`, so a link
 * is the whole feature's save format — paste one and the exact plan comes
 * back. `computePlan` is a pure function over that state, cheap enough (one
 * pass over 66 colours) to recompute on every slider tick.
 */
export function PlannerPage(): ReactNode {
  useDocumentTitle('planner.title')
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [copied, setCopied] = useState(false)

  const state = useMemo(() => decodePlanUrl(searchParams), [searchParams])

  /**
   * Writes the next state into the URL. Assumption changes replace the current
   * entry — dragging the level slider would otherwise bury the back button
   * under a hundred history entries — while picking a target pushes, so "back"
   * undoes a re-target the way a user expects.
   */
  const commit = useCallback(
    (next: PlanUrlState, push = false) => {
      setSearchParams(encodePlanUrl(next), { replace: !push })
    },
    [setSearchParams],
  )

  const handleTargetChange = useCallback(
    (targetId: string | null) => commit({ ...state, targetId }, true),
    [commit, state],
  )
  const handleQuantityChange = useCallback(
    (quantity: number) => commit({ ...state, quantity }),
    [commit, state],
  )
  const handleSettingsChange = useCallback(
    (settings: PlannerSettings) => commit({ ...state, settings }),
    [commit, state],
  )

  const plan = useMemo(
    () => (state.targetId ? computePlan(state.targetId, state.quantity, state.settings) : null),
    [state],
  )

  const handleCopyLink = useCallback(() => {
    const href = `${window.location.origin}${window.location.pathname}${buildPlannerHash(state)}`
    navigator.clipboard
      ?.writeText(href)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
      })
      .catch(() => {
        // Clipboard access can be denied (insecure context, permission policy).
        // The link is still in the address bar, so there is nothing to report.
      })
  }, [state])

  return (
    <div className="flex flex-1 flex-col gap-4 pb-8">
      <header>
        <h1 className="text-2xl font-semibold text-(--color-gold)">{t('planner.title')}</h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">{t('planner.subtitle')}</p>
      </header>

      <PlannerControls
        state={state}
        onTargetChange={handleTargetChange}
        onQuantityChange={handleQuantityChange}
        onSettingsChange={handleSettingsChange}
      />

      {plan ? (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded border border-(--color-border) px-3 py-1.5 text-xs text-(--color-text-muted) hover:border-(--color-accent) hover:text-(--color-text)"
            >
              {copied ? t('planner.copyLinkDone') : t('planner.copyLink')}
            </button>
          </div>

          <PlanSummary plan={plan} />
          <PlanTree plan={plan} onSelect={handleTargetChange} />
          <PlanCaptures plan={plan} />
          <PlanBreakdown plan={plan} />
        </>
      ) : (
        <p className="rounded-lg border border-(--color-border) bg-(--color-panel) p-4 text-sm text-(--color-text-muted)">
          {t('planner.targetNone')}
        </p>
      )}

      <PlanAssumptions />
    </div>
  )
}
