import { useTranslation } from 'react-i18next'
import { getSpecies, type MountColor } from '../data'
import type { SupportedLanguage } from '../i18n'
import { composeFullName } from '../utils/names'

/** Returns helpers to get a color's bare name or full (species-prefixed) name in the active language. */
export function useLocalizedName() {
  const { i18n } = useTranslation()
  const language = i18n.language.startsWith('fr') ? 'fr' : ('en' as SupportedLanguage)

  const bareName = (color: MountColor) => (language === 'fr' ? color.name.fr : color.name.en)
  // The species word comes from the data registry rather than an i18n key:
  // it is per-species game data, and phase 3 has three of them.
  const fullName = (color: MountColor) =>
    composeFullName(color, language, getSpecies(color.species).singular[language])

  return { language, bareName, fullName }
}
