import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { BreedingPlan } from '../../core/planner'
import { getColorById } from '../../data'
import { useLocalizedName } from '../../hooks/useLocalizedName'
import { usePlanFormat } from './usePlanFormat'

interface PlanCapturesProps {
  plan: BreedingPlan
}

/**
 * The generation-1 mounts to go and catch — the only part of the plan that
 * happens outside a paddock, and therefore the one worth pulling out of the
 * breakdown table into its own checklist.
 */
export function PlanCaptures({ plan }: PlanCapturesProps): ReactNode {
  const { t } = useTranslation()
  const { bareName } = useLocalizedName()
  const format = usePlanFormat()

  if (plan.captures.length === 0) return null

  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
        {t('planner.capturesTitle')}
      </h2>
      <p className="mb-2 text-xs text-(--color-text-muted)">{t('planner.capturesHint')}</p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {plan.captures.map((capture) => {
          const color = getColorById(capture.colorId)
          return (
            <li
              key={capture.colorId}
              className="rounded-lg border border-(--color-border) bg-(--color-panel-raised) p-3"
            >
              <p className="text-sm font-medium text-(--color-text)">
                {color ? bareName(color) : capture.colorId}
              </p>
              <p className="mt-1 text-lg font-semibold text-(--color-gold) tabular-nums">
                {/* `count` drives pluralisation only; `value` carries the
                    locale-formatted number that actually gets interpolated. */}
                {t('planner.badgeTooltip', {
                  count: capture.safe,
                  value: format.count(capture.safe),
                })}
              </p>
              {/* Label and value are space-separated rather than punctuated:
                  French would need a non-breaking space before a colon. */}
              <p className="text-xs text-(--color-text-muted)">
                <span className="tracking-wide uppercase">{t('planner.colExpected')}</span>{' '}
                <span className="tabular-nums">{format.expected(capture.expected)}</span>
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
