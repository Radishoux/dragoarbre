import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/** Sets `document.title` to "{pageTitle} · Dragoarbre", reactive to language changes. */
export function useDocumentTitle(pageTitleKey?: string): void {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = pageTitleKey ? `${t(pageTitleKey)} · ${t('app.name')}` : t('app.name')
  }, [pageTitleKey, t])
}
