import { useTranslation } from 'react-i18next'
import type { MountColor } from '../data'
import type { SupportedLanguage } from '../i18n'
import { composeFullName } from '../utils/names'

/** Returns helpers to get a color's bare name or full (species-prefixed) name in the active language. */
export function useLocalizedName() {
  const { i18n, t } = useTranslation()
  const language = i18n.language.startsWith('fr') ? 'fr' : ('en' as SupportedLanguage)

  const bareName = (color: MountColor) => (language === 'fr' ? color.name.fr : color.name.en)
  const fullName = (color: MountColor) =>
    composeFullName(color, language, t('species.dragoturkeySingular'))

  return { language, bareName, fullName }
}
