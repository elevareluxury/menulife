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

// Grupos de textos cargados (createNamespace): al cambiar de idioma se esperan sus diccionarios antes de cambiar,
// así la pantalla pasa directo al idioma nuevo (sin esqueleto ni español en el medio)
type NamespaceLoader = (lang: AppLang) => Promise<unknown>
const namespaces: NamespaceLoader[] = []
let requested: AppLang = initialLang

export function registerNamespace(load: NamespaceLoader): void {
  namespaces.push(load)
}

/** Idioma activo de Life OS, Studio y Profile. */
export const useAppLang = create<LangState>(set => ({
  lang: initialLang,
  setLang: (lang) => {
    rememberLang(lang)
    requested = lang
    const apply = () => {
      if (requested !== lang) return   // otro cambio llegó después
      if (typeof document !== 'undefined') document.documentElement.lang = lang
      set({ lang })
    }
    // Los diccionarios nunca rechazan (si falla la descarga quedan en español), así que esto siempre termina
    if (lang === 'es' || namespaces.length === 0) apply()
    else void Promise.all(namespaces.map(load => load(lang))).then(apply)
  },
}))
