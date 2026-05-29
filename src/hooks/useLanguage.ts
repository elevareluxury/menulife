import { useTranslation } from 'react-i18next'

export function useLanguage() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const next = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(next)
    localStorage.setItem('menulife_lang', next)
  }

  const changeLanguage = (lang: 'es' | 'en') => {
    i18n.changeLanguage(lang)
    localStorage.setItem('menulife_lang', lang)
  }

  return {
    currentLang: i18n.language,
    isSpanish: i18n.language === 'es',
    isEnglish: i18n.language === 'en',
    toggleLanguage,
    changeLanguage,
  }
}
