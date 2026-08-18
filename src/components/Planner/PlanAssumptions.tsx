import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The four modelling simplifications behind every number the planner shows,
 * in the order they bite: what makes the chance exact, what the estimate
 * ignores, and where it is optimistic rather than conservative.
 */
const ASSUMPTIONS = [
  {
    titleKey: 'planner.assumptions.cleanGenealogyTitle',
    bodyKey: 'planner.assumptions.cleanGenealogy',
  },
  {
    titleKey: 'planner.assumptions.failedBirthsTitle',
    bodyKey: 'planner.assumptions.failedBirths',
  },
  { titleKey: 'planner.assumptions.gendersTitle', bodyKey: 'planner.assumptions.genders' },
  { titleKey: 'planner.assumptions.cloningTitle', bodyKey: 'planner.assumptions.cloning' },
] as const

/**
 * Collapsible disclosure of the planner's modelling assumptions.
 *
 * Uses a native `<details>` so it works without JavaScript state, stays
 * keyboard-operable for free, and is findable by in-page browser search even
 * while collapsed.
 */
export function PlanAssumptions(): ReactNode {
  const { t } = useTranslation()

  return (
    <details className="rounded-lg border border-(--color-border) bg-(--color-panel) p-4 [&[open]_summary]:mb-3">
      <summary className="cursor-pointer text-sm font-semibold text-(--color-text) marker:text-(--color-gold)">
        {t('planner.assumptions.title')}
      </summary>
      <p className="text-sm text-(--color-text-muted)">{t('planner.assumptions.intro')}</p>
      <dl className="mt-3 space-y-3">
        {ASSUMPTIONS.map((assumption) => (
          <div key={assumption.titleKey}>
            <dt className="text-sm font-medium text-(--color-text)">{t(assumption.titleKey)}</dt>
            <dd className="text-sm text-(--color-text-muted)">{t(assumption.bodyKey)}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
