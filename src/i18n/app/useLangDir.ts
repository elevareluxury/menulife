import { useEffect } from 'react'
import { useAppLang } from './store'
import { langDir } from './languages'

/** Pone `dir` en <html> según el idioma activo (árabe de derecha a izquierda) mientras la pantalla está abierta. */
export function useLangDir() {
  const lang = useAppLang(s => s.lang)
  useEffect(() => {
    const html = document.documentElement
    const prev = html.dir
    html.dir = langDir(lang)
    return () => { html.dir = prev || 'ltr' }
  }, [lang])
}
