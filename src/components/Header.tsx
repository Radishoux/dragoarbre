import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation, useSearchParams } from 'react-router'
import { ALL_SPECIES } from '../data'
import { buildSpeciesSearch, decodePlanUrl, planSpecies } from '../utils/planUrl'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-(--color-panel-raised) text-(--color-text)' : 'text-(--color-text-muted) hover:text-(--color-text)'}`

export function Header() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Phase 3: the tabs are live, and the selected species is a URL concern, not
  // component state — a pasted link restores the tab. `planSpecies` is used
  // rather than `decodeSpecies` so a planner link that carries only a target
  // (`#/planner?target=seemyool-almond`) still lights the right tab.
  const activeSpecies = planSpecies(decodePlanUrl(searchParams))

  // The species alone, as a query string — `buildSpeciesSearch` returns '' for
  // the default species, so a Dragoturkey link stays exactly the phase 2 URL.
  const speciesSearch = buildSpeciesSearch(activeSpecies)

  return (
    <header className="border-b border-(--color-border) bg-(--color-panel)">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span className="text-lg font-semibold tracking-wide text-(--color-gold)">
            {t('app.name')}
          </span>
        </div>

        {/* Every nav link carries the species and nothing else, so moving
            between screens keeps the tab you are on without dragging a plan's
            target and assumptions onto a screen that has no use for them. */}
        <nav className="flex items-center gap-1" aria-label={t('nav.tree')}>
          <NavLink to={{ pathname: '/', search: speciesSearch }} end className={navLinkClass}>
            {t('nav.tree')}
          </NavLink>
          <NavLink to={{ pathname: '/planner', search: speciesSearch }} className={navLinkClass}>
            {t('nav.planner')}
          </NavLink>
          <NavLink
            to={{ pathname: '/how-breeding-works', search: speciesSearch }}
            className={navLinkClass}
          >
            {t('nav.howItWorks')}
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {/* Tabs stay on the current screen and only re-scope it. Switching
              species deliberately drops the rest of the query: a target colour
              belongs to exactly one species, so carrying it across would build
              a plan the new tab cannot show. */}
          <div
            className="flex items-center gap-1"
            role="tablist"
            aria-label={t('species.tabsLabel')}
          >
            {ALL_SPECIES.map((species) => {
              const isActive = species.id === activeSpecies
              return (
                <Link
                  key={species.id}
                  to={{ pathname: location.pathname, search: buildSpeciesSearch(species.id) }}
                  role="tab"
                  aria-selected={isActive}
                  className={`rounded px-2.5 py-1 text-xs ${
                    isActive
                      ? 'bg-(--color-accent-soft) text-white'
                      : 'border border-(--color-border) text-(--color-text-muted) hover:border-(--color-accent) hover:text-(--color-text)'
                  }`}
                >
                  {t(`species.${species.id}`)}
                </Link>
              )
            })}
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
