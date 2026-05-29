import { useTranslation } from 'react-i18next'

export function useLanguage() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const next = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(next)
    localStorage.setItem('menulife_lang', next)
  }

  return {
    currentLang: i18n.language,
    isSpanish: i18n.language === 'es',
    isEnglish: i18n.language === 'en',
    toggleLanguage,
  }
}
