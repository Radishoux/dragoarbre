import { useTranslation } from 'react-i18next'

export function Legend() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-(--color-border) bg-(--color-panel) px-3 py-2 text-xs text-(--color-text-muted)">
      <span className="font-semibold text-(--color-text)">{t('tree.legend.title')}</span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm bg-(--color-accent)" />
        {t('tree.legend.mono')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-flex h-3 w-3 overflow-hidden rounded-sm">
          <span className="h-full w-1/2 bg-(--color-accent)" />
          <span className="h-full w-1/2 bg-(--color-ember)" />
        </span>
        {t('tree.legend.bicolor')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm border-2 border-(--color-gold)" />
        {t('tree.legend.selected')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm border-2 border-(--color-accent)" />
        {t('tree.legend.ancestor')}
      </span>
    </div>
  )
}
