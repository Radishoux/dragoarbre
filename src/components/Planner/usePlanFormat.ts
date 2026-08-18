import { useMemo } from 'react'
import { useLocalizedName } from '../../hooks/useLocalizedName'

/** Locale-aware number formatters shared by every planner panel. */
export interface PlanFormatters {
  /**
   * An expected (fractional) value, always to exactly one decimal — `2.5` in
   * English, `2,5` in French. The decimal is never dropped: it is the visual
   * cue that the number is an average, not a count you can hold in your hands.
   */
  expected: (value: number) => string
  /** A whole count, grouped for the locale. Used for the `safe` column and badges. */
  count: (value: number) => string
  /** A 0-1 probability as a locale percentage, e.g. `70%` / `70 %`. */
  percent: (value: number) => string
}

/**
 * Builds the planner's number formatters for the active UI language.
 *
 * Formatters are memoised per language because `Intl.NumberFormat`
 * construction is the expensive part, and the planner re-renders on every tick
 * of the parent-level slider.
 */
export function usePlanFormat(): PlanFormatters {
  const { language } = useLocalizedName()

  return useMemo(() => {
    const expected = new Intl.NumberFormat(language, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
    const count = new Intl.NumberFormat(language, { maximumFractionDigits: 0 })
    const percent = new Intl.NumberFormat(language, {
      style: 'percent',
      maximumFractionDigits: 1,
    })

    return {
      expected: (value) => expected.format(value),
      count: (value) => count.format(value),
      percent: (value) => percent.format(value),
    }
  }, [language])
}
