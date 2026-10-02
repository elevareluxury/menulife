import { useEffect, useState } from 'react'
import { useAppLang } from './store'
import type { AppLang } from './languages'

type Loader<D> = () => Promise<{ default: D }>

/**
 * Crea el hook de un grupo de textos (ej. Studio). El español viaja con la app;
 * los demás idiomas se descargan sólo cuando se eligen.
 */
export function createNamespace<D>(es: D, loaders: Partial<Record<AppLang, Loader<D>>>) {
  const cache = new Map<AppLang, D>([['es', es]])
  const pending = new Map<AppLang, Promise<D>>()

  function load(lang: AppLang): Promise<D> {
    const hit = cache.get(lang)
    if (hit) return Promise.resolve(hit)
    let p = pending.get(lang)
    if (!p) {
      const loader = loaders[lang]
      p = loader
        ? loader().then(m => { cache.set(lang, m.default); return m.default }).catch(() => es)
        : Promise.resolve(es)
      pending.set(lang, p)
    }
    return p
  }

  function useDict(): D {
    const lang = useAppLang(s => s.lang)
    const [, force] = useState(0)
    const dict = cache.get(lang)
    useEffect(() => {
      if (cache.has(lang)) return
      let alive = true
      void load(lang).then(() => { if (alive) force(n => n + 1) })
      return () => { alive = false }
    }, [lang])
    return dict ?? es
  }

  /** Diccionario del idioma activo fuera de React (español si todavía no cargó). */
  function peek(): D {
    return cache.get(useAppLang.getState().lang) ?? es
  }

  return { useDict, load, peek }
}
