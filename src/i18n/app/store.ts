import { create } from 'zustand'
import { detectLang, rememberLang, type AppLang } from './languages'

interface LangState {
  lang: AppLang
  setLang: (lang: AppLang) => void
}

/** Idioma activo de Life OS, Studio y Profile. */
export const useAppLang = create<LangState>(set => ({
  lang: detectLang(),
  setLang: (lang) => {
    rememberLang(lang)
    if (typeof document !== 'undefined') document.documentElement.lang = lang
    set({ lang })
  },
}))
