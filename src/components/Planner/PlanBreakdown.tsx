import { type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { BreedingPlan, PlannedColor } from '../../core/planner'
import { getColorById } from '../../data'
import { useLocalizedName } from '../../hooks/useLocalizedName'
import { usePlanFormat } from './usePlanFormat'

interface PlanBreakdownProps {
  plan: BreedingPlan
}

const cellClass = 'px-3 py-2 text-left align-top'
const numericCellClass = 'px-3 py-2 text-right align-top tabular-nums whitespace-nowrap'

/**
 * The full shopping list: every colour the plan touches, grouped by
 * generation and ordered the way a player works — captures first, target last.
 *
 * Expected counts keep their decimal (they are averages); the safe column is
 * the ceiled count to actually farm.
 */
export function PlanBreakdown({ plan }: PlanBreakdownProps): ReactNode {
  const { t } = useTranslation()
  const { bareName } = useLocalizedName()
  const format = usePlanFormat()

  // `plan.colors` already arrives ascending by generation, so a single pass
  // is enough to bucket it — no sorting, no lookups back into the plan.
  const groups = useMemo(() => {
    const buckets: { generation: number; rows: PlannedColor[] }[] = []
    for (const row of plan.colors) {
      const last = buckets.at(-1)
      if (last && last.generation === row.generation) last.rows.push(row)
      else buckets.push({ generation: row.generation, rows: [row] })
    }
    return buckets
  }, [plan.colors])

  /** The recipe that produces a colour, or the wild-capture note for generation 1. */
  const obtainLabel = (row: PlannedColor): string => {
    const color = getColorById(row.colorId)
    const recipe = color?.crosses?.[0]
    if (!recipe) return t('planner.obtainWild')
    const [parentAId, parentBId] = recipe
    const parentA = getColorById(parentAId)
    const parentB = getColorById(parentBId)
    if (!parentA || !parentB) return t('planner.obtainWild')
    return t('detail.crossWith', { parentA: bareName(parentA), parentB: bareName(parentB) })
  }

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
        {t('planner.breakdownTitle')}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-(--color-border) bg-(--color-panel)">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted) uppercase">
              <th scope="col" className={cellClass}>
                {t('planner.colColor')}
              </th>
              <th scope="col" className={numericCellClass}>
                {t('planner.colExpected')}
              </th>
              <th scope="col" className={numericCellClass}>
                {t('planner.colSafe')}
              </th>
              <th scope="col" className={numericCellClass}>
                {t('planner.colMatings')}
              </th>
              <th scope="col" className={cellClass}>
                {t('planner.colObtain')}
              </th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.generation}>
              <tr className="bg-(--color-panel-raised)">
                <th
                  scope="colgroup"
                  colSpan={5}
                  className="px-3 py-1.5 text-left text-xs font-semibold text-(--color-gold)"
                >
                  {t('planner.generationHeading', { gen: group.generation })}
                </th>
              </tr>
              {group.rows.map((row) => {
                const color = getColorById(row.colorId)
                return (
                  <tr key={row.colorId} className="border-t border-(--color-border)">
                    <th scope="row" className={`${cellClass} font-medium text-(--color-text)`}>
                      {color ? bareName(color) : row.colorId}
                    </th>
                    <td className={`${numericCellClass} text-(--color-text-muted)`}>
                      {format.expected(row.expected)}
                    </td>
                    <td className={`${numericCellClass} font-semibold text-(--color-text)`}>
                      {format.count(row.safe)}
                    </td>
                    <td className={`${numericCellClass} text-(--color-text-muted)`}>
                      {row.wildCapture ? '—' : format.expected(row.matings)}
                    </td>
                    <td className={`${cellClass} text-(--color-text-muted)`}>{obtainLabel(row)}</td>
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  )
}
