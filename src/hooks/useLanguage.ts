import { useTranslation } from 'react-i18next'
import { changeLocaleTo, LOCALE_META, ACTIVE_LOCALES, type ActiveLocale } from '@/i18n'

export function useLanguage() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const next = i18n.language === 'es' ? 'en' : 'es'
    changeLocaleTo(next)
  }

  const changeLanguage = (lang: ActiveLocale | string) => {
    changeLocaleTo(lang)
  }

  return {
    currentLang:    i18n.language,
    isSpanish:      i18n.language === 'es',
    isEnglish:      i18n.language === 'en',
    activeLocales:  ACTIVE_LOCALES,
    localeMeta:     LOCALE_META,
    toggleLanguage,
    changeLanguage,
  }
}
