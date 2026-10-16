import { create } from 'zustand'
import { detectLang, rememberLang, type AppLang } from './languages'

interface LangState {
  lang: AppLang
  setLang: (lang: AppLang) => void
}

const initialLang = detectLang()
// index.html arranca con lang="es": si el idioma del dispositivo es otro, <html lang> tiene que decirlo desde el
// principio (lectores de pantalla, traducción del navegador), no recién cuando alguien llama a setLang
if (typeof document !== 'undefined') document.documentElement.lang = initialLang

/** Idioma activo de Life OS, Studio y Profile. */
export const useAppLang = create<LangState>(set => ({
  lang: initialLang,
  setLang: (lang) => {
    rememberLang(lang)
    if (typeof document !== 'undefined') document.documentElement.lang = lang
    set({ lang })
  },
}))
