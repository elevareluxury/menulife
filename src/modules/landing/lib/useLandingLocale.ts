import { useEffect, useRef } from 'react'
import { useLandingT } from '@/i18n/app/landing'
import { useAppLang } from '@/i18n/app/store'
import { APP_LANGS, isAppLang, langDir } from '@/i18n/app/languages'
import { setLocalLanguage } from '@/lib/prefs'

const SITE = 'https://mycen.id'

/** URL de la landing en un idioma (el español es la de siempre, sin parámetro). */
export function landingUrl(lang: string) {
  return lang === 'es' ? `${SITE}/` : `${SITE}/?lang=${lang}`
}

function setMeta(selector: string, attr: string, value: string) {
  const el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) return null
  const prev = el.getAttribute(attr)
  el.setAttribute(attr, value)
  return () => { if (prev !== null) el.setAttribute(attr, prev) }
}

/**
 * Idioma de la landing (L3): `?lang=xx` lo fija (y queda recordado como cualquier elección del selector),
 * título y descripción en ese idioma, `dir="rtl"` para árabe y los `hreflang` de las 12 versiones para buscadores.
 */
export function useLandingLocale() {
  const lang = useAppLang(s => s.lang)
  const l = useLandingT()

  // ?lang=xx manda sobre lo detectado
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('lang')
    if (isAppLang(q) && q !== useAppLang.getState().lang) setLocalLanguage(q)
  }, [])

  // Si la URL tiene ?lang y la persona elige otro idioma, la URL acompaña (para compartir o recargar).
  // Sólo ante un cambio: al entrar, el idioma de ?lang todavía no llegó al estado.
  const prevLang = useRef(lang)
  useEffect(() => {
    if (prevLang.current === lang) return
    prevLang.current = lang
    const url = new URL(window.location.href)
    if (!url.searchParams.has('lang') || url.searchParams.get('lang') === lang) return
    if (lang === 'es') url.searchParams.delete('lang')
    else url.searchParams.set('lang', lang)
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }, [lang])

  // Dirección del texto mientras se ve la landing
  useEffect(() => {
    const html = document.documentElement
    const prev = html.dir
    html.dir = langDir(lang)
    html.lang = lang
    return () => { html.dir = prev || 'ltr' }
  }, [lang])

  // Título y descripción (también los que leen las redes al compartir)
  useEffect(() => {
    const prevTitle = document.title
    document.title = l.meta.title
    const undo = [
      setMeta('meta[name="description"]', 'content', l.meta.description),
      setMeta('meta[property="og:title"]', 'content', l.meta.title),
      setMeta('meta[property="og:description"]', 'content', l.meta.description),
    ]
    return () => { document.title = prevTitle; undo.forEach(f => f?.()) }
  }, [l])

  // hreflang: una versión por idioma + x-default (español), y la canónica del idioma activo
  useEffect(() => {
    const links: HTMLLinkElement[] = []
    const add = (rel: string, href: string, hreflang?: string) => {
      const el = document.createElement('link')
      el.rel = rel
      el.href = href
      if (hreflang) el.hreflang = hreflang
      el.dataset.landing = ''
      document.head.appendChild(el)
      links.push(el)
    }
    for (const code of APP_LANGS) add('alternate', landingUrl(code), code)
    add('alternate', landingUrl('es'), 'x-default')
    add('canonical', landingUrl(lang))
    return () => links.forEach(el => el.remove())
  }, [lang])
}
