import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { RecipeChoice, RecipeRanking } from '../core/planner'
import { getChildrenIds, getColorById, getSpecies, type MountColor } from '../data'
import { useLocalizedName } from '../hooks/useLocalizedName'

interface DetailPanelProps {
  color: MountColor | null
  /**
   * The colour's ranked recipes, cheapest first. Optional so the panel still
   * renders without a ranking; the recipe list then falls back to the colour's
   * own `crosses` order, unpriced.
   */
  ranking?: RecipeRanking | null
  onSelect: (id: string) => void
  onClose?: () => void
}

export function DetailPanel({ color, ranking, onSelect, onClose }: DetailPanelProps) {
  const { t } = useTranslation()
  const { bareName, fullName, language } = useLocalizedName()

  if (!color) {
    return (
      <aside className="w-full shrink-0 rounded-lg border border-(--color-border) bg-(--color-panel) p-4 text-sm text-(--color-text-muted) md:w-80">
        {t('detail.selectPrompt')}
      </aside>
    )
  }

  const children = getChildrenIds(color.id)

  // Every recipe, cheapest first — the brief requires the panel to list them
  // all even though the tree draws only one. Without a ranking (no planner
  // context) the colour's own storage order stands in, priced at nothing.
  const recipes: readonly RecipeChoice[] =
    ranking?.options ??
    (color.crosses ?? []).map((recipe, index) => ({
      index,
      parentAId: recipe[0],
      parentBId: recipe[1],
      split: 1,
      chance: 0,
      captureCost: Number.NaN,
    }))

  // Every mount of a species carries its species bonus on top of the colour's
  // own, so it is shown once here rather than folded into each colour's list.
  const species = getSpecies(color.species)
  const commonBonus = `${species.commonBonus.value}${
    species.commonBonus.unit === '%' ? '%' : ''
  } ${t(`stats.${species.commonBonus.stat}`)}`
  const commonBonusText =
    species.commonBonusFromLevel === undefined
      ? t('species.commonBonus', { species: species.singular[language], bonus: commonBonus })
      : t('species.commonBonusFromLevel', {
          species: species.singular[language],
          bonus: commonBonus,
          level: species.commonBonusFromLevel,
        })

  return (
    <aside className="w-full shrink-0 space-y-4 overflow-y-auto rounded-lg border border-(--color-border) bg-(--color-panel) p-4 md:w-80">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-(--color-text)">{fullName(color)}</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('detail.close')}
            className="text-(--color-text-muted) hover:text-(--color-text)"
          >
            ✕
          </button>
        )}
      </div>

      <p className="text-xs text-(--color-text-muted)">
        {t('detail.generation', { gen: color.generation })} ·{' '}
        {color.kind === 'mono' ? t('detail.kindMono') : t('detail.kindBicolor')}
      </p>

      {/* Sits above the fold so it stays reachable without scrolling the panel,
          which gets long for late-generation colours. `target` is the planner's
          only required search param; everything else falls back to its default. */}
      <Link
        to={`/planner?target=${color.id}`}
        className="block rounded border border-(--color-gold) px-3 py-1.5 text-center text-sm font-medium text-(--color-gold) hover:bg-(--color-panel-raised)"
      >
        {t('planner.planThis')}
      </Link>

      <section>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
          {t('species.commonBonusLabel')}
        </h3>
        <p className="text-sm">{commonBonusText}</p>
        <p className="text-xs text-(--color-text-muted)">{t('species.commonBonusNote')}</p>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
          {t('detail.bonuses')}
        </h3>
        <ul className="space-y-0.5 text-sm">
          {color.bonuses.map((bonus) => (
            <li key={bonus.stat}>
              +{bonus.value}
              {bonus.unit === '%' ? '%' : ''} {t(`stats.${bonus.stat}`)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
          {t('detail.obtain')}
        </h3>
        {color.wildCapture ? (
          <div className="text-sm">
            <p className="mb-1 font-medium">{t('detail.wildCaptureLabel')}</p>
            <p className="text-(--color-text-muted)">{species.wildCapture[language]}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-(--color-text-muted)">
              {t('detail.recipesLabel', { count: recipes.length })}
            </p>
            <ol className="space-y-1.5">
              {recipes.map((recipe, position) => {
                const parentA = getColorById(recipe.parentAId)
                const parentB = getColorById(recipe.parentBId)
                // Only the first entry is the one the tree draws and the
                // planner breeds; `options` is already sorted cheapest-first.
                const isCheapest = position === 0 && ranking != null
                return (
                  <li
                    key={recipe.index}
                    className={`rounded border p-2 ${
                      isCheapest
                        ? 'border-(--color-accent) bg-(--color-panel-raised)'
                        : 'border-(--color-border)'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-sm">
                      {parentA && (
                        <button
                          type="button"
                          onClick={() => onSelect(parentA.id)}
                          className="rounded border border-(--color-border) px-2 py-0.5 hover:border-(--color-accent)"
                        >
                          {bareName(parentA)}
                        </button>
                      )}
                      <span className="text-(--color-text-muted)">+</span>
                      {parentB && (
                        <button
                          type="button"
                          onClick={() => onSelect(parentB.id)}
                          className="rounded border border-(--color-border) px-2 py-0.5 hover:border-(--color-accent)"
                        >
                          {bareName(parentB)}
                        </button>
                      )}
                    </div>
                    {Number.isFinite(recipe.captureCost) && (
                      <p
                        className="mt-1 text-xs text-(--color-text-muted)"
                        title={t('detail.recipeCostHint')}
                      >
                        {isCheapest && (
                          <span className="mr-1 font-semibold text-(--color-accent)">
                            {`${t('detail.recipeCheapest')} · `}
                          </span>
                        )}
                        {t('detail.recipeCost', {
                          cost: recipe.captureCost.toLocaleString(language, {
                            maximumFractionDigits: 2,
                          }),
                        })}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
          {t('detail.produces')}
        </h3>
        {children.length === 0 ? (
          <p className="text-sm text-(--color-text-muted)">{t('detail.noProduces')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {children.map((childId) => {
              const child = getColorById(childId)
              if (!child) return null
              return (
                <li key={childId}>
                  <button
                    type="button"
                    onClick={() => onSelect(childId)}
                    className="rounded border border-(--color-border) px-2 py-0.5 text-sm hover:border-(--color-accent)"
                  >
                    {bareName(child)}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </aside>
  )
}
