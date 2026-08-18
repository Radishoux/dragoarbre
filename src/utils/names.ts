import type { MountColor } from '../data'
import type { SupportedLanguage } from '../i18n'

/**
 * Composes a color's full display name with the species word, honoring the
 * language-specific word order given in the brief: FR puts the species
 * word first ("Dragodinde Amande et Rousse"), EN puts it last ("Almond and
 * Ginger Dragoturkey").
 */
export function composeFullName(
  color: MountColor,
  language: SupportedLanguage,
  speciesSingular: string,
): string {
  const bareName = language === 'fr' ? color.name.fr : color.name.en
  return language === 'fr' ? `${speciesSingular} ${bareName}` : `${bareName} ${speciesSingular}`
}
