import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-(--color-border) bg-(--color-panel) px-4 py-4 text-center text-xs text-(--color-text-muted)">
      <p>{t('footer.disclaimer')}</p>
      <p className="mt-1">{t('footer.dataNote')}</p>
    </footer>
  )
}
