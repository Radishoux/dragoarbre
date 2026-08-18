import { useTranslation } from 'react-i18next'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const SECTIONS = [
  { titleKey: 'howItWorks.matingTitle', bodyKey: 'howItWorks.mating' },
  { titleKey: 'howItWorks.cloningTitle', bodyKey: 'howItWorks.cloning' },
  { titleKey: 'howItWorks.genealogyTitle', bodyKey: 'howItWorks.genealogy' },
  { titleKey: 'howItWorks.probabilityTitle', bodyKey: 'howItWorks.probability' },
  { titleKey: 'howItWorks.residualTitle', bodyKey: 'howItWorks.residual' },
] as const

export function HowBreedingWorksPage() {
  useDocumentTitle('nav.howItWorks')
  const { t } = useTranslation()

  return (
    <article className="mx-auto max-w-3xl space-y-6 pb-8">
      <header>
        <h1 className="text-2xl font-semibold text-(--color-gold)">{t('howItWorks.title')}</h1>
        <p className="mt-2 text-(--color-text-muted)">{t('howItWorks.intro')}</p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.titleKey}>
          <h2 className="mb-1 text-base font-semibold text-(--color-text)">
            {t(section.titleKey)}
          </h2>
          <p className="text-sm text-(--color-text-muted)">{t(section.bodyKey)}</p>
        </section>
      ))}

      <section className="rounded-lg border border-(--color-accent) bg-(--color-panel) p-4">
        <p className="text-sm text-(--color-text)">{t('howItWorks.example')}</p>
      </section>

      <section className="rounded-lg border border-(--color-border) bg-(--color-panel) p-4">
        <h2 className="mb-1 text-base font-semibold text-(--color-text)">{t('roadmap.title')}</h2>
        <p className="text-sm text-(--color-text-muted)">{t('roadmap.phase2')}</p>
        <p className="mt-1 text-sm text-(--color-text-muted)">{t('roadmap.phase3')}</p>
      </section>
    </article>
  )
}
