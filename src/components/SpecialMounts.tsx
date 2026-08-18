import { useTranslation } from 'react-i18next'
import { DRAGOTURKEY_SPECIALS } from '../data'

export function SpecialMounts() {
  const { t, i18n } = useTranslation()
  const language = i18n.language.startsWith('fr') ? 'fr' : 'en'

  return (
    <section className="rounded-lg border border-(--color-border) bg-(--color-panel) p-4">
      <h2 className="text-base font-semibold text-(--color-text)">{t('special.title')}</h2>
      <p className="mb-3 text-xs text-(--color-text-muted)">{t('special.subtitle')}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {DRAGOTURKEY_SPECIALS.map((special) => (
          <li
            key={special.id}
            className="rounded border border-(--color-border) bg-(--color-panel-raised) p-3"
          >
            <p className="font-medium text-(--color-text)">
              {language === 'fr' ? special.name.fr : special.name.en}
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-(--color-text-muted)">
              {special.bonuses.map((bonus) => (
                <li key={bonus.stat}>
                  +{bonus.value}
                  {bonus.unit === '%' ? '%' : ''} {t(`stats.${bonus.stat}`)}
                </li>
              ))}
              {special.resistances?.map((resistance) => (
                <li key={resistance.element}>
                  {t('special.resistance', {
                    value: resistance.value,
                    element: t(`elements.${resistance.element}`),
                  })}
                </li>
              ))}
              {special.reflectedDamage !== undefined && (
                <li>{t('special.reflectedDamage', { value: special.reflectedDamage })}</li>
              )}
            </ul>
            <p className="mt-2 text-xs text-(--color-text-muted)">
              <span className="font-semibold">{t('special.acquisition')}:</span>{' '}
              {language === 'fr' ? special.acquisition.fr : special.acquisition.en}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
