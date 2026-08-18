/**
 * i18next setup: FR/EN, auto-detected from the browser, persisted in
 * localStorage. All UI strings live in `locales/*​/translation.json` —
 * components must never hardcode user-facing text.
 */
import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/translation.json'
import fr from './locales/fr/translation.json'

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'dragoarbre-language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18next
