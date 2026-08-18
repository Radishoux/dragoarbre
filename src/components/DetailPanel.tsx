import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { getChildrenIds, getColorById, type MountColor, WILD_CAPTURE_INFO } from '../data'
import { useLocalizedName } from '../hooks/useLocalizedName'

interface DetailPanelProps {
  color: MountColor | null
  onSelect: (id: string) => void
  onClose?: () => void
}

export function DetailPanel({ color, onSelect, onClose }: DetailPanelProps) {
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
  const [parentAId, parentBId] = color.crosses?.[0] ?? []
  const parentA = parentAId ? getColorById(parentAId) : undefined
  const parentB = parentBId ? getColorById(parentBId) : undefined

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
            <p className="text-(--color-text-muted)">
              {language === 'fr' ? WILD_CAPTURE_INFO.fr : WILD_CAPTURE_INFO.en}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
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
