import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { BreedingPlan } from '../../core/planner'
import { usePlanFormat } from './usePlanFormat'

interface PlanSummaryProps {
  plan: BreedingPlan
}

/** One headline number with its label and an optional clarifying footnote. */
function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-panel-raised) p-3">
      <p className="text-xs tracking-wide text-(--color-text-muted) uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-(--color-text) tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-(--color-text-muted)">{hint}</p>}
    </div>
  )
}

/**
 * The plan's headline: the per-mating success chance, and the three totals a
 * player needs before committing to a breeding line.
 *
 * The chance is deliberately the largest thing on the page — every other
 * number in the plan is derived from it, so a player who changes one
 * assumption should see immediately what it bought them.
 */
export function PlanSummary({ plan }: PlanSummaryProps): ReactNode {
  const { t } = useTranslation()
  const format = usePlanFormat()

  return (
    <section className="space-y-4">
      <div
        className={`rounded-lg border p-4 ${
          plan.guaranteed
            ? 'border-(--color-gold) bg-(--color-panel-raised)'
            : 'border-(--color-border) bg-(--color-panel)'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
            {t('planner.chanceTitle')}
          </h2>
          {plan.guaranteed && (
            <span className="rounded-full border border-(--color-gold) px-2 py-0.5 text-xs font-semibold text-(--color-gold)">
              {t('planner.guaranteedBadge')}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
          <p>
            <span className="block text-xs text-(--color-text-muted)">
              {t('planner.chanceLabel')}
            </span>
            <span className="block text-4xl font-bold text-(--color-text) tabular-nums">
              {format.percent(plan.chance)}
            </span>
          </p>
          <p>
            <span className="block text-xs text-(--color-text-muted)">
              {t('planner.expectedMatingsLabel')}
            </span>
            <span className="block text-2xl font-semibold text-(--color-text) tabular-nums">
              {format.expected(plan.expectedMatingsPerSuccess)}
            </span>
          </p>
        </div>

        <p className="mt-3 text-sm text-(--color-text-muted)">
          {plan.guaranteed ? t('planner.guaranteedNote') : t('planner.expectationNote')}
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
          {t('planner.summaryTitle')}
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {/* Captures lead with the ceiled count: you cannot catch 2.4 mounts. */}
          <StatCard
            label={t('planner.summaryCaptures')}
            value={format.count(plan.totalCapturesSafe)}
            hint={format.expected(plan.totalCaptures)}
          />
          {/* Only worth its own card when a net makes it differ from the mount
              count — otherwise it is the same number said twice. */}
          {plan.captureFights !== plan.totalCapturesSafe && (
            <StatCard
              label={t('planner.summaryCaptureFights')}
              value={format.count(plan.captureFights)}
              hint={t('planner.summaryCaptureFightsHint')}
            />
          )}
          <StatCard
            label={t('planner.summaryMatings')}
            value={format.expected(plan.totalMatings)}
          />
          <StatCard
            label={t('planner.summaryGenetokens')}
            value={format.expected(plan.genetokens)}
            hint={t('planner.summaryGenetokensHint')}
          />
        </div>
      </div>
    </section>
  )
}
