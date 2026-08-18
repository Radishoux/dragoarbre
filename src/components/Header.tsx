import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import type { SpeciesId } from '../data'

const SPECIES_TABS: { id: SpeciesId; labelKey: string; enabled: boolean }[] = [
  { id: 'dragoturkey', labelKey: 'species.dragoturkey', enabled: true },
  { id: 'seemyool', labelKey: 'species.seemyool', enabled: false },
  { id: 'rhineetle', labelKey: 'species.rhineetle', enabled: false },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-(--color-panel-raised) text-(--color-text)' : 'text-(--color-text-muted) hover:text-(--color-text)'}`

export function Header() {
  const { t, i18n } = useTranslation()

  return (
    <header className="border-b border-(--color-border) bg-(--color-panel)">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span className="text-lg font-semibold tracking-wide text-(--color-gold)">
            {t('app.name')}
          </span>
        </div>

        <nav className="flex items-center gap-1" aria-label={t('nav.tree')}>
          <NavLink to="/" end className={navLinkClass}>
            {t('nav.tree')}
          </NavLink>
          <NavLink to="/planner" className={navLinkClass}>
            {t('nav.planner')}
          </NavLink>
          <NavLink to="/how-breeding-works" className={navLinkClass}>
            {t('nav.howItWorks')}
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" role="tablist" aria-label={t('app.name')}>
            {SPECIES_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.enabled}
                disabled={!tab.enabled}
                title={tab.enabled ? undefined : t('species.comingSoon')}
                className={`rounded px-2.5 py-1 text-xs ${
                  tab.enabled
                    ? 'bg-(--color-accent-soft) text-white'
                    : 'cursor-not-allowed border border-dashed border-(--color-border) text-(--color-text-muted)'
                }`}
              >
                {t(tab.labelKey)}
                {!tab.enabled && (
                  <span className="ml-1 opacity-70">({t('species.comingSoon')})</span>
                )}
              </button>
            ))}
          </div>

          {/* biome-ignore lint/a11y/useSemanticElements: fieldset semantics don't fit a stateless button toggle */}
          <div
            className="flex items-center gap-1 text-xs"
            role="group"
            aria-label={t('language.label')}
          >
            {(['fr', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => i18n.changeLanguage(lang)}
                aria-pressed={i18n.language.startsWith(lang)}
                className={`rounded px-2 py-1 ${
                  i18n.language.startsWith(lang)
                    ? 'bg-(--color-panel-raised) text-(--color-gold)'
                    : 'text-(--color-text-muted) hover:text-(--color-text)'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
